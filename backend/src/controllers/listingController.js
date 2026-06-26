const Listing = require('../models/Listing');
const Booking = require('../models/Booking');
const { isCloudinaryConfigured } = require('../utils/cloudinary');
const axios = require('axios');

const PAGE_SIZE = 12;
const MAX_PAGE_LIMIT = 50; // Hard ceiling to prevent unbounded queries

// GET /api/listings
exports.getListings = async (req, res, next) => {
    try {
        const { page = 1, limit = PAGE_SIZE, search, category, city, condition,
            minPrice, maxPrice, sort = '-createdAt', available, ids, startDate, endDate, lat, lon, radius = 50 } = req.query;

        const query = { isActive: true };
        if (category) query.category = category;
        if (city) query['location.city'] = { $regex: city, $options: 'i' };
        if (condition) query.condition = condition;
        if (available !== 'false' && available !== undefined) query['availability.isAvailable'] = true;

        if (minPrice || maxPrice) {
            query.pricePerDay = {};
            if (minPrice) query.pricePerDay.$gte = Number(minPrice);
            if (maxPrice) query.pricePerDay.$lte = Number(maxPrice);
        }

        // Use $text index for full-text search when no other $or is present
        // Falls back to regex if the search contains special chars not suited for $text
        if (search) {
            const isSimpleText = /^[a-zA-Z0-9\s\u0900-\u097F]+$/.test(search);
            if (isSimpleText && !category && !city) {
                // Use the weighted text index for faster search
                query.$text = { $search: search };
            } else {
                // Fallback to regex for complex/mixed queries (city+search, etc.)
                query.$or = [
                    { title: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } },
                    { tags: { $regex: search, $options: 'i' } }
                ];
            }
        }

        if (ids) {
            query._id = { $in: ids.split(',') };
        }

        // Filter by location proximity (if lat/lon provided)
        if (lat && lon) {
            const radiusInMeters = Number(radius) * 1000; // Convert km to meters
            query['location.coordinates'] = {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [Number(lon), Number(lat)]
                    },
                    $maxDistance: radiusInMeters
                }
            };
        }

        // Filter by date range availability
        if (startDate && endDate) {
            const conflictingBookings = await Booking.find({
                status: { $in: ['pending', 'approved', 'active', 'confirmed'] },
                $or: [
                    { startDate: { $lt: new Date(endDate) }, endDate: { $gt: new Date(startDate) } }
                ]
            }).select('listing');

            const conflictingListingIds = conflictingBookings.map(b => b.listing);
            query._id = { ...query._id, $nin: conflictingListingIds };
        }

        const skip = (Number(page) - 1) * Number(limit);

        // Enforce strict pagination — clamp limit to MAX_PAGE_LIMIT
        const safeLimit = Math.min(Number(limit), MAX_PAGE_LIMIT);
        const safePage = Math.max(1, Number(page));
        const safeSkip = (safePage - 1) * safeLimit;

        const listings = await Listing.find(query)
            .sort(sort)
            .skip(safeSkip)
            .limit(safeLimit)
            .populate('owner', 'name avatar rating location')
            .lean();

        const total = await Listing.countDocuments(query);

        res.json({
            success: true,
            listings,
            pagination: {
                total,
                page: safePage,
                totalPages: Math.ceil(total / safeLimit),
                hasPrev: safePage > 1,
                hasNext: safePage < Math.ceil(total / safeLimit),
                limit: safeLimit,
            },
        });
    } catch (err) {
        next(err);
    }
};

// GET /api/listings/featured
exports.getFeaturedListings = async (req, res, next) => {
    try {
        let listings = await Listing.find({ isActive: true, isFeatured: true })
            .limit(8)
            .populate('owner', 'name avatar rating location')
            .lean();

        if (listings.length < 4) {
            const extra = await Listing.find({ isActive: true })
                .sort('-rating.average')
                .limit(8)
                .populate('owner', 'name avatar rating location')
                .lean();

            listings = [...listings, ...extra].filter((l, i, arr) =>
                arr.findIndex(x => x._id.toString() === l._id.toString()) === i
            ).slice(0, 8);
        }

        res.json({ success: true, listings });
    } catch (err) {
        next(err);
    }
};

