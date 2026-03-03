import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api';
import toast from 'react-hot-toast';
import { User, Mail, Phone, MapPin, Edit2, Save, X, Star, Package, Calendar } from 'lucide-react';
import { format } from 'date-fns';

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
    const [activeTab, setActiveTab] = useState('profile');

    const handleSave = async () => {
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
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            toast.error('Passwords do not match');
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

    const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

    return (
        <div className="min-h-screen py-8 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Profile Header */}
                <div className="glass rounded-3xl p-8 mb-6 border-white/50 shadow-xl">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                        <div className="relative">
                            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary-400 via-primary-500 to-primary-300 flex items-center justify-center text-3xl font-bold text-white shadow-xl shadow-primary-500/20">
                                {user?.name?.[0]?.toUpperCase()}
                            </div>
                            {user?.isVerified && (
                                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary-500 flex items-center justify-center border-2 border-white shadow-sm">
                                    <span className="text-xs text-white">✓</span>
                                </div>
                            )}
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
                <div className="flex gap-2 mb-6 glass rounded-xl p-1.5 w-fit border-white/50 shadow-sm bg-white/40">
                    {['profile', 'security'].map((t) => (
                        <button
                            key={t}
                            onClick={() => setActiveTab(t)}
                            className={`px-5 py-2 rounded-lg text-sm font-bold capitalize transition-all ${activeTab === t ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20' : 'text-surface-700 hover:text-primary-500'}`}
                        >
                            {t === 'profile' ? '👤 Profile' : '🔒 Security'}
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
                                <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg btn-ghost text-sm font-bold text-primary-500 border-primary-500/10">
                                    <Edit2 className="w-4 h-4" /> Edit Profile
                                </button>
                            )}
                        </div>

                        <div className="grid sm:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-xs font-bold text-surface-800 uppercase tracking-wider mb-2">Full Name</label>
                                {editing ? (
                                    <input value={form.name} onChange={e => update('name', e.target.value)} className="w-full px-4 py-2.5 rounded-xl input-dark text-sm bg-white/60 focus:bg-white border-primary-500/10 transition-all font-medium" />
                                ) : (
                                    <p className="text-surface-950 font-bold text-sm px-1">{user?.name || '—'}</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-surface-800 uppercase tracking-wider mb-2">Email</label>
                                <p className="text-surface-950 font-bold text-sm px-1 flex items-center gap-2">
                                    {user?.email}
                                    {user?.isVerified && <span className="badge bg-primary-500/10 text-primary-900 border-primary-500/20 shadow-sm text-[10px] font-bold uppercase tracking-tighter">Verified</span>}
                                </p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-surface-800 uppercase tracking-wider mb-2">Phone</label>
                                {editing ? (
                                    <input value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="9876543210" className="w-full px-4 py-2.5 rounded-xl input-dark text-sm bg-white/60 focus:bg-white border-primary-500/10 transition-all font-medium" />
                                ) : (
                                    <p className="text-surface-950 font-bold text-sm px-1">{user?.phone || '—'}</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-surface-800 uppercase tracking-wider mb-2">City</label>
                                {editing ? (
                                    <input value={form.location.city} onChange={e => update('location', { ...form.location, city: e.target.value })} placeholder="Mumbai" className="w-full px-4 py-2.5 rounded-xl input-dark text-sm bg-white/60 focus:bg-white border-primary-500/10 transition-all font-medium" />
                                ) : (
                                    <p className="text-surface-950 font-bold text-sm px-1">{user?.location?.city || '—'}</p>
                                )}
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-xs font-bold text-surface-800 uppercase tracking-wider mb-2">Bio</label>
                                {editing ? (
                                    <textarea value={form.bio} onChange={e => update('bio', e.target.value)} placeholder="Tell others about yourself..." rows={3} className="w-full px-4 py-2.5 rounded-xl input-dark text-sm resize-none bg-white/60 focus:bg-white border-primary-500/10 transition-all font-medium" />
                                ) : (
                                    <p className="text-surface-950 font-medium text-sm px-1 leading-relaxed">{user?.bio || '—'}</p>
                                )}
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
                                { key: 'currentPassword', label: 'Current Password', placeholder: '••••••••' },
                                { key: 'newPassword', label: 'New Password', placeholder: 'Min. 6 characters' },
                                { key: 'confirmPassword', label: 'Confirm New Password', placeholder: '••••••••' },
                            ].map(({ key, label, placeholder }) => (
                                <div key={key}>
                                    <label className="block text-sm font-bold text-surface-800 mb-2">{label}</label>
                                    <input
                                        type="password"
                                        value={passwordForm[key]}
                                        onChange={e => setPasswordForm(f => ({ ...f, [key]: e.target.value }))}
                                        placeholder={placeholder}
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
