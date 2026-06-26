import { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { listingsAPI, savedSearchesAPI } from '../api';
import ListingCard from '../components/listings/ListingCard';
import { ListingCardSkeleton } from '../components/common/Skeleton';
import {
    Search, SlidersHorizontal, X, ChevronLeft, ChevronRight,
    Package, Filter, Bookmark, BookmarkCheck, MoreHorizontal
} from 'lucide-react';
import toast from 'react-hot-toast';
import { CATEGORIES, CONDITIONS } from '../data/categories';

const CATEGORY_NAMES = CATEGORIES.map(c => c.name);
const CONDITION_NAMES = CONDITIONS.map(c => c.name);
const SORT_OPTIONS = [
    { value: '-createdAt', label: 'Newest First' },
    { value: 'pricePerDay', label: 'Price: Low to High' },
    { value: '-pricePerDay', label: 'Price: High to Low' },
    { value: '-rating.average', label: 'Top Rated' },
    { value: '-views', label: 'Most Popular' },
];

const FilterPanel = memo(function FilterPanel({ filters, updateFilter, clearFilters, hasFilters, onSearchChange }) {
    return (
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
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl input-dark text-sm bg-white/80"
                    />
                </div>
            </div>

            {/* Category */}
            <div>
                <label className="block text-xs font-bold text-surface-800 uppercase tracking-wider mb-2">Category</label>
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    <button
                        onClick={() => updateFilter('category', '')}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition-all ${!filters.category ? 'bg-primary-500/10 text-primary-900 border border-primary-500/20' : 'text-surface-800 hover:bg-primary-500/5'}`}
                    >
                        All Categories
                    </button>
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat.name}
                            onClick={() => updateFilter('category', cat.name)}
                            className={`w-full flex items-center gap-2 text-left px-3 py-2 rounded-lg text-sm font-semibold transition-all ${filters.category === cat.name ? 'bg-primary-500/10 text-primary-900 border border-primary-500/20' : 'text-surface-800 hover:bg-primary-500/5'}`}
                        >
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                            <span className="truncate">{cat.name}</span>
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

            {/* Availability Dates */}
            <div className="space-y-3">
                <label className="block text-xs font-bold text-surface-800 uppercase tracking-wider mb-2">Availability</label>
                <div>
                    <label className="block text-[10px] text-surface-700 mb-1 font-bold">Start Date</label>
                    <input
                        type="date"
                        value={filters.startDate}
                        onChange={(e) => updateFilter('startDate', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl input-dark text-sm bg-white/80"
                    />
                </div>
                <div>
                    <label className="block text-[10px] text-surface-700 mb-1 font-bold">End Date</label>
                    <input
                        type="date"
                        value={filters.endDate}
                        min={filters.startDate}
                        onChange={(e) => updateFilter('endDate', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl input-dark text-sm bg-white/80"
                    />
                </div>
            </div>

            {/* Condition */}
            <div>
                <label className="block text-xs font-bold text-surface-800 uppercase tracking-wider mb-2">Condition</label>
                <div className="flex flex-wrap gap-2">
                    {CONDITIONS.map((c) => (
                        <button
                            key={c.name}
                            onClick={() => updateFilter('condition', filters.condition === c.name ? '' : c.name)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${filters.condition === c.name ? `${c.bg} ${c.text} ${c.border}` : 'glass text-surface-800 hover:bg-primary-500/5 border-white/50'}`}
                        >
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                            {c.name}
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
});

// Windowed pagination helper
function PaginationControls({ currentPage, totalPages, onPageChange }) {
    const pages = useMemo(() => {
        if (totalPages <= 7) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }
        const pages = [];
        const delta = 2;
        const left = Math.max(2, currentPage - delta);
        const right = Math.min(totalPages - 1, currentPage + delta);

        pages.push(1);
        if (left > 2) pages.push('...');
        for (let i = left; i <= right; i++) pages.push(i);
        if (right < totalPages - 1) pages.push('...');
        pages.push(totalPages);
        return pages;
    }, [currentPage, totalPages]);

    return (
        <div className="flex items-center justify-center gap-2 mt-10">
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="p-2 rounded-xl btn-ghost disabled:opacity-40"
            >
                <ChevronLeft className="w-5 h-5" />
            </button>
            {pages.map((p, i) =>
                p === '...' ? (
                    <span key={`ellipsis-${i}`} className="w-10 h-10 flex items-center justify-center text-surface-400 font-bold">
                        <MoreHorizontal className="w-4 h-4" />
                    </span>
                ) : (
                    <button
                        key={p}
                        onClick={() => onPageChange(p)}
                        className={`w-10 h-10 rounded-xl text-sm font-semibold transition-all ${p === currentPage ? 'btn-primary relative z-10' : 'btn-ghost'}`}
                    >
                        <span className="relative z-10">{p}</span>
                    </button>
                )
            )}
            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="p-2 rounded-xl btn-ghost disabled:opacity-40"
            >
                <ChevronRight className="w-5 h-5" />
            </button>
        </div>
    );
}

