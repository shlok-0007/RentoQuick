const { suggestListing, init: initAiService, getCircuitStats } = require('../services/aiSuggestService');

// ── Per-user dedup map: userId → { titleKey, timestamp } ──
const DEDUP_WINDOW_MS = 5000; // 5 seconds
const userDedup = new Map();

// Periodically clean stale entries (every 60 seconds)
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of userDedup) {
    if (now - val.timestamp > DEDUP_WINDOW_MS * 2) {
      userDedup.delete(key);
    }
  }
}, 60 * 1000);

/**
 * POST /api/ai/suggest
 * Body: { productTitle: string }
 * Returns: { success, data, cached? }  or  { success: false, message, retryAfter? }
 */
exports.suggest = async (req, res) => {
  try {
    const { productTitle } = req.body;

    // ── Input validation ──
    if (!productTitle || typeof productTitle !== 'string' || productTitle.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'productTitle is required and must be at least 3 characters.',
        code: 'INVALID_INPUT',
      });
    }

    const userId = req.user?._id?.toString() || 'anonymous';
    const titleKey = productTitle.trim().toLowerCase();
    const dedupKey = `${userId}:${titleKey}`;

    // ── 5-second dedup: reject identical rapid-fire calls from same user ──
    const existing = userDedup.get(dedupKey);
    if (existing) {
      const elapsed = Date.now() - existing.timestamp;
      if (elapsed < DEDUP_WINDOW_MS) {
        const waitSec = Math.ceil((DEDUP_WINDOW_MS - elapsed) / 1000);
        return res.status(429).json({
          success: false,
          message: `You just requested this. Please wait ${waitSec} second${waitSec > 1 ? 's' : ''} before trying again.`,
          code: 'DEDUP_BLOCKED',
          retryAfter: waitSec,
        });
      }
    }

    // Record this request
    userDedup.set(dedupKey, { titleKey, timestamp: Date.now() });

    // ── Call the service (handles caching + retry internally) ──
    const { result, code, retryAfter, message } = await suggestListing(productTitle);

    // ── Success (fresh or cached) ──
    if (result) {
      return res.json({
        success: true,
        data: result,
        cached: code === 'CACHED',
      });
    }

    // ── Rate limited (all retries exhausted) ──
    if (code === 'RATE_LIMITED') {
      return res.status(429).json({
        success: false,
        message: message || 'AI server is busy, please wait 30 seconds.',
        code: 'RATE_LIMITED',
        retryAfter: retryAfter || 30,
      });
    }

    // ── Circuit breaker is open (service down) ──
    if (code === 'CIRCUIT_OPEN') {
      return res.status(503).json({
        success: false,
        message: message || 'AI service is temporarily unavailable. Please try again later.',
        code: 'CIRCUIT_OPEN',
        retryAfter: retryAfter || 30,
      });
    }

    // ── AI service unavailable (no API key, etc.) ──
    if (code === 'UNAVAILABLE') {
      return res.status(503).json({
        success: false,
        message: message || 'AI suggestion service is currently unavailable.',
        code: 'UNAVAILABLE',
      });
    }

    // ── Generic error ──
    return res.status(500).json({
      success: false,
      message: message || 'An internal error occurred while generating suggestions.',
      code: 'ERROR',
    });
  } catch (err) {
    console.error('[AiController] suggest error:', err);
    res.status(500).json({
      success: false,
      message: 'An internal error occurred. Please try again.',
      code: 'ERROR',
    });
  }
};