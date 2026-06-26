import { features } from '../../data/content';

export default function WhyChooseUs() {
    return (
        <section className="py-16 md:py-24 px-4">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-14">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 mb-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                        <span className="text-xs font-bold text-primary-500 uppercase tracking-wider">Why RentoQuick</span>
                    </div>
                    <h2 className="font-display text-3xl md:text-5xl font-extrabold tracking-tight mb-4 text-surface-950 text-balance">
                        Built for Trust &amp; Convenience
                    </h2>
                    <p className="text-surface-800 text-base md:text-lg max-w-xl mx-auto">
                        We've reimagined peer-to-peer rentals with safety, savings, and speed at the core.
                    </p>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {features.map(({ icon: Icon, title, desc, color }, idx) => (
                        <div
                            key={title}
                            className="group glass rounded-2xl p-6 card-hover border-white/50 shadow-sm fade-in-up relative overflow-hidden"
                            style={{ animationDelay: `${idx * 0.08}s` }}
                        >
                            <div className={`absolute -right-8 -top-8 w-28 h-28 bg-gradient-to-br ${color} opacity-5 rounded-full blur-2xl group-hover:opacity-15 transition-opacity`} />
                            <div className={`relative w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
                                <Icon className="w-6 h-6 text-white" />
                            </div>
                            <h3 className="relative text-lg font-bold mb-2 text-surface-950">{title}</h3>
                            <p className="relative text-sm text-surface-800 leading-relaxed">{desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
