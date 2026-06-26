/**
 * AI Auto-Fill Suggestion Service  (v4 — Redis + Circuit Breaker + Groq)
 *
 * Calls the Groq API (llama-3.3-70b-versatile) through the openai SDK
 * to generate listing field suggestions (category, description, suggestedPrice, tags)
 * from a product title.
 *
 * Resilience features:
 *   1. In-memory LRU cache     — fast repeat-hit guard (same process, microseconds)
 *   2. Redis cache (L2)        — cross-process cache (sub-ms, shared)
 *   3. MongoDB ProductCache    — persistent cache (milliseconds, 7-day TTL)
 *   4. Circuit Breaker         — prevents cascading failures if Groq is down
 *   5. Exponential backoff     — 2s → 4s → 8s on 429 responses
 *   6. Structured errors       — callers receive { retryAfter, code } for UX
 *
 * Environment variables:
 *   GROQ_API_KEY  — Your Groq API key (https://console.groq.com/keys)
 *   REDIS_URL     — Redis URL (default: redis://localhost:6379)
 */

const mongoose = require('mongoose');
const OpenAI = require('openai');
const ProductCache = require('../models/ProductCache');
const { initRedis, redisGet, redisSet, isRedisAvailable } = require('./redisCache');
const { createCircuitBreaker } = require('./circuitBreaker');

// ── Groq client via OpenAI SDK ──
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

// ── In-memory LRU cache (L1 — avoids hitting Redis/Mongo on every request) ──
const MEMORY_CACHE_MAX = 200;
const memoryCache = new Map();

function memCacheGet(key) {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > 5 * 60 * 1000) { // 5 min TTL
    memoryCache.delete(key);
    return null;
  }
  // Move to end (most recently used)
  memoryCache.delete(key);
  memoryCache.set(key, entry);
  return entry.value;
}

function memCacheSet(key, value) {
  if (memoryCache.size >= MEMORY_CACHE_MAX) {
    const oldest = memoryCache.keys().next().value;
    memoryCache.delete(oldest);
  }
  memoryCache.set(key, { value, ts: Date.now() });
}

// ── Circuit Breaker for Groq API ──
const groqBreaker = createCircuitBreaker(callGroqRaw, {
  name: 'GroqAI',
  failureThreshold: 3,      // Open after 3 consecutive failures
  resetTimeout: 30000,      // Try again after 30 seconds
  halfOpenMaxAttempts: 1,   // Only 1 probe request in half-open
  onStateChange: (name, from, to) => {
    // Could emit Socket.IO events or log to monitoring
    if (to === 'OPEN') {
      console.warn(`[AiSuggest] Circuit breaker [${name}] is now OPEN — Groq requests will be rejected`);
    }
  },
});

// ── Strict category enum — must stay in sync with Listing.js model ──
const VALID_CATEGORIES = [
  'Electronics & Gadgets',
  'Laptops & Computers',
  'Mobile Phones & Tablets',
  'Cameras & Photography',
  'Audio & Music Systems',
  'Gaming Consoles & Accessories',
  'Vehicles - Cars',
  'Vehicles - Bikes & Scooters',
  'Vehicles - Cycles',
  'Furniture - Sofas & Seating',
  'Furniture - Beds & Mattresses',
  'Furniture - Tables & Desks',
  'Furniture - Storage & Shelves',
  'Kitchen Appliances',
  'Home Appliances',
  'Tools & Equipment',
  'Power Tools',
  'Sports & Fitness Equipment',
  'Outdoor & Camping Gear',
  'Party & Event Supplies',
  'Musical Instruments',
  'Books & Textbooks',
  'Clothing & Fashion - Men',
  'Clothing & Fashion - Women',
  'Clothing & Fashion - Kids',
  'Jewelry & Accessories',
  'Bags & Luggage',
  'Footwear',
  'Toys & Games',
  'Baby & Kids Equipment',
  'Wedding & Ceremony Items',
  'Travel & Camping Gear',
  'DJ & Sound Equipment',
  'Projectors & Screens',
  'Drones & Accessories',
  'Medical & Health Equipment',
  'Garden & Outdoor Tools',
  'Art & Craft Supplies',
  'Office & Stationery',
  'Beauty & Grooming Equipment',
  'Pet Supplies & Accessories',
  'Fishing & Boating Gear',
  'Winter & Snow Gear',
  'Renovation & Construction Tools',
  'Cleaning Equipment',
  'Tailoring & Sewing Machines',
  'Printing & Scanning Equipment',
  'Networking & IT Equipment',
  'Film & Photography Lighting',
  'Other',
];

