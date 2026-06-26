const mongoose = require('mongoose');
const Review = require('../models/Review');
const Booking = require('../models/Booking');
const Listing = require('../models/Listing');
const User = require('../models/User');

// POST /api/reviews
exports.createReview = async (req, res, next) => {
    try {
        const { bookingId, type = 'item', rating, comment, photos } = req.body;

        const booking = await Booking.findById(bookingId);
        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
        if (booking.status !== 'completed') return res.status(400).json({ success: false, message: 'Can only review completed bookings' });

        const isRenter = booking.renter.toString() === req.user._id.toString();
        const isOwner = booking.owner.toString() === req.user._id.toString();
        if (!isRenter && !isOwner) return res.status(403).json({ success: false, message: 'Not authorized to review this booking' });
        if (isRenter && type === 'renter') return res.status(400).json({ success: false, message: 'Renters cannot review themselves' });
        if (isOwner && (type === 'item' || type === 'owner')) return res.status(400).json({ success: false, message: 'Owners can only review renters' });

        const existing = await Review.findOne({ booking: bookingId, type, reviewer: req.user._id });
        if (existing) return res.status(400).json({ success: false, message: 'Review already submitted for this type' });

        // 3.12 — Cap photos array to 5, sanitize URLs
        const sanitizedPhotos = Array.isArray(photos)
            ? photos.slice(0, 5).map(p => ({
                url: typeof p?.url === 'string' ? p.url.slice(0, 500) : '',
                alt: typeof p?.alt === 'string' ? p.alt.slice(0, 200) : ''
            })).filter(p => p.url)
            : [];

        const reviewData = {
            booking: bookingId, listing: booking.listing,
            reviewer: req.user._id, type, rating: Number(rating),
            comment, photos: sanitizedPhotos,
        };
        if (type === 'renter') reviewData.reviewee = booking.renter;
        else if (type === 'owner') reviewData.reviewee = booking.owner;

        // 3.2 — Wrap in transaction
        const session = await mongoose.startSession();
        try {
            await session.withTransaction(async () => {
                await Review.create([reviewData], { session });

                if (type === 'item') {
                    const [agg] = await Review.aggregate([
                        { $match: { listing: booking.listing, type: 'item' } },
                        { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }
                    ], { session });
                    if (agg) await Listing.findByIdAndUpdate(booking.listing, {
                        rating: { average: Math.round(agg.avg * 10) / 10, count: agg.count }
                    }, { session });
                }

                if (reviewData.reviewee) {
                    const [uagg] = await Review.aggregate([
                        { $match: { reviewee: reviewData.reviewee } },
                        { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }
                    ], { session });
                    if (uagg) await User.findByIdAndUpdate(reviewData.reviewee, {
                        rating: { average: Math.round(uagg.avg * 10) / 10, count: uagg.count }
                    }, { session });
                }
            });
        } finally {
            session.endSession();
        }

        const populated = await Review.findOne(reviewData)
            .populate('reviewer', 'name avatar').populate('reviewee', 'name avatar');
        res.status(201).json({ success: true, review: populated });
    } catch (err) { next(err); }
};

// GET /api/reviews/listing/:id
exports.getListingReviews = async (req, res, next) => {
    try {
        const { id } = req.params;
        let listingId = id;
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            const listing = await Listing.findOne({ slug: id }).select('_id');
            if (!listing) return res.json({ success: true, reviews: [] });
            listingId = listing._id;
        }
        const reviews = await Review.find({ listing: listingId, type: 'item' })
            .sort('-createdAt')
            .populate('reviewer', 'name avatar')
            .populate('replies.author', 'name avatar')
            .limit(50);
        res.json({ success: true, reviews });
    } catch (err) { next(err); }
};

// PUT /api/reviews/:id/respond — 3.4 prevent infinite overwrite
exports.addOwnerResponse = async (req, res, next) => {
    try {
        const review = await Review.findById(req.params.id).populate('listing');
        if (!review) return res.status(404).json({ success: false, message: 'Review not found' });

        // 3.4 — reuse populated listing instead of re-fetching
        if (!review.listing || review.listing.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Only the listing owner can respond' });
        }
        // 3.4 — prevent infinite overwrite
        if (review.ownerResponse && review.ownerResponse.timestamp) {
            return res.status(400).json({ success: false, message: 'Owner response already submitted' });
        }
        review.ownerResponse = { comment: req.body.comment, timestamp: new Date() };
        await review.save();
        res.json({ success: true, review });
    } catch (err) { next(err); }
};

// GET /api/reviews/user/:id
exports.getUserReviews = async (req, res, next) => {
    try {
        const reviews = await Review.find({ reviewee: req.params.id }).sort('-createdAt').populate('reviewer', 'name avatar').populate('listing', 'title slug images').limit(50);
        res.json({ success: true, reviews });
    } catch (err) { next(err); }
};

// PUT /api/reviews/:id/like  — toggle like on/off for the current user
exports.toggleLike = async (req, res, next) => {
    try {
        const review = await Review.findById(req.params.id);
        if (!review) return res.status(404).json({ success: false, message: 'Review not found' });

        const userId = req.user._id;
        const liked = review.likes.some((u) => u && u.toString() === userId.toString());

        if (liked) {
            // Unlike
            review.likes = review.likes.filter((u) => u && u.toString() !== userId.toString());
        } else {
            // Like
            review.likes.push(userId);
        }
        await review.save();

        res.json({
            success: true,
            liked: !liked,
            likeCount: review.likes.length,
        });
    } catch (err) { next(err); }
};

// POST /api/reviews/:id/replies  — add a reply (owner OR anyone can reply)
// Body: { comment: string }
exports.addReply = async (req, res, next) => {
    try {
        const { comment } = req.body;
        if (!comment || !comment.trim()) {
            return res.status(400).json({ success: false, message: 'Reply text is required' });
        }

        const review = await Review.findById(req.params.id).populate('listing');
        if (!review) return res.status(404).json({ success: false, message: 'Review not found' });

        // If this is the listing owner responding, also stamp the legacy
        // `ownerResponse` field so older UI code keeps working.
        const isOwner = review.listing?.owner
            && review.listing.owner.toString() === req.user._id.toString();

        review.replies.push({
            author: req.user._id,
            comment: comment.trim(),
        });

        if (isOwner && (!review.ownerResponse || !review.ownerResponse.timestamp)) {
            review.ownerResponse = { comment: comment.trim(), timestamp: new Date() };
        }

        await review.save();

        // Re-fetch with populated author so the UI can render immediately
        const updated = await Review.findById(review._id)
            .populate('reviewer', 'name avatar')
            .populate('replies.author', 'name avatar');

        res.json({ success: true, review: updated });
    } catch (err) { next(err); }
};
