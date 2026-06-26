const Booking = require('../models/Booking');
const Listing = require('../models/Listing');
const Review = require('../models/Review');
const { sendNotification } = require('../utils/notifications');
const User = require('../models/User');

const BOOKING_POPULATE = [
    { path: 'listing', select: '_id title images category slug location pricePerDay' },
    { path: 'renter', select: '_id name avatar email phone' },
    { path: 'owner', select: '_id name avatar email phone' }
];

function calcPricing(listing, startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) || 1;
    let pricePerDay = listing.pricePerDay;

    // Apply weekly/monthly discount rates
    if (days >= 30 && listing.pricePerMonth) {
        pricePerDay = listing.pricePerMonth / 30;
    } else if (days >= 7 && listing.pricePerWeek) {
        pricePerDay = listing.pricePerWeek / 7;
    }

    const subtotal = Math.round(pricePerDay * days);
    const securityDeposit = listing.securityDeposit || 0;
    const { PLATFORM_FEE_RATE } = require('../config/constants');
    const platformFee = Math.round(subtotal * PLATFORM_FEE_RATE);
    const totalAmount = subtotal + securityDeposit + platformFee;

    return {
        pricePerDay,
        subtotal,
        securityDeposit,
        platformFee,
        totalAmount
    };
}

// POST /api/bookings
// POST /api/bookings
exports.createBooking = async (req, res, next) => {
    try {
        const { listingId, startDate, endDate, deliveryMethod, notes, couponCode } = req.body;

        const listing = await Listing.findById(listingId);
        if (!listing) return res.status(404).json({ success: false, message: 'Listing not found' });
        if (!listing.isActive || !listing.availability?.isAvailable) {
            return res.status(400).json({ success: false, message: 'Listing is not available' });
        }
        if (listing.owner.toString() === req.user._id.toString()) {
            return res.status(400).json({ success: false, message: 'Cannot book your own listing' });
        }

        const pricing = calcPricing(listing, startDate, endDate);

        // 1. Atomic conflict check (Bina session ke)
        const conflict = await Booking.findOne({
            listing: listingId,
            status: { $in: ['pending', 'approved', 'active', 'confirmed'] },
            startDate: { $lt: new Date(endDate) },
            endDate: { $gt: new Date(startDate) }
        }).lean();
        
        if (conflict) {
            return res.status(409).json({ success: false, message: 'Listing is not available for selected dates' });
        }

        // 2. Coupon redemption (Bina session ke)
        let discount = 0, appliedCoupon = null;
        if (couponCode) {
            const Coupon = require('../models/Coupon');
            const c = await Coupon.findOneAndUpdate(
                { code: couponCode.toUpperCase(), isActive: true,
                  validFrom: { $lte: new Date() }, validUntil: { $gte: new Date() },
                  usedBy: { $ne: req.user._id },
                  $expr: { $or: [{ $eq: ["$maxUses", null] }, { $lt: ["$usedCount", "$maxUses"] }] }
                },
                { $inc: { usedCount: 1 }, $push: { usedBy: req.user._id } },
                { new: true }
            );
            if (c) {
                discount = c.discountType === 'percentage'
                    ? Math.round(pricing.subtotal * c.discountValue / 100)
                    : c.discountValue;
                if (c.maxDiscountAmount) discount = Math.min(discount, c.maxDiscountAmount);
                appliedCoupon = { code: c.code, discount };
            }
        }

        // 3. Referral credits (Bina session ke)
        let referralDiscount = 0;
        const User = require('../models/User');
        const user = await User.findById(req.user._id).select('referralCredits');
        if (user && user.referralCredits > 0) {
            referralDiscount = Math.min(user.referralCredits, pricing.subtotal - discount);
            await User.findByIdAndUpdate(req.user._id, { $inc: { referralCredits: -referralDiscount } });
        }

        const totalDiscount = discount + referralDiscount;
        
        // 4. Create Booking directly (Bina session ke)
        const booking = await Booking.create({
            listing: listingId, 
            renter: req.user._id, 
            owner: listing.owner,
            startDate, 
            endDate,
            pricing: { ...pricing, discount: totalDiscount, totalAmount: pricing.totalAmount - totalDiscount },
            coupon: appliedCoupon ? appliedCoupon.code : undefined,
            deliveryMethod: deliveryMethod || 'pickup',
            notes: { renter: notes || '' },
            timeline: [{ status: 'pending', timestamp: new Date(), note: 'Booking request sent.' }],
        });

        // 5. Notifications call after successful creation
        await sendNotification({
            recipient: listing.owner, sender: req.user._id,
            type: 'booking_request', title: 'New Booking Request',
            content: `${req.user.name} wants to rent your ${listing.title}`, link: '/bookings'
        });

        const populated = await Booking.findById(booking._id).populate(BOOKING_POPULATE);
        res.status(201).json({ success: true, booking: populated });

    } catch (err) {
         
        next(err); 
    }
};

