/**
 * Product Search Service — Proxies requests to SerpApi Google Shopping
 * * Fixes included:
 * 1. Forced IPv4 resolution to prevent DNS/Connection timeouts.
 * 2. Implemented Exponential Backoff/Retry logic.
 * 3. Integrated Circuit Breaker for stability.
 */

const dns = require('dns');
const { createCircuitBreaker } = require('./circuitBreaker');

// Force IPv4 to resolve network routing issues in regions with inconsistent IPv6
dns.setDefaultResultOrder('ipv4first');

const SERP_API_KEY = process.env.SERP_API_KEY;
const SERP_BASE = 'https://serpapi.com/search.json';

/**
 * Raw fetch to SerpApi with built-in retry logic.
 */
async function fetchSerpApi(query, limit, retries = 2) {
    const params = new URLSearchParams({
        engine: 'google_shopping',
        q: query,
        api_key: SERP_API_KEY,
        num: String(limit),
        gl: 'in',
        hl: 'en',
    });

    const url = `${SERP_BASE}?${params.toString()}`;

    // Attempt request with retries
    for (let i = 0; i <= retries; i++) {
        try {
            const response = await fetch(url, {
                signal: AbortSignal.timeout(12000), // 12s timeout
            });

            if (!response.ok) {
                const body = await response.text();
                throw new Error(`SerpApi returned ${response.status}: ${body}`);
            }

            const data = await response.json();
            const rawProducts = data.shopping_results || [];

            return rawProducts.map((item) => ({
                id: item.product_id || item.serpapi_id || `serp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                title: item.title || '',
                description: item.description || '',
                thumbnail: item.thumbnail || '',
                price: item.extracted_price || item.price || '',
                rating: item.rating || null,
                reviews: item.reviews || 0,
                source: item.source || '',
                link: item.link || '',
                serpapi_id: item.serpapi_id || null,
            }));

        } catch (err) {
            // If it's the last attempt, throw the error to the Circuit Breaker
            if (i === retries) throw err;
            
            // Wait before retrying (1s, then 2s)
            console.warn(`[ProductSearch] Attempt ${i + 1} failed, retrying...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
    }
}

// ── Circuit Breaker for SerpApi ──
const serpBreaker = createCircuitBreaker(fetchSerpApi, {
    name: 'SerpApi',
    failureThreshold: 3,       // Fails faster if network is down
    resetTimeout: 5000,        // Recover in 5s
    halfOpenMaxAttempts: 1,
    onStateChange: (name, from, to) => {
        if (to === 'OPEN') {
            console.warn(`[ProductSearch] Circuit breaker [${name}] is now OPEN`);
        }
    },
});

/**
 * Search for products via SerpApi.
 */
async function searchProducts(query, limit = 8) {
    if (!SERP_API_KEY) {
        console.warn('[ProductSearch] SERP_API_KEY not set — returning empty results');
        return [];
    }

    try {
        return await serpBreaker.fire(query, limit);
    } catch (err) {
        // Return empty array on timeout or circuit break to keep UI responsive
        if (err.name === 'TimeoutError' || err.code === 'CIRCUIT_OPEN' || err.code === 'CIRCUIT_HALF_OPEN') {
            console.warn(`[ProductSearch] Falling back to empty results for query: "${query}"`);
            return [];
        }
        throw err;
    }
}

function getSerpCircuitStats() {
    return serpBreaker.getStats();
}

module.exports = { searchProducts, getSerpCircuitStats };