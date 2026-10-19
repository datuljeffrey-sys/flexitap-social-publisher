import fs from 'node:fs';
import path from 'node:path';

// --- Simple .env file loader (Zero external dependencies) ---
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
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
}

loadEnv();

const BUFFER_API_KEY = process.env.BUFFER_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const IMGBB_API_KEY = process.env.IMGBB_API_KEY;
const TARGET_SERVICES = (process.env.BUFFER_TARGET_SERVICES || 'facebook,linkedin,twitter')
  .split(',')
  .map(s => s.trim().toLowerCase());

if (!BUFFER_API_KEY) {
  console.error('❌ Error: BUFFER_API_KEY is not set in .env');
  console.error('👉 Get your key at: https://publish.buffer.com/settings/api');
  process.exit(1);
}

if (!GEMINI_API_KEY) {
  console.error('❌ Error: GEMINI_API_KEY is not set in .env');
  console.error('👉 Get your key at: https://aistudio.google.com/app/apikey');
  process.exit(1);
}

// Curated high-res hospitality lifestyle photography (POS, modern cafes, food trucks)
const CURATED_VISUALS = [
  'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1080&q=80', // Cozy cafe counter
  'https://images.unsplash.com/photo-1556742049-0a67c5574f73?auto=format&fit=crop&w=1080&q=80', // Seamless payment checkout
  'https://images.unsplash.com/photo-1565123409695-7b5ef63a2efb?auto=format&fit=crop&w=1080&q=80', // Food truck service window
  'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1080&q=80', // Bright coffee shop interior
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1080&q=80'  // High-energy restaurant dining
];

// --- 1. Generate Platform-Tailored Copy via Gemini 3.8 Flash ---
async function generatePostContent() {
  console.log('🧠 Step 1: Generating tailored post copies for Facebook, LinkedIn & X via Gemini...');

  const prompt = `
You are an expert hospitality and POS marketing copywriter. Generate high-converting social media posts and an image concept for FlexiTap POS tailored specifically for the US market (restaurant, cafe, bar, food truck, pop-up, market, and retail operators).

Brand Pillars & Context:
1. Over 30 Years of Deep POS Experience: Enterprise reliability with modern cross-platform software.
2. Resilient Offline Architecture & Zero Hardware Interruption: 100% offline functionality with local device sales and reports; no interruptions if Wi-Fi drops.
3. Radical Ease of Use & Positive Vibes: Clean, intuitive design allowing staff training in 5 minutes with friendly, joyful hospitality energy.
4. Human Support When You Need It: Live Call Support, Hands-On Remote Screen Assistance, and Real-Time Chat Support.

Feature Tier Rules:
- "Ask Flexi" (Offline AI Business Analyst), Cloud Multi-Device Sync, Kitchen Display Systems (KDS), Priority Live Support, and Customer Loyalty are PAID tier features (unlocked via Paid Tiers or the Founders VIP Pass). Never include "Ask Flexi" under the free waitlist.
- The Free Launch Waitlist ($0/mo, no credit card required) is strictly for solo pop-ups, markets, and kiosks with 1 active terminal, local offline sales, and daily reports.
- For paid/advanced features, promote the limited-slot Founders VIP Pass (lifetime price-lock guarantee and 1-on-1 setup).

Call to Action:
- Highlight official US Launch on November 13, 2026.
- Encourage booking at flexitapapp.com or sending a DM.
- Include 3 to 5 relevant US hashtags, always including #FlexiTapPOS.

Platform Rules:
- "facebook_text": Full engaging story format with emojis, feature breakdown, clear tier rules, and CTA.
- "linkedin_text": Professional, founder-to-operator tone with clear operational benefits.
- "twitter_text": MUST be under 260 characters total, punchy, ending with "Nov 13 US Launch: flexitapapp.com #FlexiTapPOS".

Return ONLY a valid JSON object with exactly these keys:
{
  "facebook_text": "...",
  "linkedin_text": "...",
  "twitter_text": "...",
  "image_prompt": "photorealistic prompt for Google Imagen"
}
`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${GEMINI_API_KEY}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json'
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API Error (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  const textOutput = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textOutput) {
    throw new Error('No output received from Gemini');
  }

  return JSON.parse(textOutput);
}

// --- 2. Generate or Source High-Res Image ---
async function obtainPostImage(imagePrompt) {
  console.log('🎨 Step 2: Preparing visual asset...');

  // 1. Try Google Imagen 3 first if enabled on the API key
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${GEMINI_API_KEY}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt: imagePrompt }],
        parameters: { sampleCount: 1, aspectRatio: '1:1', outputOptions: { mimeType: 'image/jpeg' } }
      })
    });

    if (response.ok) {
      const result = await response.json();
      const base64 = result.predictions?.[0]?.bytesBase64Encoded;
      if (base64) {
        console.log('   ✨ Successfully generated visual with Google Imagen 3!');
        const cdnUrl = await uploadToPublicCDN(base64);
        if (cdnUrl) return cdnUrl;
      }
    }
  } catch (_) {}

  // 2. High-reliability fallback: Curated high-resolution hospitality photo
  const randomUrl = CURATED_VISUALS[Math.floor(Math.random() * CURATED_VISUALS.length)];
  console.log('   📸 Selected high-res hospitality lifestyle photo.');
  console.log(`   🔗 Direct Public Image URL: ${randomUrl}`);
  return randomUrl;
}

