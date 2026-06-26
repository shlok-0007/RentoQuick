const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Simple in-memory LRU cache (4.6)
const userCache = new Map();
const CACHE_MAX = 500;
const CACHE_TTL = 60000;
function cacheGet(key) { const e = userCache.get(key); if (!e) return null; if (Date.now() - e.ts > CACHE_TTL) { userCache.delete(key); return null; } return e.value; }
function cacheSet(key, value) { if (userCache.size >= CACHE_MAX) userCache.delete(userCache.keys().next().value); userCache.set(key, { value, ts: Date.now() }); }

exports.protect = async (req, res, next) => {
    try {
        let token;
        if (req.headers.authorization?.startsWith('Bearer ')) token = req.headers.authorization.split(' ')[1];
        if (!token) return res.status(401).json({ success: false, message: 'Not authenticated' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET, { clockTolerance: 30, algorithms: ['HS256'] });

        if (decoded.v !== undefined) {
            const cacheKey = `user:${decoded.id}:v${decoded.v}`;
            let user = cacheGet(cacheKey);
            if (!user) {
                user = await User.findById(decoded.id).lean();
                if (!user) return res.status(401).json({ success: false, message: 'User no longer exists' });
                if (decoded.v !== user.tokenVersion) return res.status(401).json({ success: false, message: 'Token revoked - please log in again' });
                cacheSet(cacheKey, user);
            }
            req.user = user;
        } else {
            const user = await User.findById(decoded.id);
            if (!user) return res.status(401).json({ success: false, message: 'User no longer exists' });
            req.user = user;
        }
        next();
    } catch (err) { return res.status(401).json({ success: false, message: 'Invalid or expired token' }); }
};

exports.authorize = (...roles) => (req, res, next) => {
    if (!roles.includes(req.user?.role)) return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    next();
};

exports.optionalAuth = async (req, res, next) => {
    try {
        let token;
        if (req.headers.authorization?.startsWith('Bearer ')) token = req.headers.authorization.split(' ')[1];
        if (token) { const decoded = jwt.verify(token, process.env.JWT_SECRET, { clockTolerance: 30, algorithms: ['HS256'] }); const user = await User.findById(decoded.id); if (user) req.user = user; }
    } catch { /* optional */ }
    next();
};
