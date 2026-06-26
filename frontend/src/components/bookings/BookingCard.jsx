import { useState } from 'react';
import { Link } from 'react-router-dom';
import { paymentsAPI, reviewsAPI, disputesAPI } from '../../api';
import { initiatePayment } from '../../lib/razorpay';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import {
    Calendar, Star, ChevronDown, ChevronUp,
    Package, CheckCircle, XCircle, Clock, AlertTriangle, Loader2
} from 'lucide-react';

const statusConfig = {
    pending: { label: 'Pending', color: 'status-pending', icon: Clock },
    confirmed: { label: 'Confirmed', color: 'status-confirmed', icon: CheckCircle },
    active: { label: 'Active', color: 'status-active', icon: Package },
    completed: { label: 'Completed', color: 'status-completed', icon: CheckCircle },
    cancelled: { label: 'Cancelled', color: 'status-cancelled', icon: XCircle },
    rejected: { label: 'Rejected', color: 'status-rejected', icon: XCircle },
};

export default function BookingCard({ booking, onStatusUpdate, isOwner, onUpdate }) {
    const { user } = useAuth();
    const [reviewForm, setReviewForm] = useState({
        itemReview: { rating: 5, comment: '' },
        ownerReview: { rating: 5, comment: '' },
    });
    const [showReview, setShowReview] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [actionLoading, setActionLoading] = useState('');
    const [reviewLoading, setReviewLoading] = useState(false);
    const [showDispute, setShowDispute] = useState(false);
    const [disputeForm, setDisputeForm] = useState({ reason: '', description: '' });
    const [disputeLoading, setDisputeLoading] = useState(false);

    const cfg = statusConfig[booking.status] || statusConfig.pending;
    const StatusIcon = cfg.icon;

    const handleAction = async (status, note = '') => {
        try {
            setActionLoading(status);
            await bookingsAPI_updateStatus(booking._id, { status, note });
            toast.success(`Booking ${status}`);
            onStatusUpdate(booking._id, status);
            onUpdate?.();
        } catch (err) {
            toast.error(err.response?.data?.message || `Failed to ${status} booking`);
        } finally {
            setActionLoading('');
        }
    };

    // Inline bookingAPI status update to avoid circular import
    const bookingsAPI_updateStatus = async (id, data) => {
        const { default: api } = await import('../../api');
        return api.bookingsAPI.updateStatus(id, data);
    };

    const handleReview = async () => {
        try {
            setReviewLoading(true);
            await reviewsAPI.create(booking._id, {
                itemReview: reviewForm.itemReview,
                ownerReview: reviewForm.ownerReview,
            });
            toast.success('Review submitted! 🎉');
            setShowReview(false);
            onUpdate?.();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to submit review');
        } finally {
            setReviewLoading(false);
        }
    };

    const handleDispute = async () => {
        if (!disputeForm.reason || !disputeForm.description) {
            toast.error('Please fill in both reason and description');
            return;
        }
        try {
            setDisputeLoading(true);
            await disputesAPI.create({
                bookingId: booking._id,
                reason: disputeForm.reason,
                description: disputeForm.description,
            });
            toast.success('Dispute raised successfully');
            setShowDispute(false);
            setDisputeForm({ reason: '', description: '' });
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to raise dispute');
        } finally {
            setDisputeLoading(false);
        }
    };

    const handlePayment = async () => {
        try {
            setActionLoading('payment');
            await initiatePayment({
                bookingId: booking._id,
                user: user || booking.renter,
                listingTitle: booking.listing?.title,
                onDismiss: () => {
                    toast('Payment paused — you can complete it later.', {
                        icon: 'ℹ️',
                        duration: 4000,
                    });
                },
            });
            toast.success('Payment successful! 🎉');
            onStatusUpdate(booking._id, 'confirmed');
            onUpdate?.();
        } catch (err) {
            const msg = err?.message || 'Failed to initiate payment';
            // Don't show an error toast for "cancelled" — the onDismiss
            // toast already handled the informational message.
            if (!/cancelled|pay later/i.test(msg)) {
                toast.error(msg);
            }
        } finally {
            setActionLoading('');
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

                    {/* Raise Dispute button for completed/problematic rentals */}
                    {!isOwner && (booking.status === 'completed' || booking.status === 'active') && (
                        <button onClick={() => setShowDispute(!showDispute)} className="w-full py-2.5 rounded-xl text-sm font-bold border-2 border-amber-500/20 text-amber-600 hover:bg-amber-500/5 transition-all">
                            {showDispute ? 'Cancel' : '⚠️ Raise Dispute'}
                        </button>
                    )}

                    {/* Actions for renter — show Pay Now for both pending & confirmed unpaid bookings */}
                    {!isOwner && (booking.status === 'confirmed' || booking.status === 'pending') && booking.paymentStatus === 'unpaid' && (
                        <button onClick={handlePayment} disabled={actionLoading === 'payment'} className="w-full py-2.5 rounded-xl btn-primary text-sm font-bold relative z-10 shadow-lg shadow-primary-500/20 flex items-center justify-center gap-2">
                            {actionLoading === 'payment' ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin relative z-10" />
                                    <span className="relative z-10">Opening payment…</span>
                                </>
                            ) : (
                                <span className="relative z-10">💳 Pay Now ₹{booking.pricing?.totalAmount?.toLocaleString()}</span>
                            )}
                        </button>
                    )}
                    {!isOwner && booking.status === 'pending' && (
                        <button onClick={() => handleAction('cancelled', 'Cancelled by renter')} disabled={!!actionLoading} className="w-full py-2.5 rounded-xl text-sm font-bold border-2 border-red-500/20 text-red-500 hover:bg-red-500/5 transition-all">
                            {actionLoading === 'cancelled' ? 'Cancelling...' : 'Cancel Request'}
                        </button>
                    )}
                    {!isOwner && booking.status === 'completed' && !booking.hasReview && (
                        <button onClick={() => setShowReview(!showReview)} className="w-full py-2.5 rounded-xl btn-ghost text-sm font-bold text-primary-500 border-primary-500/10">
                            ⭐ Leave a Review
                        </button>
                    )}
                    {booking.hasReview && (
                        <div className="glass rounded-xl p-3 border border-primary-500/20 bg-primary-500/5">
                            <p className="text-xs text-primary-500 font-bold uppercase tracking-wider mb-1">Review Submitted</p>
                            <p className="text-sm text-surface-800 font-medium">You've reviewed this booking. Thank you!</p>
                        </div>
                    )}

                    {/* Dual Review form: Item + Owner */}
                    {showReview && (
                        <div className="glass rounded-xl p-4 space-y-4 border-primary-500/20 bg-white/60">
                            <p className="font-bold text-surface-950 text-sm">Rate both the item and the owner</p>

                            {/* Item Review Section */}
                            <div className="p-3 bg-surface-50 rounded-xl border border-surface-200 space-y-2">
                                <p className="text-xs font-bold text-surface-700 uppercase tracking-wider">About the Item</p>
                                <div className="flex gap-1.5">
                                    {[1, 2, 3, 4, 5].map(s => (
                                        <button key={'item-'+s} onClick={() => setReviewForm(f => ({ ...f, itemReview: { ...f.itemReview, rating: s } }))} className="transition-transform hover:scale-110">
                                            <Star className={`w-5 h-5 transition-colors ${s <= reviewForm.itemReview.rating ? 'star-filled' : 'star-empty'}`} fill={s <= reviewForm.itemReview.rating ? 'currentColor' : 'none'} />
                                        </button>
                                    ))}
                                    <span className="text-xs text-surface-500 font-medium self-center ml-1">{reviewForm.itemReview.rating}/5</span>
                                </div>
                                <textarea
                                    value={reviewForm.itemReview.comment}
                                    onChange={e => setReviewForm(f => ({ ...f, itemReview: { ...f.itemReview, comment: e.target.value } }))}
                                    placeholder="How was the item condition? Would you rent it again?"
                                    rows={2}
                                    maxLength={1000}
                                    className="w-full px-3 py-2 rounded-xl input-dark text-sm resize-none bg-white/80 focus:bg-white border-primary-500/10 transition-all font-medium"
                                />
                                <p className="text-right text-[10px] text-surface-400 font-medium">{reviewForm.itemReview.comment.length}/1000</p>
                            </div>

                            {/* Owner Review Section */}
                            <div className="p-3 bg-surface-50 rounded-xl border border-surface-200 space-y-2">
                                <p className="text-xs font-bold text-surface-700 uppercase tracking-wider">About the Owner</p>
                                <div className="flex gap-1.5">
                                    {[1, 2, 3, 4, 5].map(s => (
                                        <button key={'owner-'+s} onClick={() => setReviewForm(f => ({ ...f, ownerReview: { ...f.ownerReview, rating: s } }))} className="transition-transform hover:scale-110">
                                            <Star className={`w-5 h-5 transition-colors ${s <= reviewForm.ownerReview.rating ? 'star-filled' : 'star-empty'}`} fill={s <= reviewForm.ownerReview.rating ? 'currentColor' : 'none'} />
                                        </button>
                                    ))}
                                    <span className="text-xs text-surface-500 font-medium self-center ml-1">{reviewForm.ownerReview.rating}/5</span>
                                </div>
                                <textarea
                                    value={reviewForm.ownerReview.comment}
                                    onChange={e => setReviewForm(f => ({ ...f, ownerReview: { ...f.ownerReview, comment: e.target.value } }))}
                                    placeholder="How was your experience with the owner? Responsive and helpful?"
                                    rows={2}
                                    maxLength={1000}
                                    className="w-full px-3 py-2 rounded-xl input-dark text-sm resize-none bg-white/80 focus:bg-white border-primary-500/10 transition-all font-medium"
                                />
                                <p className="text-right text-[10px] text-surface-400 font-medium">{reviewForm.ownerReview.comment.length}/1000</p>
                            </div>

                            <div className="flex gap-2">
                                <button onClick={handleReview} disabled={reviewLoading} className="flex-1 py-2 rounded-xl btn-primary text-sm font-bold shadow-lg shadow-primary-500/20 relative z-10 disabled:opacity-60">
                                    <span className="relative z-10">{reviewLoading ? 'Submitting...' : 'Submit Review(s)'}</span>
                                </button>
                                <button onClick={() => setShowReview(false)} className="px-4 py-2 rounded-xl btn-ghost text-sm font-bold border-white/50">Cancel</button>
                            </div>
                        </div>
                    )}

                    {/* Dispute Form */}
                    {showDispute && (
                        <div className="glass rounded-xl p-4 space-y-4 border-amber-500/20 bg-amber-50/30">
                            <p className="font-bold text-surface-950 text-sm flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-500" />
                                Raise a Dispute
                            </p>
                            <div>
                                <label className="block text-xs font-bold text-surface-700 uppercase mb-1">Reason</label>
                                <select
                                    value={disputeForm.reason}
                                    onChange={e => setDisputeForm(f => ({ ...f, reason: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-xl input-dark text-sm bg-white/80"
                                >
                                    <option value="">Select a reason</option>
                                    <option value="item_not_as_described">Item not as described</option>
                                    <option value="item_damaged">Item arrived damaged</option>
                                    <option value="late_return">Late return by renter</option>
                                    <option value="owner_no_show">Owner did not provide item</option>
                                    <option value="quality_issue">Quality/condition issue</option>
                                    <option value="safety_concern">Safety concern</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-surface-700 uppercase mb-1">Description</label>
                                <textarea
                                    value={disputeForm.description}
                                    onChange={e => setDisputeForm(f => ({ ...f, description: e.target.value }))}
                                    placeholder="Describe the issue in detail..."
                                    rows={3}
                                    maxLength={1000}
                                    className="w-full px-3 py-2 rounded-xl input-dark text-sm resize-none bg-white/80"
                                />
                            </div>
                            <div className="flex gap-2">
                                <button onClick={handleDispute} disabled={disputeLoading} className="flex-1 py-2 rounded-xl bg-amber-500 text-white text-sm font-bold shadow-lg shadow-amber-500/20 disabled:opacity-60">
                                    {disputeLoading ? 'Submitting...' : 'Submit Dispute'}
                                </button>
                                <button onClick={() => setShowDispute(false)} className="px-4 py-2 rounded-xl btn-ghost text-sm font-bold border-white/50">Cancel</button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}