import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { listingsAPI, bookingsAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
    MapPin, Star, Clock, Shield, ChevronLeft, ChevronRight,
    User, Tag, CheckCircle, AlertCircle, Calendar, Package,
    Heart, Share2, MessageCircle, Zap
} from 'lucide-react';
import { format, addDays, differenceInCalendarDays } from 'date-fns';

function StarRating({ rating, count }) {
    return (
        <div className="flex items-center gap-2">
            <div className="flex">
                {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={`w-4 h-4 ${s <= Math.round(rating) ? 'star-filled' : 'star-empty'}`} fill={s <= Math.round(rating) ? 'currentColor' : 'none'} />
                ))}
            </div>
            <span className="text-sm text-surface-800 font-medium">{rating} ({count} reviews)</span>
        </div>
    );
}

export default function ListingDetailPage() {
    const { id } = useParams();
    const { isAuthenticated, user } = useAuth();
    const navigate = useNavigate();

    const [listing, setListing] = useState(null);
    const [loading, setLoading] = useState(true);
    const [imgIdx, setImgIdx] = useState(0);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [bookingLoading, setBookingLoading] = useState(false);

    useEffect(() => {
        listingsAPI.getOne(id)
            .then(res => setListing(res.data.listing))
            .catch(() => navigate('/listings'))
            .finally(() => setLoading(false));
    }, [id]);

    const totalDays = startDate && endDate
        ? Math.max(0, differenceInCalendarDays(new Date(endDate), new Date(startDate)))
        : 0;

    const subtotal = totalDays * (listing?.pricePerDay || 0);
    const platformFee = Math.round(subtotal * 0.1 * 100) / 100;
    const totalAmount = subtotal + (listing?.securityDeposit || 0) + platformFee;

    const handleBook = async () => {
        if (!isAuthenticated) { navigate('/login'); return; }
        if (!startDate || !endDate) { toast.error('Please select rental dates'); return; }
        if (totalDays < 1) { toast.error('End date must be after start date'); return; }

        try {
            setBookingLoading(true);
            await bookingsAPI.create({
                listingId: listing._id,
                startDate,
                endDate,
                paymentMethod: 'online',
            });
            toast.success('Booking request sent! 🎉');
            navigate('/bookings');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Booking failed');
        } finally {
            setBookingLoading(false);
        }
    };

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied!');
    };

    if (loading) {
        return (
            <div className="min-h-screen py-8 px-4 bg-surface-50">
                <div className="max-w-7xl mx-auto animate-pulse">
                    <div className="h-[500px] rounded-3xl bg-surface-200 mb-8" />
                    <div className="grid lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-4">
                            <div className="h-8 bg-surface-200 rounded-xl" />
                            <div className="h-4 bg-surface-200 rounded-xl w-1/2" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!listing) return null;

    const isOwner = user?._id === listing.owner?._id;
    const images = listing.images?.length ? listing.images : [{ url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800', alt: listing.title }];

    const conditionColor = {
        'New': 'text-emerald-600', 'Like New': 'text-green-600', 'Good': 'text-primary-500',
        'Fair': 'text-yellow-600', 'Poor': 'text-red-600'
    }[listing.condition] || 'text-surface-700';

    return (
        <div className="min-h-screen py-8 px-4">
            <div className="max-w-7xl mx-auto">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-sm text-surface-800 font-medium mb-6">
                    <Link to="/" className="hover:text-primary-500">Home</Link>
                    <span>/</span>
                    <Link to="/listings" className="hover:text-primary-500">Listings</Link>
                    <span>/</span>
                    <Link to={`/listings?category=${encodeURIComponent(listing.category)}`} className="hover:text-primary-500">{listing.category}</Link>
                    <span>/</span>
                    <span className="text-surface-950 line-clamp-1 max-w-xs">{listing.title}</span>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Left: Images + Details */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Image Gallery */}
                        <div className="relative rounded-3xl overflow-hidden bg-surface-100 h-[400px] md:h-[500px] border border-white shadow-lg">
                            <img
                                src={images[imgIdx]?.url}
                                alt={images[imgIdx]?.alt || listing.title}
                                className="w-full h-full object-cover"
                                onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800'; }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                            {images.length > 1 && (
                                <>
                                    <button onClick={() => setImgIdx((i) => (i - 1 + images.length) % images.length)} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full glass flex items-center justify-center border-white/40 shadow-md">
                                        <ChevronLeft className="w-5 h-5 text-primary-500" />
                                    </button>
                                    <button onClick={() => setImgIdx((i) => (i + 1) % images.length)} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full glass flex items-center justify-center border-white/40 shadow-md">
                                        <ChevronRight className="w-5 h-5 text-primary-500" />
                                    </button>
                                </>
                            )}
                            <div className="absolute bottom-4 right-4 flex gap-2">
                                <button onClick={handleShare} className="w-9 h-9 rounded-full glass flex items-center justify-center border-white/40 shadow-md">
                                    <Share2 className="w-4 h-4 text-primary-500" />
                                </button>
                            </div>
                            {/* Image dots */}
                            {images.length > 1 && (
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                                    {images.map((_, i) => (
                                        <button key={i} onClick={() => setImgIdx(i)} className={`w-2 h-2 rounded-full transition-all ${i === imgIdx ? 'bg-white w-5' : 'bg-white/40'}`} />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Listing Info */}
                        <div className="glass rounded-3xl p-7">
                            <div className="flex items-start justify-between gap-4 mb-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="badge bg-primary-500/10 text-primary-900 border-primary-500/10 font-bold">{listing.category}</span>
                                        {listing.isFeatured && <span className="badge bg-primary-300/20 text-primary-900 border-primary-500/10 font-bold">⚡ Featured</span>}
                                        {listing.availability?.isAvailable
                                            ? <span className="badge status-confirmed font-bold">Available</span>
                                            : <span className="badge status-cancelled font-bold">Unavailable</span>
                                        }
                                    </div>
                                    <h1 className="font-display text-2xl md:text-3xl font-bold text-surface-950">{listing.title}</h1>
                                </div>
                            </div>

                            {listing.rating?.count > 0 && (
                                <div className="mb-4">
                                    <StarRating rating={listing.rating.average} count={listing.rating.count} />
                                </div>
                            )}

                            <div className="flex flex-wrap items-center gap-4 text-sm text-surface-800 mb-6 font-medium">
                                <span className="flex items-center gap-1.5">
                                    <MapPin className="w-4 h-4 text-primary-500" />
                                    {listing.location?.city}, {listing.location?.state}
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <Tag className="w-4 h-4 text-primary-500" />
                                    <span className={conditionColor}>{listing.condition}</span>
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <Package className="w-4 h-4 text-primary-500" />
                                    {listing.totalRentals} rentals
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <Clock className="w-4 h-4 text-primary-500" />
                                    Min {listing.availability?.minRentalDays} day(s)
                                </span>
                            </div>

                            <div className="border-t border-primary-500/10 pt-6">
                                <h2 className="font-semibold text-surface-950 mb-3">Description</h2>
                                <p className="text-surface-800 leading-relaxed text-sm">{listing.description}</p>
                            </div>

                            {listing.features?.length > 0 && (
                                <div className="border-t border-primary-500/10 mt-6 pt-6">
                                    <h2 className="font-semibold text-surface-950 mb-3">What's Included</h2>
                                    <div className="grid sm:grid-cols-2 gap-2">
                                        {listing.features.map((f, i) => (
                                            <div key={i} className="flex items-center gap-2 text-sm text-surface-800 font-medium">
                                                <CheckCircle className="w-4 h-4 text-primary-500 flex-shrink-0" />
                                                {f}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Owner Card */}
                        {listing.owner && (
                            <div className="glass rounded-3xl p-7 border-white/50">
                                <h2 className="font-semibold text-surface-950 mb-5">About the Owner</h2>
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-300 flex items-center justify-center text-xl font-bold text-white flex-shrink-0 shadow-lg">
                                        {listing.owner.name?.[0]?.toUpperCase()}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-surface-950 font-display">{listing.owner.name}</h3>
                                        {listing.owner.location?.city && (
                                            <p className="text-sm text-surface-800 font-medium flex items-center gap-1 mt-0.5">
                                                <MapPin className="w-3 h-3 text-primary-500" /> {listing.owner.location.city}
                                            </p>
                                        )}
                                        {listing.owner.rating?.count > 0 && (
                                            <div className="flex items-center gap-1 mt-1">
                                                <Star className="w-3.5 h-3.5 text-primary-500" fill="currentColor" />
                                                <span className="text-sm text-surface-800 font-medium">{listing.owner.rating.average} ({listing.owner.rating.count} reviews)</span>
                                            </div>
                                        )}
                                        {listing.owner.bio && (
                                            <p className="text-sm text-surface-700 mt-2 line-clamp-2 italic">{listing.owner.bio}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right: Booking */}
                    <div className="lg:col-span-1">
                        <div className="glass rounded-3xl p-6 sticky top-24">
                            {/* Pricing */}
                            <div className="mb-6">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-bold text-surface-950">₹{listing.pricePerDay?.toLocaleString()}</span>
                                    <span className="text-surface-800 font-medium">/day</span>
                                </div>
                                {listing.pricePerWeek && (
                                    <p className="text-sm text-surface-800 mt-1 font-medium">₹{listing.pricePerWeek?.toLocaleString()} / week</p>
                                )}
                                {listing.securityDeposit > 0 && (
                                    <p className="text-sm text-surface-700 mt-1 font-medium italic">+₹{listing.securityDeposit?.toLocaleString()} refundable deposit</p>
                                )}
                            </div>

                            {!isOwner && (
                                <>
                                    {/* Date Selection */}
                                    <div className="space-y-3 mb-5">
                                        <div>
                                            <label className="block text-xs text-surface-800 mb-1.5 font-bold">Start Date</label>
                                            <input
                                                type="date"
                                                value={startDate}
                                                min={format(new Date(), 'yyyy-MM-dd')}
                                                onChange={(e) => setStartDate(e.target.value)}
                                                className="w-full px-3 py-2.5 rounded-xl input-dark text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-surface-800 mb-1.5 font-bold">End Date</label>
                                            <input
                                                type="date"
                                                value={endDate}
                                                min={startDate || format(new Date(), 'yyyy-MM-dd')}
                                                onChange={(e) => setEndDate(e.target.value)}
                                                className="w-full px-3 py-2.5 rounded-xl input-dark text-sm"
                                            />
                                        </div>
                                    </div>

                                    {/* Price breakdown */}
                                    {totalDays > 0 && (
                                        <div className="glass rounded-xl p-4 mb-5 space-y-2 text-sm border-white/50 bg-white/40">
                                            <div className="flex justify-between text-surface-800 font-medium">
                                                <span>₹{listing.pricePerDay} × {totalDays} day{totalDays > 1 ? 's' : ''}</span>
                                                <span>₹{subtotal.toLocaleString()}</span>
                                            </div>
                                            {listing.securityDeposit > 0 && (
                                                <div className="flex justify-between text-surface-700 font-medium">
                                                    <span>Security Deposit</span>
                                                    <span>₹{listing.securityDeposit.toLocaleString()}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between text-surface-700 font-medium">
                                                <span>Platform Fee (10%)</span>
                                                <span>₹{platformFee.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between font-bold text-surface-950 border-t border-primary-500/10 pt-2 mt-2">
                                                <span>Total</span>
                                                <span>₹{totalAmount.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        onClick={handleBook}
                                        disabled={bookingLoading || !listing.availability?.isAvailable}
                                        className="w-full btn-primary py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 relative z-10 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-primary-500/20"
                                    >
                                        <Zap className="w-4 h-4 relative z-10" />
                                        <span className="relative z-10">
                                            {bookingLoading ? 'Sending Request...' : listing.availability?.isAvailable ? 'Book Now' : 'Not Available'}
                                        </span>
                                    </button>

                                    {listing.owner?.phone && (
                                        <a
                                            href={`https://wa.me/91${listing.owner.phone}?text=${encodeURIComponent(`Hi ${listing.owner.name}, I'm interested in renting your "${listing.title}" from RentoQuick.`)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-full mt-3 btn-ghost py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-primary-500 border-primary-500/20 shadow-sm"
                                        >
                                            <MessageCircle className="w-4 h-4" />
                                            <span>Message Owner</span>
                                        </a>
                                    )}

                                    <div className="flex items-center gap-2 mt-4 p-3 rounded-xl bg-primary-500/5 border border-primary-500/20">
                                        <Shield className="w-4 h-4 text-primary-500 flex-shrink-0" />
                                        <p className="text-xs text-primary-900 font-semibold">Protected by RentoQuick Guarantee</p>
                                    </div>
                                </>
                            )}

                            {isOwner && (
                                <div className="space-y-3">
                                    <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-sm text-blue-300">
                                        You own this listing
                                    </div>
                                    <Link to={`/listings/${listing._id}/edit`} className="block text-center py-3 rounded-xl btn-ghost text-sm font-medium">
                                        Edit Listing
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
