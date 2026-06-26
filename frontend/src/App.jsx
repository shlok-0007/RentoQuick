import { Routes, Route, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect, lazy, Suspense } from 'react';
import { useAuth } from './context/AuthContext';

import Layout from './components/layout/Layout';
import { ListingCardSkeleton } from './components/common/Skeleton';
import ScrollToTop from './components/common/ScrollToTop';
import { LanguageProvider, useLanguage } from './context/LanguageContext';

// ── Lazy-loaded pages (code-split per route) ──────────────────────────
const HomePage           = lazy(() => import('./pages/HomePage'));
const ListingsPage       = lazy(() => import('./pages/ListingsPage'));
const ListingDetailPage  = lazy(() => import('./pages/ListingDetailPage'));
const CreateListingPage  = lazy(() => import('./pages/CreateListingPage'));
const EditListingPage    = lazy(() => import('./pages/EditListingPage'));
const LoginPage          = lazy(() => import('./pages/LoginPage'));
const RegisterPage       = lazy(() => import('./pages/RegisterPage'));
const VerifyEmailPage    = lazy(() => import('./pages/VerifyEmailPage'));
const BookingsPage       = lazy(() => import('./pages/BookingsPage'));
const MyListingsPage     = lazy(() => import('./pages/MyListingsPage'));
const ProfilePage        = lazy(() => import('./pages/ProfilePage'));
const WishlistPage       = lazy(() => import('./pages/WishlistPage'));
const ChatPage           = lazy(() => import('./pages/ChatPage'));
const AdminDashboard     = lazy(() => import('./pages/AdminDashboard'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage  = lazy(() => import('./pages/ResetPasswordPage'));
const DisputesPage       = lazy(() => import('./pages/DisputesPage'));
const SavedSearchesPage  = lazy(() => import('./pages/SavedSearchesPage'));
const AnalyticsPage      = lazy(() => import('./pages/AnalyticsPage'));

// ── Shared loading fallback for Suspense ──────────────────────────────
function PageFallback() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-surface-50">
            <div className="w-full max-w-4xl px-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {Array(4).fill(0).map((_, i) => <ListingCardSkeleton key={i} />)}
                </div>
            </div>
        </div>
    );
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50">
      <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!user || user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

function PrivateRoute({ children }) {
  const { isAuthenticated, user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50">
      <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user && !user.isEmailVerified && window.location.pathname !== '/verify-email') {
    return <Navigate to="/verify-email" replace />;
  }
  return children;
}

function GuestRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  return isAuthenticated ? <Navigate to="/" replace /> : children;
}

// Captures referral code from URL (?ref=CODE) and persists in localStorage
globalThis.__referralCaptured = globalThis.__referralCaptured || false;
function ReferralCapture({ children }) {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref && !globalThis.__referralCaptured) {
      localStorage.setItem('rq_referral_code', ref.toUpperCase());
      globalThis.__referralCaptured = true;
    }
  }, [location.search, searchParams]);
  return children;
}

export default function App() {
  return (
    <LanguageProvider>
      <ReferralCapture>
      {/* Scroll to top on every route change — fixes the issue where
          navigating from Home's featured items left the listing page
          scrolled to the middle. */}
      <ScrollToTop />
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
      <Suspense fallback={<PageFallback />}>
      <Routes>
        {/* Public routes with layout */}
        <Route path="/" element={<Layout><HomePage /></Layout>} />
        <Route path="/listings" element={<Layout><ListingsPage /></Layout>} />
        <Route path="/listings/:id" element={<Layout><ListingDetailPage /></Layout>} />

        {/* Auth routes (no layout, guest only) */}
        <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
        <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />
        <Route path="/reset-password/:token" element={<GuestRoute><ResetPasswordPage /></GuestRoute>} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />

        {/* Private routes */}
        <Route path="/listings/new" element={<PrivateRoute><Layout><CreateListingPage /></Layout></PrivateRoute>} />
        <Route path="/listings/:id/edit" element={<PrivateRoute><Layout><EditListingPage /></Layout></PrivateRoute>} />
        <Route path="/bookings" element={<PrivateRoute><Layout><BookingsPage /></Layout></PrivateRoute>} />
        <Route path="/my-listings" element={<PrivateRoute><Layout><MyListingsPage /></Layout></PrivateRoute>} />
        <Route path="/wishlist" element={<PrivateRoute><Layout><WishlistPage /></Layout></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><Layout><ProfilePage /></Layout></PrivateRoute>} />
        <Route path="/messages" element={<PrivateRoute><Layout><ChatPage /></Layout></PrivateRoute>} />
        <Route path="/disputes" element={<PrivateRoute><Layout><DisputesPage /></Layout></PrivateRoute>} />
        <Route path="/saved-searches" element={<PrivateRoute><Layout><SavedSearchesPage /></Layout></PrivateRoute>} />
        <Route path="/admin" element={<AdminRoute><Layout><AdminDashboard /></Layout></AdminRoute>} />
        <Route path="/analytics" element={<PrivateRoute><Layout><AnalyticsPage /></Layout></PrivateRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
      </ReferralCapture>
    </LanguageProvider>
  );
}