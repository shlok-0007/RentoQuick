const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    comment: {
        type: String,
        required: true,
        maxlength: [1000, 'Reply cannot exceed 1000 characters'],
    },
}, {
    timestamps: true,
});

const reviewSchema = new mongoose.Schema({
    booking: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
        required: true,
    },
    listing: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Listing',
        required: true,
    },
    reviewer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    reviewee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    type: {
        type: String,
        enum: ['item', 'renter', 'owner'],
        default: 'item',
    },
    rating: {
        type: Number,
        required: [true, 'Please add a rating'],
        min: 1,
        max: 5,
    },
    comment: {
        type: String,
        maxlength: [1000, 'Comment cannot exceed 1000 characters'],
    },
    photos: [{ url: { type: String, maxlength: 500, required: true }, alt: { type: String, maxlength: 200 } }],

    // ── Owner response (legacy single-response field, kept for back-compat) ──
    ownerResponse: {
        comment: String,
        timestamp: Date,
    },

    // ── Threaded replies ──
    // Supports multiple replies (owner + others) on a single review.
    replies: [replySchema],

    // ── Likes ──
    // Array of user IDs who liked the review. Using an array (instead of a
    // count) lets us toggle a user's like on/off without double-counting,
    // and lets us show "You liked this" in the UI. A compound index on
    // { _id: 1 } + the array membership check makes the toggle O(1).
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
}, {
    timestamps: true,
});

// One review per booking per type
reviewSchema.index({ booking: 1, type: 1, reviewer: 1 }, { unique: true });

// 4.1 — Performance indexes
reviewSchema.index({ listing: 1, type: 1, createdAt: -1 });
reviewSchema.index({ reviewee: 1, createdAt: -1 });

// Virtual: like count (derived from likes array length)
reviewSchema.virtual('likeCount').get(function () {
    return Array.isArray(this.likes) ? this.likes.length : 0;
});

// Ensure virtuals are included when converting to JSON/Object
reviewSchema.set('toJSON', { virtuals: true });
reviewSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Review', reviewSchema);
