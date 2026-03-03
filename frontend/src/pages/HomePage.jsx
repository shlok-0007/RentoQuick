import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listingsAPI } from '../api';
import ListingCard from '../components/listings/ListingCard';
import { ListingCardSkeleton } from '../components/common/Skeleton';
import {
    Search, ArrowRight, Shield, Zap, Star, Users, Package,
    ChevronRight, Laptop, Car, Wrench, Camera, Music, Tent,
    Sparkles, TrendingUp, Clock
} from 'lucide-react';

const categories = [
    { name: 'Electronics', icon: Laptop, color: 'from-primary-600 to-primary-400', count: '2.4k+' },
    { name: 'Vehicles', icon: Car, color: 'from-amber-500 to-primary-400', count: '1.2k+' },
    { name: 'Tools & Equipment', icon: Wrench, color: 'from-orange-500 to-primary-500', count: '3.1k+' },
    { name: 'Cameras & Photography', icon: Camera, color: 'from-primary-500 to-primary-300', count: '890+' },
    { name: 'Musical Instruments', icon: Music, color: 'from-primary-400 to-amber-500', count: '640+' },
    { name: 'Sports & Outdoors', icon: Tent, color: 'from-primary-500 to-orange-400', count: '1.8k+' },
];



const howItWorks = [
    { step: '01', title: 'Find What You Need', desc: 'Search from thousands of items across India. Filter by location, price, and category.', icon: Search },
    { step: '02', title: 'Book Instantly', desc: 'Request to book the item for your dates. Get confirmed in minutes by the owner.', icon: Zap },
    { step: '03', title: 'Rent & Return', desc: 'Pick up or get delivery. Use it, then return it stress-free with our protection.', icon: Shield },
];