const SYSTEM_PROMPT = `You are an AI listing assistant for RentoQuick, an Indian peer-to-peer rental marketplace.
Given a product title, suggest listing fields for renting out this item in India.

You MUST return ONLY a valid JSON object (no markdown, no backticks) with these exact keys:
{
  "category": string (must be one of the exact category names from the provided list),
  "description": string (a compelling 3-5 sentence rental listing description highlighting the item's value, condition tips, and why someone would rent it),
  "suggestedPrice": number (suggested rental price per day in INR ₹, realistic for the Indian market — e.g. a DSLR camera might be ₹800-1500/day, a gaming console ₹300-500/day, a power drill ₹100-200/day),
  "tags": string[] (array of 4-8 relevant search tags, lowercase, single words or short phrases like ["sony", "mirrorless", "4k", "camera", "photography"])
}

Available categories (you MUST pick one EXACT match — do NOT invent or slightly modify a category name):
${VALID_CATEGORIES.map(c => `"${c}"`).join(', ')}

Rules:
- category MUST be an exact match from the list above. If unsure, use "Other".
- suggestedPrice should be realistic for renting in India. Consider the item's original value, age, and demand.
- description should be written for a rental listing, not a sale listing. Focus on what the renter gets, ideal use-cases, and any notable condition details.
- tags should help with searchability — include brand, product type, and use-case keywords.
- Return ONLY the JSON object, nothing else.`;

/**
 * Normalise a title for cache-key purposes.
 */
function normaliseKey(title) {
  return title.trim().toLowerCase();
}

/**
 * Fuzzy-match an AI-returned category string against the valid enum.
 * Tries exact match first, then case-insensitive, then substring/includes.
 * @param {string} aiCategory
 * @returns {string|null} The matched valid category name, or null.
 */
function matchCategory(aiCategory) {
  if (!aiCategory || typeof aiCategory !== 'string') return null;

  const trimmed = aiCategory.trim();

  // 1. Exact match
  if (VALID_CATEGORIES.includes(trimmed)) return trimmed;

  // 2. Case-insensitive exact match
  const lower = trimmed.toLowerCase();
  const exactMatch = VALID_CATEGORIES.find(c => c.toLowerCase() === lower);
  if (exactMatch) return exactMatch;

  // 3. AI category is a substring of a valid category, or vice-versa
  const substringMatch = VALID_CATEGORIES.find(
    c => c.toLowerCase().includes(lower) || lower.includes(c.toLowerCase())
  );
  if (substringMatch) return substringMatch;

  // 4. Token-based matching: check if key words overlap
  const aiTokens = lower.split(/[\s&\-_/]+/).filter(Boolean);
  let bestMatch = null;
  let bestScore = 0;

  for (const cat of VALID_CATEGORIES) {
    const catTokens = cat.toLowerCase().split(/[\s&\-_/]+/).filter(Boolean);
    const common = aiTokens.filter(t => catTokens.includes(t));
    const score = common.length / Math.max(aiTokens.length, catTokens.length);
    if (score > bestScore && score >= 0.4) {
      bestScore = score;
      bestMatch = cat;
    }
  }

  return bestMatch; // may still be null
}

/**
 * Sleep helper.
 * @param {number} ms
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Call the Groq API once via the OpenAI SDK (no retry, no circuit breaker).
 * This is the raw function that gets wrapped by the circuit breaker.
 *
 * @param {string} productTitle
 * @returns {Promise<{ ok: boolean, data?: object, status?: number, retryAfter?: number, error?: string }>}
 */
