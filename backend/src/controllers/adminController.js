const User = require('../models/User');
const Listing = require('../models/Listing');
const Booking = require('../models/Booking');

// GET /api/admin/stats
exports.getStats = async (req, res, next) => {
    try {
        const stats = {
            totalUsers: await User.countDocuments(),
            totalListings: await Listing.countDocuments(),
            totalBookings: await Booking.countDocuments(),
            pendingListings: await Listing.countDocuments({ 'availability.isAvailable': true, isActive: false }), // Assuming isActive is used for moderation
            revenue: await Booking.aggregate([
                { $match: { paymentStatus: 'paid' } },
                { $group: { _id: null, total: { $sum: "$pricing.totalAmount" } } }
            ])
        };

        res.status(200).json({ success: true, stats });
    } catch (err) {
        next(err);
    }
};

// GET /api/admin/users
exports.getUsers = async (req, res, next) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const users = await User.find()
            .select('-password -emailVerificationOTP -emailVerificationExpires -passwordResetToken -passwordResetExpires')
            .sort('-createdAt')
            .skip(skip)
            .limit(Number(limit));
        const total = await User.countDocuments();
        res.status(200).json({ success: true, users, pagination: { total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) } });
    } catch (err) {
        next(err);
    }
};

// GET /api/admin/listings
exports.getListings = async (req, res, next) => {
    try {
        const listings = await Listing.find().populate('owner', 'name email');
        res.status(200).json({ success: true, listings });
    } catch (err) {
        next(err);
    }
};

// PATCH /api/admin/listings/:id/approve
exports.approveListing = async (req, res, next) => {
    try {
        const listing = await Listing.findByIdAndUpdate(req.params.id, { isActive: true }, { new: true });
        res.status(200).json({ success: true, listing });
    } catch (err) {
        next(err);
    }
};

// PATCH /api/admin/users/:id/suspend
exports.suspendUser = async (req, res, next) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, { isVerified: false }, { new: true });
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        res.json({ success: true, user });
    } catch (err) {
        next(err);
    }
};

// PATCH /api/admin/users/:id/activate
exports.activateUser = async (req, res, next) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, { isVerified: true }, { new: true });
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        res.json({ success: true, user });
    } catch (err) {
        next(err);
    }
};

// DELETE /api/admin/listings/:id
exports.deleteListing = async (req, res, next) => {
    try {
        const listing = await Listing.findByIdAndDelete(req.params.id);
        if (!listing) return res.status(404).json({ success: false, message: 'Listing not found' });
        res.json({ success: true, message: 'Listing deleted permanently' });
    } catch (err) {
        next(err);
    }
};

// GET /api/admin/revenue
exports.getRevenueReport = async (req, res, next) => {
    try {
        const { period = 'monthly' } = req.query;
        let groupFormat;
        if (period === 'weekly') {
            groupFormat = { $isoWeek: '$createdAt' };
        } else if (period === 'daily') {
            groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
        } else {
            groupFormat = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
        }

        const revenueData = await Booking.aggregate([
            { $match: { paymentStatus: 'paid' } },
            {
                $group: {
                    _id: groupFormat,
                    revenue: { $sum: '$pricing.totalAmount' },
                    count: { $sum: 1 },
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.json({ success: true, revenue: revenueData });
    } catch (err) {
        next(err);
    }
};

// GET /api/admin/bookings
exports.getBookings = async (req, res, next) => {
    try {
        const bookings = await Booking.find()
            .sort('-createdAt')
            .populate('listing', 'title slug')
            .populate('renter', 'name email')
            .populate('owner', 'name email');
        res.json({ success: true, bookings });
    } catch (err) {
        next(err);
    }
};
