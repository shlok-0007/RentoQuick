const mongoose = require('mongoose');
const slugify = require('slugify');
const crypto = require('crypto');

const listingSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please add a title'],
        trim: true,
        maxlength: [100, 'Title cannot be more than 100 characters'],
    },
    slug: String,
    description: {
        type: String,
        required: [true, 'Please add a description'],
        maxlength: [2000, 'Description cannot be more than 2000 characters'],
    },
    category: {
        type: String,
        required: [true, 'Please add a category'],
        enum: [
            'Electronics & Gadgets',
            'Laptops & Computers',
            'Mobile Phones & Tablets',
            'Cameras & Photography',
            'Audio & Music Systems',
            'Gaming Consoles & Accessories',
            'Vehicles - Cars',
            'Vehicles - Bikes & Scooters',
            'Vehicles - Cycles',
            'Furniture - Sofas & Seating',
            'Furniture - Beds & Mattresses',
            'Furniture - Tables & Desks',
            'Furniture - Storage & Shelves',
            'Kitchen Appliances',
            'Home Appliances',
            'Tools & Equipment',
            'Power Tools',
            'Sports & Fitness Equipment',
            'Outdoor & Camping Gear',
            'Party & Event Supplies',
            'Musical Instruments',
            'Books & Textbooks',
            'Clothing & Fashion - Men',
            'Clothing & Fashion - Women',
            'Clothing & Fashion - Kids',
            'Jewelry & Accessories',
            'Bags & Luggage',
            'Footwear',
            'Toys & Games',
            'Baby & Kids Equipment',
            'Wedding & Ceremony Items',
            'Travel & Camping Gear',
            'DJ & Sound Equipment',
            'Projectors & Screens',
            'Drones & Accessories',
            'Medical & Health Equipment',
            'Garden & Outdoor Tools',
            'Art & Craft Supplies',
            'Office & Stationery',
            'Beauty & Grooming Equipment',
            'Pet Supplies & Accessories',
            'Fishing & Boating Gear',
            'Winter & Snow Gear',
            'Renovation & Construction Tools',
            'Cleaning Equipment',
            'Tailoring & Sewing Machines',
            'Printing & Scanning Equipment',
            'Networking & IT Equipment',
            'Film & Photography Lighting',
            'Other',
        ],
        default: 'Other',
    },
    pricePerDay: {
        type: Number,
        required: [true, 'Please add a price per day'],
    },
    pricePerWeek: Number,
    pricePerMonth: Number,
    securityDeposit: {
        type: Number,
        default: 0,
    },
    images: [
        {
            url: { type: String, required: true },
            alt: String,
        },
    ],
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    location: {
        city: { type: String, required: true },
        state: { type: String, required: true },
        country: { type: String, default: 'India' },
        coordinates: [Number]
    },
    condition: {
        type: String,
        enum: ['New', 'Like New', 'Good', 'Fair', 'Poor'],
        default: 'Good',
    },
    availability: {
        isAvailable: { type: Boolean, default: true },
        minRentalDays: { type: Number, default: 1 },
        maxRentalDays: { type: Number, default: 30 },
        unavailableDates: [Date],
    },
    features: [String],
    tags: [String],
    rating: {
        average: { type: Number, default: 0 },
        count: { type: Number, default: 0 },
    },
    views: {
        type: Number,
        default: 0,
    },
    // ── Verified view tracking ──
    // We keep a small "recently viewed by" log so we can deduplicate
    // views within a session. We store user IDs (for logged-in users)
    // and/or anonymous fingerprints (hash of IP + UA) for guests.
    // The array is capped to the last 200 viewers to keep the doc small.
    viewedBy: [{
        _id: false,
        id: { type: String, required: true },        // user id OR fingerprint
        kind: { type: String, enum: ['user', 'anon'], default: 'anon' },
        at: { type: Date, default: Date.now },
    }],
    totalRentals: {
        type: Number,
        default: 0,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    isFeatured: {
        type: Boolean,
        default: false,
    },
    // ── Smart Product Suggestion (AI-verified) fields ──
    verifiedProductId: {
        type: String,
        trim: true,
        sparse: true,
        index: true,
    },
    isVerifiedByAI: {
        type: Boolean,
        default: false,
    },
    aiConfidenceScore: {
        type: Number,
        min: 0,
        max: 100,
    },
    standardizedCategory: {
        type: String,
        trim: true,
    },
    suggestedThumbnail: {
        type: String,
        trim: true,
    },
    verificationDetails: {
        isValid: Boolean,
        confidenceScore: Number,
        standardizedCategory: String,
        suggestedThumbnail: String,
        verifiedAt: Date,
    },
}, {
    timestamps: true,
});

// ════════════════════════════════════════════════════════════════════
// Performance Indexes — optimised for the most common query patterns
// ════════════════════════════════════════════════════════════════════

// Unique slug lookup (detail page by slug)
listingSchema.index({ slug: 1 }, { unique: true });

// Owner's listings page ("my listings")
listingSchema.index({ owner: 1, isActive: 1 });

// Category browse + availability filter
listingSchema.index({ category: 1, isActive: 1 });

// City browse + availability filter
listingSchema.index({ 'location.city': 1, isActive: 1 });

// Featured listings (homepage)
listingSchema.index({ isFeatured: 1, isActive: 1 });

// Price range queries (min/max price filter)
listingSchema.index({ pricePerDay: 1, isActive: 1 });

// Created-at sort (default sort for listings)
listingSchema.index({ createdAt: -1 });

// Geospatial proximity search ($near queries)
listingSchema.index({ 'location.coordinates': '2dsphere' });

// ── NEW: Compound indexes for multi-filter queries ──

// Listings page: city + category + price sort (covers the most common browse)
listingSchema.index(
    { 'location.city': 1, category: 1, pricePerDay: 1, isActive: 1 },
    { name: 'idx_city_category_price' }
);

// Listings page: category + condition + created sort
listingSchema.index(
    { category: 1, condition: 1, createdAt: -1, isActive: 1 },
    { name: 'idx_category_condition_created' }
);

// Owner dashboard: owner + status + created (for my-listings page)
listingSchema.index(
    { owner: 1, isActive: 1, createdAt: -1 },
    { name: 'idx_owner_active_created' }
);

// ── NEW: Text search index for title, description, tags ──
// Supports $text queries for full-text search across listing content
listingSchema.index(
    { title: 'text', description: 'text', tags: 'text' },
    {
        name: 'idx_fulltext_search',
        weights: { title: 10, tags: 5, description: 1 },
        default_language: 'none', // Supports multilingual content (Hindi, etc.)
    }
);

// ── NEW: Single-field indexes for tag-based queries ──
listingSchema.index({ tags: 1 }, { name: 'idx_tags' });
listingSchema.index(
    { 'rating.average': -1, isActive: 1 },
    { name: 'idx_rating_active' }
);
listingSchema.index({ totalRentals: -1 }, { name: 'idx_total_rentals' });

// 4.8 — Sync pre-save (no async needed) + crypto slug for more entropy
listingSchema.pre('save', function () {

    if (!this.isModified('title') || this.slug) {
        return;
    }

    this.slug =
        `${slugify(this.title, {
            lower: true,
            strict: true
        })}-${crypto.randomBytes(4).toString('hex')}`;

});

module.exports = mongoose.model('Listing', listingSchema);
