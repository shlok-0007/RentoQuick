import { Star, Quote, MapPin } from 'lucide-react';
import { testimonials } from '../../data/content';

export default function Testimonials() {
    return (
        <section id="reviews" className="py-16 md:py-24 px-4 scroll-mt-24 relative overflow-hidden">
            <div className="absolute inset-0 -z-10">
                <div className="absolute top-0 left-0 w-72 h-72 bg-primary-500/5 rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-0 w-80 h-80 bg-primary-300/10 rounded-full blur-3xl" />
            </div>

            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-14">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 mb-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                        <span className="text-xs font-bold text-primary-500 uppercase tracking-wider">Loved by Renters</span>
                    </div>
                    <h2 className="font-display text-3xl md:text-5xl font-extrabold tracking-tight mb-4 text-surface-950 text-balance">
                        What Our Community Says
                    </h2>
                    <div className="flex items-center justify-center gap-2 text-surface-800">
                        <div className="flex">
                            {[1, 2, 3, 4, 5].map((s) => (
                                <Star key={s} className="w-5 h-5 text-amber-400 fill-amber-400" />
                            ))}
                        </div>
                        <span className="text-sm font-semibold">4.8/5 from 12,000+ reviews</span>
                    </div>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {testimonials.map((t, idx) => (
                        <div
                            key={t.id}
                            className="group glass rounded-2xl p-6 card-hover border-white/50 shadow-sm relative overflow-hidden fade-in-up flex flex-col"
                            style={{ animationDelay: `${idx * 0.1}s` }}
                        >
                            <Quote className="absolute top-4 right-4 w-10 h-10 text-primary-500/10 group-hover:text-primary-500/20 transition-colors" />

                            <div className="flex items-center gap-1 mb-4">
                                {[1, 2, 3, 4, 5].map((s) => (
                                    <Star
                                        key={s}
                                        className={`w-4 h-4 ${s <= t.rating ? 'text-amber-400 fill-amber-400' : 'text-surface-300'}`}
                                    />
                                ))}
                            </div>

                            <p className="relative text-sm text-surface-800 leading-relaxed mb-5 flex-1">
                                "{t.text}"
                            </p>

                            <div className="flex items-center gap-3 pt-4 border-t border-primary-500/10">
                                <div className="relative">
                                    <img
                                        src={t.avatar}
                                        alt={t.name}
                                        loading="lazy"
                                        className="w-11 h-11 rounded-full object-cover ring-2 ring-white shadow-sm"
                                    />
                                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-gradient-to-br from-primary-500 to-primary-300 flex items-center justify-center ring-2 ring-accent-50">
                                        <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-surface-950 truncate">{t.name}</p>
                                    <p className="text-xs text-surface-800 truncate">{t.role}</p>
                                </div>
                                <div className="flex items-center gap-1 text-[10px] text-surface-800 font-medium">
                                    <MapPin className="w-3 h-3 text-primary-500" />
                                    {t.location}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Trust logos marquee */}
                <div className="mt-16">
                    <p className="text-center text-xs text-surface-800 font-bold uppercase tracking-wider mb-6">
                        Trusted &amp; Featured In
                    </p>
                    <div className="relative overflow-hidden">
                        <div className="flex gap-12 animate-marquee whitespace-nowrap">
                            {[...Array(2)].map((_, i) => (
                                <div key={i} className="flex gap-12 items-center shrink-0">
                                    {['YourStory', 'TechCrunch', 'Inc42', 'Economic Times', 'Mint', 'Bloomberg', 'Forbes India'].map((name) => (
                                        <span
                                            key={name}
                                            className="font-display text-xl font-bold text-surface-800/30 hover:text-primary-500/60 transition-colors cursor-default"
                                        >
                                            {name}
                                        </span>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
