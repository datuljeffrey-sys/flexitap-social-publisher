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

// --- History & Deduplication Memory Engine ---
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
    // Keep a rolling record of the last 30 posts
    const trimmed = history.slice(-30);
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(trimmed, null, 2), 'utf-8');
    console.log(`💾 Saved post to history.json (${trimmed.length} total entries tracked).`);
  } catch (err) {
    console.error('⚠️ Could not save history entry:', err.message);
  }
}

// Categorized high-res fallback visuals strictly matched by industry (Never random ceiling lights!)
const INDUSTRY_FALLBACK_VISUALS = {
  coffee: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1080&q=80',
  bar: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1080&q=80',
  bakery: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=1080&q=80',
  dining: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1080&q=80',
  pizza: 'https://images.unsplash.com/photo-1578474846511-04ba529f0b88?auto=format&fit=crop&w=1080&q=80',
  retail: 'https://images.unsplash.com/photo-1534723452862-4c874018d66d?auto=format&fit=crop&w=1080&q=80',
  foodtruck: 'https://images.unsplash.com/photo-1565123409695-7b5ef63a2efb?auto=format&fit=crop&w=1080&q=80',
  default: 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?auto=format&fit=crop&w=1080&q=80'
};

// 12 Authentic Feature Modules Extracted Directly from FlexiTap's Website & Architecture
const FEATURE_MODULES = [
  {
    name: 'Live Order Status Display (OSD) & Queue Transparency',
    tier: 'PAID TIER / Plus & Pro Founders VIP ($290 or $590/yr fixed)',
    focus: 'Mount any TV or tablet in your lobby to show real-time dual-column pickup board (⏳ Preparing to ✓ Now Serving). Eliminates crowded counters and shouted ticket numbers, auto-synced with KDS over local LAN.'
  },
  {
    name: 'Dynamic Digital Menu Boards (DMB) Over Local LAN',
    tier: 'PAID TIER / Plus & Pro Founders VIP ($290 or $590/yr fixed)',
    focus: 'Mount any TV or HDMI smart display overhead. Broadcast live menu categories, real-time pricing, and promotional tickers directly over LAN—eliminating costly third-party menu board SaaS subscriptions.'
  },
  {
    name: 'Dedicated Kitchen Display System (KDS) & Paperless Routing',
    tier: 'PAID TIER / Plus & Pro Founders VIP ($290 or $590/yr fixed)',
    focus: 'Replace paper clutter and lost kitchen receipts with clean digital prep screens. Incoming tickets route automatically by station (Hot Bar, Cold Prep, Drinks) with visual completion cues and all-caught-up confirmations.'
  },
  {
    name: 'Customer-Facing Display (CDS) & QR Loyalty Sign-Up',
    tier: 'PAID TIER / Plus & Pro Founders VIP ($290 or $590/yr fixed)',
    focus: 'Turn any secondary tablet, touch monitor, or compact screen toward your customer. Streams active cart items, taxes, totals, and frictionless QR loyalty sign-up codes in real-time over your private local LAN.'
  },
  {
    name: 'Resilient Offline Architecture & Zero Downtime Guarantee',
    tier: 'Core Engine (1 terminal free on Waitlist, multi-device on Founders VIP)',
    focus: 'What happens when Wi-Fi drops during peak rush? Orders keep ringing, thermal printers print, and Z-reports save locally. Zero cloud lag, zero dropped sales, zero dependency on external servers.'
  },
  {
    name: 'Visual Table Floor Plans, Seat-Based Ordering & Bill Split',
    tier: 'PAID TIER / Plus & Pro Founders VIP ($290 or $590/yr fixed)',
    focus: 'Drag-and-drop table layouts, real-time table statuses, seat-based course ordering, and table-side guest ordering from roaming tablets for restaurants, bistros, and sports bars.'
  },
  {
    name: 'High-Density SKU Retail Flow, Barcode Lookup & Cart Parking',
    tier: 'All Tiers (Free Waitlist up to 300 orders/mo, Unlimited on Founders VIP)',
    focus: 'Sub-second barcode and SKU matching, real-time stock levels on every item tile, instant cart suspend/parking to serve the next customer, and instant customer loyalty lookup.'
  },
  {
    name: 'Salon, Spa & Appointment Services with Staff Commission Splits',
    tier: 'All Tiers (Free Waitlist up to 300 bookings/mo, Unlimited on Founders VIP)',
    focus: 'Integrated appointment timeline, booking statuses (In-Progress, Confirmed, Scheduled), private treatment suites, and automatic therapist commission calculations right on checkout tickets.'
  },
  {
    name: 'Ask Flexi - The Offline AI Business Analyst',
    tier: 'PAID TIER & Pro Founders VIP Exclusive ($590/yr fixed)',
    focus: 'On-device natural language AI answering instant operational questions: "What was our highest-margin item tonight?" or "When was our rush peak?" completely offline without cloud latency.'
  },
  {
    name: 'Hardware Freedom (BYOD - Bring Your Own Device)',
    tier: 'All Tiers Philosophy',
    focus: 'Zero proprietary hardware lock-in! Works seamlessly with ESC/POS thermal printers (Bluetooth, USB, LAN), standard RJ11 cash drawers, barcode scanners, Android tablets, Windows PCs, iPads, and Macs.'
  },
  {
    name: 'Real Human Support & Done-For-You Menu Setup',
    tier: 'Founders VIP Guarantee & Launch Promise',
    focus: 'No lifeless chatbots. FlexiTap provides Live Phone Support, Hands-On Remote Screen Desktop Assistance, Done-For-You Menu Setup, and Launch Shift Standby Support so operators are never stranded.'
  },
  {
    name: 'Free Launch Waitlist ($0/mo) vs Founders VIP Lifetime Price Lock',
    tier: 'Pricing & VIP Value Comparison',
    focus: 'Solo pop-ups get $0/mo free for life (1 terminal, offline sales). Growing cafes lock in Plus VIP for $290/year (down from $490) or Pro VIP for $590/year (down from $990) with permanent lifetime price-lock guarantee.'
  }
];

