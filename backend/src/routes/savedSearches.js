const express = require('express');
const router = express.Router();
const {
    saveSearch, getMySavedSearches, deleteSavedSearch, toggleAlert
} = require('../controllers/savedSearchController');
const { protect } = require('../middleware/auth');

router.post('/', protect, saveSearch);
router.get('/', protect, getMySavedSearches);
router.delete('/:id', protect, deleteSavedSearch);
router.put('/:id/alert', protect, toggleAlert);


// 6.9 — Standardized route protection (all routes require auth)
router.use(protect);

module.exports = router;
