import React from 'react';
import { motion } from 'framer-motion';

const HowWeDoIt = () => {
    const steps = [
        {
            num: "01",
            title: "Connect",
            desc: "We guide you on connecting your WhatsApp account on one simple 1-on-1 call."
        },
        {
            num: "02",
            title: "Train",
            desc: "Upload a PDF of your menu or paste your website link."
        },
        {
            num: "03",
            title: "Launch",
            desc: "Swift Order AI starts selling and answering questions 24/7."
        }
    ];

    return (
        <section id="process" className="py-24 bg-white relative overflow-hidden">
            <div className="container mx-auto px-6 relative z-10">
                <div className="text-center mb-16 max-w-2xl mx-auto">
                    <h2 className="text-3xl md:text-5xl font-display font-bold text-gray-900 mb-6">
                        Get set up on a guided call.
                    </h2>
                    <p className="text-gray-500 font-light text-lg">
                        We made the setup process incredibly simple.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {steps.map((step, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-gray-50 rounded-[2.5rem] p-10 relative overflow-hidden hover:bg-white hover:shadow-2xl hover:shadow-gray-200/50 transition-all duration-500 group"
                        >
                            {/* Large Watermark Number */}
                            <div className="absolute top-0 right-0 text-9xl font-display font-bold text-gray-200 -translate-y-4 translate-x-4 group-hover:text-brand-100/50 transition-colors duration-500 pointer-events-none select-none">
                                {step.num}
                            </div>

                            <div className="relative z-10 pt-16">
                                <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-brand-600 transition-colors">
                                    {step.title}
                                </h3>
                                <p className="text-gray-500 font-light leading-relaxed">
                                    {step.desc}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default HowWeDoIt;
