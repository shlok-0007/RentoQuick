/**
 * Circuit Breaker Service
 *
 * Implements a lightweight circuit breaker pattern without external dependencies.
 * Wraps any async function and prevents cascading failures when external
 * services (Groq, SerpApi, Gemini) are down or slow.
 *
 * States:
 *   CLOSED   → Normal operation, requests pass through
 *   OPEN     → Service is down, requests are rejected immediately
 *   HALF_OPEN → Probing with a single request to test recovery
 *
 * Usage:
 *   const groqBreaker = createCircuitBreaker(callGroqOnce, {
 *       name: 'GroqAI',
 *       failureThreshold: 3,     // Open after 3 consecutive failures
 *       resetTimeout: 30000,     // Try again after 30 seconds
 *       halfOpenMaxAttempts: 1,  // Only 1 probe request in half-open
 *   });
 *
 *   const result = await groqBreaker.fire(productTitle);
 */

/**
 * Create a circuit breaker instance.
 * @param {Function} fn           — The async function to protect
 * @param {object}   options
 * @param {string}   options.name                — Circuit name (for logging)
 * @param {number}   options.failureThreshold    — Failures before opening (default 3)
 * @param {number}   options.resetTimeout        — ms before half-open (default 30000)
 * @param {number}   options.halfOpenMaxAttempts — Max requests in half-open (default 1)
 * @param {Function} [options.onStateChange]    — Callback: (name, fromState, toState) => void
 * @returns {{ fire: Function, getState: Function, getStats: Function, reset: Function }}
 */
function createCircuitBreaker(fn, options = {}) {
    const {
        name = 'unnamed',
        failureThreshold = 3,
        resetTimeout = 30000,
        halfOpenMaxAttempts = 1,
        onStateChange,
    } = options;

    // State
    let state = 'CLOSED'; // CLOSED | OPEN | HALF_OPEN
    let failureCount = 0;
    let successCount = 0;
    let lastFailureTime = 0;
    let halfOpenAttempts = 0;
    let totalSuccesses = 0;
    let totalFailures = 0;
    let totalRejects = 0;

    function transition(newState) {
        const old = state;
        state = newState;

        if (newState === 'HALF_OPEN') {
            halfOpenAttempts = 0;
        }

        if (onStateChange) {
            onStateChange(name, old, newState);
        }

        console.log(`[CircuitBreaker:${name}] ${old} → ${newState} (failures=${failureCount}, successes=${successCount})`);
    }

    /**
     * Execute the protected function.
     * @param {...any} args — Arguments to pass to the function
     * @returns {Promise<any>} — The function's result
     * @throws {Error} — If circuit is open or function throws
     */
    async function fire(...args) {
        // ── OPEN: reject immediately ──
        if (state === 'OPEN') {
            const now = Date.now();
            if (now - lastFailureTime >= resetTimeout) {
                transition('HALF_OPEN');
            } else {
                totalRejects++;
                const waitSec = Math.ceil((resetTimeout - (now - lastFailureTime)) / 1000);
                const err = new Error(`Circuit breaker [${name}] is OPEN. Service unavailable. Retry in ~${waitSec}s.`);
                err.code = 'CIRCUIT_OPEN';
                err.retryAfter = waitSec;
                throw err;
            }
        }

        // ── HALF_OPEN: limit probe requests ──
        if (state === 'HALF_OPEN') {
            if (halfOpenAttempts >= halfOpenMaxAttempts) {
                totalRejects++;
                const err = new Error(`Circuit breaker [${name}] is HALF_OPEN (probing). Try again later.`);
                err.code = 'CIRCUIT_HALF_OPEN';
                throw err;
            }
            halfOpenAttempts++;
        }

        // ── CLOSED / HALF_OPEN: execute ──
        try {
            const result = await fn(...args);
            onSuccess();
            return result;
        } catch (err) {
            onFailure();
            throw err;
        }
    }

    function onSuccess() {
        failureCount = 0;
        successCount++;
        totalSuccesses++;

        if (state === 'HALF_OPEN') {
            transition('CLOSED');
        }
    }

    function onFailure() {
        failureCount++;
        successCount = 0;
        totalFailures++;
        lastFailureTime = Date.now();

        if (state === 'HALF_OPEN') {
            transition('OPEN');
        } else if (failureCount >= failureThreshold) {
            transition('OPEN');
        }
    }

    function getState() {
        return state;
    }

    function getStats() {
        return {
            name,
            state,
            failureCount,
            successCount,
            totalSuccesses,
            totalFailures,
            totalRejects,
            lastFailureTime,
        };
    }

    function reset() {
        state = 'CLOSED';
        failureCount = 0;
        successCount = 0;
        halfOpenAttempts = 0;
        console.log(`[CircuitBreaker:${name}] Manually reset to CLOSED`);
    }

    return { fire, getState, getStats, reset };
}

module.exports = { createCircuitBreaker };