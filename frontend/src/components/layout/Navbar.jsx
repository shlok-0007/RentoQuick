import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { messagesAPI } from '../../api';
import {
    Menu, X, Search, Bell, ChevronDown, LogOut,
    User, Package, BookOpen, Heart, Plus, MessageSquare, ShieldAlert, BarChart3,
    Gavel, Bookmark, Zap,
} from 'lucide-react';

const navLinks = [
    { label: 'Browse', to: '/listings' },
    { label: 'How it Works', to: '/#how-it-works' },
    { label: 'Reviews', to: '/#reviews' },
];

export default function Navbar() {
    const { user, isAuthenticated, logout, notifications, clearNotifications, socket } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();
    const location = useLocation();
    const [menuOpen, setMenuOpen] = useState(false);
    const [dropOpen, setDropOpen] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [search, setSearch] = useState('');
    const [unreadMsgCount, setUnreadMsgCount] = useState(0);

    useEffect(() => {
        const handler = () => setScrolled(window.scrollY > 12);
        window.addEventListener('scroll', handler, { passive: true });
        return () => window.removeEventListener('scroll', handler);
    }, []);

    useEffect(() => {
        setMenuOpen(false);
        setDropOpen(false);
        setNotifOpen(false);
    }, [location.pathname]);

    // Fetch unread message count
    useEffect(() => {
        if (!isAuthenticated) return;
        messagesAPI.getConversations()
            .then(res => {
                const total = (res.data.conversations || []).reduce((sum, c) => sum + (c.unreadCount || 0), 0);
                setUnreadMsgCount(total);
            })
            .catch(() => { });
    }, [isAuthenticated]);

    // Listen for real-time new_message to update badge
    useEffect(() => {
        if (!socket) return;
        const handleNewMsg = () => {
            messagesAPI.getConversations()
                .then(res => {
                    const total = (res.data.conversations || []).reduce((sum, c) => sum + (c.unreadCount || 0), 0);
                    setUnreadMsgCount(total);
                })
                .catch(() => {});
        };
        const handleMsgsRead = () => {
            messagesAPI.getConversations()
                .then(res => {
                    const total = (res.data.conversations || []).reduce((sum, c) => sum + (c.unreadCount || 0), 0);
                    setUnreadMsgCount(total);
                })
                .catch(() => {});
        };
        socket.on('new_message', handleNewMsg);
        socket.on('messages_read', handleMsgsRead);
        return () => {
            socket.off('new_message', handleNewMsg);
            socket.off('messages_read', handleMsgsRead);
        };
    }, [socket]);

    const handleSearch = (e) => {
        e.preventDefault();
        if (search.trim()) navigate(`/listings?search=${encodeURIComponent(search.trim())}`);
    };

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const handleAuthRequired = (path) => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }
        navigate(path);
    };

    return (
        <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'glass shadow-lg shadow-primary-500/5' : 'bg-transparent'}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16 md:h-18">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2.5 group shrink-0">
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary-500 to-primary-300 rounded-xl blur-md opacity-50 group-hover:opacity-80 transition-opacity" />
                            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-300 flex items-center justify-center shadow-lg shadow-primary-500/30">
                                <Zap className="w-5 h-5 text-white" fill="white" />
                            </div>
                        </div>
                        <span className="font-display font-extrabold text-xl gradient-text tracking-tight">RentoQuick</span>
                    </Link>

                    {/* Desktop Search */}
                    <form onSubmit={handleSearch} className="hidden md:flex items-center flex-1 max-w-md mx-8">
                        <div className="relative w-full group">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-800 group-focus-within:text-primary-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Search cameras, bikes, drones..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 h-10 rounded-xl text-sm input-dark bg-white/70 focus:bg-white"
                            />
                        </div>
                    </form>

                    {/* Desktop Nav */}
                    <div className="hidden md:flex items-center gap-1">
                        {navLinks.map((link) => (
                            <a
                                key={link.label}
                                href={link.to}
                                className="px-3 py-2 text-sm font-semibold text-surface-800 hover:text-primary-500 transition-colors rounded-lg hover:bg-primary-500/5"
                            >
                                {link.label}
                            </a>
                        ))}

                        <div className="w-px h-6 bg-primary-500/10 mx-2" />

                        {isAuthenticated ? (
                            <>
                                {/* Notifications */}
                                <div className="relative">
                                    <button
                                        onClick={() => setNotifOpen(!notifOpen)}
                                        className="p-2 rounded-xl btn-ghost text-surface-800 hover:text-primary-500 relative"
                                    >
                                        <Bell className="w-5 h-5" />
                                        {notifications.filter(n => !n.isRead).length > 0 && (
                                            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary-500 border-2 border-white pulse-glow" />
                                        )}
                                    </button>
                                    {notifOpen && (
                                        <div className="absolute right-0 mt-2 w-80 glass rounded-2xl shadow-xl overflow-hidden border border-primary-500/10 scale-in-center">
                                            <div className="px-4 py-3 border-b border-primary-500/10 bg-primary-500/5 flex justify-between items-center">
                                                <span className="text-sm font-bold text-surface-950">Notifications</span>
                                                <button onClick={() => clearNotifications()} className="text-[10px] font-bold text-primary-500 uppercase">Clear All</button>
                                            </div>
                                            <div className="max-h-96 overflow-y-auto">
                                                {notifications.length === 0 ? (
                                                    <div className="p-8 text-center text-surface-700 text-sm italic font-medium">No new notifications</div>
                                                ) : (
                                                    notifications.slice(0, 8).map((n, i) => (
                                                        <div
                                                            key={i}
                                                            className="p-4 border-b border-primary-500/5 hover:bg-primary-500/5 transition-colors cursor-pointer"
                                                            onClick={() => {
                                                                if (n.link) navigate(n.link);
                                                                setNotifOpen(false);
                                                            }}
                                                        >
                                                            <p className="text-xs font-bold text-surface-950 mb-0.5">{n.title}</p>
                                                            <p className="text-xs text-surface-800 line-clamp-2 font-medium">{n.content}</p>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* List item button */}
                                <button
                                    onClick={() => handleAuthRequired('/listings/new')}
                                    className="btn-coral ml-1 h-10 px-4 rounded-xl flex items-center gap-2 text-sm font-semibold"
                                >
                                    <Plus className="w-4 h-4" />
                                    List Item
                                </button>

                                {/* User menu */}
                                <div className="relative">
                                    <button
                                        onClick={() => setDropOpen(!dropOpen)}
                                        className="flex items-center gap-2 ml-1 px-2 py-1.5 rounded-xl hover:bg-primary-500/5 transition-colors"
                                    >
                                        {user?.avatar ? (
                                            <img
                                                src={user.avatar}
                                                alt={user?.name || 'Profile'}
                                                className="w-8 h-8 rounded-full object-cover shadow-sm ring-2 ring-white"
                                                onError={(e) => {
                                                    // Fallback to gradient initial if the avatar URL fails to load
                                                    e.target.onerror = null;
                                                    e.target.style.display = 'none';
                                                    const fallback = e.currentTarget.nextElementSibling;
                                                    if (fallback) fallback.style.display = 'flex';
                                                }}
                                            />
                                        ) : null}
                                        <div
                                            className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-300 flex items-center justify-center text-xs font-bold text-white shadow-sm"
                                            style={{ display: user?.avatar ? 'none' : 'flex' }}
                                        >
                                            {user?.name?.[0]?.toUpperCase() || <User className="w-4 h-4" />}
                                        </div>
                                        <ChevronDown className={`w-3.5 h-3.5 text-surface-800 transition-transform ${dropOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    {dropOpen && (
                                        <div className="absolute right-0 mt-2 w-60 glass rounded-2xl shadow-xl overflow-hidden border border-primary-500/10 scale-in-center">
                                            <div className="px-4 py-3 border-b border-primary-500/10 bg-primary-500/5">
                                                <p className="text-sm font-bold text-surface-950 truncate">{user?.name}</p>
                                                <p className="text-xs text-surface-800 truncate font-medium">{user?.email}</p>
                                            </div>
                                            <div className="py-1">
                                                {[
                                                    { to: '/profile', icon: User, label: t('common.profile') },
                                                    { to: '/my-listings', icon: Package, label: 'My Listings' },
                                                    { to: '/bookings', icon: BookOpen, label: t('common.bookings') },
                                                    { to: '/messages', icon: MessageSquare, label: t('common.messages'), badge: unreadMsgCount },
                                                    { to: '/saved-searches', icon: Bookmark, label: 'Saved Searches' },
                                                    { to: '/disputes', icon: Gavel, label: 'Resolution Center' },
                                                    { to: '/analytics', icon: BarChart3, label: 'Analytics' },
                                                    { to: '/wishlist', icon: Heart, label: 'Wishlist' },
                                                ].map(({ to, icon: Icon, label, badge }) => (
                                                    <Link
                                                        key={to}
                                                        to={to}
                                                        className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${location.pathname === to ? 'bg-primary-500/10 text-primary-500' : 'text-surface-800 hover:bg-primary-500/5 hover:text-primary-500'}`}
                                                    >
                                                        <Icon className="w-4 h-4 text-primary-500" />
                                                        <span className="flex-1">{label}</span>
                                                        {badge > 0 && (
                                                            <span className="ml-auto w-5 h-5 rounded-full bg-primary-500 text-white text-[10px] font-bold flex items-center justify-center">
                                                                {badge > 9 ? '9+' : badge}
                                                            </span>
                                                        )}
                                                    </Link>
                                                ))}
                                            </div>
                                            {user?.role === 'admin' && (
                                                <Link
                                                    to="/admin"
                                                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-primary-500 hover:bg-primary-500/10 transition-colors border-t border-primary-500/10"
                                                >
                                                    <ShieldAlert className="w-4 h-4" />
                                                    Admin Dashboard
                                                </Link>
                                            )}
                                            <button
                                                onClick={handleLogout}
                                                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-primary-500 font-bold hover:bg-primary-500/10 transition-colors border-t border-primary-500/10"
                                            >
                                                <LogOut className="w-4 h-4" />
                                                {t('common.logout')}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <>
                                <Link to="/login" className="px-4 py-2 rounded-xl btn-ghost text-sm font-semibold ml-1">{t('common.login')}</Link>
                                <Link to="/register" className="btn-coral ml-1 h-10 px-4 rounded-xl flex items-center text-sm font-semibold">
                                    {t('common.register')}
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Mobile menu button */}
                    <div className="flex md:hidden items-center gap-1">
                        <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 rounded-lg btn-ghost">
                            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile menu */}
            {menuOpen && (
                <div className="md:hidden glass border-t border-primary-500/10">
                    <div className="px-4 py-4 space-y-2 max-h-[80vh] overflow-y-auto">
                        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-800" />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm input-dark bg-white/60"
                                />
                            </div>
                            <button type="submit" className="btn-coral px-4 py-2.5 rounded-xl text-sm font-semibold">Go</button>
                        </form>
                        <Link to="/listings" className="block px-3 py-2.5 rounded-lg text-sm text-surface-800 font-semibold hover:bg-primary-500/5 hover:text-primary-500">Browse Listings</Link>
                        {isAuthenticated ? (
                            <>
                                <button onClick={() => handleAuthRequired('/listings/new')} className="btn-coral w-full px-3 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 justify-center">
                                    <Plus className="w-4 h-4" /> List an Item
                                </button>
                                <Link to="/profile" className="block px-3 py-2.5 rounded-lg text-sm text-surface-800 font-medium hover:bg-primary-500/5">Profile</Link>
                                <Link to="/my-listings" className="block px-3 py-2.5 rounded-lg text-sm text-surface-800 font-medium hover:bg-primary-500/5">My Listings</Link>
                                <Link to="/bookings" className="block px-3 py-2.5 rounded-lg text-sm text-surface-800 font-medium hover:bg-primary-500/5">My Bookings</Link>
                                <Link to="/messages" className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-surface-800 font-medium hover:bg-primary-500/5">
                                    Messages
                                    {unreadMsgCount > 0 && (
                                        <span className="w-5 h-5 rounded-full bg-primary-500 text-white text-[10px] font-bold flex items-center justify-center">
                                            {unreadMsgCount > 9 ? '9+' : unreadMsgCount}
                                        </span>
                                    )}
                                </Link>
                                <Link to="/wishlist" className="block px-3 py-2.5 rounded-lg text-sm text-surface-800 font-medium hover:bg-primary-500/5">Wishlist</Link>
                                <button onClick={handleLogout} className="block w-full text-left px-3 py-2.5 rounded-lg text-sm text-primary-500 font-bold hover:bg-primary-500/10">Sign Out</button>
                            </>
                        ) : (
                            <>
                                <Link to="/login" className="block px-3 py-2.5 rounded-lg text-sm text-surface-800 font-semibold hover:bg-primary-500/5">Sign In</Link>
                                <Link to="/register" className="block px-3 py-2.5 rounded-lg text-sm font-bold text-primary-500 hover:bg-primary-500/5">Get Started →</Link>
                            </>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
}
