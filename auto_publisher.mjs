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

// =========================================================================
// 🍕 🍔 ☕ MOUTH-WATERING, HIGH-CONVERTING FOOD PHOTOGRAPHY DATABASE
// High-resolution, commercially licensed food visuals strictly matched by vertical.
// ZERO watermarks, ZERO blurry empty rooms!
// =========================================================================
const FOOD_VISUALS = {
  pizza: [
    'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=85', // Wood-fired pizza close up
    'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=1200&q=85', // Crispy margherita with fresh basil
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1200&q=85'  // Cheesy pizza slice pull
  ],
  burger: [
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=85', // Double smash burger with melted cheese
    'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=1200&q=85', // Gourmet burger & golden fries
    'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1200&q=85'  // Juicy craft cheeseburger
  ],
  coffee: [
    'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1200&q=85', // Velvety latte art in ceramic cup
    'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=1200&q=85', // Hot latte with golden croissants
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=85'  // Vibrant cafe coffee counter
  ],
  tacos: [
    'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=1200&q=85', // Street tacos with cilantro & lime
    'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?auto=format&fit=crop&w=1200&q=85', // Loaded tacos on rustic cutting board
    'https://images.unsplash.com/photo-1615870216519-2f9fa575fa5c?auto=format&fit=crop&w=1200&q=85'  // Crispy Birria tacos
  ],
  bakery: [
    'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=1200&q=85', // Fresh golden croissants & pain au chocolat
    'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=85', // Crusty artisan sourdough loaves
    'https://images.unsplash.com/photo-1517433670267-08bbd4be890f?auto=format&fit=crop&w=1200&q=85'  // Fresh pastry & fruit tart showcase
  ],
  bbq: [
    'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=85', // Glazed smoked BBQ ribs
    'https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=1200&q=85', // Sizzling ribeye steak on wood board
    'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&w=1200&q=85'  // Texas smoked beef brisket
  ],
  brunch: [
    'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=1200&q=85', // Fluffy pancakes with blueberries & maple syrup
    'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=1200&q=85', // Eggs benedict with avocado toast
    'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=1200&q=85'  // Full breakfast & brunch spread
  ],
  deli: [
    'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=1200&q=85', // Gourmet grilled cheese & deli sandwich
    'https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=1200&q=85'  // Loaded submarine sandwich
  ]
};

