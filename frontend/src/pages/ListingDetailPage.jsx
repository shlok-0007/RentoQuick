import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { listingsAPI, bookingsAPI, reviewsAPI, couponsAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getHeroUrl, getGalleryUrl, getDetailUrl } from '../lib/cloudinary';
import { initiatePayment } from '../lib/razorpay';
import toast from 'react-hot-toast';
import {
    MapPin, Star, Clock, Shield, ChevronLeft, ChevronRight,
    User, Tag, CheckCircle, AlertCircle, Calendar, Package,
    Heart, Share2, MessageCircle, Zap, MessageSquare, Ticket, Loader2,
    ThumbsUp, Send, X, Eye, CreditCard, Lock
} from 'lucide-react';
import { format, differenceInCalendarDays } from 'date-fns';
import AvailabilityCalendar from '../components/listing/AvailabilityCalendar';
import ImageLightbox from '../components/common/ImageLightbox';

function StarRating({ rating, count }) {
    return (
        <div className="flex items-center gap-2">
            <div className="flex">
                {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={`w-4 h-4 ${s <= Math.round(rating) ? 'text-amber-400' : 'text-surface-200'}`} fill={s <= Math.round(rating) ? 'currentColor' : 'none'} />
                ))}
            </div>
            <span className="text-sm text-surface-600 font-bold">{rating} <span className="text-surface-400 font-medium">({count} reviews)</span></span>
        </div>
    );
}

