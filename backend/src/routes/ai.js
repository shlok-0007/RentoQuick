const express = require('express');
const router = express.Router();
const { suggest } = require('../controllers/aiController');
const { protect } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

// Limit AI suggestions to prevent abuse
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { success: false, message: 'Too many AI requests. Please wait a moment.' },
});

router.post('/suggest', protect, aiLimiter, suggest);

module.exports = router;