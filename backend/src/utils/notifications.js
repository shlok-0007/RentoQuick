const socketio = require('socket.io');
const webpush = require('web-push');
const Notification = require('../models/Notification');
const PushSubscription = require('../models/PushSubscription');

let io;
const onlineUsers = new Map(); // userId -> Set of socketIds

// VAPID keys should be generated and set in .env
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        process.env.VAPID_EMAIL || 'mailto:admin@rentoquick.com',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
}

const initSocket = (server) => {
    io = socketio(server, {
        cors: {
            origin: process.env.CLIENT_URL || ['http://localhost:5173', 'http://localhost:3000'],
            methods: ['GET', 'POST']
        }
    });

    // Socket.io JWT authentication middleware
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
            if (token) {
                const jwt = require('jsonwebtoken');
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const User = require('../models/User');
                const user = await User.findById(decoded.id);
                if (user) {
                    socket.userId = user._id.toString();
                    socket.userName = user.name;
                    socket.userAvatar = user.avatar;
                }
            }
        } catch (err) {
            // Allow connection without auth, but socket won't have userId
        }
        next();
    });

    io.on('connection', (socket) => {
        console.log('New client connected:', socket.id);
        let currentUserId = null;

        // ── Join user room & track online status ──
        socket.on('join', (userId) => {
            // Use authenticated userId if available, otherwise accept the provided one
            currentUserId = socket.userId || userId;
            if (!currentUserId) return; // Reject unauthenticated join
            socket.join(currentUserId);

            // Track online users
            if (!onlineUsers.has(userId)) {
                onlineUsers.set(userId, new Set());
            }
            onlineUsers.get(userId).add(socket.id);

            // Broadcast online status to all joined rooms
            io.emit('user_online', { userId, online: true });
            console.log(`User ${userId} joined (sockets: ${onlineUsers.get(userId).size})`);
        });

        // ── Real-time private message ──
        socket.on('private_message', async (data) => {
            try {
                const { receiverId, content, listingId } = data;
                // Use authenticated socket user ID, ignore client-provided senderId
                const senderId = socket.userId;
                if (!senderId) return; // Reject unauthenticated messages
                const senderName = socket.userName || 'User';
                const senderAvatar = socket.userAvatar || '';
                if (!receiverId || !content || !senderId) return;

                // Dynamically import to avoid circular dependency
                const Message = require('../models/Message');
                const User = require('../models/User');

                const conversationId = [senderId, receiverId].sort().join('-');

                // Save message to DB
                const message = await Message.create({
                    conversationId,
                    sender: senderId,
                    receiver: receiverId,
                    content,
                    listing: listingId || undefined
                });

                // Populate sender info
                const populated = await Message.findById(message._id)
                    .populate('sender', 'name avatar')
                    .populate('listing', 'title images pricePerDay');

                // Emit to receiver in real-time
                io.to(receiverId.toString()).emit('new_message', populated);

                // Also emit back to sender for consistency (e.g., multi-tab)
                io.to(senderId.toString()).emit('new_message', populated);

                // Send notification
                const receiver = await User.findById(receiverId).select('name');
                const { sendNotification } = require('./notifications');
                await sendNotification({
                    recipient: receiverId,
                    sender: senderId,
                    type: 'message',
                    title: `New message from ${senderName || 'Someone'}`,
                    content: content.length > 50 ? content.substring(0, 50) + '...' : content,
                    link: `/messages?id=${conversationId}`
                });
            } catch (err) {
                console.error('Error handling private_message:', err);
            }
        });

        // ── Typing indicator ──
        socket.on('typing', ({ receiverId, conversationId }) => {
            if (receiverId) {
                socket.to(receiverId.toString()).emit('user_typing', {
                    userId: socket.userId || currentUserId,
                    conversationId
                });
            }
        });

        socket.on('stop_typing', ({ receiverId, conversationId }) => {
            if (receiverId) {
                socket.to(receiverId.toString()).emit('user_stop_typing', {
                    userId: socket.userId || currentUserId,
                    conversationId
                });
            }
        });

        // ── Message read receipt ──
        socket.on('messages_read', async ({ conversationId, readerId }) => {
            try {
                const Message = require('../models/Message');
                await Message.updateMany(
                    { conversationId, receiver: readerId, isRead: false },
                    { isRead: true }
                );
                // Notify the other person in the conversation
                const otherUserId = conversationId.split('-').find(id => id !== readerId);
                if (otherUserId) {
                    io.to(otherUserId).emit('messages_read', { conversationId, readBy: readerId });
                }
            } catch (err) {
                console.error('Error handling messages_read:', err);
            }
        });

        // ── Check online status ──
        socket.on('check_online', (userIds) => {
            // userIds is an array of user IDs to check
            const status = {};
            if (Array.isArray(userIds)) {
                userIds.forEach(uid => {
                    status[uid] = onlineUsers.has(uid) && onlineUsers.get(uid).size > 0;
                });
            }
            socket.emit('online_status', status);
        });

        // ── Handle disconnect ──
        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
            if (currentUserId && onlineUsers.has(currentUserId)) {
                onlineUsers.get(currentUserId).delete(socket.id);
                // If no more sockets for this user, they're offline
                if (onlineUsers.get(currentUserId).size === 0) {
                    onlineUsers.delete(currentUserId);
                    io.emit('user_online', { userId: currentUserId, online: false });
                }
            }
        });
    });

    return io;
};

const sendNotification = async ({ recipient, type, title, content, link, sender }) => {
    try {
        // 1. Save to DB
        const notification = await Notification.create({
            recipient, type, title, content, link, sender
        });

        // 2. Emit via Socket.io if recipient is online
        if (io) {
            io.to(recipient.toString()).emit('notification', notification);
        }

        // 3. Send via Web Push
        const subscriptions = await PushSubscription.find({ user: recipient });
        const pushPayload = JSON.stringify({
            title,
            body: content,
            data: { url: link || '/' },
            icon: '/logo192.png'
        });

        subscriptions.forEach(sub => {
            webpush.sendNotification(sub.subscription, pushPayload).catch(err => {
                if (err.statusCode === 404 || err.statusCode === 410) {
                    console.log('Push subscription expired or invalid, removing...');
                    PushSubscription.findByIdAndDelete(sub._id).exec();
                } else {
                    console.error('Error sending push notification:', err);
                }
            });
        });

        return notification;
    } catch (err) {
        console.error('Error sending notification:', err);
    }
};

module.exports = { initSocket, sendNotification, getIO: () => io };
