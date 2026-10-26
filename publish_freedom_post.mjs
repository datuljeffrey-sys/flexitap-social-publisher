import fs from 'node:fs';
import path from 'node:path';

// 1. Load environment variables
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex > 0) {
        const key = trimmed.slice(0, eqIndex).trim();
        const value = trimmed.slice(eqIndex + 1).trim().replace(/^['"](.*)['"]$/, '$1');
        if (!process.env[key]) process.env[key] = value;
      }
    }
  }
}

loadEnv();

const BUFFER_API_KEY = process.env.BUFFER_API_KEY;
const IMGBB_API_KEY = process.env.IMGBB_API_KEY;

if (!BUFFER_API_KEY) {
  console.error('Missing BUFFER_API_KEY');
  process.exit(1);
}

// 2. Upload image to ImgBB
async function uploadImage() {
  const imagePath = path.resolve(process.cwd(), 'images', 'flexitap_pos_cc_showcase.jpg');
  console.log('Uploading image to ImgBB:', imagePath);
  const buffer = fs.readFileSync(imagePath);
  const base64Image = buffer.toString('base64');

  const formData = new FormData();
  formData.append('image', base64Image);

  const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
    method: 'POST',
    body: formData
  });

  if (!res.ok) {
    throw new Error(`ImgBB upload failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  const directUrl = data?.data?.url || data?.data?.display_url;
  console.log('Image uploaded successfully! Direct URL:', directUrl);
  return directUrl;
}

// 3. Get connected Buffer channels
async function getBufferChannels() {
  const orgQuery = `
  query GetOrganizations {
    account {
      organizations {
        id
        name
      }
    }
  }
  `;

  const orgRes = await fetch('https://api.buffer.com', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${BUFFER_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: orgQuery })
  });

  const orgData = await orgRes.json();
  const orgs = orgData.data?.account?.organizations || [];
  const channels = [];

  const channelQuery = `
  query GetChannels($input: ChannelsInput!) {
    channels(input: $input) {
      id
      name
      displayName
      service
    }
  }
  `;

  for (const org of orgs) {
    const chRes = await fetch('https://api.buffer.com', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BUFFER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: channelQuery,
        variables: { input: { organizationId: org.id } }
      })
    });
    const chData = await chRes.json();
    if (chData.data?.channels) {
      channels.push(...chData.data.channels);
    }
  }

  return channels;
}

// 4. Publish post to channel
async function publishPost(channel, text, imageUrl) {
  const service = channel.service.toLowerCase();
  console.log(`\nPublishing to [${service.toUpperCase()}] "${channel.name}" (ID: ${channel.id})...`);

  const mutation = `
  mutation CreatePost($input: CreatePostInput!) {
    createPost(input: $input) {
      ... on PostActionSuccess {
        post {
          id
          status
        }
      }
      ... on MutationError {
        message
      }
    }
  }
  `;

  const input = {
    channelId: channel.id,
    text: text,
    schedulingType: 'automatic',
    mode: 'shareNow'
  };

  if (service === 'facebook') {
    input.metadata = {
      facebook: {
        type: 'post'
      }
    };
  }

  if (imageUrl) {
    input.assets = [
      {
        image: {
          url: imageUrl
        }
      }
    ];
  }

  const res = await fetch('https://api.buffer.com', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${BUFFER_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: mutation,
      variables: { input }
    })
  });

  const data = await res.json();
  if (data.errors) {
    console.error('GraphQL Error:', JSON.stringify(data.errors));
    return false;
  }

  const payload = data.data?.createPost;
  if (payload?.post) {
    console.log(`✅ Success! Post ID: ${payload.post.id}, Status: ${payload.post.status}`);
    return true;
  } else if (payload?.message) {
    console.error(`❌ Buffer Error: ${payload.message}`);
    return false;
  }
  return false;
}

async function main() {
  const imageUrl = await uploadImage();
  const channels = await getBufferChannels();
  console.log('\nFound channels:', channels.map(c => `${c.service}: ${c.name} (${c.id})`));

  const fullText = `Tired of POS companies forcing you into expensive credit card processing contracts? 🛑💳

With most legacy POS systems, you’re trapped:
❌ You must use their payment processor.
❌ They arbitrarily hike your processing rates.
❌ If you want to switch banks, you have to throw away all your hardware.

At FlexiTap POS, we do things differently:
✨ 100% Processor Freedom.
Bring your own card machine, keep your existing bank, and stick with your negotiated low rates! 

Whether you process with Chase, Fiserv, TSYS, or your local bank—just type the total on your terminal, tap tender in FlexiTap, and close the sale. 

✅ Zero vendor lock-in
✅ Zero proprietary hardware traps
✅ Zero hidden gateway penalties

Take control of your hard-earned margins today. 🚀

👉 Download and start free: https://flexitapapp.com
💬 Send us a message for a quick demo!

#FlexiTapPOS #SmallBusinessOwner #RetailTech #RestaurantPOS #MerchantServices #NoLockIn #PointOfSale #BusinessFreedom`;

  // Twitter/X 280-char version (concise, high impact)
  const twitterText = `Tired of POS companies locking you into expensive processing contracts? 🛑💳

At FlexiTap POS, get 100% Processor Freedom. Bring your own card terminal, keep your bank & low rates! Zero vendor lock-in.

👉 Start free: https://flexitapapp.com

#FlexiTapPOS #MerchantServices`;

  console.log(`Twitter character count: ${twitterText.length}/280`);

  for (const ch of channels) {
    const isTwitter = ch.service.toLowerCase() === 'twitter';
    const textToUse = isTwitter ? twitterText : fullText;
    await publishPost(ch, textToUse, imageUrl);
  }

  console.log('\n🎉 Finished publishing!');
}

main().catch(err => {
  console.error('Execution error:', err);
  process.exit(1);
});