export default function HomePage() {
    const [featured, setFeatured] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        listingsAPI.getFeatured()
            .then(res => setFeatured(res.data.listings || []))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        if (search.trim()) navigate(`/listings?search=${encodeURIComponent(search)}`);
        else navigate('/listings');
    };

    return (
        <div className="min-h-screen">
            {/* Hero */}
            <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden pt-8">
                {/* Gradient background */}
                <div className="absolute inset-0 -z-10">
                    <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl opacity-60" />
                    <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary-300/20 rounded-full blur-3xl opacity-50" />
                    <div className="absolute top-1/3 right-1/3 w-60 h-60 bg-accent-100/30 rounded-full blur-3xl opacity-70" />
                </div>

                <div className="max-w-4xl mx-auto px-4 text-center">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8 shadow-sm fade-in-up">
                        <Sparkles className="w-4 h-4 text-primary-500" />
                        <span className="text-sm text-surface-800 font-medium">India's #1 P2P Rental Platform</span>
                    </div>

                    {/* Heading */}
                    <h1 className="font-display text-5xl md:text-7xl font-extrabold mb-6 leading-tight text-surface-950 fade-in-up">
                        Rent Anything,{' '}
                        <span className="gradient-text">Anywhere</span>{' '}
                        in India
                    </h1>
                    <p className="text-surface-800 text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed fade-in-up">
                        Skip the buy. RentoQuick connects you with real people renting their stuff — from drones to motorcycles, cameras to camping gear.
                    </p>

                    {/* Search bar */}
                    <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto mb-6 fade-in-up">
                        <div className="glass rounded-2xl p-2 flex gap-2 shadow-xl shadow-primary-500/10 border-white/50">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-800" />
                                <input
                                    type="text"
                                    placeholder="What do you want to rent today?"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 rounded-xl input-dark text-base bg-white/80"
                                />
                            </div>
                            <button type="submit" className="btn-primary px-6 py-3.5 rounded-xl font-semibold flex items-center gap-2 relative z-10">
                                <span className="relative z-10">Search</span>
                                <ArrowRight className="w-4 h-4 relative z-10" />
                            </button>
                        </div>
                    </form>

                    {/* Quick links */}
                    <div className="flex flex-wrap items-center justify-center gap-2 fade-in-up">
                        <span className="text-xs text-surface-800 font-medium">Popular:</span>
                        {['Camera', 'Drone', 'Royal Enfield', 'MacBook', 'Tent', 'Guitar'].map((term) => (
                            <button
                                key={term}
                                onClick={() => navigate(`/listings?search=${term}`)}
                                className="px-3 py-1 rounded-full text-xs glass text-surface-800 hover:text-primary-500 hover:bg-white/50 transition-all border-white/50 shadow-sm"
                            >
                                {term}
                            </button>
                        ))}
                    </div>
                </div>
            </section>



            {/* Categories */}
            <section className="py-16 px-4">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-between mb-10">
                        <div>
                            <h2 className="font-display text-3xl font-bold text-surface-900 mb-2">Browse by Category</h2>
                            <p className="text-surface-800">Find exactly what you're looking for</p>
                        </div>
                        <Link to="/listings" className="flex items-center gap-2 text-sm text-primary-500 font-semibold hover:text-primary-600 transition-colors">
                            View all <ChevronRight className="w-4 h-4" />
                        </Link>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {categories.map(({ name, icon: Icon, color, count }) => (
                            <Link
                                key={name}
                                to={`/listings?category=${encodeURIComponent(name)}`}
                                className="glass rounded-2xl p-5 text-center card-hover group border-white/40 shadow-sm"
                            >
                                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mx-auto mb-3 shadow-lg group-hover:scale-110 transition-transform`}>
                                    <Icon className="w-6 h-6 text-white" />
                                </div>
                                <p className="text-xs font-semibold text-surface-900 leading-snug mb-1">{name}</p>
                                <p className="text-xs text-surface-800">{count} items</p>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* Featured Listings */}
            <section className="py-16 px-4">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-between mb-10">
                        <div>
                            <h2 className="font-display text-3xl font-bold text-surface-900 mb-2">Featured Listings</h2>
                            <p className="text-surface-800">Top-rated items from verified owners</p>
                        </div>
                        <Link to="/listings" className="flex items-center gap-2 text-sm text-primary-500 font-semibold hover:text-primary-600 transition-colors">
                            See all <ChevronRight className="w-4 h-4" />
                        </Link>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        {loading
                            ? Array(4).fill(0).map((_, i) => <ListingCardSkeleton key={i} />)
                            : featured.slice(0, 4).map((l) => <ListingCard key={l._id} listing={l} />)
                        }
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section id="how-it-works" className="py-20 px-4">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-14">
                        <h2 className="font-display text-3xl md:text-4xl font-bold text-surface-950 mb-4">
                            How RentoQuick Works
                        </h2>
                        <p className="text-surface-800 text-lg max-w-xl mx-auto font-medium opacity-80">
                            Renting has never been this simple. Three steps and you're done.
                        </p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        {howItWorks.map(({ step, title, desc, icon: Icon }) => (
                            <div key={step} className="relative text-center group">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500/10 to-primary-300/10 border border-primary-500/20 flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform">
                                    <Icon className="w-7 h-7 text-primary-500" />
                                </div>
                                <div className="absolute top-0 right-4 text-6xl font-black text-primary-500/5 select-none">{step}</div>
                                <h3 className="text-lg font-bold text-surface-900 mb-2">{title}</h3>
                                <p className="text-surface-800 text-sm leading-relaxed">{desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Banner */}
            <section className="py-16 px-4">
                <div className="max-w-7xl mx-auto">
                    <div className="relative rounded-3xl overflow-hidden gradient-border p-px shadow-2xl shadow-primary-500/10">
                        <div className="rounded-3xl bg-gradient-to-br from-primary-500/5 via-accent-100/5 to-primary-300/5 p-12 text-center backdrop-blur-sm">
                            <div className="absolute inset-0 -z-0">
                                <div className="absolute top-0 left-1/4 w-64 h-64 bg-primary-500/5 rounded-full blur-3xl" />
                                <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-primary-300/5 rounded-full blur-3xl opacity-50" />
                            </div>
                            <img
                                src="/favicon.png"
                                alt="RentoQuick"
                                className="w-12 h-12 mx-auto mb-4 relative drop-shadow-xl"
                            />
                            <h2 className="font-display text-3xl md:text-4xl font-bold text-surface-950 mb-4 relative">
                                Have something to rent out?
                            </h2>
                            <p className="text-surface-800 text-lg mb-8 max-w-lg mx-auto relative">
                                Turn your unused items into income. List for free and start earning today.
                            </p>
                            <Link to="/listings/new" className="inline-flex items-center gap-2 btn-primary px-8 py-3.5 rounded-xl font-semibold text-lg relative z-10">
                                <span className="relative z-10">Start Listing</span>
                                <ArrowRight className="w-5 h-5 relative z-10" />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