// Diverse Storytelling Hooks & Angles
const COPY_ANGLES = [
  'A vivid day-in-the-life storytelling hook about surviving peak rush hour with zero stress.',
  'An honest operator-to-operator confessional addressing the hidden pain points and predatory contracts of traditional POS systems.',
  'A sharp, high-contrast comparison between fragile cloud-only POS vs. FlexiTap offline resilience.',
  'A staff-first perspective highlighting lightning speed, intuitive controls, and zero training frustration.',
  'A financial-impact breakdown highlighting preserved revenue, zero surprise SaaS fees, and protected profit margins.',
  'An energetic countdown excitement angle building anticipation toward the November 13, 2026 US launch.'
];

// 10 Distinct US Personas & Market Verticals
const US_PERSONAS = [
  'Brooklyn & Seattle independent specialty coffee shop baristas and cafe owners needing lightning-fast morning checkouts',
  'Chicago & Denver busy sports bars and craft taprooms managing simultaneous drink orders, table tabs, and split bills',
  'Portland & Nashville artisan bakeries and pop-up market vendors needing simple 1-terminal offline sales and cash drawer control',
  'Miami & Los Angeles fast-casual outdoor dining spots with high staff turnover needing instant 5-minute training',
  'Atlanta & Philadelphia quick-service deli and pizzeria owners looking for zero-hardware crash guarantees during lunch surges',
  'San Francisco & San Diego retail clothing boutiques & gift shops needing rapid barcode scanning, inventory lookups, and cart parking',
  'Dallas & Houston busy full-service steakhouses and BBQ joints needing visual floor plans, seat pacing, and multi-terminal sync',
  'Phoenix & Scottsdale hair salons, spas, and wellness studios needing staff commission splits and appointment scheduling',
  'New York City & Boston multi-location fast-casual concepts wanting overhead digital menu boards without SaaS subscriptions',
  'Austin, Texas food truck & taco trailer operators battling mobile hotspot drops at outdoor events'
];

// --- Select Least-Recently-Used Feature, Persona, and Angle ---
function selectFreshTopic(history) {
  const recentEntries = history.slice(-7); // Look back at the last 7 posts
  const recentFeatures = recentEntries.map(e => e.feature);
  const recentPersonas = recentEntries.map(e => e.persona);
  const recentAngles = recentEntries.map(e => e.angle);

  // 1. Pick Feature
  const unusedFeatures = FEATURE_MODULES.filter(m => !recentFeatures.includes(m.name));
  const candidateFeatures = unusedFeatures.length > 0 ? unusedFeatures : FEATURE_MODULES;
  // Pick random from candidates to ensure non-deterministic order
  const selectedModule = candidateFeatures[Math.floor(Math.random() * candidateFeatures.length)];

  // 2. Pick Persona
  const unusedPersonas = US_PERSONAS.filter(p => !recentPersonas.includes(p));
  const candidatePersonas = unusedPersonas.length > 0 ? unusedPersonas : US_PERSONAS;
  const selectedPersona = candidatePersonas[Math.floor(Math.random() * candidatePersonas.length)];

  // 3. Pick Angle
  const unusedAngles = COPY_ANGLES.filter(a => !recentAngles.includes(a));
  const candidateAngles = unusedAngles.length > 0 ? unusedAngles : COPY_ANGLES;
  const selectedAngle = candidateAngles[Math.floor(Math.random() * candidateAngles.length)];

  return {
    selectedModule,
    selectedPersona,
    selectedAngle,
    recentEntries
  };
}

