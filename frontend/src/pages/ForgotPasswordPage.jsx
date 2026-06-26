import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../api';
import toast from 'react-hot-toast';
import { KeyRound, ArrowLeft, Send, Loader2 } from 'lucide-react';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await authAPI.forgotPassword(email);
            setSent(true);
            toast.success('Reset link sent to your email');
        } catch (err) {
            toast.error('Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-surface-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-surface-100">
                <Link to="/login" className="inline-flex items-center gap-2 text-surface-500 hover:text-primary-600 mb-6 transition-colors font-medium">
                    <ArrowLeft className="w-4 h-4" /> Back to Login
                </Link>

                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-primary-50 text-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary-100">
                        <KeyRound className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-bold text-surface-900 mb-2">Forgot Password?</h1>
                    {!sent ? (
                        <p className="text-surface-500">Enter your email and we'll send you a link to reset your password.</p>
                    ) : (
                        <p className="text-green-600 font-medium">Check your email for the reset link.</p>
                    )}
                </div>

                {!sent ? (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-semibold text-surface-700 mb-2">Email Address</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@example.com"
                                className="w-full h-12 px-4 bg-surface-50 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all outline-none"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-12 bg-primary-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-primary-700 disabled:opacity-70 transition-all shadow-lg shadow-primary-500/20"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                <>
                                    Send Reset Link <Send className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>
                ) : (
                    <div className="text-center">
                        <button
                            onClick={() => setSent(false)}
                            className="text-primary-600 font-semibold hover:underline"
                        >
                            Try another email
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