// GET /api/listings/:id
// NOTE: This endpoint no longer auto-increments `views`. View counting is
// done by a dedicated POST /api/listings/:id/view endpoint which dedupes
// by user id (for logged-in users) or a fingerprint (for guests) so that
// refreshing the page does NOT inflate the view count.
exports.getListing = async (req, res, next) => {
    try {
        const { id } = req.params;
        const query = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { slug: id };

        const listing = await Listing.findOne(query)
            .populate('owner', 'name avatar rating location bio phone')
            .lean();

        if (!listing) {
            return res.status(404).json({ success: false, message: 'Listing not found' });
        }

        res.json({ success: true, listing });
    } catch (err) {
        next(err);
    }
};

// POST /api/listings/:id/view  — record a view (deduplicated per session/user)
exports.recordView = async (req, res, next) => {
    try {
        const { id } = req.params;
        const query = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { slug: id };
        const listing = await Listing.findOne(query).select('_id viewedBy views');
        if (!listing) {
            return res.status(404).json({ success: false, message: 'Listing not found' });
        }

        // ── Build a viewer identifier ──
        // Logged-in users → their user id (so refresh on same account = 1 view)
        // Guests          → hash of IP + User-Agent (so refresh on same browser = 1 view)
        const crypto = require('crypto');
        let viewerId, viewerKind;
        if (req.user?._id) {
            viewerId = String(req.user._id);
            viewerKind = 'user';
        } else {
            const ip = (req.headers['x-forwarded-for'] || '').split(',')[0]?.trim()
                || req.socket?.remoteAddress || 'unknown';
            const ua = req.headers['user-agent'] || 'unknown';
            viewerId = crypto.createHash('sha256').update(`${ip}|${ua}`).digest('hex').slice(0, 24);
            viewerKind = 'anon';
        }

        // 24-hour dedup window — same viewer within 24h = no increment
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const alreadyViewed = listing.viewedBy.some(
            (v) => v.id === viewerId && v.at && v.at > since
        );

        if (alreadyViewed) {
            // Return current count without bumping
            return res.json({ success: true, views: listing.views, counted: false });
        }

        // ── Atomic increment + push ──
        // We use a conditional update (`$ne`) on `viewedBy.id` to ensure that
        // even if two concurrent requests from the same viewer both passed
        // the check above, only one of them will actually increment the count.
        // The `$slice: -200` keeps the array capped at the most recent 200
        // viewers so the doc doesn't grow unbounded over time.
        const result = await Listing.updateOne(
            {
                _id: listing._id,
                // Only update if this viewer is NOT already in the array
                'viewedBy.id': { $ne: viewerId },
            },
            {
                $inc: { views: 1 },
                $push: {
                    viewedBy: {
                        $each: [{ id: viewerId, kind: viewerKind, at: new Date() }],
                        $slice: -200,
                    },
                },
            }
        );

        // If modifiedCount === 0, another concurrent request already added
        // the viewer between our check and our update — treat as not counted.
        const counted = result.modifiedCount > 0;
        const newViews = counted ? listing.views + 1 : listing.views;

        res.json({ success: true, views: newViews, counted });
    } catch (err) {
        next(err);
    }
};

async function checkSavedSearches(listing) {
    try {
        const SavedSearch = require('../models/SavedSearch');
        const { sendNotification } = require('../utils/notifications');

        const matches = await SavedSearch.find({
            alertEnabled: true,
            $or: [
                { 'filters.category': listing.category },
                { 'filters.category': { $exists: false } },
                { 'filters.category': null }
            ],
            $or: [
                { 'filters.city': { $regex: listing.location.city, $options: 'i' } },
                { 'filters.city': { $exists: false } },
                { 'filters.city': null }
            ]
        }).populate('user');

        for (const search of matches) {
            // Further filter by price if set
            const f = search.filters;
            if (f.minPrice && listing.pricePerDay < f.minPrice) continue;
            if (f.maxPrice && listing.pricePerDay > f.maxPrice) continue;
            if (f.search && !listing.title.toLowerCase().includes(f.search.toLowerCase())) continue;

            await sendNotification({
                recipient: search.user._id,
                type: 'system',
                title: 'New Match for Your Saved Search! ✨',
                content: `A new ${listing.title} was listed in ${listing.location.city} that matches your search "${search.name}".`,
                link: `/listings/${listing.slug}`
            });
        }
    } catch (err) {
        console.error('Error checking saved searches:', err);
    }
}

