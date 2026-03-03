import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('rq_token');
        const storedUser = localStorage.getItem('rq_user');
        if (token && storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (_) { }
        }
        setLoading(false);
    }, []);

    const login = useCallback(async (email, password) => {
        const res = await authAPI.login({ email, password });
        const { token, user } = res.data;
        localStorage.setItem('rq_token', token);
        localStorage.setItem('rq_user', JSON.stringify(user));
        setUser(user);
        return user;
    }, []);

    const register = useCallback(async (data) => {
        const res = await authAPI.register(data);
        const { token, user } = res.data;
        localStorage.setItem('rq_token', token);
        localStorage.setItem('rq_user', JSON.stringify(user));
        setUser(user);
        return user;
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('rq_token');
        localStorage.removeItem('rq_user');
        setUser(null);
    }, []);

    const updateUser = useCallback((updatedUser) => {
        setUser(updatedUser);
        localStorage.setItem('rq_user', JSON.stringify(updatedUser));
    }, []);

    const isAuthenticated = !!user;

    return (
        <AuthContext.Provider value={{ user, loading, isAuthenticated, login, register, logout, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};
