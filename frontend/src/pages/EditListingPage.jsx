import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { listingsAPI } from '../api';
import toast from 'react-hot-toast';
import { X, Tag, DollarSign, MapPin, Info, CheckCircle, ChevronLeft, Save } from 'lucide-react';

const CATEGORIES = [
    'Electronics', 'Vehicles', 'Tools & Equipment', 'Sports & Outdoors',
    'Cameras & Photography', 'Musical Instruments', 'Clothing & Accessories',
    'Furniture & Home', 'Books & Media', 'Other',
];
const CONDITIONS = ['New', 'Like New', 'Good', 'Fair', 'Poor'];

const steps = ['Basic Info', 'Pricing', 'Location', 'Details'];

export default function EditListingPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [featureInput, setFeatureInput] = useState('');
    const [tagInput, setTagInput] = useState('');

    const [form, setForm] = useState({
        title: '', description: '', category: '', condition: '',
        pricePerDay: '', pricePerWeek: '', pricePerMonth: '', securityDeposit: '',
        location: { city: '', state: '', address: '', pincode: '' },
        availability: { minRentalDays: 1, maxRentalDays: 30 },
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
                    location: l.location || { city: '', state: '', address: '', pincode: '' },
                    availability: l.availability || { minRentalDays: 1, maxRentalDays: 30 },
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

    const handleSubmit = async () => {
        try {
            setSaving(true);
            const payload = {
                ...form,
                pricePerDay: Number(form.pricePerDay),
                pricePerWeek: form.pricePerWeek ? Number(form.pricePerWeek) : null,
                pricePerMonth: form.pricePerMonth ? Number(form.pricePerMonth) : null,
                securityDeposit: form.securityDeposit ? Number(form.securityDeposit) : 0,
                images: form.images.filter(img => img.url),
            };
            await listingsAPI.update(id, payload);
            toast.success('Listing updated! 🎉');
            navigate(`/listings/${id}`);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update listing');
        } finally {
            setSaving(false);
        }
    };

    const isStepValid = () => {
        if (step === 0) return form.title.length >= 5 && form.description.length >= 20 && form.category && form.condition;
        if (step === 1) return form.pricePerDay > 0;
        if (step === 2) return form.location.city && form.location.state;
        return true;
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
                    {/* Step components same as CreateListingPage */}
                    {step === 0 && (
                        <div className="space-y-5">
                            <h2 className="text-xl font-bold text-surface-950 flex items-center gap-2">
                                <Info className="w-5 h-5 text-primary-500" /> Basic Information
                            </h2>
                            <div>
                                <label className="block text-sm font-bold text-surface-800 mb-2">Title *</label>
                                <input value={form.title} onChange={e => update('title', e.target.value)} placeholder="e.g. Sony A7III Mirrorless Camera" className="w-full px-4 py-3 rounded-xl input-dark text-sm bg-white/60 focus:bg-white transition-all border-primary-500/10" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-surface-800 mb-2">Description *</label>
                                <textarea value={form.description} onChange={e => update('description', e.target.value)} placeholder="Describe your item..." rows={5} className="w-full px-4 py-3 rounded-xl input-dark text-sm resize-none bg-white/60 focus:bg-white transition-all border-primary-500/10" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-surface-800 mb-2">Category *</label>
                                    <select value={form.category} onChange={e => update('category', e.target.value)} className="w-full px-4 py-3 rounded-xl input-dark text-sm bg-white/60 font-medium">
                                        <option value="">Select category</option>
                                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-surface-800 mb-2">Condition *</label>
                                    <select value={form.condition} onChange={e => update('condition', e.target.value)} className="w-full px-4 py-3 rounded-xl input-dark text-sm bg-white/60 font-medium">
                                        <option value="">Select condition</option>
                                        {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-surface-800 mb-2">Images (URL)</label>
                                <div className="space-y-2">
                                    {form.images.map((img, i) => (
                                        <div key={i} className="flex gap-2">
                                            <input value={img.url} onChange={e => updateImage(i, 'url', e.target.value)} placeholder="https://..." className="flex-1 px-4 py-2.5 rounded-xl input-dark text-sm bg-white/60" />
                                            {i > 0 && <button onClick={() => removeImage(i)} className="p-2.5 rounded-xl text-surface-700 hover:text-red-500"><X className="w-4 h-4" /></button>}
                                        </div>
                                    ))}
                                    <button onClick={addImage} className="text-sm font-bold text-primary-500">+ Add another image</button>
                                </div>
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
                                    <label className="block text-sm font-bold text-surface-800 mb-2">Price Per Day (₹) *</label>
                                    <input type="number" value={form.pricePerDay} onChange={e => update('pricePerDay', e.target.value)} className="w-full px-4 py-3 rounded-xl input-dark text-sm bg-white/60" min={1} />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-surface-800 mb-2">Security Deposit (₹)</label>
                                    <input type="number" value={form.securityDeposit} onChange={e => update('securityDeposit', e.target.value)} className="w-full px-4 py-3 rounded-xl input-dark text-sm bg-white/60" min={0} />
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
                                    <label className="block text-sm font-bold text-surface-800 mb-2">City *</label>
                                    <input value={form.location.city} onChange={e => updateNested('location', 'city', e.target.value)} className="w-full px-4 py-3 rounded-xl input-dark text-sm bg-white/60" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-surface-800 mb-2">State *</label>
                                    <input value={form.location.state} onChange={e => updateNested('location', 'state', e.target.value)} className="w-full px-4 py-3 rounded-xl input-dark text-sm bg-white/60" />
                                </div>
                            </div>
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
                                    <input value={featureInput} onChange={e => setFeatureInput(e.target.value)} className="flex-1 px-4 py-2.5 rounded-xl input-dark text-sm bg-white/60" placeholder="Press Enter to add" onKeyDown={e => e.key === 'Enter' && addFeature()} />
                                    <button onClick={addFeature} className="px-4 py-2.5 btn-primary rounded-xl text-sm relative z-10"><Plus className="w-4 h-4 relative z-10" /></button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {form.features.map((f, i) => (
                                        <span key={i} className="flex items-center gap-1.5 px-3 py-1 rounded-lg glass text-xs font-bold border-white/50">
                                            {f} <X className="w-3 h-3 cursor-pointer" onClick={() => removeFeature(i)} />
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
                            <button onClick={() => setStep(s => s + 1)} disabled={!isStepValid()} className="px-6 py-2.5 rounded-xl btn-primary text-sm font-semibold relative z-10 disabled:opacity-40">
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
