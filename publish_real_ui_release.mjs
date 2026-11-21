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

const REAL_UI_IMAGE_URL = 'https://i.ibb.co/PsZ9ZQq8/0d4c532701a7.jpg';

async function generateRealUICopy() {
  console.log('🧠 Composing Official Release Post featuring the REAL FlexiTap POS UI Dashboard...');

  const prompt = `
You are a premier SaaS & hospitality marketing copywriter. Create a HIGH-IMPACT, POLISHED, CELEBRATORY OFFICIAL LAUNCH POST for FlexiTap POS showcasing our ACTUAL UI DASHBOARD.

CONTEXT & IMAGE DETAILS:
The attached screenshot is the REAL FlexiTap POS dashboard running live:
- Sleek modern dark mode interface designed for zero eye fatigue.
- Clear register & ticket status (Register 1 Master, Ticket T1-1007, Server: Administrator).
- Real-time online/local LAN status indicator.
- Multi-category support on one screen: "Hot Beverages" (Hot Coffee $3.50, Iced Latte $4.25), "Bakery" (Chocolate Muffin $2.99, Croissant $3.25), and "Retail" (FlexiTap T-Shirt $19.99) — showing operators they can sell food, drinks, and merchandise without switching apps.
- Instant barcode & QR code scanning ("Search or Scan Barcode").
- Dedicated "Held Tickets" order parking drawer so lines keep moving while guests grab a table.
- Direct operational controls: Tables, Menu, Discount, Notes, Transfer, Send Order (KDS routing), Print Check, Assign Customer.

CRITICAL LAUNCH ANNOUNCEMENT:
🎉 FLEXITAP POS IS OFFICIALLY RELEASED & READY FOR DOWNLOAD!
💻 WINDOWS & 📱 ANDROID VERSIONS ARE LIVE RIGHT NOW AT: flexitapapp.com

CORE VALUE PROPOSITION:
1. Multi-Platform Freedom (BYOD): Download directly onto any Windows PC / touch all-in-one or Android tablet. Zero proprietary hardware required.
2. 100% Offline Local LAN Resilience: Built to keep ringing orders, printing kitchen tickets, and processing sales even when external internet goes dark.
3. Processor Freedom: Connect your preferred credit card terminal; zero per-transaction cuts taken from your revenue.
4. 5-Minute Staff Training: As you can see from the interface, it's so intuitive staff can start taking orders in 5 minutes flat.
5. Honest Lifetime Pricing: Free 1-terminal plan on Waitlist. Plus ($290/year flat) & Pro ($590/year flat) lifetime price-lock rates.

STRICT MANDATORY RULES:
1. STRICT FORBIDDEN WORD (CRITICAL): NEVER USE THE WORD 'VIP', 'VIP PASS', OR 'VIP TIER' ANYWHERE!
2. Call attention to the real dashboard in the screenshot: Mention the sleek dark mode, unified beverage/bakery/retail workflow, and intuitive register controls.
3. Explicit Download CTA: Clearly state that Windows & Android apps are available for download at flexitapapp.com.
4. Output Platforms:
   - "facebook_text": Engaging walkthrough of the official release, walking the reader through the actual UI features in the screenshot, outlining Windows & Android availability, pricing, and download links.
   - "linkedin_text": Professional, operator-focused announcement highlighting UI simplicity, multi-vertical flexibility (cafe/bakery/merch), local LAN offline uptime, processor freedom, and Windows/Android download availability.
   - "twitter_text": MUST be under 260 characters total. Punchy, bold, calling out the real UI and Windows/Android release. Must end with: "Download now: flexitapapp.com #FlexiTapPOS #RestaurantTech"

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

  throw new Error('Failed to generate copy from all Gemini models');
}

async function publishToBuffer(copyData, imageUrl) {
  // Anti-VIP safety check
  const fullText = `${copyData.facebook_text} ${copyData.linkedin_text} ${copyData.twitter_text}`;
  if (/\bvip\b/i.test(fullText)) {
    throw new Error('Copy contains forbidden word VIP!');
  }

  // Twitter char limit check
  if (copyData.twitter_text.length > 280) {
    console.log('✂️ Trimming Twitter text under 280 chars...');
    copyData.twitter_text = copyData.twitter_text.slice(0, 245) + '... flexitapapp.com #FlexiTapPOS';
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
      console.log(`✅ [${s.toUpperCase()}] Published! ID: ${postPayload.post.id}, Status: ${postPayload.post.status}`);
      sentCount++;
    } else {
      console.error(`❌ [${s.toUpperCase()}] Error:`, result);
    }
  }

  saveHistoryEntry({
    date: new Date().toISOString(),
    feature: 'Official Release - Real UI Dashboard (Windows & Android Live)',
    persona: 'All US Restaurant, Cafe, Bar & Retail Operators',
    angle: 'Official Launch Release: Real UI Dashboard Showcase with Windows & Android Downloads',
    foodCategory: 'real_ui_dashboard',
    summary: copyData.facebook_text.slice(0, 160) + '...',
    imageUrl
  });

  return sentCount;
}

async function main() {
  console.log('==================================================');
  console.log('🚀 FLEXITAP POS: REAL UI DASHBOARD OFFICIAL RELEASE');
  console.log('==================================================\n');

  console.log(`📸 Image Asset: ${REAL_UI_IMAGE_URL}\n`);

  const copyData = await generateRealUICopy();

  console.log('📝 PREVIEW OF VERIFIED COPY:');
  console.log('--------------------------------------------------');
  console.log(`[TWITTER / X (${copyData.twitter_text.length} chars)]:`);
  console.log(copyData.twitter_text);
  console.log('\n[FACEBOOK SAMPLE]:');
  console.log(copyData.facebook_text.slice(0, 320) + '...\n');
  console.log('[LINKEDIN SAMPLE]:');
  console.log(copyData.linkedin_text.slice(0, 320) + '...\n');
  console.log('--------------------------------------------------\n');

  const count = await publishToBuffer(copyData, REAL_UI_IMAGE_URL);
  console.log(`\n🎉 Successfully published to ${count} channel(s)!`);
}

main().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
