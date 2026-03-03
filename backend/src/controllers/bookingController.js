const { Bookings, Listings, Users } = require('../db/fileDB');

const BOOKING_FIELDS = {
    listing: '_id title images category slug location pricePerDay',
    renter: '_id name avatar email phone',
    owner: '_id name avatar email phone',
};

function calcPricing(listing, startDate, endDate) {
    const days = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
    let pricePerDay = listing.pricePerDay;

    // Apply weekly/monthly discount rates
    if (days >= 30 && listing.pricePerMonth) {
        pricePerDay = listing.pricePerMonth / 30;
    } else if (days >= 7 && listing.pricePerWeek) {
        pricePerDay = listing.pricePerWeek / 7;
    }

    const subtotal = Math.round(pricePerDay * days);
    const securityDeposit = listing.securityDeposit || 0;
    const platformFee = Math.round(subtotal * 0.1);
    const totalAmount = subtotal + securityDeposit + platformFee;

    return { pricePerDay, subtotal, securityDeposit, platformFee, totalAmount };
}

// POST /api/bookings
exports.createBooking = async (req, res, next) => {
    try {
        const { listingId, startDate, endDate, deliveryMethod, notes } = req.body;

        const listing = Listings.findById(listingId);
        if (!listing) return res.status(404).json({ success: false, message: 'Listing not found' });
        if (!listing.isActive || !listing.availability?.isAvailable) {
            return res.status(400).json({ success: false, message: 'Listing is not available' });
        }
        if (listing.owner === req.user._id) {
            return res.status(400).json({ success: false, message: 'Cannot book your own listing' });
        }

        // Check for date conflicts
        const conflict = Bookings.findOne({
            listing: listingId,
            status: { $in: ['pending', 'confirmed', 'active'] },
            $or: [{ startDate: { $lt: endDate }, endDate: { $gt: startDate } }],
        });
        if (conflict) {
            return res.status(409).json({ success: false, message: 'Listing is not available for selected dates' });
        }

        const pricing = calcPricing(listing, startDate, endDate);
        const booking = Bookings.create({
            listing: listingId,
            renter: req.user._id,
            owner: listing.owner,
            startDate,
            endDate,
            pricing,
            deliveryMethod: deliveryMethod || 'pickup',
            notes: { renter: notes || '' },
            timeline: [{ status: 'pending', timestamp: new Date().toISOString(), note: 'Booking request sent.' }],
        });

        const populated = Bookings.populate(booking, BOOKING_FIELDS);
        res.status(201).json({ success: true, booking: populated });
    } catch (err) {
        next(err);
    }
};

// GET /api/bookings/my — renter's bookings
exports.getMyBookings = async (req, res, next) => {
    try {
        const { status } = req.query;
        const filter = { renter: req.user._id };
        if (status) filter.status = status;

        const bookings = Bookings.find(filter, { sort: '-createdAt' });
        const populated = Bookings.populateMany(bookings, BOOKING_FIELDS);
        res.json({ success: true, bookings: populated });
    } catch (err) {
        next(err);
    }
};

// GET /api/bookings/received — owner's incoming bookings
exports.getReceivedBookings = async (req, res, next) => {
    try {
        const { status } = req.query;
        const filter = { owner: req.user._id };
        if (status) filter.status = status;

        const bookings = Bookings.find(filter, { sort: '-createdAt' });
        const populated = Bookings.populateMany(bookings, BOOKING_FIELDS);
        res.json({ success: true, bookings: populated });
    } catch (err) {
        next(err);
    }
};

// PUT /api/bookings/:id/status
exports.updateBookingStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, note } = req.body;

        const booking = Bookings.findById(id);
        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

        const isOwner = booking.owner === req.user._id;
        const isRenter = booking.renter === req.user._id;
        if (!isOwner && !isRenter) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        // Validate state transitions
        const OWNER_TRANSITIONS = {
            pending: ['confirmed', 'rejected'],
            confirmed: ['active', 'cancelled'],
            active: ['completed'],
        };
        const RENTER_TRANSITIONS = {
            pending: ['cancelled'],
            confirmed: ['cancelled'],
        };

        const allowed = isOwner ? OWNER_TRANSITIONS[booking.status] : RENTER_TRANSITIONS[booking.status];
        if (!allowed || !allowed.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Cannot change status from ${booking.status} to ${status}`,
            });
        }

        const timeline = [
            ...(booking.timeline || []),
            { status, timestamp: new Date().toISOString(), note: note || `Status changed to ${status}` },
        ];

        const updated = {
            ...booking,
            status,
            timeline,
        };

        if (status === 'completed') {
            // Increment totalRentals on the listing
            Listings.findByIdAndUpdate(booking.listing, { $inc: { totalRentals: 1 } });
        }

        Bookings.save(updated);
        const populated = Bookings.populate(updated, BOOKING_FIELDS);
        res.json({ success: true, booking: populated });
    } catch (err) {
        next(err);
    }
};

// POST /api/bookings/:id/review
exports.addReview = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { rating, comment } = req.body;

        const booking = Bookings.findById(id);
        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
        if (booking.renter !== req.user._id) {
            return res.status(403).json({ success: false, message: 'Only the renter can leave a review' });
        }
        if (booking.status !== 'completed') {
            return res.status(400).json({ success: false, message: 'Can only review completed bookings' });
        }
        if (booking.review) {
            return res.status(400).json({ success: false, message: 'Review already submitted' });
        }

        const review = { rating: Number(rating), comment, createdAt: new Date().toISOString() };
        const updated = { ...booking, review };
        Bookings.save(updated);

        // Update listing aggregate rating
        const listing = Listings.findById(booking.listing);
        if (listing) {
            const allBookingsForListing = Bookings.find({ listing: booking.listing }).filter(b => b.review);
            const avgRating = allBookingsForListing.reduce((s, b) => s + b.review.rating, 0) / allBookingsForListing.length;
            Listings.findByIdAndUpdate(booking.listing, {
                rating: { average: Math.round(avgRating * 10) / 10, count: allBookingsForListing.length },
            });
        }

        res.json({ success: true, review });
    } catch (err) {
        next(err);
    }
};
