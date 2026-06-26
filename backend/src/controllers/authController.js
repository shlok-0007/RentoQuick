const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const { generateToken } = require('../utils/helpers');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/emailService');
const { isCloudinaryConfigured } = require('../utils/cloudinary');

// POST /api/auth/register
exports.register = async (req, res, next) => {
    try {
        const { name, email, password, phone, referralCode } = req.body;

        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Email already registered' });
        }

        const userData = { name, email, password, phone };

        // Handle referral
        if (referralCode) {
            const referrer = await User.findOne({ referralCode: referralCode.toUpperCase() });
            if (referrer) {
                userData.referredBy = referrer._id;
                referrer.referralCredits = (referrer.referralCredits || 0) + 50;
                await referrer.save();
            }
        }

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        userData.emailVerificationOTP = otp;
        userData.emailVerificationExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

        const user = await User.create(userData);

        // Send OTP email
        await sendVerificationEmail(email, otp);
        console.log(`📧 OTP for ${email}: ${otp}`);

        res.status(201).json({ success: true, message: 'Registration successful. Please verify your email.', email: user.email });
    } catch (err) {
        next(err);
    }
};


// POST /api/auth/forgot-password
exports.forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.json({ success: true, message: 'If this email exists, a reset link has been sent' });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);
        await user.save();

        await sendPasswordResetEmail(email, resetToken);
        console.log(`📧 Password reset token for ${email}: ${resetToken}`);

        res.json({ success: true, message: 'If this email exists, a reset link has been sent' });
    } catch (err) {
        next(err);
    }
};

// POST /api/auth/reset-password
exports.resetPassword = async (req, res, next) => {
    try {
        const { token, password } = req.body;
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
        }

        user.password = password;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();

        res.json({ success: true, message: 'Password reset successfully' });
    } catch (err) {
        next(err);
    }
};

// POST /api/auth/google
exports.googleLogin = async (req, res, next) => {
    try {
        const { credential } = req.body;
        const { OAuth2Client } = require('google-auth-library');
        const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const { email, name, picture, email_verified } = payload;

        let user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            user = await User.create({
                name,
                email: email.toLowerCase(),
                password: crypto.randomBytes(16).toString('hex'),
                avatar: picture || '',
                isEmailVerified: true,
                verification: { email: true, phone: false, identity: false },
            });
        }

        const token = generateToken(user._id);
        const userSafe = await User.findById(user._id);

        res.json({ success: true, token, user: userSafe });
    } catch (err) {
        console.error('Google login error:', err);
        res.status(401).json({ success: false, message: 'Google authentication failed' });
    }
};

// POST /api/auth/login
exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password required' });
        }

        const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const match = await user.matchPassword(password);
        if (!match) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const token = generateToken(user._id);
        const userSafe = await User.findById(user._id);
        res.json({ success: true, token, user: userSafe });
    } catch (err) {
        next(err);
    }
};

// GET /api/auth/me
exports.getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        res.json({ success: true, user });
    } catch (err) {
        next(err);
    }
};

// PUT /api/auth/me
exports.updateProfile = async (req, res, next) => {
    try {
        const allowedFields = ['name', 'phone', 'bio', 'avatar', 'location'];
        const updates = {};
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        }

        const user = await User.findByIdAndUpdate(req.user._id, updates, {
            new: true,
            runValidators: true,
        });
        res.json({ success: true, user });
    } catch (err) {
        next(err);
    }
};

// PUT /api/auth/change-password
exports.changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user._id).select('+password');
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const match = await user.matchPassword(currentPassword);
        if (!match) return res.status(401).json({ success: false, message: 'Current password is incorrect' });

        user.password = newPassword;
        await user.save();

        res.json({ success: true, message: 'Password updated successfully' });
    } catch (err) {
        next(err);
    }
};

// POST /api/auth/wishlist/:listingId
exports.toggleWishlist = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const lid = req.params.listingId;
        const wishlist = user.wishlist || [];
        const idx = wishlist.indexOf(lid);

        if (idx > -1) {
            user.wishlist.splice(idx, 1);
        } else {
            user.wishlist.push(lid);
        }

        await user.save();
        res.json({ success: true, wishlist: user.wishlist, added: idx === -1 });
    } catch (err) {
        next(err);
    }
};

// GET /api/auth/profile/:id
exports.getPublicProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id).select(
            '-password -emailVerificationOTP -emailVerificationExpires -passwordResetToken -passwordResetExpires -verification'
        );
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        res.json({ success: true, user });
    } catch (err) {
        next(err);
    }
};

// POST /api/auth/verify-email
exports.verifyEmail = async (req, res, next) => {
    try {
        const { email, otp } = req.body;
        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        if (user.isEmailVerified) {
            return res.status(400).json({ success: false, message: 'Email already verified' });
        }

        if (user.emailVerificationOTP !== otp) {
            return res.status(400).json({ success: false, message: 'Invalid OTP' });
        }

        if (user.emailVerificationExpires < Date.now()) {
            return res.status(400).json({ success: false, message: 'OTP expired' });
        }

        user.isEmailVerified = true;
        user.verification.email = true;
        user.emailVerificationOTP = undefined;
        user.emailVerificationExpires = undefined;
        await user.save();

        // Generate token after successful verification
        const token = generateToken(user._id);
        const userSafe = await User.findById(user._id);

        res.json({ success: true, message: 'Email verified successfully', token, user: userSafe });
    } catch (err) {
        next(err);
    }
};

// POST /api/auth/resend-otp
exports.resendOTP = async (req, res, next) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.emailVerificationOTP = otp;
        user.emailVerificationExpires = new Date(Date.now() + 10 * 60 * 1000);
        await user.save();

        await sendVerificationEmail(user.email, otp);
        console.log(`📧 Resent OTP for ${user.email}: ${otp}`);

        res.json({ success: true, message: 'New OTP sent to your email' });
    } catch (err) {
        next(err);
    }
};

// POST /api/auth/avatar — Upload profile avatar
exports.uploadAvatar = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        // Get the image URL — Cloudinary provides it in req.file.path, local needs manual path
        let avatarUrl;
        if (isCloudinaryConfigured) {
            avatarUrl = req.file.path; // Cloudinary URL
        } else {
            avatarUrl = `/uploads/avatars/${req.file.filename}`;
        }

        // Update user's avatar in database
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { avatar: avatarUrl },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({ success: true, user, avatarUrl });
    } catch (err) {
        next(err);
    }
};
