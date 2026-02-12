import React from 'react';
import { motion } from 'framer-motion';

const CostOfMissedMessages = () => {
    return (
        <section id="problem" className="py-24 bg-white relative overflow-hidden">
            {/* Very Subtle Ambient Light */}
            <div className="absolute top-0 right-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-red-50/40 rounded-full blur-[120px]"></div>
            </div>

            <div className="container mx-auto px-6 relative z-10">
                <div className="max-w-4xl mx-auto">

                    {/* Header */}
                    <div className="text-center mb-16">
                        {/* Soft Pill Badge */}
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-50 mb-6">
                            <span className="text-xs font-bold text-red-500 uppercase tracking-widest">Reality Check</span>
                        </div>

                        <h2 className="text-4xl md:text-6xl font-display font-medium text-gray-900 mb-6 tracking-tight leading-[1.1]">
                            The hidden cost of <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-orange-500 to-red-500">silence.</span>
                        </h2>
                        <p className="text-xl text-gray-400 font-light max-w-2xl mx-auto leading-relaxed">
                            Manual replies aren't just slow, they are actively costing you revenue every single day.
                        </p>
                    </div>

                    {/* Stats Grid - Soft & Rounded */}
                    <div className="grid md:grid-cols-2 gap-8 mb-12">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="bg-gray-50 rounded-[2.5rem] p-10 md:p-12 hover:bg-white hover:shadow-2xl hover:shadow-gray-100 transition-all duration-500 group"
                        >
                            <div className="text-6xl md:text-8xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-br from-red-500 to-orange-400 md:text-gray-200 mb-6 md:group-hover:text-transparent md:group-hover:bg-clip-text md:group-hover:bg-gradient-to-br md:group-hover:from-red-500 md:group-hover:to-orange-400 transition-all duration-500">
                                80%
                            </div>
                            <h3 className="text-2xl font-medium text-gray-900 mb-3">Customer Churn</h3>
                            <p className="text-gray-400 leading-relaxed font-light text-lg">
                                Of customers leave immediately if a restaurant doesn't reply fast enough.
                            </p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.1 }}
                            className="bg-gray-50 rounded-[2.5rem] p-10 md:p-12 hover:bg-white hover:shadow-2xl hover:shadow-gray-100 transition-all duration-500 group"
                        >
                            <div className="text-6xl md:text-8xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-br from-orange-500 to-yellow-400 md:text-gray-200 mb-6 md:group-hover:text-transparent md:group-hover:bg-clip-text md:group-hover:bg-gradient-to-br md:group-hover:from-orange-500 md:group-hover:to-yellow-400 transition-all duration-500">
                                70%
                            </div>
                            <h3 className="text-2xl font-medium text-gray-900 mb-3">Lost Revenue</h3>
                            <p className="text-gray-400 leading-relaxed font-light text-lg">
                                Of restaurants admit missing messages directly causes lost sales daily.
                            </p>
                        </motion.div>
                    </div>

                    {/* The Financial Insight Card - Soft Rounded */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="bg-white rounded-[3rem] p-8 md:p-14 border border-gray-100 shadow-xl shadow-red-500/5 text-center relative overflow-hidden"
                    >
                        <h3 className="text-2xl md:text-3xl font-display font-medium text-gray-900 mb-4">
                            Speed wins orders, not just loyalty.
                        </h3>
                        <p className="text-lg text-gray-400 mb-8 max-w-2xl mx-auto font-light">
                            <span className="font-medium text-red-500">9 out of 10 customers</span> prefer instant replies over brand loyalty. If you make them wait, they simply order from someone else.
                        </p>

                        <div className="inline-flex items-center gap-2 px-4 py-2 md:px-6 md:py-3 rounded-full bg-red-50 text-red-600 font-medium text-xs md:text-sm tracking-wide whitespace-nowrap mx-auto">
                            <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-red-500 shrink-0"></span>
                            AxisPrompt replies to everyone instantly.
                        </div>
                    </motion.div>

                </div>
            </div>
        </section>
    );
};

export default CostOfMissedMessages;