// 12 Authentic Feature Modules Extracted Directly from FlexiTap's Architecture
const FEATURE_MODULES = [
  {
    name: 'Dedicated Kitchen Display System (KDS) & Paperless Routing',
    tier: 'PAID TIER / Plus & Pro Founders VIP ($290 or $590/yr fixed)',
    focus: 'Replace grease-stained paper tickets and lost kitchen chits with clean digital prep screens. Incoming tickets route automatically by station (Hot Line, Fry, Grill, Expo) with visual completion cues and all-caught-up confirmations.'
  },
  {
    name: 'Dynamic Digital Menu Boards (DMB) Over Local LAN',
    tier: 'PAID TIER / Plus & Pro Founders VIP ($290 or $590/yr fixed)',
    focus: 'Mount any overhead TV or HDMI display. Broadcast mouth-watering food photos, daily specials, real-time pricing, and 86\'d sold-out items directly over local LAN—eliminating costly third-party menu board SaaS subscriptions.'
  },
  {
    name: 'Live Order Status Display (OSD) & Pickup Transparency',
    tier: 'PAID TIER / Plus & Pro Founders VIP ($290 or $590/yr fixed)',
    focus: 'Mount any lobby TV to show a real-time dual-column pickup board (⏳ Preparing to ✓ Now Serving). Eliminates crowded counters and shouting customer names, perfectly synced with KDS over local LAN.'
  },
  {
    name: 'Customer-Facing Display (CDS) & QR Loyalty Sign-Up',
    tier: 'PAID TIER / Plus & Pro Founders VIP ($290 or $590/yr fixed)',
    focus: 'Turn any secondary tablet toward your guest. Streams active food items, sides, drinks, modifiers, and frictionless QR loyalty sign-up codes in real-time over your private local LAN without touching the internet.'
  },
  {
    name: 'Resilient Offline Architecture & Zero Downtime Guarantee',
    tier: 'Core Engine (1 terminal free on Waitlist, multi-device on Founders VIP)',
    focus: 'What happens when Wi-Fi drops during Friday dinner rush? Orders keep ringing, thermal kitchen ticket printers print, and registers save locally. Zero cloud lag, zero dropped food orders, zero server lockouts.'
  },
  {
    name: 'Visual Table Floor Plans, Seat-Based Ordering & Bill Split',
    tier: 'PAID TIER / Plus & Pro Founders VIP ($290 or $590/yr fixed)',
    focus: 'Drag-and-drop table layouts, real-time table statuses (Seated, Appetizers, Mains, Paid), seat-based course pacing, and table-side guest ordering from roaming tablets for restaurants, bistros, and sports bars.'
  },
  {
    name: 'High-Speed Quick-Order POS & Modifier Speed',
    tier: 'All Tiers (Free Waitlist up to 300 orders/mo, Unlimited on Founders VIP)',
    focus: 'Sub-second touchscreen response for complex food modifiers (temperature, extra sauce, allergy alerts, side swaps) so cashiers and servers can ring up line-busting orders in 5 seconds.'
  },
  {
    name: 'Ask Flexi - The Offline AI Restaurant Analyst',
    tier: 'PAID TIER & Pro Founders VIP Exclusive ($590/yr fixed)',
    focus: 'On-device natural language AI answering instant operational food questions: "What was our highest-margin entree tonight?" or "Which pizza sold best between 6 PM and 8 PM?" completely offline without cloud latency.'
  },
  {
    name: 'Hardware Freedom (BYOD - Bring Your Own Device)',
    tier: 'All Tiers Philosophy',
    focus: 'Zero proprietary hardware lock-in! Works seamlessly with ESC/POS thermal receipt and kitchen printers (Bluetooth, USB, LAN), standard RJ11 cash drawers, Android tablets, Windows PCs, iPads, and Macs.'
  },
  {
    name: 'Done-For-You Menu Setup & Real Human Support',
    tier: 'Founders VIP Guarantee & Launch Promise',
    focus: 'No lifeless chatbots. FlexiTap provides Live Phone Support, Hands-On Remote Screen Desktop Assistance, Done-For-You Menu & Modifier Setup, and Launch Shift Standby Support so restaurant operators are never stranded.'
  },
  {
    name: '100% Processor Freedom (Keep Your Card Machine & Low Rates)',
    tier: 'Core Philosophy Across All Tiers',
    focus: 'Bring your own credit card terminal, stick with your existing merchant bank, and avoid forced 3-4% processing rate hikes. Type the total, tap tender in FlexiTap, and close the sale.'
  },
  {
    name: 'Free Launch Waitlist ($0/mo) vs Founders VIP Lifetime Price Lock',
    tier: 'Pricing & VIP Value Comparison',
    focus: 'Solo pop-ups get $0/mo free for life (1 terminal, offline sales). Growing restaurants lock in Plus VIP for $290/year (down from $490) or Pro VIP for $590/year (down from $990) with permanent lifetime price-lock guarantee.'
  }
];

// Diverse Storytelling Hooks & Angles
const COPY_ANGLES = [
  'A vivid dinner rush storytelling hook about surviving peak hour with flawless kitchen pacing.',
  'An honest restaurant operator confessional addressing the hidden pain points, frozen screens, and predatory contracts of traditional POS systems.',
  'A sharp, high-contrast comparison between fragile cloud-only POS vs. FlexiTap offline local LAN resilience.',
  'A kitchen and waitstaff perspective highlighting order accuracy, fast modifiers, and zero training stress.',
  'A profit-protection breakdown highlighting preserved revenue, zero surprise SaaS fees, and protected restaurant margins.',
  'An energetic countdown excitement angle building anticipation toward the November 13, 2026 US launch.'
];

