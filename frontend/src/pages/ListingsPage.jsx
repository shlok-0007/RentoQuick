import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { listingsAPI } from '../api';
import ListingCard from '../components/listings/ListingCard';
import { ListingCardSkeleton } from '../components/common/Skeleton';
import {
    Search, SlidersHorizontal, X, ChevronLeft, ChevronRight,
    Package, Filter
} from 'lucide-react';

const CATEGORIES = [
    'Electronics', 'Vehicles', 'Tools & Equipment', 'Sports & Outdoors',
    'Cameras & Photography', 'Musical Instruments', 'Clothing & Accessories',
    'Furniture & Home', 'Books & Media', 'Other',
];
const CONDITIONS = ['New', 'Like New', 'Good', 'Fair', 'Poor'];
const SORT_OPTIONS = [
    { value: '-createdAt', label: 'Newest First' },
    { value: 'pricePerDay', label: 'Price: Low to High' },
    { value: '-pricePerDay', label: 'Price: High to Low' },
    { value: '-rating.average', label: 'Top Rated' },
    { value: '-views', label: 'Most Popular' },
];

export default function ListingsPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [listings, setListings] = useState([]);
    const [pagination, setPagination] = useState({});
    const [loading, setLoading] = useState(true);
    const [filtersOpen, setFiltersOpen] = useState(false);

    const [filters, setFilters] = useState({
        search: searchParams.get('search') || '',
        category: searchParams.get('category') || '',
        city: searchParams.get('city') || '',
        minPrice: searchParams.get('minPrice') || '',
        maxPrice: searchParams.get('maxPrice') || '',
        condition: searchParams.get('condition') || '',
        sort: searchParams.get('sort') || '-createdAt',
        page: Number(searchParams.get('page')) || 1,
    });

    // Sync URL params to local state
    useEffect(() => {
        setFilters({
            search: searchParams.get('search') || '',
            category: searchParams.get('category') || '',
            city: searchParams.get('city') || '',
            minPrice: searchParams.get('minPrice') || '',
            maxPrice: searchParams.get('maxPrice') || '',
            condition: searchParams.get('condition') || '',
            sort: searchParams.get('sort') || '-createdAt',
            page: Number(searchParams.get('page')) || 1,
        });
    }, [searchParams]);

    const fetchListings = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};
            searchParams.forEach((v, k) => { if (v) params[k] = v; });
            const res = await listingsAPI.getAll(params);
            setListings(res.data.listings || []);
            setPagination(res.data.pagination || {});
        } catch {
            setListings([]);
        } finally {
            setLoading(false);
        }
    }, [searchParams]);

    useEffect(() => { fetchListings(); }, [fetchListings]);

    const updateFilter = (key, value) => {
        const newParams = new URLSearchParams(searchParams);
        if (value) {
            newParams.set(key, value);
        } else {
            newParams.delete(key);
        }
        if (key !== 'page') newParams.set('page', '1');
        setSearchParams(newParams);
    };

    const clearFilters = () => {
        setSearchParams({});
    };

    const hasFilters = filters.category || filters.city || filters.minPrice ||
        filters.maxPrice || filters.condition || filters.search;

    const FilterPanel = () => (
        <div className="space-y-6">
            {/* Search */}
            <div>
                <label className="block text-xs font-bold text-surface-800 uppercase tracking-wider mb-2">Search</label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-800" />
                    <input
                        type="text"
                        placeholder="Search items..."
                        value={filters.search}
                        onChange={(e) => updateFilter('search', e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl input-dark text-sm bg-white/80"
                    />
                </div>
            </div>

            {/* Category */}
            <div>
                <label className="block text-xs font-bold text-surface-800 uppercase tracking-wider mb-2">Category</label>
                <div className="space-y-1.5">
                    <button
                        onClick={() => updateFilter('category', '')}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition-all ${!filters.category ? 'bg-primary-500/10 text-primary-900 border border-primary-500/20' : 'text-surface-800 hover:bg-primary-500/5'}`}
                    >
                        All Categories
                    </button>
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => updateFilter('category', cat)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition-all ${filters.category === cat ? 'bg-primary-500/10 text-primary-900 border border-primary-500/20' : 'text-surface-800 hover:bg-primary-500/5'}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* City */}
            <div>
                <label className="block text-xs font-bold text-surface-800 uppercase tracking-wider mb-2">City</label>
                <input
                    type="text"
                    placeholder="e.g. Mumbai"
                    value={filters.city}
                    onChange={(e) => updateFilter('city', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl input-dark text-sm bg-white/80"
                />
            </div>

            {/* Price Range */}
            <div>
                <label className="block text-xs font-bold text-surface-800 uppercase tracking-wider mb-2">Price / Day (₹)</label>
                <div className="flex gap-2">
                    <input
                        type="number"
                        placeholder="Min"
                        value={filters.minPrice}
                        onChange={(e) => updateFilter('minPrice', e.target.value)}
                        className="flex-1 px-3 py-2.5 rounded-xl input-dark text-sm bg-white/80"
                    />
                    <input
                        type="number"
                        placeholder="Max"
                        value={filters.maxPrice}
                        onChange={(e) => updateFilter('maxPrice', e.target.value)}
                        className="flex-1 px-3 py-2.5 rounded-xl input-dark text-sm bg-white/80"
                    />
                </div>
            </div>

            {/* Condition */}
            <div>
                <label className="block text-xs font-bold text-surface-800 uppercase tracking-wider mb-2">Condition</label>
                <div className="flex flex-wrap gap-2">
                    {CONDITIONS.map((c) => (
                        <button
                            key={c}
                            onClick={() => updateFilter('condition', filters.condition === c ? '' : c)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${filters.condition === c ? 'bg-primary-500/10 text-primary-900 border border-primary-500/20' : 'glass text-surface-800 hover:bg-primary-500/5'}`}
                        >
                            {c}
                        </button>
                    ))}
                </div>
            </div>

            {hasFilters && (
                <button onClick={clearFilters} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm text-primary-500 font-bold hover:bg-primary-500/10 border border-primary-500/20 transition-all">
                    <X className="w-4 h-4" /> Clear All Filters
                </button>
            )}
        </div>
    );

    return (
        <div className="min-h-screen py-8 px-4">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="font-display text-3xl font-bold text-surface-950">
                            {filters.category || 'All Listings'}
                        </h1>
                        <p className="text-surface-800 text-sm mt-1 font-medium">
                            {loading ? 'Loading...' : `${pagination.total || 0} items found`}
                            {filters.city && ` in ${filters.city}`}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Sort */}
                        <select
                            value={filters.sort}
                            onChange={(e) => updateFilter('sort', e.target.value)}
                            className="input-dark rounded-xl px-3 py-2 text-sm font-semibold bg-white/80 border-primary-500/10"
                        >
                            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        {/* Mobile filter btn */}
                        <button
                            onClick={() => setFiltersOpen(!filtersOpen)}
                            className={`lg:hidden flex items-center gap-2 px-3 py-2 rounded-xl btn-ghost text-sm font-bold ${hasFilters ? 'border-primary-500 text-primary-500' : ''}`}
                        >
                            <Filter className="w-4 h-4" />
                            Filters {hasFilters && <span className="w-2 h-2 rounded-full bg-primary-500" />}
                        </button>
                    </div>
                </div>

                <div className="flex gap-8">
                    {/* Sidebar filters */}
                    <aside className="hidden lg:block w-64 flex-shrink-0">
                        <div className="glass rounded-2xl p-5 sticky top-24 border-white/50 shadow-sm">
                            <div className="flex items-center justify-between mb-5">
                                <span className="font-bold text-surface-950 flex items-center gap-2">
                                    <SlidersHorizontal className="w-4 h-4 text-primary-500" /> Filters
                                </span>
                                {hasFilters && (
                                    <button onClick={clearFilters} className="text-xs text-primary-500 font-bold hover:text-primary-600">Clear</button>
                                )}
                            </div>
                            <FilterPanel />
                        </div>
                    </aside>

                    {/* Mobile Filters Drawer */}
                    {filtersOpen && (
                        <div className="fixed inset-0 z-50 lg:hidden">
                            <div className="absolute inset-0 bg-surface-950/40 backdrop-blur-sm" onClick={() => setFiltersOpen(false)} />
                            <div className="absolute right-0 top-0 bottom-0 w-80 glass overflow-y-auto p-6 border-l border-white/20">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="font-bold text-surface-950">Filters</h2>
                                    <button onClick={() => setFiltersOpen(false)}><X className="w-5 h-5 text-surface-950" /></button>
                                </div>
                                <FilterPanel />
                            </div>
                        </div>
                    )}

                    {/* Listings Grid */}
                    <div className="flex-1">
                        {loading ? (
                            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
                                {Array(6).fill(0).map((_, i) => <ListingCardSkeleton key={i} />)}
                            </div>
                        ) : listings.length === 0 ? (
                            <div className="text-center py-20 glass rounded-2xl border-white/50">
                                <Package className="w-16 h-16 text-primary-300 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-surface-950 mb-2">No listings found</h3>
                                <p className="text-surface-800 mb-6 font-medium">Try adjusting your filters or search term.</p>
                                <button onClick={clearFilters} className="btn-primary px-6 py-2.5 rounded-xl text-sm relative z-10">
                                    <span className="relative z-10">Clear Filters</span>
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
                                    {listings.map((l) => <ListingCard key={l._id} listing={l} />)}
                                </div>

                                {/* Pagination */}
                                {pagination.totalPages > 1 && (
                                    <div className="flex items-center justify-center gap-2 mt-10">
                                        <button
                                            onClick={() => updateFilter('page', filters.page - 1)}
                                            disabled={!pagination.hasPrev}
                                            className="p-2 rounded-xl btn-ghost disabled:opacity-40"
                                        >
                                            <ChevronLeft className="w-5 h-5" />
                                        </button>
                                        {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                                            <button
                                                key={p}
                                                onClick={() => updateFilter('page', p)}
                                                className={`w-10 h-10 rounded-xl text-sm font-semibold transition-all ${p === filters.page ? 'btn-primary relative z-10' : 'btn-ghost'
                                                    }`}
                                            >
                                                <span className="relative z-10">{p}</span>
                                            </button>
                                        ))}
                                        <button
                                            onClick={() => updateFilter('page', filters.page + 1)}
                                            disabled={!pagination.hasNext}
                                            className="p-2 rounded-xl btn-ghost disabled:opacity-40"
                                        >
                                            <ChevronRight className="w-5 h-5" />
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
