import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api';
import toast from 'react-hot-toast';
import { ShieldCheck, Mail, Loader2, ArrowRight, RefreshCw } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function VerifyEmailPage() {
    const { verifyEmail, updateUser } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();
    const location = useLocation();
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [timer, setTimer] = useState(60);
    const inputRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];
    const email = location.state?.email;

    useEffect(() => {
        if (!email) {
            navigate('/login');
        }
    }, [email, navigate]);

    useEffect(() => {
        let interval;
        if (timer > 0) {
            interval = setInterval(() => setTimer(prev => prev - 1), 1000);
        }
        return () => clearInterval(interval);
    }, [timer]);

    const handleChange = (index, value) => {
        if (isNaN(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value.substring(value.length - 1);
        setOtp(newOtp);

        // Move to next input
        if (value && index < 5) {
            inputRefs[index + 1].current.focus();
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs[index - 1].current.focus();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const fullOtp = otp.join('');
        if (fullOtp.length !== 6) {
            toast.error('Please enter the 6-digit code');
            return;
        }

        try {
            setLoading(true);
            await verifyEmail(email, fullOtp);
            toast.success('Email verified successfully! 🎉');
            navigate('/');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Verification failed');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (timer > 0) return;
        try {
            setResending(true);
            await authAPI.resendOTP(email);
            toast.success('New code sent to your email');
            setTimer(60);
        } catch (err) {
            toast.error('Failed to resend code');
        } finally {
            setResending(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-20 bg-surface-50">
            <div className="absolute inset-0 -z-10 overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl animate-pulse-glow" />
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary-300/10 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '2s' }} />
            </div>

            <div className="w-full max-w-md text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white shadow-xl shadow-primary-500/10 border border-surface-100 mb-8">
                    <ShieldCheck className="w-10 h-10 text-primary-500" />
                </div>

                <h1 className="text-3xl font-black text-surface-900 mb-2">Verify your email</h1>
                <p className="text-surface-500 font-bold mb-8">
                    We've sent a 6-digit code to <br />
                    <span className="text-surface-900">{email}</span>
                </p>

                <div className="bg-white rounded-[2.5rem] p-8 border border-surface-100 shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="flex justify-between gap-2">
                            {otp.map((digit, i) => (
                                <input
                                    key={i}
                                    ref={inputRefs[i]}
                                    type="text"
                                    inputMode="numeric"
                                    value={digit}
                                    onChange={(e) => handleChange(i, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(i, e)}
                                    className="w-12 h-14 text-center text-xl font-bold rounded-2xl bg-surface-50 border border-surface-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-50 transition-all outline-none"
                                />
                            ))}
                        </div>

                        <button
                            type="submit"
                            disabled={loading || otp.join('').length !== 6}
                            className="w-full bg-primary-600 text-white py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 hover:bg-primary-700 transition-all shadow-xl shadow-primary-500/20 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <span>Verify Account</span>}
                            {!loading && <ArrowRight className="w-5 h-5" />}
                        </button>
                    </form>

                    <div className="mt-8 flex flex-col items-center gap-4">
                        <button
                            onClick={handleResend}
                            disabled={timer > 0 || resending}
                            className="flex items-center gap-2 text-sm font-black text-surface-700 hover:text-primary-600 transition-colors disabled:opacity-50"
                        >
                            {resending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                            Resend Code {timer > 0 && `(${timer}s)`}
                        </button>

                        <Link to="/login" className="text-sm font-bold text-surface-500 hover:underline">
                            Back to Login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
