/**
 * Redis Cache Layer
 *
 * Provides a fast Redis-backed cache with automatic fallback to in-memory
 * LRU cache when Redis is unavailable. This sits in front of the existing
 * MongoDB ProductCache, providing three-tier caching:
 *
 *   L1: In-memory LRU (microseconds, same process)
 *   L2: Redis (sub-millisecond, cross-process/shared)
 *   L3: MongoDB (milliseconds, persistent)
 *
 * Environment variables:
 *   REDIS_URL — Redis connection URL (default: redis://localhost:6379)
 */

const Redis = require('ioredis');

let redisClient = null;
let redisAvailable = false;

// ── Initialise Redis connection (lazy, non-blocking) ──
function initRedis() {
    if (redisClient) return redisClient;

    try {
        const url = process.env.REDIS_URL || 'redis://localhost:6379';
        redisClient = new Redis(url, {
            maxRetriesPerRequest: 3,
            retryDelayOnFailover: 100,
            enableReadyCheck: true,
            lazyConnect: true, // Don't block server startup
            connectTimeout: 5000,
        });

        redisClient.on('ready', () => {
            redisAvailable = true;
            console.log('[Redis] Connected successfully');
        });

        redisClient.on('error', (err) => {
            if (redisAvailable) {
                console.warn('[Redis] Connection error:', err.message);
            }
            redisAvailable = false;
        });

        redisClient.on('close', () => {
            redisAvailable = false;
        });

        // Connect asynchronously
        redisClient.connect().catch((err) => {
            console.warn('[Redis] Failed to connect, falling back to in-memory cache:', err.message);
            redisAvailable = false;
        });

        return redisClient;
    } catch (err) {
        console.warn('[Redis] Initialisation failed, falling back to in-memory cache:', err.message);
        redisAvailable = false;
        return null;
    }
}

/**
 * Get a value from Redis by key.
 * @param {string} key
 * @param {number} ttlSeconds — unused for GET, but documents expected TTL
 * @returns {Promise<object|null>}
 */
async function redisGet(key) {
    if (!redisAvailable || !redisClient) return null;

    try {
        const raw = await redisClient.get(`rq:cache:${key}`);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (err) {
        console.warn('[Redis] GET error:', err.message);
        return null;
    }
}

/**
 * Set a value in Redis with TTL.
 * @param {string} key
 * @param {object} value
 * @param {number} ttlSeconds — Time-to-live in seconds (default 300 = 5 min)
 */
async function redisSet(key, value, ttlSeconds = 300) {
    if (!redisAvailable || !redisClient) return;

    try {
        await redisClient.set(`rq:cache:${key}`, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (err) {
        console.warn('[Redis] SET error:', err.message);
    }
}

/**
 * Check if Redis is available.
 * @returns {boolean}
 */
function isRedisAvailable() {
    return redisAvailable;
}

/**
 * Get the Redis client instance (for BullMQ connection sharing).
 * @returns {Redis|null}
 */
function getRedisClient() {
    return redisClient;
}

/**
 * Gracefully close the Redis connection.
 */
async function closeRedis() {
    if (redisClient) {
        try {
            await redisClient.quit();
        } catch {
            // Ignore close errors
        }
        redisClient = null;
        redisAvailable = false;
    }
}

module.exports = {
    initRedis,
    redisGet,
    redisSet,
    isRedisAvailable,
    getRedisClient,
    closeRedis,
};