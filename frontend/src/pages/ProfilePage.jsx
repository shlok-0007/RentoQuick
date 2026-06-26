import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI, reviewsAPI } from '../api';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { User, Mail, Phone, MapPin, Edit2, Save, X, Star, Package, Calendar, ShieldCheck, Share2, Copy, MessageCircle, Loader2, Camera, UserCircle, Gift, Lock, Heart, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { z } from 'zod';

const profileSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
    phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number').optional().or(z.literal('')),
    location: z.object({
        city: z.string().min(1, 'City is required'),
        state: z.string().min(1, 'State is required').optional(),
        country: z.string().optional(),
    }),
});

const passwordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters'),
    confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
});

function ReviewCard({ review }) {
    return (
        <div className="bg-white p-5 rounded-2xl border border-surface-100 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center font-bold text-primary-600 text-sm">
                    {review.reviewer?.name?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <h4 className="font-bold text-surface-950 text-sm">{review.reviewer?.name}</h4>
                        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface-100 text-surface-500">
                            {review.type}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex">
                            {[1, 2, 3, 4, 5].map(s => (
                                <Star key={s} className={`w-3 h-3 ${s <= review.rating ? 'text-amber-400 fill-current' : 'text-surface-200'}`} />
                            ))}
                        </div>
                        <span className="text-[10px] text-surface-400 font-medium">{format(new Date(review.createdAt), 'MMM d, yyyy')}</span>
                    </div>
                </div>
            </div>
            {review.comment && (
                <p className="text-surface-700 text-sm font-medium leading-relaxed italic">"{review.comment}"</p>
            )}
            {review.listing && (
                <Link to={`/listings/${review.listing.slug || review.listing._id}`} className="inline-flex items-center gap-1.5 mt-2 text-xs text-primary-500 font-bold hover:underline">
                    <Package className="w-3 h-3" />
                    {review.listing.title}
                </Link>
            )}
        </div>
    );
}

export default function ProfilePage() {
    const { user, updateUser } = useAuth();
    const [editing, setEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        name: user?.name || '',
        bio: user?.bio || '',
        phone: user?.phone || '',
        location: user?.location || { city: '', state: '', country: 'India' },
    });
    const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [pwLoading, setPwLoading] = useState(false);
    const [avatarLoading, setAvatarLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('profile');

    // Reviews state
    const [userReviews, setUserReviews] = useState([]);
    const [reviewsLoading, setReviewsLoading] = useState(false);
    const [reviewFilter, setReviewFilter] = useState('all'); // all, item, renter, owner

    // Fetch user reviews when tab is active
    useEffect(() => {
        if (activeTab === 'reviews' && user?._id && userReviews.length === 0) {
            setReviewsLoading(true);
            reviewsAPI.getUser(user._id)
                .then(res => setUserReviews(res.data.reviews || []))
                .catch(() => toast.error('Failed to load reviews'))
                .finally(() => setReviewsLoading(false));
        }
    }, [activeTab, user?._id]);

    const handleSave = async () => {
        const result = profileSchema.safeParse(form);
        if (!result.success) {
            toast.error(result.error.errors[0].message);
            return;
        }

        try {
            setLoading(true);
            const res = await authAPI.updateProfile(form);
            updateUser(res.data.user);
            setEditing(false);
            toast.success('Profile updated!');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Update failed');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        const result = passwordSchema.safeParse(passwordForm);
        if (!result.success) {
            toast.error(result.error.errors[0].message);
            return;
        }

        try {
            setPwLoading(true);
            await authAPI.changePassword({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword });
            toast.success('Password changed!');
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            toast.error(err.response?.data?.message || 'Password change failed');
        } finally {
            setPwLoading(false);
        }
    };

    const handleAvatarUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type and size
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            toast.error('Only JPG, PNG, or WebP images are allowed');
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            toast.error('Image must be under 2MB');
            return;
        }

        try {
            setAvatarLoading(true);
            const formData = new FormData();
            formData.append('avatar', file);
            const res = await authAPI.uploadAvatar(formData);
            updateUser(res.data.user);
            toast.success('Avatar updated!');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Avatar upload failed');
        } finally {
            setAvatarLoading(false);
        }
    };


    const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

    // Rating breakdown
    const ratingBreakdown = [5, 4, 3, 2, 1].map(star => ({
        star,
        count: userReviews.filter(r => r.rating === star).length,
        percentage: userReviews.length > 0 ? (userReviews.filter(r => r.rating === star).length / userReviews.length) * 100 : 0,
    }));

    const filteredReviews = reviewFilter === 'all'
        ? userReviews
        : userReviews.filter(r => r.type === reviewFilter);

    return (
        <div className="min-h-screen py-8 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Profile Header */}
                <div className="glass rounded-3xl p-8 mb-6 border-white/50 shadow-xl">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                        <div className="relative group cursor-pointer">
                            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary-400 via-primary-500 to-primary-300 flex items-center justify-center text-3xl font-bold text-white shadow-xl shadow-primary-500/20 overflow-hidden">
                                {user?.avatar ? (
                                    <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    user?.name?.[0]?.toUpperCase()
                                )}
                            </div>
                            <label className="absolute inset-0 rounded-3xl bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                {avatarLoading ? (
                                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                                ) : (
                                    <Camera className="w-6 h-6 text-white" />
                                )}
                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={handleAvatarUpload}
                                    className="hidden"
                                    disabled={avatarLoading}
                                />
                            </label>
                        </div>
                        <div className="flex-1 text-center sm:text-left">
                            <h1 className="font-display text-2xl font-bold text-surface-950 mb-1">{user?.name}</h1>
                            <p className="text-surface-800 text-sm mb-3 font-medium">{user?.email}</p>
                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-sm text-surface-800 font-medium">
                                {user?.location?.city && (
                                    <span className="flex items-center gap-1">
                                        <MapPin className="w-3.5 h-3.5 text-primary-500" />
                                        {user.location.city}, {user.location.state}
                                    </span>
                                )}
                                {user?.rating?.count > 0 && (
                                    <span className="flex items-center gap-1">
                                        <Star className="w-3.5 h-3.5 text-amber-500" fill="currentColor" />
                                        {user.rating.average} ({user.rating.count} reviews)
                                    </span>
                                )}
                                {user?.createdAt && (
                                    <span className="flex items-center gap-1">
                                        <Calendar className="w-3.5 h-3.5 text-primary-500 transition-colors" />
                                        Joined {format(new Date(user.createdAt), 'MMM yyyy')}
                                    </span>
                                )}
                            </div>
                            {user?.bio && <p className="text-surface-800 text-sm mt-3 max-w-lg font-medium">{user.bio}</p>}
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6 glass rounded-xl p-1.5 w-fit border-white/50 shadow-sm bg-white/40 flex-wrap">
                    {[
                        { key: 'profile', label: 'Profile', icon: UserCircle },
                        { key: 'reviews', label: `Reviews${user?.rating?.count ? ` (${user.rating.count})` : ''}`, icon: Star },
                        { key: 'referral', label: 'Referral', icon: Gift },
                        { key: 'security', label: 'Security', icon: Lock },
                    ].map((t) => (
                        <button
                            key={t.key}
                            onClick={() => setActiveTab(t.key)}
                            className={`flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-bold capitalize transition-all ${activeTab === t.key ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20' : 'text-surface-700 hover:text-primary-500'}`}
                        >
                            <t.icon className="w-4 h-4" />
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Profile Tab */}
                {activeTab === 'profile' && (
                    <div className="glass rounded-3xl p-7 border-white/50 shadow-xl">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="font-bold text-surface-950 text-lg">Personal Information</h2>
                            {editing ? (
                                <div className="flex gap-2">
                                    <button onClick={() => setEditing(false)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg btn-ghost text-sm font-bold border-white/50">
                                        <X className="w-4 h-4" /> Cancel
                                    </button>
                                    <button onClick={handleSave} disabled={loading} className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg btn-primary text-sm font-bold relative z-10 disabled:opacity-70 shadow-lg shadow-primary-500/20">
                                        <Save className="w-4 h-4 relative z-10" />
                                        <span className="relative z-10">{loading ? 'Saving...' : 'Save Changes'}</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="flex gap-2 flex-wrap">
                                    <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg btn-ghost text-sm font-bold text-primary-500 border-primary-500/10">
                                        <Edit2 className="w-4 h-4" /> Edit Profile
                                    </button>
                                    <label className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg btn-ghost text-sm font-bold text-primary-500 border-primary-500/10 cursor-pointer hover:bg-primary-500/5 transition-colors">
                                        <Camera className="w-4 h-4" />
                                        {avatarLoading ? 'Uploading...' : 'Change Photo'}
                                        <input
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp"
                                            onChange={handleAvatarUpload}
                                            className="hidden"
                                            disabled={avatarLoading}
                                        />
                                    </label>
                                    <button
                                        onClick={() => {
                                            if (!user?.referralCode) { toast.error('No referral code available'); return; }
                                            const refCode = user.referralCode;
                                            const refUrl = `${window.location.origin}/register?ref=${refCode}`;
                                            const text = `Hey! Join RentoQuick - India's #1 P2P Rental Platform! Use my referral code ${refCode} to get \u20b950 credits. Sign up here: ${refUrl}`;
                                            const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
                                            window.open(whatsappUrl, '_blank');
                                        }}
                                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-bold text-white bg-green-500 hover:bg-green-600 transition-colors shadow-sm"
                                    >
                                        <MessageCircle className="w-4 h-4" /> Refer via WhatsApp
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="grid sm:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-xs font-bold text-surface-800 uppercase tracking-wider mb-2">Full Name</label>
                                {editing ? (
                                    <input value={form.name} onChange={e => update('name', e.target.value)} required minLength="2" title="Name must be at least 2 characters" className="w-full px-4 py-2.5 rounded-xl input-dark text-sm bg-white/60 focus:bg-white border-primary-500/10 transition-all font-medium" />
                                ) : (
                                    <p className="text-surface-950 font-bold text-sm px-1">{user?.name || '—'}</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-surface-800 uppercase tracking-wider mb-2">Email</label>
                                <p className="text-surface-950 font-bold text-sm px-1 flex items-center gap-2">
                                    {user?.email}
                                </p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-surface-800 uppercase tracking-wider mb-2">Phone</label>
                                {editing ? (
                                    <input value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="9876543210" pattern="[6-9][0-9]{9}" title="Invalid Indian phone number (10 digits starting with 6, 7, 8, or 9)" className="w-full px-4 py-2.5 rounded-xl input-dark text-sm bg-white/60 focus:bg-white border-primary-500/10 transition-all font-medium" />
                                ) : (
                                    <p className="text-surface-950 font-bold text-sm px-1">{user?.phone || '—'}</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-surface-800 uppercase tracking-wider mb-2">City</label>
                                {editing ? (
                                    <input value={form.location.city} onChange={e => update('location', { ...form.location, city: e.target.value })} placeholder="Mumbai" required title="City is required" className="w-full px-4 py-2.5 rounded-xl input-dark text-sm bg-white/60 focus:bg-white border-primary-500/10 transition-all font-medium" />
                                ) : (
                                    <p className="text-surface-950 font-bold text-sm px-1">{user?.location?.city || '—'}</p>
                                )}
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-xs font-bold text-surface-800 uppercase tracking-wider mb-2">Bio</label>
                                {editing ? (
                                    <textarea value={form.bio} onChange={e => update('bio', e.target.value)} placeholder="Tell others about yourself..." rows={3} maxLength="500" title="Bio must be less than 500 characters" className="w-full px-4 py-2.5 rounded-xl input-dark text-sm resize-none bg-white/60 focus:bg-white border-primary-500/10 transition-all font-medium" />
                                ) : (
                                    <p className="text-surface-950 font-medium text-sm px-1 leading-relaxed">{user?.bio || '—'}</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Reviews Tab */}
                {activeTab === 'reviews' && (
                    <div className="space-y-6">
                        {/* Rating Overview */}
                        <div className="glass rounded-3xl p-7 border-white/50 shadow-xl">
                            <h2 className="font-bold text-surface-950 text-lg mb-6">Reviews Overview</h2>
                            <div className="flex flex-col sm:flex-row gap-8">
                                {/* Average score */}
                                <div className="text-center sm:text-left">
                                    <div className="text-5xl font-black text-surface-950 mb-1">{user?.rating?.average?.toFixed(1) || '0.0'}</div>
                                    <div className="flex justify-center sm:justify-start mb-1">
                                        {[1, 2, 3, 4, 5].map(s => (
                                            <Star key={s} className={`w-5 h-5 ${s <= Math.round(user?.rating?.average || 0) ? 'text-amber-400 fill-current' : 'text-surface-200'}`} />
                                        ))}
                                    </div>
                                    <p className="text-sm text-surface-500 font-medium">{user?.rating?.count || 0} reviews</p>
                                </div>

                                {/* Rating breakdown bars */}
                                <div className="flex-1 space-y-2">
                                    {ratingBreakdown.map(({ star, count, percentage }) => (
                                        <div key={star} className="flex items-center gap-3">
                                            <span className="text-xs font-bold text-surface-600 w-6 text-right">{star}</span>
                                            <Star className="w-3 h-3 text-amber-400 fill-current flex-shrink-0" />
                                            <div className="flex-1 h-2 bg-surface-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-amber-400 rounded-full transition-all duration-500"
                                                    style={{ width: `${percentage}%` }}
                                                />
                                            </div>
                                            <span className="text-xs text-surface-400 font-bold w-6">{count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Filter tabs */}
                        <div className="flex gap-2">
                            {[
                                { key: 'all', label: 'All' },
                                { key: 'item', label: 'Items' },
                                { key: 'renter', label: 'As Renter' },
                                { key: 'owner', label: 'As Owner' },
                            ].map(f => (
                                <button
                                    key={f.key}
                                    onClick={() => setReviewFilter(f.key)}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all border-2 ${reviewFilter === f.key ? 'bg-primary-500/10 text-primary-900 border-primary-500/20 shadow-sm' : 'glass text-surface-600 border-white/50 hover:bg-white/60'}`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>

                        {/* Reviews list */}
                        {reviewsLoading ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                            </div>
                        ) : filteredReviews.length === 0 ? (
                            <div className="glass rounded-3xl p-12 text-center border-white/50 shadow-xl">
                                <Star className="w-14 h-14 text-primary-300 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-surface-950 mb-2">
                                    {reviewFilter === 'all' ? 'No reviews yet' : `No ${reviewFilter} reviews`}
                                </h3>
                                <p className="text-surface-800 mb-6 font-medium">
                                    {userReviews.length === 0
                                        ? 'Complete rentals to start receiving reviews!'
                                        : 'No reviews match this filter.'}
                                </p>
                                {userReviews.length === 0 && (
                                    <Link to="/listings" className="inline-flex items-center gap-2 btn-primary px-6 py-3 rounded-xl font-semibold relative z-10 shadow-lg shadow-primary-500/20">
                                        <span className="relative z-10">Browse Listings</span>
                                    </Link>
                                )}
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {filteredReviews.map(r => (
                                    <ReviewCard key={r._id} review={r} />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Referral Tab */}
                {activeTab === 'referral' && (
                    <div className="glass rounded-3xl p-7 border-white/50 shadow-xl">
                        <h2 className="font-bold text-surface-950 text-lg mb-6">Refer & Earn</h2>
                        <div className="space-y-6">
                            <div className="glass rounded-xl p-5 border border-primary-500/20 bg-primary-500/5">
                                <p className="text-sm text-surface-800 font-medium mb-4">
                                    Share your referral code with friends and earn ₹50 credits when they sign up!
                                </p>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        {user?.referralCode ? (
                                            <div className="flex-1 px-4 py-3 rounded-xl bg-white border border-primary-500/20 font-bold text-lg text-center text-primary-600">
                                                {user.referralCode}
                                            </div>
                                        ) : (
                                            <div className="flex-1 px-4 py-3 rounded-xl bg-white border border-primary-500/20 text-center text-surface-400 font-medium">
                                                No referral code assigned yet
                                            </div>
                                        )}
                                        <button
                                            onClick={() => {
                                                if (!user?.referralCode) { toast.error('No referral code available'); return; }
                                                navigator.clipboard.writeText(user.referralCode);
                                                toast.success('Referral code copied!');
                                            }}
                                            className="px-4 py-3 rounded-xl btn-primary text-sm font-bold relative z-10"
                                            title="Copy code"
                                        >
                                            <Copy className="w-4 h-4 relative z-10" />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 px-4 py-3 rounded-xl bg-white border border-primary-500/20 font-mono text-xs text-center text-surface-700 truncate">
                                            {user?.referralCode ? `${window.location.origin}/register?ref=${user.referralCode}` : 'No referral code available'}
                                        </div>
                                        <button
                                            onClick={() => {
                                                if (!user?.referralCode) { toast.error('No referral code available'); return; }
                                                const refUrl = `${window.location.origin}/register?ref=${user.referralCode}`;
                                                navigator.clipboard.writeText(refUrl);
                                                toast.success('Referral link copied!');
                                            }}
                                            className="px-4 py-3 rounded-xl bg-surface-100 hover:bg-surface-200 text-surface-700 text-sm font-bold transition-colors"
                                            title="Copy full link"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="font-bold text-surface-950 mb-4">Share via</h3>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            if (!user?.referralCode) { toast.error('No referral code available'); return; }
                                            const refCode = user.referralCode;
                                            const refUrl = `${window.location.origin}/register?ref=${refCode}`;
                                            const text = `Hey! Join RentoQuick - India's #1 P2P Rental Platform! Use my referral code ${refCode} to get \u20b950 credits. Sign up here: ${refUrl}`;
                                            const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
                                            window.open(whatsappUrl, '_blank');
                                        }}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-green-500 text-white font-bold text-sm hover:bg-green-600 transition-colors"
                                    >
                                        <MessageCircle className="w-5 h-5" />
                                        WhatsApp
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (!user?.referralCode) { toast.error('No referral code available'); return; }
                                            const refCode = user.referralCode;
                                            const refUrl = `${window.location.origin}/register?ref=${refCode}`;
                                            const text = `Hey! Join RentoQuick - India's #1 P2P Rental Platform! Use my referral code ${refCode} to get \u20b950 credits. Sign up here: ${refUrl}`;
                                            if (navigator.share) {
                                                navigator.share({
                                                    title: 'Join RentoQuick',
                                                    text: text,
                                                    url: refUrl
                                                });
                                            } else {
                                                navigator.clipboard.writeText(text);
                                                toast.success('Referral message copied!');
                                            }
                                        }}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl btn-primary text-sm font-bold relative z-10"
                                    >
                                        <Share2 className="w-4 h-4 relative z-10" />
                                        Share
                                    </button>
                                </div>
                            </div>

                            <div className="glass rounded-xl p-4 border border-primary-500/20 bg-primary-500/5">
                                <p className="text-xs text-surface-800 font-medium">
                                    How it works: Share your unique referral code with friends. When they sign up using your code, you'll earn ₹50 credits that can be used for future rentals!
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Security Tab */}
                {activeTab === 'security' && (
                    <div className="glass rounded-3xl p-7 border-white/50 shadow-xl">
                        <h2 className="font-bold text-surface-950 text-lg mb-6">Change Password</h2>
                        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                            {[
                                { key: 'currentPassword', label: 'Current Password', placeholder: '••••••••', required: true, minLength: 1, title: 'Current password is required' },
                                { key: 'newPassword', label: 'New Password', placeholder: 'Min. 6 characters', required: true, minLength: 6, title: 'New password must be at least 6 characters' },
                                { key: 'confirmPassword', label: 'Confirm New Password', placeholder: '••••••••', required: true, minLength: 6, title: 'Please confirm your new password' },
                            ].map(({ key, label, placeholder, required, minLength, title }) => (
                                <div key={key}>
                                    <label className="block text-sm font-bold text-surface-800 mb-2">{label}</label>
                                    <input
                                        type="password"
                                        value={passwordForm[key]}
                                        onChange={e => setPasswordForm(f => ({ ...f, [key]: e.target.value }))}
                                        placeholder={placeholder}
                                        required={required}
                                        minLength={minLength}
                                        title={title}
                                        className="w-full px-4 py-3 rounded-xl input-dark text-sm bg-white/60 focus:bg-white border-primary-500/10 transition-all font-medium"
                                    />
                                </div>
                            ))}
                            <button type="submit" disabled={pwLoading} className="w-full py-3.5 rounded-xl btn-primary font-bold text-sm relative z-10 disabled:opacity-70 shadow-lg shadow-primary-500/20 mt-2">
                                <span className="relative z-10">{pwLoading ? 'Updating Password...' : 'Update Password'}</span>
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}