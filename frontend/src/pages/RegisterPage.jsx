import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Zap, ArrowRight, CheckCircle } from 'lucide-react';

const benefits = [
    'List for free, earn from idle items',
    'Verified renters, secure transactions',
    'Real-time booking management',
    'RentoQuick protection on every rental',
];

export default function RegisterPage() {
    const { register } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', phone: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const validate = () => {
        const errs = {};
        if (!form.name || form.name.length < 2) errs.name = 'Name must be at least 2 characters';
        if (!form.email || !/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Valid email required';
        if (!form.password || form.password.length < 6) errs.password = 'Password must be at least 6 characters';
        if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
        return errs;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) { setErrors(errs); return; }

        try {
            setLoading(true);
            await register({ name: form.name, email: form.email, password: form.password, phone: form.phone });
            toast.success('Account created! Welcome to RentoQuick 🎉');
            navigate('/');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    const passwordStrength = () => {
        const p = form.password;
        if (!p) return 0;
        let s = 0;
        if (p.length >= 6) s++;
        if (p.length >= 10) s++;
        if (/[A-Z]/.test(p)) s++;
        if (/[0-9]/.test(p)) s++;
        if (/[^A-Za-z0-9]/.test(p)) s++;
        return s;
    };
    const strength = passwordStrength();
    const strengthColor = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-emerald-500'][strength] || '';
    const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent'][strength] || '';

    const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-20">
            <div className="absolute inset-0 -z-10 overflow-hidden">
                <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '1s' }} />
                <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-primary-300/10 rounded-full blur-3xl animate-pulse-glow" />
            </div>

            <div className="w-full max-w-lg">
                <Link to="/" className="flex items-center justify-center gap-2 mb-8 group">
                    <img
                        src="/favicon.png"
                        alt="RentoQuick Logo"
                        className="w-10 h-10 rounded-xl object-contain shadow-lg shadow-primary-500/20 group-hover:shadow-primary-500/40 transition-shadow"
                    />
                    <span className="font-display font-bold text-2xl gradient-text">RentoQuick</span>
                </Link>

                <div className="glass rounded-3xl p-8 border-white/50 shadow-xl">
                    <h1 className="font-display text-2xl font-bold text-surface-950 mb-1">Create your account</h1>
                    <p className="text-surface-800 text-sm mb-8 font-medium">Join 120,000+ users renting smarter</p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-surface-800 mb-2">Full Name *</label>
                                <input
                                    value={form.name}
                                    onChange={(e) => update('name', e.target.value)}
                                    placeholder="Arjun Sharma"
                                    className={`w-full px-4 py-3 rounded-xl input-dark text-sm bg-white/60 focus:bg-white transition-all ${errors.name ? 'border-red-500/50' : 'border-primary-500/10'}`}
                                />
                                {errors.name && <p className="text-xs text-red-500 font-bold mt-1">{errors.name}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-surface-800 mb-2">Phone (optional)</label>
                                <input
                                    value={form.phone}
                                    onChange={(e) => update('phone', e.target.value)}
                                    placeholder="9876543210"
                                    className="w-full px-4 py-3 rounded-xl input-dark text-sm bg-white/60 focus:bg-white transition-all border-primary-500/10"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-surface-800 mb-2">Email Address *</label>
                            <input
                                type="email"
                                value={form.email}
                                onChange={(e) => update('email', e.target.value)}
                                placeholder="you@example.com"
                                className={`w-full px-4 py-3 rounded-xl input-dark text-sm bg-white/60 focus:bg-white transition-all ${errors.email ? 'border-red-500/50' : 'border-primary-500/10'}`}
                            />
                            {errors.email && <p className="text-xs text-red-500 font-bold mt-1">{errors.email}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-surface-800 mb-2">Password *</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={form.password}
                                    onChange={(e) => update('password', e.target.value)}
                                    placeholder="Min. 6 characters"
                                    className={`w-full px-4 py-3 pr-12 rounded-xl input-dark text-sm bg-white/60 focus:bg-white transition-all ${errors.password ? 'border-red-500/50' : 'border-primary-500/10'}`}
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-700 hover:text-primary-500 transition-colors">
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {form.password && (
                                <div className="mt-2 flex items-center gap-3">
                                    <div className="flex-1 flex gap-1">
                                        {[1, 2, 3, 4, 5].map((s) => (
                                            <div key={s} className={`h-1 flex-1 rounded-full transition-all ${s <= strength ? strengthColor : 'bg-primary-500/10'}`} />
                                        ))}
                                    </div>
                                    <span className="text-xs text-surface-800 font-bold">{strengthLabel}</span>
                                </div>
                            )}
                            {errors.password && <p className="text-xs text-red-500 font-bold mt-1">{errors.password}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-surface-800 mb-2">Confirm Password *</label>
                            <input
                                type="password"
                                value={form.confirmPassword}
                                onChange={(e) => update('confirmPassword', e.target.value)}
                                placeholder="Repeat password"
                                className={`w-full px-4 py-3 rounded-xl input-dark text-sm bg-white/60 focus:bg-white transition-all ${errors.confirmPassword ? 'border-red-500/50' : 'border-primary-500/10'}`}
                            />
                            {errors.confirmPassword && <p className="text-xs text-red-500 font-bold mt-1">{errors.confirmPassword}</p>}
                        </div>

                        {/* Benefits */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 py-2">
                            {benefits.map((b) => (
                                <div key={b} className="flex items-center gap-2 text-xs text-surface-800 font-medium">
                                    <CheckCircle className="w-3.5 h-3.5 text-primary-500 flex-shrink-0" />
                                    {b}
                                </div>
                            ))}
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full btn-primary py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 relative z-10 disabled:opacity-70"
                        >
                            <span className="relative z-10">{loading ? 'Creating Account...' : 'Create Account'}</span>
                            {!loading && <ArrowRight className="w-4 h-4 relative z-10" />}
                        </button>
                    </form>

                    <p className="text-xs text-surface-700 text-center mt-4 font-medium">
                        By signing up, you agree to our <Link to="/terms" className="text-primary-500 font-bold">Terms</Link> & <Link to="/privacy" className="text-primary-500 font-bold">Privacy Policy</Link>
                    </p>

                    <p className="text-center text-sm text-surface-800 mt-5 font-medium">
                        Already have an account?{' '}
                        <Link to="/login" className="text-primary-500 hover:text-primary-600 font-bold">Sign in</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
