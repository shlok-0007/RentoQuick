import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { listingsAPI } from '../api';
import ListingCard from '../components/listings/ListingCard';
import { ListingCardSkeleton } from '../components/common/Skeleton';
import toast from 'react-hot-toast';
import { Plus, Package, Edit, Trash2, Eye, ToggleLeft, ToggleRight, BarChart3 } from 'lucide-react';

export default function MyListingsPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [listings, setListings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('grid');

    useEffect(() => {
        listingsAPI.getMy()
            .then(res => setListings(res.data.listings || []))
            .catch(() => toast.error('Failed to load your listings'))
            .finally(() => setLoading(false));
    }, []);

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this listing? This cannot be undone.')) return;
        try {
            await listingsAPI.delete(id);
            setListings(prev => prev.filter(l => l._id !== id));
            toast.success('Listing deleted');
        } catch {
            toast.error('Failed to delete listing');
        }
    };

    const totalEarnings = listings.reduce((sum, l) => sum + (l.totalRentals * l.pricePerDay), 0);
    const avgRating = listings.length
        ? (listings.reduce((s, l) => s + (l.rating?.average || 0), 0) / listings.length).toFixed(1)
        : '—';

    return (
        <div className="min-h-screen py-8 px-4">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="font-display text-3xl font-bold gradient-text">My Listings</h1>
                        <p className="text-surface-800 text-sm mt-1 font-medium opacity-80">{listings.length} items listed</p>
                    </div>
                    <Link to="/listings/new" className="inline-flex items-center gap-2 btn-primary px-5 py-2.5 rounded-xl font-semibold text-sm relative z-10">
                        <Plus className="w-4 h-4 relative z-10" />
                        <span className="relative z-10">Create Listing</span>
                    </Link>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                    {[
                        { label: 'Total Listings', value: listings.length, icon: Package, color: 'text-primary-500' },
                        { label: 'Avg Rating', value: avgRating, icon: BarChart3, color: 'text-amber-500' },
                        { label: 'Est. Earnings', value: `₹${totalEarnings.toLocaleString()}`, icon: BarChart3, color: 'text-primary-500' },
                    ].map(({ label, value, icon: Icon, color }) => (
                        <div key={label} className="glass rounded-2xl p-5 border-white/50 shadow-sm">
                            <Icon className={`w-5 h-5 ${color} mb-2`} />
                            <div className="text-xl font-bold text-surface-950">{value}</div>
                            <div className="text-xs text-surface-800 font-bold uppercase tracking-wider">{label}</div>
                        </div>
                    ))}
                </div>

                {/* Listings */}
                {loading ? (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {Array(4).fill(0).map((_, i) => <ListingCardSkeleton key={i} />)}
                    </div>
                ) : listings.length === 0 ? (
                    <div className="text-center py-20 glass rounded-3xl border-white/50 shadow-xl">
                        <Package className="w-16 h-16 text-primary-300 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-surface-950 mb-2">No listings yet</h2>
                        <p className="text-surface-800 mb-6 font-medium">Start earning by listing your items</p>
                        <Link to="/listings/new" className="inline-flex items-center gap-2 btn-primary px-6 py-3 rounded-xl font-semibold relative z-10">
                            <Plus className="w-4 h-4 relative z-10" />
                            <span className="relative z-10">Create First Listing</span>
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {listings.map((listing) => (
                            <div key={listing._id} className="glass rounded-2xl p-4 flex gap-4 items-start group border-white/50 shadow-sm hover:shadow-md transition-all">
                                <img
                                    src={listing.images?.[0]?.url || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=200'}
                                    alt={listing.title}
                                    className="w-24 h-20 rounded-xl object-cover flex-shrink-0 shadow-sm"
                                    onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=200'; }}
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <h3 className="font-bold text-surface-950 line-clamp-1">{listing.title}</h3>
                                            <p className="text-sm text-surface-800 font-medium">{listing.category} · {listing.location?.city}</p>
                                        </div>
                                        <span className={`badge flex-shrink-0 shadow-sm font-bold uppercase tracking-wider ${listing.availability?.isAvailable ? 'bg-primary-500/10 text-primary-900 border-primary-500/20' : 'bg-surface-200 text-surface-800 border-surface-300'}`}>
                                            {listing.availability?.isAvailable ? 'Available' : 'Unavailable'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 mt-2">
                                        <span className="text-surface-950 font-bold">₹{listing.pricePerDay?.toLocaleString()}/day</span>
                                        <span className="text-sm text-surface-800 font-medium">{listing.totalRentals} rentals</span>
                                        {listing.rating?.count > 0 && (
                                            <span className="text-sm text-amber-500 font-bold">⭐ {listing.rating.average}</span>
                                        )}
                                        <span className="text-sm text-surface-700 font-medium">{listing.views} views</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <Link to={`/listings/${listing.slug || listing._id}`} className="p-2 rounded-lg btn-ghost text-surface-700 hover:text-primary-500 font-bold border-white/50">
                                        <Eye className="w-4 h-4" />
                                    </Link>
                                    <Link to={`/listings/${listing._id}/edit`} className="p-2 rounded-lg btn-ghost text-surface-700 hover:text-primary-500 font-bold border-white/50">
                                        <Edit className="w-4 h-4" />
                                    </Link>
                                    <button onClick={() => handleDelete(listing._id)} className="p-2 rounded-lg hover:bg-red-500/10 text-surface-700 hover:text-red-500 transition-colors border-white/50">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
