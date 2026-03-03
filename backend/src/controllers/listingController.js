const { Listings, Users } = require('../db/fileDB');

const PAGE_SIZE = 12;

// GET /api/listings
exports.getListings = async (req, res, next) => {
    try {
        const { page = 1, limit = PAGE_SIZE, search, category, city, condition,
            minPrice, maxPrice, sort = '-createdAt', available, ids } = req.query;

        const filter = { isActive: true };
        if (category) filter.category = category;
        if (city) filter['location.city'] = city;
        if (condition) filter.condition = condition;
        if (available !== 'false' && available !== undefined) filter['availability.isAvailable'] = true;
        if (minPrice) filter['pricePerDay.$gte'] = Number(minPrice);
        if (maxPrice) filter['pricePerDay.$lte'] = Number(maxPrice);
        if (search) filter.$text = { $search: search };
        if (ids) {
            const idList = ids.split(',');
            filter._id = { $in: idList };
        }

        const skip = (Number(page) - 1) * Number(limit);
        const all = Listings.find(filter, { sort });
        const total = all.length;
        const listings = all.slice(skip, skip + Number(limit));
        const populated = Listings.populateMany(listings, 'name avatar rating location');

        res.json({
            success: true,
            listings: populated,
            pagination: {
                total,
                page: Number(page),
                pages: Math.ceil(total / Number(limit)),
                limit: Number(limit),
            },
        });
    } catch (err) {
        next(err);
    }
};

// GET /api/listings/featured
exports.getFeaturedListings = async (req, res, next) => {
    try {
        let listings = Listings.find({ isActive: true, isFeatured: true }, { limit: 8 });
        // If fewer than 4 featured, supplement with top-rated
        if (listings.length < 4) {
            const byRating = Listings.find({ isActive: true }, { sort: '-rating.average', limit: 8 });
            listings = [...listings, ...byRating].filter((l, i, arr) =>
                arr.findIndex(x => x._id === l._id) === i
            ).slice(0, 8);
        }
        const populated = Listings.populateMany(listings, 'name avatar rating location');
        res.json({ success: true, listings: populated });
    } catch (err) {
        next(err);
    }
};

// GET /api/listings/:id
exports.getListing = async (req, res, next) => {
    try {
        const { id } = req.params;
        let listing = Listings.findOne({ slug: id }) || Listings.findById(id);
        if (!listing) {
            return res.status(404).json({ success: false, message: 'Listing not found' });
        }
        // Increment views
        Listings.findByIdAndUpdate(listing._id, { $inc: { views: 1 } });
        listing = { ...listing, views: listing.views + 1 };

        const populated = Listings.populate(listing, 'name avatar rating location bio phone');
        res.json({ success: true, listing: populated });
    } catch (err) {
        next(err);
    }
};

// POST /api/listings
exports.createListing = async (req, res, next) => {
    try {
        if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' });

        const listing = Listings.create({ ...req.body, owner: req.user._id });
        res.status(201).json({ success: true, listing });
    } catch (err) {
        next(err);
    }
};

// PUT /api/listings/:id
exports.updateListing = async (req, res, next) => {
    try {
        const { id } = req.params;
        let listing = Listings.findById(id);
        if (!listing) return res.status(404).json({ success: false, message: 'Listing not found' });
        if (listing.owner !== req.user._id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        listing = Listings.findByIdAndUpdate(id, req.body);
        res.json({ success: true, listing });
    } catch (err) {
        next(err);
    }
};

// DELETE /api/listings/:id
exports.deleteListing = async (req, res, next) => {
    try {
        const { id } = req.params;
        const listing = Listings.findById(id);
        if (!listing) return res.status(404).json({ success: false, message: 'Listing not found' });
        if (listing.owner !== req.user._id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        Listings.findByIdAndUpdate(id, { isActive: false });
        res.json({ success: true, message: 'Listing deleted' });
    } catch (err) {
        next(err);
    }
};

// GET /api/listings/my
exports.getMyListings = async (req, res, next) => {
    try {
        const listings = Listings.find({ owner: req.user._id, isActive: true }, { sort: '-createdAt' });
        res.json({ success: true, listings });
    } catch (err) {
        next(err);
    }
};

// GET /api/listings/:id/availability
exports.checkAvailability = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { startDate, endDate } = req.query;
        const listing = Listings.findById(id);
        if (!listing) return res.status(404).json({ success: false, message: 'Listing not found' });

        const { Bookings } = require('../db/fileDB');
        const conflict = Bookings.findOne({
            listing: id,
            status: { $in: ['pending', 'confirmed', 'active'] },
            $or: [{ startDate: { $lt: endDate }, endDate: { $gt: startDate } }],
        });

        res.json({ success: true, available: !conflict, listing });
    } catch (err) {
        next(err);
    }
};
