import { stats } from '../../data/content';

export default function StatsBar() {
    return (
        <section className="py-12 md:py-16 px-4">
            <div className="max-w-6xl mx-auto">
                <div className="glass rounded-3xl p-6 md:p-10 shadow-xl shadow-primary-500/5 border-white/60">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                        {stats.map(({ value, label, icon: Icon }, idx) => (
                            <div
                                key={label}
                                className="text-center group fade-in-up"
                                style={{ animationDelay: `${idx * 0.1}s` }}
                            >
                                <div className="inline-flex w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-primary-500/10 to-primary-300/10 border border-primary-500/15 items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-gradient-to-br group-hover:from-primary-500 group-hover:to-primary-300 transition-all duration-300">
                                    <Icon className="w-5 h-5 md:w-6 md:h-6 text-primary-500 group-hover:text-white transition-colors" />
                                </div>
                                <div className="font-display text-3xl md:text-4xl font-extrabold gradient-text mb-1">
                                    {value}
                                </div>
                                <div className="text-xs md:text-sm text-surface-800 font-medium">
                                    {label}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
