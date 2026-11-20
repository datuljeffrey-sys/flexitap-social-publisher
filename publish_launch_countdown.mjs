import fs from 'node:fs';
import path from 'node:path';

// --- Simple .env file loader ---
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

if (!BUFFER_API_KEY || !GEMINI_API_KEY) {
  console.error('❌ Error: Missing BUFFER_API_KEY or GEMINI_API_KEY in .env');
  process.exit(1);
}

const HISTORY_FILE = path.resolve(process.cwd(), 'history.json');

function loadHistory() {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const raw = fs.readFileSync(HISTORY_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data)) return data;
    }
  } catch (err) {
    console.warn('⚠️ Warning loading history.json:', err.message);
  }
  return [];
}

function saveHistoryEntry(entry) {
  try {
    const history = loadHistory();
    history.push(entry);
    const trimmed = history.slice(-30);
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(trimmed, null, 2), 'utf-8');
    console.log(`💾 Saved post to history.json (${trimmed.length} total entries tracked).`);
  } catch (err) {
    console.error('⚠️ Could not save history entry:', err.message);
  }
}

// Visual asset for pizza: Blistered wood-fired artisan pizza with fresh basil and mozzarella
const PIZZA_IMAGE_URL = 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=85';

async function uploadToPublicCDN(base64Image) {
  if (!IMGBB_API_KEY || !base64Image) return null;
  const formData = new FormData();
  formData.append('image', base64Image);

  try {
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
      method: 'POST',
      body: formData
    });
    if (response.ok) {
      const data = await response.json();
      return data?.data?.url || data?.data?.display_url;
    }
  } catch (err) {
    console.warn('   ⚠️ ImgBB Upload warning:', err.message);
  }
  return null;
}

async function obtainFoodImage(imageUrl) {
  if (IMGBB_API_KEY) {
    try {
      console.log('☁️ Caching food visual on high-speed CDN for Buffer...');
      const imgRes = await fetch(imageUrl);
      if (imgRes.ok) {
        const arrayBuf = await imgRes.arrayBuffer();
        const base64 = Buffer.from(arrayBuf).toString('base64');
        const cdnUrl = await uploadToPublicCDN(base64);
        if (cdnUrl) {
          console.log(`✅ Hosted on CDN: ${cdnUrl}`);
          return cdnUrl;
        }
      }
    } catch (err) {
      console.warn('⚠️ CDN hosting warning:', err.message);
    }
  }
  return imageUrl;
}

// 🛡️ Pre-push duplicate & policy verifier
function verifyPost(copyData, candidateImageUrl, history) {
  console.log('🛡️ Running Pre-Push Verification...');

  // 1. Strict Anti-VIP Check
  const allText = `${copyData.facebook_text} ${copyData.linkedin_text} ${copyData.twitter_text}`;
  if (/\bvip\b/i.test(allText)) {
    return { isClean: false, reason: "REJECTED: Contains forbidden word 'VIP'." };
  }

  // 2. Twitter Character Count Check
  if (copyData.twitter_text.length > 280) {
    return { isClean: false, reason: `REJECTED: Twitter text exceeds 280 chars (${copyData.twitter_text.length}).` };
  }

  // 3. Image URL reuse check
  const recentImages = history.slice(-5).map(e => e.imageUrl).filter(Boolean);
  if (recentImages.includes(candidateImageUrl)) {
    return { isClean: false, reason: 'REJECTED: Image was used in recent posts.' };
  }

  return { isClean: true };
}