// GET /api/bookings/my — renter's bookings
exports.getMyBookings = async (req, res, next) => {
    try {
        const { status } = req.query;
        const query = { renter: req.user._id };
        if (status) query.status = status;

        const bookings = await Booking.find(query)
            .sort('-createdAt')
            .populate(BOOKING_POPULATE)
            .lean();

        // Check for rich reviews on completed bookings (item + owner)
        const completedIds = bookings.filter(b => b.status === 'completed').map(b => b._id);
        const existingReviews = completedIds.length > 0
            ? await Review.find({ booking: { $in: completedIds }, reviewer: req.user._id }).select('booking type')
            : [];
        // A booking is fully reviewed when BOTH item and owner reviews exist (for renters)
        const reviewTypesByBooking = {};
        existingReviews.forEach(r => {
            const bid = r.booking.toString();
            if (!reviewTypesByBooking[bid]) reviewTypesByBooking[bid] = new Set();
            reviewTypesByBooking[bid].add(r.type);
        });

        const withReviewFlag = bookings.map(b => ({
            ...b,
            hasReview: (reviewTypesByBooking[b._id.toString()]?.has('item') && reviewTypesByBooking[b._id.toString()]?.has('owner')) || !!b.review?.rating
        }));

        res.json({ success: true, bookings: withReviewFlag });
    } catch (err) {
        next(err);
    }
};

// GET /api/bookings/received — owner's incoming bookings
exports.getReceivedBookings = async (req, res, next) => {
    try {
        const { status } = req.query;
        const query = { owner: req.user._id };
        if (status) query.status = status;

        const bookings = await Booking.find(query)
            .sort('-createdAt')
            .populate(BOOKING_POPULATE)
            .lean();

        // Check for rich reviews on completed bookings (owner reviews renters)
        const completedIds = bookings.filter(b => b.status === 'completed').map(b => b._id);
        const existingReviews = completedIds.length > 0
            ? await Review.find({ booking: { $in: completedIds }, reviewer: req.user._id }).select('booking type')
            : [];
        const reviewedBookingIds = new Set(existingReviews.map(r => r.booking.toString()));

        const withReviewFlag = bookings.map(b => ({
            ...b,
            hasReview: reviewedBookingIds.has(b._id.toString()) || !!b.review?.rating
        }))

        res.json({ success: true, bookings: withReviewFlag });
    } catch (err) {
        next(err);
    }
};

