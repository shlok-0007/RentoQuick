const express = require('express');
const router = express.Router();
const {
    raiseDispute, getMyDisputes, getDisputeById, respondToDispute, resolveDispute, getAllDisputes
} = require('../controllers/disputeController');
const { protect, authorize } = require('../middleware/auth');

router.post('/', protect, raiseDispute);
router.get('/my', protect, getMyDisputes);
router.get('/:id', protect, getDisputeById);
router.put('/:id/respond', protect, respondToDispute);
router.put('/:id/resolve', protect, authorize('admin'), resolveDispute);
router.get('/', protect, authorize('admin'), getAllDisputes);


// 6.9 — Standardized route protection (all routes require auth)
router.use(protect);

module.exports = router;
