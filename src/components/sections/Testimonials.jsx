import React from 'react';
import { motion } from 'framer-motion';

const testimonials = [
    {
        name: "Sarah Jenkins",
        role: "Owner, Bloom Boutique",
        text: "Reviewing DMs used to take 3 hours a day. Now Axisprompt does it while I sleep. My sales are up 40%."
    },
    {
        name: "Marcus Chen",
        role: "Founder, TechGear",
        text: "The AI tone is indistinguishable from my own staff. It handles complex queries perfectly."
    },
    {
        name: "Elena Rodriguez",
        role: "Manager, Bella Italia",
        text: "We missed so many reservations before. Now every message gets an instant replay and booking link."
    },
    {
        name: "David Kim",
        role: "CEO, StartUp Inc",
        text: "Essential tool for any serious business on Instagram. The ROI was positive in the first week."
    }
];

const Testimonials = () => {
    return (
        <section className="py-24 bg-surface-50 overflow-hidden">
            <div className="container mx-auto px-6 mb-16 text-center">
                <h2 className="text-4xl font-display font-bold text-dark-900 mb-4">
                    Don't just take our word for it.
                </h2>
                <p className="text-lg text-dark-600">
                    Join 500+ businesses automating their growth.
                </p>
            </div>

            {/* Marquee Container */}
            <div className="relative flex overflow-x-hidden group">
                <motion.div
                    className="flex py-12 animate-marquee whitespace-nowrap"
                    animate={{ x: [0, -1000] }}
                    transition={{
                        repeat: Infinity,
                        duration: 30,
                        ease: "linear"
                    }}
                >
                    {[...testimonials, ...testimonials].map((t, i) => (
                        <div
                            key={i}
                            className="inline-block px-4 transition-transform duration-300 hover:scale-105"
                        >
                            <div className="w-[400px] p-8 rounded-[2rem] bg-white shadow-card border border-gray-100 flex flex-col gap-6 whitespace-normal">
                                {/* Stars */}
                                <div className="flex gap-1">
                                    {[...Array(5)].map((_, i) => (
                                        <svg key={i} className="w-5 h-5 text-brand-500 fill-current" viewBox="0 0 20 20">
                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                        </svg>
                                    ))}
                                </div>

                                <p className="text-lg text-dark-800 leading-relaxed font-medium">
                                    "{t.text}"
                                </p>

                                <div className="flex items-center gap-4 mt-auto">
                                    <div className="w-10 h-10 rounded-full bg-surface-100 flex items-center justify-center font-bold text-dark-500">
                                        {t.name[0]}
                                    </div>
                                    <div>
                                        <div className="font-bold text-dark-900">{t.name}</div>
                                        <div className="text-sm text-dark-500">{t.role}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </motion.div>

                {/* Fade Edges */}
                <div className="absolute top-0 left-0 w-32 h-full bg-gradient-to-r from-surface-50 to-transparent pointer-events-none z-10"></div>
                <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-surface-50 to-transparent pointer-events-none z-10"></div>
            </div>
        </section>
    );
};

export default Testimonials;
