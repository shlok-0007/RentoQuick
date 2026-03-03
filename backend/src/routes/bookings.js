const express = require('express');
const router = express.Router();
const {
    createBooking, getMyBookings, getReceivedBookings, updateBookingStatus, addReview
} = require('../controllers/bookingController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/', createBooking);
router.get('/my', getMyBookings);
router.get('/received', getReceivedBookings);
router.put('/:id/status', updateBookingStatus);
router.post('/:id/review', addReview);

module.exports = router;
