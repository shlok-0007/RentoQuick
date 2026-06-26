const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth');

router.get('/owner', protect, analyticsController.getOwnerAnalytics);


// 6.9 — Standardized route protection (all routes require auth)
router.use(protect);

module.exports = router;
