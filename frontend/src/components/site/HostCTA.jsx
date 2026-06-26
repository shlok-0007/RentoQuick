import { useNavigate } from 'react-router-dom';
import { ArrowRight, Wallet, TrendingUp, Shield, Zap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const hostBenefits = [
    { icon: Wallet, label: 'Free to list' },
    { icon: TrendingUp, label: 'Earn up to ₹80k/month' },
    { icon: Shield, label: 'Damage protection' },
    { icon: Zap, label: 'Fast payouts' },
];

export default function HostCTA() {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();

    const handleStartListing = () => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }
        navigate('/listings/new');
    };

    return (
        <section className="py-16 md:py-24 px-4">
            <div className="max-w-7xl mx-auto">
                <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-primary-500/15">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary-500 via-primary-500 to-primary-600" />
                    <div className="absolute inset-0 overflow-hidden">
                        <div className="absolute -top-20 -left-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
                        <div className="absolute -bottom-32 -right-20 w-96 h-96 bg-primary-300/20 rounded-full blur-3xl" />
                        <div className="absolute top-1/2 left-1/3 w-40 h-40 bg-amber-300/15 rounded-full blur-2xl animate-float" />
                    </div>
                    <div
                        className="absolute inset-0 opacity-10"
                        style={{
                            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
                            backgroundSize: '32px 32px',
                        }}
                    />

                    <div className="relative grid lg:grid-cols-2 gap-8 p-8 md:p-12 lg:p-16 items-center">
                        {/* Left: Content */}
                        <div className="text-white">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm mb-5">
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                <span className="text-xs font-bold uppercase tracking-wider">For Owners</span>
                            </div>
                            <h2 className="font-display text-3xl md:text-5xl font-extrabold mb-4 leading-tight text-balance">
                                Have something to rent out?
                            </h2>
                            <p className="text-white/90 text-base md:text-lg mb-7 max-w-lg leading-relaxed">
                                Turn your unused items into income. List for free and start earning today — from cameras to campervans, your gear could be making money right now.
                            </p>

                            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mb-8">
                                {hostBenefits.map(({ icon: Icon, label }) => (
                                    <div key={label} className="flex items-center gap-2 text-sm text-white/90 font-medium">
                                        <div className="w-7 h-7 rounded-lg bg-white/15 backdrop-blur-sm flex items-center justify-center">
                                            <Icon className="w-3.5 h-3.5" />
                                        </div>
                                        {label}
                                    </div>
                                ))}
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={handleStartListing}
                                    className="bg-white text-primary-500 hover:bg-white/90 shadow-xl h-12 px-7 rounded-xl text-base font-bold gap-2 flex items-center justify-center transition-all hover:-translate-y-0.5"
                                >
                                    Start Listing — It's Free
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => navigate('/listings')}
                                    className="text-white hover:bg-white/15 hover:text-white h-12 px-7 rounded-xl text-base font-bold border border-white/30 transition-colors"
                                >
                                    Learn More
                                </button>
                            </div>
                        </div>

                        {/* Right: Earnings card */}
                        <div className="relative hidden lg:block">
                            <div className="glass-soft rounded-3xl p-6 shadow-2xl rotate-2 hover:rotate-0 transition-transform duration-500">
                                <div className="flex items-center justify-between mb-5">
                                    <div>
                                        <p className="text-xs text-surface-800 font-semibold uppercase tracking-wider">
                                            This Month's Earnings
                                        </p>
                                        <p className="font-display text-4xl font-extrabold gradient-text mt-1">
                                            ₹84,250
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-700">
                                        <TrendingUp className="w-3.5 h-3.5" />
                                        <span className="text-xs font-bold">+24%</span>
                                    </div>
                                </div>

                                <div className="flex items-end gap-1.5 h-24 mb-5">
                                    {[40, 55, 45, 70, 60, 85, 75, 95, 80, 100, 90, 110].map((h, i) => (
                                        <div
                                            key={i}
                                            className="flex-1 rounded-t-md bg-gradient-to-t from-primary-500/40 to-primary-500"
                                            style={{ height: `${h}%` }}
                                        />
                                    ))}
                                </div>

                                <div className="space-y-2.5">
                                    {[
                                        { name: 'Canon EOS R5', amount: '₹24,500', days: '7 days' },
                                        { name: 'DJI Mavic 3', amount: '₹31,500', days: '7 days' },
                                        { name: 'GoPro Hero12', amount: '₹8,400', days: '7 days' },
                                        { name: '70-200mm Lens', amount: '₹19,850', days: '7 days' },
                                    ].map((item) => (
                                        <div
                                            key={item.name}
                                            className="flex items-center justify-between py-2 px-3 rounded-xl bg-white/40 hover:bg-white/60 transition-colors"
                                        >
                                            <div>
                                                <p className="text-xs font-bold text-surface-900">{item.name}</p>
                                                <p className="text-[10px] text-surface-800">{item.days} rented</p>
                                            </div>
                                            <span className="text-sm font-extrabold text-primary-500">{item.amount}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="absolute -top-4 -right-4 glass rounded-2xl p-3 shadow-xl -rotate-6 animate-float-slow">
                                <div className="flex items-center gap-2">
                                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center">
                                        <Wallet className="w-4 h-4 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-surface-800 font-semibold">Payout in</p>
                                        <p className="text-sm font-extrabold text-surface-900">24 hours</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
