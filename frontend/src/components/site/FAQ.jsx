import { useState } from 'react';
import { HelpCircle, MessageCircle, ChevronDown } from 'lucide-react';
import { faqs } from '../../data/content';

export default function FAQ() {
    const [openIdx, setOpenIdx] = useState(0);

    return (
        <section className="py-16 md:py-24 px-4">
            <div className="max-w-3xl mx-auto">
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 mb-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                        <span className="text-xs font-bold text-primary-500 uppercase tracking-wider">Got Questions?</span>
                    </div>
                    <h2 className="font-display text-3xl md:text-5xl font-extrabold tracking-tight mb-4 text-surface-950 text-balance">
                        Frequently Asked Questions
                    </h2>
                    <p className="text-surface-800 text-base md:text-lg">
                        Everything you need to know about renting on RentoQuick
                    </p>
                </div>

                <div className="glass rounded-3xl border-white/50 shadow-sm overflow-hidden">
                    {faqs.map((faq, idx) => {
                        const isOpen = openIdx === idx;
                        return (
                            <div
                                key={idx}
                                className={`px-5 ${idx === faqs.length - 1 ? '' : 'border-b border-primary-500/10'}`}
                            >
                                <button
                                    onClick={() => setOpenIdx(isOpen ? -1 : idx)}
                                    className="w-full flex items-center justify-between gap-3 text-left py-5 group"
                                >
                                    <span className="flex items-center gap-3">
                                        <HelpCircle className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${isOpen ? 'text-primary-500' : 'text-primary-500/70'}`} />
                                        <span className="text-base font-bold text-surface-950 group-hover:text-primary-500 transition-colors">
                                            {faq.question}
                                        </span>
                                    </span>
                                    <ChevronDown className={`w-5 h-5 text-surface-800 shrink-0 transition-transform ${isOpen ? 'rotate-180 text-primary-500' : ''}`} />
                                </button>
                                <div
                                    className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100 pb-5' : 'grid-rows-[0fr] opacity-0'}`}
                                >
                                    <div className="overflow-hidden">
                                        <p className="text-sm text-surface-800 leading-relaxed pl-8">
                                            {faq.answer}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="text-center mt-10">
                    <p className="text-surface-800 text-sm mb-4">
                        Still have questions? We're here to help.
                    </p>
                    <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-primary-500/20 text-primary-500 hover:text-primary-600 hover:bg-primary-500/5 hover:border-primary-500/30 transition-colors font-semibold">
                        <MessageCircle className="w-4 h-4" />
                        Chat with Support
                    </button>
                </div>
            </div>
        </section>
    );
}