// --- 1. Generate Platform-Tailored Copy via Gemini ---
async function generatePostContent() {
  const history = loadHistory();
  const { selectedModule, selectedPersona, selectedAngle, recentEntries } = selectFreshTopic(history);
  const randomSeed = Math.floor(Math.random() * 100000);

  console.log('🧠 Step 1: Generating tailored post copies via Gemini...');
  console.log(`   📌 TODAY'S EXCLUSIVE TOPIC: "${selectedModule.name}"`);
  console.log(`   🎯 Target Persona: ${selectedPersona}`);
  console.log(`   🎨 Creative Angle: ${selectedAngle}`);

  // Build list of recently used themes for the negative prompt
  const recentExclusions = recentEntries.map((e, idx) => `  ${idx + 1}. Feature: "${e.feature}" | Persona: "${e.persona}" | Summary: "${e.summary?.slice(0, 70)}..."`).join('\n');

  const isAskFlexiTopic = selectedModule.name.toLowerCase().includes('ask flexi');

  const prompt = `
You are an expert hospitality and POS marketing copywriter. Generate fresh, high-converting social media posts and a matching visual prompt for FlexiTap POS tailored specifically for the US market.

=======================================================
STRICT TOPIC MANDATE:
This post MUST be 100% dedicated to TODAY'S EXCLUSIVE FEATURE:
👉 FEATURE: "${selectedModule.name}"
👉 APPLICABLE TIER: ${selectedModule.tier}
👉 KEY DETAILS & BENEFIT: ${selectedModule.focus}
👉 TARGET VENUE & AUDIENCE: ${selectedPersona}
👉 NARRATIVE ANGLE: ${selectedAngle}
👉 VARIATION SEED: ${randomSeed}

=======================================================
NEGATIVE EXCLUSION LIST (RECENTLY POSTED - DO NOT REPEAT):
The following topics and personas were published in the last few days. You are STRICTLY FORBIDDEN from repeating their phrasing, scenarios, or concepts:
${recentExclusions || '  (No previous posts in history)'}

MANDATORY AVOIDANCE RULES:
- DO NOT mention tacos, food trucks, outdoor festivals, Wi-Fi cell tower drops on Barton Springs, or South Congress! (This was just posted multiple times).
- Focus 100% on ${selectedPersona} and their UNIQUE industry reality.
${isAskFlexiTopic ? `
- This post IS about "Ask Flexi" (Offline AI Business Analyst). Detail how it crunches operational numbers locally on the device without Wi-Fi. Promoted under the Pro Founders VIP Pass ($590/year fixed).
` : `
- DO NOT mention "Ask Flexi" or AI business analyst in this post at all!
- DO NOT use canned questions like "What was our highest-margin item?" or "When was our rush peak?".
- Focus entirely and specifically on ${selectedModule.name}.
`}
=======================================================

Call to Action:
- Highlight official US Launch on November 13, 2026.
- Encourage booking at flexitapapp.com or sending a DM.
- Include 3 to 5 relevant US hashtags, always including #FlexiTapPOS.

Platform Output Requirements:
- "facebook_text": Engaging story format with fresh phrasing, emojis, feature breakdown, clear tier rules, and CTA.
- "linkedin_text": Professional, founder-to-operator tone with clear operational and bottom-line benefits.
- "twitter_text": MUST be under 260 characters total, punchy, ending with "Nov 13 US Launch: flexitapapp.com #FlexiTapPOS".
- "image_prompt": A photorealistic commercial photography prompt showcasing a realistic POS setup matching this EXACT venue and feature (e.g. if Kitchen Display, show kitchen pass screen with chefs; if Coffee, show espresso bar with tablet register; if Sports Bar, show taproom counter with tablet POS; if Menu Board, show crisp overhead TV screen). Aspect ratio 1:1, photorealistic, cinematic lighting, 8k.

Return ONLY a valid JSON object with exactly these keys:
{
  "facebook_text": "...",
  "linkedin_text": "...",
  "twitter_text": "...",
  "image_prompt": "..."
}
`;

  const candidateModels = [
    'gemini-3.5-flash',
    'gemini-3-flash-preview',
    'gemini-3.1-flash-lite',
    'gemini-3.8-flash',
    'gemini-3.6-flash'
  ];

  let lastError = null;
  for (const model of candidateModels) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`   Attempting model ${model} (attempt ${attempt}/2)...`);
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(18000),
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.9,
              topP: 0.95
            }
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.warn(`   ⚠️ Model ${model} returned ${response.status}: ${errorText.slice(0, 150)}`);
          lastError = new Error(`Gemini API Error [${model}] (${response.status}): ${errorText}`);
          if (response.status === 503 && attempt < 3) {
            console.log('   ⏳ Retrying in 2 seconds...');
            await new Promise(res => setTimeout(res, 2000));
            continue;
          }
          break;
        }

        const result = await response.json();
        const textOutput = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!textOutput) {
          lastError = new Error(`No output received from Gemini [${model}]`);
          break;
        }

        console.log(`   ✅ Content generated using ${model}!`);
        const parsed = JSON.parse(textOutput);
        return {
          copyData: parsed,
          metadata: {
            feature: selectedModule.name,
            persona: selectedPersona,
            angle: selectedAngle
          }
        };
      } catch (err) {
        console.warn(`   ⚠️ Model ${model} error:`, err.message);
        lastError = err;
        break;
      }
    }
  }

  throw lastError || new Error('Failed to generate content with any Gemini model');
}

