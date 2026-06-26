import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { messagesAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { Search, Send, User, MessageSquare, ChevronLeft, Package, Clock, Check, CheckCheck } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function ChatPage() {
    const { user, socket } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const activeConvId = searchParams.get('id');

    const [conversations, setConversations] = useState([]);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [msgLoading, setMsgLoading] = useState(false);
    const [content, setContent] = useState('');
    const [typingUser, setTypingUser] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState({});
    const [sending, setSending] = useState(false);

    const scrollRef = useRef();
    const typingTimeoutRef = useRef(null);
    const contentRef = useRef(content);
    contentRef.current = content;
    const typingUserRef = useRef(typingUser);
    useEffect(() => { typingUserRef.current = typingUser; }, [typingUser]);

    // Fetch conversations
    useEffect(() => {
        messagesAPI.getConversations()
            .then(res => {
                const convs = res.data.conversations;
                setConversations(convs);

                const targetUserId = searchParams.get('userId');
                if (targetUserId) {
                    const existing = convs.find(c => c.otherUser?._id === targetUserId);
                    if (existing) {
                        setSearchParams({ id: existing._id });
                    } else {
                        const tempId = [user._id, targetUserId].sort().join('-');
                        setSearchParams({ id: tempId });
                    }
                }
            })
            .catch(() => toast.error('Failed to load chats'))
            .finally(() => setLoading(false));
    }, [searchParams.get('userId')]);

    // Fetch messages for active conversation
    useEffect(() => {
        if (!activeConvId) return;
        setMsgLoading(true);
        messagesAPI.getMessages(activeConvId)
            .then(res => setMessages(res.data.messages))
            .catch(() => toast.error('Failed to load messages'))
            .finally(() => setMsgLoading(false));
    }, [activeConvId]);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // ── Socket.io real-time event listeners ──
    useEffect(() => {
        if (!socket) return;

        // Real-time new message
        const handleNewMessage = (msg) => {
            const msgConvId = msg.conversationId;
            // If this message belongs to the currently open conversation, add it
            if (msgConvId === activeConvId) {
                setMessages(prev => {
                    // Avoid duplicate by _id
                    if (prev.some(m => m._id === msg._id)) return prev;
                    // Replace optimistic temp message (matches sender + content + approximate time)
                    const tempIdx = prev.findIndex(
                        m => m._id.startsWith('temp-') &&
                              m.sender?._id === msg.sender?._id &&
                              m.content === msg.content
                    );
                    if (tempIdx !== -1) {
                        const updated = [...prev];
                        updated[tempIdx] = msg;
                        return updated;
                    }
                    return [...prev, msg];
                });
            }
            // Update conversation list (move to top, update last message)
            setConversations(prev => {
                const exists = prev.find(c => c._id === msgConvId);
                const isReceiver = msg.receiver?._id === user._id;
                return [exists, ...prev.filter(c => c._id !== msgConvId)].map(c =>
                    c._id === msgConvId
                        ? { ...c, lastMessage: msg, unreadCount: c._id === activeConvId ? 0 : (isReceiver ? (c.unreadCount || 0) + 1 : c.unreadCount) }
                        : c
                );
            });
        };

        // Typing indicator
        const handleTyping = ({ userId, conversationId }) => {
            if (conversationId === activeConvId) {
                setTypingUser(userId);
            }
        };

        const handleStopTyping = ({ userId, conversationId }) => {
            if (conversationId === activeConvId && typingUserRef.current === userId) {
                setTypingUser(null);
            }
        };

        // Messages read receipt
        const handleMessagesRead = ({ conversationId }) => {
            if (conversationId === activeConvId) {
                setMessages(prev => prev.map(m =>
                    m.sender?._id === user._id ? { ...m, isRead: true } : m
                ));
            }
        };

        // Online status updates
        const handleUserOnline = ({ userId, online }) => {
            setOnlineUsers(prev => ({ ...prev, [userId]: online }));
        };

        socket.on('new_message', handleNewMessage);
        socket.on('user_typing', handleTyping);
        socket.on('user_stop_typing', handleStopTyping);
        socket.on('messages_read', handleMessagesRead);
        socket.on('user_online', handleUserOnline);

        return () => {
            socket.off('new_message', handleNewMessage);
            socket.off('user_typing', handleTyping);
            socket.off('user_stop_typing', handleStopTyping);
            socket.off('messages_read', handleMessagesRead);
            socket.off('user_online', handleUserOnline);
        };
    }, [socket, activeConvId, user._id]);

    // Send typing indicator while user types
    const handleInputChange = (e) => {
        const val = e.target.value;
        setContent(val);

        if (!activeConvId || !socket) return;
        const activeConv = conversations.find(c => c._id === activeConvId);
        const otherUserId = activeConv?.otherUser?._id ?? null;
        if (!otherUserId) return;

        // Emit typing
        socket.emit('typing', { receiverId: otherUserId, conversationId: activeConvId });

        // Clear previous timeout and set new one for stop_typing
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            socket.emit('stop_typing', { receiverId: otherUserId, conversationId: activeConvId });
        }, 2000);
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!content.trim() || !activeConvId) return;

        const activeConv = conversations.find(c => c._id === activeConvId);
        const otherUserId = activeConv?.otherUser?._id ?? null;
        if (!otherUserId) return;

        // Stop typing indicator
        if (socket) {
            socket.emit('stop_typing', { receiverId: otherUserId, conversationId: activeConvId });
        }
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

        // Use Socket.io for real-time delivery
        if (socket && socket.connected) {
            setSending(true);
            socket.emit('private_message', {
                receiverId: otherUserId,
                content: content.trim(),
                senderId: user._id,
                senderName: user.name,
                senderAvatar: user.avatar,
            });
            // Optimistic UI: show message immediately
            setMessages(prev => [...prev, {
                _id: 'temp-' + Date.now(),
                conversationId: activeConvId,
                sender: { _id: user._id, name: user.name, avatar: user.avatar },
                receiver: { _id: otherUserId },
                content: content.trim(),
                isRead: false,
                createdAt: new Date(),
            }]);
            setContent('');
            setSending(false);

            // Update conversation list
            setConversations(prev => {
                const exists = prev.find(c => c._id === activeConvId);
                if (exists) {
                    return [exists, ...prev.filter(c => c._id !== activeConvId)].map(c =>
                        c._id === activeConvId
                            ? { ...c, lastMessage: { content: content.trim(), sender: user._id, createdAt: new Date() } }
                            : c
                    );
                }
                // Brand new conversation - create a placeholder
                return [{
                    _id: activeConvId,
                    lastMessage: { content: content.trim(), sender: user._id, createdAt: new Date() },
                    unreadCount: 0,
                    otherUser: { _id: otherUserId, name: 'Loading...', avatar: '' },
                }, ...prev];
            });
        } else {
            // Fallback to REST API if socket not connected
            setSending(true);
            try {
                const res = await messagesAPI.send({ receiverId: otherUserId, content: content.trim() });
                setMessages(prev => [...prev, { ...res.data.message, sender: { _id: user._id, name: user.name, avatar: user.avatar } }]);
                setContent('');
                setConversations(prev => prev.map(c =>
                    c._id === activeConvId
                        ? { ...c, lastMessage: res.data.message }
                        : c
                ));
            } catch (err) {
                toast.error('Message failed to send');
            } finally {
                setSending(false);
            }
        }
    };

    // Emit read receipt when opening a conversation
    useEffect(() => {
        if (!activeConvId || !socket) return;
        socket.emit('messages_read', { conversationId: activeConvId, readerId: user._id });
    }, [activeConvId, socket, user._id]);

    if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" /></div>;

    const activeConv = conversations.find(c => c._id === activeConvId);
    const otherUserId = activeConv?.otherUser?._id ?? null;
    const isOtherOnline = otherUserId ? onlineUsers[otherUserId] : false;

    return (
        <div className="min-h-[calc(100-80px)] h-[calc(100vh-80px)] flex flex-col md:flex-row bg-surface-50 overflow-hidden">
            {/* Sidebar: Conversations */}
            <div className={`w-full md:w-80 border-r border-primary-500/10 flex flex-col bg-white ${activeConvId ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 border-b border-primary-500/10">
                    <h1 className="font-display text-xl font-bold text-surface-950 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-primary-500" />
                        Messages
                    </h1>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {conversations.length === 0 ? (
                        <div className="p-8 text-center">
                            <MessageSquare className="w-12 h-12 text-surface-300 mx-auto mb-3" />
                            <p className="text-sm text-surface-700 font-medium">No conversations yet.</p>
                            <p className="text-xs text-surface-500 mt-1">Start chatting with listing owners!</p>
                        </div>
                    ) : (
                        conversations.map((c) => {
                            const otherId = c.otherUser?._id;
                            const isOnline = onlineUsers[otherId];
                            return (
                                <button
                                    key={c._id}
                                    onClick={() => setSearchParams({ id: c._id })}
                                    className={`w-full p-4 flex gap-3 hover:bg-primary-500/5 transition-all text-left border-b border-primary-500/5 ${activeConvId === c._id ? 'bg-primary-500/10' : ''}`}
                                >
                                    <div className="relative flex-shrink-0">
                                        <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-500 font-bold">
                                            {c.otherUser?.avatar ? (
                                                <img src={c.otherUser.avatar} className="w-12 h-12 rounded-xl object-cover" alt="" />
                                            ) : (
                                                c.otherUser?.name?.[0]?.toUpperCase()
                                            )}
                                        </div>
                                        {isOnline && (
                                            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-0.5">
                                            <p className="font-bold text-surface-950 truncate">{c.otherUser?.name}</p>
                                            <span className="text-[10px] text-surface-700 font-bold uppercase">{format(new Date(c.lastMessage.createdAt), 'HH:mm')}</span>
                                        </div>
                                        <p className={`text-xs truncate ${c.unreadCount > 0 ? 'font-bold text-surface-950' : 'text-surface-700 font-medium'}`}>
                                            {c.lastMessage.sender === user._id ? 'You: ' : ''}{c.lastMessage.content}
                                        </p>
                                    </div>
                                    {c.unreadCount > 0 && (
                                        <span className="w-5 h-5 rounded-full bg-primary-500 text-white text-[10px] font-bold flex items-center justify-center self-center">
                                            {c.unreadCount}
                                        </span>
                                    )}
                                </button>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className={`flex-1 flex flex-col bg-surface-50 ${!activeConvId ? 'hidden md:flex' : 'flex'}`}>
                {activeConvId ? (
                    <>
                        {/* Chat Header with real online status */}
                        <div className="p-4 bg-white border-b border-primary-500/10 flex items-center gap-3">
                            <button onClick={() => setSearchParams({})} className="md:hidden p-2 rounded-lg hover:bg-surface-100">
                                <ChevronLeft className="w-5 h-5 text-surface-800" />
                            </button>
                            <div className="relative">
                                <div className="w-10 h-10 rounded-xl bg-primary-500 text-white font-bold flex items-center justify-center shadow-lg shadow-primary-500/20">
                                    {activeConv?.otherUser?.avatar ? (
                                        <img src={activeConv.otherUser.avatar} className="w-10 h-10 rounded-xl object-cover" alt="" />
                                    ) : (
                                        activeConv?.otherUser?.name?.[0]?.toUpperCase()
                                    )}
                                </div>
                                {isOtherOnline && (
                                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
                                )}
                            </div>
                            <div>
                                <h2 className="font-bold text-surface-950">{activeConv?.otherUser?.name}</h2>
                                <p className={`text-[10px] font-bold uppercase tracking-wider ${isOtherOnline ? 'text-emerald-500' : 'text-surface-400'}`}>
                                    {typingUser ? (
                                        <span className="text-primary-500 animate-pulse">typing...</span>
                                    ) : isOtherOnline ? 'Online' : 'Offline'}
                                </p>
                            </div>
                        </div>

                        {/* Messages List */}
                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                            {msgLoading ? (
                                <div className="flex justify-center py-4"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500" /></div>
                            ) : (
                                messages.map((m, i) => {
                                    const isMe = m.sender?._id === user._id || m.sender === user._id;
                                    const showAvatar = i === 0 || messages[i - 1]?.sender?._id !== m.sender?._id;
                                    return (
                                        <div key={m._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${showAvatar ? 'mt-4' : 'mt-0.5'}`}>
                                            <div className={`max-w-[75%] rounded-2xl p-3 shadow-sm ${isMe
                                                ? 'bg-primary-500 text-white rounded-tr-none'
                                                : 'bg-white text-surface-950 rounded-tl-none border border-primary-500/10'
                                                }`}>
                                                {m.listing && (
                                                    <Link to={`/listings/${m.listing._id}`} className={`block mb-2 p-2 rounded-xl flex items-center gap-2 ${isMe ? 'bg-primary-600' : 'bg-surface-50'}`}>
                                                        <img src={m.listing.images?.[0]?.url} className="w-8 h-8 rounded-lg object-cover" alt="" />
                                                        <div className="text-[10px] font-bold truncate">Inquiry: {m.listing.title}</div>
                                                    </Link>
                                                )}
                                                <p className="text-sm font-medium leading-relaxed">{m.content}</p>
                                                <div className={`flex items-center gap-1 mt-1 justify-end ${isMe ? 'opacity-70' : 'opacity-50'}`}>
                                                    <p className="text-[10px] font-bold uppercase">
                                                        {format(new Date(m.createdAt), 'HH:mm')}
                                                    </p>
                                                    {isMe && (
                                                        m.isRead
                                                            ? <CheckCheck className="w-3.5 h-3.5" />
                                                            : <Check className="w-3.5 h-3.5" />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}

                            {/* Typing indicator bubble */}
                            {typingUser && (
                                <div className="flex justify-start">
                                    <div className="bg-white rounded-2xl rounded-tl-none border border-primary-500/10 px-4 py-3 shadow-sm">
                                        <div className="flex gap-1">
                                            <span className="w-2 h-2 bg-surface-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <span className="w-2 h-2 bg-surface-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <span className="w-2 h-2 bg-surface-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Chat Input */}
                        <form onSubmit={handleSend} className="p-4 bg-white border-t border-primary-500/10 flex gap-2 sm:gap-4">
                            <input
                                type="text"
                                value={content}
                                onChange={handleInputChange}
                                placeholder="Write your message..."
                                className="flex-1 px-4 py-3 rounded-2xl input-dark text-sm bg-surface-50 focus:bg-white transition-all border-primary-500/5 font-medium"
                                autoFocus
                            />
                            <button
                                type="submit"
                                disabled={sending || !content.trim()}
                                className="p-3 rounded-2xl btn-primary text-white shadow-lg shadow-primary-500/20 relative z-10 flex items-center justify-center disabled:opacity-50"
                            >
                                <Send className={`w-5 h-5 relative z-10 ${sending ? 'animate-pulse' : ''}`} />
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-surface-300">
                        <div className="w-20 h-20 rounded-full bg-primary-500/5 flex items-center justify-center mb-4">
                            <MessageSquare className="w-10 h-10 text-primary-500/20" />
                        </div>
                        <h2 className="text-xl font-bold text-surface-950 mb-2">Select a chat to start messaging</h2>
                        <p className="text-surface-700 font-medium max-w-xs">Connecting with owners and renters to finalize your rental details.</p>
                    </div>
                )}
            </div>
        </div>
    );
}