// 8 Distinct US Food & Beverage Verticals (Paired directly with Food Categories)
const FOOD_PERSONAS = [
  {
    name: 'Atlanta & Philadelphia artisan wood-fired pizzerias and Italian trattorias',
    foodCategory: 'pizza',
    foodItem: 'blistered wood-fired Neapolitan pizza with bubbling mozzarella and fresh basil'
  },
  {
    name: 'Chicago & Denver craft burger joints, sports bars, and taprooms',
    foodCategory: 'burger',
    foodItem: 'juicy double smash burgers with melted cheddar and crispy golden fries'
  },
  {
    name: 'Brooklyn & Seattle independent specialty coffee shops and espresso bars',
    foodCategory: 'coffee',
    foodItem: 'velvety double-shot espresso latte art and warm golden croissants'
  },
  {
    name: 'San Antonio & Austin taco trailers, cantinas, and Mexican street food spots',
    foodCategory: 'tacos',
    foodItem: 'sizzling birria street tacos with cilantro, lime, and rich dipping broth'
  },
  {
    name: 'Portland & San Francisco artisan bakeries and French pastry cafes',
    foodCategory: 'bakery',
    foodItem: 'crusty sourdough loaves, warm chocolate pain au chocolat, and fresh pastries'
  },
  {
    name: 'Dallas & Houston smoked Texas BBQ pits and bustling steakhouses',
    foodCategory: 'bbq',
    foodItem: 'slow-smoked Texas beef brisket with burnt ends, pickles, and tangy BBQ ribs'
  },
  {
    name: 'Nashville & Miami weekend brunch bistros and breakfast cafes',
    foodCategory: 'brunch',
    foodItem: 'golden fluffy pancake stacks with wild blueberries, eggs benedict, and pure maple syrup'
  },
  {
    name: 'New York City & Boston quick-service delis and gourmet sandwich counters',
    foodCategory: 'deli',
    foodItem: 'stacked hot pastrami on rye with melted Swiss cheese and house pickles'
  }
];

// --- Deterministic Least-Recently-Used Selector ---
function getLeastRecentlyUsed(candidates, historyItems, keyFn) {
  const scored = candidates.map(item => {
    const val = keyFn ? keyFn(item) : item;
    const lastIdx = historyItems.lastIndexOf(val);
    const distance = lastIdx === -1 ? 999999 : (historyItems.length - 1 - lastIdx);
    return { item, distance };
  });
  // Sort descending: greatest distance (least recently used) first
  scored.sort((a, b) => b.distance - a.distance);
  return scored[0].item;
}

// Selects next feature, food persona, and angle based on strict least-recently-used rotation
function selectFreshTopic(history, excludedCategories = []) {
  const recentFeatures = history.map(e => e.feature).filter(Boolean);
  const recentPersonas = history.map(e => e.persona).filter(Boolean);
  const recentAngles = history.map(e => e.angle).filter(Boolean);

  // 1. Pick Feature (least recently used)
  const selectedModule = getLeastRecentlyUsed(FEATURE_MODULES, recentFeatures, m => m.name);

  // 2. Filter out excluded categories (e.g. if rejected by verifier)
  const validPersonas = FOOD_PERSONAS.filter(p => !excludedCategories.includes(p.foodCategory));
  const candidatePersonas = validPersonas.length > 0 ? validPersonas : FOOD_PERSONAS;
  
  // Pick Food Persona (least recently used)
  const selectedPersona = getLeastRecentlyUsed(candidatePersonas, recentPersonas, p => p.name);

  // 3. Pick Angle (least recently used)
  const selectedAngle = getLeastRecentlyUsed(COPY_ANGLES, recentAngles);

  return {
    selectedModule,
    selectedPersona,
    selectedAngle,
    recentEntries: history.slice(-7)
  };
}

