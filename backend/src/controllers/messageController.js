const User = require('../models/User');
const Message = require('../models/Message');
const { sendNotification } = require('../utils/notifications');

// POST /api/messages
exports.sendMessage = async (req, res, next) => {
    try {
        const { receiverId, content, listingId } = req.body;
        const senderId = req.user._id;

        // Create a unique conversation ID (alphabetical order of IDs to be consistent)
        const conversationId = [senderId.toString(), receiverId.toString()].sort().join('-');

        const message = await Message.create({
            conversationId,
            sender: senderId,
            receiver: receiverId,
            content,
            listing: listingId
        });

        // Trigger notification
        await sendNotification({
            recipient: receiverId,
            sender: senderId,
            type: 'message',
            title: `New message from ${req.user.name}`,
            content: content.length > 50 ? content.substring(0, 50) + '...' : content,
            link: `/messages?id=${conversationId}`
        });

        res.status(201).json({ success: true, message });
    } catch (err) {
        next(err);
    }
};

// GET /api/messages/conversations
exports.getConversations = async (req, res, next) => {
    try {
        const userId = req.user._id;

        // Find all unique conversation IDs for the user
        const conversations = await Message.aggregate([
            { $match: { $or: [{ sender: userId }, { receiver: userId }] } },
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: '$conversationId',
                    lastMessage: { $first: '$$ROOT' },
                    unreadCount: {
                        $sum: { $cond: [{ $and: [{ $eq: ['$receiver', userId] }, { $eq: ['$isRead', false] }] }, 1, 0] }
                    }
                }
            },
            { $sort: { 'lastMessage.createdAt': -1 } }
        ]);

        // Populate other user info
        const populated = await Promise.all(conversations.map(async (conv) => {
            const otherUserId = conv.lastMessage.sender.toString() === userId.toString()
                ? conv.lastMessage.receiver
                : conv.lastMessage.sender;

            const otherUser = await User.findById(otherUserId).select('name avatar');
            return {
                ...conv,
                otherUser
            };
        }));

        res.json({ success: true, conversations: populated });
    } catch (err) {
        next(err);
    }
};

// GET /api/messages/:conversationId
exports.getMessages = async (req, res, next) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user._id;

        // Verify user is part of conversation
        if (!conversationId.includes(userId.toString())) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const messages = await Message.find({ conversationId })
            .sort('createdAt')
            .populate('sender', 'name avatar')
            .populate('listing', 'title images pricePerDay');

        // Mark as read
        await Message.updateMany(
            { conversationId, receiver: userId, isRead: false },
            { isRead: true }
        );

        res.json({ success: true, messages });
    } catch (err) {
        next(err);
    }
};
