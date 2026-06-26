import { useState, useEffect, useRef, useCallback } from 'react';
import { productsAPI } from '../../api/index';
import { Popover, PopoverTrigger, PopoverContent } from '../ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandSeparator } from '../ui/command';
import { useDebounce } from '../../hooks/useDebounce';
import { getThumbnailUrl } from '../../lib/cloudinary';
import toast from 'react-hot-toast';
import {
    Search,
    Sparkles,
    ShieldCheck,
    AlertTriangle,
    Loader2,
    PackageX,
    Pencil,
    Image as ImageIcon,
} from 'lucide-react';

/**
 * SmartProductSuggestion
 *
 * A Command + Popover based autocomplete that:
 *  1. Debounces user input (300ms) → calls backend proxy → SerpApi
 *  2. On product select → fires background Gemini verification
 *  3. If valid → auto-fills parent form (title, description, category, thumbnail)
 *  4. If invalid → warns the user
 *  5. Always shows "Manual Add" fallback
 *
 * Props:
 *  - onProductSelect({ title, description, category, thumbnail, verifiedProductId, isVerifiedByAI, verificationDetails })
 *  - currentTitle: string (to pre-seed or skip when already filled)
 */
export default function SmartProductSuggestion({ onProductSelect, currentTitle }) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(null); // product id being verified
    const [verifiedIds, setVerifiedIds] = useState(new Set());
    const [verificationFailed, setVerificationFailed] = useState(new Set());
    const [apiError, setApiError] = useState(false);

    // Debounce the query — API only fires 300ms after typing stops
    const debouncedQuery = useDebounce(query, 300);

    // ── Fetch products whenever debounced query changes ──────────────
    useEffect(() => {
        if (!debouncedQuery || debouncedQuery.trim().length < 2) {
            setResults([]);
            setApiError(false);
            return;
        }

        let cancelled = false;
        setLoading(true);
        setApiError(false);

        (async () => {
            try {
                const res = await productsAPI.search(debouncedQuery.trim());
                if (cancelled) return;
                const data = res.data;
                setResults(data.results || []);
            } catch (err) {
                if (cancelled) return;
                console.error('[SmartSuggestion] Search error:', err);
                setApiError(true);
                setResults([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => { cancelled = true; };
    }, [debouncedQuery]);

    const inputRef = useRef(null);

    // ── Handle input change ─────────────────────────────────────────
    const handleInputChange = (value) => {
        setQuery(value);
        // Debouncing is handled by useDebounce hook + useEffect above
    };

    // ── Background Gemini verification after selection ──────────────
    const handleSelect = async (product) => {
        setOpen(false);
        setVerifying(product.id);

        // Immediately populate with search data so user sees instant feedback
        onProductSelect({
            title: product.title,
            description: product.description || '',
            category: '',
            thumbnail: product.thumbnail || '',
            verifiedProductId: product.id,
            isVerifiedByAI: false, // pending
            verificationDetails: null,
        });

        // Background verification
        try {
            const res = await productsAPI.verify({
                title: product.title,
                description: product.description || '',
            });
            const { verification } = res.data;

            if (verification) {
                setVerifiedIds((prev) => new Set([...prev, product.id]));

                if (!verification.isValid) {
                    setVerificationFailed((prev) => new Set([...prev, product.id]));
                    toast.error(
                        `AI could not verify "${product.title}". Please double-check the product details.`,
                        { duration: 5000, icon: <AlertTriangle className="w-4 h-4 text-amber-500" /> }
                    );
                } else {
                    toast.success(
                        `Product verified! (Confidence: ${verification.confidenceScore}%)`,
                        { duration: 3000, icon: <ShieldCheck className="w-4 h-4 text-green-500" /> }
                    );
                }

                // Auto-fill with verified data
                onProductSelect({
                    title: product.title,
                    description: verification.suggestedDescription || product.description || '',
                    category: verification.standardizedCategory || '',
                    thumbnail: verification.suggestedThumbnail || product.thumbnail || '',
                    verifiedProductId: product.id,
                    isVerifiedByAI: verification.isValid,
                    verificationDetails: verification,
                });
            }
        } catch (err) {
            console.error('[SmartSuggestion] Verification error:', err);
            toast('AI verification unavailable — your listing was saved without verification.', {
                icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,
                duration: 4000,
            });
        } finally {
            setVerifying(null);
        }
    };

    // ── Manual add fallback ─────────────────────────────────────────
    const handleManualAdd = () => {
        setOpen(false);
        setQuery('');
        // Signal to parent: user wants manual entry
        onProductSelect({
            title: query.trim(),
            description: '',
            category: '',
            thumbnail: '',
            verifiedProductId: null,
            isVerifiedByAI: false,
            verificationDetails: null,
            manualEntry: true,
        });
    };

    // ── Render a product item ───────────────────────────────────────
    const renderProductItem = (product) => {
        const isVerified = verifiedIds.has(product.id);
        const isFailed = verificationFailed.has(product.id);
        const isVerifying = verifying === product.id;

        return (
            <CommandItem
                key={product.id}
                value={product.title}
                onSelect={() => handleSelect(product)}
                className="flex items-start gap-3 px-3 py-2.5"
            >
                {/* Thumbnail */}
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-surface-100 flex-shrink-0 border border-primary-500/10">
                    {product.thumbnail ? (
                        <img
                            src={getThumbnailUrl(product.thumbnail)}
                            alt={product.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-surface-700">
                            <PackageX className="w-4 h-4" />
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-surface-900 truncate">
                            {product.title}
                        </span>
                        {isVerifying && (
                            <Loader2 className="w-3.5 h-3.5 text-primary-500 animate-spin flex-shrink-0" />
                        )}
                        {isVerified && !isFailed && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold flex-shrink-0">
                                <ShieldCheck className="w-2.5 h-2.5" />
                                Verified by AI
                            </span>
                        )}
                        {isFailed && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold flex-shrink-0">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                Unverified
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                        {product.price && (
                            <span className="text-xs font-semibold text-primary-500">
                                {product.price}
                            </span>
                        )}
                        {product.source && (
                            <span className="text-[10px] text-surface-700 truncate">
                                {product.source}
                            </span>
                        )}
                        {product.rating && (
                            <span className="text-[10px] text-amber-600 font-medium">
                                ★ {product.rating}
                            </span>
                        )}
                    </div>
                    {product.description && (
                        <p className="text-[11px] text-surface-700 mt-0.5 line-clamp-1">
                            {product.description}
                        </p>
                    )}
                </div>
            </CommandItem>
        );
    };

    return (
        <div className="space-y-1.5">
            <Popover
                open={open}
                onOpenChange={(isOpen) => {
                    setOpen(isOpen);
                    if (!isOpen) setQuery('');
                }}
            >
                <PopoverTrigger asChild>
                    <button
                        type="button"
                        className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl input-dark text-sm bg-white/60 focus:bg-white transition-all font-medium text-left border-primary-500/10 hover:border-primary-500/30 group"
                        onClick={() => {
                            if (currentTitle) {
                                // Pre-fill the search with current title
                                setQuery(currentTitle);
                                setOpen(true);
                                setTimeout(() => {
                                    if (inputRef.current) {
                                        inputRef.current.focus();
                                    }
                                }, 50);
                            } else {
                                setOpen(true);
                                setTimeout(() => {
                                    if (inputRef.current) {
                                        inputRef.current.focus();
                                    }
                                }, 50);
                            }
                        }}
                    >
                        <Sparkles className="w-4 h-4 text-primary-500 group-hover:rotate-12 transition-transform" />
                        <span className="flex-1 text-surface-800">
                            {currentTitle
                                ? `${currentTitle.length > 60 ? currentTitle.slice(0, 60) + '...' : currentTitle} — Tap to search`
                                : 'Search for a product to auto-fill details...'}
                        </span>
                        <Search className="w-4 h-4 text-surface-700" />
                    </button>
                </PopoverTrigger>

                <PopoverContent
                    className="w-[calc(100vw-2rem)] sm:w-[460px] p-0 shadow-2xl border-primary-500/20"
                    align="start"
                    sideOffset={8}
                    onOpenAutoFocus={(e) => {
                        e.preventDefault();
                        if (inputRef.current) inputRef.current.focus();
                    }}
                >
                    <Command shouldFilter={false} className="rounded-xl overflow-hidden">
                        <CommandInput
                            ref={inputRef}
                            placeholder="Type a product name... (e.g. Sony A7III, MacBook Pro M3)"
                            value={query}
                            onValueChange={handleInputChange}
                        />

                        <CommandList>
                            {/* Loading state */}
                            {loading && (
                                <div className="flex items-center justify-center gap-2 py-8 text-sm text-surface-700">
                                    <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
                                    <span className="font-medium">Searching products...</span>
                                </div>
                            )}

                            {/* API error — show fallback */}
                            {!loading && apiError && (
                                <div className="py-4 px-4 text-center">
                                    <p className="text-sm text-surface-700 font-medium mb-3">
                                        Product search is currently unavailable.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={handleManualAdd}
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl btn-primary text-sm relative z-10"
                                    >
                                        <Pencil className="w-4 h-4 relative z-10" />
                                        <span className="relative z-10">Add Manually</span>
                                    </button>
                                </div>
                            )}

                            {/* Empty query */}
                            {!loading && !apiError && query.trim().length < 2 && (
                                <CommandEmpty>
                                    <div className="py-4 px-2 text-center">
                                        <Sparkles className="w-8 h-8 text-primary-300 mx-auto mb-2" />
                                        <p className="text-sm font-medium text-surface-800">
                                            Type at least 2 characters to search
                                        </p>
                                        <p className="text-xs text-surface-700 mt-1">
                                            Powered by AI-enhanced product search
                                        </p>
                                    </div>
                                </CommandEmpty>
                            )}

                            {/* No results found */}
                            {!loading && !apiError && query.trim().length >= 2 && results.length === 0 && (
                                <CommandEmpty>
                                    <div className="py-4 px-2 text-center">
                                        <PackageX className="w-8 h-8 text-surface-700/40 mx-auto mb-2" />
                                        <p className="text-sm font-medium text-surface-800">
                                            No products found for "{query.trim()}"
                                        </p>
                                        <p className="text-xs text-surface-700 mt-1 mb-3">
                                            Try a different search or add manually
                                        </p>
                                        <button
                                            type="button"
                                            onClick={handleManualAdd}
                                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl btn-ghost text-sm"
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                            Manual Add
                                        </button>
                                    </div>
                                </CommandEmpty>
                            )}

                            {/* Product results */}
                            {!loading && !apiError && results.length > 0 && (
                                <>
                                    <CommandGroup heading="Suggested Products">
                                        {results.map(renderProductItem)}
                                    </CommandGroup>

                                    <CommandSeparator />

                                    {/* Manual add fallback */}
                                    <div className="p-2">
                                        <button
                                            type="button"
                                            onClick={handleManualAdd}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl btn-ghost text-xs font-bold text-surface-700 hover:text-primary-500 transition-colors"
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                            Can't find your product? Add manually
                                        </button>
                                    </div>
                                </>
                            )}
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

            {/* Inline verification progress for selected product */}
            {verifying && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl glass border border-primary-500/20 bg-primary-500/5 animate-pulse">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-500" />
                    <span className="text-xs font-medium text-surface-800">
                        Verifying product with AI...
                    </span>
                </div>
            )}
        </div>
    );
}