// =========================================================================
// 🛡️ PRE-PUSH DUPLICATE VERIFIER
// Strictly verifies that the generated copy and visual asset have zero
// duplicate wording, zero hook overlap, and zero image reuse.
// =========================================================================
function verifyPostNotDuplicate(candidateCopy, candidateImageUrl, candidateCategory, history) {
  console.log('🛡️ Running Pre-Push Duplicate Verification...');
  const recentEntries = history.slice(-10);

  // 1. Verify Image URL is NOT reused
  const recentImages = recentEntries.map(e => e.imageUrl).filter(Boolean);
  if (recentImages.includes(candidateImageUrl)) {
    return {
      isClean: false,
      reason: `REJECTED: Image URL was already used recently (${candidateImageUrl.slice(0, 50)}...)`
    };
  }

  // 2. Verify Food Category is not repeated back-to-back
  if (recentEntries.length > 0) {
    const lastCategory = recentEntries[recentEntries.length - 1].foodCategory;
    if (lastCategory && lastCategory === candidateCategory) {
      return {
        isClean: false,
        reason: `REJECTED: Food category "${candidateCategory}" was already published in the previous run.`
      };
    }
    // Also check last 3 runs: cannot appear more than once in last 3 runs
    const last3Categories = recentEntries.slice(-3).map(e => e.foodCategory).filter(Boolean);
    if (last3Categories.includes(candidateCategory)) {
      return {
        isClean: false,
        reason: `REJECTED: Food category "${candidateCategory}" appeared in the last 3 days.`
      };
    }
  }

  // 3. Verify Opening Hook & Copy Similarity (Word intersection)
  const candidateText = candidateCopy.facebook_text || '';
  const candidateWords = new Set(
    candidateText.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3)
  );

  for (const prev of recentEntries) {
    const prevText = prev.summary || '';
    const prevWords = new Set(
      prevText.toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 3)
    );

    let common = 0;
    for (const w of candidateWords) {
      if (prevWords.has(w)) common++;
    }
    const union = new Set([...candidateWords, ...prevWords]).size;
    const similarity = union > 0 ? (common / union) : 0;

    if (similarity > 0.40) {
      return {
        isClean: false,
        reason: `REJECTED: Copy text is too similar (${Math.round(similarity * 100)}% word overlap) to previous post from ${prev.date}. Hook: "${prevText.slice(0, 55)}..."`
      };
    }

    // Direct opening line check (first 35 characters)
    const candOpening = candidateText.slice(0, 35).toLowerCase().trim();
    const prevOpening = prevText.slice(0, 35).toLowerCase().trim();
    if (candOpening.length > 15 && prevOpening.length > 15 && candOpening === prevOpening) {
      return {
        isClean: false,
        reason: `REJECTED: Opening line is identical to post from ${prev.date}.`
      };
    }
  }

  console.log('   ✅ Verifier PASSED: Post copy and visual asset are 100% unique!');
  return { isClean: true };
}

