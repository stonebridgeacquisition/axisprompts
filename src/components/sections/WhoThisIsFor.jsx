import React from 'react';
import { motion } from 'framer-motion';

const WhoThisIsFor = () => {
    return (
        <section id="target" className="py-24 bg-white relative overflow-hidden">
            <div className="container mx-auto px-6 relative z-10">

                {/* Section Header */}
                <div className="text-center mb-16 max-w-2xl mx-auto">
                    <h2 className="text-3xl md:text-5xl font-display font-bold text-gray-900 mb-6">
                        Is this for you?
                    </h2>
                    <p className="text-gray-500 font-light text-lg">
                        We designed this for a specific kind of business.
                    </p>
                </div>

                <div className="max-w-5xl mx-auto">
                    <div className="grid md:grid-cols-2 gap-12 lg:gap-24 relative">

                        {/* Vertical Soft Divider (Desktop only) */}
                        <div className="hidden md:block absolute left-1/2 top-10 bottom-10 w-px bg-gradient-to-b from-transparent via-gray-100 to-transparent -translate-x-1/2"></div>

                        {/* "Yes" Column */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="relative pl-4 md:pl-0 text-left md:text-right"
                        >
                            <h3 className="text-2xl font-display font-medium text-gray-900 mb-8">
                                Perfect if you...
                            </h3>
                            <ul className="space-y-6">
                                {[
                                    "Sell food on WhatsApp or Instagram",
                                    "Are losing sales due to slow replies",
                                    "Want automated orders without hiring staff",
                                    "Value speed and customer experience"
                                ].map((item, i) => (
                                    <li key={i} className="flex flex-row-reverse md:flex-row items-baseline gap-4 justify-end">
                                        <span className="text-gray-700 font-light text-lg leading-relaxed">
                                            {item}
                                        </span>
                                        {/* Soft Dot */}
                                        <div className="w-2 h-2 rounded-full bg-brand-400 mt-2.5 shrink-0 shadow-[0_0_10px_rgba(251,146,60,0.4)]"></div>
                                    </li>
                                ))}
                            </ul>
                        </motion.div>

                        {/* "No" Column */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.1 }}
                            className="relative pr-4 md:pr-0 opacity-60 hover:opacity-100 transition-opacity duration-500"
                        >
                            <h3 className="text-2xl font-display font-medium text-gray-400 mb-8">
                                Not for you if...
                            </h3>
                            <ul className="space-y-6">
                                {[
                                    "You don't take any orders online",
                                    "You're looking for a free, generic chatbot",
                                    "You prefer managing messages manually",
                                    "You aren't ready to handle more orders"
                                ].map((item, i) => (
                                    <li key={i} className="flex items-baseline gap-4">
                                        {/* Soft Gray Dot */}
                                        <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-2.5 shrink-0"></div>
                                        <span className="text-gray-500 font-light text-lg leading-relaxed">
                                            {item}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </motion.div>

                    </div>
                </div>
            </div>
        </section>
    );
};

export default WhoThisIsFor;
