const Notification = require('../models/Notification');

// GET /api/notifications — cursor-based pagination (4.5)
exports.getNotifications = async (req, res, next) => {
    try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
        const skip = (page - 1) * limit;

        const [notifications, total] = await Promise.all([
            Notification.find({ recipient: req.user._id })
                .sort('-createdAt').skip(skip).limit(limit)
                .populate('sender', 'name avatar'),
            Notification.countDocuments({ recipient: req.user._id })
        ]);

        res.json({
            success: true,
            notifications,
            pagination: {
                total, page, limit,
                totalPages: Math.ceil(total / limit),
                hasNext: page < Math.ceil(total / limit),
                hasPrev: page > 1,
            }
        });
    } catch (err) { next(err); }
};

exports.markAllRead = async (req, res, next) => {
    try {
        await Notification.updateMany({ recipient: req.user._id, isRead: false }, { isRead: true });
        res.json({ success: true });
    } catch (err) { next(err); }
};

exports.markRead = async (req, res, next) => {
    try {
        await Notification.findOneAndUpdate({ _id: req.params.id, recipient: req.user._id }, { isRead: true });
        res.json({ success: true });
    } catch (err) { next(err); }
};
