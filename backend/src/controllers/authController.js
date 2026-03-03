const bcrypt = require('bcryptjs');
const { Users } = require('../db/fileDB');
const { generateToken, sendTokenResponse } = require('../utils/helpers');

// POST /api/auth/register
exports.register = async (req, res, next) => {
    try {
        const { name, email, password, phone } = req.body;

        const existing = Users.findOne({ email: email.toLowerCase() });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Email already registered' });
        }

        const hashed = await bcrypt.hash(password, 12);
        const user = Users.create({ name, email, password: hashed, phone });

        const token = generateToken(user._id);
        const { password: _, ...userSafe } = user;
        res.status(201).json({ success: true, token, user: userSafe });
    } catch (err) {
        next(err);
    }
};

// POST /api/auth/login
exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password required' });
        }

        const user = Users.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const token = generateToken(user._id);
        const { password: _, ...userSafe } = user;
        res.json({ success: true, token, user: userSafe });
    } catch (err) {
        next(err);
    }
};

// GET /api/auth/me
exports.getMe = async (req, res, next) => {
    try {
        const user = Users.findById(req.user._id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        const { password: _, ...userSafe } = user;
        res.json({ success: true, user: userSafe });
    } catch (err) {
        next(err);
    }
};

// PUT /api/auth/me
exports.updateProfile = async (req, res, next) => {
    try {
        const { name, phone, bio, location, avatar } = req.body;
        const updates = {};
        if (name !== undefined) updates.name = name;
        if (phone !== undefined) updates.phone = phone;
        if (bio !== undefined) updates.bio = bio;
        if (location !== undefined) updates.location = location;
        if (avatar !== undefined) updates.avatar = avatar;

        const user = Users.findByIdAndUpdate(req.user._id, updates);
        const { password: _, ...userSafe } = user;
        res.json({ success: true, user: userSafe });
    } catch (err) {
        next(err);
    }
};

// PUT /api/auth/change-password
exports.changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = Users.findById(req.user._id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const match = await bcrypt.compare(currentPassword, user.password);
        if (!match) return res.status(401).json({ success: false, message: 'Current password is incorrect' });

        const hashed = await bcrypt.hash(newPassword, 12);
        Users.findByIdAndUpdate(user._id, { password: hashed });
        res.json({ success: true, message: 'Password updated successfully' });
    } catch (err) {
        next(err);
    }
};

// POST /api/auth/wishlist/:listingId
exports.toggleWishlist = async (req, res, next) => {
    try {
        const user = Users.findById(req.user._id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const lid = req.params.listingId;
        const wishlist = user.wishlist || [];
        const idx = wishlist.indexOf(lid);
        let updated;
        if (idx > -1) {
            updated = wishlist.filter(id => id !== lid);
        } else {
            updated = [...wishlist, lid];
        }
        Users.findByIdAndUpdate(user._id, { wishlist: updated });
        res.json({ success: true, wishlist: updated, added: idx === -1 });
    } catch (err) {
        next(err);
    }
};

// GET /api/auth/profile/:id
exports.getPublicProfile = async (req, res, next) => {
    try {
        const user = Users.findById(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        const { password: _, ...safe } = user;
        res.json({ success: true, user: safe });
    } catch (err) {
        next(err);
    }
};
