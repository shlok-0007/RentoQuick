const express = require('express');
const router = express.Router();
const {
    getListings, getListing, createListing, updateListing,
    deleteListing, getFeaturedListings, getMyListings, checkAvailability
} = require('../controllers/listingController');
const { protect, optionalAuth } = require('../middleware/auth');

router.get('/featured', getFeaturedListings);
router.get('/my', protect, getMyListings);
router.get('/:id/availability', optionalAuth, checkAvailability);

router.route('/')
    .get(optionalAuth, getListings)
    .post(protect, createListing);

router.route('/:id')
    .get(optionalAuth, getListing)
    .put(protect, updateListing)
    .delete(protect, deleteListing);

module.exports = router;
