const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const {
    register, login, getMe, updateProfile,
    changePassword, toggleWishlist, getPublicProfile,
    forgotPassword, resetPassword, googleLogin,
    verifyEmail, resendOTP, uploadAvatar
} = require('../controllers/authController');
const { avatarUpload } = require('../utils/cloudinary');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { registerSchema, loginSchema, updateProfileSchema } = require('../utils/validation');

// PUBLIC routes
router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/google', googleLogin);
router.post('/verify-email', verifyEmail);
router.post('/resend-otp', resendOTP);

// All routes below require authentication
router.use(protect);

router.get('/me', getMe);
router.put('/me', validate(updateProfileSchema), updateProfile);
router.put('/change-password', changePassword);
router.post('/wishlist/:listingId', toggleWishlist);
router.post('/avatar', avatarUpload.single('avatar'), uploadAvatar);

const publicProfileLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, message: { success: false, message: 'Too many profile requests' } });
router.get('/profile/:id', publicProfileLimiter, getPublicProfile);

module.exports = router;
