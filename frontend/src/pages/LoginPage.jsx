import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { GoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Zap, ArrowRight, Loader2 } from 'lucide-react';
import { z } from 'zod';

const loginSchema = z.object({
    email: z.string().email('Valid email required'),
    password: z.string().min(1, 'Password is required'),
});

export default function LoginPage() {
    const { login, googleLogin } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const handleValidation = () => {
        try {
            setErrors({});
            loginSchema.parse(form);
            return true;
        } catch (err) {
            if (err instanceof z.ZodError) {
                const errs = {};
                err.errors.forEach((e) => {
                    errs[e.path[0]] = e.message;
                });
                setErrors(errs);
                // Show flash-like toast message for validation errors
                const firstError = err.errors[0];
                toast.error(`${firstError.path[0].charAt(0).toUpperCase() + firstError.path[0].slice(1)}: ${firstError.message}`);
            }
            return false;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!handleValidation()) return;

        try {
            setLoading(true);
            const { requiresVerification } = await login(form.email, form.password);
            if (requiresVerification) {
                toast.success('Please verify your email to continue');
                navigate('/verify-email');
            } else {
                toast.success('Welcome back! 👋');
                navigate('/');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSuccess = async (credentialResponse) => {
        try {
            await googleLogin(credentialResponse.credential);
            toast.success('Welcome back! 👋');
            navigate('/');
        } catch (err) {
            toast.error('Google login failed');
        }
    };

    const fillDemo = () => {
        if (!import.meta.env.DEV) return;
        setForm({ email: 'arjun@example.com', password: 'password123' });
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-20 bg-surface-50">
            <div className="absolute inset-0 -z-10 overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl animate-pulse-glow" />
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary-300/10 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '2s' }} />
            </div>

            <div className="w-full max-w-md">
                <Link to="/" className="flex items-center justify-center gap-2 mb-8 group">
                    <img
                        src="/favicon.png"
                        alt="RentoQuick Logo"
                        className="w-10 h-10 rounded-xl object-contain shadow-lg shadow-primary-500/20 group-hover:shadow-primary-500/40 transition-shadow"
                    />
                    <span className="font-display font-bold text-2xl gradient-text">RentoQuick</span>
                </Link>

                <div className="bg-white rounded-[2.5rem] p-8 border border-surface-100 shadow-2xl">
                    <h1 className="text-3xl font-black text-surface-900 mb-2">{t('common.login')}</h1>
                    <p className="text-surface-500 font-bold mb-8">{t('auth.welcome_back') || 'Sign in to your account to continue'}</p>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-surface-400 uppercase tracking-widest">{t('auth.email')}</label>
                            <input
                                type="email"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                placeholder="you@example.com"
                                required
                                title="Please enter a valid email address"
                                className={`w-full px-5 py-4 rounded-2xl bg-surface-50 border transition-all font-bold ${errors.email ? 'border-red-500 ring-4 ring-red-50' : 'border-surface-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-50'}`}
                            />
                            {errors.email && <p className="text-[10px] text-red-500 font-black uppercase tracking-tight">{errors.email}</p>}
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-[10px] font-black text-surface-400 uppercase tracking-widest">{t('auth.password')}</label>
                                <Link to="/forgot-password" size="sm" className="text-[10px] font-black text-primary-600 uppercase hover:underline">
                                    {t('auth.forgot_password') || 'Forgot?'}
                                </Link>
                            </div>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    placeholder="••••••••"
                                    required
                                    title="Password is required"
                                    className={`w-full px-5 py-4 pr-14 rounded-2xl bg-surface-50 border transition-all font-bold ${errors.password ? 'border-red-500 ring-4 ring-red-50' : 'border-surface-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-50'}`}
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-surface-300 hover:text-primary-500 transition-colors">
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                            {errors.password && <p className="text-[10px] text-red-500 font-black uppercase tracking-tight">{errors.password}</p>}
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary-600 text-white py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 hover:bg-primary-700 transition-all shadow-xl shadow-primary-500/20 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <span>{t('common.login')}</span>}
                            {!loading && <ArrowRight className="w-5 h-5" />}
                        </button>
                    </form>

                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-surface-100"></div></div>
                        <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest text-surface-400">
                            <span className="bg-white px-4">Or continue with</span>
                        </div>
                    </div>

                    <div className="flex justify-center">
                        <GoogleLogin
                            onSuccess={handleGoogleSuccess}
                            onError={() => toast.error('Google Login Failed')}
                            useOneTap
                            width="100%"
                            theme="outline"
                            shape="pill"
                        />
                    </div>

                    <div className="mt-8 flex flex-col gap-4">
                        {import.meta.env.DEV && (
                            <button onClick={fillDemo} className="w-full py-4 rounded-2xl bg-surface-50 border border-surface-200 text-sm font-black text-surface-700 hover:bg-surface-100 transition-all">
                                🎭 {t('auth.use_demo') || 'Use Demo Account'}
                            </button>
                        )}

                        <p className="text-center text-sm font-bold text-surface-500">
                            {t('auth.no_account') || "Don't have an account?"}{' '}
                            <Link to="/register" className="text-primary-600 hover:underline">{t('common.register')}</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
