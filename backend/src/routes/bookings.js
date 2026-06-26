const express = require('express');
const router = express.Router();
const {
    createBooking, getMyBookings, getReceivedBookings, updateBookingStatus,
    addReview, getListingReviews, getListingBookedDates
} = require('../controllers/bookingController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/', createBooking);
router.get('/my', getMyBookings);
router.get('/received', getReceivedBookings);
router.get('/listing/:listingId/dates', getListingBookedDates);
router.put('/:id/status', updateBookingStatus);
router.post('/:id/review', addReview);
router.get('/listing/:listingId', getListingReviews);

module.exports = router;
