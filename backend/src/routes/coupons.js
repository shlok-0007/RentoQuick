const express = require('express');
const router = express.Router();
const {
    createCoupon, validateCoupon, getActiveCoupons, getUserReferralInfo, getAllCoupons, redeemCoupon
} = require('../controllers/couponController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const rateLimit = require('express-rate-limit');
const { couponSchema, couponValidateSchema } = require('../utils/validation');

const couponValidateLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { success: false, message: 'Too many coupon validation attempts' } });

router.post('/', protect, authorize('admin'), validate(couponSchema), createCoupon);
router.post('/validate', protect, couponValidateLimiter, validate(couponValidateSchema), validateCoupon);
router.post('/:id/redeem', protect, validate(couponValidateSchema), redeemCoupon);
router.get('/active', protect, getActiveCoupons);
router.get('/referral', protect, getUserReferralInfo);
router.get('/', protect, authorize('admin'), getAllCoupons);

module.exports = router;
