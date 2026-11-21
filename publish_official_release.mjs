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

export async function uploadLocalImageToImgBB(localFilePath) {
  if (!IMGBB_API_KEY) return null;
  try {
    const fileBuffer = fs.readFileSync(localFilePath);
    const base64 = fileBuffer.toString('base64');
    const formData = new FormData();
    formData.append('image', base64);

    const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
      method: 'POST',
      body: formData
    });
    if (res.ok) {
      const data = await res.json();
      return data?.data?.url || data?.data?.display_url;
    }
  } catch (err) {
    console.warn('⚠️ ImgBB local upload error:', err.message);
  }
  return null;
}

export async function generateOfficialLaunchCopy() {
  console.log('🧠 Composing Official Release Post via Gemini...');

  const prompt = `
You are a top-tier tech & restaurant marketing copywriter. Create a HIGH-IMPACT, THRILLING, CELEBRATORY OFFICIAL LAUNCH ANNOUNCEMENT for FlexiTap POS.

CRITICAL BREAKING NEWS:
🎉 FLEXITAP POS IS NOW OFFICIALLY RELEASED & LIVE!
💻 WINDOWS & 📱 ANDROID VERSIONS ARE NOW READY FOR IMMEDIATE DOWNLOAD!
Doors are officially OPEN right now at: flexitapapp.com

THE CORE HIGHLIGHTS TO FEATURE:
1. Multi-Platform Freedom (BYOD): Download and run directly on your existing hardware—Windows PC touchscreens, POS all-in-ones, or Android tablets and handhelds. No expensive proprietary hardware lock-ins.
2. 100% Offline Local LAN Resilience: Built from the ground up for food service and retail. If your internet goes down, orders keep ringing, kitchen tickets keep printing, and your restaurant never skips a beat.
3. Total Processor Freedom: Bring your own merchant processor and terminal. Zero hidden transaction percentage cuts.
4. 5-Minute Staff Training: Fast, frictionless setup so your team can start taking orders immediately.
5. Simple, Honest Pricing: Free 1-terminal plan on Waitlist. Plus ($290/yr flat) and Pro ($590/yr flat) lifetime price-lock rates.

STRICT MANDATORY RULES:
1. STRICT FORBIDDEN WORD (CRITICAL): NEVER USE THE WORD 'VIP', 'VIP PASS', OR 'VIP TIER' ANYWHERE!
2. Official Release Status: State clearly that the software is NOW OFFICIALLY RELEASED and AVAILABLE FOR DOWNLOAD on both Windows and Android at flexitapapp.com.
3. Tone: Electrifying, bold, professional, and celebratory.
4. Platforms:
   - "facebook_text": Comprehensive, bold launch announcement with emoji headers (🚀, 💻, 📱, ⚡, 💰), highlighting Windows & Android availability, local LAN offline power, pricing, and download links.
   - "linkedin_text": Professional, industry-disruptive tone for restaurant founders, GMs, and retail operators. Focus on hardware flexibility, offline uptime, processor freedom, and download readiness.
   - "twitter_text": MUST be under 260 characters total. Punchy and bold. Include Windows & Android ready for download now. Must end with: "Download now: flexitapapp.com #FlexiTapPOS #RestaurantTech"

Return ONLY a valid JSON object:
{
  "facebook_text": "...",
  "linkedin_text": "...",
  "twitter_text": "..."
}
`;

  const candidateModels = [
    'gemini-3-flash-preview',
    'gemini-3.1-flash-lite',
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
        signal: AbortSignal.timeout(12000),
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            responseMimeType: 'application/json'
          }
        })
      });

      if (!res.ok) {
        console.warn(`   ⚠️ Model ${model} returned HTTP ${res.status}`);
        continue;
      }
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
      console.warn(`   ⚠️ Model ${model} error:`, err.message);
    }
  }

  throw new Error('Failed to generate launch copy');
}

export async function publishToBuffer(copyData, imageUrl) {
  // Anti-VIP safety check
  const fullText = `${copyData.facebook_text} ${copyData.linkedin_text} ${copyData.twitter_text}`;
  if (/\bvip\b/i.test(fullText)) {
    throw new Error('Copy contains forbidden word VIP!');
  }

  const orgQuery = `query { account { organizations { id } } }`;
  const orgRes = await fetch('https://api.buffer.com', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${BUFFER_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: orgQuery })
  });
  const orgData = await orgRes.json();
  const orgId = orgData?.data?.account?.organizations?.[0]?.id;

  const chanQuery = `query GetChannels($input: ChannelsInput!) { channels(input: $input) { id service name } }`;
  const chanRes = await fetch('https://api.buffer.com', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${BUFFER_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: chanQuery, variables: { input: { organizationId: orgId } } })
  });
  const chanData = await chanRes.json();
  const channels = (chanData?.data?.channels || []).filter(c => TARGET_SERVICES.includes(c.service.toLowerCase()));

  console.log(`📡 Ready to publish across ${channels.length} channels.`);

  const mutation = `
  mutation CreatePost($input: CreatePostInput!) {
    createPost(input: $input) {
      ... on PostActionSuccess { post { id status } }
      ... on MutationError { message }
    }
  }
  `;

  let sentCount = 0;
  for (const ch of channels) {
    const s = ch.service.toLowerCase();
    let text = copyData.facebook_text;
    if (s === 'twitter') text = copyData.twitter_text;
    if (s === 'linkedin') text = copyData.linkedin_text;

    const input = {
      channelId: ch.id,
      text,
      schedulingType: 'automatic',
      mode: 'shareNow'
    };
    if (s === 'facebook') {
      input.metadata = { facebook: { type: 'post' } };
    }
    if (imageUrl) {
      input.assets = [{ image: { url: imageUrl } }];
    }

    const postRes = await fetch('https://api.buffer.com', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${BUFFER_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: mutation, variables: { input } })
    });
    const result = await postRes.json();
    const postPayload = result.data?.createPost;
    if (postPayload?.post) {
      console.log(`✅ [${s.toUpperCase()}] Published! ID: ${postPayload.post.id}`);
      sentCount++;
    } else {
      console.error(`❌ [${s.toUpperCase()}] Error:`, result);
    }
  }

  saveHistoryEntry({
    date: new Date().toISOString(),
    feature: 'Official Launch Release - Windows & Android Available Now',
    persona: 'All US Restaurant, Cafe, Bar & Retail Operators',
    angle: 'Official Launch Release: Windows and Android Ready for Download',
    foodCategory: 'launch_official',
    summary: copyData.facebook_text.slice(0, 160) + '...',
    imageUrl
  });

  return sentCount;
}
