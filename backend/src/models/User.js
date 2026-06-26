const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a name'],
    },
    email: {
        type: String,
        required: [true, 'Please add an email'],
        unique: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please add a valid email',
        ],
    },
    password: {
        type: String,
        required: [true, 'Please add a password'],
        minlength: 6,
        select: false,
    },
    avatar: {
        type: String,
        default: '',
    },
    bio: {
        type: String,
        default: '',
    },
    phone: {
        type: String,
        default: '',
    },
    location: {
        city: { type: String, default: '' },
        state: { type: String, default: '' },
        country: { type: String, default: 'India' },
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user',
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    // Email verification
    emailVerificationOTP: String,
    emailVerificationExpires: Date,
    isEmailVerified: { type: Boolean, default: false },
    // Password reset
    passwordResetToken: String,
    passwordResetExpires: Date,
    // Verification badges
    verification: {
        email: { type: Boolean, default: false },
        phone: { type: Boolean, default: false },
        identity: { type: Boolean, default: false },
        identityDoc: { type: String, default: '' },
    },
    // Referral system
    referralCode: {
        type: String,
        unique: true,
        sparse: true,
    },
    referredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    referralCredits: {
        type: Number,
        default: 0,
    },
    tokenVersion: {
        type: Number,
        default: 0,
    },
    rating: {
        average: { type: Number, default: 0 },
        count: { type: Number, default: 0 },
    },
    wishlist: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Listing',
        },
    ],
}, {
    timestamps: true,
});

// ════════════════════════════════════════════════════════════════════
// Performance Indexes
// ════════════════════════════════════════════════════════════════════

// Email is already unique via schema option — no additional index needed.

// Admin dashboard: list users sorted by creation date
userSchema.index({ createdAt: -1 }, { name: 'idx_user_created' });

// Referral lookups: find user by referral code
userSchema.index({ referralCode: 1 }, { name: 'idx_referral_code' });

// Find users by role (admin list)
userSchema.index({ role: 1, createdAt: -1 }, { name: 'idx_role_created' });

// Email verification queries
userSchema.index(
    { emailVerificationExpires: 1 },
    { name: 'idx_email_verify_expires', expireAfterSeconds: 0 }
);

// Encrypt password using bcrypt
userSchema.pre('save', async function () {
    // Auto-generate referral code
    if (this.isNew && !this.referralCode) {
        this.referralCode = crypto.randomBytes(4).toString('hex').toUpperCase();
    }
    if (!this.isModified('password')) {
        return;
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
