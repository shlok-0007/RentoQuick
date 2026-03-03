import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Zap, ArrowRight } from 'lucide-react';

export default function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const validate = () => {
        const errs = {};
        if (!form.email) errs.email = 'Email is required';
        else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Invalid email';
        if (!form.password) errs.password = 'Password is required';
        return errs;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) { setErrors(errs); return; }

        try {
            setLoading(true);
            await login(form.email, form.password);
            toast.success('Welcome back! 👋');
            navigate('/');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const fillDemo = () => {
        setForm({ email: 'arjun@example.com', password: 'password123' });
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-20">
            {/* Background blobs */}
            <div className="absolute inset-0 -z-10 overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl animate-pulse-glow" />
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary-300/10 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '2s' }} />
            </div>

            <div className="w-full max-w-md">
                {/* Logo */}
                <Link to="/" className="flex items-center justify-center gap-2 mb-8 group">
                    <img
                        src="/favicon.png"
                        alt="RentoQuick Logo"
                        className="w-10 h-10 rounded-xl object-contain shadow-lg shadow-primary-500/20 group-hover:shadow-primary-500/40 transition-shadow"
                    />
                    <span className="font-display font-bold text-2xl gradient-text">RentoQuick</span>
                </Link>

                <div className="glass rounded-3xl p-8 border-white/50 shadow-xl">
                    <h1 className="font-display text-2xl font-bold text-surface-950 mb-1">Welcome back</h1>
                    <p className="text-surface-800 text-sm mb-8 font-medium">Sign in to your account to continue</p>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-bold text-surface-800 mb-2">Email Address</label>
                            <input
                                type="email"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                placeholder="you@example.com"
                                className={`w-full px-4 py-3 rounded-xl input-dark text-sm bg-white/60 focus:bg-white transition-all ${errors.email ? 'border-red-500/50' : 'border-primary-500/10'}`}
                            />
                            {errors.email && <p className="text-xs text-red-500 font-bold mt-1">{errors.email}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-surface-800 mb-2">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    placeholder="••••••••"
                                    className={`w-full px-4 py-3 pr-12 rounded-xl input-dark text-sm bg-white/60 focus:bg-white transition-all ${errors.password ? 'border-red-500/50' : 'border-primary-500/10'}`}
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-700 hover:text-primary-500 transition-colors">
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {errors.password && <p className="text-xs text-red-500 font-bold mt-1">{errors.password}</p>}
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full btn-primary py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 relative z-10 disabled:opacity-70"
                        >
                            <span className="relative z-10">{loading ? 'Signing in...' : 'Sign In'}</span>
                            {!loading && <ArrowRight className="w-4 h-4 relative z-10" />}
                        </button>
                    </form>

                    <div className="mt-6 pt-6 border-t border-primary-500/10">
                        <button onClick={fillDemo} className="w-full py-3 rounded-xl btn-ghost text-sm text-surface-800 font-bold border-white/50">
                            🎭 Use Demo Account
                        </button>
                    </div>

                    <p className="text-center text-sm text-surface-800 mt-6 font-medium">
                        Don't have an account?{' '}
                        <Link to="/register" className="text-primary-500 hover:text-primary-600 font-bold">Sign up free</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