async function callGroqRaw(productTitle) {
  try {
    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Product Title: "${productTitle}"` },
      ],
      temperature: 0.2,
      max_tokens: 1024,
      response_format: { type: 'json_object' }
    },{timeout: 20000
    });

    // ── Parse the structured JSON response ──
    const textContent = response.choices?.[0]?.message?.content;

    if (!textContent) {
      console.error('[AiSuggest] Empty content in Groq response');
      return { ok: false, error: 'Empty response from AI' };
    }

    let result;
    try {
      result = JSON.parse(textContent);
    } catch (parseErr) {
      console.error('[AiSuggest] Failed to parse Groq JSON response:', parseErr.message);
      return { ok: false, error: 'Failed to parse AI response' };
    }

    // ── Strict category mapping ──
    const originalCategory = String(result.category || '');
    const matchedCategory = matchCategory(originalCategory);

    // ── Validate and normalise ──
    return {
      ok: true,
      data: {
        category: matchedCategory || 'Other',
        description: String(result.description || '').slice(0, 2000),
        suggestedPrice: Math.max(1, Math.round(Number(result.suggestedPrice) || 0)),
        tags: Array.isArray(result.tags)
          ? result.tags
              .map(t => String(t).trim().toLowerCase())
              .filter(t => t.length > 0 && t.length <= 30)
              .slice(0, 10)
          : [],
        categoryMatched: matchedCategory !== null,
        originalCategory,
      },
    };
  } catch (err) {
    // ── Handle 429 Rate Limit from Groq ──
    if (err.status === 429) {
      const retryAfterHeader = err.headers?.['retry-after'];
      const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader, 10) * 1000 : null;
      console.warn(`[AiSuggest] Groq 429 — retry-after header: ${retryAfterHeader}, using backoff`);
      return { ok: false, status: 429, retryAfter };
    }

    // ── Handle timeout / abort ──
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      console.error('[AiSuggest] Groq request timed out');
      return { ok: false, error: 'AI request timed out' };
    }

    // ── Handle other SDK errors (network, auth, server, etc.) ──
    const statusCode = err.status || err.code;
    console.error(`[AiSuggest] Groq error (${statusCode || 'unknown'}):`, err.message);
    return {
      ok: false,
      status: statusCode,
      error: `AI API error: ${statusCode || err.message}`,
    };
  }
}

/**
 * Call Groq with circuit breaker + exponential backoff retry on 429.
 * Backoff delays: 2s → 4s → 8s (3 retries total after initial attempt).
 *
 * @param {string} productTitle
 * @returns {Promise<{ ok: boolean, data?: object, code: string, retryAfter?: number }>}
 *   code: 'SUCCESS' | 'RATE_LIMITED' | 'CIRCUIT_OPEN' | 'ERROR'
 */
async function callGroqWithRetry(productTitle) {
  const BASE_DELAY_MS = 2000;
  const MAX_RETRIES = 3;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await groqBreaker.fire(productTitle);

      if (result.ok) {
        return { ok: true, data: result.data, code: 'SUCCESS' };
      }

      // If it's a 429 and we have retries left, back off
      if (result.status === 429 && attempt < MAX_RETRIES) {
        const delay = result.retryAfter || (BASE_DELAY_MS * Math.pow(2, attempt));
        console.warn(`[AiSuggest] 429 on attempt ${attempt + 1}/${MAX_RETRIES + 1} — backing off ${delay}ms`);
        await sleep(delay);
        continue;
      }

      // All retries exhausted for 429
      if (result.status === 429) {
        return {
          ok: false,
          code: 'RATE_LIMITED',
          retryAfter: 30,
        };
      }

      // Non-retryable error
      return { ok: false, code: 'ERROR', error: result.error };
    } catch (err) {
      // ── Circuit breaker is OPEN ──
      if (err.code === 'CIRCUIT_OPEN') {
        return {
          ok: false,
          code: 'CIRCUIT_OPEN',
          retryAfter: err.retryAfter || 30,
          message: `AI service is temporarily unavailable (circuit open). Please wait ${err.retryAfter || 30}s.`,
        };
      }

      if (err.code === 'CIRCUIT_HALF_OPEN') {
        return {
          ok: false,
          code: 'CIRCUIT_OPEN',
          retryAfter: 5,
          message: 'AI service is recovering. Please try again in a few seconds.',
        };
      }

      // Unexpected error from the breaker
      console.error('[AiSuggest] Unexpected breaker error:', err.message);
      return { ok: false, code: 'ERROR', error: err.message };
    }
  }

  return { ok: false, code: 'RATE_LIMITED', retryAfter: 30 };
}

// ════════════════════════════════════════════════════════════════════════════
//  PUBLIC API
// ════════════════════════════════════════════════════════════════════════════

/**
 * Initialise the service (call once at server startup).
 * Sets up Redis connection for L2 caching.
 */
function init() {
  initRedis();
  console.log('[AiSuggest] Service initialised (Redis L2: ' + (isRedisAvailable() ? 'connected' : 'fallback to memory-only)') + ')');
}

/**
 * Generate listing suggestions with 3-tier caching + circuit breaker + retry.
 *
 * Cache hierarchy:
 *   L1: In-memory LRU (microseconds)
 *   L2: Redis (sub-millisecond if available)
 *   L3: MongoDB ProductCache (milliseconds, 7-day TTL)
 *
 * @param {string} productTitle
 * @returns {Promise<{
 *   result: object | null,
 *   code: 'CACHED' | 'SUCCESS' | 'RATE_LIMITED' | 'CIRCUIT_OPEN' | 'ERROR' | 'UNAVAILABLE',
 *   retryAfter?: number,
 *   message?: string
 * }>}
 */
async function suggestListing(productTitle) {
  if (!process.env.GROQ_API_KEY) {
    console.warn('[AiSuggest] GROQ_API_KEY not set');
    return { result: null, code: 'UNAVAILABLE', message: 'AI service is not configured. Please contact support.' };
  }

  if (!productTitle || productTitle.trim().length < 3) {
    return { result: null, code: 'ERROR', message: 'Product title must be at least 3 characters.' };
  }

  const titleKey = normaliseKey(productTitle);

  // ── L1: Check in-memory cache ──
  const memResult = memCacheGet(titleKey);
  if (memResult) {
    console.log(`[AiSuggest] L1 (memory) cache hit for: "${titleKey}"`);
    return { result: memResult, code: 'CACHED' };
  }

  // ── L2: Check Redis cache ──
  if (isRedisAvailable()) {
    try {
      const redisResult = await redisGet(titleKey);
      if (redisResult) {
        console.log(`[AiSuggest] L2 (Redis) cache hit for: "${titleKey}"`);
        memCacheSet(titleKey, redisResult); // Promote to L1
        return { result: redisResult, code: 'CACHED' };
      }
    } catch (err) {
      console.warn('[AiSuggest] Redis GET failed (continuing to L3):', err.message);
    }
  }

  // ── L3: Check MongoDB cache ──
  try {
    const dbEntry = await ProductCache.findOne({ titleKey }).lean();
    if (dbEntry && dbEntry.data) {
      console.log(`[AiSuggest] L3 (MongoDB) cache hit for: "${titleKey}" (hits: ${dbEntry.hitCount})`);
      // Bump hit count (fire-and-forget)
      ProductCache.updateOne({ titleKey }, { $inc: { hitCount: 1 } }).catch(() => {});
      // Promote to L1 and L2
      memCacheSet(titleKey, dbEntry.data);
      if (isRedisAvailable()) {
        redisSet(titleKey, dbEntry.data, 300).catch(() => {}); // 5 min in Redis
      }
      return { result: dbEntry.data, code: 'CACHED' };
    }
  } catch (dbErr) {
    console.warn('[AiSuggest] MongoDB cache lookup failed (continuing without cache):', dbErr.message);
  }

  // ── Call Groq with circuit breaker + retry + backoff ──
  const groqResult = await callGroqWithRetry(productTitle.trim());

  if (!groqResult.ok) {
    if (groqResult.code === 'RATE_LIMITED') {
      return {
        result: null,
        code: 'RATE_LIMITED',
        retryAfter: groqResult.retryAfter,
        message: `AI server is busy. Please wait ${groqResult.retryAfter} seconds and try again.`,
      };
    }
    if (groqResult.code === 'CIRCUIT_OPEN') {
      return {
        result: null,
        code: 'CIRCUIT_OPEN',
        retryAfter: groqResult.retryAfter,
        message: groqResult.message || 'AI service is temporarily unavailable. Please try again later.',
      };
    }
    return {
      result: null,
      code: 'ERROR',
      message: groqResult.error || 'An error occurred while generating suggestions.',
    };
  }

  // ── Store successful result in all three cache layers ──
  const resultData = groqResult.data;

  // L1: In-memory
  memCacheSet(titleKey, resultData);

  // L2: Redis (5 min TTL)
  if (isRedisAvailable()) {
    redisSet(titleKey, resultData, 300).catch((err) => {
      console.warn('[AiSuggest] Redis SET failed (L1/L3 still active):', err.message);
    });
  }

  // L3: MongoDB (7 day TTL via schema index)
  try {
    await ProductCache.findOneAndUpdate(
      { titleKey },
      {
        $set: { data: resultData },
        $setOnInsert: { titleKey },
        $inc: { hitCount: 1 },
      },
      { upsert: true, new: true }
    );
    console.log(`[AiSuggest] Cached result for: "${titleKey}" (all 3 layers)`);
  } catch (dbErr) {
    console.warn('[AiSuggest] MongoDB cache write failed (L1/L2 still active):', dbErr.message);
  }

  return { result: resultData, code: 'SUCCESS' };
}

/**
 * Get circuit breaker stats (for monitoring/health endpoint).
 */
function getCircuitStats() {
  return groqBreaker.getStats();
}

module.exports = { suggestListing, matchCategory, VALID_CATEGORIES, init, getCircuitStats };