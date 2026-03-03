import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';

import Layout from './components/layout/Layout';
import HomePage from './pages/HomePage';
import ListingsPage from './pages/ListingsPage';
import ListingDetailPage from './pages/ListingDetailPage';
import CreateListingPage from './pages/CreateListingPage';
import EditListingPage from './pages/EditListingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import BookingsPage from './pages/BookingsPage';
import MyListingsPage from './pages/MyListingsPage';
import ProfilePage from './pages/ProfilePage';
import WishlistPage from './pages/WishlistPage';

function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50">
      <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function GuestRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  return isAuthenticated ? <Navigate to="/" replace /> : children;
}

export default function App() {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#fffcf2',
            color: '#4a4a4a',
            border: '1px solid rgba(222, 107, 107, 0.1)',
            borderRadius: '12px',
            fontSize: '14px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
          },
          success: { iconTheme: { primary: '#de6b6b', secondary: '#fffcf2' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fffcf2' } },
        }}
      />
      <Routes>
        {/* Public routes with layout */}
        <Route path="/" element={<Layout><HomePage /></Layout>} />
        <Route path="/listings" element={<Layout><ListingsPage /></Layout>} />

        {/* Auth routes (no layout, guest only) */}
        <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />

        {/* Private routes */}
        <Route path="/listings/new" element={<PrivateRoute><Layout><CreateListingPage /></Layout></PrivateRoute>} />
        <Route path="/listings/:id/edit" element={<PrivateRoute><Layout><EditListingPage /></Layout></PrivateRoute>} />
        <Route path="/listings/:id" element={<Layout><ListingDetailPage /></Layout>} />
        <Route path="/bookings" element={<PrivateRoute><Layout><BookingsPage /></Layout></PrivateRoute>} />
        <Route path="/my-listings" element={<PrivateRoute><Layout><MyListingsPage /></Layout></PrivateRoute>} />
        <Route path="/wishlist" element={<PrivateRoute><Layout><WishlistPage /></Layout></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><Layout><ProfilePage /></Layout></PrivateRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