// POST /api/listings
exports.createListing = async (req, res, next) => {
    try {
        const listingData = { ...req.body, owner: req.user._id };

        // Handle image uploads if present
        if (req.files && req.files.length > 0) {
            listingData.images = req.files.map(file => ({
                url: isCloudinaryConfigured ? file.path : `/uploads/listings/${file.filename}`,
                alt: req.body.title || 'listing image'
            }));
        }

        // Geocode location to get coordinates
        if (listingData.location && listingData.location.city) {
            try {
                const apiKey = process.env.GOOGLE_MAPS_API_KEY;
                let lat, lon;

                if (apiKey) {
                    // Use Google Maps Geocoding API
                    const geoResponse = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
                        params: {
                            address: `${listingData.location.city}, ${listingData.location.state || ''}, India`,
                            key: apiKey,
                            components: 'country:IN'
                        }
                    });

                    if (geoResponse.data.results && geoResponse.data.results.length > 0) {
                        const location = geoResponse.data.results[0].geometry.location;
                        lat = location.lat;
                        lon = location.lng;
                    }
                } else {
                    // Fallback to OpenStreetMap
                    console.warn('Google Maps API key not found, falling back to OpenStreetMap for geocoding');
                    const geoResponse = await axios.get('https://nominatim.openstreetmap.org/search', {
                        params: {
                            q: `${listingData.location.city}, ${listingData.location.state || ''}, India`,
                            format: 'json',
                            limit: 1
                        },
                        headers: {
                            'User-Agent': 'RentoQuick'
                        }
                    });

                    if (geoResponse.data && geoResponse.data.length > 0) {
                        lat = parseFloat(geoResponse.data[0].lat);
                        lon = parseFloat(geoResponse.data[0].lon);
                    }
                }

                if (lat && lon) {
                    listingData.location.coordinates = [lon, lat];
                }
            } catch (geoErr) {
                console.error('Geocoding error:', geoErr);
                // Continue without coordinates if geocoding fails
            }
        }

        const listing = await Listing.create(listingData);

        // Check for saved search matches
        checkSavedSearches(listing);

        res.status(201).json({ success: true, listing });
    } catch (err) {
    console.error(err);

    return res.status(500).json({
        success: false,
        message: err.message
    });
}
};

// POST /api/listings/upload
exports.uploadListingImages = async (req, res, next) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: 'No files uploaded' });
        }

        const images = req.files.map(file => ({
            url: isCloudinaryConfigured ? file.path : `/uploads/listings/${file.filename}`,
            alt: 'uploaded image'
        }));

        res.json({ success: true, images });
    } catch (err) {
        next(err);
    }
};

// PUT /api/listings/:id
exports.updateListing = async (req, res, next) => {
    try {
        let listing = await Listing.findById(req.params.id);
        if (!listing) return res.status(404).json({ success: false, message: 'Listing not found' });

        if (listing.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const allowedFields = ['title', 'description', 'category', 'condition', 'pricePerDay', 'pricePerWeek', 'pricePerMonth', 'securityDeposit', 'images', 'features', 'tags', 'availability', 'location'];
        const updates = {};
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        }

        listing = await Listing.findByIdAndUpdate(req.params.id, updates, {
            new: true,
            runValidators: true,
        });

        res.json({ success: true, listing });
    } catch (err) {
        next(err);
    }
};

