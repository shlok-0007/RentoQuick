import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { bookingsAPI } from '../api';
import { BookingCardSkeleton } from '../components/common/Skeleton';
import BookingCard from '../components/bookings/BookingCard';
import toast from 'react-hot-toast';
import {
    BookOpen, Package
} from 'lucide-react';

const STATUS_TABS = ['all', 'pending', 'confirmed', 'active', 'completed', 'cancelled'];

export default function BookingsPage() {
    const [tab, setTab] = useState('my');
    const [statusFilter, setStatusFilter] = useState('all');
    const [myBookings, setMyBookings] = useState([]);
    const [receivedBookings, setReceivedBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        const params = statusFilter !== 'all' ? { status: statusFilter } : {};
        const fetcher = tab === 'my' ? bookingsAPI.getMy(params) : bookingsAPI.getReceived(params);
        fetcher
            .then(res => {
                const bookings = res.data.bookings || [];
                if (tab === 'my') setMyBookings(bookings);
                else setReceivedBookings(bookings);
            })
            .catch(() => toast.error('Failed to load bookings'))
            .finally(() => setLoading(false));
    }, [tab, statusFilter]);

    const handleStatusUpdate = (id, newStatus) => {
        const setter = tab === 'my' ? setMyBookings : setReceivedBookings;
        setter(prev => prev.map(b => b._id === id ? { ...b, status: newStatus } : b));
    };

    const bookings = tab === 'my' ? myBookings : receivedBookings;

    return (
        <div className="min-h-screen py-8 px-4">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="font-display text-3xl font-bold text-surface-950">Bookings</h1>
                        <p className="text-surface-800 text-sm mt-1 font-medium">{bookings.length} booking{bookings.length !== 1 ? 's' : ''}</p>
                    </div>
                </div>

                {/* Main tabs */}
                <div className="flex gap-2 mb-6 glass rounded-xl p-1.5 w-fit border-white/50 shadow-sm bg-white/40">
                    {['my', 'received'].map((t) => (
                        <button
                            key={t}
                            onClick={() => { setTab(t); setStatusFilter('all'); }}
                            className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${tab === t ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20' : 'text-surface-700 hover:text-primary-500'}`}
                        >
                            {t === 'my' ? '📦 My Rentals' : '🏠 Received'}
                        </button>
                    ))}
                </div>

                {/* Status filter */}
                <div className="flex flex-wrap gap-2 mb-6">
                    {STATUS_TABS.map(s => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all border-2 ${statusFilter === s ? 'bg-primary-500/10 text-primary-900 border-primary-500/20 shadow-sm' : 'glass text-surface-700 border-white/50 hover:bg-white/60'
                                }`}
                        >
                            {s === 'all' ? 'All' : s}
                        </button>
                    ))}
                </div>

                {/* Booking list */}
                {loading ? (
                    <div className="space-y-4">
                        {Array(3).fill(0).map((_, i) => <BookingCardSkeleton key={i} />)}
                    </div>
                ) : bookings.length === 0 ? (
                    <div className="text-center py-20 glass rounded-3xl border-white/50 shadow-xl">
                        <BookOpen className="w-14 h-14 text-primary-300 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-surface-950 mb-2">No bookings yet</h3>
                        <p className="text-surface-800 mb-6 font-medium">
                            {tab === 'my' ? 'Browse listings and book your first item!' : 'List an item to start receiving bookings.'}
                        </p>
                        <Link to={tab === 'my' ? '/listings' : '/listings/new'} className="inline-flex items-center gap-2 btn-primary px-6 py-3 rounded-xl font-semibold relative z-10 shadow-lg shadow-primary-500/20">
                            <span className="relative z-10">{tab === 'my' ? 'Browse Listings' : 'List an Item'}</span>
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {bookings.map(b => (
                            <BookingCard key={b._id} booking={b} onStatusUpdate={handleStatusUpdate} isOwner={tab === 'received'} onUpdate={() => {
                                const params = statusFilter !== 'all' ? { status: statusFilter } : {};
                                const fetcher = tab === 'my' ? bookingsAPI.getMy(params) : bookingsAPI.getReceived(params);
                                fetcher.then(res => {
                                    const bks = res.data.bookings || [];
                                    if (tab === 'my') setMyBookings(bks);
                                    else setReceivedBookings(bks);
                                });
                            }} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}