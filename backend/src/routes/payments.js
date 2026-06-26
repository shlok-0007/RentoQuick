const express = require('express');
const router = express.Router();
const { createOrder, verifyPayment, getPaymentStatus } = require('../controllers/razorpayController');
const { protect } = require('../middleware/auth');

// All payment routes require authentication
router.use(protect);

router.post('/create-order', createOrder);
router.post('/verify', verifyPayment);
router.post('/status', getPaymentStatus);

module.exports = router;
