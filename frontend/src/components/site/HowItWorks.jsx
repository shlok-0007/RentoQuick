import { howItWorks } from '../../data/content';

export default function HowItWorks() {
    return (
        <section id="how-it-works" className="py-16 md:py-24 px-4 scroll-mt-24 relative overflow-hidden">
            <div className="absolute inset-0 -z-10">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-500/5 rounded-full blur-3xl" />
            </div>

            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-14">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 mb-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                        <span className="text-xs font-bold text-primary-500 uppercase tracking-wider">Simple Process</span>
                    </div>
                    <h2 className="font-display text-3xl md:text-5xl font-extrabold tracking-tight mb-4 text-surface-950 text-balance">
                        How RentoQuick Works
                    </h2>
                    <p className="text-surface-800 text-base md:text-lg max-w-xl mx-auto">
                        Renting has never been this simple. Three steps and you're done.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 md:gap-6 relative">
                    <div className="hidden md:block absolute top-10 left-[16.66%] right-[16.66%] h-px bg-gradient-to-r from-primary-500/10 via-primary-500/30 to-primary-500/10" />

                    {howItWorks.map(({ step, title, desc, icon: Icon }, idx) => (
                        <div
                            key={step}
                            className="relative text-center group fade-in-up"
                            style={{ animationDelay: `${idx * 0.15}s` }}
                        >
                            <div className="relative inline-block mb-5">
                                <div className="absolute inset-0 bg-gradient-to-br from-primary-500 to-primary-300 rounded-2xl blur-lg opacity-20 group-hover:opacity-40 transition-opacity" />
                                <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500/10 to-primary-300/10 border border-primary-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                    <Icon className="w-9 h-9 text-primary-500" />
                                </div>
                                <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-primary-300 flex items-center justify-center text-white text-xs font-bold shadow-lg">
                                    {idx + 1}
                                </div>
                            </div>
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-8 text-7xl md:text-8xl font-black text-primary-500/5 select-none pointer-events-none font-display">
                                {step}
                            </div>
                            <h3 className="relative text-xl font-bold mb-2 text-surface-950">{title}</h3>
                            <p className="relative text-surface-800 text-sm leading-relaxed max-w-xs mx-auto">
                                {desc}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
