const jwt = require('jsonwebtoken');

const ACCESS_TTL = '15m';
const REFRESH_TTL = '7d';

const generateAccessToken = (user) => jwt.sign(
    { id: user._id, v: user.tokenVersion, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TTL }
);

const generateRefreshToken = (user) => jwt.sign(
    { id: user._id, v: user.tokenVersion, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: REFRESH_TTL }
);

const generateToken = (user) => generateAccessToken(user);

const sendTokenResponse = (user, statusCode, res, message = 'Success') => {
    const token = generateToken(user);
    res.status(statusCode).json({
        success: true, message, token,
        user: { _id: user._id, name: user.name, email: user.email, avatar: user.avatar, role: user.role, bio: user.bio, phone: user.phone, location: user.location, rating: user.rating, isVerified: user.isVerified, createdAt: user.createdAt },
    });
};

const paginate = (query, page = 1, limit = 12) => query.skip((page - 1) * limit).limit(limit);

const buildPaginationMeta = (total, page, limit) => {
    const totalPages = Math.ceil(total / limit);
    return { total, page: Number(page), limit: Number(limit), totalPages, hasNext: page < totalPages, hasPrev: page > 1 };
};

module.exports = { generateToken, generateAccessToken, generateRefreshToken, sendTokenResponse, paginate, buildPaginationMeta };
