const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DB_DIR = path.join(__dirname, '../../db');
const DB_FILE = path.join(DB_DIR, 'data.json');

// Ensure db directory and file exist
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const DEFAULT_DATA = { users: [], listings: [], bookings: [] };

function readDB() {
    try {
        if (!fs.existsSync(DB_FILE)) {
            fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DATA, null, 2));
            return { ...DEFAULT_DATA };
        }
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    } catch {
        return { ...DEFAULT_DATA };
    }
}

function writeDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// ── Generic collection helpers ─────────────────────────────────────────────

function getCollection(name) {
    return readDB()[name] || [];
}

function saveCollection(name, items) {
    const db = readDB();
    db[name] = items;
    writeDB(db);
}

function generateId() {
    return uuidv4();
}

function now() {
    return new Date().toISOString();
}

// ── Users ──────────────────────────────────────────────────────────────────

const Users = {
    findById: (id) => getCollection('users').find(u => u._id === id) || null,

    findOne: (query) => {
        const users = getCollection('users');
        return users.find(u => {
            return Object.entries(query).every(([k, v]) => u[k] === v);
        }) || null;
    },

    find: (query = {}) => {
        const users = getCollection('users');
        return users.filter(u =>
            Object.entries(query).every(([k, v]) => u[k] === v)
        );
    },

    create: (data) => {
        const users = getCollection('users');
        const user = {
            _id: generateId(),
            name: data.name || '',
            email: data.email?.toLowerCase() || '',
            password: data.password || '',
            avatar: data.avatar || '',
            bio: data.bio || '',
            phone: data.phone || '',
            location: data.location || { city: '', state: '', country: 'India' },
            role: data.role || 'user',
            isVerified: false,
            rating: { average: 0, count: 0 },
            wishlist: [],
            createdAt: now(),
            updatedAt: now(),
        };
        users.push(user);
        saveCollection('users', users);
        return user;
    },

    findByIdAndUpdate: (id, updates) => {
        const users = getCollection('users');
        const idx = users.findIndex(u => u._id === id);
        if (idx === -1) return null;
        users[idx] = { ...users[idx], ...updates, updatedAt: now() };
        saveCollection('users', users);
        return users[idx];
    },

    save: (user) => {
        const users = getCollection('users');
        const idx = users.findIndex(u => u._id === user._id);
        if (idx !== -1) {
            users[idx] = { ...user, updatedAt: now() };
            saveCollection('users', users);
        }
        return user;
    },
};

// ── Listings ───────────────────────────────────────────────────────────────

function slugify(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        + '-' + Date.now().toString(36);
}

function matchesListingFilter(listing, filter) {
    if (!listing.isActive) return false;
    if (filter.category && listing.category !== filter.category) return false;
    if (filter['location.city']) {
        const re = new RegExp(filter['location.city'], 'i');
        if (!re.test(listing.location?.city || '')) return false;
    }
    if (filter.condition && listing.condition !== filter.condition) return false;
    if (filter['availability.isAvailable'] !== undefined) {
        if (listing.availability?.isAvailable !== filter['availability.isAvailable']) return false;
    }
    if (filter['pricePerDay.$gte'] !== undefined && listing.pricePerDay < filter['pricePerDay.$gte']) return false;
    if (filter['pricePerDay.$lte'] !== undefined && listing.pricePerDay > filter['pricePerDay.$lte']) return false;
    if (filter.$text?.$search) {
        const q = filter.$text.$search.toLowerCase();
        const searchable = `${listing.title} ${listing.description} ${(listing.tags || []).join(' ')}`.toLowerCase();
        if (!searchable.includes(q)) return false;
    }
    if (filter._id?.$in && !filter._id.$in.includes(listing._id)) return false;
    if (filter.owner && listing.owner !== filter.owner) return false;
    if (filter.isFeatured !== undefined && listing.isFeatured !== filter.isFeatured) return false;
    return true;
}

function sortListings(listings, sort) {
    const s = sort || '-createdAt';
    const desc = s.startsWith('-');
    const key = s.replace(/^-/, '');

    return [...listings].sort((a, b) => {
        const av = key.includes('.') ? key.split('.').reduce((o, k) => o?.[k], a) : a[key];
        const bv = key.includes('.') ? key.split('.').reduce((o, k) => o?.[k], b) : b[key];
        if (av === undefined || bv === undefined) return 0;
        if (typeof av === 'string') return desc ? bv.localeCompare(av) : av.localeCompare(bv);
        return desc ? bv - av : av - bv;
    });
}

