/**
 * Background Verification Queue (BullMQ + Redis)
 *
 * Moves AI product verification (Gemini) off the request hot path.
 * When a user selects a product in SmartProductSuggestion, verification
 * is enqueued and processed asynchronously. Results are stored in MongoDB
 * and optionally pushed to the client via Socket.IO.
 *
 * Environment variables:
 * REDIS_URL — Redis connection URL (default: redis://localhost:6379)
 */

const { Queue: BullQueue, Worker } = require('bullmq');
const { getRedisClient } = require('./redisCache');

let verificationQueue = null;
let worker = null;
let queueConnection = null; // Track the duplicated connection for cleanup

/**
 * Initialise the verification queue and worker.
 * Call this after Redis is connected.
 */
function initVerificationQueue(io) {
    const baseConnection = getRedisClient();
    if (!baseConnection) {
        console.warn('[VerifyQueue] Redis not available — verification will run synchronously');
        return;
    }

    // ── BullMQ Fix ──
    // Duplicate the connection and explicitly set maxRetriesPerRequest to null.
    // This satisfies BullMQ's blocking command requirements without affecting regular caching.
    try {
        if (typeof baseConnection.duplicate === 'function') {
            queueConnection = baseConnection.duplicate({ maxRetriesPerRequest: null });
        } else {
            // Fallback if the object returned is a configuration block rather than an ioredis instance
            queueConnection = baseConnection;
            if (queueConnection.options) {
                queueConnection.options.maxRetriesPerRequest = null;
            } else {
                queueConnection.maxRetriesPerRequest = null;
            }
        }
    } catch (err) {
        console.error('[VerifyQueue] Failed to configure Redis options for BullMQ:', err.message);
        return;
    }

    verificationQueue = new BullQueue('product-verification', {
        connection: queueConnection,
        defaultJobOptions: {
            removeOnComplete: { count: 100 },  // Keep last 100 completed jobs
            removeOnFail: { count: 50 },       // Keep last 50 failed jobs
            attempts: 2,                        // Retry once on failure
            backoff: { type: 'exponential', delay: 5000 },
        },
    });

    // ── Worker: processes verification jobs ──
    worker = new Worker('product-verification', async (job) => {
        const { listingId, title, description, userId } = job.data;

        // Dynamic import to avoid circular deps
        const { verifyProduct } = require('./geminiVerifyService');
        const Listing = require('../models/Listing');

        console.log(`[VerifyQueue] Processing job ${job.id} for listing "${title}"`);

        const verification = await verifyProduct({ title, description });

        if (!verification) {
            throw new Error('Verification returned null');
        }

        // Update the listing with verification results
        if (listingId) {
            await Listing.findByIdAndUpdate(listingId, {
                isVerifiedByAI: verification.isValid,
                aiConfidenceScore: verification.confidenceScore,
                standardizedCategory: verification.standardizedCategory || '',
                suggestedThumbnail: verification.suggestedThumbnail || '',
                verificationDetails: verification,
            }).catch((err) => {
                console.warn(`[VerifyQueue] Failed to update listing ${listingId}:`, err.message);
            });
        }

        // Push result to the client via Socket.IO
        if (io && userId) {
            const { sendNotification } = require('../utils/notifications');
            try {
                if (verification.isValid) {
                    await sendNotification({
                        recipient: userId,
                        type: 'system',
                        title: 'Product Verified ✓',
                        content: `"${title}" has been verified by AI with ${verification.confidenceScore}% confidence.`,
                    });
                }
            } catch {
                // Notification failure is non-critical
            }
        }

        return verification;
    }, {
        connection: queueConnection,
        concurrency: 2, // Max 2 concurrent verification jobs
    });

    // ── Worker events ──
    worker.on('completed', (job) => {
        console.log(`[VerifyQueue] Job ${job.id} completed in ${job.finishedIn}ms`);
    });

    worker.on('failed', (job, err) => {
        console.error(`[VerifyQueue] Job ${job?.id} failed:`, err.message);
    });

    worker.on('error', (err) => {
        console.error('[VerifyQueue] Worker error:', err.message);
    });

    console.log('[VerifyQueue] Queue and worker initialised');
}

/**
 * Enqueue a product verification job.
 * @param {{ listingId?: string, title: string, description: string, userId: string }} data
 * @returns {Promise<{ enqueued: boolean, jobId?: string, error?: string }>}
 */
async function enqueueVerification(data) {
    if (!verificationQueue) {
        return { enqueued: false, error: 'Verification queue not initialised (Redis unavailable)' };
    }

    try {
        const job = await verificationQueue.add('verify-product', data, {
            jobId: data.listingId ? `verify-${data.listingId}` : undefined,
        });

        console.log(`[VerifyQueue] Enqueued job ${job.id} for "${data.title}"`);
        return { enqueued: true, jobId: job.id };
    } catch (err) {
        console.error('[VerifyQueue] Enqueue error:', err.message);
        return { enqueued: false, error: err.message };
    }
}

/**
 * Check if the verification queue is available.
 * @returns {boolean}
 */
function isQueueAvailable() {
    return !!verificationQueue;
}

/**
 * Gracefully close the queue and worker.
 */
async function closeVerificationQueue() {
    if (worker) {
        await worker.close();
        worker = null;
    }
    if (verificationQueue) {
        await verificationQueue.close();
        verificationQueue = null;
    }
    if (queueConnection && typeof queueConnection.quit === 'function') {
        await queueConnection.quit();
        queueConnection = null;
    }
}

module.exports = {
    initVerificationQueue,
    enqueueVerification,
    isQueueAvailable,
    closeVerificationQueue,
};