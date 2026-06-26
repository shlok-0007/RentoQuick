const PushSubscription = require('../models/PushSubscription');

// POST /api/push/subscribe
exports.subscribePush = async (req, res, next) => {
    try {
        const { subscription } = req.body;

        // Upsert subscription
        await PushSubscription.findOneAndUpdate(
            { 'subscription.endpoint': subscription.endpoint },
            { user: req.user._id, subscription },
            { upsert: true, new: true }
        );

        res.json({ success: true, message: 'Push subscription registered' });
    } catch (err) {
        next(err);
    }
};

// DELETE /api/push/unsubscribe
exports.unsubscribePush = async (req, res, next) => {
    try {
        const { endpoint } = req.body;
        await PushSubscription.findOneAndDelete({ 'subscription.endpoint': endpoint });
        res.json({ success: true, message: 'Push subscription removed' });
    } catch (err) {
        next(err);
    }
};
