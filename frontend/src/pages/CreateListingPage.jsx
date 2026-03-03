import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listingsAPI } from '../api';
import toast from 'react-hot-toast';
import { Plus, X, Upload, Tag, DollarSign, MapPin, Info, CheckCircle } from 'lucide-react';

const CATEGORIES = [
    'Electronics', 'Vehicles', 'Tools & Equipment', 'Sports & Outdoors',
    'Cameras & Photography', 'Musical Instruments', 'Clothing & Accessories',
    'Furniture & Home', 'Books & Media', 'Other',
];
const CONDITIONS = ['New', 'Like New', 'Good', 'Fair', 'Poor'];

const steps = ['Basic Info', 'Pricing', 'Location', 'Details'];

export default function CreateListingPage() {
    const navigate = useNavigate();
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
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
            setLoading(true);
            const payload = {
                ...form,
                pricePerDay: Number(form.pricePerDay),
                pricePerWeek: form.pricePerWeek ? Number(form.pricePerWeek) : null,
                pricePerMonth: form.pricePerMonth ? Number(form.pricePerMonth) : null,
                securityDeposit: form.securityDeposit ? Number(form.securityDeposit) : 0,
                images: form.images.filter(img => img.url),
            };
            const res = await listingsAPI.create(payload);
            toast.success('Listing created! 🎉');
            navigate(`/listings/${res.data.listing.slug || res.data.listing._id}`);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create listing');
        } finally {
            setLoading(false);
        }
    };

    const isStepValid = () => {
        if (step === 0) return form.title.length >= 5 && form.description.length >= 20 && form.category && form.condition;
        if (step === 1) return form.pricePerDay > 0;
        if (step === 2) return form.location.city && form.location.state;
        return true;
    };

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
                            <div>
                                <label className="block text-sm font-bold text-surface-800 mb-2">Title *</label>
                                <input value={form.title} onChange={e => update('title', e.target.value)} placeholder="e.g. Sony A7III Mirrorless Camera" className="w-full px-4 py-3 rounded-xl input-dark text-sm bg-white/60 focus:bg-white transition-all border-primary-500/10" />
                                <p className="text-xs text-surface-700 mt-1 font-medium">{form.title.length}/100 characters</p>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-surface-800 mb-2">Description *</label>
                                <textarea value={form.description} onChange={e => update('description', e.target.value)} placeholder="Describe your item, its condition, what's included, etc..." rows={5} className="w-full px-4 py-3 rounded-xl input-dark text-sm resize-none bg-white/60 focus:bg-white transition-all border-primary-500/10" />
                                <p className="text-xs text-surface-700 mt-1 font-medium">{form.description.length}/2000 characters</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-surface-800 mb-2">Category *</label>
                                    <select value={form.category} onChange={e => update('category', e.target.value)} className="w-full px-4 py-3 rounded-xl input-dark text-sm bg-white/60 focus:bg-white transition-all border-primary-500/10 font-medium">
                                        <option value="">Select category</option>
                                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-surface-800 mb-2">Condition *</label>
                                    <select value={form.condition} onChange={e => update('condition', e.target.value)} className="w-full px-4 py-3 rounded-xl input-dark text-sm bg-white/60 focus:bg-white transition-all border-primary-500/10 font-medium">
                                        <option value="">Select condition</option>
                                        {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Image URLs */}
                            <div>
                                <label className="block text-sm font-bold text-surface-800 mb-2">Images (URL)</label>
                                <div className="space-y-2">
                                    {form.images.map((img, i) => (
                                        <div key={i} className="flex gap-2">
                                            <input value={img.url} onChange={e => updateImage(i, 'url', e.target.value)} placeholder="https://..." className="flex-1 px-4 py-2.5 rounded-xl input-dark text-sm bg-white/60 focus:bg-white border-primary-500/10 transition-all font-medium" />
                                            {i > 0 && <button onClick={() => removeImage(i)} className="p-2.5 rounded-xl hover:bg-primary-500/10 text-surface-700 hover:text-primary-500 transition-colors"><X className="w-4 h-4" /></button>}
                                        </div>
                                    ))}
                                    <button onClick={addImage} className="flex items-center gap-1.5 text-sm font-bold text-primary-500 hover:text-primary-600 transition-colors mt-2">
                                        <Plus className="w-3.5 h-3.5" /> Add another image
                                    </button>
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
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-700 font-bold text-sm">₹</span>
                                        <input type="number" value={form.pricePerDay} onChange={e => update('pricePerDay', e.target.value)} placeholder="500" className="w-full pl-7 pr-4 py-3 rounded-xl input-dark text-sm bg-white/60 focus:bg-white border-primary-500/10 transition-all font-medium" min={1} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-surface-800 mb-2">Price Per Week (₹)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-700 font-bold text-sm">₹</span>
                                        <input type="number" value={form.pricePerWeek} onChange={e => update('pricePerWeek', e.target.value)} placeholder="Optional" className="w-full pl-7 pr-4 py-3 rounded-xl input-dark text-sm bg-white/60 focus:bg-white border-primary-500/10 transition-all font-medium" min={1} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-surface-800 mb-2">Price Per Month (₹)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-700 font-bold text-sm">₹</span>
                                        <input type="number" value={form.pricePerMonth} onChange={e => update('pricePerMonth', e.target.value)} placeholder="Optional" className="w-full pl-7 pr-4 py-3 rounded-xl input-dark text-sm bg-white/60 focus:bg-white border-primary-500/10 transition-all font-medium" min={1} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-surface-800 mb-2">Security Deposit (₹)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-700 font-bold text-sm">₹</span>
                                        <input type="number" value={form.securityDeposit} onChange={e => update('securityDeposit', e.target.value)} placeholder="0" className="w-full pl-7 pr-4 py-3 rounded-xl input-dark text-sm bg-white/60 focus:bg-white border-primary-500/10 transition-all font-medium" min={0} />
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-surface-800 mb-2">Min Rental Days</label>
                                    <input type="number" value={form.availability.minRentalDays} onChange={e => updateNested('availability', 'minRentalDays', Number(e.target.value))} className="w-full px-4 py-3 rounded-xl input-dark text-sm bg-white/60 focus:bg-white border-primary-500/10 transition-all font-medium" min={1} />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-surface-800 mb-2">Max Rental Days</label>
                                    <input type="number" value={form.availability.maxRentalDays} onChange={e => updateNested('availability', 'maxRentalDays', Number(e.target.value))} className="w-full px-4 py-3 rounded-xl input-dark text-sm bg-white/60 focus:bg-white border-primary-500/10 transition-all font-medium" min={1} />
                                </div>
                            </div>
                            {form.pricePerDay > 0 && (
                                <div className="glass rounded-xl p-4 border border-primary-500/20 bg-primary-500/5">
                                    <p className="text-sm text-surface-800 font-medium">💡 At ₹{Number(form.pricePerDay).toLocaleString()}/day, a 7-day rental earns you approximately <span className="text-primary-500 font-bold">₹{(Number(form.pricePerDay) * 7 * 0.9).toLocaleString()}</span> (after 10% platform fee).</p>
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
                                    <label className="block text-sm font-bold text-surface-800 mb-2">City *</label>
                                    <input value={form.location.city} onChange={e => updateNested('location', 'city', e.target.value)} placeholder="Mumbai" className="w-full px-4 py-3 rounded-xl input-dark text-sm bg-white/60 focus:bg-white border-primary-500/10 transition-all font-medium" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-surface-800 mb-2">State *</label>
                                    <input value={form.location.state} onChange={e => updateNested('location', 'state', e.target.value)} placeholder="Maharashtra" className="w-full px-4 py-3 rounded-xl input-dark text-sm bg-white/60 focus:bg-white border-primary-500/10 transition-all font-medium" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-surface-800 mb-2">Address</label>
                                    <input value={form.location.address} onChange={e => updateNested('location', 'address', e.target.value)} placeholder="Street / Area" className="w-full px-4 py-3 rounded-xl input-dark text-sm bg-white/60 focus:bg-white border-primary-500/10 transition-all font-medium" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-surface-800 mb-2">Pincode</label>
                                    <input value={form.location.pincode} onChange={e => updateNested('location', 'pincode', e.target.value)} placeholder="400001" className="w-full px-4 py-3 rounded-xl input-dark text-sm bg-white/60 focus:bg-white border-primary-500/10 transition-all font-medium" />
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
                                <label className="block text-sm font-bold text-surface-800 mb-2">Features / Inclusions</label>
                                <div className="flex gap-2 mb-2">
                                    <input value={featureInput} onChange={e => setFeatureInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addFeature(); } }} placeholder="e.g. 4K Recording, Charger included" className="flex-1 px-4 py-2.5 rounded-xl input-dark text-sm bg-white/60 focus:bg-white border-primary-500/10 transition-all font-medium" />
                                    <button onClick={addFeature} className="px-4 py-2.5 btn-primary rounded-xl text-sm relative z-10">
                                        <Plus className="w-4 h-4 relative z-10" />
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {form.features.map((f, i) => (
                                        <span key={i} className="flex items-center gap-1.5 px-3 py-1 rounded-lg glass text-sm text-surface-800 font-bold border-white/50 bg-primary-500/5">
                                            <CheckCircle className="w-3.5 h-3.5 text-primary-500" />
                                            {f}
                                            <button onClick={() => removeFeature(i)} className="ml-1 hover:text-primary-500 transition-colors"><X className="w-3 h-3" /></button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-surface-800 mb-2">Tags</label>
                                <div className="flex gap-2 mb-2">
                                    <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} placeholder="e.g. sony, camera, mirrorless" className="flex-1 px-4 py-2.5 rounded-xl input-dark text-sm bg-white/60 focus:bg-white border-primary-500/10 transition-all font-medium" />
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
                            </div>

                            {/* Preview summary */}
                            <div className="glass rounded-xl p-4 border border-primary-500/20 bg-primary-500/5 space-y-1.5">
                                <p className="text-sm font-bold text-surface-950 mb-2">Summary Preview</p>
                                <p className="text-sm text-surface-800 font-medium"><span className="text-surface-700 font-bold">Title:</span> {form.title}</p>
                                <p className="text-sm text-surface-800 font-medium"><span className="text-surface-700 font-bold">Category:</span> {form.category}</p>
                                <p className="text-sm text-surface-800 font-medium"><span className="text-surface-700 font-bold">Price:</span> ₹{Number(form.pricePerDay).toLocaleString()}/day</p>
                                <p className="text-sm text-surface-800 font-medium"><span className="text-surface-700 font-bold">Location:</span> {form.location.city}, {form.location.state}</p>
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
                                onClick={() => setStep(s => s + 1)}
                                disabled={!isStepValid()}
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
                                <span className="relative z-10">{loading ? 'Creating...' : '🎉 Publish Listing'}</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