function populateListing(listing, fields = 'name avatar rating location') {
    if (!listing) return null;
    const owner = Users.findById(listing.owner);
    const fieldList = fields.split(' ');
    const ownerData = owner
        ? Object.fromEntries(
            fieldList.filter(f => owner[f] !== undefined).map(f => [f, owner[f]])
        )
        : null;
    return { ...listing, owner: ownerData ? { _id: listing.owner, ...ownerData } : listing.owner };
}

const Listings = {
    findById: (id) => getCollection('listings').find(l => l._id === id) || null,

    findOne: (query) => {
        const listings = getCollection('listings');
        return listings.find(l => {
            if (query.slug !== undefined && l.slug !== query.slug) return false;
            if (query._id !== undefined && l._id !== query._id) return false;
            if (query.isActive !== undefined && l.isActive !== query.isActive) return false;
            return true;
        }) || null;
    },

    find: (filter = {}, { sort, skip = 0, limit = 100 } = {}) => {
        let listings = getCollection('listings').filter(l => matchesListingFilter(l, filter));
        if (sort) listings = sortListings(listings, sort);
        return listings.slice(skip, skip + limit);
    },

    count: (filter = {}) => {
        return getCollection('listings').filter(l => matchesListingFilter(l, filter)).length;
    },

    create: (data) => {
        const listings = getCollection('listings');
        const listing = {
            _id: generateId(),
            title: data.title || '',
            slug: slugify(data.title || 'item'),
            description: data.description || '',
            category: data.category || 'Other',
            pricePerDay: Number(data.pricePerDay) || 0,
            pricePerWeek: data.pricePerWeek ? Number(data.pricePerWeek) : null,
            pricePerMonth: data.pricePerMonth ? Number(data.pricePerMonth) : null,
            securityDeposit: Number(data.securityDeposit) || 0,
            images: data.images?.length ? data.images : [{ url: '/placeholder.jpg', alt: data.title }],
            owner: data.owner,
            location: data.location || { city: '', state: '', country: 'India' },
            condition: data.condition || 'Good',
            availability: {
                isAvailable: true,
                minRentalDays: data.availability?.minRentalDays || 1,
                maxRentalDays: data.availability?.maxRentalDays || 30,
                unavailableDates: [],
            },
            features: data.features || [],
            tags: data.tags || [],
            rating: { average: 0, count: 0 },
            views: 0,
            totalRentals: 0,
            isActive: true,
            isFeatured: false,
            createdAt: now(),
            updatedAt: now(),
        };
        listings.push(listing);
        saveCollection('listings', listings);
        return listing;
    },

    findByIdAndUpdate: (id, updates) => {
        const listings = getCollection('listings');
        const idx = listings.findIndex(l => l._id === id);
        if (idx === -1) return null;
        // Handle $inc operator
        if (updates.$inc) {
            Object.entries(updates.$inc).forEach(([k, v]) => {
                listings[idx][k] = (listings[idx][k] || 0) + v;
            });
            delete updates.$inc;
        }
        if (Object.keys(updates).length > 0) {
            listings[idx] = { ...listings[idx], ...updates, updatedAt: now() };
        }
        saveCollection('listings', listings);
        return listings[idx];
    },

    save: (listing) => {
        const listings = getCollection('listings');
        const idx = listings.findIndex(l => l._id === listing._id);
        if (idx !== -1) {
            listings[idx] = { ...listing, updatedAt: now() };
            saveCollection('listings', listings);
        }
        return listing;
    },

    populate: (listing, fields) => populateListing(listing, fields),
    populateMany: (arr, fields) => arr.map(l => populateListing(l, fields)),
};

// ── Bookings ───────────────────────────────────────────────────────────────

function matchesBookingFilter(booking, filter) {
    if (filter.renter && booking.renter !== filter.renter) return false;
    if (filter.owner && booking.owner !== filter.owner) return false;
    if (filter.listing && booking.listing !== filter.listing) return false;
    if (filter.status) {
        if (Array.isArray(filter.status.$in)) {
            if (!filter.status.$in.includes(booking.status)) return false;
        } else if (booking.status !== filter.status) return false;
    }
    // Date overlap check
    if (filter.$or) {
        const anyMatch = filter.$or.some(condition => {
            const start = condition.startDate?.$lt;
            const end = condition.endDate?.$gt;
            if (start && end) {
                return new Date(booking.startDate) < new Date(start) &&
                    new Date(booking.endDate) > new Date(end);
            }
            return false;
        });
        if (!anyMatch && filter.$or.length > 0) {
            // Check date overlap: booking overlaps if booking.start < filter.end AND booking.end > filter.start
            if (filter._dateStart && filter._dateEnd) {
                const overlapCheck = new Date(booking.startDate) < new Date(filter._dateEnd) &&
                    new Date(booking.endDate) > new Date(filter._dateStart);
                if (!overlapCheck) return false;
            }
        }
    }
    return true;
}

