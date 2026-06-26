import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { GoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Zap, ArrowRight, CheckCircle, Ticket, Loader2 } from 'lucide-react';
import { z } from 'zod';

const registerSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Valid email required'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
    phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number').optional().or(z.literal('')),
    referralCode: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

export default function RegisterPage() {
    const { register, googleLogin } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', phone: '', referralCode: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    // Auto-fill referral code from localStorage (captured from ?ref=CODE)
    useEffect(() => {
        const savedRef = localStorage.getItem('rq_referral_code');
        if (savedRef) {
            setForm(f => ({ ...f, referralCode: savedRef }));
        }
    }, []);

    const handleValidation = () => {
        try {
            setErrors({});
            registerSchema.parse(form);
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
            const { email } = await register({
                name: form.name,
                email: form.email,
                password: form.password,
                phone: form.phone,
                referralCode: form.referralCode
            });
            toast.success('Registration successful! Please verify your email. 🚀');
            // Clear stored referral code after use
            localStorage.removeItem('rq_referral_code');
            navigate('/verify-email', { state: { email } });
        } catch (err) {
            toast.error(err.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSuccess = async (credentialResponse) => {
        try {
            await googleLogin(credentialResponse.credential);
            toast.success('Welcome to RentoQuick! 🚀');
            navigate('/');
        } catch (err) {
            toast.error('Google registration failed');
        }
    };

    const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-20 bg-surface-50">
            <div className="absolute inset-0 -z-10 overflow-hidden">
                <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '1s' }} />
                <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-primary-300/10 rounded-full blur-3xl animate-pulse-glow" />
            </div>

            <div className="w-full max-w-xl">
                <Link to="/" className="flex items-center justify-center gap-2 mb-8 group">
                    <img
                        src="/favicon.png"
                        alt="RentoQuick Logo"
                        className="w-10 h-10 rounded-xl object-contain shadow-lg shadow-primary-500/20 group-hover:shadow-primary-500/40 transition-shadow"
                    />
                    <span className="font-display font-bold text-2xl gradient-text">RentoQuick</span>
                </Link>

                <div className="bg-white rounded-[2.5rem] p-8 border border-surface-100 shadow-2xl">
                    <h1 className="text-3xl font-black text-surface-900 mb-2">{t('common.register')}</h1>
                    <p className="text-surface-500 font-bold mb-8">Join the community of 120,000+ smart renters</p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-surface-400 uppercase tracking-widest">{t('auth.name')}</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => update('name', e.target.value)}
                                    placeholder="Arjun Sharma"
                                    required
                                    minLength="2"
                                    title="Name must be at least 2 characters"
                                    className={`w-full px-5 py-3 rounded-2xl bg-surface-50 border transition-all font-bold ${errors.name ? 'border-red-500 ring-4 ring-red-50' : 'border-surface-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-50'}`}
                                />
                                {errors.name && <p className="text-[10px] text-red-500 font-black uppercase tracking-tight px-1">{errors.name}</p>}
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-surface-400 uppercase tracking-widest">{t('auth.phone')}</label>
                                <input
                                    type="tel"
                                    value={form.phone}
                                    onChange={(e) => update('phone', e.target.value)}
                                    placeholder="9876543210"
                                    pattern="[6-9][0-9]{9}"
                                    title="Please enter a valid 10-digit Indian phone number starting with 6, 7, 8, or 9"
                                    className={`w-full px-5 py-3 rounded-2xl bg-surface-50 border transition-all font-bold ${errors.phone ? 'border-red-500 ring-4 ring-red-50' : 'border-surface-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-50'}`}
                                />
                                {errors.phone && <p className="text-[10px] text-red-500 font-black uppercase tracking-tight px-1">{errors.phone}</p>}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-surface-400 uppercase tracking-widest">{t('auth.email')}</label>
                            <input
                                type="email"
                                value={form.email}
                                onChange={(e) => update('email', e.target.value)}
                                placeholder="you@example.com"
                                required
                                title="Please enter a valid email address"
                                className={`w-full px-5 py-3 rounded-2xl bg-surface-50 border transition-all font-bold ${errors.email ? 'border-red-500 ring-4 ring-red-50' : 'border-surface-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-50'}`}
                            />
                            {errors.email && <p className="text-[10px] text-red-500 font-black uppercase tracking-tight px-1">{errors.email}</p>}
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-surface-400 uppercase tracking-widest">{t('auth.password')}</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={form.password}
                                        onChange={(e) => update('password', e.target.value)}
                                        required
                                        minLength="6"
                                        title="Password must be at least 6 characters"
                                        className={`w-full px-5 py-3 rounded-2xl bg-surface-50 border transition-all font-bold ${errors.password ? 'border-red-500 ring-4 ring-red-50' : 'border-surface-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-50'}`}
                                    />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-surface-300">
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                {errors.password && <p className="text-[10px] text-red-500 font-black uppercase tracking-tight px-1">{errors.password}</p>}
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-surface-400 uppercase tracking-widest">Confirm</label>
                                <input
                                    type="password"
                                    value={form.confirmPassword}
                                    onChange={(e) => update('confirmPassword', e.target.value)}
                                    required
                                    minLength="6"
                                    title="Please confirm your password"
                                    className={`w-full px-5 py-3 rounded-2xl bg-surface-50 border transition-all font-bold ${errors.confirmPassword ? 'border-red-500 ring-4 ring-red-50' : 'border-surface-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-50'}`}
                                />
                                {errors.confirmPassword && <p className="text-[10px] text-red-500 font-black uppercase tracking-tight px-1">{errors.confirmPassword}</p>}
                            </div>
                        </div>

                        {/* Referral Code (Collapsible or just small input) */}
                        <div className="p-4 bg-primary-50 border border-primary-100 rounded-3xl group transition-all focus-within:ring-4 focus-within:ring-primary-50">
                            <div className="flex items-center gap-3 mb-2">
                                <Ticket className="w-4 h-4 text-primary-500" />
                                <label className="text-[10px] font-black text-primary-600 uppercase tracking-widest">Referral Code (Optional)</label>
                            </div>
                            <input
                                value={form.referralCode}
                                onChange={(e) => update('referralCode', e.target.value.toUpperCase())}
                                placeholder="E.G. RENTO100"
                                className="w-full bg-transparent border-none p-0 text-sm font-black text-primary-700 placeholder:text-primary-300 focus:ring-0 outline-none"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary-600 text-white py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 hover:bg-primary-700 transition-all shadow-xl shadow-primary-500/20 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <span>{t('common.register')}</span>}
                            {!loading && <ArrowRight className="w-5 h-5" />}
                        </button>
                    </form>

                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-surface-100"></div></div>
                        <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest text-surface-400">
                            <span className="bg-white px-4">Or sign up with</span>
                        </div>
                    </div>

                    <div className="flex justify-center">
                        <GoogleLogin
                            onSuccess={handleGoogleSuccess}
                            onError={() => toast.error('Google Login Failed')}
                            shape="pill"
                            theme="outline"
                            text="signup_with"
                            width="100%"
                        />
                    </div>

                    <p className="text-center text-sm font-bold text-surface-500 mt-8">
                        Already have an account?{' '}
                        <Link to="/login" className="text-primary-600 hover:underline">{t('common.login')}</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
