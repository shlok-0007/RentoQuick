import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { listingsAPI, aiAPI } from '../api';
import { Toaster } from "react-hot-toast";
import toast from 'react-hot-toast';
import { Plus, X, Upload, Tag, DollarSign, MapPin, Info, CheckCircle, ChevronDown, AlertCircle, Check, Search, ShieldCheck, Sparkles, Loader2, Wand2 } from 'lucide-react';
import { z } from 'zod';
import { basicInfoSchema, pricingSchema, locationSchema } from '../schemas/listingSchema';
import citiesData from '../data/cities.json';
import { CATEGORIES, CONDITIONS, getCategoryColor } from '../data/categories';
import CustomDropdown from '../components/common/CustomDropdown';
import SmartProductSuggestion from '../components/listing/SmartProductSuggestion';
import { useListingContext } from '../context/ListingContext';


const CONDITIONS_LIST = CONDITIONS.map(c => c.name);

const steps = ['Basic Info', 'Pricing', 'Location', 'Details'];

const STEP_FIELDS = [
    ["title", "description", "category", "condition", "images"],
    ["pricePerDay", "pricePerWeek", "pricePerMonth", "securityDeposit", "minRentalDays", "maxRentalDays"],
    ["location.state", "location.city", "location.address", "location.pincode", "location.coordinates"]
];

// Derive states & city map from cities.json (static data — computed once)
const STATES = [...new Set(citiesData.map(c => c.state))].sort();

const STATE_CITY_MAP = (() => {
    const map = {};
    citiesData.forEach(c => {
        if (!map[c.state]) map[c.state] = [];
        map[c.state].push(c.name);
    });
    Object.keys(map).forEach(s => map[s].sort());
    return map;
})();

const step0Schema = basicInfoSchema;
const step1Schema = pricingSchema;
const step2Schema = z.object({ location: locationSchema });

// Friendly label map for toast error messages
const FIELD_LABELS = {
    title: 'Title',
    description: 'Description',
    category: 'Category',
    condition: 'Condition',
    images: 'Images',
    pricePerDay: 'Price Per Day',
    pricePerWeek: 'Price Per Week',
    pricePerMonth: 'Price Per Month',
    securityDeposit: 'Security Deposit',
    minRentalDays: 'Min Rental Days',
    maxRentalDays: 'Max Rental Days',
    'location.state': 'State',
    'location.city': 'City',
    'location.address': 'Address',
    'location.pincode': 'Pincode',
    'location.coordinates': 'Location',
};