// DELETE /api/listings/:id
exports.deleteListing = async (req, res, next) => {
    try {
        const listing = await Listing.findById(req.params.id);
        if (!listing) return res.status(404).json({ success: false, message: 'Listing not found' });

        if (listing.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        listing.isActive = false;
        await listing.save();

        res.json({ success: true, message: 'Listing deleted' });
    } catch (err) {
        next(err);
    }
};

// GET /api/listings/my
exports.getMyListings = async (req, res, next) => {
    try {
        const listings = await Listing.find({ owner: req.user._id, isActive: true })
            .sort('-createdAt')
            .lean();
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
        const listing = await Listing.findById(id);
        if (!listing) return res.status(404).json({ success: false, message: 'Listing not found' });

        const conflict = await Booking.findOne({
            listing: id,
            status: { $in: ['pending', 'approved', 'active'] },
            $or: [
                { startDate: { $lt: new Date(endDate) }, endDate: { $gt: new Date(startDate) } }
            ],
        });

        res.json({ success: true, available: !conflict, listing });
    } catch (err) {
        next(err);
    }
};

// GET /api/listings/locations/search
exports.searchLocations = async (req, res, next) => {
    try {
        const { query } = req.query;
        if (!query || query.length < 2) {
            return res.json({ success: true, suggestions: [] });
        }

        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            console.warn('Google Maps API key not found, falling back to OpenStreetMap');
            // Fallback to OpenStreetMap if no API key
            const response = await axios.get('https://nominatim.openstreetmap.org/search', {
                params: {
                    q: `${query}, India`,
                    format: 'json',
                    addressdetails: 1,
                    limit: 5,
                    countrycodes: 'in'
                },
                headers: {
                    'User-Agent': 'RentoQuick'
                }
            });

            const suggestions = response.data.map(item => ({
                display_name: item.display_name,
                city: item.address.city || item.address.town || item.address.village || item.address.district || '',
                state: item.address.state || '',
                lat: parseFloat(item.lat),
                lon: parseFloat(item.lon)
            })).filter(loc => loc.city || loc.state);

            return res.json({ success: true, suggestions });
        }

        // Use Google Maps Geocoding API
        const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
            params: {
                address: `${query}, India`,
                key: apiKey,
                components: 'country:IN'
            }
        });

        const suggestions = response.data.results.map(item => ({
            display_name: item.formatted_address,
            city: item.address_components.find(c => c.types.includes('locality'))?.long_name ||
                  item.address_components.find(c => c.types.includes('administrative_area_level_2'))?.long_name ||
                  item.address_components.find(c => c.types.includes('administrative_area_level_1'))?.long_name || '',
            state: item.address_components.find(c => c.types.includes('administrative_area_level_1'))?.long_name || '',
            lat: item.geometry.location.lat,
            lon: item.geometry.location.lng
        })).filter(loc => loc.city || loc.state).slice(0, 5);

        res.json({ success: true, suggestions });
    } catch (err) {
        console.error('Location search error:', err);
        res.json({ success: true, suggestions: [] });
    }
};

// GET /api/listings/locations/reverse-geocode
exports.reverseGeocode = async (req, res, next) => {
    try {
        const { lat, lon } = req.query;
        if (!lat || !lon) {
            return res.status(400).json({ success: false, message: 'Latitude and longitude required' });
        }

        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            console.warn('Google Maps API key not found, falling back to OpenStreetMap');
            // Fallback to OpenStreetMap if no API key
            const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
                params: {
                    lat,
                    lon,
                    format: 'json',
                    addressdetails: 1,
                    zoom: 18
                },
                headers: {
                    'User-Agent': 'RentoQuick'
                }
            });

            const address = response.data.address;
            const location = {
                display_name: response.data.display_name,
                city: address.city || address.town || address.village || address.district || '',
                state: address.state || '',
                area: address.suburb || address.neighbourhood || address.hamlet || address.district || '',
                street: address.road || address.street || '',
                pincode: address.postcode || '',
                lat: parseFloat(lat),
                lon: parseFloat(lon)
            };

            return res.json({ success: true, location });
        }

        // Use Google Maps Geocoding API
        const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
            params: {
                latlng: `${lat},${lon}`,
                key: apiKey
            }
        });

        if (!response.data.results || response.data.results.length === 0) {
            return res.status(404).json({ success: false, message: 'Location not found' });
        }

        const result = response.data.results[0];
        const components = result.address_components;

        const location = {
            display_name: result.formatted_address,
            city: components.find(c => c.types.includes('locality'))?.long_name ||
                  components.find(c => c.types.includes('administrative_area_level_2'))?.long_name ||
                  components.find(c => c.types.includes('administrative_area_level_1'))?.long_name || '',
            state: components.find(c => c.types.includes('administrative_area_level_1'))?.long_name || '',
            area: components.find(c => c.types.includes('sublocality'))?.long_name ||
                  components.find(c => c.types.includes('neighborhood'))?.long_name ||
                  components.find(c => c.types.includes('sublocality_level_1'))?.long_name || '',
            street: components.find(c => c.types.includes('route'))?.long_name || '',
            pincode: components.find(c => c.types.includes('postal_code'))?.long_name || '',
            lat: parseFloat(lat),
            lon: parseFloat(lon)
        };

        res.json({ success: true, location });
    } catch (err) {
        console.error('Reverse geocoding error:', err);
        res.status(500).json({ success: false, message: 'Failed to get location' });
    }
};

