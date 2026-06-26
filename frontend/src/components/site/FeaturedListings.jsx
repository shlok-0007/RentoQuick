import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, SlidersHorizontal } from 'lucide-react';
import { listingsAPI } from '../../api';
import ListingCard from '../listings/ListingCard';
import { ListingCardSkeleton } from '../common/Skeleton';
import { fallbackListings } from '../../data/content';

const filterTabs = ['All', 'Featured', 'Electronics & Gadgets', 'Cameras & Photography', 'Vehicles - Bikes & Scooters', 'Sports & Fitness Equipment'];

export default function FeaturedListings() {
    const [featured, setFeatured] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('All');

    useEffect(() => {
        listingsAPI.getFeatured()
            .then(res => {
                const data = res.data.listings || [];
                setFeatured(data.length > 0 ? data : fallbackListings);
            })
            .catch(() => {
                setFeatured(fallbackListings);
            })
            .finally(() => setLoading(false));
    }, []);

    const filtered = featured.filter((l) => {
        if (activeTab === 'All') return true;
        if (activeTab === 'Featured') return l.isFeatured;
        return l.category === activeTab;
    });

    return (
        <section id="listings" className="py-16 md:py-24 px-4 scroll-mt-24">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-8 gap-4">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 mb-3">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                            <span className="text-xs font-bold text-primary-500 uppercase tracking-wider">Top Picks</span>
                        </div>
                        <h2 className="font-display text-3xl md:text-5xl font-extrabold tracking-tight mb-2 text-surface-950">
                            Featured Listings
                        </h2>
                        <p className="text-surface-800 text-base md:text-lg">
                            Top-rated items from verified owners across India
                        </p>
                    </div>
                    <Link
                        to="/listings"
                        className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-primary-500/20 text-primary-500 hover:text-primary-600 hover:bg-primary-500/5 hover:border-primary-500/30 font-semibold text-sm"
                    >
                        <SlidersHorizontal className="w-4 h-4" />
                        Browse All
                    </Link>
                </div>

                {/* Filter tabs */}
                <div className="flex flex-wrap items-center gap-2 mb-8 no-scrollbar overflow-x-auto pb-1">
                    {filterTabs.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${activeTab === tab
                                ? 'btn-coral text-white shadow-lg shadow-primary-500/25'
                                : 'glass text-surface-800 hover:text-primary-500 hover:bg-white/60 border-white/50'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                    <div className="hidden sm:flex items-center gap-2 ml-auto text-xs text-surface-800 font-medium">
                        <span className="px-2 py-1 rounded-lg bg-primary-500/10 text-primary-500 font-bold">
                            {loading ? '...' : filtered.length}
                        </span>
                        items found
                    </div>
                </div>

                {/* Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        {Array(4).fill(0).map((_, i) => <ListingCardSkeleton key={i} />)}
                    </div>
                ) : filtered.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        {filtered.slice(0, 8).map((listing) => (
                            <ListingCard key={listing._id} listing={listing} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 glass rounded-3xl border-white/50">
                        <div className="w-16 h-16 rounded-2xl bg-primary-500/10 flex items-center justify-center mx-auto mb-4">
                            <SlidersHorizontal className="w-8 h-8 text-primary-500/60" />
                        </div>
                        <h3 className="text-xl font-bold mb-2 text-surface-950">No listings found</h3>
                        <p className="text-surface-800 mb-6 font-medium">Try adjusting your filters or search term.</p>
                        <button onClick={() => setActiveTab('All')} className="btn-coral px-6 py-2.5 rounded-xl text-sm font-semibold">
                            Clear Filters
                        </button>
                    </div>
                )}

                {/* View all */}
                <div className="flex justify-center mt-10">
                    <Link
                        to="/listings"
                        className="inline-flex items-center gap-2 px-8 py-3 rounded-xl border border-primary-500/20 text-primary-500 hover:text-primary-600 hover:bg-primary-500/5 hover:border-primary-500/30 font-semibold"
                    >
                        Load More Listings
                        <ChevronRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>
        </section>
    );
}