async function generateCountdownPost() {
  console.log('🧠 Generating Launch Countdown Post via Gemini...');

  const prompt = `
You are a top-tier restaurant tech marketing copywriter. Create a HIGH-IMPACT, NOTICEABLE, BOLD social media announcement for FlexiTap POS.

CRITICAL LAUNCH ANNOUNCEMENT:
🔥 OFFICIAL US LAUNCH IS TOMORROW AT 9:00 AM CST!
This is the final countdown announcement before doors open tomorrow morning at 9:00 AM CST. It must be bold, urgent, high-energy, and unmissable.

FOOD SENSORY HOOK:
- Venue: High-volume artisan wood-fired pizzerias and Italian trattorias (Atlanta, Chicago, Philadelphia, Brooklyn).
- Dish: Blistered Neapolitan pizzas fresh from a 900°F oven—crust bubbling with leopard char, rich San Marzano tomato sauce, molten fresh buffalo mozzarella, fragrant ripped basil, and a drizzle of extra virgin olive oil.
- Atmosphere: A packed Friday night dinner rush heading straight into the launch weekend—kitchen expo line moving fast, tables turning, orders firing continuously.

CORE VALUE PROPOSITION:
1. 100% Offline Local LAN Resilience: Built so that when internet fails or cellular towers congest, table orders never stop, ticket chits print instantly, and kitchen screens never drop.
2. Zero Credit Card Processor Lock-in: Freedom to bring your own credit card terminal & merchant processor (BYOD). Zero percentage cuts taken from your sales.
3. 5-Minute Staff Training: Intuitive UI means zero training delays.
4. Transparent Pricing: Free 1-terminal plan on Waitlist. Flat $290/year (Plus) and $590/year (Pro) lifetime price locks—no surprise transaction surcharges.

STRICT MANDATORY RULES:
1. FORBIDDEN WORD (CRITICAL): NEVER USE THE WORD 'VIP', 'VIP PASS', OR 'VIP TIER' ANYWHERE!
2. Launch Timing: Clearly highlight: "Tomorrow at 9:00 AM CST" / "Launch date tomorrow 9am CST".
3. Formatting: Make it bold, eye-catching, and easy to scan with emojis (🍕, 🔥, ⚡, ⏰) and punchy layout.
4. Platforms:
   - "facebook_text": High-energy, narrative hook starting with the sensory wood-fired pizza rush. Detail why legacy POS systems fail operators during peak rush and introduce FlexiTap's offline superpower. Break down the pricing (Plus $290/yr & Pro $590/yr flat) and tell them launch is tomorrow at 9:00 AM CST at flexitapapp.com.
   - "linkedin_text": Executive & operator-focused. Address restaurant owners and GMs about kitchen throughput, margin preservation, zero cloud outages, and the launch tomorrow at 9:00 AM CST.
   - "twitter_text": MUST be under 260 characters total. Punchy, bold, highly noticeable. Must include "Launch tomorrow at 9am CST: flexitapapp.com #FlexiTapPOS #PizzaRush"

Return ONLY a valid JSON object:
{
  "facebook_text": "...",
  "linkedin_text": "...",
  "twitter_text": "..."
}
`;

  const candidateModels = [
    'gemini-3.1-flash-lite',
    'gemini-3-flash-preview',
    'gemini-3.5-flash',
    'gemini-3.8-flash'
  ];

  for (const model of candidateModels) {
    try {
      console.log(`   Trying Gemini model: ${model}...`);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            responseMimeType: 'application/json'
          }
        })
      });

      if (!res.ok) continue;
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        const parsed = JSON.parse(text);
        if (parsed.facebook_text && parsed.twitter_text && parsed.linkedin_text) {
          console.log(`   ✅ Content generated successfully using ${model}!`);
          return parsed;
        }
      }
    } catch (err) {
      console.warn(`   ⚠️ Model ${model} failed:`, err.message);
    }
  }

  throw new Error('All Gemini models failed to generate content.');
}

async function getBufferChannels() {
  console.log('🔍 Discovering connected social channels in Buffer...');
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
  const orgId = orgData?.data?.account?.organizations?.[0]?.id;
  if (!orgId) throw new Error('No Buffer organization found');

  const channelsQuery = `
  query GetChannels($input: ChannelsInput!) {
    channels(input: $input) {
      id
      service
      name
    }
  }
  `;

  const chanRes = await fetch('https://api.buffer.com', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${BUFFER_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: channelsQuery,
      variables: { input: { organizationId: orgId } }
    })
  });

  const chanData = await chanRes.json();
  const allChannels = chanData?.data?.channels || [];
  return allChannels.filter(c => TARGET_SERVICES.includes(c.service.toLowerCase()));
}

