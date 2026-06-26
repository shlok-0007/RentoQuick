import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search, ArrowRight, Sparkles, MapPin, Target, Star, Shield, Zap, TrendingUp, Camera,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { popularSearches } from '../../data/content';

const trustBadges = [
    { icon: Shield, label: 'Damage Protection' },
    { icon: Zap, label: 'Instant Booking' },
    { icon: Star, label: '4.8/5 Rated' },
];

export default function Hero() {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [locationSearch, setLocationSearch] = useState('');

    const handleSearch = (e) => {
        e.preventDefault();
        const params = new URLSearchParams();
        if (search.trim()) params.set('search', search);
        if (locationSearch.trim()) params.set('city', locationSearch);
        navigate(`/listings?${params.toString()}`);
    };

    const handleAuthRequired = (path) => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }
        navigate(path);
    };

    return (
        <section className="relative pt-28 md:pt-36 pb-16 md:pb-24 overflow-hidden mesh-bg">
            {/* Animated gradient blobs */}
            <div className="absolute inset-0 -z-10 overflow-hidden">
                <div className="absolute top-10 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl animate-blob" />
                <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-primary-300/20 rounded-full blur-3xl animate-blob animation-delay-2000" />
                <div className="absolute top-1/3 right-1/3 w-72 h-72 bg-amber-200/30 rounded-full blur-3xl animate-blob animation-delay-4000" />
            </div>

            {/* Floating cards decoration */}
            <div className="hidden lg:block absolute top-32 left-8 animate-float-slow">
                <div className="glass rounded-2xl p-3 shadow-xl rotate-[-8deg] w-44">
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-300 flex items-center justify-center">
                            <Camera className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-surface-900">Canon R5</p>
                            <p className="text-[10px] text-primary-500 font-semibold">₹3,500/day</p>
                        </div>
                    </div>
                </div>
            </div>
            <div className="hidden lg:block absolute bottom-32 right-8 animate-float">
                <div className="glass rounded-2xl p-3 shadow-xl rotate-[8deg] w-44">
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-primary-300 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-surface-900">Earn ₹80k+</p>
                            <p className="text-[10px] text-primary-500 font-semibold">As a host</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 text-center relative">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8 shadow-sm fade-in-up">
                    <Sparkles className="w-4 h-4 text-primary-500" />
                    <span className="text-sm text-surface-900 font-semibold">India's #1 P2P Rental Platform</span>
                    <span className="flex items-center gap-1 ml-1 px-2 py-0.5 rounded-full bg-primary-500/10">
                        <Star className="w-3 h-3 text-primary-500 fill-primary-500" />
                        <span className="text-[10px] font-bold text-primary-500">4.8</span>
                    </span>
                </div>

                {/* Heading */}
                <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold mb-6 leading-[1.05] tracking-tight text-surface-950 text-balance fade-in-up fade-in-up-delay-1">
                    Rent Anything, <span className="gradient-text">Anywhere</span>
                    <br className="hidden sm:block" /> in India
                </h1>

                <p className="text-surface-800 text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed fade-in-up fade-in-up-delay-2">
                    Skip the buy. RentoQuick connects you with real people renting their stuff — from drones to motorcycles, cameras to camping gear.
                </p>

                {/* Search bar */}
                <form onSubmit={handleSearch} className="relative max-w-3xl mx-auto mb-6 fade-in-up fade-in-up-delay-3">
                    <div className="glass rounded-2xl p-2 flex flex-col sm:flex-row gap-2 shadow-2xl shadow-primary-500/10 border-white/60">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-800" />
                            <input
                                type="text"
                                placeholder="What do you want to rent today?"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-12 pr-4 h-12 rounded-xl text-base input-dark bg-white/80 border-transparent"
                            />
                        </div>
                        <div className="relative sm:w-52">
                            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-800" />
                            <input
                                type="text"
                                placeholder="Location"
                                value={locationSearch}
                                onChange={(e) => setLocationSearch(e.target.value)}
                                className="w-full pl-10 pr-10 h-12 rounded-xl text-sm input-dark bg-white/80 border-transparent"
                            />
                            <button
                                type="button"
                                onClick={() => navigate('/listings')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-primary-500/10 transition-colors group"
                                title="Use current location"
                            >
                                <Target className="w-4 h-4 text-primary-500 group-hover:scale-110 transition-transform" />
                            </button>
                        </div>
                        <button type="submit" className="btn-coral h-12 px-7 rounded-xl font-semibold text-base flex items-center gap-2 shrink-0">
                            <span>Search</span>
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </form>

                {/* Quick links */}
                <div className="flex flex-wrap items-center justify-center gap-2 fade-in-up fade-in-up-delay-4">
                    <span className="text-xs text-surface-800 font-medium">Popular:</span>
                    {popularSearches.map((term) => (
                        <button
                            key={term}
                            onClick={() => navigate(`/listings?search=${term}`)}
                            className="px-3 py-1.5 rounded-full text-xs glass text-surface-800 hover:text-primary-500 hover:bg-white/60 transition-all border-white/50 shadow-sm font-medium"
                        >
                            {term}
                        </button>
                    ))}
                </div>

                {/* Trust badges */}
                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 mt-12 fade-in-up fade-in-up-delay-4">
                    {trustBadges.map(({ icon: Icon, label }) => (
                        <div key={label} className="flex items-center gap-2 text-sm text-surface-800 font-medium">
                            <Icon className="w-4 h-4 text-primary-500" />
                            {label}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