// PUT /api/bookings/:id/status
exports.updateBookingStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, note } = req.body;

        const booking = await Booking.findById(id);
        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

        const isOwner = booking.owner.toString() === req.user._id.toString();
        const isRenter = booking.renter.toString() === req.user._id.toString();

        if (!isOwner && !isRenter) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        // Validate state transitions
        const OWNER_TRANSITIONS = {
            pending: ['confirmed', 'approved', 'declined', 'rejected', 'cancelled'],
            confirmed: ['active', 'cancelled'],
            approved: ['active', 'cancelled'],
            active: ['completed'],
        };
        const RENTER_TRANSITIONS = {
            pending: ['cancelled'],
            confirmed: ['cancelled'],
            approved: ['cancelled'],
        };

        const allowed = isOwner ? OWNER_TRANSITIONS[booking.status] : RENTER_TRANSITIONS[booking.status];
        if (!allowed || !allowed.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Cannot change status from ${booking.status} to ${status}`,
            });
        }

        booking.status = status;
        booking.timeline.push({
            status,
            timestamp: new Date(),
            note: note || `Status changed to ${status}`
        });

        if (status === 'completed') {
            // Increment totalRentals on the listing
            await Listing.findByIdAndUpdate(booking.listing, { $inc: { totalRentals: 1 } });
        }

        await booking.save();

        // Send notification to the other party
        const listing = await Listing.findById(booking.listing).select('title');
        const listingTitle = listing?.title || 'your listing';

        const statusMessages = {
            confirmed: { title: 'Booking Confirmed! ✅', content: `Your booking for "${listingTitle}" has been confirmed by the owner.` },
            approved: { title: 'Booking Approved! ✅', content: `Your booking for "${listingTitle}" has been approved by the owner.` },
            declined: { title: 'Booking Declined ❌', content: `Your booking for "${listingTitle}" was declined by the owner.` },
            rejected: { title: 'Booking Rejected ❌', content: `Your booking for "${listingTitle}" was rejected by the owner.` },
            cancelled: { title: 'Booking Cancelled', content: `A booking for "${listingTitle}" has been cancelled.` },
            active: { title: 'Rental Started! 🚀', content: `Your rental for "${listingTitle}" is now active.` },
            completed: { title: 'Rental Completed 🎉', content: `Your rental for "${listingTitle}" has been marked as completed.` },
        };

        const msg = statusMessages[status] || { title: 'Booking Updated', content: `Your booking for "${listingTitle}" was updated to ${status}.` };

        if (isOwner) {
            // Owner made the change => notify the renter
            await sendNotification({
                recipient: booking.renter,
                sender: req.user._id,
                type: 'booking_status',
                title: msg.title,
                content: msg.content,
                link: '/bookings'
            });
        } else {
            // Renter made the change (e.g. cancelled) => notify the owner
            await sendNotification({
                recipient: booking.owner,
                sender: req.user._id,
                type: 'booking_status',
                title: msg.title,
                content: `${req.user.name} cancelled a booking for "${listingTitle}".`,
                link: '/bookings'
            });
        }

        const populated = await Booking.findById(booking._id).populate(BOOKING_POPULATE);
        res.json({ success: true, booking: populated });
    } catch (err) {
        next(err);
    }
};

// POST /api/bookings/:id/review (DEPRECATED — use /api/reviews instead)
exports.addReview = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { rating, comment } = req.body;

        const booking = await Booking.findById(id);
        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

        if (booking.renter.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Only the renter can leave a review' });
        }

        if (booking.status !== 'completed') {
            return res.status(400).json({ success: false, message: 'Can only review completed bookings' });
        }

        if (booking.review && booking.review.rating) {
            return res.status(400).json({ success: false, message: 'Review already submitted' });
        }

        // Save embedded review for backward compatibility
        booking.review = {
            rating: Number(rating),
            comment,
            timestamp: new Date()
        };
        await booking.save();

        // Also create in the Review model for the unified system
        try {
            const existingReview = await Review.findOne({ booking: id, type: 'item', reviewer: req.user._id });
            if (!existingReview) {
                await Review.create({
                    booking: id,
                    listing: booking.listing,
                    reviewer: req.user._id,
                    type: 'item',
                    rating: Number(rating),
                    comment,
                });
            }
        } catch (reviewErr) {
            console.error('Error creating Review model entry:', reviewErr);
        }

        // 4.3 — Use MongoDB aggregation instead of in-memory (4.3)
        const [agg] = await Review.aggregate([
            { $match: { listing: booking.listing, type: 'item' } },
            { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }
        ]);
        await Listing.findByIdAndUpdate(booking.listing, {
            rating: { average: agg ? Math.round(agg.avg * 10) / 10 : 0, count: agg ? agg.count : 0 }
        });

        res.json({ success: true, review: booking.review });
    } catch (err) {
        next(err);
    }
};

// GET /api/bookings/listing/:listingId
exports.getListingReviews = async (req, res, next) => {
    try {
        const { listingId } = req.params;
        let finalId = listingId;

        if (!listingId.match(/^[0-9a-fA-F]{24}$/)) {
            const listing = await Listing.findOne({ slug: listingId }).select('_id');
            if (!listing) return res.json({ success: true, reviews: [] });
            finalId = listing._id;
        }

        // Use the unified Review model
        const reviews = await Review.find({ listing: finalId, type: 'item' })
            .sort('-createdAt')
            .populate('reviewer', 'name avatar')
            .limit(50)
            .lean();

        res.json({ success: true, reviews });
    } catch (err) {
        next(err);
    }
};

// GET /api/bookings/listing/:listingId/dates
exports.getListingBookedDates = async (req, res, next) => {
    try {
        const { listingId } = req.params;
        let finalId = listingId;

        if (!listingId.match(/^[0-9a-fA-F]{24}$/)) {
            const listing = await Listing.findOne({ slug: listingId }).select('_id');
            if (!listing) return res.json({ success: true, dates: [] });
            finalId = listing._id;
        }

        const bookings = await Booking.find({
            listing: finalId,
            status: { $in: ['pending', 'confirmed', 'approved', 'active'] },
            endDate: { $gte: new Date() }
        }).select('startDate endDate').lean();

        res.json({ success: true, dates: bookings });
    } catch (err) {
        next(err);
    }
};
