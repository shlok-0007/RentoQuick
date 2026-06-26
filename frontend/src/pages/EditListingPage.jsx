import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { listingsAPI } from '../api';
import toast from 'react-hot-toast';
import { X, Tag, DollarSign, MapPin, Info, CheckCircle, ChevronLeft, Save, ChevronDown, AlertCircle, Plus, Upload, Image as ImageIcon } from 'lucide-react';
import { z } from 'zod';
import { basicInfoSchema, pricingSchema, locationSchema } from '../schemas/listingSchema';
import citiesData from '../data/cities.json';
import { CATEGORY_NAMES as CATEGORIES, CONDITION_NAMES as CONDITIONS } from '../data/categories';
import CustomDropdown from '../components/common/CustomDropdown';

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

export default function EditListingPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [featureInput, setFeatureInput] = useState('');
    const [tagInput, setTagInput] = useState('');
    const [errors, setErrors] = useState({});

    const [form, setForm] = useState({
        title: '', description: '', category: '', condition: '',
        pricePerDay: '', pricePerWeek: '', pricePerMonth: '', securityDeposit: '',
        minRentalDays: 1, maxRentalDays: 30,
        location: { state: '', city: '', address: '', pincode: '', coordinates: null },
        features: [], tags: [],
        images: [{ url: '', alt: '' }],
    });

    useEffect(() => {
        listingsAPI.getOne(id)
            .then(res => {
                const l = res.data.listing;
                setForm({
                    title: l.title || '',
                    description: l.description || '',
                    category: l.category || '',
                    condition: l.condition || '',
                    pricePerDay: l.pricePerDay || '',
                    pricePerWeek: l.pricePerWeek || '',
                    pricePerMonth: l.pricePerMonth || '',
                    securityDeposit: l.securityDeposit || '',
                    minRentalDays: l.availability?.minRentalDays || 1,
                    maxRentalDays: l.availability?.maxRentalDays || 30,
                    location: {
                        city: l.location?.city || '',
                        state: l.location?.state || '',
                        address: l.location?.address || '',
                        pincode: l.location?.pincode || '',
                        coordinates: l.location?.coordinates || null,
                    },
                    features: l.features || [],
                    tags: l.tags || [],
                    images: l.images?.length ? l.images : [{ url: '', alt: '' }],
                });
            })
            .catch(() => {
                toast.error('Failed to load listing');
                navigate('/my-listings');
            })
            .finally(() => setLoading(false));
    }, [id, navigate]);

    const update = (key, value) => setForm(f => ({ ...f, [key]: value }));
    const updateNested = (parent, key, value) => setForm(f => ({ ...f, [parent]: { ...f[parent], [key]: value } }));

    // Get filtered cities based on selected state
    const availableCities = form.location.state ? (STATE_CITY_MAP[form.location.state] || []) : [];

    const handleStateChange = (newState) => {
        updateNested('location', 'state', newState);
        updateNested('location', 'city', '');
        setErrors(prev => ({ ...prev, 'location.state': '', 'location.city': '' }));
    };

    const handleCityChange = (newCity) => {
        updateNested('location', 'city', newCity);
        setErrors(prev => ({ ...prev, 'location.city': '' }));
    };

    const addFeature = () => {
        if (featureInput.trim()) {
            update('features', [...form.features, featureInput.trim()]);
            setFeatureInput('');
        }
    };
    const removeFeature = (i) => update('features', form.features.filter((_, idx) => idx !== i));

    const addTag = () => {
        if (tagInput.trim()) {
            update('tags', [...form.tags, tagInput.trim().toLowerCase()]);
            setTagInput('');
        }
    };
    const removeTag = (i) => update('tags', form.tags.filter((_, idx) => idx !== i));

    const addImage = () => update('images', [...form.images, { url: '', alt: '' }]);
    const removeImage = (i) => update('images', form.images.filter((_, idx) => idx !== i));
    const updateImage = (i, field, val) => {
        const imgs = [...form.images];
        imgs[i] = { ...imgs[i], [field]: val };
        update('images', imgs);
    };

    // ---- Image upload (uses the backend /api/listings/upload endpoint) ----
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    const handleFileChange = async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        if (form.images.length + files.length > 5) {
            toast.error('You can upload a maximum of 5 images total.');
            return;
        }

        try {
            setUploading(true);
            const formData = new FormData();
            files.forEach(file => formData.append('images', file));
            const res = await listingsAPI.uploadImages(formData);
            const uploaded = res.data.images || [];
            // Merge newly uploaded images into existing ones (drop empty-url placeholders)
            const current = form.images.filter(img => img.url);
            const merged = [...current, ...uploaded].slice(0, 5);
            update('images', merged);
            toast.success(`${uploaded.length} image(s) uploaded!`);
            setErrors(prev => ({ ...prev, images: '' }));
        } catch (err) {
            toast.error('Image upload failed. Please try again.');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

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
                err.errors.forEach((e) => {
                    const path = e.path.join('.');
                    errs[path] = e.message;
                });
                setErrors(prev => ({ ...prev, ...errs }));
                if (showError) {
                    // Render each error as its own readable toast (no \n garbling)
                    err.errors.forEach((e, idx) => {
                        const path = e.path.join('.');
                        const label = FIELD_LABELS[path] || path;
                        toast.error(`${label}: ${e.message}`, {
                            duration: 4500,
                            id: `edit-err-${stepIndex}-${idx}`,
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
                toast('Please complete all required fields before saving.', {
                    icon: '⚠️',
                    duration: 3500,
                });
                return;
            }
        }

        try {
            setSaving(true);
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
                images: form.images.filter(img => img.url),
            };
            await listingsAPI.update(id, payload);
            toast.success('Listing updated successfully! ✓');
            navigate(`/listings/${id}`);
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to update listing. Please check your inputs.';
            toast.error(msg, { duration: 5000 });
        } finally {
            setSaving(false);
        }
    };

    const handleNext = () => {
        if (validateStep(step, true)) {
            setStep(s => s + 1);
        }
    };

    const FieldError = ({ field }) => {
        if (!errors[field]) return null;
        return (
            <p className="flex items-center gap-1 text-xs text-red-500 mt-1 font-medium">
                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                {errors[field]}
            </p>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen py-10 px-4">
            <div className="max-w-3xl mx-auto">
                <Link to="/my-listings" className="inline-flex items-center gap-2 text-surface-800 hover:text-primary-500 font-bold mb-6 transition-colors">
                    <ChevronLeft className="w-4 h-4" /> Back to My Listings
                </Link>

                {/* Header */}
                <div className="text-center mb-10">
                    <h1 className="font-display text-3xl font-bold text-surface-950 mb-2">Edit Listing</h1>
                    <p className="text-surface-800 font-medium">Keep your listing details up to date</p>
                </div>

                {/* Step progress */}
                <div className="flex items-center gap-2 mb-10">
                    {steps.map((label, i) => (
                        <div key={i} className="flex items-center gap-2 flex-1">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all flex-shrink-0 ${i < step ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20' : i === step ? 'btn-primary relative shadow-lg shadow-primary-500/30' : 'glass text-surface-800 border-white/40'}`}>
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
                            <div>
                                <label className="block text-sm font-bold text-surface-800 mb-2">Title <span className="text-primary-500">*</span></label>
                                <input
                                    value={form.title}
                                    onChange={e => { update('title', e.target.value); setErrors(prev => ({ ...prev, title: '' })); }}
                                    placeholder="e.g. Sony A7III Mirrorless Camera"
                                    className={`w-full px-4 py-3 rounded-xl input-dark text-sm bg-white/60 focus:bg-white transition-all font-medium ${errors.title ? 'border-red-400 ring-2 ring-red-100' : 'border-primary-500/10'}`}
                                />
                                <FieldError field="title" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-surface-800 mb-2">Description <span className="text-primary-500">*</span></label>
                                <textarea
                                    value={form.description}
                                    onChange={e => { update('description', e.target.value); setErrors(prev => ({ ...prev, description: '' })); }}
                                    placeholder="Describe your item..."
                                    rows={5}
                                    className={`w-full px-4 py-3 rounded-xl input-dark text-sm resize-none bg-white/60 focus:bg-white transition-all font-medium ${errors.description ? 'border-red-400 ring-2 ring-red-100' : 'border-primary-500/10'}`}
                                />
                                <FieldError field="description" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-surface-800 mb-2">Category <span className="text-primary-500">*</span></label>
                                    <div className="relative">
                                        <select
                                            value={form.category}
                                            onChange={e => { update('category', e.target.value); setErrors(prev => ({ ...prev, category: '' })); }}
                                            className={`w-full px-4 py-3 rounded-xl input-dark text-sm bg-white/60 focus:bg-white transition-all font-medium appearance-none pr-10 ${errors.category ? 'border-red-400 ring-2 ring-red-100' : ''}`}
                                        >
                                            <option value="">Select a category</option>
                                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-700 pointer-events-none" />
                                    </div>
                                    <FieldError field="category" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-surface-800 mb-2">Condition <span className="text-primary-500">*</span></label>
                                    <div className="relative">
                                        <select
                                            value={form.condition}
                                            onChange={e => { update('condition', e.target.value); setErrors(prev => ({ ...prev, condition: '' })); }}
                                            className={`w-full px-4 py-3 rounded-xl input-dark text-sm bg-white/60 focus:bg-white transition-all font-medium appearance-none pr-10 ${errors.condition ? 'border-red-400 ring-2 ring-red-100' : ''}`}
                                        >
                                            <option value="">Select condition</option>
                                            {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-700 pointer-events-none" />
                                    </div>
                                    <FieldError field="condition" />
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-sm font-bold text-surface-800">Images <span className="text-primary-500">*</span></label>
                                    <span className="text-xs text-surface-700 font-medium">{form.images.filter(i => i.url).length}/5 uploaded</span>
                                </div>

                                {/* Image preview grid + upload tile */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-3">
                                    {form.images.filter(img => img.url).map((img, i) => (
                                        <div key={i} className="relative group aspect-square rounded-2xl overflow-hidden border border-primary-500/10 bg-surface-100">
                                            <img src={img.url} alt={img.alt || form.title || 'listing'} className="w-full h-full object-cover" onError={(e) => { e.target.onerror = null; e.target.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22400%22%3E%3Crect fill=%22%23fff3d0%22 width=%22400%22 height=%22400%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 font-size=%2214%22 text-anchor=%22middle%22 fill=%22%23de6b6b%22 font-family=%22sans-serif%22%3ENo preview%3C/text%3E%3C/svg%3E'; }} />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                            {i === 0 && (
                                                <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-primary-500 text-white text-[9px] font-bold uppercase tracking-wider shadow-sm">Cover</span>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => removeImage(form.images.findIndex(x => x.url === img.url))}
                                                className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 text-red-500 hover:bg-white shadow-sm opacity-0 group-hover:opacity-100 transition-all"
                                                title="Remove image"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                    {form.images.filter(img => img.url).length < 5 && (
                                        <label className="aspect-square rounded-2xl border-2 border-dashed border-primary-500/20 hover:border-primary-500/40 hover:bg-primary-500/5 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer text-surface-800">
                                            <Upload className={`w-7 h-7 text-primary-500 ${uploading ? 'animate-bounce' : ''}`} />
                                            <span className="text-xs font-bold uppercase tracking-wider">{uploading ? 'Uploading...' : 'Upload'}</span>
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                multiple
                                                accept="image/*"
                                                onChange={handleFileChange}
                                                className="hidden"
                                                disabled={uploading}
                                            />
                                        </label>
                                    )}
                                </div>

                                {form.images.filter(img => img.url).length === 0 && (
                                    <p className="text-xs text-surface-700 mt-1 font-medium flex items-center gap-1.5">
                                        <ImageIcon className="w-3.5 h-3.5 text-primary-500" />
                                        Upload at least one clear image. Max 5 images, 5MB each. First image becomes the cover.
                                    </p>
                                )}
                                {errors.images && (
                                    <p className="flex items-center gap-1 text-xs text-red-500 mt-1 font-medium">
                                        <AlertCircle className="w-3 h-3 flex-shrink-0" />
                                        {errors.images}
                                    </p>
                                )}

                                {/* Secondary: collapsible URL editor for manual entry / existing URLs */}
                                <details className="mt-3 group">
                                    <summary className="text-xs text-surface-700 font-bold cursor-pointer hover:text-primary-500 transition-colors flex items-center gap-1.5 list-none select-none">
                                        <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
                                        Edit image URLs manually
                                    </summary>
                                    <div className="mt-2 space-y-2">
                                        {form.images.map((img, i) => (
                                            <div key={i} className="flex gap-2 items-center">
                                                {img.url ? (
                                                    <img src={img.url} alt="" className="w-9 h-9 rounded-lg object-cover border border-primary-500/10 shrink-0" />
                                                ) : (
                                                    <div className="w-9 h-9 rounded-lg bg-surface-100 flex items-center justify-center shrink-0">
                                                        <ImageIcon className="w-4 h-4 text-surface-400" />
                                                    </div>
                                                )}
                                                <input
                                                    value={img.url}
                                                    onChange={e => updateImage(i, 'url', e.target.value)}
                                                    placeholder="https://... or /uploads/listings/x.jpg"
                                                    className="flex-1 px-3 py-2 rounded-lg input-dark text-xs bg-white/60"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeImage(i)}
                                                    className="p-2 rounded-lg text-surface-700 hover:text-red-500 hover:bg-red-50 transition-colors"
                                                    title="Remove"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={addImage}
                                            className="text-xs font-bold text-primary-500 hover:text-primary-600 flex items-center gap-1"
                                        >
                                            <Plus className="w-3.5 h-3.5" /> Add image URL
                                        </button>
                                    </div>
                                </details>
                            </div>
                        </div>
                    )}

                    {/* Step 1: Pricing */}
                    {step === 1 && (
                        <div className="space-y-5">
                            <h2 className="text-xl font-bold text-surface-950 flex items-center gap-2">
                                <DollarSign className="w-5 h-5 text-primary-500" /> Pricing
                            </h2>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-surface-800 mb-2">Price Per Day (₹) <span className="text-primary-500">*</span></label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-700 font-bold text-sm">₹</span>
                                        <input
                                            type="number"
                                            value={form.pricePerDay}
                                            onChange={e => { update('pricePerDay', e.target.value); setErrors(prev => ({ ...prev, pricePerDay: '' })); }}
                                            min={1}
                                            className={`w-full pl-7 pr-4 py-3 rounded-xl input-dark text-sm bg-white/60 focus:bg-white transition-all font-medium ${errors.pricePerDay ? 'border-red-400 ring-2 ring-red-100' : 'border-primary-500/10'}`}
                                        />
                                    </div>
                                    <FieldError field="pricePerDay" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-surface-800 mb-2">Security Deposit (₹)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-700 font-bold text-sm">₹</span>
                                        <input
                                            type="number"
                                            value={form.securityDeposit}
                                            onChange={e => { update('securityDeposit', e.target.value); setErrors(prev => ({ ...prev, securityDeposit: '' })); }}
                                            min={0}
                                            className={`w-full pl-7 pr-4 py-3 rounded-xl input-dark text-sm bg-white/60 focus:bg-white transition-all font-medium ${errors.securityDeposit ? 'border-red-400 ring-2 ring-red-100' : 'border-primary-500/10'}`}
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
                                        className={`w-full px-4 py-3 rounded-xl input-dark text-sm bg-white/60 focus:bg-white transition-all font-medium ${errors.minRentalDays ? 'border-red-400 ring-2 ring-red-100' : 'border-primary-500/10'}`}
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
                                        className={`w-full px-4 py-3 rounded-xl input-dark text-sm bg-white/60 focus:bg-white transition-all font-medium ${errors.maxRentalDays ? 'border-red-400 ring-2 ring-red-100' : 'border-primary-500/10'}`}
                                    />
                                    <FieldError field="maxRentalDays" />
                                </div>
                            </div>
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
                                        className="w-full px-4 py-3 rounded-xl input-dark text-sm bg-white/60 focus:bg-white border-primary-500/10 transition-all font-medium"
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
                                        className="w-full px-4 py-3 rounded-xl input-dark text-sm bg-white/60 focus:bg-white border-primary-500/10 transition-all font-medium"
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
                                <Tag className="w-5 h-5 text-primary-500" /> Features & Tags
                            </h2>
                            <div>
                                <label className="block text-sm font-bold text-surface-800 mb-2">Features</label>
                                <div className="flex gap-2 mb-2">
                                    <input value={featureInput} onChange={e => setFeatureInput(e.target.value)} className="flex-1 px-4 py-2.5 rounded-xl input-dark text-sm bg-white/60 focus:bg-white border-primary-500/10 transition-all font-medium" placeholder="Press Enter to add" onKeyDown={e => e.key === 'Enter' && addFeature()} />
                                    <button onClick={addFeature} className="px-4 py-2.5 btn-primary rounded-xl text-sm relative z-10"><Plus className="w-4 h-4 relative z-10" /></button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {form.features.map((f, i) => (
                                        <span key={i} className="flex items-center gap-1.5 px-3 py-1 rounded-lg glass text-xs font-bold border-white/50 bg-primary-500/5">
                                            <CheckCircle className="w-3.5 h-3.5 text-primary-500" />
                                            {f}
                                            <X className="w-3 h-3 cursor-pointer hover:text-primary-500 transition-colors" onClick={() => removeFeature(i)} />
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-surface-800 mb-2">Tags</label>
                                <div className="flex gap-2 mb-2">
                                    <input value={tagInput} onChange={e => setTagInput(e.target.value)} className="flex-1 px-4 py-2.5 rounded-xl input-dark text-sm bg-white/60 focus:bg-white border-primary-500/10 transition-all font-medium" placeholder="e.g. sony, camera" onKeyDown={e => e.key === 'Enter' && addTag()} />
                                    <button onClick={addTag} className="px-4 py-2.5 btn-primary rounded-xl text-sm relative z-10"><Plus className="w-4 h-4 relative z-10" /></button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {form.tags.map((t, i) => (
                                        <span key={i} className="flex items-center gap-1 px-3 py-1 rounded-full glass text-xs font-bold border-white/50 bg-primary-500/10 transition-colors">
                                            #{t}
                                            <X className="w-3 h-3 cursor-pointer hover:text-primary-500" onClick={() => removeTag(i)} />
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Navigation */}
                    <div className="flex items-center justify-between mt-8 pt-6 border-t border-primary-500/10">
                        <button onClick={() => setStep(s => s - 1)} disabled={step === 0} className="px-6 py-2.5 rounded-xl btn-ghost text-sm font-bold disabled:opacity-40">← Back</button>
                        {step < steps.length - 1 ? (
                            <button onClick={() => validateStep(true) && setStep(s => s + 1)} className="px-6 py-2.5 rounded-xl btn-primary text-sm font-semibold relative z-10">
                                <span className="relative z-10">Next →</span>
                            </button>
                        ) : (
                            <button onClick={handleSubmit} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 rounded-xl btn-primary text-sm font-semibold relative z-10 disabled:opacity-70 shadow-lg shadow-primary-500/20">
                                <Save className="w-4 h-4 relative z-10" />
                                <span className="relative z-10">{saving ? 'Saving...' : 'Save Changes'}</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