function populateBooking(booking, fieldsMap) {
    if (!booking) return null;
    const result = { ...booking };
    if (fieldsMap.listing) {
        const listing = Listings.findById(booking.listing);
        result.listing = listing ? pick(listing, fieldsMap.listing) : booking.listing;
    }
    if (fieldsMap.renter) {
        const renter = Users.findById(booking.renter);
        result.renter = renter ? pick(renter, fieldsMap.renter) : booking.renter;
    }
    if (fieldsMap.owner) {
        const owner = Users.findById(booking.owner);
        result.owner = owner ? pick(owner, fieldsMap.owner) : booking.owner;
    }
    return result;
}

function pick(obj, fields) {
    if (!obj) return null;
    const f = typeof fields === 'string' ? fields.split(' ') : fields;
    return f.reduce((acc, k) => {
        if (obj[k] !== undefined) acc[k] = obj[k];
        return acc;
    }, { _id: obj._id });
}

const Bookings = {
    findById: (id) => getCollection('bookings').find(b => b._id === id) || null,

    findOne: (filter) => {
        const bookings = getCollection('bookings');
        // For date conflict check
        if (filter.listing && filter.status?.$in && filter.$or) {
            const dateEnd = filter.$or[0]?.startDate?.$lt;
            const dateStart = filter.$or[0]?.endDate?.$gt;
            return bookings.find(b => {
                if (b.listing !== filter.listing) return false;
                if (!filter.status.$in.includes(b.status)) return false;
                // Check overlap
                return new Date(b.startDate) < new Date(dateEnd) &&
                    new Date(b.endDate) > new Date(dateStart);
            }) || null;
        }
        return bookings.find(b => {
            return Object.entries(filter).every(([k, v]) => {
                if (k === '$or') return true;
                if (k === 'status') {
                    if (typeof v === 'object' && v.$in) return v.$in.includes(b[k]);
                    return b[k] === v;
                }
                return b[k] === v;
            });
        }) || null;
    },

    find: (filter = {}, { sort = '-createdAt', skip = 0, limit = 100 } = {}) => {
        let bookings = getCollection('bookings').filter(b => {
            if (filter.renter && b.renter !== filter.renter) return false;
            if (filter.owner && b.owner !== filter.owner) return false;
            if (filter.listing && b.listing !== filter.listing) return false;
            if (filter.status) {
                if (typeof filter.status === 'string' && b.status !== filter.status) return false;
                if (filter.status.$in && !filter.status.$in.includes(b.status)) return false;
            }
            return true;
        });
        // Sort
        const desc = sort.startsWith('-');
        const key = sort.replace(/^-/, '');
        bookings.sort((a, b) => {
            const av = a[key], bv = b[key];
            if (!av || !bv) return 0;
            return desc ? new Date(bv) - new Date(av) : new Date(av) - new Date(bv);
        });
        return bookings.slice(skip, skip + limit);
    },

    count: (filter) => Bookings.find(filter).length,

    create: (data) => {
        const bookings = getCollection('bookings');
        const totalDays = Math.ceil(
            (new Date(data.endDate) - new Date(data.startDate)) / (1000 * 60 * 60 * 24)
        );
        const booking = {
            _id: generateId(),
            listing: data.listing,
            renter: data.renter,
            owner: data.owner,
            startDate: data.startDate,
            endDate: data.endDate,
            totalDays,
            pricing: data.pricing,
            status: 'pending',
            paymentStatus: 'unpaid',
            paymentMethod: data.paymentMethod || 'online',
            transactionId: null,
            deliveryMethod: data.deliveryMethod || 'pickup',
            deliveryAddress: data.deliveryAddress || {},
            notes: data.notes || { renter: '', owner: '' },
            cancellation: null,
            review: null,
            timeline: data.timeline || [{ status: 'pending', timestamp: now(), note: 'Booking request sent.' }],
            createdAt: now(),
            updatedAt: now(),
        };
        bookings.push(booking);
        saveCollection('bookings', bookings);
        return booking;
    },

    save: (booking) => {
        const bookings = getCollection('bookings');
        const idx = bookings.findIndex(b => b._id === booking._id);
        if (idx !== -1) {
            bookings[idx] = { ...booking, updatedAt: now() };
            saveCollection('bookings', bookings);
        }
        return booking;
    },

    populate: (booking, fieldsMap) => fieldsMap ? populateBooking(booking, fieldsMap) : booking,
    populateMany: (arr, fieldsMap) => arr.map(b => populateBooking(b, fieldsMap)),
};

module.exports = { Users, Listings, Bookings, generateId };
