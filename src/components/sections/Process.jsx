import React from 'react';
import { motion } from 'framer-motion';

const Process = () => {
    const steps = [
        {
            num: "01",
            title: "Connect",
            desc: "Link your WhatsApp or Instagram account in one click."
        },
        {
            num: "02",
            title: "Train",
            desc: "Upload PDFs, website links, or text to train your AI."
        },
        {
            num: "03",
            title: "Launch",
            desc: "Your AI starts selling 24/7 automatically."
        }
    ];

    return (
        <section id="process" className="py-24 bg-white relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>

            <div className="container mx-auto px-6 relative z-10">
                <div className="flex flex-col md:flex-row gap-16 items-center">
                    <div className="md:w-1/3">
                        <h2 className="text-4xl md:text-5xl font-display font-bold text-dark-900 leading-tight mb-6">
                            Setup is <br />
                            <span className="text-brand-500">stupid simple.</span>
                        </h2>
                        <p className="text-lg text-dark-600 mb-8">
                            No coding required. If you can send an email, you can set up Axisprompt. We built this for busy business owners, not tech wizards.
                        </p>
                        <a href="#cta" className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-surface-100 text-dark-900 font-semibold hover:bg-surface-200 transition-colors">
                            View Documentation
                        </a>
                    </div>

                    <div className="md:w-2/3 flex flex-col gap-8">
                        {steps.map((step, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: 20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.2 }}
                                className="flex items-start gap-6 group"
                            >
                                <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-surface-50 border border-gray-100 flex items-center justify-center text-2xl font-bold text-brand-500 shadow-sm group-hover:scale-110 transition-transform duration-300">
                                    {step.num}
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-dark-900 mb-2">{step.title}</h3>
                                    <p className="text-dark-600 text-lg leading-relaxed">{step.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Process;
