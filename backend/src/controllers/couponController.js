const Coupon = require('../models/Coupon');
const User = require('../models/User');

// POST /api/coupons (admin) — explicit field whitelist (2.4)
exports.createCoupon = async (req, res, next) => {
    try {
        const {
            code, discountType, discountValue, minBookingAmount,
            maxDiscountAmount, maxUses, validFrom, validUntil, isActive
        } = req.body;

        const coupon = await Coupon.create({
            code: (code || "").toUpperCase(),
            discountType,
            discountValue: Number(discountValue),
            minBookingAmount: Number(minBookingAmount) || 0,
            maxDiscountAmount: Number(maxDiscountAmount) || 0,
            maxUses: maxUses ? Number(maxUses) : null,
            validFrom: new Date(validFrom),
            validUntil: new Date(validUntil),
            isActive: Boolean(isActive),
            createdBy: req.user._id
        });
        res.status(201).json({ success: true, coupon });
    } catch (err) {
        next(err);
    }
};

// POST /api/coupons/validate — read-only validation
exports.validateCoupon = async (req, res, next) => {
    try {
        const { code, bookingAmount } = req.body;
        const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });
        if (!coupon) {
            return res.status(404).json({ success: false, message: 'Invalid coupon code' });
        }
        const now = new Date();
        if (now < coupon.validFrom || now > coupon.validUntil) {
            return res.status(400).json({ success: false, message: 'Coupon has expired' });
        }
        if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
            return res.status(400).json({ success: false, message: 'Coupon usage limit reached' });
        }
        if (coupon.usedBy.includes(req.user._id)) {
            return res.status(400).json({ success: false, message: 'You have already used this coupon' });
        }
        if (bookingAmount && bookingAmount < coupon.minBookingAmount) {
            return res.status(400).json({
                success: false,
                message: `Minimum booking amount of \u20b9${coupon.minBookingAmount} required`
            });
        }
        let discount = 0;
        if (coupon.discountType === 'percentage') {
            discount = Math.round((bookingAmount || 0) * coupon.discountValue / 100);
            if (coupon.maxDiscountAmount) discount = Math.min(discount, coupon.maxDiscountAmount);
        } else {
            discount = coupon.discountValue;
        }
        res.json({ success: true, coupon: { _id: coupon._id, code: coupon.code, discountType: coupon.discountType, discountValue: coupon.discountValue }, discount });
    } catch (err) { next(err); }
};

// POST /api/coupons/:id/redeem — atomic conditional update (2.1)
exports.redeemCoupon = async (req, res, next) => {
    try {
        const { bookingId, bookingAmount } = req.body;
        const coupon = await Coupon.findOneAndUpdate(
            {
                _id: req.params.id, isActive: true,
                validFrom: { $lte: new Date() }, validUntil: { $gte: new Date() },
                usedBy: { $ne: req.user._id },
                $expr: { $or: [{ $eq: ["$maxUses", null] }, { $lt: ["$usedCount", "$maxUses"] }] }
            },
            { $inc: { usedCount: 1 }, $push: { usedBy: req.user._id } },
            { new: true }
        );
        if (!coupon) {
            return res.status(400).json({ success: false, message: "Coupon not redeemable (expired, used, or limit reached)" });
        }
        let discount = 0;
        if (coupon.discountType === 'percentage') {
            discount = Math.round((bookingAmount || 0) * coupon.discountValue / 100);
            if (coupon.maxDiscountAmount) discount = Math.min(discount, coupon.maxDiscountAmount);
        } else {
            discount = coupon.discountValue;
        }
        res.json({ success: true, coupon: { _id: coupon._id, code: coupon.code }, discount });
    } catch (err) { next(err); }
};

exports.getActiveCoupons = async (req, res, next) => {
    try {
        const coupons = await Coupon.find({
            isActive: true, validUntil: { $gt: new Date() },
            $or: [{ maxUses: null }, { $expr: { $lt: ['$usedCount', '$maxUses'] } }]
        }).select('code discountType discountValue minBookingAmount maxDiscountAmount validUntil');
        res.json({ success: true, coupons });
    } catch (err) { next(err); }
};

exports.getUserReferralInfo = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id).select('referralCode referralCredits');
        const referrals = await User.countDocuments({ referredBy: req.user._id });
        res.json({ success: true, referralCode: user.referralCode, referralCredits: user.referralCredits, totalReferrals: referrals });
    } catch (err) { next(err); }
};

exports.getAllCoupons = async (req, res, next) => {
    try {
        const coupons = await Coupon.find().sort('-createdAt');
        res.json({ success: true, coupons });
    } catch (err) { next(err); }
};
