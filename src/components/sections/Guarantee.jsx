import React from 'react';
import { motion } from 'framer-motion';

const Guarantee = () => {
    return (
        <section id="guarantee" className="py-16 lg:py-32 bg-white relative overflow-hidden">
            <div className="container mx-auto px-6 relative z-10">
                <div className="max-w-4xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="relative rounded-[2.5rem] bg-gray-50 border border-gray-100 p-8 md:p-16 lg:p-20 overflow-hidden text-center shadow-2xl shadow-gray-200/50"
                    >
                        {/* Fluid Gradient Background - Emerald/Teal for Trust */}
                        <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
                            <div className="absolute top-[-50%] left-[-20%] w-[800px] h-[800px] bg-emerald-500/5 rounded-full blur-[100px] animate-pulse-slow"></div>
                            <div className="absolute bottom-[-50%] right-[-20%] w-[600px] h-[600px] bg-teal-500/5 rounded-full blur-[80px] animate-float"></div>
                        </div>

                        {/* Content */}
                        <div className="relative z-10 flex flex-col items-center">

                            {/* "Stamp" or Tagline */}
                            <div className="inline-block mb-6 md:mb-8">
                                <span className="bg-emerald-100/50 text-emerald-800 px-4 py-1.5 md:px-6 md:py-2 rounded-full text-xs md:text-sm font-bold uppercase tracking-widest border border-emerald-200/50">
                                    Risk-Free Promise
                                </span>
                            </div>

                            <h2 className="text-3xl md:text-5xl lg:text-7xl font-display font-bold text-gray-900 mb-6 md:mb-8 tracking-tight leading-[1.1]">
                                Our <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">Ironclad</span> Guarantee.
                            </h2>

                            <p className="text-lg md:text-2xl text-gray-600 font-light leading-relaxed max-w-2xl mx-auto mb-8 md:mb-10">
                                We are so confident in our AI that we take all the risk.
                            </p>

                            <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent max-w-lg mx-auto mb-8 md:mb-10"></div>

                            <p className="text-xl md:text-3xl lg:text-4xl font-serif italic text-gray-800 max-w-3xl mx-auto">
                                "If we don't deliver <span className="underline decoration-emerald-300 decoration-4 underline-offset-4">results</span> in 7 days, you don't pay a single cent."
                            </p>
                        </div>

                        {/* Decorative Corner Lines */}
                        <div className="absolute top-8 left-8 w-16 h-16 md:w-24 md:h-24 border-t-2 border-l-2 border-emerald-500/10 rounded-tl-3xl"></div>
                        <div className="absolute bottom-8 right-8 w-16 h-16 md:w-24 md:h-24 border-b-2 border-r-2 border-emerald-500/10 rounded-br-3xl"></div>

                    </motion.div>
                </div>
            </div>
        </section>
    );
};

export default Guarantee;
