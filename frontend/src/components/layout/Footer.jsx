import { Link } from 'react-router-dom';
import {
    Zap, Twitter, Instagram, Github, Linkedin, Mail, MapPin, ArrowRight, Send,
} from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

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
    Legal: [
        { label: 'Privacy Policy', to: '/privacy' },
        { label: 'Terms of Service', to: '/terms' },
        { label: 'Cookie Policy', to: '/cookies' },
        { label: 'Refund Policy', to: '/refund' },
    ],
};

const socials = [
    { icon: Twitter, label: 'Twitter', href: '#' },
    { icon: Instagram, label: 'Instagram', href: '#' },
    { icon: Github, label: 'GitHub', href: '#' },
    { icon: Linkedin, label: 'LinkedIn', href: '#' },
];

export default function Footer() {
    const [email, setEmail] = useState('');

    const handleSubscribe = (e) => {
        e.preventDefault();
        if (!email.trim()) return;
        toast.success('Subscribed! Watch your inbox for great rental deals.');
        setEmail('');
    };

    return (
        <footer className="relative mt-20 border-t border-primary-500/10 bg-gradient-to-b from-primary-500/[0.03] to-primary-500/[0.06]">
            {/* Newsletter band */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16">
                <div className="relative rounded-3xl glass border-white/60 p-8 md:p-10 shadow-xl shadow-primary-500/5 overflow-hidden">
                    <div className="absolute -top-16 -right-16 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl" />
                    <div className="relative grid md:grid-cols-2 gap-6 items-center">
                        <div>
                            <h3 className="font-display text-2xl md:text-3xl font-extrabold mb-2 text-surface-950 text-balance">
                                Never miss a great rental deal
                            </h3>
                            <p className="text-surface-800 text-sm md:text-base">
                                Get the best listings, exclusive offers, and rental tips delivered to your inbox weekly.
                            </p>
                        </div>
                        <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-800" />
                                <input
                                    type="email"
                                    required
                                    placeholder="Enter your email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full h-12 pl-10 pr-4 rounded-xl input-dark bg-white/80 text-sm"
                                />
                            </div>
                            <button type="submit" className="btn-coral h-12 px-6 rounded-xl flex items-center justify-center gap-2 shrink-0 font-semibold">
                                Subscribe
                                <Send className="w-4 h-4" />
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            {/* Main footer */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-10">
                    {/* Brand */}
                    <div className="col-span-2 lg:col-span-2">
                        <Link to="/" className="flex items-center gap-2.5 mb-4 group">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-300 flex items-center justify-center shadow-lg shadow-primary-500/30 group-hover:scale-105 transition-transform">
                                <Zap className="w-5 h-5 text-white" fill="white" />
                            </div>
                            <span className="font-display font-extrabold text-xl gradient-text tracking-tight">RentoQuick</span>
                        </Link>
                        <p className="text-surface-800 text-sm leading-relaxed max-w-xs mb-4 font-medium">
                            India's fastest peer-to-peer rental marketplace. Rent anything from anyone, anywhere — securely and affordably.
                        </p>
                        <div className="flex items-center gap-2 text-sm text-surface-800 font-medium mb-5">
                            <MapPin className="w-4 h-4 text-primary-500" />
                            <span>Mumbai, India</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                            {socials.map(({ icon: Icon, label, href }) => (
                                <a
                                    key={label}
                                    href={href}
                                    aria-label={label}
                                    className="w-9 h-9 rounded-xl glass flex items-center justify-center text-primary-500 hover:text-white hover:bg-gradient-to-br hover:from-primary-500 hover:to-primary-300 transition-all border-white/50 shadow-sm hover:scale-110 hover:-translate-y-0.5"
                                >
                                    <Icon className="w-4 h-4" />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Links */}
                    {Object.entries(footerLinks).map(([section, links]) => (
                        <div key={section}>
                            <h3 className="font-bold text-surface-950 text-sm mb-4 uppercase tracking-wider">{section}</h3>
                            <ul className="space-y-2.5">
                                {links.map(({ label, to }) => (
                                    <li key={label}>
                                        <Link
                                            to={to}
                                            className="text-sm text-surface-800 hover:text-primary-500 transition-colors font-medium inline-flex items-center group"
                                        >
                                            <ArrowRight className="w-3 h-3 mr-0 opacity-0 group-hover:opacity-100 group-hover:mr-1.5 transition-all text-primary-500" />
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
                    <p className="text-surface-800 text-sm font-medium">© {new Date().getFullYear()} RentoQuick. All rights reserved.</p>
                    <div className="flex items-center gap-2 text-xs text-surface-800 font-medium">
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            All systems operational
                        </span>
                        <span className="mx-2">•</span>
                        <span>Made with care in India</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
