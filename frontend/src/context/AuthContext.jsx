import { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { authAPI, notificationsAPI, pushAPI } from '../api';
import io from 'socket.io-client';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [socket, setSocket] = useState(null);
    const [notifications, setNotifications] = useState([]);

    const fetchNotifications = async () => {
        try {
            const res = await notificationsAPI.getAll();
            setNotifications(res.data.notifications || []);
        } catch {
            // ignore - user might not be authenticated
        }
    };

    // Subscribes user to push notifications using browser navigator
    const subscribeToPush = useCallback(async () => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();

            if (!subscription) {
                // If VAPID_PUBLIC_KEY is not set yet, this will fail gracefully
                const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
                if (!vapidPublicKey) return;

                const newSubscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: vapidPublicKey
                });
                await pushAPI.subscribe(newSubscription);
            }
        } catch (err) {
            console.error('Push notification subscription failed:', err);
        }
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('rq_token');
        const storedUser = localStorage.getItem('rq_user');
        if (token && storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                setUser(parsedUser);
                initSocket(parsedUser._id);
                fetchNotifications();
                subscribeToPush();
            } catch (_) { }
        }
        setLoading(false);
    }, [subscribeToPush]);

    const initSocket = (userId) => {
        const token = localStorage.getItem('rq_token');
        const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
            auth: { token }
        });
        newSocket.emit('join', userId);

        newSocket.on('notification', (notif) => {
            setNotifications(prev => [notif, ...prev]);
            toast(notif.title, {
                icon: '🔔',
                duration: 5000,
            });
        });

        setSocket(newSocket);
    };

    const login = useCallback(async (email, password) => {
        const res = await authAPI.login({ email, password });
        const { token, user } = res.data;
        localStorage.setItem('rq_token', token);
        localStorage.setItem('rq_user', JSON.stringify(user));
        setUser(user);
        initSocket(user._id);
        fetchNotifications();
        subscribeToPush();
        return { user, requiresVerification: !user.isEmailVerified };
    }, [subscribeToPush]);

    const googleLogin = useCallback(async (credential) => {
        const res = await authAPI.googleLogin(credential);
        const { token, user } = res.data;
        localStorage.setItem('rq_token', token);
        localStorage.setItem('rq_user', JSON.stringify(user));
        setUser(user);
        initSocket(user._id);
        fetchNotifications();
        subscribeToPush();
        return user;
    }, [subscribeToPush]);

    const register = useCallback(async (data) => {
        const res = await authAPI.register(data);
        const { email } = res.data;
        return { email };
    }, []);

    const verifyEmail = useCallback(async (email, otp) => {
        const res = await authAPI.verifyEmail({ email, otp });
        const { token, user } = res.data;
        localStorage.setItem('rq_token', token);
        localStorage.setItem('rq_user', JSON.stringify(user));
        setUser(user);
        initSocket(user._id);
        fetchNotifications();
        subscribeToPush();
        return user;
    }, [subscribeToPush]);

    const logout = useCallback(() => {
        if (socket) socket.disconnect();
        localStorage.removeItem('rq_token');
        localStorage.removeItem('rq_user');
        setUser(null);
        setSocket(null);
        setNotifications([]);
    }, [socket]);

    const updateUser = useCallback((updatedUser) => {
        setUser(updatedUser);
        localStorage.setItem('rq_user', JSON.stringify(updatedUser));
    }, []);

    const clearNotifications = useCallback(async () => {
        setNotifications([]);
        try {
            await notificationsAPI.markAllRead();
        } catch { }
    }, []);

    const isAuthenticated = !!user;

    return (
        <AuthContext.Provider value={{
            user, loading, isAuthenticated, login, googleLogin, register, verifyEmail, logout, updateUser,
            notifications, setNotifications, clearNotifications, socket
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};
