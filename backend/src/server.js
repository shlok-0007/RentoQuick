require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const path = require('path');
const http = require('http');

const connectDB = require('./db/mongodb');
// ... (your routes imports remain the same)
const authRoutes = require('./routes/auth');
const listingRoutes = require('./routes/listings');
const bookingRoutes = require('./routes/bookings');
const messageRoutes = require('./routes/messages');
const paymentRoutes = require('./routes/payments');
const adminRoutes = require('./routes/admin');
const analyticsRoutes = require('./routes/analytics');
const notificationRoutes = require('./routes/notifications');
const reviewRoutes = require('./routes/reviews');
const disputeRoutes = require('./routes/disputes');
const couponRoutes = require('./routes/coupons');
const savedSearchRoutes = require('./routes/savedSearches');
const pushRoutes = require('./routes/push');
const productRoutes = require('./routes/products');
const aiRoutes = require('./routes/ai');

const { init: initAiService, getCircuitStats } = require('./services/aiSuggestService');
const { initVerificationQueue, closeVerificationQueue } = require('./services/verificationQueue');
const { closeRedis } = require('./services/redisCache');
const { errorHandler } = require('./middleware/errorHandler');
const { initSocket } = require('./utils/notifications');

const app = express();
const PORT = process.env.PORT || 5000;
const PROD_URL = 'https://rentoquick-7hax.onrender.com';

// ── Connect to Database ─────────────────────────────────────────────────────
connectDB();

const server = http.createServer(app);
initSocket(server);

// ── Security middleware ───────────────────────────────────────────────────
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            imgSrc: ["'self'", "data:", "https://res.cloudinary.com", "https://serpapi.com", "https://*"],
            // Updated to allow your production URL and secure web sockets
            connectSrc: ["'self'", "https://res.cloudinary.com", "https://serpapi.com", "https://generativelanguage.googleapis.com", PROD_URL, "wss://rentoquick-7hax.onrender.com", "ws://rentoquick-7hax.onrender.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
        },
    },
}));

// CORS: Now uses the environment variable or defaults
app.use(cors({
    origin: process.env.CLIENT_URL || ['http://localhost:5173', 'http://localhost:3000', PROD_URL],
    credentials: true,
}));

// ── Rate limiting ─────────────────────────────────────────────────────────
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: { success: false, message: 'Too many requests, please try again later.' },
});

// ── Response compression ───────────────────────────────────────────────
app.use(compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
        if (req.headers['x-no-compression']) return false;
        const contentType = res.getHeader('Content-Type') || '';
        if (/image\/|video\/|audio\/|application\/pdf|application\/zip/.test(contentType)) {
            return false;
        }
        return true;
    },
}));

// ── Body parser ───────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Static files ──────────────────────────────────────────────────────────
app.use('/public', express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// ── Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/disputes', disputeRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/saved-searches', savedSearchRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/products', productRoutes);
app.use('/api/ai', aiRoutes);

// ── Serve Frontend in Production ──────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
    const frontendDist = path.join(__dirname, '../../frontend/dist');
    app.use(express.static(frontendDist));

    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api')) {
            return next();
        }
        res.sendFile(path.join(frontendDist, 'index.html'));
    });
}

// ── Error handler ─────────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start server ──────────────────────────────────────────
server.listen(PORT, async () => {
    console.log(`\n🚀 RentoQuick API running on port ${PORT}`);
    initAiService();
    initVerificationQueue();
});

module.exports = app;
