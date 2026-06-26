const Razorpay = require('razorpay');
const crypto = require('crypto');
const Booking = require('../models/Booking');

// Lazily initialise the Razorpay client so the server can boot even if the
// env vars aren't set yet (e.g. in CI). The actual endpoints will return a
// clean 500 if invoked without credentials.
let razorpayClient = null;
function getRazorpay() {
    if (razorpayClient) return razorpayClient;
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        throw new Error('Razorpay credentials are not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
    }
    razorpayClient = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    return razorpayClient;
}

/**
 * POST /api/payments/create-order
 *
 * Body: { bookingId }
 *
 * Workflow:
 *   1. Look up the booking, verify ownership (renter only).
 *   2. Idempotency — if the booking is already paid or already has a
 *      pending order, refuse to create a duplicate.
 *   3. Compute the amount IN PAISE on the server (never trust the client).
 *      Round to integer paise to avoid Razorpay's "decimal not allowed" error.
 *   4. Create the Razorpay order.
 *   5. Persist `paymentDetails.orderId` on the booking so the verify step
 *      can confirm the order actually belongs to this booking.
 */
exports.createOrder = async (req, res, next) => {
    try {
        const { bookingId } = req.body;
        if (!bookingId) {
            return res.status(400).json({ success: false, message: 'bookingId is required' });
        }

        const booking = await Booking.findById(bookingId);
        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }

        // Only the renter can pay for a booking
        if (booking.renter.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized to pay for this booking' });
        }

        // Idempotency — refuse to create a new order if already paid
        if (booking.paymentStatus === 'paid') {
            return res.status(400).json({
                success: false,
                message: 'This booking has already been paid.',
                paymentStatus: 'paid',
            });
        }

        // ── Server-side amount calculation ──
        // We deliberately ignore any amount sent from the client and recompute
        // from the booking's stored pricing. This prevents tampering.
        const amountInRupees = Number(booking.pricing?.totalAmount || 0);
        if (!amountInRupees || amountInRupees <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid booking amount' });
        }
        // Razorpay requires amount in paise as an integer
        const amountInPaise = Math.round(amountInRupees * 100);

        // If we already created an order for this booking and it hasn't been
        // paid yet, return the existing order id (idempotent behaviour so the
        // user can retry after a failed checkout without generating duplicates).
        if (booking.paymentDetails?.orderId) {
            try {
                const existing = await getRazorpay().orders.fetch(booking.paymentDetails.orderId);
                // Only reuse if the order is still in 'created' or 'attempted' state
                if (existing && ['created', 'attempted'].includes(existing.status)) {
                    return res.status(200).json({
                        success: true,
                        order: existing,
                        // Echo back the public key + amount so the frontend
                        // has everything it needs to open the checkout modal.
                        key_id: process.env.RAZORPAY_KEY_ID,
                        amount: amountInPaise,
                        currency: 'INR',
                    });
                }
            } catch (_err) {
                // If fetching the old order fails (e.g. it was cancelled),
                // fall through and create a new one.
            }
        }

        const options = {
            amount: amountInPaise,
            currency: 'INR',
            receipt: `rcpt_${String(bookingId).substring(0, 24)}`,
            notes: {
                bookingId: String(booking._id),
                renterId: String(booking.renter),
                listingId: String(booking.listing),
            },
        };

        const order = await getRazorpay().orders.create(options);

        // Persist the order id so the verify step can ensure this order
        // actually belongs to this booking (prevents order-id swapping).
        booking.paymentDetails = {
            ...(booking.paymentDetails?.toObject?.() || booking.paymentDetails || {}),
            orderId: order.id,
            amount: amountInPaise,
            currency: 'INR',
            method: null,
            paymentId: null,
            signature: null,
            verifiedAt: null,
        };
        booking.paymentStatus = 'unpaid'; // explicit
        await booking.save();

        res.status(200).json({
            success: true,
            order,
            key_id: process.env.RAZORPAY_KEY_ID,
            amount: amountInPaise,
            currency: 'INR',
        });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/payments/verify
 *
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId }
 *
 * Workflow:
 *   1. Look up the booking, verify ownership.
 *   2. Verify the booking has a stored `paymentDetails.orderId` that
 *      matches the incoming `razorpay_order_id` (prevents swapping).
 *   3. Idempotency — if already paid, return success without re-verifying.
 *   4. Compute the expected HMAC-SHA256 signature using timing-safe compare.
 *   5. On match: set `paymentStatus = 'paid'`, `status = 'confirmed'`,
 *      store all payment details, push a timeline entry.
 */
