const express = require('express');
const router = express.Router();
const { subscribePush, unsubscribePush } = require('../controllers/pushController');
const { protect } = require('../middleware/auth');

router.post('/subscribe', protect, subscribePush);
router.delete('/unsubscribe', protect, unsubscribePush);


// 6.9 — Standardized route protection (all routes require auth)
router.use(protect);

module.exports = router;
