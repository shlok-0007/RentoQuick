import { useState, useEffect } from 'react';
import { analyticsAPI } from '../api';
import { TrendingUp, DollarSign, Package, Calendar, ArrowUpRight, Star, Eye, BarChart3 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AnalyticsPage() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        analyticsAPI.getOwner()
            .then(res => setStats(res.data.stats))
            .catch(() => toast.error('Failed to load analytics'))
            .finally(() => setLoading(false));
    }, []);

    if (loading || !stats) return <div className="min-h-screen flex items-center justify-center bg-surface-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" /></div>;

    const totalEarnings = stats.totalEarnings || 0;
    const monthlyRevenue = stats.monthlyRevenue?.[0]?.total || 0;
    const monthlyData = stats.monthlyRevenueData || [];
    const topListings = stats.topListings || [];
    const bookingTrends = stats.bookingTrends || [];
    const responseRate = stats.responseRate || 0;

    const cards = [
        { label: 'Total Earnings', value: `₹${totalEarnings.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-50' },
        { label: 'Monthly Revenue', value: `₹${monthlyRevenue.toLocaleString()}`, icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-50' },
        { label: 'Active Rentals', value: stats.activeRentals || 0, icon: Calendar, color: 'text-amber-500', bg: 'bg-amber-50' },
        { label: 'Your Listings', value: stats.totalListings || 0, icon: Package, color: 'text-purple-500', bg: 'bg-purple-50' },
    ];

    const maxRevenue = monthlyData.reduce((m, d) => Math.max(m, d.revenue), 1);
    const maxBookings = bookingTrends.reduce((m, d) => Math.max(m, d.total), 1);

    const getMonthLabel = (dateStr) => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const [, month] = dateStr.split('-');
        return months[parseInt(month) - 1] || dateStr;
    };

    return (
        <div className="min-h-screen bg-surface-50 py-12 px-4 sm:px-6">
            <div className="max-w-6xl mx-auto">
                <header className="mb-10 text-center sm:text-left">
                    <h1 className="font-display text-4xl font-bold text-surface-950">Analytics & Insights</h1>
                    <p className="text-surface-700 font-medium mt-2">Track your rental performance and maximize your earnings.</p>
                </header>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    {cards.map((c, i) => (
                        <div key={i} className="glass rounded-3xl p-6 border-white/50 shadow-xl overflow-hidden hover:translate-y-[-4px] transition-transform">
                            <div className={`w-12 h-12 rounded-2xl ${c.bg} flex items-center justify-center mb-4`}>
                                <c.icon className={`w-6 h-6 ${c.color}`} />
                            </div>
                            <p className="text-xs font-bold text-surface-700 uppercase tracking-wider">{c.label}</p>
                            <h2 className="text-2xl font-bold text-surface-950 mt-1">{c.value}</h2>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                    {/* Revenue Chart */}
                    <div className="lg:col-span-2 glass rounded-3xl p-8 border-white/50 shadow-xl bg-gradient-to-tr from-white to-primary-500/5">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="font-bold text-xl text-surface-950 flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-primary-500" /> Revenue (Last 6 Months)
                            </h3>
                            <span className="text-xs font-bold text-primary-500 bg-white px-3 py-1.5 rounded-full border border-primary-500/10 shadow-sm">Monthly</span>
                        </div>
                        {monthlyData.length > 0 ? (
                            <>
                                <div className="h-64 flex items-end gap-3 px-4">
                                    {monthlyData.map((d, i) => (
                                        <div key={i} className="flex-1 flex flex-col items-center gap-2">
                                            <span className="text-[10px] font-bold text-surface-700">₹{(d.revenue / 1000).toFixed(1)}k</span>
                                            <div
                                                className="w-full bg-gradient-to-t from-primary-500 to-primary-300 rounded-t-lg hover:from-primary-600 hover:to-primary-400 transition-all cursor-help relative group"
                                                style={{ height: `${Math.max((d.revenue / maxRevenue) * 100, 5)}%` }}
                                            >
                                                <div className="absolute opacity-0 group-hover:opacity-100 bottom-full mb-2 left-1/2 -translate-x-1/2 bg-surface-950 text-white text-[10px] font-bold py-1 px-2 rounded whitespace-nowrap z-20 shadow-xl pointer-events-none">
                                                    ₹{d.revenue.toLocaleString()} ({d.bookings} bookings)
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-between mt-4 px-4 text-[10px] font-bold text-surface-700 uppercase tracking-widest">
                                    {monthlyData.map((d, i) => (
                                        <span key={i}>{getMonthLabel(d._id)}</span>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="h-64 flex items-center justify-center text-surface-700 font-medium">
                                <div className="text-center">
                                    <BarChart3 className="w-12 h-12 text-surface-300 mx-auto mb-3" />
                                    <p>No revenue data yet. Start accepting bookings to see trends.</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Performance */}
                    <div className="glass rounded-3xl p-6 border-white/50 shadow-xl flex flex-col justify-between">
                        <div>
                            <h3 className="font-bold text-xl text-surface-950 mb-4">Performance</h3>
                            <div className="space-y-4">
                                <div className="p-4 rounded-2xl bg-white/60 border border-white">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold text-surface-700 uppercase">Response Rate</span>
                                        <span className={`text-xs font-bold ${responseRate >= 80 ? 'text-emerald-500' : responseRate >= 50 ? 'text-amber-500' : 'text-red-500'}`}>{responseRate}%</span>
                                    </div>
                                    <div className="w-full h-2 bg-surface-100 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full transition-all ${responseRate >= 80 ? 'bg-emerald-500' : responseRate >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${responseRate}%` }} />
                                    </div>
                                </div>
                                <div className="p-4 rounded-2xl bg-white/60 border border-white">
                                    <p className="text-[10px] font-bold text-primary-500 uppercase mb-1">Pro Tip</p>
                                    <p className="text-surface-800 text-sm leading-relaxed font-medium">Owners who use professional photos see a <span className="text-primary-500 font-bold">35% increase</span> in booking requests.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Booking Trends + Top Listings */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Booking Trends */}
                    <div className="glass rounded-3xl p-6 border-white/50 shadow-xl">
                        <h3 className="font-bold text-lg text-surface-950 mb-6 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-blue-500" /> Booking Trends
                        </h3>
                        {bookingTrends.length > 0 ? (
                            <div className="h-48 flex items-end gap-3 px-2">
                                {bookingTrends.map((d, i) => (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-2">
                                        <span className="text-[10px] font-bold text-surface-700">{d.total}</span>
                                        <div
                                            className="w-full bg-gradient-to-t from-blue-500 to-blue-300 rounded-t-lg transition-all"
                                            style={{ height: `${Math.max((d.total / maxBookings) * 100, 8)}%` }}
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-48 flex items-center justify-center text-surface-400 font-medium text-sm">No booking trends yet</div>
                        )}
                        {bookingTrends.length > 0 && (
                            <div className="flex justify-between mt-3 px-2 text-[10px] font-bold text-surface-700 uppercase">
                                {bookingTrends.map((d, i) => (
                                    <span key={i}>{getMonthLabel(d._id)}</span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Top Performing Listings */}
                    <div className="glass rounded-3xl p-6 border-white/50 shadow-xl">
                        <h3 className="font-bold text-lg text-surface-950 mb-6 flex items-center gap-2">
                            <Star className="w-5 h-5 text-amber-500" /> Top Performing Listings
                        </h3>
                        {topListings.length > 0 ? (
                            <div className="space-y-3">
                                {topListings.map((listing, i) => (
                                    <div key={listing._id} className="flex items-center gap-3 p-3 rounded-xl bg-white/60 border border-white hover:bg-primary-500/5 transition-all">
                                        <span className="text-lg font-black text-surface-300 w-6 text-center">#{i + 1}</span>
                                        <img src={listing.images?.[0]?.url} className="w-10 h-10 rounded-lg object-cover shadow-sm" alt="" />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-surface-950 text-sm truncate">{listing.title}</p>
                                            <p className="text-[10px] text-surface-700 font-medium">₹{listing.pricePerDay}/day</p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <div className="flex items-center gap-1 text-xs text-surface-700 font-medium">
                                                <Eye className="w-3 h-3" /> {listing.views || 0}
                                            </div>
                                            <div className="flex items-center gap-1 text-xs text-surface-700 font-medium">
                                                <Package className="w-3 h-3" /> {listing.totalRentals || 0}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-surface-400 font-medium text-sm">No listings yet</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}