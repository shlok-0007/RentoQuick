import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { listingsAPI } from '../api';
import ListingCard from '../components/listings/ListingCard';
import { ListingCardSkeleton } from '../components/common/Skeleton';
import { Heart, Package, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function WishlistPage() {
    const { user, isAuthenticated } = useAuth();
    const [listings, setListings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isAuthenticated || !user?.wishlist?.length) {
            setListings([]);
            setLoading(false);
            return;
        }

        const fetchWishlist = async () => {
            try {
                setLoading(true);
                const res = await listingsAPI.getAll({ ids: user.wishlist.join(','), limit: 100 });
                setListings(res.data.listings || []);
            } catch (err) {
                console.error('Failed to fetch wishlist', err);
            } finally {
                setLoading(false);
            }
        };

        fetchWishlist();
    }, [user?.wishlist, isAuthenticated]);

    if (!isAuthenticated) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
                <Heart className="w-16 h-16 text-primary-300 mb-4" />
                <h2 className="text-2xl font-bold text-surface-950 mb-2">Sign in to see your wishlist</h2>
                <p className="text-surface-800 mb-6">Save items you're interested in and view them here later.</p>
                <Link to="/login" className="btn-primary px-8 py-3 rounded-xl font-semibold relative z-10">
                    <span className="relative z-10">Sign In</span>
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen py-10 px-4">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-10">
                    <div>
                        <h1 className="font-display text-4xl font-bold text-surface-950 mb-2 flex items-center gap-3">
                            <Heart className="w-8 h-8 text-primary-500 fill-primary-500" />
                            My Wishlist
                        </h1>
                        <p className="text-surface-800 font-medium">
                            {user.wishlist?.length || 0} items saved for later
                        </p>
                    </div>
                    <Link to="/listings" className="text-sm font-bold text-primary-500 flex items-center gap-1 hover:underline">
                        Explore more listings <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>

                {loading ? (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {Array(4).fill(0).map((_, i) => <ListingCardSkeleton key={i} />)}
                    </div>
                ) : listings.length === 0 ? (
                    <div className="text-center py-24 glass rounded-3xl border-white/50 shadow-xl bg-white/40 max-w-2xl mx-auto">
                        <Package className="w-20 h-20 text-primary-300 mx-auto mb-6" />
                        <h2 className="text-2xl font-bold text-surface-950 mb-3">Your wishlist is empty</h2>
                        <p className="text-surface-800 mb-10 font-medium px-8">
                            Looks like you haven't saved any items yet. Start browsing to find something you like!
                        </p>
                        <Link to="/listings" className="btn-primary px-10 py-4 rounded-2xl font-bold text-lg relative z-10 shadow-lg shadow-primary-500/20">
                            <span className="relative z-10">Start Browsing</span>
                        </Link>
                    </div>
                ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {listings.map((l) => (
                            <ListingCard key={l._id} listing={l} wishlist={user.wishlist} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