async function publishToChannel(channelId, serviceKey, text, imageUrl) {
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
    mode: 'shareNow'
  };

  if (serviceKey === 'facebook') {
    input.metadata = { facebook: { type: 'post' } };
  }

  if (imageUrl) {
    input.assets = [{ image: { url: imageUrl } }];
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
    console.log(`   ✅ Sent Successfully! (Post ID: ${payload.post.id}, Status: ${payload.post.status})`);
    return true;
  } else if (payload?.message) {
    console.error(`   ❌ Buffer Error: ${payload.message}`);
    return false;
  }

  return true;
}

async function main() {
  console.log('==================================================');
  console.log('🍕 FLEXITAP POS: LAUNCH COUNTDOWN POST');
  console.log('   "Launch date tomorrow 9am CST"');
  console.log('==================================================\n');

  const history = loadHistory();

  // 1. Generate Bold Copy
  let copyData = await generateCountdownPost();

  // If twitter text happens to exceed 280, trim/adjust it
  if (copyData.twitter_text.length > 280) {
    console.log('✂️ Trimming Twitter text to fit under 280 characters...');
    copyData.twitter_text = copyData.twitter_text.slice(0, 245) + '... flexitapapp.com #FlexiTapPOS';
  }

  // 2. Select & Host Image
  const finalImageUrl = await obtainFoodImage(PIZZA_IMAGE_URL);

  // 3. Verify
  const check = verifyPost(copyData, finalImageUrl, history);
  if (!check.isClean) {
    console.error(`❌ Verification failed: ${check.reason}`);
    process.exit(1);
  }
  console.log('✅ Verifier PASSED: Bold copy & imagery are 100% verified and VIP-free!\n');

  console.log('📝 PREVIEW OF VERIFIED COPY:');
  console.log('--------------------------------------------------');
  console.log(`[TWITTER / X (${copyData.twitter_text.length} chars)]:`);
  console.log(copyData.twitter_text);
  console.log('\n[FACEBOOK / LINKEDIN SAMPLE]:');
  console.log(copyData.facebook_text.slice(0, 300) + '...\n');
  console.log('--------------------------------------------------\n');

  // 4. Publish to Buffer
  const channels = await getBufferChannels();
  console.log(`Found ${channels.length} channel(s) ready:`);
  for (const ch of channels) {
    console.log(` - ${ch.service.toUpperCase()}: ${ch.name} (${ch.id})`);
  }

  let successCount = 0;
  for (const channel of channels) {
    const s = channel.service.toLowerCase();
    console.log(`\n🚀 Publishing to [${s.toUpperCase()}] "${channel.name}"...`);

    let postText = copyData.facebook_text;
    if (s === 'twitter') postText = copyData.twitter_text;
    if (s === 'linkedin') postText = copyData.linkedin_text;

    const ok = await publishToChannel(channel.id, s, postText, finalImageUrl);
    if (ok) successCount++;
  }

  // 5. Record to history
  saveHistoryEntry({
    date: new Date().toISOString(),
    feature: 'Official US Launch Countdown - Tomorrow at 9:00 AM CST',
    persona: 'High-volume artisan wood-fired pizzerias and Italian trattorias',
    angle: 'Bold Launch Eve Countdown: Launch date tomorrow 9am CST',
    foodCategory: 'pizza',
    summary: copyData.facebook_text.slice(0, 160) + '...',
    imageUrl: finalImageUrl
  });

  console.log('\n==================================================');
  console.log(`🎉 Finished! Successfully published across ${successCount}/${channels.length} channels.`);
  console.log('==================================================');
}

main().catch(err => {
  console.error('Fatal Error:', err);
  process.exit(1);
});
