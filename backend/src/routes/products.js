/**
 * Product Suggestion Routes
 *
 * GET  /api/products/search?q=...    — Proxy to SerpApi for product suggestions
 * POST /api/products/verify          — Verify a product via Gemini AI (or enqueue)
 *
 * All routes require authentication.
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { searchProducts } = require('../services/productSearchService');
const { verifyProduct } = require('../services/grokVerifyService');
const { enqueueVerification, isQueueAvailable } = require('../services/verificationQueue');

// ── Rate limiter for product search (generous but protective) ──
const searchLimiter = require('express-rate-limit')({
    windowMs: 60 * 1000,       // 1 minute
    max: 20,                    // 20 searches per minute
    message: { success: false, message: 'Too many product searches. Please wait a moment.' },
});

// ── Search products (proxy to SerpApi) ───────────────────────────────────
router.get('/search', protect, searchLimiter, async (req, res) => {
    try {
        const { q } = req.query;

        if (!q || q.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Query must be at least 2 characters.',
                results: [],
            });
        }

        const results = await searchProducts(q.trim(), 8);

        res.json({
            success: true,
            query: q.trim(),
            results,
            count: results.length,
        });
    } catch (err) {
        console.error('[ProductsRoute] /search error:', err);
        res.status(500).json({
            success: false,
            message: 'Product search failed. Please try again.',
            results: [],
        });
    }
});

// ── Verify a product via Gemini AI ──────────────────────────────────────
// Supports both sync (default) and async (background queue) modes.
// Use ?async=true or { mode: 'async' } to enqueue the verification.
router.post('/verify', protect, async (req, res) => {
    try {
        const { title, description, mode, listingId } = req.body;

        if (!title || title.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Product title is required (min 2 characters).',
            });
        }

        const useAsync = mode === 'async' || req.query.async === 'true';

        // ── Async mode: enqueue and return immediately ──
        if (useAsync && isQueueAvailable() && listingId) {
            const { enqueued, jobId, error } = await enqueueVerification({
                title: title.trim(),
                description: (description || '').trim(),
                listingId,
                userId: req.user._id.toString(),
            });

            if (enqueued) {
                return res.json({
                    success: true,
                    verification: null,
                    async: true,
                    jobId,
                    message: 'Product verification has been queued. You will be notified when complete.',
                });
            }

            // Queue unavailable — fall through to sync
            console.warn('[ProductsRoute] Queue unavailable, falling back to sync verification');
        }

        // ── Sync mode: verify inline (blocking) ──
        const verification = await verifyProduct({
            title: title.trim(),
            description: (description || '').trim(),
        });

        if (!verification) {
            return res.status(503).json({
                success: false,
                message: 'AI verification is currently unavailable. You can still create the listing manually.',
                verification: null,
            });
        }

        res.json({
            success: true,
            verification,
            async: false,
        });
    } catch (err) {
        console.error('[ProductsRoute] /verify error:', err);
        res.status(500).json({
            success: false,
            message: 'Product verification failed. Please try again or add manually.',
            verification: null,
        });
    }
});

module.exports = router;