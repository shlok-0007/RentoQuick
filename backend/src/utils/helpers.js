const jwt = require('jsonwebtoken');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });
};

const sendTokenResponse = (user, statusCode, res, message = 'Success') => {
    const token = generateToken(user._id);

    res.status(statusCode).json({
        success: true,
        message,
        token,
        user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            role: user.role,
            bio: user.bio,
            phone: user.phone,
            location: user.location,
            rating: user.rating,
            isVerified: user.isVerified,
            createdAt: user.createdAt,
        },
    });
};

const paginate = (query, page = 1, limit = 12) => {
    const skip = (page - 1) * limit;
    return query.skip(skip).limit(limit);
};

const buildPaginationMeta = (total, page, limit) => {
    const totalPages = Math.ceil(total / limit);
    return {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
    };
};

module.exports = { generateToken, sendTokenResponse, paginate, buildPaginationMeta };
