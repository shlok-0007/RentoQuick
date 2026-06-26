import { useState, useEffect } from 'react';
import { adminAPI, disputesAPI } from '../api';
import { Users, Package, BarChart3, TrendingUp, CheckCircle, XCircle, ShieldAlert, Ban, UserCheck, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [listings, setListings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsRes, listingsRes, usersRes] = await Promise.all([
                    adminAPI.getStats(),
                    adminAPI.getListings(),
                    adminAPI.getUsers()
                ]);
                setStats(statsRes.data.stats);
                setListings(listingsRes.data.listings || []);
                setUsers(usersRes.data.users || []);
            } catch (err) {
                toast.error('Failed to load admin data');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleApprove = async (id) => {
        try {
            await adminAPI.approveListing(id);
            setListings(prev => prev.map(l => l._id === id ? { ...l, isActive: true } : l));
            toast.success('Listing approved!');
        } catch (err) {
            toast.error('Failed to approve listing');
        }
    };

    const handleDeleteListing = async (id) => {
        if (!confirm('Are you sure you want to delete this listing permanently?')) return;
        try {
            await adminAPI.deleteListing(id);
            setListings(prev => prev.filter(l => l._id !== id));
            toast.success('Listing deleted');
        } catch (err) {
            toast.error('Failed to delete listing');
        }
    };

    const handleSuspendUser = async (id) => {
        try {
            await adminAPI.suspendUser(id);
            setUsers(prev => prev.map(u => u._id === id ? { ...u, isVerified: false } : u));
            toast.success('User suspended');
        } catch (err) {
            toast.error('Failed to suspend user');
        }
    };

    const handleActivateUser = async (id) => {
        try {
            await adminAPI.activateUser(id);
            setUsers(prev => prev.map(u => u._id === id ? { ...u, isVerified: true } : u));
            toast.success('User activated');
        } catch (err) {
            toast.error('Failed to activate user');
        }
    };

    if (loading || !stats) return <div className="min-h-screen flex items-center justify-center bg-surface-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" /></div>;

    const cards = [
        { label: 'Total Users', value: stats.totalUsers || 0, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50' },
        { label: 'Total Listings', value: stats.totalListings || 0, icon: Package, color: 'text-purple-500', bg: 'bg-purple-50' },
        { label: 'Total Bookings', value: stats.totalBookings || 0, icon: BarChart3, color: 'text-emerald-500', bg: 'bg-emerald-50' },
        { label: 'Platform Revenue', value: `₹${(stats.revenue?.[0]?.total || 0).toLocaleString()}`, icon: TrendingUp, color: 'text-amber-500', bg: 'bg-amber-50' },
    ];

    const tabs = [
        { id: 'overview', label: 'Overview' },
        { id: 'users', label: 'Users' },
        { id: 'listings', label: 'Listings' },
    ];

    return (
        <div className="min-h-screen bg-surface-50 py-10 px-4">
            <div className="max-w-7xl mx-auto">
                <header className="mb-8">
                    <h1 className="font-display text-4xl font-bold text-surface-950 flex items-center gap-3">
                        <ShieldAlert className="w-10 h-10 text-primary-500" />
                        Admin Command Center
                    </h1>
                    <p className="text-surface-700 font-medium mt-2">Oversee RentoQuick's growth and maintain platform integrity.</p>
                </header>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {cards.map((c, i) => (
                        <div key={i} className="glass rounded-3xl p-6 border-white/50 shadow-xl">
                            <div className={`w-14 h-14 rounded-2xl ${c.bg} flex items-center justify-center mb-4 shadow-sm`}>
                                <c.icon className={`w-7 h-7 ${c.color}`} />
                            </div>
                            <p className="text-sm font-bold text-surface-700 uppercase tracking-wider">{c.label}</p>
                            <h2 className="text-3xl font-bold text-surface-950 mt-1">{c.value}</h2>
                        </div>
                    ))}
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-2 mb-8">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === tab.id ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20' : 'glass text-surface-700 hover:text-primary-500'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        {/* Pending Listings */}
                        <section className="glass rounded-3xl border-white/50 shadow-xl overflow-hidden">
                            <div className="p-6 border-b border-primary-500/10 bg-primary-500/5">
                                <h2 className="font-bold text-xl text-surface-950 flex items-center gap-2">
                                    <Package className="w-5 h-5 text-primary-500" />
                                    Listing Moderation
                                </h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-surface-100/50 text-[10px] font-bold uppercase text-surface-700 tracking-widest">
                                        <tr>
                                            <th className="px-6 py-4">Item</th>
                                            <th className="px-6 py-4">Owner</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-primary-500/5">
                                        {listings.filter(l => !l.isActive).map(listing => (
                                            <tr key={listing._id} className="hover:bg-primary-500/5 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <img src={listing.images?.[0]?.url} className="w-10 h-10 rounded-xl object-cover shadow-sm" alt="" />
                                                        <div>
                                                            <p className="font-bold text-surface-950 text-sm line-clamp-1">{listing.title}</p>
                                                            <p className="text-[10px] text-surface-700 font-bold uppercase">₹{listing.pricePerDay}/day</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="text-sm font-bold text-surface-950">{listing.owner?.name}</p>
                                                    <p className="text-xs text-surface-700 font-medium">{listing.owner?.email}</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="badge status-pending font-bold text-[10px] uppercase">Pending</span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex gap-2 justify-end">
                                                        <button onClick={() => handleApprove(listing._id)} className="px-3 py-1.5 rounded-xl btn-primary text-xs font-bold shadow-lg shadow-primary-500/20 relative z-10">
                                                            <span className="relative z-10">Approve</span>
                                                        </button>
                                                        <button onClick={() => handleDeleteListing(listing._id)} className="p-1.5 rounded-xl text-xs text-red-500 hover:bg-red-500/10 border border-red-500/20 transition-all">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {listings.filter(l => !l.isActive).length === 0 && (
                                            <tr>
                                                <td colSpan="4" className="px-6 py-12 text-center text-surface-700 font-medium italic">All caught up! No pending listings.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        {/* Quick Insights */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <section className="glass rounded-3xl p-6 border-white/50 shadow-xl bg-gradient-to-br from-primary-500/10 to-transparent">
                                <h3 className="font-bold text-lg text-surface-950 mb-4">Quick Insights</h3>
                                <div className="space-y-4">
                                    <div className="p-4 rounded-2xl bg-white/60 border border-white">
                                        <p className="text-[10px] font-bold text-primary-500 uppercase mb-1">System Health</p>
                                        <p className="text-sm font-medium text-surface-950">Platform is <span className="text-emerald-500 font-bold">Operational</span>. {users.length} registered users.</p>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-white/60 border border-white">
                                        <p className="text-[10px] font-bold text-amber-500 uppercase mb-1">Pending Reviews</p>
                                        <p className="text-sm font-medium text-surface-950">{listings.filter(l => !l.isActive).length} items waiting for manual review.</p>
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>
                )}

                {/* Users Tab */}
                {activeTab === 'users' && (
                    <section className="glass rounded-3xl border-white/50 shadow-xl overflow-hidden">
                        <div className="p-6 border-b border-primary-500/10 bg-primary-500/5">
                            <h2 className="font-bold text-xl text-surface-950 flex items-center gap-2">
                                <Users className="w-5 h-5 text-primary-500" />
                                User Management ({users.length})
                            </h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-surface-100/50 text-[10px] font-bold uppercase text-surface-700 tracking-widest">
                                    <tr>
                                        <th className="px-6 py-4">User</th>
                                        <th className="px-6 py-4">Role</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Joined</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-primary-500/5">
                                    {users.slice(0, 20).map(user => (
                                        <tr key={user._id} className="hover:bg-primary-500/5 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <img src={user.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop'} className="w-10 h-10 rounded-xl object-cover shadow-sm" alt="" />
                                                    <div>
                                                        <p className="font-bold text-surface-950 text-sm">{user.name}</p>
                                                        <p className="text-xs text-surface-700 font-medium">{user.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`badge font-bold text-[10px] uppercase ${user.role === 'admin' ? 'status-active' : 'status-pending'}`}>{user.role}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`badge font-bold text-[10px] uppercase ${user.isVerified ? 'status-completed' : 'status-cancelled'}`}>
                                                    {user.isVerified ? 'Active' : 'Suspended'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-xs text-surface-700 font-medium">
                                                {new Date(user.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {user.role !== 'admin' && (
                                                    <div className="flex gap-2 justify-end">
                                                        {user.isVerified ? (
                                                            <button onClick={() => handleSuspendUser(user._id)} className="px-3 py-1.5 rounded-xl text-xs font-bold border-2 border-red-500/20 text-red-500 hover:bg-red-500/5 transition-all flex items-center gap-1">
                                                                <Ban className="w-3 h-3" /> Suspend
                                                            </button>
                                                        ) : (
                                                            <button onClick={() => handleActivateUser(user._id)} className="px-3 py-1.5 rounded-xl text-xs font-bold btn-primary shadow-lg shadow-primary-500/20 relative z-10 flex items-center gap-1">
                                                                <span className="relative z-10"><UserCheck className="w-3 h-3" /> Activate</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

                {/* Listings Tab */}
                {activeTab === 'listings' && (
                    <section className="glass rounded-3xl border-white/50 shadow-xl overflow-hidden">
                        <div className="p-6 border-b border-primary-500/10 bg-primary-500/5">
                            <h2 className="font-bold text-xl text-surface-950 flex items-center gap-2">
                                <Package className="w-5 h-5 text-primary-500" />
                                All Listings ({listings.length})
                            </h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-surface-100/50 text-[10px] font-bold uppercase text-surface-700 tracking-widest">
                                    <tr>
                                        <th className="px-6 py-4">Item</th>
                                        <th className="px-6 py-4">Category</th>
                                        <th className="px-6 py-4">Owner</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-primary-500/5">
                                    {listings.slice(0, 50).map(listing => (
                                        <tr key={listing._id} className="hover:bg-primary-500/5 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <img src={listing.images?.[0]?.url} className="w-10 h-10 rounded-xl object-cover shadow-sm" alt="" />
                                                    <div>
                                                        <p className="font-bold text-surface-950 text-sm line-clamp-1">{listing.title}</p>
                                                        <p className="text-[10px] text-surface-700 font-bold">₹{listing.pricePerDay}/day · {listing.totalRentals || 0} rentals</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-xs text-surface-700 font-medium">{listing.category}</td>
                                            <td className="px-6 py-4 text-sm text-surface-950 font-medium">{listing.owner?.name}</td>
                                            <td className="px-6 py-4">
                                                <span className={`badge font-bold text-[10px] uppercase ${listing.isActive ? 'status-completed' : 'status-pending'}`}>
                                                    {listing.isActive ? 'Active' : 'Pending'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex gap-2 justify-end">
                                                    {!listing.isActive && (
                                                        <button onClick={() => handleApprove(listing._id)} className="px-3 py-1.5 rounded-xl btn-primary text-xs font-bold shadow-lg shadow-primary-500/20 relative z-10">
                                                            <span className="relative z-10">Approve</span>
                                                        </button>
                                                    )}
                                                    <button onClick={() => handleDeleteListing(listing._id)} className="p-1.5 rounded-xl text-xs text-red-500 hover:bg-red-500/10 border border-red-500/20 transition-all">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}