// --- 2. Generate Truly Unique AI Image & Host on Public CDN ---
async function obtainPostImage(imagePrompt, persona) {
  console.log('🎨 Step 2: Generating unique AI visual asset...');
  const randomSeed = Math.floor(Math.random() * 1000000);

  // 1. Try Google Imagen 3 if available on the key
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

  // 2. High-performance Free AI Generator (Pollinations default engine - Fast, reliable & free)
  try {
    console.log('   ✨ Generating fresh photorealistic AI image...');
    const cleanPrompt = encodeURIComponent(imagePrompt.slice(0, 300));
    const aiUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}?width=1024&height=1024&nologo=true&seed=${randomSeed}`;
    
    const imgRes = await fetch(aiUrl);
    if (imgRes.ok) {
      const arrayBuffer = await imgRes.arrayBuffer();
      if (arrayBuffer.byteLength > 10000) {
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        console.log(`   ✅ Image generated (${Math.round(arrayBuffer.byteLength / 1024)} KB)! Hosting on ImgBB CDN...`);
        const hostedUrl = await uploadToPublicCDN(base64);
        if (hostedUrl) return hostedUrl;
      }
    }
  } catch (err) {
    console.warn('   ⚠️ AI Image engine warning:', err.message);
  }

  // 3. Persona-matched high-res fallback visual (Never unrelated stock!)
  let fallbackKey = 'default';
  const pLower = (persona || '').toLowerCase();
  if (pLower.includes('coffee') || pLower.includes('cafe')) fallbackKey = 'coffee';
  else if (pLower.includes('bar') || pLower.includes('taproom')) fallbackKey = 'bar';
  else if (pLower.includes('bakery')) fallbackKey = 'bakery';
  else if (pLower.includes('pizza') || pLower.includes('deli')) fallbackKey = 'pizza';
  else if (pLower.includes('retail') || pLower.includes('boutique')) fallbackKey = 'retail';
  else if (pLower.includes('food truck')) fallbackKey = 'foodtruck';
  else fallbackKey = 'dining';

  const matchedUrl = INDUSTRY_FALLBACK_VISUALS[fallbackKey] || INDUSTRY_FALLBACK_VISUALS.default;
  console.log(`   📸 Selected industry-matched lifestyle visual (${fallbackKey}).`);
  console.log(`   🔗 Direct Public Image URL: ${matchedUrl}`);
  return matchedUrl;
}

// --- 3. Upload Image to Free Public Host (ImgBB) ---
async function uploadToPublicCDN(base64Image) {
  if (!IMGBB_API_KEY || !base64Image) {
    return null;
  }

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
    mode: process.env.BUFFER_SHARE_MODE || 'shareNow'
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
    console.log(`   ✅ Sent Successfully! (Post ID: ${payload.post.id}, Status: ${payload.post.status})`);
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
    // 1. Generate Platform-Specific Copy with Deduplication Engine
    const { copyData, metadata } = await generatePostContent();
    console.log('\n📝 Generated Copy Highlights:');
    console.log('--------------------------------------------------');
    console.log(`[Twitter/X (${copyData.twitter_text.length} chars)]:`);
    console.log(copyData.twitter_text);
    console.log('\n[Facebook/LinkedIn Sample]:');
    console.log(copyData.facebook_text.slice(0, 220) + '...\n');
    console.log('--------------------------------------------------\n');

    // 2. Obtain Visual Asset (AI generated & hosted on ImgBB CDN)
    const directImageUrl = await obtainPostImage(copyData.image_prompt, metadata.persona);

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

    // 6. Record to history.json so future runs never duplicate this
    if (successCount > 0) {
      saveHistoryEntry({
        date: new Date().toISOString(),
        feature: metadata.feature,
        persona: metadata.persona,
        angle: metadata.angle,
        summary: copyData.facebook_text.slice(0, 140) + '...',
        imageUrl: directImageUrl
      });
    }

    console.log('\n==================================================');
    console.log(`🎉 Finished! Successfully published across ${successCount}/${channelsToPost.length} channels.`);
    console.log('==================================================');
  } catch (err) {
    console.error('\n❌ Automation pipeline error:', err.message);
  }
}

main();
