const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    listing: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Listing',
        required: true,
    },
    renter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    startDate: {
        type: Date,
        required: [true, 'Please add a start date'],
    },
    endDate: {
        type: Date,
        required: [true, 'Please add an end date'],
    },
    totalDays: {
        type: Number,
        required: true,
    },
    pricing: {
        pricePerDay: { type: Number, required: true },
        subtotal: { type: Number, required: true },
        securityDeposit: { type: Number, default: 0 },
        platformFee: { type: Number, default: 0 },
        totalAmount: { type: Number, required: true },
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'approved', 'rejected', 'declined', 'cancelled', 'active', 'completed', 'disputed'],
        default: 'pending',
    },
    paymentStatus: {
        type: String,
        enum: ['unpaid', 'paid', 'refunded', 'partially_refunded'],
        default: 'unpaid',
    },
    paymentMethod: {
        type: String,
        enum: ['online', 'cod'],
        default: 'online',
    },
    transactionId: String,
    // ── Full Razorpay payment audit trail ──
    // orderId is set at order-creation time, the rest are filled in when
    // the verify endpoint confirms the signature.
    paymentDetails: {
        orderId: { type: String, trim: true, sparse: true, index: true },
        paymentId: { type: String, trim: true },
        signature: { type: String, trim: true },
        amount: { type: Number }, // in paise (smallest currency unit)
        currency: { type: String, default: 'INR' },
        method: { type: String }, // upi / card / netbanking / wallet — populated from Razorpay if needed
        verifiedAt: { type: Date },
    },
    coupon: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Coupon',
    },
    discount: {
        type: Number,
        default: 0,
    },
    deliveryMethod: {
        type: String,
        enum: ['pickup', 'delivery'],
        default: 'pickup',
    },
    deliveryAddress: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: String,
    },
    notes: {
        renter: { type: String, default: '' },
        owner: { type: String, default: '' },
    },
    cancellation: {
        cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reason: String,
        timestamp: Date,
    },
    review: {
        rating: { type: Number, min: 1, max: 5 },
        comment: String,
        timestamp: Date,
    },
    timeline: [
        {
            status: String,
            timestamp: { type: Date, default: Date.now },
            note: String,
        },
    ],
}, {
    timestamps: true,
});

// Calculate totalDays before validation — reject inverted dates (3.1)
const MS_PER_DAY = 1000 * 60 * 60 * 24;
bookingSchema.pre('validate', function (next) {
    if (this.startDate && this.endDate) {
        const start = new Date(this.startDate);
        const end = new Date(this.endDate);
        if (end < start) {
            return next(new Error('endDate cannot be before startDate'));
        }
        if (end.getTime() === start.getTime()) {
            return next(new Error('endDate must be after startDate'));
        }
        this.totalDays = Math.max(1, Math.ceil((end - start) / MS_PER_DAY));
    }
    next();
});

// 4.1 — Performance indexes
bookingSchema.index({ listing: 1, startDate: 1, endDate: 1 });
bookingSchema.index({ renter: 1, createdAt: -1 });
bookingSchema.index({ owner: 1, createdAt: -1 });
bookingSchema.index({ owner: 1, paymentStatus: 1 });
bookingSchema.index({ status: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
