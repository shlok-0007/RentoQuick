import { Star, MapPin, Heart, Clock, Zap, BadgeCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../api';
import { getCategoryColor } from '../../data/categories';
import { getThumbnailUrl } from '../../lib/cloudinary';
import toast from 'react-hot-toast';

function StarRating({ rating, count }) {
    return (
        <div className="flex items-center gap-1">
            <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                        key={star}
                        className={`w-3 h-3 ${star <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-surface-300'}`}
                    />
                ))}
            </div>
            <span className="text-xs text-surface-800 font-medium">
                {rating.toFixed(1)} ({count})
            </span>
        </div>
    );
}

export default function ListingCard({ listing, wishlist: propWishlist }) {
    const { isAuthenticated, user, updateUser } = useAuth();
    const currentWishlist = propWishlist || user?.wishlist || [];
    const [wishlisted, setWishlisted] = useState(currentWishlist.includes(listing._id));
    const [toggling, setToggling] = useState(false);

    useEffect(() => {
        setWishlisted(currentWishlist.includes(listing._id));
    }, [currentWishlist, listing._id]);

    const imgUrl = getThumbnailUrl(listing.images?.[0]?.url) || '/images/camera.png';

    const handleWishlist = async (e) => {
        e.preventDefault();
        e.stopPropagation();
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
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        onError={(e) => { e.target.src = '/images/camera.png'; }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                    {/* Category badge */}
                    <div className="absolute top-3 left-3 badge backdrop-blur-md border font-semibold" style={{ backgroundColor: `${getCategoryColor(listing.category)}26`, color: getCategoryColor(listing.category), borderColor: `${getCategoryColor(listing.category)}33` }}>
                        {listing.category}
                    </div>

                    {/* Wishlist btn */}
                    <button
                        onClick={handleWishlist}
                        disabled={toggling}
                        className="absolute top-3 right-3 w-9 h-9 rounded-full glass flex items-center justify-center transition-all hover:scale-110 shadow-sm border-white/40 group/heart"
                    >
                        <Heart
                            className={`w-4 h-4 transition-colors ${wishlisted ? 'text-primary-500 fill-primary-500' : 'text-primary-500'} group-hover/heart:fill-primary-500`}
                        />
                    </button>

                    {/* Featured badge */}
                    {listing.isFeatured && (
                        <div className="absolute bottom-3 left-3 badge bg-gradient-to-r from-primary-500 to-primary-300 text-white border-0 gap-1 shadow-lg">
                            <Zap className="w-3 h-3 fill-white" />
                            Featured
                        </div>
                    )}

                    {/* Owner chip */}
                    {listing.owner && (
                        <div className="absolute bottom-3 right-3 flex items-center gap-1.5 glass rounded-full pl-1 pr-2.5 py-1 border-white/40">
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary-500 to-primary-300 flex items-center justify-center text-[10px] font-bold text-white">
                                {listing.owner.name?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <span className="text-[10px] font-semibold text-surface-900 max-w-[60px] truncate">
                                {listing.owner.name?.split(' ')[0] || 'Owner'}
                            </span>
                            <BadgeCheck className="w-3 h-3 text-primary-500" />
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="p-4 bg-white/40">
                    <h3 className="font-semibold text-surface-900 text-sm leading-snug line-clamp-2 mb-1.5 group-hover:text-primary-500 transition-colors min-h-[2.5rem]">
                        {listing.title}
                    </h3>

                    <div className="flex items-center gap-1.5 text-xs text-surface-800 mb-2">
                        <MapPin className="w-3 h-3 flex-shrink-0 text-primary-500" />
                        <span className="truncate">
                            {listing.location?.city}, {listing.location?.state}
                        </span>
                    </div>

                    {listing.rating?.count > 0 && (
                        <div className="mb-3">
                            <StarRating rating={listing.rating?.average || 0} count={listing.rating?.count || 0} />
                        </div>
                    )}

                    <div className="flex items-end justify-between mt-3 pt-3 border-t border-primary-500/10">
                        <div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-xl font-extrabold text-surface-950">
                                    ₹{listing.pricePerDay?.toLocaleString()}
                                </span>
                                <span className="text-xs text-surface-800 font-medium">/day</span>
                            </div>
                            {listing.securityDeposit > 0 && (
                                <p className="text-[10px] text-surface-800 font-medium mt-0.5">
                                    +₹{listing.securityDeposit?.toLocaleString()} deposit
                                </p>
                            )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-surface-800 font-medium">
                            <Clock className="w-3 h-3" />
                            <span>{listing.availability?.isAvailable ? 'Available' : 'Booked'}</span>
                            <span className={`w-2 h-2 rounded-full ml-0.5 ${listing.availability?.isAvailable ? 'bg-primary-500 shadow-[0_0_8px_rgba(222,107,107,0.5)]' : 'bg-surface-300'}`} />
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}
