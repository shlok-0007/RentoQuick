import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { savedSearchesAPI } from '../api';
import { Search, Bell, BellOff, Trash2, ArrowRight, Loader2, Bookmark } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function SavedSearchesPage() {
    const [searches, setSearches] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSearches();
    }, []);

    const fetchSearches = async () => {
        try {
            const res = await savedSearchesAPI.getAll();
            setSearches(res.data.savedSearches);
        } catch (err) {
            toast.error('Failed to load saved searches');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this saved search?')) return;
        try {
            await savedSearchesAPI.delete(id);
            setSearches(prev => prev.filter(s => s._id !== id));
            toast.success('Search deleted');
        } catch (err) {
            toast.error('Delete failed');
        }
    };

    const toggleAlert = async (id) => {
        try {
            const res = await savedSearchesAPI.toggleAlert(id);
            setSearches(prev => prev.map(s => s._id === id ? res.data.savedSearch : s));
            toast.success(res.data.savedSearch.alertEnabled ? 'Alerts enabled' : 'Alerts disabled');
        } catch (err) {
            toast.error('Failed to toggle alert');
        }
    };

    if (loading) return (
        <div className="min-h-[60vh] flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-surface-900 mb-2 flex items-center gap-3">
                        <Bookmark className="w-8 h-8 text-primary-500" /> Saved Searches
                    </h1>
                    <p className="text-surface-500">Manage your saved filters and get notified when new items match.</p>
                </div>
            </div>

            {searches.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 border border-surface-100 border-dashed text-center">
                    <div className="w-20 h-20 bg-surface-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Search className="w-10 h-10 text-surface-300" />
                    </div>
                    <h2 className="text-xl font-bold text-surface-900 mb-2">No saved searches yet</h2>
                    <p className="text-surface-500 mb-8 max-w-sm mx-auto">
                        Search for items you're interested in and click "Save Search" to see them here later.
                    </p>
                    <Link to="/listings" className="inline-flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/20">
                        Go to Listings <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            ) : (
                <div className="grid gap-4">
                    {searches.map(search => (
                        <div key={search._id} className="bg-white rounded-2xl border border-surface-100 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-sm transition-all group">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <h3 className="text-lg font-bold text-surface-900">{search.name}</h3>
                                    <span className="text-[10px] font-bold text-surface-400 uppercase tracking-widest bg-surface-50 px-2 py-0.5 rounded-full border border-surface-100">
                                        {format(new Date(search.createdAt), 'MMM d, yyyy')}
                                    </span>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {Object.entries(search.filters).map(([key, value]) => value && (
                                        <span key={key} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary-50 text-primary-700 text-[11px] font-bold rounded-lg border border-primary-100 capitalize">
                                            <span className="text-primary-400 font-medium">{key}:</span> {value}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => toggleAlert(search._id)}
                                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all border ${search.alertEnabled
                                            ? 'bg-amber-50 text-amber-600 border-amber-100'
                                            : 'bg-surface-50 text-surface-400 border-surface-100'
                                        }`}
                                    title={search.alertEnabled ? 'Disable Alerts' : 'Enable Alerts'}
                                >
                                    {search.alertEnabled ? <Bell className="w-5 h-5 fill-current" /> : <BellOff className="w-5 h-5" />}
                                </button>

                                <Link
                                    to={`/listings?${new URLSearchParams(search.filters).toString()}`}
                                    className="h-12 px-6 bg-surface-900 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-black transition-all"
                                >
                                    View <Search className="w-4 h-4" />
                                </Link>

                                <button
                                    onClick={() => handleDelete(search._id)}
                                    className="w-12 h-12 bg-surface-50 text-surface-400 rounded-xl flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all border border-transparent hover:border-red-100"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
