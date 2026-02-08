import React from 'react';
import { motion } from 'framer-motion';

const WhatYouGet = () => {
    const features = [
        {
            title: "Instant Replies",
            desc: "Answers every WhatsApp or Instagram message immediately, even when you’re busy.",
            gradient: "from-blue-500/20 via-cyan-500/20 to-blue-500/5",
            hoverGradient: "group-hover:from-blue-500/30 group-hover:via-cyan-500/30",
            dotColor: "bg-blue-500"
        },
        {
            title: "Smart Order Management",
            desc: "Knows your full menu, tracks availability, takes orders accurately, and reduces mistakes.",
            gradient: "from-brand-500/20 via-orange-500/20 to-brand-500/5",
            hoverGradient: "group-hover:from-brand-500/30 group-hover:via-orange-500/30",
            dotColor: "bg-brand-500"
        },
        {
            title: "Auto Upsells",
            desc: "Suggests add-ons like drinks or sides, and follows up with customers who haven’t completed their order.",
            gradient: "from-purple-500/20 via-pink-500/20 to-purple-500/5",
            hoverGradient: "group-hover:from-purple-500/30 group-hover:via-pink-500/30",
            dotColor: "bg-purple-500"
        },
        {
            title: "Payment & Delivery",
            desc: "Sends invoices, confirms payments, and updates delivery status for every order automatically.",
            gradient: "from-green-500/20 via-emerald-500/20 to-green-500/5",
            hoverGradient: "group-hover:from-green-500/30 group-hover:via-emerald-500/30",
            dotColor: "bg-green-500"
        },
        {
            title: "Handles High Volume",
            desc: "Can manage thousands of messages from different customers at the same time, without errors.",
            gradient: "from-indigo-500/20 via-violet-500/20 to-indigo-500/5",
            hoverGradient: "group-hover:from-indigo-500/30 group-hover:via-violet-500/30",
            dotColor: "bg-indigo-500"
        },
        {
            title: "Saves You Money",
            desc: "Costs less than hiring extra staff while handling everything reliably 24/7.",
            gradient: "from-teal-500/20 via-cyan-500/20 to-teal-500/5",
            hoverGradient: "group-hover:from-teal-500/30 group-hover:via-cyan-500/30",
            dotColor: "bg-teal-500"
        }
    ];

    return (
        <section id="features" className="py-16 lg:py-32 bg-white relative overflow-hidden">
            <div className="container mx-auto px-6 relative z-10">
                <div className="max-w-3xl mb-10 lg:mb-20">
                    <h2 className="text-3xl md:text-5xl lg:text-6xl font-display font-bold text-gray-900 mb-4 lg:mb-6 tracking-tight leading-[1.1]">
                        Everything you need to handle customer orders.
                    </h2>
                    <p className="text-lg md:text-xl text-gray-500 font-light max-w-xl leading-relaxed">
                        Increase sales, and save time, without hiring more people.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                    {features.map((feature, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1, duration: 0.5 }}
                            className="group relative p-6 lg:p-8 h-full min-h-[260px] lg:min-h-[320px] rounded-3xl bg-gray-50 border border-gray-100 overflow-hidden hover:bg-white hover:shadow-2xl hover:shadow-gray-200/50 hover:border-transparent transition-all duration-500 cursor-default flex flex-col justify-between"
                        >
                            {/* Fluid Gradient Blob - Always Active */}
                            <motion.div
                                animate={{
                                    scale: [1, 1.2, 1],
                                    opacity: [0.3, 0.6, 0.3]
                                }}
                                transition={{
                                    duration: 5,
                                    repeat: Infinity,
                                    ease: "easeInOut",
                                    delay: index * 0.5
                                }}
                                className={`
                                    absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br ${feature.gradient} 
                                    rounded-full blur-[60px]
                                `}
                            />

                            {/* Subtle Idle Blob - Opposite Animation */}
                            <motion.div
                                animate={{
                                    scale: [1, 1.3, 1],
                                    opacity: [0.2, 0.4, 0.2]
                                }}
                                transition={{
                                    duration: 7,
                                    repeat: Infinity,
                                    ease: "easeInOut",
                                    delay: index * 0.5 + 2
                                }}
                                className={`
                                    absolute top-10 right-10 w-32 h-32 bg-gradient-to-br ${feature.gradient} 
                                    rounded-full blur-[40px]
                                `}
                            />

                            {/* Content */}
                            <div className="relative z-10">
                                {/* Small Dot Indicator */}
                                <div className={`w-2 h-2 rounded-full ${feature.dotColor} mb-6`}></div>

                                <h3 className="text-2xl font-display font-bold text-gray-900 mb-3 group-hover:translate-x-1 transition-transform duration-300">
                                    {feature.title}
                                </h3>
                                <p className="text-gray-500 leading-relaxed font-light group-hover:text-gray-600 transition-colors">
                                    {feature.desc}
                                </p>
                            </div>

                            {/* Bottom aesthetic line */}
                            <div className="relative z-10 w-full h-px bg-gray-200 mt-8 group-hover:bg-gray-100 transition-colors opacity-30">
                                <div className={`absolute left-0 top-0 h-full w-0 group-hover:w-full ${feature.dotColor} transition-all duration-1000 ease-out opacity-30`}></div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default WhatYouGet;