export default function ListingsPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [listings, setListings] = useState([]);
    const [pagination, setPagination] = useState({});
    const [loading, setLoading] = useState(true);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [searchSaved, setSearchSaved] = useState(false);
    const [searchSaving, setSearchSaving] = useState(false);
    const abortRef = useRef(null);
    const debounceRef = useRef(null);

    const [filters, setFilters] = useState({
        search: searchParams.get('search') || '',
        category: searchParams.get('category') || '',
        city: searchParams.get('city') || '',
        minPrice: searchParams.get('minPrice') || '',
        maxPrice: searchParams.get('maxPrice') || '',
        condition: searchParams.get('condition') || '',
        sort: searchParams.get('sort') || '-createdAt',
        page: Number(searchParams.get('page')) || 1,
        startDate: searchParams.get('startDate') || '',
        endDate: searchParams.get('endDate') || '',
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
            startDate: searchParams.get('startDate') || '',
            endDate: searchParams.get('endDate') || '',
        });
    }, [searchParams]);

    const fetchListings = useCallback(async () => {
        // Cancel previous request
        if (abortRef.current) abortRef.current.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setLoading(true);
        try {
            const params = {};
            searchParams.forEach((v, k) => { if (v) params[k] = v; });
            const res = await listingsAPI.getAll(params);
            if (!controller.signal.aborted) {
                setListings(res.data.listings || []);
                setPagination(res.data.pagination || {});
            }
        } catch {
            if (!controller.signal.aborted) {
                setListings([]);
            }
        } finally {
            if (!controller.signal.aborted) {
                setLoading(false);
            }
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

    // Debounced search update
    const handleSearchDebounced = (value) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            updateFilter('search', value);
        }, 350);
    };

    const clearFilters = () => {
        setSearchParams({});
    };

    const handleSaveSearch = async () => {
        try {
            setSearchSaving(true);
            const searchName = filters.category || filters.search || filters.city || 'My Search';
            await savedSearchesAPI.save({
                name: searchName,
                filters: {
                    search: filters.search,
                    category: filters.category,
                    city: filters.city,
                    minPrice: filters.minPrice,
                    maxPrice: filters.maxPrice,
                    condition: filters.condition,
                }
            });
            setSearchSaved(true);
            toast.success('Search saved! You\'ll get alerts for new matches.');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save search');
        } finally {
            setSearchSaving(false);
        }
    };

    const hasFilters = filters.category || filters.city || filters.minPrice ||
        filters.maxPrice || filters.condition || filters.search || filters.startDate || filters.endDate;

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
                        {hasFilters && (
                            <button
                                onClick={handleSaveSearch}
                                disabled={searchSaving || searchSaved}
                                className={`hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-all ${searchSaved ? 'text-emerald-600 border-2 border-emerald-500/20 bg-emerald-500/5' : 'text-primary-500 border-2 border-primary-500/20 hover:bg-primary-500/5'}`}
                            >
                                {searchSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                                {searchSaved ? 'Saved' : searchSaving ? 'Saving...' : 'Save Search'}
                            </button>
                        )}
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
                            <FilterPanel filters={filters} updateFilter={updateFilter} clearFilters={clearFilters} hasFilters={hasFilters} onSearchChange={handleSearchDebounced} />
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
                                <FilterPanel filters={filters} updateFilter={updateFilter} clearFilters={clearFilters} hasFilters={hasFilters} onSearchChange={handleSearchDebounced} />
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
                                    <PaginationControls
                                        currentPage={filters.page}
                                        totalPages={pagination.totalPages}
                                        onPageChange={(p) => updateFilter('page', p)}
                                    />
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}