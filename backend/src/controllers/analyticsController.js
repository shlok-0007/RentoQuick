const Booking = require('../models/Booking');
const Listing = require('../models/Listing');
const { ANALYTICS_WINDOW_MONTHS } = require('../config/constants');

// GET /api/analytics/owner
exports.getOwnerAnalytics = async (req, res, next) => {
    try {
        const ownerId = req.user._id;
        const windowStart = new Date();
        windowStart.setMonth(windowStart.getMonth() - ANALYTICS_WINDOW_MONTHS);

        // 4.2 — Run all independent queries in parallel
        const [
            totalEarningsAgg, activeRentals, totalListings,
            monthlyRevenueData, topListings, bookingTrends,
            totalReceived, acceptedBookings
        ] = await Promise.all([
            Booking.aggregate([
                { $match: { owner: ownerId, paymentStatus: 'paid' } },
                { $group: { _id: null, total: { $sum: "$pricing.totalAmount" } } }
            ]),
            Booking.countDocuments({ owner: ownerId, status: 'active' }),
            Listing.countDocuments({ owner: ownerId }),
            Booking.aggregate([
                { $match: { owner: ownerId, paymentStatus: 'paid', createdAt: { $gte: windowStart } } },
                { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, revenue: { $sum: '$pricing.totalAmount' }, count: { $sum: 1 } } },
                { $sort: { _id: 1 } }
            ]),
            Listing.find({ owner: ownerId, isActive: true }).sort('-views').limit(5)
                .select('title slug images views totalRentals pricePerDay'),
            Booking.aggregate([
                { $match: { owner: ownerId, createdAt: { $gte: windowStart } } },
                { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, total: { $sum: 1 } } },
                { $sort: { _id: 1 } }
            ]),
            Booking.countDocuments({ owner: ownerId }),
            Booking.countDocuments({ owner: ownerId, status: { $in: ['confirmed', 'approved', 'active', 'completed'] } })
        ]);

        const stats = {
            totalEarnings: totalEarningsAgg[0]?.total || 0,
            activeRentals, totalListings, totalReceived, acceptedBookings,
            acceptanceRate: totalReceived > 0 ? Math.round((acceptedBookings / totalReceived) * 100) : 0
        };

        res.json({ success: true, stats, monthlyRevenue: monthlyRevenueData, topListings, bookingTrends });
    } catch (err) { next(err); }
};
