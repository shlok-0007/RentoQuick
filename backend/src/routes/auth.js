const express = require('express');
const router = express.Router();
const {
    register, login, getMe, updateProfile,
    changePassword, toggleWishlist, getPublicProfile
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/me', protect, updateProfile);
router.put('/change-password', protect, changePassword);
router.post('/wishlist/:listingId', protect, toggleWishlist);
router.get('/profile/:id', getPublicProfile);

module.exports = router;
