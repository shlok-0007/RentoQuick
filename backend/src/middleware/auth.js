const jwt = require('jsonwebtoken');
const { Users } = require('../db/fileDB');

exports.protect = async (req, res, next) => {
    try {
        let token;
        if (req.headers.authorization?.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }
        if (!token) {
            return res.status(401).json({ success: false, message: 'Not authenticated' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'rentoquick_secret_key_2024');
        const user = Users.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ success: false, message: 'User no longer exists' });
        }

        const { password: _, ...safeUser } = user;
        req.user = { ...safeUser, _id: user._id };
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
};

exports.authorize = (...roles) => (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
        return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }
    next();
};

exports.optionalAuth = async (req, res, next) => {
    try {
        let token;
        if (req.headers.authorization?.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'rentoquick_secret_key_2024');
            const user = Users.findById(decoded.id);
            if (user) {
                const { password: _, ...safeUser } = user;
                req.user = { ...safeUser, _id: user._id };
            }
        }
    } catch {
        // ignore, optional
    }
    next();
};