export default function ListingDetailPage() {
    const { id } = useParams();
    const { isAuthenticated, user } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();

    const [listing, setListing] = useState(null);
    const [loading, setLoading] = useState(true);
    const [reviews, setReviews] = useState([]);
    const [reviewsLoading, setReviewsLoading] = useState(true);
    const [bookedDates, setBookedDates] = useState([]);
    const [imgIdx, setImgIdx] = useState(0);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [discountAmt, setDiscountAmt] = useState(0);
    const [validatingCoupon, setValidatingCoupon] = useState(false);
    const [bookingLoading, setBookingLoading] = useState(false);
    // Tracks the human-readable phase of the booking+payment flow so the
    // button can show granular feedback ("Creating booking…", "Opening payment…",
    // "Verifying payment…"). Empty string = idle.
    const [bookingPhase, setBookingPhase] = useState('');

    // ── Lightbox state ──
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIdx, setLightboxIdx] = useState(0);

    // ── Review engagement state ──
    // Tracks which review the user is currently writing a reply for.
    // null = no reply box open. Stores the review _id.
    const [replyingTo, setReplyingTo] = useState(null);
    const [replyText, setReplyText] = useState('');
    // Tracks reviews whose like button is currently in-flight (for spinner/disabled)
    const [likingIds, setLikingIds] = useState(new Set());
    const [replyingSubmitting, setReplyingSubmitting] = useState(false);

    // Ref to record view only once per session for this listing
    const viewRecordedRef = useRef(false);

    const fetchListingData = useCallback(async () => {
        try {
            const [listingRes, reviewsRes, bookedRes] = await Promise.all([
                listingsAPI.getOne(id),
                reviewsAPI.getListing(id),
                bookingsAPI.getBookedDates(id)
            ]);
            setListing(listingRes.data.listing);
            setReviews(reviewsRes.data.reviews);
            setBookedDates(bookedRes.data.dates);
        } catch (err) {
            navigate('/listings');
        } finally {
            setLoading(false);
            setReviewsLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => {
        fetchListingData();
    }, [fetchListingData]);

    // ── Fix: force scroll to top on mount/id change ──
    // This is a defensive duplicate of the global <ScrollToTop/> in App.jsx —
    // kept here so that even if the global one is removed, navigation from
    // the Home page's featured items still lands at the top of the listing.
    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }, [id]);

    // ── Verified view counter ──
    // Call POST /api/listings/:id/view exactly once per browser session per
    // listing. The backend further dedupes by user id (logged-in) or a 24h
    // fingerprint (anonymous), so refreshes on the same page do NOT inflate
    // the count. We use sessionStorage so the counter can tick again the
    // next time the user opens a fresh session.
    useEffect(() => {
        if (viewRecordedRef.current) return;
        viewRecordedRef.current = true;

        const key = `rq_viewed_${id}`;
        if (sessionStorage.getItem(key)) return;
        sessionStorage.setItem(key, '1');

        listingsAPI.recordView(id)
            .then((res) => {
                // Optimistically update the local listing's view count
                // so the UI shows the new number immediately.
                if (res?.data?.counted && res.data.views !== undefined) {
                    setListing((prev) => prev ? { ...prev, views: res.data.views } : prev);
                }
            })
            .catch(() => { /* silent — view counting is best-effort */ });
    }, [id]);

    // ── Lightbox handlers ──
    const openLightbox = useCallback((idx = imgIdx) => {
        setLightboxIdx(idx);
        setLightboxOpen(true);
    }, [imgIdx]);

    const closeLightbox = useCallback(() => setLightboxOpen(false), []);

    // ── Review engagement handlers ──
    const handleLike = async (reviewId) => {
        if (!isAuthenticated) {
            toast.error('Please sign in to like reviews');
            return;
        }
        setLikingIds((prev) => new Set(prev).add(reviewId));
        try {
            const res = await reviewsAPI.like(reviewId);
            // Update the local reviews array
            setReviews((prev) => prev.map((r) => {
                if (r._id !== reviewId) return r;
                const userIdStr = String(user._id);
                let newLikes;
                if (res.data.liked) {
                    // Add user id if not already present
                    newLikes = (r.likes || []).some((u) => String(u) === userIdStr)
                        ? r.likes
                        : [...(r.likes || []), user._id];
                } else {
                    newLikes = (r.likes || []).filter((u) => String(u) !== userIdStr);
                }
                return { ...r, likes: newLikes };
            }));
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not like review');
        } finally {
            setLikingIds((prev) => {
                const next = new Set(prev);
                next.delete(reviewId);
                return next;
            });
        }
    };

    const handleReply = async (reviewId) => {
        if (!isAuthenticated) {
            toast.error('Please sign in to reply');
            return;
        }
        if (!replyText.trim()) {
            toast.error('Reply cannot be empty');
            return;
        }
        setReplyingSubmitting(true);
        try {
            const res = await reviewsAPI.reply(reviewId, replyText.trim());
            // Replace the review in the local list with the updated one returned by the API
            setReviews((prev) => prev.map((r) =>
                r._id === reviewId ? res.data.review : r
            ));
            setReplyText('');
            setReplyingTo(null);
            toast.success('Reply posted');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not post reply');
        } finally {
            setReplyingSubmitting(false);
        }
    };

    const hasLiked = (review) => {
        if (!user?._id) return false;
        return (review.likes || []).some((u) => String(u) === String(user._id));
    };

    const totalDays = startDate && endDate
        ? Math.max(0, differenceInCalendarDays(new Date(endDate), new Date(startDate)))
        : 0;

    const subtotal = totalDays * (listing?.pricePerDay || 0);
    const platformFee = Math.round(subtotal * 0.1 * 100) / 100;
    const totalBeforeCoupon = subtotal + (listing?.securityDeposit || 0) + platformFee;
    const finalTotal = totalBeforeCoupon - discountAmt;

    const handleApplyCoupon = async () => {
        if (!couponCode) return;
        setValidatingCoupon(true);
        try {
            const res = await couponsAPI.validate({ code: couponCode, bookingAmount: subtotal });
            setAppliedCoupon(res.data.coupon);
            setDiscountAmt(res.data.discount);
            toast.success(`Coupon applied! ₹${res.data.discount} saved.`);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Invalid coupon');
        } finally {
            setValidatingCoupon(false);
        }
    };

    const handleBook = async () => {
        if (!isAuthenticated) { navigate('/login'); return; }
        if (!startDate || !endDate) { toast.error('Please select rental dates'); return; }
        if (totalDays < (listing?.availability?.minRentalDays || 1)) {
            toast.error(`Minimum rental is ${listing?.availability?.minRentalDays} day(s)`);
            return;
        }

        let createdBookingId = null;
        try {
            setBookingLoading(true);

            // ── Step 1: create the booking (status 'pending', payment 'unpaid') ──
            setBookingPhase('Creating booking…');
            const bookingRes = await bookingsAPI.create({
                listingId: listing._id,
                startDate,
                endDate,
                couponCode: appliedCoupon?.code,
                paymentMethod: 'online',
            });
            createdBookingId = bookingRes.data.booking._id;

            // ── Step 2: initiate Razorpay payment ──
            setBookingPhase('Opening payment…');
            const paymentResult = await initiatePayment({
                bookingId: createdBookingId,
                user,
                listingTitle: listing.title,
                onDismiss: () => {
                    // User closed the modal without paying. The booking
                    // still exists in 'pending'/'unpaid' state — they can
                    // pay later from the Bookings page.
                    toast('You can complete the payment later from your Bookings page.', {
                        icon: 'ℹ️',
                        duration: 5000,
                    });
                },
            });

            // ── Step 3: success — verify endpoint already updated the booking ──
            setBookingPhase('Verifying…');
            toast.success(`Payment successful! Booking confirmed. 🎉`);
            navigate('/bookings');
            return paymentResult;
        } catch (err) {
            const msg = err?.message || err?.response?.data?.message || 'Booking failed';
            // Distinguish "user dismissed the payment modal" (informational)
            // from actual errors (which need a red toast).
            if (/cancelled|pay later/i.test(msg)) {
                // Already toasted via onDismiss; just navigate to bookings so
                // the user can see their unpaid booking and retry.
                if (createdBookingId) {
                    setTimeout(() => navigate('/bookings'), 200);
                }
            } else {
                toast.error(msg);
            }
        } finally {
            setBookingLoading(false);
            setBookingPhase('');
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-primary-500" />
        </div>
    );

    if (!listing) return null;

    const isOwner = user?._id === listing.owner?._id;
    const images = listing.images?.length ? listing.images : [{ url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800', alt: listing.title }];

    return (
        <div className="min-h-screen py-8 px-4 max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-3 gap-12">
                {/* Left side: Content */}
                <div className="lg:col-span-2 space-y-10">
                    {/* Gallery */}
                    {/*
                      Image container — clean, aspect-ratio-based layout.
                      - `aspect-[4/3]` keeps the box proportional on every
                        screen size (no more awkward 500px-tall box on mobile).
                      - `bg-white` is the simplest, cleanest backdrop for
                        letterboxed product photos.
                      - `p-2 sm:p-4` gives the image breathing room so it
                        never touches the rounded corners.
                      - The image uses `object-contain` so the FULL product
                        is always visible with no cropping, while preserving
                        its natural aspect ratio inside the box.
                    */}
                    <div
                        className="relative rounded-[2rem] overflow-hidden bg-white aspect-[4/3] shadow-xl shadow-primary-500/10 border border-surface-100 cursor-zoom-in group"
                        onClick={() => openLightbox(imgIdx)}
                        title="Click to view fullscreen"
                    >
                        <div className="absolute inset-0 p-2 sm:p-4">
                            <img
                                src={getDetailUrl(images[imgIdx]?.url)}
                                alt={images[imgIdx]?.alt || listing.title}
                                className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-[1.02]"
                            />
                        </div>

                        {/* Click-to-zoom hint badge */}
                        <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 backdrop-blur-md text-surface-700 text-[10px] font-black uppercase tracking-widest border border-white/60 shadow-sm opacity-90 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <ChevronRight className="w-3 h-3" />
                            <span>Click to enlarge</span>
                        </div>

                        {images.length > 1 && (
                            <div className="absolute inset-0 flex items-center justify-between p-4 px-6 pointer-events-none z-10">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setImgIdx((i) => (i - 1 + images.length) % images.length); }}
                                    className="pointer-events-auto w-11 h-11 rounded-2xl bg-white/90 backdrop-blur-md flex items-center justify-center text-primary-600 shadow-xl border border-white hover:scale-110 transition-transform"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setImgIdx((i) => (i + 1) % images.length); }}
                                    className="pointer-events-auto w-11 h-11 rounded-2xl bg-white/90 backdrop-blur-md flex items-center justify-center text-primary-600 shadow-xl border border-white hover:scale-110 transition-transform"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                        {images.length > 1 && (
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 pointer-events-none z-10">
                                {images.map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={(e) => { e.stopPropagation(); setImgIdx(i); }}
                                        className={`h-2 rounded-full transition-all ${i === imgIdx ? 'bg-primary-500 w-6 shadow-md' : 'bg-surface-300 w-2 hover:bg-surface-400'}`}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Thumbnail strip — quick jump between images without opening the lightbox */}
                    {images.length > 1 && (
                        <div className="flex gap-3 mt-4 overflow-x-auto pb-2 no-scrollbar">
                            {images.map((img, i) => (
                                <button
                                    key={i}
                                    onClick={() => setImgIdx(i)}
                                    className={`flex-shrink-0 w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all ${i === imgIdx ? 'border-primary-500 scale-105 shadow-md' : 'border-transparent opacity-70 hover:opacity-100'}`}
                                >
                                    <img
                                        src={getGalleryUrl(img.url)}
                                        alt={img.alt || `Image ${i + 1}`}
                                        className="w-full h-full object-cover"
                                    />
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Basic Info */}
                    <div className="space-y-6">
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <span className="bg-primary-50 text-primary-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-primary-100">
                                    {listing.category}
                                </span>
                                {listing.availability?.isAvailable ? (
                                    <span className="flex items-center gap-1.5 text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-100">
                                        <CheckCircle className="w-3.5 h-3.5" /> Available Now
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 px-3 py-1 rounded-full border border-red-100">
                                        <AlertCircle className="w-3.5 h-3.5" /> Currently Booked
                                    </span>
                                )}
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black text-surface-900 tracking-tight mb-4">{listing.title}</h1>
                            <div className="flex items-center gap-6">
                                <StarRating rating={listing.rating?.average || 0} count={listing.rating?.count || 0} />
                                <span className="flex items-center gap-2 text-sm text-surface-500 font-bold">
                                    <MapPin className="w-4 h-4 text-primary-500" /> {listing.location?.city}, {listing.location?.state}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { icon: Tag, label: 'Condition', val: listing.condition, color: 'text-blue-600' },
                                { icon: Package, label: 'Rentals', val: `${listing.totalRentals}+`, color: 'text-amber-600' },
                                { icon: Eye, label: 'Views', val: (listing.views || 0).toLocaleString(), color: 'text-pink-600' },
                                { icon: Clock, label: 'Min. Rent', val: `${listing.availability?.minRentalDays} Days`, color: 'text-purple-600' },
                            ].map((item, i) => (
                                <div key={i} className="bg-white p-4 rounded-2xl border border-surface-100 flex flex-col gap-1 shadow-sm">
                                    <div className="flex items-center gap-2 text-surface-400">
                                        <item.icon className="w-4 h-4" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                                    </div>
                                    <span className={`text-sm font-black ${item.color}`}>{item.val}</span>
                                </div>
                            ))}
                        </div>

                        {/* Guarantee strip moved below to balance the layout */}
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-100 w-fit">
                            <Shield className="w-4 h-4" />
                            RentoQuick Protection — Guaranteed
                        </div>

                        <div className="pt-6 border-t border-surface-100">
                            <h2 className="text-xl font-black text-surface-900 mb-4">{t('common.description')}</h2>
                            <p className="text-surface-600 leading-relaxed text-lg">{listing.description}</p>
                        </div>
                    </div>

                    {/* Calendar Section */}
                    <div className="pt-10 border-t border-surface-100">
                        <h2 className="text-xl font-black text-surface-900 mb-6 flex items-center gap-3">
                            <Calendar className="w-6 h-6 text-primary-500" /> Availability Calendar
                        </h2>
                        <div className="max-w-md">
                            <AvailabilityCalendar bookedDates={bookedDates} />
                        </div>
                    </div>

                    {/* Owner Card with Verification Badges */}
                    <div className="bg-gradient-to-br from-surface-900 to-black rounded-[2rem] p-8 text-white relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl -mr-32 -mt-32" />
                        <div className="relative z-10">
                            <h2 className="text-lg font-bold mb-6 text-primary-400 tracking-widest uppercase">Trusted Owner</h2>
                            <div className="flex items-center gap-6">
                                <div className="w-20 h-20 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center text-3xl font-black shadow-2xl">
                                    {listing.owner?.name?.[0]?.toUpperCase()}
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-2xl font-black mb-2">{listing.owner?.name}</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {listing.owner?.isEmailVerified && (
                                            <span className="flex items-center gap-1.5 bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-[10px] font-black uppercase border border-blue-500/30">
                                                <CheckCircle className="w-3.5 h-3.5" /> Email Verified
                                            </span>
                                        )}
                                        {listing.owner?.verification?.identity && (
                                            <span className="flex items-center gap-1.5 bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-[10px] font-black uppercase border border-green-500/30">
                                                <Shield className="w-3.5 h-3.5" /> Identity Verified
                                            </span>
                                        )}
                                        <span className="flex items-center gap-1.5 bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full text-[10px] font-black uppercase border border-amber-500/30">
                                            <Star className="w-3.5 h-3.5 fill-current" /> Top Rated
                                        </span>
                                    </div>
                                </div>
                                {!isOwner && (
                                    <button onClick={() => navigate(`/messages?userId=${listing.owner._id}`)} className="bg-white text-black px-6 py-3 rounded-2xl font-black hover:bg-primary-50 transition-colors shadow-xl">
                                        Chat
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Reviews */}
                    <div className="pt-10 border-t border-surface-100">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-black text-surface-900">What Renters Say</h2>
                            <div className="flex items-center gap-2">
                                <span className="text-4xl font-black text-surface-900">{listing.rating?.average || 0}</span>
                                <StarRating rating={listing.rating?.average || 0} count={listing.rating?.count || 0} />
                            </div>
                        </div>
                        {reviewsLoading ? (
                            <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>
                        ) : reviews.length === 0 ? (
                            <div className="bg-surface-50 rounded-3xl p-12 text-center border-2 border-dashed border-surface-200">
                                <MessageSquare className="w-12 h-12 text-surface-300 mx-auto mb-4" />
                                <p className="text-surface-500 font-bold">No reviews yet. Be the first to rent and review!</p>
                            </div>
                        ) : (
                            <div className="grid gap-6">
                                {reviews.map((r) => {
                                    const liked = hasLiked(r);
                                    const likeCount = (r.likes || []).length;
                                    const isLiking = likingIds.has(r._id);
                                    const isReplyingThis = replyingTo === r._id;
                                    const replies = r.replies || [];

                                    return (
                                        <div key={r._id} className="bg-white p-6 rounded-3xl border border-surface-100 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="w-12 h-12 rounded-2xl bg-primary-50 flex items-center justify-center font-black text-primary-600">
                                                    {r.reviewer?.name?.[0]?.toUpperCase()}
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-bold text-surface-900">{r.reviewer?.name}</h4>
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex">
                                                            {[1, 2, 3, 4, 5].map(s => <Star key={s} className={`w-3 h-3 ${s <= r.rating ? 'text-amber-400 fill-current' : 'text-surface-200'}`} />)}
                                                        </div>
                                                        <span className="text-[10px] font-black text-surface-400 uppercase tracking-widest">{format(new Date(r.createdAt), 'MMM yyyy')}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <p className="text-surface-700 leading-relaxed font-medium italic">"{r.comment}"</p>

                                            {/* Engagement bar: Like + Reply buttons */}
                                            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-surface-100">
                                                <button
                                                    onClick={() => handleLike(r._id)}
                                                    disabled={isLiking}
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all disabled:opacity-60 ${liked ? 'bg-primary-50 text-primary-600 border border-primary-200' : 'bg-surface-50 text-surface-600 hover:bg-surface-100 border border-transparent'}`}
                                                >
                                                    {isLiking ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    ) : (
                                                        <ThumbsUp className={`w-3.5 h-3.5 ${liked ? 'fill-current' : ''}`} />
                                                    )}
                                                    {likeCount > 0 ? likeCount : 'Like'}
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (!isAuthenticated) {
                                                            toast.error('Please sign in to reply');
                                                            return;
                                                        }
                                                        setReplyingTo(isReplyingThis ? null : r._id);
                                                        setReplyText('');
                                                    }}
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${isReplyingThis ? 'bg-primary-50 text-primary-600 border border-primary-200' : 'bg-surface-50 text-surface-600 hover:bg-surface-100 border border-transparent'}`}
                                                >
                                                    <MessageCircle className="w-3.5 h-3.5" />
                                                    Reply
                                                </button>
                                            </div>

                                            {/* Reply form (conditionally rendered) */}
                                            {isReplyingThis && (
                                                <div className="mt-4 p-4 bg-surface-50 rounded-2xl border border-surface-200">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-[10px] font-black text-surface-500 uppercase tracking-widest">
                                                            {isOwner ? 'Reply as owner' : 'Add your reply'}
                                                        </span>
                                                        <button
                                                            onClick={() => { setReplyingTo(null); setReplyText(''); }}
                                                            className="text-surface-400 hover:text-surface-600"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                    <textarea
                                                        value={replyText}
                                                        onChange={(e) => setReplyText(e.target.value)}
                                                        rows={3}
                                                        maxLength={1000}
                                                        placeholder="Write a polite, helpful reply…"
                                                        className="w-full bg-white border border-surface-200 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                                                    />
                                                    <div className="flex justify-between items-center mt-2">
                                                        <span className="text-[10px] text-surface-400 font-bold">{replyText.length}/1000</span>
                                                        <button
                                                            onClick={() => handleReply(r._id)}
                                                            disabled={replyingSubmitting || !replyText.trim()}
                                                            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary-700 disabled:opacity-50 transition-colors"
                                                        >
                                                            {replyingSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                                            Post Reply
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Threaded replies (and legacy ownerResponse for back-compat) */}
                                            {(replies.length > 0 || r.ownerResponse) && (
                                                <div className="mt-4 ml-2 md:ml-6 space-y-3 border-l-2 border-surface-100 pl-4">
                                                    {/* Legacy single owner response (if it exists and wasn't migrated to replies) */}
                                                    {r.ownerResponse && r.ownerResponse.comment && (
                                                        <div className="p-4 bg-primary-50 rounded-2xl border-l-4 border-primary-500">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="w-6 h-6 rounded-full bg-primary-500 text-white flex items-center justify-center text-[10px] font-black">
                                                                    {listing.owner?.name?.[0]?.toUpperCase() || 'O'}
                                                                </span>
                                                                <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest">
                                                                    {listing.owner?.name || 'Owner'} · Owner Response
                                                                </p>
                                                            </div>
                                                            <p className="text-sm text-surface-800 font-medium">"{r.ownerResponse.comment}"</p>
                                                        </div>
                                                    )}
                                                    {/* Threaded replies */}
                                                    {replies.map((reply) => (
                                                        <div key={reply._id || reply.createdAt} className="p-3 bg-surface-50 rounded-2xl">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="w-6 h-6 rounded-full bg-surface-200 text-surface-700 flex items-center justify-center text-[10px] font-black">
                                                                    {reply.author?.name?.[0]?.toUpperCase() || 'U'}
                                                                </span>
                                                                <span className="text-xs font-bold text-surface-800">
                                                                    {reply.author?.name || 'User'}
                                                                </span>
                                                                {reply.author?._id && listing.owner?._id &&
                                                                    String(reply.author._id) === String(listing.owner._id) && (
                                                                    <span className="text-[9px] font-black text-primary-600 uppercase bg-primary-50 px-1.5 py-0.5 rounded">
                                                                        Owner
                                                                    </span>
                                                                )}
                                                                {reply.createdAt && (
                                                                    <span className="text-[10px] text-surface-400 font-medium ml-auto">
                                                                        {format(new Date(reply.createdAt), 'MMM d, yyyy')}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-sm text-surface-700 font-medium">{reply.comment}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right side: Sticky Booking Card */}
                <div className="lg:col-span-1">
                    <div className="sticky top-32 space-y-6">
                        <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-primary-500/10 border border-surface-100">
                            <div className="flex items-baseline justify-between mb-8">
                                <div>
                                    <span className="text-4xl font-black text-surface-900">₹{listing.pricePerDay?.toLocaleString()}</span>
                                    <span className="text-surface-500 font-bold ml-1">/ day</span>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest">Security Deposit</p>
                                    <p className="text-sm font-bold text-surface-500 font-mono">₹{listing.securityDeposit?.toLocaleString() || 0}</p>
                                </div>
                            </div>

                            {!isOwner && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-surface-400 uppercase tracking-tighter">Start Date</label>
                                            <input
                                                type="date"
                                                value={startDate}
                                                min={format(new Date(), 'yyyy-MM-dd')}
                                                onChange={(e) => setStartDate(e.target.value)}
                                                className="w-full bg-surface-50 border border-surface-200 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-surface-400 uppercase tracking-tighter">End Date</label>
                                            <input
                                                type="date"
                                                value={endDate}
                                                min={startDate || format(new Date(), 'yyyy-MM-dd')}
                                                onChange={(e) => setEndDate(e.target.value)}
                                                className="w-full bg-surface-50 border border-surface-200 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                                            />
                                        </div>
                                    </div>

                                    {/* Coupon Section */}
                                    <div className="p-4 bg-primary-50/50 rounded-3xl border border-primary-100/50">
                                        <label className="text-[10px] font-black text-primary-600 uppercase tracking-widest block mb-3">Have a discount code?</label>
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
                                                <input
                                                    type="text"
                                                    value={couponCode}
                                                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                                    placeholder="WELCOME20"
                                                    disabled={appliedCoupon}
                                                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-primary-200 rounded-xl text-xs font-bold uppercase placeholder:text-surface-300 outline-none focus:ring-2 focus:ring-primary-500"
                                                />
                                            </div>
                                            {!appliedCoupon ? (
                                                <button
                                                    onClick={handleApplyCoupon}
                                                    disabled={validatingCoupon || !couponCode}
                                                    className="bg-primary-600 text-white px-4 rounded-xl text-[10px] font-black uppercase hover:bg-primary-700 disabled:opacity-50 transition-colors"
                                                >
                                                    {validatingCoupon ? '...' : 'Apply'}
                                                </button>
                                            ) : (
                                                <button onClick={() => { setAppliedCoupon(null); setDiscountAmt(0); }} className="text-red-500 text-[10px] font-bold underline">Remove</button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Calc */}
                                    {totalDays > 0 && (
                                        <div className="space-y-3 pt-4 border-t border-surface-100">
                                            <div className="flex justify-between text-sm font-bold text-surface-500">
                                                <span>₹{listing.pricePerDay} × {totalDays} days</span>
                                                <span>₹{subtotal.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between text-sm font-bold text-surface-500">
                                                <span>Service Fee (10%)</span>
                                                <span>₹{platformFee.toLocaleString()}</span>
                                            </div>
                                            {discountAmt > 0 && (
                                                <div className="flex justify-between text-sm font-bold text-green-600">
                                                    <span>Discount Applied</span>
                                                    <span>- ₹{discountAmt.toLocaleString()}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between text-xl font-black text-surface-900 pt-3 border-t border-surface-100">
                                                <span>Total</span>
                                                <span>₹{finalTotal.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        onClick={handleBook}
                                        disabled={bookingLoading || !listing.availability?.isAvailable}
                                        className="w-full bg-primary-600 text-white py-5 rounded-[2rem] font-black text-xl flex items-center justify-center gap-3 hover:bg-primary-700 transition-all shadow-2xl shadow-primary-500/40 disabled:opacity-50 group"
                                    >
                                        {bookingLoading ? (
                                            <Loader2 className="w-6 h-6 animate-spin" />
                                        ) : (
                                            <Zap className="w-6 h-6 group-hover:scale-110 transition-transform" />
                                        )}
                                        {bookingLoading ? (bookingPhase || 'Processing…') : 'Reserve & Pay Now'}
                                    </button>

                                    {/* Secure-payment hint shown above the existing "won't be charged yet" line */}
                                    <div className="flex items-center justify-center gap-1.5 text-[10px] text-surface-500 font-bold">
                                        <Lock className="w-3 h-3 text-emerald-500" />
                                        <span>Secured by Razorpay · 256-bit encryption</span>
                                        <CreditCard className="w-3 h-3 text-primary-500" />
                                    </div>

                                    <p className="text-[10px] text-surface-400 font-bold text-center">A booking will be created and you'll be asked to complete the payment. You can also pay later from the Bookings page.</p>
                                </div>
                            )}
                        </div>

                        {/* Guarantee Card */}
                        <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-3xl flex items-center gap-4">
                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-emerald-600 border border-emerald-100">
                                <Shield className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-xs font-black text-emerald-900 uppercase tracking-tight">RentoQuick Protection</p>
                                <p className="text-[10px] font-bold text-emerald-700">Get what you see or your money back. 100% Guaranteed.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Lightbox: renders above everything when open. Uses the full-
                resolution image URLs (no c_fill cropping) so the user can
                see the product in maximum detail. */}
            {lightboxOpen && (
                <ImageLightbox
                    images={images.map((img) => ({
                        url: getDetailUrl(img.url) || img.url,
                        alt: img.alt || listing.title,
                    }))}
                    index={lightboxIdx}
                    onClose={closeLightbox}
                    onIndex={setLightboxIdx}
                />
            )}
        </div>
    );
}

