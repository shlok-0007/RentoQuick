import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { bookingsAPI } from '../api';
import { BookingCardSkeleton } from '../components/common/Skeleton';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import {
    BookOpen, Calendar, MapPin, Star, ChevronDown, ChevronUp,
    Package, CheckCircle, XCircle, Clock, AlertCircle
} from 'lucide-react';

const STATUS_TABS = ['all', 'pending', 'confirmed', 'active', 'completed', 'cancelled'];

const statusConfig = {
    pending: { label: 'Pending', color: 'status-pending', icon: Clock },
    confirmed: { label: 'Confirmed', color: 'status-confirmed', icon: CheckCircle },
    active: { label: 'Active', color: 'status-active', icon: Package },
    completed: { label: 'Completed', color: 'status-completed', icon: CheckCircle },
    cancelled: { label: 'Cancelled', color: 'status-cancelled', icon: XCircle },
    rejected: { label: 'Rejected', color: 'status-rejected', icon: XCircle },
};

function BookingCard({ booking, onStatusUpdate, isOwner }) {
    const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
    const [showReview, setShowReview] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [actionLoading, setActionLoading] = useState('');

    const cfg = statusConfig[booking.status] || statusConfig.pending;
    const StatusIcon = cfg.icon;

    const handleAction = async (status, note = '') => {
        try {
            setActionLoading(status);
            await bookingsAPI.updateStatus(booking._id, { status, note });
            onStatusUpdate(booking._id, status);
            toast.success(`Booking ${status}`);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Action failed');
        } finally {
            setActionLoading('');
        }
    };

    const handleReview = async () => {
        try {
            await bookingsAPI.addReview(booking._id, reviewForm);
            toast.success('Review submitted! ⭐');
            setShowReview(false);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Review failed');
        }
    };

    const imgUrl = booking.listing?.images?.[0]?.url || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=200';

    return (
        <div className="glass rounded-2xl overflow-hidden border-white/50 shadow-xl">
            {/* Main info */}
            <div className="p-5 flex gap-4">
                <img
                    src={imgUrl}
                    alt={booking.listing?.title}
                    className="w-24 h-20 rounded-xl object-cover flex-shrink-0 shadow-sm"
                    onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=200'; }}
                />
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <Link to={`/listings/${booking.listing?.slug || booking.listing?._id}`} className="font-bold text-surface-950 hover:text-primary-500 transition-colors line-clamp-1">
                                {booking.listing?.title}
                            </Link>
                            <p className="text-xs text-surface-800 font-bold uppercase tracking-wider mt-0.5">{booking.listing?.category}</p>
                        </div>
                        <span className={`badge flex-shrink-0 shadow-sm font-bold uppercase tracking-wider ${cfg.color}`}>
                            <StatusIcon className="w-3 h-3 mr-1 inline" />
                            {cfg.label}
                        </span>
                    </div>

                    <div className="flex flex-wrap gap-3 mt-2">
                        <span className="flex items-center gap-1 text-xs text-surface-800 font-medium">
                            <Calendar className="w-3 h-3 text-primary-500" />
                            {format(new Date(booking.startDate), 'MMM d')} — {format(new Date(booking.endDate), 'MMM d, yyyy')}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-surface-800 font-medium">
                            <Clock className="w-3 h-3 text-primary-500" />
                            {booking.totalDays} day{booking.totalDays > 1 ? 's' : ''}
                        </span>
                        {isOwner ? (
                            <span className="text-xs text-surface-800 font-medium">Renter: <span className="text-surface-950 font-bold">{booking.renter?.name}</span></span>
                        ) : (
                            <span className="text-xs text-surface-800 font-medium">Owner: <span className="text-surface-950 font-bold">{booking.owner?.name}</span></span>
                        )}
                    </div>

                    <div className="flex items-center justify-between mt-3">
                        <span className="font-bold text-surface-950">₹{booking.pricing?.totalAmount?.toLocaleString()}</span>
                        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-xs font-bold text-surface-700 hover:text-primary-500 transition-colors">
                            {expanded ? <><ChevronUp className="w-3.5 h-3.5" /> Less</> : <><ChevronDown className="w-3.5 h-3.5" /> Details</>}
                        </button>
                    </div>
                </div>
            </div>

            {/* Expanded details */}
            {expanded && (
                <div className="border-t border-primary-500/10 p-5 space-y-4 bg-primary-500/5">
                    {/* Pricing breakdown */}
                    <div className="glass rounded-xl p-4 space-y-2 text-sm border-white/50 bg-white/40">
                        <p className="font-bold text-surface-950 mb-2">Price Breakdown</p>
                        <div className="flex justify-between text-surface-800 font-medium">
                            <span>₹{booking.pricing?.pricePerDay}/day × {booking.totalDays} days</span>
                            <span>₹{booking.pricing?.subtotal?.toLocaleString()}</span>
                        </div>
                        {booking.pricing?.securityDeposit > 0 && (
                            <div className="flex justify-between text-surface-700 font-medium">
                                <span>Security Deposit</span><span>₹{booking.pricing.securityDeposit.toLocaleString()}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-surface-700 font-medium">
                            <span>Platform Fee</span><span>₹{booking.pricing?.platformFee?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between font-bold text-surface-950 border-t border-primary-500/10 pt-2">
                            <span>Total</span><span>₹{booking.pricing?.totalAmount?.toLocaleString()}</span>
                        </div>
                    </div>

                    {/* Actions for owner */}
                    {isOwner && booking.status === 'pending' && (
                        <div className="flex gap-3">
                            <button onClick={() => handleAction('confirmed')} disabled={!!actionLoading} className="flex-1 py-2.5 rounded-xl btn-primary text-sm font-semibold relative z-10 disabled:opacity-60 shadow-lg shadow-primary-500/20">
                                <span className="relative z-10">{actionLoading === 'confirmed' ? 'Confirming...' : '✓ Accept'}</span>
                            </button>
                            <button onClick={() => handleAction('rejected', 'Not available on those dates')} disabled={!!actionLoading} className="flex-1 py-2.5 rounded-xl text-sm font-bold border-2 border-red-500/20 text-red-500 hover:bg-red-500/5 transition-all disabled:opacity-60">
                                {actionLoading === 'rejected' ? 'Rejecting...' : '✗ Decline'}
                            </button>
                        </div>
                    )}
                    {isOwner && booking.status === 'confirmed' && (
                        <button onClick={() => handleAction('active', 'Item handed over')} disabled={!!actionLoading} className="w-full py-2.5 rounded-xl btn-primary text-sm font-semibold relative z-10 shadow-lg shadow-primary-500/20">
                            <span className="relative z-10">{actionLoading === 'active' ? '...' : '📦 Mark as Active'}</span>
                        </button>
                    )}
                    {isOwner && booking.status === 'active' && (
                        <button onClick={() => handleAction('completed', 'Item returned successfully')} disabled={!!actionLoading} className="w-full py-2.5 rounded-xl bg-primary-100 border border-primary-500/20 text-primary-900 text-sm font-bold hover:bg-primary-200 transition-all shadow-sm">
                            {actionLoading === 'completed' ? '...' : '✅ Mark Completed'}
                        </button>
                    )}

                    {/* Actions for renter */}
                    {!isOwner && booking.status === 'pending' && (
                        <button onClick={() => handleAction('cancelled', 'Cancelled by renter')} disabled={!!actionLoading} className="w-full py-2.5 rounded-xl text-sm font-bold border-2 border-red-500/20 text-red-500 hover:bg-red-500/5 transition-all">
                            {actionLoading === 'cancelled' ? 'Cancelling...' : 'Cancel Request'}
                        </button>
                    )}
                    {!isOwner && booking.status === 'completed' && !booking.review && (
                        <button onClick={() => setShowReview(!showReview)} className="w-full py-2.5 rounded-xl btn-ghost text-sm font-bold text-primary-500 border-primary-500/10">
                            ⭐ Leave a Review
                        </button>
                    )}
                    {booking.review && (
                        <div className="glass rounded-xl p-3 border border-primary-500/20 bg-primary-500/5">
                            <p className="text-xs text-primary-500 font-bold uppercase tracking-wider mb-1">Your Review</p>
                            <div className="flex items-center gap-1 mb-1">
                                {[1, 2, 3, 4, 5].map(s => <Star key={s} className={`w-3.5 h-3.5 ${s <= booking.review.rating ? 'star-filled' : 'star-empty'}`} fill={s <= booking.review.rating ? 'currentColor' : 'none'} />)}
                            </div>
                            <p className="text-sm text-surface-800 font-medium">{booking.review.comment}</p>
                        </div>
                    )}

                    {/* Review form */}
                    {showReview && (
                        <div className="glass rounded-xl p-4 space-y-3 border-primary-500/20 bg-white/60">
                            <p className="font-bold text-surface-950 text-sm">Write your review</p>
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map(s => (
                                    <button key={s} onClick={() => setReviewForm(f => ({ ...f, rating: s }))}>
                                        <Star className={`w-6 h-6 transition-colors ${s <= reviewForm.rating ? 'star-filled' : 'star-empty'}`} fill={s <= reviewForm.rating ? 'currentColor' : 'none'} />
                                    </button>
                                ))}
                            </div>
                            <textarea value={reviewForm.comment} onChange={e => setReviewForm(f => ({ ...f, comment: e.target.value }))} placeholder="Share your experience..." rows={3} className="w-full px-3 py-2.5 rounded-xl input-dark text-sm resize-none bg-white/80 focus:bg-white border-primary-500/10 transition-all font-medium" />
                            <div className="flex gap-2">
                                <button onClick={handleReview} className="flex-1 py-2 rounded-xl btn-primary text-sm font-bold shadow-lg shadow-primary-500/20 relative z-10">
                                    <span className="relative z-10">Submit Review</span>
                                </button>
                                <button onClick={() => setShowReview(false)} className="px-4 py-2 rounded-xl btn-ghost text-sm font-bold border-white/50">Cancel</button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function BookingsPage() {
    const [tab, setTab] = useState('my');
    const [statusFilter, setStatusFilter] = useState('all');
    const [myBookings, setMyBookings] = useState([]);
    const [receivedBookings, setReceivedBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        const params = statusFilter !== 'all' ? { status: statusFilter } : {};
        const fetcher = tab === 'my' ? bookingsAPI.getMy(params) : bookingsAPI.getReceived(params);
        fetcher
            .then(res => {
                const bookings = res.data.bookings || [];
                if (tab === 'my') setMyBookings(bookings);
                else setReceivedBookings(bookings);
            })
            .catch(() => toast.error('Failed to load bookings'))
            .finally(() => setLoading(false));
    }, [tab, statusFilter]);

    const handleStatusUpdate = (id, newStatus) => {
        const setter = tab === 'my' ? setMyBookings : setReceivedBookings;
        setter(prev => prev.map(b => b._id === id ? { ...b, status: newStatus } : b));
    };

    const bookings = tab === 'my' ? myBookings : receivedBookings;

    return (
        <div className="min-h-screen py-8 px-4">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="font-display text-3xl font-bold text-surface-950">Bookings</h1>
                        <p className="text-surface-800 text-sm mt-1 font-medium">{bookings.length} booking{bookings.length !== 1 ? 's' : ''}</p>
                    </div>
                </div>

                {/* Main tabs */}
                <div className="flex gap-2 mb-6 glass rounded-xl p-1.5 w-fit border-white/50 shadow-sm bg-white/40">
                    {['my', 'received'].map((t) => (
                        <button
                            key={t}
                            onClick={() => { setTab(t); setStatusFilter('all'); }}
                            className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${tab === t ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20' : 'text-surface-700 hover:text-primary-500'}`}
                        >
                            {t === 'my' ? '📦 My Rentals' : '🏠 Received'}
                        </button>
                    ))}
                </div>

                {/* Status filter */}
                <div className="flex flex-wrap gap-2 mb-6">
                    {STATUS_TABS.map(s => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all border-2 ${statusFilter === s ? 'bg-primary-500/10 text-primary-900 border-primary-500/20 shadow-sm' : 'glass text-surface-700 border-white/50 hover:bg-white/60'
                                }`}
                        >
                            {s === 'all' ? 'All' : s}
                        </button>
                    ))}
                </div>

                {/* Booking list */}
                {loading ? (
                    <div className="space-y-4">
                        {Array(3).fill(0).map((_, i) => <BookingCardSkeleton key={i} />)}
                    </div>
                ) : bookings.length === 0 ? (
                    <div className="text-center py-20 glass rounded-3xl border-white/50 shadow-xl">
                        <BookOpen className="w-14 h-14 text-primary-300 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-surface-950 mb-2">No bookings yet</h3>
                        <p className="text-surface-800 mb-6 font-medium">
                            {tab === 'my' ? 'Browse listings and book your first item!' : 'List an item to start receiving bookings.'}
                        </p>
                        <Link to={tab === 'my' ? '/listings' : '/listings/new'} className="inline-flex items-center gap-2 btn-primary px-6 py-3 rounded-xl font-semibold relative z-10 shadow-lg shadow-primary-500/20">
                            <span className="relative z-10">{tab === 'my' ? 'Browse Listings' : 'List an Item'}</span>
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {bookings.map(b => (
                            <BookingCard key={b._id} booking={b} onStatusUpdate={handleStatusUpdate} isOwner={tab === 'received'} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