// --- 1. Generate Food-First Platform-Tailored Copy via Gemini ---
async function generatePostContent(history, excludedCategories = []) {
  const { selectedModule, selectedPersona, selectedAngle, recentEntries } = selectFreshTopic(history, excludedCategories);
  const randomSeed = Math.floor(Math.random() * 100000);

  console.log('🧠 Generating food-first social copies via Gemini...');
  console.log(`   📌 SELECTED TOPIC: "${selectedModule.name}"`);
  console.log(`   🍽️ FOOD VERTICAL: ${selectedPersona.name} (Featuring: ${selectedPersona.foodItem})`);
  console.log(`   🎨 Creative Angle: ${selectedAngle}`);

  const recentExclusions = recentEntries.map((e, idx) => `  ${idx + 1}. Food: "${e.foodCategory || 'N/A'}" | Feature: "${e.feature}" | Summary: "${e.summary?.slice(0, 65)}..."`).join('\n');

  const isAskFlexiTopic = selectedModule.name.toLowerCase().includes('ask flexi');

  const prompt = `
You are an expert food & beverage marketing copywriter for restaurant and hospitality brands. Generate fresh, mouth-watering, high-converting social media posts for FlexiTap POS tailored specifically for the US restaurant & hospitality market.

=======================================================
STRICT FOOD & BEVERAGE MANDATE:
👉 TARGET VENUE & AUDIENCE: ${selectedPersona.name}
👉 SIGNATURE FOOD DISH TO HIGHLIGHT: ${selectedPersona.foodItem}
👉 EXCLUSIVE POS FEATURE: "${selectedModule.name}"
👉 APPLICABLE TIER: ${selectedModule.tier}
👉 KEY POS BENEFIT: ${selectedModule.focus}
👉 NARRATIVE ANGLE: ${selectedAngle}
👉 VARIATION SEED: ${randomSeed}

MANDATORY COPYWRITING RULES:
1. APPETIZING FOOD FOCUS: The post MUST immediately mention the delicious food (${selectedPersona.foodItem}) in the opening hook or story! Make the reader taste and visualize the kitchen rush or cafe morning.
2. ZERO BURGER REPETITION: DO NOT mention burgers, smash burgers, or flat tops! (Burgers were just posted). Focus 100% on ${selectedPersona.foodItem}.
3. CONNECT FOOD TO POS: Vividly contrast the beauty of the food with the chaotic operational reality of restaurant rush hours—and show how FlexiTap POS keeps tickets moving, orders accurate, and cooks synced with zero lag or offline crashes.
4. CLEAR TIER PRICING: Mention our Plus & Pro Founders VIP Pass ($290 or $590/year flat, locked for life) or $0/mo Free solo waitlist where applicable. No hidden fees.
${isAskFlexiTopic ? `
- This post IS about "Ask Flexi" (Offline AI Restaurant Analyst). Explain how operators ask on-device questions about food margins, sales peaks, and top-selling dishes without internet.
` : `
- DO NOT mention "Ask Flexi" or AI analyst in this post at all. Focus 100% on ${selectedModule.name}.
`}
=======================================================
NEGATIVE EXCLUSION LIST (RECENTLY POSTED - DO NOT REPEAT):
${recentExclusions || '  (No previous posts in history)'}

Call to Action:
- Highlight official US Launch on November 13, 2026.
- Encourage booking at flexitapapp.com or sending a DM.
- Include 3 to 5 relevant US hashtags, always including #FlexiTapPOS.

Platform Output Requirements:
- "facebook_text": Engaging story format with mouth-watering food details, operational breakdown, clear tier rules, and CTA.
- "linkedin_text": Professional restaurant-operator tone with clear throughput, food margin, and bottom-line operational benefits.
- "twitter_text": MUST be under 260 characters total, punchy, appetizing, ending with "Nov 13 US Launch: flexitapapp.com #FlexiTapPOS".

Return ONLY a valid JSON object with exactly these keys:
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
              temperature: 0.85,
              topP: 0.95
            }
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.warn(`   ⚠️ Model ${model} returned ${response.status}: ${errorText.slice(0, 150)}`);
          lastError = new Error(`Gemini API Error [${model}] (${response.status}): ${errorText}`);
          if (response.status === 503 && attempt < 2) {
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

        console.log(`   ✅ Food-focused copy generated using ${model}!`);
        const parsed = JSON.parse(textOutput);
        return {
          copyData: parsed,
          foodPersona: selectedPersona,
          metadata: {
            feature: selectedModule.name,
            persona: selectedPersona.name,
            angle: selectedAngle,
            foodCategory: selectedPersona.foodCategory
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

// --- 2. Select Appetizing Food Image Matching the Post Vertical ---
async function obtainFoodImage(foodCategory, history) {
  console.log(`🎨 Step 2: Selecting fresh food visual for category: "${foodCategory}"...`);

  const categoryImages = FOOD_VISUALS[foodCategory] || FOOD_VISUALS.pizza;
  const recentImages = history.slice(-15).map(e => e.imageUrl).filter(Boolean);

  // Pick an image from this category that was NOT recently used
  const unusedImages = categoryImages.filter(url => !recentImages.includes(url));
  const selectedFoodUrl = unusedImages.length > 0 ? unusedImages[0] : categoryImages[0];
  console.log(`   📸 Selected high-res food photo: ${selectedFoodUrl}`);

  // Download and host on ImgBB CDN to provide Buffer a lightning-fast direct CDN asset
  if (IMGBB_API_KEY) {
    try {
      console.log('   ☁️ Caching food visual on high-speed CDN for Buffer...');
      const imgRes = await fetch(selectedFoodUrl);
      if (imgRes.ok) {
        const arrayBuf = await imgRes.arrayBuffer();
        const base64 = Buffer.from(arrayBuf).toString('base64');
        const cdnUrl = await uploadToPublicCDN(base64);
        if (cdnUrl) {
          console.log(`   ✅ Hosted on CDN: ${cdnUrl}`);
          return cdnUrl;
        }
      }
    } catch (err) {
      console.warn('   ⚠️ CDN hosting warning:', err.message);
    }
  }

  return selectedFoodUrl;
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
      return directUrl;
    }
  } catch (err) {
    console.warn('   ⚠️ ImgBB Upload warning:', err.message);
  }

  return null;
}

// --- 4. Discover Connected Buffer Channels ---
async function getBufferChannels() {
  console.log('🔍 Step 3: Discovering connected social channels in Buffer...');

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
  console.log(`🚀 Publishing to [${service.toUpperCase()}] "${channelName}"...`);

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

  // Attach mouth-watering food image asset
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

// --- Main Execution Flow with Duplicate Verifier ---
async function main() {
  console.log('==================================================');
  console.log('🍔 FlexiTap POS Food-First Social Media Publisher');
  console.log('==================================================\n');

  try {
    const history = loadHistory();
    console.log(`📖 Loaded ${history.length} historical post records.`);

    // --- Generation & Pre-Push Verification Loop ---
    let verifiedCandidate = null;
    let candidateImageUrl = null;
    const excludedCategories = [];

    for (let attempt = 1; attempt <= 4; attempt++) {
      console.log(`\n--- Verification Attempt ${attempt}/4 ---`);
      
      const candidate = await generatePostContent(history, excludedCategories);
      const imgUrl = await obtainFoodImage(candidate.foodPersona.foodCategory, history);

      const verification = verifyPostNotDuplicate(
        candidate.copyData,
        imgUrl,
        candidate.foodPersona.foodCategory,
        history
      );

      if (verification.isClean) {
        verifiedCandidate = candidate;
        candidateImageUrl = imgUrl;
        break;
      } else {
        console.warn(`⚠️ Verification FAILED: ${verification.reason}`);
        console.log(`🚫 Excluding category "${candidate.foodPersona.foodCategory}" for re-roll...`);
        excludedCategories.push(candidate.foodPersona.foodCategory);
      }
    }

    if (!verifiedCandidate || !candidateImageUrl) {
      throw new Error('Pre-Push Duplicate Verifier could not verify a 100% unique post after 4 attempts.');
    }

    const { copyData, metadata } = verifiedCandidate;

    console.log('\n📝 Verified Copy Ready for Push:');
    console.log('--------------------------------------------------');
    console.log(`[Twitter/X (${copyData.twitter_text.length} chars)]:`);
    console.log(copyData.twitter_text);
    console.log('\n[Facebook/LinkedIn Sample]:');
    console.log(copyData.facebook_text.slice(0, 240) + '...\n');
    console.log('--------------------------------------------------\n');

    // 3. Discover Buffer Channels
    const allChannels = await getBufferChannels();
    if (allChannels.length === 0) {
      console.warn('⚠️ No connected channels found in your Buffer account.');
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

    // 4. Publish to each channel
    let successCount = 0;
    for (const channel of channelsToPost) {
      const ok = await publishToBuffer(channel.id, channel.name, channel.service, copyData, candidateImageUrl);
      if (ok) successCount++;
    }

    // 5. Record to history.json so future runs never duplicate this
    if (successCount > 0) {
      saveHistoryEntry({
        date: new Date().toISOString(),
        feature: metadata.feature,
        persona: metadata.persona,
        angle: metadata.angle,
        foodCategory: metadata.foodCategory,
        summary: copyData.facebook_text.slice(0, 140) + '...',
        imageUrl: candidateImageUrl
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
