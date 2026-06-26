const mongoose = require('mongoose');

const disputeSchema = new mongoose.Schema({
    booking: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
        required: true,
    },
    raisedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    against: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    reason: {
        type: String,
        enum: ['damaged_item', 'not_as_described', 'late_return', 'payment_issue', 'no_show', 'other'],
        required: true,
    },
    description: {
        type: String,
        required: [true, 'Please describe the issue'],
        maxlength: 2000,
    },
    evidence: [{ url: String, alt: String }],
    status: {
        type: String,
        enum: ['open', 'under_review', 'resolved', 'closed'],
        default: 'open',
    },
    resolution: {
        decision: String,
        refundAmount: Number,
        resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        resolvedAt: Date,
    },
    adminNotes: String,
    responses: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        message: String,
        attachments: [{ url: String }],
        timestamp: { type: Date, default: Date.now },
    }],
    timeline: [{
        status: String,
        timestamp: { type: Date, default: Date.now },
        note: String,
    }],
}, {
    timestamps: true,
});

module.exports = mongoose.model('Dispute', disputeSchema);
