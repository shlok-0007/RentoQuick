const { z } = require('zod');

// ── Auth Schemas ──────────────────────────────────────────────────────────

const registerSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email format').toLowerCase(),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number').optional(),
});

const loginSchema = z.object({
    email: z.string().email('Invalid email format').toLowerCase(),
    password: z.string().min(1, 'Password is required'),
});

const updateProfileSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').optional(),
    phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number').optional(),
    bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
    avatar: z.string().url('Invalid avatar URL').optional().or(z.literal('')),
});

// ── Listing Schemas ────────────────────────────────────────────────────────

const listingSchema = z.object({
    title: z.string().min(5, 'Title must be at least 5 characters').max(100),
    description: z.string().min(20, 'Description must be at least 20 characters').max(2000),
    category: z.string().min(1, 'Category is required'),
    condition: z.enum(['New', 'Like New', 'Good', 'Fair', 'Poor']),
    pricePerDay: z.coerce.number().positive('Price must be greater than 0'),
    pricePerWeek: z.coerce.number().positive().optional().nullable(),
    pricePerMonth: z.coerce.number().positive().optional().nullable(),
    securityDeposit: z.coerce.number().min(0).optional().default(0),
    location: z.object({
        city: z.string().min(1, 'City is required'),
        state: z.string().min(1, 'State is required'),
        address: z.string().optional(),
        pincode: z.string().regex(/^\d{6}$/, 'Invalid Indian pincode (6 digits required)'),
    }),
    images: z.array(z.object({
        url: z.string().url(),
        alt: z.string().optional()
    })).min(1, 'At least one image is required').optional(), // Optional here if images are in req.files
});


// Coupon Schemas (2.5)
const couponSchema = z.object({
    code: z.string().min(4).max(20).toUpperCase(),
    discountType: z.enum(["percentage", "flat"]),
    discountValue: z.coerce.number().positive(),
    minBookingAmount: z.coerce.number().min(0).optional(),
    maxDiscountAmount: z.coerce.number().min(0).optional(),
    maxUses: z.coerce.number().int().positive().optional().nullable(),
    validFrom: z.coerce.date(),
    validUntil: z.coerce.date(),
    isActive: z.boolean().optional().default(true),
}).refine(d => d.validUntil > d.validFrom, { message: "validUntil must be after validFrom", path: ["validUntil"] });

const couponValidateSchema = z.object({
    code: z.string().min(4).max(20),
    bookingAmount: z.coerce.number().positive(),
});

// Review Schema (3.12)
const createReviewSchema = z.object({
    bookingId: z.string().min(1),
    type: z.enum(["item", "renter", "owner"]).default("item"),
    rating: z.coerce.number().int().min(1).max(5),
    comment: z.string().max(1000).optional(),
    photos: z.array(z.object({ url: z.string().max(500), alt: z.string().max(200).optional() })).max(5).optional(),
});

// Booking Schema
const createBookingSchema = z.object({
    listingId: z.string().min(1),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    deliveryMethod: z.enum(["pickup", "delivery"]).optional(),
    notes: z.string().max(500).optional(),
    couponCode: z.string().max(20).optional(),
});

// Push Schema
const subscribePushSchema = z.object({
    subscription: z.object({ endpoint: z.string().url(), keys: z.object({ p256dh: z.string(), auth: z.string() }) }).required()
});
const unsubscribePushSchema = z.object({ endpoint: z.string().min(1) });

// Saved Search Schema
const savedSearchSchema = z.object({
    name: z.string().min(1).max(100),
    filters: z.object({
        search: z.string().max(100).optional(), category: z.string().max(100).optional(),
        city: z.string().max(100).optional(), condition: z.enum(["New","Like New","Good","Fair","Poor"]).optional(),
        minPrice: z.coerce.number().min(0).optional(), maxPrice: z.coerce.number().min(0).optional(),
    }).optional().default({}),
});

// Dispute Schema
const createDisputeSchema = z.object({
    bookingId: z.string().min(1),
    reason: z.enum(["item_not_as_described","damaged","late_return","owner_no_show","renter_no_show","payment_issue","other"]),
    description: z.string().min(10).max(2000),
});
const respondDisputeSchema = z.object({
    response: z.string().min(1).max(2000),
    resolution: z.enum(["refund_full","refund_partial","reject","escalate"]).optional(),
    refundAmount: z.coerce.number().min(0).optional(),
});

// Message Schema
const sendMessageSchema = z.object({
    conversationId: z.string().min(1).optional(),
    recipientId: z.string().min(1).optional(),
    content: z.string().min(1).max(5000),
});

module.exports = {
    registerSchema,
    loginSchema,
    updateProfileSchema,
    listingSchema,
    couponSchema, couponValidateSchema, createReviewSchema,
    createBookingSchema, subscribePushSchema, unsubscribePushSchema,
    savedSearchSchema, createDisputeSchema, respondDisputeSchema,
    sendMessageSchema
};
