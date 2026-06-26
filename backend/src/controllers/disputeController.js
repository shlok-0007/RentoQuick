const Dispute = require('../models/Dispute');
const Booking = require('../models/Booking');
const { sendNotification } = require('../utils/notifications');

// POST /api/disputes
exports.raiseDispute = async (req, res, next) => {
    try {
        const { bookingId, reason, description, evidence } = req.body;

        const booking = await Booking.findById(bookingId);
        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

        const isRenter = booking.renter.toString() === req.user._id.toString();
        const isOwner = booking.owner.toString() === req.user._id.toString();
        if (!isRenter && !isOwner) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const existing = await Dispute.findOne({ booking: bookingId, status: { $in: ['open', 'under_review'] } });
        if (existing) {
            return res.status(400).json({ success: false, message: 'An active dispute already exists for this booking' });
        }

        const against = isRenter ? booking.owner : booking.renter;

        const dispute = await Dispute.create({
            booking: bookingId,
            raisedBy: req.user._id,
            against,
            reason,
            description,
            evidence: evidence || [],
            timeline: [{ status: 'open', timestamp: new Date(), note: 'Dispute raised' }],
        });

        // Update booking status
        booking.status = 'disputed';
        booking.timeline.push({ status: 'disputed', timestamp: new Date(), note: 'A dispute has been raised.' });
        await booking.save();

        // Notify the other party
        await sendNotification({
            recipient: against,
            sender: req.user._id,
            type: 'dispute',
            title: 'Dispute Raised ⚠️',
            content: `A dispute has been raised for a booking: ${reason}`,
            link: '/disputes',
        });

        const populated = await Dispute.findById(dispute._id)
            .populate('raisedBy', 'name avatar')
            .populate('against', 'name avatar')
            .populate('booking', 'listing startDate endDate');

        res.status(201).json({ success: true, dispute: populated });
    } catch (err) {
        next(err);
    }
};

// GET /api/disputes/my
exports.getMyDisputes = async (req, res, next) => {
    try {
        const disputes = await Dispute.find({
            $or: [{ raisedBy: req.user._id }, { against: req.user._id }]
        })
            .sort('-createdAt')
            .populate('raisedBy', 'name avatar')
            .populate('against', 'name avatar')
            .populate({
                path: 'booking',
                select: 'listing startDate endDate status',
                populate: { path: 'listing', select: 'title images slug' }
            });

        res.json({ success: true, disputes });
    } catch (err) {
        next(err);
    }
};

// GET /api/disputes/:id
exports.getDisputeById = async (req, res, next) => {
    try {
        const dispute = await Dispute.findById(req.params.id)
            .populate('raisedBy', 'name avatar email')
            .populate('against', 'name avatar email')
            .populate('responses.user', 'name avatar')
            .populate({
                path: 'booking',
                populate: [
                    { path: 'listing', select: 'title images slug pricePerDay' },
                    { path: 'renter', select: 'name avatar' },
                    { path: 'owner', select: 'name avatar' }
                ]
            });

        if (!dispute) return res.status(404).json({ success: false, message: 'Dispute not found' });

        const isInvolved = [dispute.raisedBy._id.toString(), dispute.against._id.toString()].includes(req.user._id.toString());
        if (!isInvolved && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        res.json({ success: true, dispute });
    } catch (err) {
        next(err);
    }
};

// PUT /api/disputes/:id/respond
exports.respondToDispute = async (req, res, next) => {
    try {
        const dispute = await Dispute.findById(req.params.id);
        if (!dispute) return res.status(404).json({ success: false, message: 'Dispute not found' });

        if (dispute.status === 'resolved' || dispute.status === 'closed') {
            return res.status(400).json({ success: false, message: 'Dispute is already resolved/closed' });
        }

        dispute.responses.push({
            user: req.user._id,
            message: req.body.message,
            attachments: req.body.attachments || [],
            timestamp: new Date(),
        });

        await dispute.save();

        // Notify other party
        const otherParty = dispute.raisedBy.toString() === req.user._id.toString()
            ? dispute.against : dispute.raisedBy;

        await sendNotification({
            recipient: otherParty,
            sender: req.user._id,
            type: 'dispute',
            title: 'Dispute Response',
            content: 'A new response has been added to your dispute.',
            link: '/disputes',
        });

        res.json({ success: true, dispute });
    } catch (err) {
        next(err);
    }
};

// PUT /api/disputes/:id/resolve (admin)
exports.resolveDispute = async (req, res, next) => {
    try {
        const dispute = await Dispute.findById(req.params.id);
        if (!dispute) return res.status(404).json({ success: false, message: 'Dispute not found' });

        dispute.status = 'resolved';
        dispute.resolution = {
            decision: req.body.decision,
            refundAmount: req.body.refundAmount || 0,
            resolvedBy: req.user._id,
            resolvedAt: new Date(),
        };
        dispute.adminNotes = req.body.adminNotes || '';
        dispute.timeline.push({ status: 'resolved', timestamp: new Date(), note: req.body.decision });

        await dispute.save();

        // Notify both parties
        for (const uid of [dispute.raisedBy, dispute.against]) {
            await sendNotification({
                recipient: uid,
                sender: req.user._id,
                type: 'dispute',
                title: 'Dispute Resolved ✅',
                content: `Your dispute has been resolved: ${req.body.decision}`,
                link: '/disputes',
            });
        }

        res.json({ success: true, dispute });
    } catch (err) {
        next(err);
    }
};

// GET /api/disputes (admin - all disputes)
exports.getAllDisputes = async (req, res, next) => {
    try {
        const disputes = await Dispute.find()
            .sort('-createdAt')
            .populate('raisedBy', 'name avatar')
            .populate('against', 'name avatar')
            .populate({
                path: 'booking',
                select: 'listing startDate endDate',
                populate: { path: 'listing', select: 'title slug' }
            });

        res.json({ success: true, disputes });
    } catch (err) {
        next(err);
    }
};
