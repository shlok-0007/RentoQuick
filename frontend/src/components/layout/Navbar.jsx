import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
    Menu, X, Search, Bell, ChevronDown, LogOut,
    User, Package, BookOpen, Heart, Plus, Zap
} from 'lucide-react';

export default function Navbar() {
    const { user, isAuthenticated, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [menuOpen, setMenuOpen] = useState(false);
    const [dropOpen, setDropOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const handler = () => setScrolled(window.scrollY > 10);
        window.addEventListener('scroll', handler);
        return () => window.removeEventListener('scroll', handler);
    }, []);

    useEffect(() => {
        setMenuOpen(false);
        setDropOpen(false);
    }, [location.pathname]);

    const handleSearch = (e) => {
        e.preventDefault();
        if (search.trim()) navigate(`/listings?search=${encodeURIComponent(search.trim())}`);
    };

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'glass shadow-md shadow-primary-500/5' : 'bg-transparent'}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2 group">
                        <img
                            src="/favicon.png"
                            alt="RentoQuick Logo"
                            className="w-9 h-9 rounded-xl object-contain shadow-lg shadow-primary-500/30 group-hover:shadow-primary-500/50 transition-shadow"
                        />
                        <span className="font-display font-bold text-xl gradient-text">RentoQuick</span>
                    </Link>

                    {/* Search bar (hidden on mobile) */}
                    <form onSubmit={handleSearch} className="hidden md:flex items-center flex-1 max-w-md mx-8">
                        <div className="relative w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-800" />
                            <input
                                type="text"
                                placeholder="Search items to rent..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 rounded-xl text-sm input-dark bg-white/60 focus:bg-white"
                            />
                        </div>
                    </form>

                    {/* Desktop nav */}
                    <div className="hidden md:flex items-center gap-2">
                        <Link
                            to="/listings"
                            className={`px-3 py-1.5 text-sm font-semibold transition-all rounded-lg ${location.pathname === '/listings' ? 'bg-primary-500/10 text-primary-500' : 'text-surface-800 hover:text-primary-500'}`}
                        >
                            Browse
                        </Link>
                        {isAuthenticated ? (
                            <>
                                <Link to="/listings/new" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg btn-primary text-sm relative z-10">
                                    <Plus className="w-4 h-4 relative z-10" />
                                    <span className="relative z-10">List Item</span>
                                </Link>
                                <div className="relative">
                                    <button
                                        onClick={() => setDropOpen(!dropOpen)}
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl btn-ghost text-sm font-semibold border-white/40"
                                    >
                                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-primary-300 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                                            {user?.name?.[0]?.toUpperCase()}
                                        </div>
                                        <span className="max-w-[100px] truncate">{user?.name?.split(' ')[0]}</span>
                                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${dropOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    {dropOpen && (
                                        <div className="absolute right-0 mt-2 w-52 glass rounded-2xl shadow-xl overflow-hidden border border-primary-500/10 scale-in-center">
                                            <div className="px-4 py-3 border-b border-primary-500/10 bg-primary-500/5">
                                                <p className="text-sm font-bold text-surface-950 truncate">{user?.name}</p>
                                                <p className="text-xs text-surface-800 truncate font-medium">{user?.email}</p>
                                            </div>
                                            {[
                                                { to: '/profile', icon: User, label: 'My Profile' },
                                                { to: '/my-listings', icon: Package, label: 'My Listings' },
                                                { to: '/bookings', icon: BookOpen, label: 'My Bookings' },
                                                { to: '/wishlist', icon: Heart, label: 'Wishlist' },
                                            ].map(({ to, icon: Icon, label }) => (
                                                <Link
                                                    key={to}
                                                    to={to}
                                                    className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${location.pathname === to ? 'bg-primary-500/10 text-primary-500' : 'text-surface-800 hover:bg-primary-500/5 hover:text-primary-500'}`}
                                                >
                                                    <Icon className="w-4 h-4 text-primary-500" />
                                                    {label}
                                                </Link>
                                            ))}
                                            <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-primary-500 font-bold hover:bg-primary-500/10 transition-colors border-t border-primary-500/10">
                                                <LogOut className="w-4 h-4" />
                                                Sign Out
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <>
                                <Link to="/login" className="px-4 py-1.5 rounded-xl btn-ghost text-sm">Sign In</Link>
                                <Link to="/register" className="px-4 py-1.5 rounded-xl btn-primary text-sm relative z-10">
                                    <span className="relative z-10">Get Started</span>
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Mobile menu button */}
                    <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 rounded-lg btn-ghost">
                        {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* Mobile menu */}
            {menuOpen && (
                <div className="md:hidden glass border-t border-primary-500/10">
                    <div className="px-4 py-4 space-y-2">
                        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-800" />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 rounded-xl text-sm input-dark bg-white/60"
                                />
                            </div>
                            <button type="submit" className="px-4 py-2 rounded-xl btn-primary text-sm relative z-10">
                                <span className="relative z-10">Go</span>
                            </button>
                        </form>
                        <Link to="/listings" className="block px-3 py-2 rounded-lg text-sm text-surface-800 font-semibold hover:bg-primary-500/5 hover:text-primary-500">Browse Listings</Link>
                        {isAuthenticated ? (
                            <>
                                <Link to="/listings/new" className="block px-3 py-2 rounded-lg text-sm text-primary-500 font-bold hover:bg-primary-500/5">+ List an Item</Link>
                                <Link to="/profile" className="block px-3 py-2 rounded-lg text-sm text-surface-800 font-medium hover:bg-primary-500/5">Profile</Link>
                                <Link to="/my-listings" className="block px-3 py-2 rounded-lg text-sm text-surface-800 font-medium hover:bg-primary-500/5">My Listings</Link>
                                <Link to="/bookings" className="block px-3 py-2 rounded-lg text-sm text-surface-800 font-medium hover:bg-primary-500/5">My Bookings</Link>
                                <button onClick={handleLogout} className="block w-full text-left px-3 py-2 rounded-lg text-sm text-primary-500 font-bold hover:bg-primary-500/10">Sign Out</button>
                            </>
                        ) : (
                            <>
                                <Link to="/login" className="block px-3 py-2 rounded-lg text-sm text-surface-800 font-semibold hover:bg-primary-500/5">Sign In</Link>
                                <Link to="/register" className="block px-3 py-2 rounded-lg text-sm font-bold text-primary-500 hover:bg-primary-500/5">Get Started →</Link>
                            </>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
}
