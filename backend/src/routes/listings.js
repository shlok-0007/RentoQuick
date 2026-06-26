const express = require('express');
const router = express.Router();
const {
    getListings, getListing, createListing, updateListing,
    deleteListing, getFeaturedListings, getMyListings, checkAvailability,
    uploadListingImages, searchLocations, reverseGeocode, recordView
} = require('../controllers/listingController');
const { protect, optionalAuth } = require('../middleware/auth');
const { upload } = require('../utils/cloudinary');
const validate = require('../middleware/validate');
const { listingSchema } = require('../utils/validation');

router.get('/featured', getFeaturedListings);
router.get('/my', protect, getMyListings);
router.get('/:id/availability', optionalAuth, checkAvailability);
router.get('/locations/search', searchLocations);
router.get('/locations/reverse-geocode', reverseGeocode);

// View counter — idempotent within a 24h window per user/guest
// Uses optionalAuth so guests can also be deduped by fingerprint
router.post('/:id/view', optionalAuth, recordView);

router.route('/')
    .get(optionalAuth, getListings)
    .post(protect, validate(listingSchema), createListing);

router.post('/upload', protect, upload.array('images', 5), uploadListingImages);

router.route('/:id')
    .get(optionalAuth, getListing)
    .put(protect, updateListing)
    .delete(protect, deleteListing);

module.exports = router;
