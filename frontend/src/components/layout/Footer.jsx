import { Link } from 'react-router-dom';
import { Zap, Twitter, Instagram, Github, Linkedin, Mail, MapPin } from 'lucide-react';

const footerLinks = {
    Product: [
        { label: 'Browse Listings', to: '/listings' },
        { label: 'List an Item', to: '/listings/new' },
        { label: 'My Wishlist', to: '/wishlist' },
        { label: 'How It Works', to: '/#how-it-works' },
    ],
    Company: [
        { label: 'About Us', to: '/about' },
        { label: 'Blog', to: '/blog' },
        { label: 'Careers', to: '/careers' },
        { label: 'Press', to: '/press' },
    ],
    Support: [
        { label: 'Help Center', to: '/help' },
        { label: 'Safety Tips', to: '/safety' },
        { label: 'Contact Us', to: '/contact' },
        { label: 'Report Issue', to: '/report' },
    ],
};

export default function Footer() {
    return (
        <footer className="border-t border-primary-500/10 mt-20 bg-primary-500/5">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
                    {/* Brand */}
                    <div className="lg:col-span-2">
                        <Link to="/" className="flex items-center gap-2 mb-4 group">
                            <img
                                src="/favicon.png"
                                alt="RentoQuick Logo"
                                className="w-9 h-9 rounded-xl object-contain shadow-md group-hover:shadow-lg transition-shadow"
                            />
                            <span className="font-display font-bold text-xl gradient-text">RentoQuick</span>
                        </Link>
                        <p className="text-surface-800 text-sm leading-relaxed max-w-xs font-medium">
                            India's fastest peer-to-peer rental marketplace. Rent anything from anyone, anywhere — securely and affordably.
                        </p>
                        <div className="flex items-center gap-2 mt-4 text-sm text-surface-700 font-medium">
                            <MapPin className="w-4 h-4 text-primary-500" />
                            <span>Mumbai, India</span>
                        </div>
                        <div className="flex items-center gap-3 mt-6">
                            {[Twitter, Instagram, Github, Linkedin].map((Icon, i) => (
                                <a key={i} href="#" className="w-9 h-9 rounded-lg glass flex items-center justify-center text-primary-500 hover:text-white hover:bg-primary-500 transition-all border-white/50 shadow-sm">
                                    <Icon className="w-4 h-4" />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Links */}
                    {Object.entries(footerLinks).map(([section, links]) => (
                        <div key={section}>
                            <h3 className="font-bold text-surface-950 text-sm mb-4">{section}</h3>
                            <ul className="space-y-2.5">
                                {links.map(({ label, to }) => (
                                    <li key={label}>
                                        <Link to={to} className="text-surface-800 text-sm font-medium hover:text-primary-500 transition-colors">
                                            {label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Bottom bar */}
                <div className="mt-12 pt-8 border-t border-primary-500/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-surface-700 text-sm font-medium">© 2024 RentoQuick. All rights reserved.</p>
                    <div className="flex items-center gap-6 text-sm text-surface-700 font-medium font-semibold">
                        <Link to="/privacy" className="hover:text-primary-500 transition-colors">Privacy Policy</Link>
                        <Link to="/terms" className="hover:text-primary-500 transition-colors">Terms of Service</Link>
                        <Link to="/cookies" className="hover:text-primary-500 transition-colors">Cookies</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
