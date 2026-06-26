const express = require('express');
const router = express.Router();
const {
    getStats, getUsers, getListings, approveListing,
    suspendUser, activateUser, deleteListing, getRevenueReport, getBookings
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('admin'));

router.get('/stats', getStats);
router.get('/users', getUsers);
router.patch('/users/:id/suspend', suspendUser);
router.patch('/users/:id/activate', activateUser);
router.get('/listings', getListings);
router.patch('/listings/:id/approve', approveListing);
router.delete('/listings/:id', deleteListing);
router.get('/revenue', getRevenueReport);
router.get('/bookings', getBookings);

module.exports = router;