exports.verifyPayment = async (req, res, next) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            bookingId,
        } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !bookingId) {
            return res.status(400).json({ success: false, message: 'Missing required payment fields' });
        }

        const booking = await Booking.findById(bookingId);
        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }

        if (booking.renter.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        // ── Order-id binding check ──
        // The order id we stored on the booking at create-order time must
        // match the order id Razorpay is now reporting as paid. This stops
        // an attacker from paying for booking B and using that signature to
        // mark booking A as paid.
        if (!booking.paymentDetails?.orderId || booking.paymentDetails.orderId !== razorpay_order_id) {
            return res.status(400).json({ success: false, message: 'Order ID does not match this booking' });
        }

        // ── Idempotency ──
        // If the booking is already paid, just return success without
        // re-running the signature check (the signature is single-use anyway).
        if (booking.paymentStatus === 'paid') {
            return res.status(200).json({
                success: true,
                message: 'Payment already verified',
                booking,
            });
        }

        // ── Signature verification (timing-safe) ──
        const body = `${razorpay_order_id}|${razorpay_payment_id}`;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body)
            .digest('hex');

        // Convert both to Buffers and use timingSafeEqual to prevent
        // timing side-channel attacks.
        const a = Buffer.from(expectedSignature, 'utf8');
        const b = Buffer.from(String(razorpay_signature), 'utf8');
        let signaturesMatch = false;
        if (a.length === b.length) {
            signaturesMatch = crypto.timingSafeEqual(a, b);
        }

        if (!signaturesMatch) {
            // Persist the failure for audit trail
            booking.timeline.push({
                status: 'payment_failed',
                timestamp: new Date(),
                note: 'Razorpay signature verification failed.',
            });
            await booking.save();
            return res.status(400).json({ success: false, message: 'Invalid signature — payment verification failed' });
        }

        // ── Success: mark booking as paid + confirmed ──
        booking.paymentStatus = 'paid';
        booking.transactionId = razorpay_payment_id;
        booking.paymentDetails = {
            ...(booking.paymentDetails?.toObject?.() || booking.paymentDetails || {}),
            paymentId: razorpay_payment_id,
            signature: razorpay_signature,
            verifiedAt: new Date(),
        };

        // Bump the booking status to 'confirmed' as requested — but only if
        // the owner hasn't already moved it forward to active/completed.
        const forwardStatuses = ['active', 'completed', 'disputed', 'cancelled'];
        if (!forwardStatuses.includes(booking.status)) {
            booking.status = 'confirmed';
        }

        booking.timeline.push({
            status: 'paid',
            timestamp: new Date(),
            note: `Payment of ₹${(booking.paymentDetails.amount || 0) / 100} verified. Razorpay payment id: ${razorpay_payment_id}`,
        });

        await booking.save();

        const populated = await Booking.findById(booking._id)
            .populate('listing', 'title slug images')
            .populate('renter', 'name email phone')
            .populate('owner', 'name email phone');

        res.status(200).json({
            success: true,
            message: 'Payment verified successfully',
            booking: populated,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/payments/status
 *
 * Body: { bookingId }
 *
 * Returns the current payment status of a booking. Useful for the frontend
 * to poll after a checkout that may have been interrupted (user closed
 * the tab, network dropped, etc.).
 */
exports.getPaymentStatus = async (req, res, next) => {
    try {
        const { bookingId } = req.body;
        if (!bookingId) return res.status(400).json({ success: false, message: 'bookingId is required' });

        const booking = await Booking.findById(bookingId).select('paymentStatus paymentDetails status renter');
        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

        if (booking.renter.toString() !== req.user._id.toString() &&
            booking.owner?.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        res.json({
            success: true,
            paymentStatus: booking.paymentStatus,
            bookingStatus: booking.status,
            orderId: booking.paymentDetails?.orderId || null,
            paymentId: booking.paymentDetails?.paymentId || null,
            verifiedAt: booking.paymentDetails?.verifiedAt || null,
        });
    } catch (err) {
        next(err);
    }
};
