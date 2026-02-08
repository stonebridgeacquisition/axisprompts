import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

const CTA = () => {
    return (
        <section className="py-24 md:py-32 bg-white relative overflow-hidden flex items-center justify-center">

            <div className="container mx-auto px-6 relative z-10">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8 }}
                    className="max-w-5xl mx-auto bg-gray-50 rounded-[3rem] p-8 md:p-24 text-center relative overflow-hidden"
                >
                    {/* Soft Glow Background */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-[800px] bg-gradient-to-b from-white to-transparent opacity-60"></div>

                    {/* Decorative Orbs */}
                    <div className="absolute top-[-20%] right-[-10%] w-[400px] h-[400px] bg-brand-200/20 rounded-full blur-[80px]"></div>
                    <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] bg-blue-200/20 rounded-full blur-[80px]"></div>

                    <div className="relative z-10">
                        <h2 className="text-4xl md:text-6xl lg:text-7xl font-display font-medium text-gray-900 mb-8 tracking-tight leading-[1.1]">
                            Ready to automate your <br className="hidden md:block" />
                            <span className="text-gray-400 italic font-serif">orders?</span>
                        </h2>

                        <p className="text-lg md:text-xl text-gray-500 mb-12 max-w-2xl mx-auto font-light leading-relaxed">
                            Join hundreds of smart food businesses reclaiming their time today.
                        </p>

                        <motion.a
                            href="#"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="inline-block relative px-6 py-3 md:px-10 md:py-5 rounded-full bg-gray-900 text-white font-medium text-sm md:text-lg shadow-2xl shadow-gray-900/20 hover:shadow-gray-900/40 transition-shadow overflow-hidden group whitespace-nowrap"
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                Start 7-Day Free Trial
                            </span>
                            {/* Soft Shine */}
                            <div className="absolute inset-0 bg-white/10 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-500"></div>
                        </motion.a>

                        <p className="mt-8 text-xs md:text-sm text-gray-400 font-medium tracking-wide uppercase opacity-70">
                            No credit card required
                        </p>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

export default CTA;