export default function CreateListingPage() {
    const navigate = useNavigate();
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [tagInput, setTagInput] = useState('');
    const [errors, setErrors] = useState({});

    // ── AI Auto-Fill state ──
    const [aiLoading, setAiLoading] = useState(false);

    // ── Smart Product Suggestion state ──
    const [verificationDetails, setVerificationDetails] = useState(null);
    const [aiVerified, setAiVerified] = useState(false);

    // ── Listing Context for AI-generated field persistence ──
    const { aiSuggestion, suggestedPrice, saveAiSuggestion, clearAiSuggestion } = useListingContext();
    // Add this line to define the variable
    const aiGenerated = !!aiSuggestion;

    // Restore AI suggestion from context on mount (e.g. user navigated back)
    useEffect(() => {
        if (aiSuggestion) {
            // Don't overwrite fields the user has already manually set.
            // Only fill if the form field is currently empty.
            setForm(prev => ({
                ...prev,
                ...(prev.category === '' && aiSuggestion.category ? { category: aiSuggestion.category } : {}),
                ...(prev.description === '' && aiSuggestion.description ? { description: aiSuggestion.description } : {}),
                ...(prev.tags.length === 0 && aiSuggestion.tags?.length ? { tags: aiSuggestion.tags } : {}),
                ...(prev.pricePerDay === '' && aiSuggestion.suggestedPrice ? { pricePerDay: String(aiSuggestion.suggestedPrice) } : {}),
            }));
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const [form, setForm] = useState({
        title: '', description: '', category: '', condition: '',
        pricePerDay: '', pricePerWeek: '', pricePerMonth: '', securityDeposit: '',
        minRentalDays: 1, maxRentalDays: 30,
        location: { state: '', city: '', address: '', pincode: '', coordinates: null },
        tags: [],
        images: [],
    });

    const update = (key, value) => setForm(f => ({ ...f, [key]: value }));
    const updateNested = (parent, key, value) => setForm(f => ({ ...f, [parent]: { ...f[parent], [key]: value } }));

    // Get filtered cities based on selected state
    const availableCities = form.location.state ? (STATE_CITY_MAP[form.location.state] || []) : [];

    // When state changes, reset city
    const handleStateChange = (newState) => {
        updateNested('location', 'state', newState);
        updateNested('location', 'city', '');
        setErrors(prev => ({ ...prev, 'location.state': '', 'location.city': '' }));
    };

    const handleCityChange = (newCity) => {
        updateNested('location', 'city', newCity);
        setErrors(prev => ({ ...prev, 'location.city': '' }));
    };

    // ── AI Auto-Fill Handler ─────────────────────────────────
    const handleAiGenerate = useCallback(async () => {
        const title = form.title.trim();
        if (title.length < 3) {
            toast.error('Please enter at least 3 characters in the title before generating.');
            return;
        }

        setAiLoading(true);
        const aiToast = toast.loading('AI is generating suggestions...', {
            icon: <Wand2 className="w-4 h-4 animate-spin" />,
        });

        try {
            const res = await aiAPI.suggest(title);
            const data = res.data.data;

            // Save to global ListingContext for cross-step persistence
            saveAiSuggestion(data);

            // ── Auto-fill Category ──
            if (data.category) {
                update('category', data.category);
                setErrors(prev => ({ ...prev, category: '' }));
                setCatSearch('');
            }

            // ── Auto-fill Description ──
            if (data.description) {
                update('description', data.description);
                setErrors(prev => ({ ...prev, description: '' }));
            }

            // ── Auto-fill Tags ──
            if (data.tags?.length) {
                update('tags', data.tags);
            }

            // ── Auto-fill Price (persisted via context for Pricing page) ──
            if (data.suggestedPrice) {
                update('pricePerDay', String(data.suggestedPrice));
                setErrors(prev => ({ ...prev, pricePerDay: '' }));
            }

            // Category match warning
            if (!data.categoryMatched && data.originalCategory) {
                toast(`AI suggested "${data.originalCategory}" — mapped to "${data.category}"`, {
                    icon: <AlertCircle className="w-4 h-4 text-amber-500" />,
                    duration: 5000,
                });
            }

            // Differentiate cached vs fresh in toast
            const cacheNote = res.data.cached ? ' (from cache)' : '';
            toast.success(`AI suggestions applied${cacheNote}! Feel free to edit any field.`, {
                id: aiToast,
                duration: 3000,
            });
        } catch (err) {
            const resp = err.response?.data;
            const code = resp?.code;
            const retryAfter = resp?.retryAfter;
            const msg = resp?.message || err.message || 'AI suggestion failed. Please try again.';

            // Show context-aware toast based on structured error code
            if (code === 'RATE_LIMITED' || code === 'DEDUP_BLOCKED' || code === 'CIRCUIT_OPEN') {
                toast.error(msg, {
                    id: aiToast,
                    duration: (retryAfter || 5) * 1000,
                });
            } else if (code === 'UNAVAILABLE') {
                toast.error(msg, {
                    id: aiToast,
                    duration: 5000,
                    icon: <AlertCircle className="w-4 h-4 text-amber-500" />,
                });
            } else {
                toast.error(msg, {
                    id: aiToast,
                    duration: 4000,
                });
            }
        } finally {
            setAiLoading(false);
        }
    }, [form.title, saveAiSuggestion]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Smart Product Suggestion handler ──────────────────────────────
    const handleProductSelect = (product) => {
        if (product.manualEntry) {
            // Manual entry — just focus the title field
            setAiVerified(false);
            setVerificationDetails(null);
            return;
        }

        // Auto-fill form fields from the selected/verified product
        const updates = {};

        if (product.title) {
            updates.title = product.title.slice(0, 100); // respect max 100 chars
            setErrors(prev => ({ ...prev, title: '' }));
        }

        if (product.description) {
            updates.description = product.description.slice(0, 2000); // respect max 2000 chars
            setErrors(prev => ({ ...prev, description: '' }));
        }

        // Try to match the standardized category to our enum
        if (product.category) {
            const match = CATEGORIES.find(
                (c) => c.name.toLowerCase() === product.category.toLowerCase()
            );
            if (match) {
                updates.category = match.name;
                setErrors(prev => ({ ...prev, category: '' }));
            }
        }

        // Apply thumbnail as first image if no images yet and thumbnail exists
        if (product.thumbnail && form.images.length === 0) {
            updates.images = [{ url: product.thumbnail, alt: product.title }];
        }

        setForm((prev) => ({ ...prev, ...updates }));

        // Track verification state
        if (product.verificationDetails) {
            setVerificationDetails(product.verificationDetails);
            setAiVerified(product.isVerifiedByAI);
        }
    };

    const addTag = () => {
        if (tagInput.trim()) {
            update('tags', [...form.tags, tagInput.trim().toLowerCase()]);
            setTagInput('');
        }
    };
    const removeTag = (i) => update('tags', form.tags.filter((_, idx) => idx !== i));

    const handleFileChange = async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        if (form.images.length + files.length > 5) {
            toast.error('You can upload a maximum of 5 images total.');
            return;
        }

        try {
            setLoading(true);
            const formData = new FormData();
            files.forEach(file => formData.append('images', file));

            const res = await listingsAPI.uploadImages(formData);
            const uploadedImages = res.data.images;

            update('images', [...form.images, ...uploadedImages]);
            toast.success('Images uploaded!');
        } catch (err) {
            toast.error('Image upload failed');
        } finally {
            setLoading(false);
        }
    };

    const removeImage = (i) => update('images', form.images.filter((_, idx) => idx !== i));

    const validateStep = (stepIndex = step, showError = false) => {
        let schema;
        if (stepIndex === 0) schema = step0Schema;
        else if (stepIndex === 1) schema = step1Schema;
        else if (stepIndex === 2) schema = step2Schema;
        else return true; // Step 3 (Details) has no required schema

        try {
            schema.parse(form);
            // Clear only the errors for this step's fields
            setErrors(prev => { const next = { ...prev }; STEP_FIELDS[stepIndex].forEach(f => delete next[f]); return next; });
            return true;
        } catch (err) {
            if (err instanceof z.ZodError) {
                const errs = {};
                err.issues.forEach((e) => {
                    const path = e.path.join('.');
                    errs[path] = e.message;
                });
                setErrors(prev => ({ ...prev, ...errs }));
                if (showError) {
                    // Render each error as its own toast so they're readable
                    err.issues.forEach((e, idx) => {
                        const path = e.path.join('.');
                        const label = FIELD_LABELS[path] || path;
                        toast.error(`${label}: ${e.message}`, {
                            duration: 4500,
                            // Stagger multiple toasts so they stack visibly
                            id: `err-${stepIndex}-${idx}`,
                        });
                    });
                }
            }
            return false;
        }
    };

    const handleSubmit = async () => {
        // Validate all steps explicitly (no stale state) before submitting
        for (let i = 0; i < steps.length - 1; i++) { // Steps 0-2 have schemas
            const isValid = validateStep(i, true);
            if (!isValid) {
                setStep(i); // Jump to the first invalid step
                toast.error(
                    'Please complete all required fields before publishing.',
                    {
                        duration: 3500,
                    }
                );
                return;
            }
        }

        try {
            setLoading(true);
            const payload = {
                ...form,
                location: {
                    ...form.location,
                    searchLocation: `${form.location.city}, ${form.location.state}`,
                },
                pricePerDay: Number(form.pricePerDay),
                pricePerWeek: form.pricePerWeek ? Number(form.pricePerWeek) : null,
                pricePerMonth: form.pricePerMonth ? Number(form.pricePerMonth) : null,
                securityDeposit: form.securityDeposit ? Number(form.securityDeposit) : 0,
                minRentalDays: Number(form.minRentalDays),
                maxRentalDays: Number(form.maxRentalDays),
                availability: {
                    minRentalDays: Number(form.minRentalDays),
                    maxRentalDays: Number(form.maxRentalDays),
                },
                images: form.images,
                // ── AI verification fields ──
                verifiedProductId: verificationDetails ? (verificationDetails.suggestedThumbnail || form.title) : undefined,
                isVerifiedByAI: aiVerified,
                verificationDetails: verificationDetails || undefined,
            };
            console.log("Payload =", payload);
            const res = await listingsAPI.create(payload);
            toast.success('Listing published successfully!');
            clearAiSuggestion(); // Clear AI state after successful submission
            navigate(`/listings/${res.data.listing.slug || res.data.listing._id}`);
        } 
        catch (err) {
            console.error(err);
            const msg =
                err.response?.data?.message ||
                err.message ||
                'Failed to create listing. Please check your inputs.';

            toast.error(msg, {
                duration: 5000
            });
        }
        finally {
            setLoading(false);
        }
    };

    const handleNext = () => {
        if (validateStep(step, true)) {
            setStep(s => s + 1);
        }
    };

    // Helper to render field error
    const FieldError = ({ field }) => {
        if (!errors[field]) return null;
        return (
            <p className="flex items-center gap-1 text-xs text-red-500 mt-1 font-medium">
                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                {errors[field]}
            </p>
        );
    };

    // ---- Custom colored Category dropdown ----
    const [catOpen, setCatOpen] = useState(false);
    const [catSearch, setCatSearch] = useState('');
    const catRef = useRef(null);
    const selectedCat = CATEGORIES.find(c => c.name === form.category);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (catRef.current && !catRef.current.contains(e.target)) {
                setCatOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredCategories = CATEGORIES.filter(c =>
        c.name.toLowerCase().includes(catSearch.toLowerCase())
    );

    return (
        <div className="min-h-screen py-10 px-4">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="text-center mb-10">
                    <h1 className="font-display text-3xl font-bold text-surface-950 mb-2">Create a Listing</h1>
                    <p className="text-surface-800 font-medium">Fill in the details and start earning from your item</p>
                </div>

                {/* Step progress */}
                <div className="flex items-center gap-2 mb-10">
                    {steps.map((label, i) => (
                        <div key={i} className="flex items-center gap-2 flex-1">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all flex-shrink-0 ${i < step ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20' : i === step ? 'btn-primary relative shadow-lg shadow-primary-500/30' : 'glass text-surface-800 border-white/40'
                                }`}>
                                {i < step ? <CheckCircle className="w-4 h-4" /> : <span className={i === step ? 'relative z-10' : ''}>{i + 1}</span>}
                            </div>
                            <span className={`text-sm hidden sm:block font-bold ${i === step ? 'text-primary-500' : 'text-surface-800'}`}>{label}</span>
                            {i < steps.length - 1 && <div className={`flex-1 h-0.5 ${i < step ? 'bg-primary-500' : 'bg-primary-500/10'}`} />}
                        </div>
                    ))}
                </div>

                <div className="glass rounded-3xl p-8 border-white/50 shadow-xl">
                    {/* Step 0: Basic Info */}
                    {step === 0 && (
                        <div className="space-y-5">
                            <h2 className="text-xl font-bold text-surface-950 flex items-center gap-2">
                                <Info className="w-5 h-5 text-primary-500" /> Basic Information
                            </h2>

                            {/* ── Smart Product Suggestion ── */}
                            <div>
                                <label className="block text-sm font-bold text-surface-800 mb-2 flex items-center gap-1.5">
                                    <Sparkles className="w-4 h-4 text-primary-500" />
                                    Smart Product Search
                                </label>
                                <SmartProductSuggestion
                                    onProductSelect={handleProductSelect}
                                    currentTitle={form.title}
                                />
                                {aiVerified && verificationDetails && (
                                    <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-green-50 border border-green-200">
                                        <ShieldCheck className="w-4 h-4 text-green-600 flex-shrink-0" />
                                        <span className="text-xs font-bold text-green-700">
                                            Verified by AI — {verificationDetails.confidenceScore}% confidence
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* ── Title with AI Generate Button ── */}
                            <div>
                                <label className="block text-sm font-bold text-surface-800 mb-2">Title <span className="text-primary-500">*</span></label>
                                <div className="flex gap-2">
                                    <input
                                        value={form.title}
                                        onChange={e => { update('title', e.target.value); setErrors(prev => ({ ...prev, title: '' })); }}
                                        placeholder="e.g. Sony A7III Mirrorless Camera"
                                        className={`flex-1 px-4 py-3 rounded-xl input-dark text-sm bg-white/60 focus:bg-white transition-all font-medium ${errors.title ? 'border-red-400 ring-2 ring-red-100' : 'border-primary-500/10'}`}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAiGenerate}
                                        disabled={aiLoading || form.title.trim().length < 3}
                                        title="AI Auto-Fill: Generate category, description, tags & price from your title"
                                        className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap relative z-10 ${
                                            aiLoading
                                                ? 'bg-primary-500/20 text-primary-600 cursor-wait'
                                                : form.title.trim().length < 3
                                                    ? 'glass text-surface-700 opacity-40 cursor-not-allowed border-white/50'
                                                    : 'btn-primary hover:shadow-lg hover:shadow-primary-500/20'
                                        }`}
                                    >
                                        {aiLoading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                <span className="relative z-10">Generating...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Wand2 className="w-4 h-4 relative z-10" />
                                                <span className="relative z-10">Generate</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                                <div className="flex justify-between mt-1">
                                    <FieldError field="title" />
                                    <p className="text-xs text-surface-700 font-medium ml-auto">{form.title.length}/100 characters</p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-surface-800 mb-2">Description <span className="text-primary-500">*</span></label>
                                <textarea
                                    value={form.description}
                                    onChange={e => { update('description', e.target.value); setErrors(prev => ({ ...prev, description: '' })); }}
                                    placeholder="Describe your item, its condition, what's included, usage instructions, etc..."
                                    rows={5}
                                    className={`w-full px-4 py-3 rounded-xl input-dark text-sm resize-none bg-white/60 focus:bg-white transition-all font-medium ${errors.description ? 'border-red-400 ring-2 ring-red-100' : 'border-primary-500/10'}`}
                                />
                                <div className="flex justify-between mt-1">
                                    <FieldError field="description" />
                                    <p className="text-xs text-surface-700 font-medium ml-auto">{form.description.length}/2000 characters</p>
                                </div>
                            </div>

                            {/* ── Tags (moved to Step 0 for AI auto-fill visibility) ── */}
                            <div>
                                <label className="flex items-center gap-1.5 text-sm font-bold text-surface-800 mb-2">
                                    <Tag className="w-4 h-4 text-primary-500" />
                                    Tags
                                    {aiGenerated && aiSuggestion?.tags?.length > 0 && (
                                        <span className="text-xs font-medium text-primary-500 bg-primary-500/10 px-2 py-0.5 rounded-full">AI-suggested</span>
                                    )}
                                </label>
                                <div className="flex gap-2 mb-2">
                                    <input
                                        value={tagInput}
                                        onChange={e => setTagInput(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                                        placeholder="e.g. sony, camera, mirrorless"
                                        className="flex-1 px-4 py-2.5 rounded-xl input-dark text-sm bg-white/60 focus:bg-white border-primary-500/10 transition-all font-medium"
                                    />
                                    <button onClick={addTag} className="px-4 py-2.5 btn-primary rounded-xl text-sm relative z-10">
                                        <Plus className="w-4 h-4 relative z-10" />
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {form.tags.map((t, i) => (
                                        <span key={i} className="flex items-center gap-1 px-3 py-1 rounded-full glass text-xs text-surface-800 font-bold border-white/50 bg-primary-500/10 transition-colors">
                                            #{t}
                                            <button onClick={() => removeTag(i)} className="ml-1 hover:text-primary-500"><X className="w-3 h-3" /></button>
                                        </span>
                                    ))}
                                </div>
                                <p className="text-xs text-surface-700 mt-1 font-medium">Add relevant tags to improve search visibility. You can edit AI-suggested tags.</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-surface-800 mb-2">Category <span className="text-primary-500">*</span>
                                        {aiGenerated && aiSuggestion?.category && (
                                            <span className="text-xs font-medium text-primary-500 bg-primary-500/10 px-2 py-0.5 rounded-full ml-2">AI-suggested</span>
                                        )}
                                    </label>
                                    <div className="relative" ref={catRef}>
                                        <button
                                            type="button"
                                            onClick={() => setCatOpen(o => !o)}
                                            className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-xl input-dark text-sm bg-white/60 focus:bg-white transition-all font-medium text-left ${errors.category ? 'border-red-400 ring-2 ring-red-100' : 'border-primary-500/10'}`}
                                        >
                                            {selectedCat ? (
                                                <>
                                                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: selectedCat.color }} />
                                                    <span className="flex-1 truncate text-surface-900">{selectedCat.name}</span>
                                                </>
                                            ) : (
                                                <span className="flex-1 text-surface-700">Select a category</span>
                                            )}
                                            <ChevronDown className={`w-4 h-4 text-surface-700 transition-transform ${catOpen ? 'rotate-180' : ''}`} />
                                        </button>
                                        {catOpen && (
                                            <div className="absolute z-30 top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-primary-500/10 overflow-hidden scale-in-center">
                                                <div className="p-2 border-b border-primary-500/10">
                                                    <div className="relative">
                                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-700" />
                                                        <input
                                                            autoFocus
                                                            value={catSearch}
                                                            onChange={e => setCatSearch(e.target.value)}
                                                            placeholder="Search categories..."
                                                            className="w-full pl-8 pr-3 py-2 rounded-lg text-xs input-dark bg-white/80"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="max-h-56 overflow-y-auto py-1">
                                                    {filteredCategories.length === 0 ? (
                                                        <p className="px-4 py-3 text-xs text-surface-700 italic">No categories match "{catSearch}"</p>
                                                    ) : filteredCategories.map(c => (
                                                        <button
                                                            key={c.name}
                                                            type="button"
                                                            onClick={() => {
                                                                update('category', c.name);
                                                                setErrors(prev => ({ ...prev, category: '' }));
                                                                setCatOpen(false);
                                                                setCatSearch('');
                                                            }}
                                                            className={`w-full flex items-center gap-2.5 px-4 py-2 text-left text-sm hover:bg-primary-500/5 transition-colors ${form.category === c.name ? 'bg-primary-500/10 font-bold text-primary-600' : 'text-surface-800'}`}
                                                        >
                                                            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                                                            <span className="flex-1 truncate">{c.name}</span>
                                                            {form.category === c.name && <Check className="w-3.5 h-3.5 text-primary-500" />}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <FieldError field="category" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-surface-800 mb-2">Condition <span className="text-primary-500">*</span></label>
                                    <div className="flex flex-wrap gap-2">
                                        {CONDITIONS.map(c => {
                                            const active = form.condition === c.name;
                                            return (
                                                <button
                                                    key={c.name}
                                                    type="button"
                                                    onClick={() => { update('condition', c.name); setErrors(prev => ({ ...prev, condition: '' })); }}
                                                    className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${active
                                                        ? `${c.bg} ${c.text} ${c.border} shadow-sm`
                                                        : 'bg-white/60 text-surface-800 border-primary-500/10 hover:border-primary-500/30'
                                                        }`}
                                                >
                                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                                                    {c.name}
                                                    {active && <Check className="w-3 h-3" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <FieldError field="condition" />
                                </div>
                            </div>

                            {/* Image Uploads */}
                            <div>
                                <label className="block text-sm font-bold text-surface-800 mb-2">Images <span className="text-primary-500">*</span></label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-2">
                                    {form.images.map((img, i) => (
                                        <div key={i} className="relative group aspect-square rounded-2xl overflow-hidden border border-primary-500/10 bg-surface-100">
                                            <img src={img.url} alt="listing" className="w-full h-full object-cover" />
                                            <button onClick={() => removeImage(i)} className="absolute top-2 right-2 p-1.5 rounded-full bg-white/80 text-red-500 hover:bg-white shadow-sm opacity-0 group-hover:opacity-100 transition-all">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                    {form.images.length < 5 && (
                                        <label className="aspect-square rounded-2xl border-2 border-dashed border-primary-500/20 hover:border-primary-500/40 hover:bg-primary-500/5 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer text-surface-800">
                                            <Upload className={`w-8 h-8 text-primary-500 ${loading ? 'animate-bounce' : ''}`} />
                                            <span className="text-xs font-bold uppercase tracking-wider">{loading ? 'Uploading...' : 'Upload'}</span>
                                            <input type="file" multiple accept="image/*" onChange={handleFileChange} className="hidden" disabled={loading} />
                                        </label>
                                    )}
                                </div>
                                <div className="flex justify-between">
                                    <FieldError field="images" />
                                    <p className="text-xs text-surface-700 font-medium ml-auto">{form.images.length}/5 images uploaded</p>
                                </div>
                                <p className="text-xs text-surface-700 mt-1 font-medium">Upload up to 5 clear images. Max 5MB each. First image will be the cover.</p>
                            </div>
                        </div>
                    )}

                    {/* Step 1: Pricing — with AI Suggested Price Helper */}
                    {step === 1 && (
                        <div className="space-y-5">
                            <h2 className="text-xl font-bold text-surface-950 flex items-center gap-2">
                                <DollarSign className="w-5 h-5 text-primary-500" /> Pricing
                            </h2>

                            {/* ── AI Suggested Price Helper ── */}
                            {suggestedPrice != null && (
                                <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-primary-500/10 to-violet-500/10 border border-primary-500/20">
                                    <div className="flex items-center gap-2">
                                        <Wand2 className="w-4 h-4 text-primary-500 flex-shrink-0" />
                                        <span className="text-sm text-surface-800 font-medium">
                                            AI Suggested Price: <span className="text-primary-600 font-bold">&#8377;{suggestedPrice.toLocaleString()}/day</span>
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            update('pricePerDay', String(suggestedPrice));
                                            setErrors(prev => ({ ...prev, pricePerDay: '' }));
                                            toast.success('Suggested price applied! You can change it anytime.');
                                        }}
                                        disabled={form.pricePerDay === String(suggestedPrice)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                            form.pricePerDay === String(suggestedPrice)
                                                ? 'bg-green-100 text-green-700 cursor-default'
                                                : 'btn-primary relative z-10 hover:shadow-md hover:shadow-primary-500/20'
                                        }`}
                                    >
                                        {form.pricePerDay === String(suggestedPrice) ? (
                                            <span className="flex items-center gap-1 relative z-10"><Check className="w-3 h-3" /> Applied</span>
                                        ) : (
                                            <span className="relative z-10">Accept</span>
                                        )}
                                    </button>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-surface-800 mb-2">Price Per Day (₹) <span className="text-primary-500">*</span></label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-700 font-bold text-sm">₹</span>
                                        <input
                                            type="number"
                                            value={form.pricePerDay}
                                            onChange={e => { update('pricePerDay', e.target.value); setErrors(prev => ({ ...prev, pricePerDay: '' })); }}
                                            placeholder="500"
                                            className={`w-full pl-7 pr-4 py-3 rounded-xl input-dark text-sm bg-white/60 focus:bg-white border-primary-500/10 transition-all font-medium ${errors.pricePerDay ? 'border-red-400 ring-2 ring-red-100' : ''}`}
                                        />
                                    </div>
                                    <FieldError field="pricePerDay" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-surface-800 mb-2">Price Per Week (₹)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-700 font-bold text-sm">₹</span>
                                        <input
                                            type="number"
                                            value={form.pricePerWeek}
                                            onChange={e => { update('pricePerWeek', e.target.value); setErrors(prev => ({ ...prev, pricePerWeek: '' })); }}
                                            placeholder="Optional"
                                            className={`w-full pl-7 pr-4 py-3 rounded-xl input-dark text-sm bg-white/60 focus:bg-white border-primary-500/10 transition-all font-medium ${errors.pricePerWeek ? 'border-red-400 ring-2 ring-red-100' : ''}`}
                                        />
                                    </div>
                                    <FieldError field="pricePerWeek" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-surface-800 mb-2">Price Per Month (₹)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-700 font-bold text-sm">₹</span>
                                        <input
                                            type="number"
                                            value={form.pricePerMonth}
                                            onChange={e => { update('pricePerMonth', e.target.value); setErrors(prev => ({ ...prev, pricePerMonth: '' })); }}
                                            placeholder="Optional"
                                            className={`w-full pl-7 pr-4 py-3 rounded-xl input-dark text-sm bg-white/60 focus:bg-white border-primary-500/10 transition-all font-medium ${errors.pricePerMonth ? 'border-red-400 ring-2 ring-red-100' : ''}`}
                                        />
                                    </div>
                                    <FieldError field="pricePerMonth" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-surface-800 mb-2">Security Deposit (₹)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-700 font-bold text-sm">₹</span>
                                        <input
                                            type="number"
                                            value={form.securityDeposit}
                                            onChange={e => { update('securityDeposit', e.target.value); setErrors(prev => ({ ...prev, securityDeposit: '' })); }}
                                            placeholder="0"
                                            className={`w-full pl-7 pr-4 py-3 rounded-xl input-dark text-sm bg-white/60 focus:bg-white border-primary-500/10 transition-all font-medium ${errors.securityDeposit ? 'border-red-400 ring-2 ring-red-100' : ''}`}
                                        />
                                    </div>
                                    <FieldError field="securityDeposit" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-surface-800 mb-2">Min Rental Days <span className="text-primary-500">*</span></label>
                                    <input
                                        type="number"
                                        value={form.minRentalDays}
                                        onChange={e => { update('minRentalDays', Number(e.target.value)); setErrors(prev => ({ ...prev, minRentalDays: '' })); }}
                                        min="1"
                                        className={`w-full px-4 py-3 rounded-xl input-dark text-sm bg-white/60 focus:bg-white border-primary-500/10 transition-all font-medium ${errors.minRentalDays ? 'border-red-400 ring-2 ring-red-100' : ''}`}
                                    />
                                    <FieldError field="minRentalDays" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-surface-800 mb-2">Max Rental Days <span className="text-primary-500">*</span></label>
                                    <input
                                        type="number"
                                        value={form.maxRentalDays}
                                        onChange={e => { update('maxRentalDays', Number(e.target.value)); setErrors(prev => ({ ...prev, maxRentalDays: '' })); }}
                                        min="1"
                                        className={`w-full px-4 py-3 rounded-xl input-dark text-sm bg-white/60 focus:bg-white border-primary-500/10 transition-all font-medium ${errors.maxRentalDays ? 'border-red-400 ring-2 ring-red-100' : ''}`}
                                    />
                                    <FieldError field="maxRentalDays" />
                                </div>
                            </div>
                            {form.pricePerDay > 0 && (
                                <div className="glass rounded-xl p-4 border border-primary-500/20 bg-primary-500/5">
                                    <p className="text-sm text-surface-800 font-medium">At ₹{Number(form.pricePerDay).toLocaleString()}/day, a 7-day rental earns you approximately <span className="text-primary-500 font-bold">₹{(Number(form.pricePerDay) * 7 * 0.9).toLocaleString()}</span> (after 10% platform fee).</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 2: Location */}
                    {step === 2 && (
                        <div className="space-y-5">
                            <h2 className="text-xl font-bold text-surface-950 flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-primary-500" /> Location
                            </h2>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-surface-800 mb-2">State <span className="text-primary-500">*</span></label>
                                    <CustomDropdown
                                        value={form.location.state}
                                        onChange={(v) => handleStateChange(v)}
                                        options={STATES}
                                        placeholder="Select State"
                                        icon={MapPin}
                                        error={!!errors['location.state']}
                                        searchable={true}
                                        ariaLabel="Select state"
                                    />
                                    <FieldError field="location.state" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-surface-800 mb-2">City <span className="text-primary-500">*</span></label>
                                    <CustomDropdown
                                        value={form.location.city}
                                        onChange={(v) => handleCityChange(v)}
                                        options={availableCities}
                                        placeholder={form.location.state ? 'Select City' : 'Select State first'}
                                        icon={MapPin}
                                        error={!!errors['location.city']}
                                        disabled={!form.location.state}
                                        searchable={true}
                                        ariaLabel="Select city"
                                    />
                                    <FieldError field="location.city" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-surface-800 mb-2">Full Address</label>
                                    <input
                                        value={form.location.address}
                                        onChange={e => { updateNested('location', 'address', e.target.value); setErrors(prev => ({ ...prev, 'location.address': '' })); }}
                                        placeholder="Street / Area / Landmark"
                                        className={`w-full px-4 py-3 rounded-xl input-dark text-sm bg-white/60 focus:bg-white border-primary-500/10 transition-all font-medium ${errors['location.address'] ? 'border-red-400 ring-2 ring-red-100' : ''}`}
                                    />
                                    <FieldError field="location.address" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-surface-800 mb-2">Pincode</label>
                                    <input
                                        value={form.location.pincode}
                                        onChange={e => { updateNested('location', 'pincode', e.target.value); setErrors(prev => ({ ...prev, 'location.pincode': '' })); }}
                                        placeholder="400001"
                                        maxLength={6}
                                        className={`w-full px-4 py-3 rounded-xl input-dark text-sm bg-white/60 focus:bg-white border-primary-500/10 transition-all font-medium ${errors['location.pincode'] ? 'border-red-400 ring-2 ring-red-100' : ''}`}
                                    />
                                    <FieldError field="location.pincode" />
                                </div>
                            </div>
                            {form.location.state && form.location.city && (
                                <div className="glass rounded-xl p-4 border border-primary-500/20 bg-primary-500/5">
                                    <p className="text-sm text-surface-800 font-medium flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-primary-500" />
                                        Selected: <span className="text-primary-500 font-bold">{form.location.city}, {form.location.state}</span>
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 3: Details */}
                    {step === 3 && (
                        <div className="space-y-5">
                            <h2 className="text-xl font-bold text-surface-950 flex items-center gap-2">
                                <Tag className="w-5 h-5 text-primary-500" /> Tags & Summary
                            </h2>

                            {/* Preview summary */}
                            <div className="glass rounded-xl p-4 border border-primary-500/20 bg-primary-500/5 space-y-1.5">
                                <p className="text-sm font-bold text-surface-950 mb-2">Summary Preview</p>
                                <p className="text-sm text-surface-800 font-medium"><span className="text-surface-700 font-bold">Title:</span> {form.title || '—'}</p>
                                {aiVerified && verificationDetails && (
                                    <p className="text-sm text-surface-800 font-medium flex items-center gap-1.5">
                                        <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                                        <span className="text-surface-700 font-bold">AI Verified:</span>
                                        <span className="text-green-700 font-bold">{verificationDetails.confidenceScore}% confidence</span>
                                    </p>
                                )}
                                {aiGenerated && aiSuggestion && (
                                    <p className="text-sm text-surface-800 font-medium flex items-center gap-1.5">
                                        <Wand2 className="w-3.5 h-3.5 text-primary-500" />
                                        <span className="text-surface-700 font-bold">AI Auto-Fill:</span>
                                        <span className="text-primary-600 font-bold">Applied</span>
                                    </p>
                                )}
                                <p className="text-sm text-surface-800 font-medium flex items-center gap-1.5"><span className="text-surface-700 font-bold">Category:</span> {form.category ? <><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: getCategoryColor(form.category) }} />{form.category}</> : '—'}</p>
                                <p className="text-sm text-surface-800 font-medium flex items-center gap-1.5"><span className="text-surface-700 font-bold">Condition:</span> {form.condition ? <><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: CONDITIONS.find(c => c.name === form.condition)?.color }} />{form.condition}</> : '—'}</p>
                                <p className="text-sm text-surface-800 font-medium"><span className="text-surface-700 font-bold">Price:</span> {form.pricePerDay ? `₹${Number(form.pricePerDay).toLocaleString()}/day` : '—'}</p>
                                {form.tags.length > 0 && (
                                    <p className="text-sm text-surface-800 font-medium"><span className="text-surface-700 font-bold">Tags:</span> {form.tags.map(t => `#${t}`).join(', ')}</p>
                                )}
                                <p className="text-sm text-surface-800 font-medium"><span className="text-surface-700 font-bold">Location:</span> {form.location.city && form.location.state ? `${form.location.city}, ${form.location.state}` : '—'}</p>
                                <p className="text-sm text-surface-800 font-medium"><span className="text-surface-700 font-bold">Images:</span> {form.images.length} uploaded</p>
                            </div>
                        </div>
                    )}

                    {/* Navigation */}
                    <div className="flex items-center justify-between mt-8 pt-6 border-t border-primary-500/10">
                        <button
                            onClick={() => setStep(s => s - 1)}
                            disabled={step === 0}
                            className="px-6 py-2.5 rounded-xl btn-ghost text-sm font-bold disabled:opacity-40 border-white/50"
                        >
                            ← Back
                        </button>
                        {step < steps.length - 1 ? (
                            <button
                                onClick={handleNext}
                                disabled={loading}
                                className="px-6 py-2.5 rounded-xl btn-primary text-sm font-semibold relative z-10 disabled:opacity-40"
                            >
                                <span className="relative z-10">Next →</span>
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="flex items-center gap-2 px-6 py-2.5 rounded-xl btn-primary text-sm font-semibold relative z-10 disabled:opacity-70"
                            >
                                <span className="relative z-10">{loading ? 'Creating...' : 'Publish Listing'}</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}