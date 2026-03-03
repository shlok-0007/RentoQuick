import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    headers: { 'Content-Type': 'application/json' },
    timeout: 15000,
});

// Attach token to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('rq_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// Handle auth errors globally
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('rq_token');
            localStorage.removeItem('rq_user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// ──── Auth ────────────────────────────────────────────
export const authAPI = {
    register: (data) => api.post('/auth/register', data),
    login: (data) => api.post('/auth/login', data),
    getMe: () => api.get('/auth/me'),
    updateProfile: (data) => api.put('/auth/me', data),
    changePassword: (data) => api.put('/auth/change-password', data),
    toggleWishlist: (listingId) => api.post(`/auth/wishlist/${listingId}`),
    getPublicProfile: (id) => api.get(`/auth/users/${id}`),
};

// ──── Listings ────────────────────────────────────────
export const listingsAPI = {
    getAll: (params) => api.get('/listings', { params }),
    getFeatured: () => api.get('/listings/featured'),
    getMy: () => api.get('/listings/my'),
    getOne: (id) => api.get(`/listings/${id}`),
    create: (data) => api.post('/listings', data),
    update: (id, data) => api.put(`/listings/${id}`, data),
    delete: (id) => api.delete(`/listings/${id}`),
    getAvailability: (id) => api.get(`/listings/${id}/availability`),
};

// ──── Bookings ────────────────────────────────────────
export const bookingsAPI = {
    create: (data) => api.post('/bookings', data),
    getMy: (params) => api.get('/bookings/my', { params }),
    getReceived: (params) => api.get('/bookings/received', { params }),
    getOne: (id) => api.get(`/bookings/${id}`),
    updateStatus: (id, data) => api.put(`/bookings/${id}/status`, data),
    addReview: (id, data) => api.post(`/bookings/${id}/review`, data),
};

export default api;