// --- 3. Upload Image to Free Public Host (ImgBB) ---
async function uploadToPublicCDN(base64Image) {
  if (!IMGBB_API_KEY || !base64Image) {
    return null;
  }

  console.log('☁️ Step 3: Hosting image on ImgBB CDN for Buffer...');
  const formData = new FormData();
  formData.append('image', base64Image);

  try {
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
      method: 'POST',
      body: formData
    });

    if (response.ok) {
      const data = await response.json();
      const directUrl = data?.data?.url || data?.data?.display_url;
      console.log(`   🔗 Direct Public Image URL: ${directUrl}`);
      return directUrl;
    }
  } catch (err) {
    console.warn('   ⚠️ ImgBB Upload warning:', err.message);
  }

  return null;
}

// --- 4. Discover Connected Buffer Channels ---
async function getBufferChannels() {
  console.log('🔍 Step 4: Discovering connected social channels in Buffer...');

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

  if (!orgRes.ok) {
    throw new Error(`Buffer API Error (${orgRes.status}): ${await orgRes.text()}`);
  }

  const orgResult = await orgRes.json();
  if (orgResult.errors) {
    throw new Error(`Buffer GraphQL Error: ${JSON.stringify(orgResult.errors)}`);
  }

  const orgs = orgResult.data?.account?.organizations || [];
  const channels = [];

  const channelQuery = `
  query GetChannels($input: ChannelsInput!) {
    channels(input: $input) {
      id
      name
      displayName
      service
      isQueuePaused
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

    if (chRes.ok) {
      const chResult = await chRes.json();
      if (chResult.data?.channels) {
        channels.push(...chResult.data.channels);
      }
    }
  }

  return channels;
}

// --- 5. Publish Post to a Channel via Buffer GraphQL ---
async function publishToBuffer(channelId, channelName, service, copyData, imageUrl) {
  const serviceKey = service.toLowerCase();
  console.log(`🚀 Step 5: Publishing to [${service.toUpperCase()}] "${channelName}"...`);

  // Tailor text per platform
  let text = copyData.facebook_text;
  if (serviceKey === 'twitter') {
    text = copyData.twitter_text;
    // Safety check for 280-char Twitter limit
    if (text.length > 280) {
      text = text.slice(0, 276) + '...';
    }
  } else if (serviceKey === 'linkedin') {
    text = copyData.linkedin_text;
  }

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
    channelId,
    text,
    schedulingType: 'automatic',
    mode: 'addToQueue'
  };

  // Required Facebook metadata
  if (serviceKey === 'facebook') {
    input.metadata = {
      facebook: {
        type: 'post'
      }
    };
  }

  // Attach public image asset if available
  if (imageUrl) {
    input.assets = [
      {
        image: {
          url: imageUrl
        }
      }
    ];
  }

  const response = await fetch('https://api.buffer.com', {
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

  const result = await response.json();
  if (result.errors) {
    console.error(`   ❌ Failed: ${JSON.stringify(result.errors)}`);
    return false;
  }

  const payload = result.data?.createPost;
  if (payload?.post) {
    console.log(`   ✅ Queued Successfully! (Post ID: ${payload.post.id}, Status: ${payload.post.status})`);
    return true;
  } else if (payload?.message) {
    console.error(`   ❌ Buffer Error: ${payload.message}`);
    return false;
  }

  return true;
}

// --- Main Execution Flow ---
async function main() {
  console.log('==================================================');
  console.log('⚡ FlexiTap POS 100% Automated Social Media Publisher');
  console.log('==================================================\n');

  try {
    // 1. Generate Platform-Specific Copy
    const copyData = await generatePostContent();
    console.log('\n📝 Generated Copy Highlights:');
    console.log('--------------------------------------------------');
    console.log(`[Twitter/X (${copyData.twitter_text.length} chars)]:`);
    console.log(copyData.twitter_text);
    console.log('\n[Facebook/LinkedIn Sample]:');
    console.log(copyData.facebook_text.slice(0, 180) + '...\n');
    console.log('--------------------------------------------------\n');

    // 2. Obtain Visual Asset (Imagen or Curated Direct CDN)
    const directImageUrl = await obtainPostImage(copyData.image_prompt);

    // 4. Discover Buffer Channels
    const allChannels = await getBufferChannels();
    if (allChannels.length === 0) {
      console.warn('⚠️ No connected channels found in your Buffer account.');
      console.log('👉 Connect your Facebook Page, LinkedIn, and X at: https://publish.buffer.com/channels');
      return;
    }

    const matchingChannels = allChannels.filter(c =>
      TARGET_SERVICES.includes(c.service.toLowerCase()) ||
      TARGET_SERVICES.includes('all')
    );

    const channelsToPost = matchingChannels.length > 0 ? matchingChannels : allChannels;
    console.log(`\nFound ${channelsToPost.length} channel(s) ready for posting:`);
    channelsToPost.forEach(c => console.log(` - ${c.service.toUpperCase()}: ${c.name} (${c.id})`));
    console.log('');

    // 5. Publish to each channel
    let successCount = 0;
    for (const channel of channelsToPost) {
      const ok = await publishToBuffer(channel.id, channel.name, channel.service, copyData, directImageUrl);
      if (ok) successCount++;
    }

    console.log('\n==================================================');
    console.log(`🎉 Finished! Successfully queued across ${successCount}/${channelsToPost.length} channels.`);
    console.log('==================================================');
  } catch (err) {
    console.error('\n❌ Automation pipeline error:', err.message);
  }
}

main();
