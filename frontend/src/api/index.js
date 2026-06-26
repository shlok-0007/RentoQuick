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
            // Only redirect if not already on login/register/forgot-password/reset-password
            const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email'];
            const isPublic = publicPaths.some(p => window.location.pathname.startsWith(p));
            if (!isPublic && window.location.pathname !== '/') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

// ──── Auth ────────────────────────────────────────────
export const authAPI = {
    register: (data) => api.post('/auth/register', data),
    login: (data) => api.post('/auth/login', data),
    googleLogin: (credential) => api.post('/auth/google', { credential }),
    verifyEmail: (data) => api.post('/auth/verify-email', data),
    resendOTP: (email) => api.post('/auth/resend-otp', { email }),
    forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
    resetPassword: (data) => api.post('/auth/reset-password', data),
    getMe: () => api.get('/auth/me'),
    updateProfile: (data) => api.put('/auth/me', data),
    changePassword: (data) => api.put('/auth/change-password', data),
    toggleWishlist: (listingId) => api.post(`/auth/wishlist/${listingId}`),
    uploadAvatar: (formData) => api.post('/auth/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
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
    getAvailability: (id, params) => api.get(`/listings/${id}/availability`, { params }),
    uploadImages: (formData) => api.post('/listings/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    searchLocations: (query) => api.get('/listings/locations/search', { params: { query } }),
    reverseGeocode: (lat, lon) => api.get('/listings/locations/reverse-geocode', { params: { lat, lon } }),
    // ── Verified view counter ──
    // POST /api/listings/:id/view  — idempotent within a session
    recordView: (id) => api.post(`/listings/${id}/view`),
};

// ──── Bookings ────────────────────────────────────────
export const bookingsAPI = {
    create: (data) => api.post('/bookings', data),
    getMy: (params) => api.get('/bookings/my', { params }),
    getReceived: (params) => api.get('/bookings/received', { params }),
    getOne: (id) => api.get(`/bookings/${id}`),
    updateStatus: (id, data) => api.put(`/bookings/${id}/status`, data),
    addReview: (id, data) => api.post(`/bookings/${id}/review`, data),
    getListingReviews: (listingId) => api.get(`/bookings/listing/${listingId}`),
    getBookedDates: (listingId) => api.get(`/bookings/listing/${listingId}/dates`),
};

// ──── Reviews ─────────────────────────────────────────
export const reviewsAPI = {
    create: (data) => api.post('/reviews', data),
    getListing: (id) => api.get(`/reviews/listing/${id}`),
    getUser: (id) => api.get(`/reviews/user/${id}`),
    respond: (id, comment) => api.put(`/reviews/${id}/respond`, { comment }),
    // ── Engagement: like / unlike a review ──
    like: (id) => api.put(`/reviews/${id}/like`),
    // ── Engagement: add a threaded reply ──
    reply: (id, comment) => api.post(`/reviews/${id}/replies`, { comment }),
};

// ──── Disputes ────────────────────────────────────────
export const disputesAPI = {
    raise: (data) => api.post('/disputes', data),
    getMy: () => api.get('/disputes/my'),
    getOne: (id) => api.get(`/disputes/${id}`),
    respond: (id, data) => api.put(`/disputes/${id}/respond`, data),
    resolve: (id, data) => api.put(`/disputes/${id}/resolve`, data),
    getAll: () => api.get('/disputes'),
};

// ──── Coupons ─────────────────────────────────────────
export const couponsAPI = {
    validate: (data) => api.post('/coupons/validate', data),
    getActive: () => api.get('/coupons/active'),
    getReferral: () => api.get('/coupons/referral'),
};

// ──── Saved Searches ──────────────────────────────────
export const savedSearchesAPI = {
    save: (data) => api.post('/saved-searches', data),
    getAll: () => api.get('/saved-searches'),
    delete: (id) => api.delete(`/saved-searches/${id}`),
    toggleAlert: (id) => api.put(`/saved-searches/${id}/alert`),
};

// ──── Push ────────────────────────────────────────────
export const pushAPI = {
    subscribe: (subscription) => api.post('/push/subscribe', { subscription }),
    unsubscribe: (endpoint) => api.delete('/push/unsubscribe', { data: { endpoint } }),
};

// ──── Payments ────────────────────────────────────────
export const paymentsAPI = {
    createOrder: (bookingId) => api.post('/payments/create-order', { bookingId }),
    verify: (data) => api.post('/payments/verify', data)
};

export const adminAPI = {
    getStats: () => api.get('/admin/stats'),
    getUsers: () => api.get('/admin/users'),
    getListings: () => api.get('/admin/listings'),
    approveListing: (id) => api.patch(`/admin/listings/${id}/approve`),
    deleteListing: (id) => api.delete(`/admin/listings/${id}`),
    suspendUser: (id) => api.patch(`/admin/users/${id}/suspend`),
    activateUser: (id) => api.patch(`/admin/users/${id}/activate`),
    getRevenue: (params) => api.get('/admin/revenue', { params }),
    getBookings: () => api.get('/admin/bookings'),
};

export const analyticsAPI = {
    getOwner: () => api.get('/analytics/owner')
};

// ──── Products (Smart Suggestion) ───────────────────
export const productsAPI = {
    search: (query) => api.get('/products/search', { params: { q: query } }),
    verify: (data) => api.post('/products/verify', data),
};

// ──── AI Auto-Fill Suggestions ────────────────────
export const aiAPI = {
    suggest: (productTitle) => api.post('/ai/suggest', { productTitle }, { timeout: 25000 }),
};

export const messagesAPI = {
    send: (data) => api.post('/messages', data),
    getConversations: () => api.get('/messages/conversations'),
    getMessages: (conversationId) => api.get(`/messages/${conversationId}`),
};

export const notificationsAPI = {
    getAll: () => api.get('/notifications'),
    markAllRead: () => api.put('/notifications/read-all'),
    markRead: (id) => api.put(`/notifications/${id}/read`),
};

export default api;
