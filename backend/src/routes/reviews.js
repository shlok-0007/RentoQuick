const express = require('express');
const router = express.Router();
const {
    createReview, getListingReviews, addOwnerResponse, getUserReviews,
    toggleLike, addReply
} = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createReviewSchema } = require('../utils/validation');

// PUBLIC routes
router.get('/listing/:id', getListingReviews);

// Protected routes
router.use(protect);

router.post('/', validate(createReviewSchema), createReview);
router.get('/user/:id', getUserReviews);

// Engagement endpoints
router.put('/:id/like', toggleLike);          // toggle like on/off
router.post('/:id/replies', addReply);        // add a reply (owner or anyone)
router.put('/:id/respond', addOwnerResponse); // legacy single owner response

module.exports = router;
