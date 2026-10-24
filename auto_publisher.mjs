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

// Curated high-res hospitality lifestyle photography (POS, modern cafes, food trucks, bars, bakeries, markets)
const CURATED_VISUALS = [
  'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1080&q=80', // Cozy cafe counter
  'https://images.unsplash.com/photo-1556742049-0a67c5574f73?auto=format&fit=crop&w=1080&q=80', // Seamless payment checkout
  'https://images.unsplash.com/photo-1565123409695-7b5ef63a2efb?auto=format&fit=crop&w=1080&q=80', // Food truck service window
  'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1080&q=80', // Bright coffee shop interior
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1080&q=80', // High-energy restaurant dining
  'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1080&q=80', // Modern bistro counter & tables
  'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?auto=format&fit=crop&w=1080&q=80', // Friendly barista pouring latte
  'https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=1080&q=80', // Artisan bakery & pastry display
  'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1080&q=80', // Bustling craft cocktail bar
  'https://images.unsplash.com/photo-1579758629938-03607ccdbaba?auto=format&fit=crop&w=1080&q=80', // Farmers market fresh stall
  'https://images.unsplash.com/photo-1534723452862-4c874018d66d?auto=format&fit=crop&w=1080&q=80', // Retail boutique register
  'https://images.unsplash.com/photo-1516738901171-8eb4fc13bd20?auto=format&fit=crop&w=1080&q=80', // Busy urban street food truck
  'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&w=1080&q=80', // Clean tablet ordering checkout
  'https://images.unsplash.com/photo-1481833761820-0509d32170dd?auto=format&fit=crop&w=1080&q=80', // Coffee shop register interaction
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1080&q=80', // Restaurant dining floor & servers
  'https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&w=1080&q=80', // Warm cafe afternoon hospitality
  'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1080&q=80', // Craft brewery taproom
  'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=1080&q=80', // Artisan pancakes & brunch cafe
  'https://images.unsplash.com/photo-1541544741938-0af808871cc0?auto=format&fit=crop&w=1080&q=80', // Outdoor patio ordering
  'https://images.unsplash.com/photo-1578474846511-04ba529f0b88?auto=format&fit=crop&w=1080&q=80'  // Pizzeria counter checkout
];

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
    focus: 'What happens when Wi-Fi drops during Friday rush? Orders keep ringing, thermal printers print, Z-reports save locally. Zero cloud lag, zero dropped sales.'
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
  'A vivid day-in-the-life storytelling hook about surviving peak rush hour.',
  'An honest operator-to-operator confessional addressing the hidden pain points of traditional POS systems.',
  'A sharp, high-contrast comparison between fragile cloud-only POS vs. FlexiTap offline resilience.',
  'A staff-first perspective highlighting speed, simplicity, and zero training stress.',
  'A financial-impact angle highlighting lost revenue from downtime and sneaky monthly SaaS charges.',
  'An energetic countdown excitement angle building anticipation toward the November 13, 2026 US launch.'
];

// US Market Focus Personas
const US_PERSONAS = [
  'Austin, Texas food truck & taco trailer operators battling Wi-Fi drops at outdoor festivals',
  'Brooklyn & Seattle independent specialty coffee shop baristas and cafe owners needing lightning-fast morning checkouts',
  'Chicago & Denver busy sports bars and craft taprooms managing simultaneous drink orders and open tabs',
  'Portland & Nashville artisan bakeries and pop-up market vendors needing simple 1-terminal offline sales',
  'Miami & Los Angeles fast-casual outdoor dining spots with high staff turnover needing instant 5-minute training',
  'Atlanta & Philadelphia quick-service deli and pizzeria owners looking for zero-hardware crash guarantees'
];

// --- 1. Generate Platform-Tailored Copy via Gemini 3.8 Flash ---
async function generatePostContent() {
  // Randomly select one unique feature module, storytelling angle, and persona
  const selectedModule = FEATURE_MODULES[Math.floor(Math.random() * FEATURE_MODULES.length)];
  const selectedAngle = COPY_ANGLES[Math.floor(Math.random() * COPY_ANGLES.length)];
  const selectedPersona = US_PERSONAS[Math.floor(Math.random() * US_PERSONAS.length)];
  const randomSeed = Math.floor(Math.random() * 100000);

  console.log('🧠 Step 1: Generating tailored post copies via Gemini...');
  console.log(`   📌 Spotlight Feature: "${selectedModule.name}"`);
  console.log(`   🎯 Target Persona: ${selectedPersona}`);
  console.log(`   🎨 Creative Angle: ${selectedAngle}`);

  const prompt = `
You are an expert hospitality and POS marketing copywriter. Generate fresh, high-converting social media posts and an image concept for FlexiTap POS tailored specifically for the US market.

TODAY'S SPECIAL FOCUS (Make this post uniquely centered on these details):
- Spotlight Feature: ${selectedModule.name}
- Feature Tier: ${selectedModule.tier}
- Core Feature Value: ${selectedModule.focus}
- Target Persona: ${selectedPersona}
- Storytelling Hook / Angle: ${selectedAngle}
- Creative Variation Seed: ${randomSeed}

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
- "facebook_text": Engaging story format with fresh phrasing, emojis, feature breakdown, clear tier rules, and CTA. Do NOT reuse common canned opening lines.
- "linkedin_text": Professional, founder-to-operator tone with clear operational and bottom-line benefits.
- "twitter_text": MUST be under 260 characters total, punchy, ending with "Nov 13 US Launch: flexitapapp.com #FlexiTapPOS".

Return ONLY a valid JSON object with exactly these keys:
{
  "facebook_text": "...",
  "linkedin_text": "...",
  "twitter_text": "...",
  "image_prompt": "photorealistic prompt for Google Imagen capturing ${selectedPersona}"
}
`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${GEMINI_API_KEY}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
    throw new Error(`Gemini API Error (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  const textOutput = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textOutput) {
    throw new Error('No output received from Gemini');
  }

  return JSON.parse(textOutput);
}

// --- 2. Generate Truly Unique AI Image Every Run ---
async function obtainPostImage(imagePrompt) {
  console.log('🎨 Step 2: Generating unique AI visual asset...');
  const randomSeed = Math.floor(Math.random() * 1000000);

  // 1. Try Google Imagen 3 if enabled on the API key
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

  // 2. High-performance Free AI Image Generator (Flux Engine - 100% Unique Every Time)
  try {
    console.log('   ✨ Generating fresh photorealistic AI image via Flux engine...');
    const cleanPrompt = encodeURIComponent(imagePrompt.slice(0, 350));
    const aiUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}?width=1080&height=1080&nologo=true&seed=${randomSeed}&model=flux`;
    
    // Verify image responds
    const headRes = await fetch(aiUrl, { method: 'HEAD' });
    if (headRes.ok) {
      console.log('   ✅ AI Image generated successfully!');
      console.log(`   🔗 Direct AI Image URL: ${aiUrl.slice(0, 80)}...`);
      return aiUrl;
    }
  } catch (err) {
    console.warn('   ⚠️ AI Image engine warning:', err.message);
  }

  // 3. Last-resort safety fallback
  const randomUrl = CURATED_VISUALS[Math.floor(Math.random() * CURATED_VISUALS.length)];
  console.log('   📸 Selected fallback lifestyle visual.');
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
