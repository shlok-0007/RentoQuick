import { Star, MapPin, Heart, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../api';
import toast from 'react-hot-toast';

const categoryColors = {
    'Electronics': 'from-primary-500/10 to-primary-300/10 text-primary-900 border-primary-500/10',
    'Vehicles': 'from-amber-500/10 to-primary-400/10 text-orange-900 border-amber-500/10',
    'Tools & Equipment': 'from-orange-500/10 to-primary-500/10 text-orange-950 border-orange-500/10',
    'Sports & Outdoors': 'from-primary-400/10 to-amber-400/10 text-primary-900 border-primary-400/10',
    'Cameras & Photography': 'from-primary-500/10 to-primary-200/10 text-primary-950 border-primary-500/10',
    'Musical Instruments': 'from-rose-400/10 to-pink-300/10 text-rose-900 border-rose-400/10',
    'Clothing & Accessories': 'from-primary-300/10 to-primary-100/10 text-primary-900 border-primary-300/10',
    'Furniture & Home': 'from-amber-100/30 to-primary-50/30 text-primary-800 border-primary-200/20',
    'Books & Media': 'from-primary-200/20 to-primary-100/20 text-primary-900 border-primary-200/20',
    'Other': 'from-surface-200 to-surface-100 text-surface-800 border-surface-300',
};

function StarRating({ rating, count }) {
    return (
        <div className="flex items-center gap-1">
            <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                        key={star}
                        className={`w-3 h-3 ${star <= Math.round(rating) ? 'star-filled' : 'star-empty'}`}
                        fill={star <= Math.round(rating) ? 'currentColor' : 'none'}
                    />
                ))}
            </div>
            <span className="text-xs text-surface-700">({count})</span>
        </div>
    );
}

export default function ListingCard({ listing, wishlist: propWishlist }) {
    const { isAuthenticated, user, updateUser } = useAuth();
    // Use propWishlist if provided, otherwise use user.wishlist from context
    const currentWishlist = propWishlist || user?.wishlist || [];
    const [wishlisted, setWishlisted] = useState(currentWishlist.includes(listing._id));
    const [toggling, setToggling] = useState(false);

    // Update state if user.wishlist changes (e.g. after login or logout)
    useEffect(() => {
        setWishlisted(currentWishlist.includes(listing._id));
    }, [currentWishlist, listing._id]);

    const imgUrl = listing.images?.[0]?.url || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400';
    const colorClass = categoryColors[listing.category] || categoryColors['Other'];

    const handleWishlist = async (e) => {
        e.preventDefault();
        if (!isAuthenticated) {
            toast.error('Please sign in to save items');
            return;
        }
        try {
            setToggling(true);
            const res = await authAPI.toggleWishlist(listing._id);
            if (user) {
                updateUser({ ...user, wishlist: res.data.wishlist });
            }
            // setWishlisted(!wishlisted); // Handled by useEffect now
            toast.success(res.data.added ? 'Added to wishlist' : 'Removed from wishlist');
        } catch {
            toast.error('Something went wrong');
        } finally {
            setToggling(false);
        }
    };

    return (
        <Link to={`/listings/${listing.slug || listing._id}`} className="block">
            <div className="glass rounded-2xl overflow-hidden card-hover group border-white/50 shadow-sm hover:shadow-xl">
                {/* Image */}
                <div className="relative h-52 overflow-hidden bg-surface-100">
                    <img
                        src={imgUrl}
                        alt={listing.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400'; }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                    {/* Category badge */}
                    <div className={`absolute top-3 left-3 badge bg-gradient-to-r border backdrop-blur-md font-bold ${colorClass}`}>
                        {listing.category}
                    </div>

                    {/* Wishlist btn */}
                    <button
                        onClick={handleWishlist}
                        disabled={toggling}
                        className="absolute top-3 right-3 w-8 h-8 rounded-full glass flex items-center justify-center transition-all hover:scale-110 shadow-sm border-white/40"
                    >
                        <Heart
                            className={`w-4 h-4 transition-colors ${wishlisted ? 'text-primary-500 fill-primary-500' : 'text-primary-500'}`}
                        />
                    </button>

                    {/* Featured badge */}
                    {listing.isFeatured && (
                        <div className="absolute bottom-3 left-3 badge bg-gradient-to-r from-primary-500/20 to-primary-300/20 text-primary-900 border border-primary-500/30 backdrop-blur-md">
                            ⚡ Featured
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="p-4 bg-white/40">
                    <h3 className="font-semibold text-surface-900 text-sm leading-snug line-clamp-2 mb-1 group-hover:text-primary-500 transition-colors">
                        {listing.title}
                    </h3>

                    <div className="flex items-center gap-1.5 text-xs text-surface-700 mb-2">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span>{listing.location?.city}, {listing.location?.state}</span>
                    </div>

                    {listing.rating?.count > 0 && (
                        <div className="mb-3">
                            <StarRating rating={listing.rating.average} count={listing.rating.count} />
                        </div>
                    )}

                    <div className="flex items-end justify-between mt-3 pt-3 border-t border-primary-500/10">
                        <div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-lg font-bold text-surface-950">₹{listing.pricePerDay?.toLocaleString()}</span>
                                <span className="text-xs text-surface-700 font-medium">/day</span>
                            </div>
                            {listing.securityDeposit > 0 && (
                                <p className="text-xs text-surface-600 font-medium">+₹{listing.securityDeposit?.toLocaleString()} deposit</p>
                            )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-surface-700 font-medium">
                            <Clock className="w-3 h-3" />
                            <span>{listing.availability?.isAvailable ? 'Available' : 'Booked'}</span>
                            <span className={`w-2 h-2 rounded-full ml-1 ${listing.availability?.isAvailable ? 'bg-primary-500 shadow-[0_0_8px_rgba(222,107,107,0.4)]' : 'bg-surface-300'}`} />
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}
