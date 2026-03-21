import React from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Sparkles, Globe2, ShieldCheck, ArrowRight } from 'lucide-react';

const Features = () => {
    const features = [
        {
            title: "Instant Reply",
            description: "Respond to every DM in < 2 seconds.",
            icon: <Sparkles className="w-6 h-6 text-brand-500" strokeWidth={1.5} />,
            className: "col-span-1 md:col-span-2 lg:col-span-1 bg-white hover:border-brand-100"
        },
        {
            title: "Omnichannel",
            description: "Unified inbox for your WhatsApp business.",
            icon: <Globe2 className="w-6 h-6 text-white" strokeWidth={1.5} />,
            className: "col-span-1 md:col-span-2 lg:col-span-2 bg-dark-900 text-white"
        },
        {
            title: "Smart Sales",
            description: "Guide users from 'Hello' to 'Purchased' naturally.",
            icon: <MessageCircle className="w-6 h-6 text-green-500" strokeWidth={1.5} />,
            className: "col-span-1 md:col-span-2 lg:col-span-2 bg-white hover:border-green-100"
        },
        {
            title: "Secure",
            description: "Enterprise-grade data encryption.",
            icon: <ShieldCheck className="w-6 h-6 text-blue-500" strokeWidth={1.5} />,
            className: "col-span-1 md:col-span-2 lg:col-span-1 bg-white hover:border-blue-100"
        }
    ];

    return (
        <section id="features" className="py-24 bg-surface-50/50">
            <div className="container mx-auto px-6">
                <div className="text-center max-w-2xl mx-auto mb-20">
                    <h2 className="text-4xl font-display font-semibold text-dark-900 mb-6 -tracking-[0.02em]">
                        Everything you need to <br />
                        <span className="text-brand-500">automate growth.</span>
                    </h2>
                    <p className="text-lg text-dark-500 font-light">
                        Powerful tools that feel invisible.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((feature, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className={`p-8 rounded-[2rem] shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100/50 relative overflow-hidden group ${feature.className}`}
                        >
                            <div className="relative z-10 flex flex-col h-full justify-between gap-12">
                                <div>
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 ${feature.className.includes('bg-dark-900') ? 'bg-white/10' : 'bg-surface-50'}`}>
                                        {feature.icon}
                                    </div>
                                    <h3 className={`text-2xl font-semibold mb-3 ${feature.className.includes('bg-dark-900') ? 'text-white' : 'text-dark-900'}`}>
                                        {feature.title}
                                    </h3>
                                    <p className={`text-lg leading-relaxed font-light ${feature.className.includes('bg-dark-900') ? 'text-gray-400' : 'text-dark-500'}`}>
                                        {feature.description}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 mt-auto opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
                                    <span className={`text-sm font-semibold ${feature.className.includes('bg-dark-900') ? 'text-white' : 'text-dark-900'}`}>Learn more</span>
                                    <ArrowRight className={`w-4 h-4 ${feature.className.includes('bg-dark-900') ? 'text-white' : 'text-dark-900'}`} />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Features;
