import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { categories } from '../../data/content';

export default function Categories() {
    return (
        <section id="categories" className="py-16 md:py-24 px-4 scroll-mt-24">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-10 gap-4">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 mb-3">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                            <span className="text-xs font-bold text-primary-500 uppercase tracking-wider">Explore</span>
                        </div>
                        <h2 className="font-display text-3xl md:text-5xl font-extrabold tracking-tight mb-2 text-surface-950">
                            Browse by Category
                        </h2>
                        <p className="text-surface-800 text-base md:text-lg">
                            Find exactly what you're looking for
                        </p>
                    </div>
                    <Link
                        to="/listings"
                        className="self-start sm:self-auto inline-flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-semibold text-primary-500 hover:text-primary-600 hover:bg-primary-500/5 transition-colors"
                    >
                        View all
                        <ChevronRight className="w-4 h-4" />
                    </Link>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    {categories.map(({ name, icon: Icon, gradient, count }, idx) => (
                        <Link
                            key={name}
                            to={`/listings?category=${encodeURIComponent(name)}`}
                            className="group relative glass rounded-2xl p-5 text-center card-hover border-white/50 shadow-sm overflow-hidden fade-in-up"
                            style={{ animationDelay: `${idx * 0.05}s` }}
                        >
                            <div className={`absolute -inset-1 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 blur-2xl transition-opacity duration-500`} />
                            <div className={`relative w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center mx-auto mb-3 shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                                <Icon className="w-7 h-7 text-white" />
                            </div>
                            <p className="relative text-sm font-bold text-surface-900 leading-snug mb-1 group-hover:text-primary-500 transition-colors">
                                {name}
                            </p>
                            <p className="relative text-xs text-surface-800 font-medium">
                                {count.toLocaleString()} items
                            </p>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
