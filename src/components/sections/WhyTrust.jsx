import React, { useEffect, useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';

// Custom CountUp Component
const CountUpAnimation = ({ end, duration = 2, suffix = "" }) => {
    const [count, setCount] = useState(0);
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-50px" });

    useEffect(() => {
        if (isInView) {
            let startTime;
            let animationFrame;

            const animate = (timestamp) => {
                if (!startTime) startTime = timestamp;
                const progress = timestamp - startTime;
                const percentage = Math.min(progress / (duration * 1000), 1);

                // Easing function for smooth stop
                const easeOutQuart = 1 - Math.pow(1 - percentage, 4);

                setCount(Math.floor(easeOutQuart * end));

                if (percentage < 1) {
                    animationFrame = requestAnimationFrame(animate);
                }
            };

            animationFrame = requestAnimationFrame(animate);
            return () => cancelAnimationFrame(animationFrame);
        }
    }, [isInView, end, duration]);

    return <span ref={ref}>{count}{suffix}</span>;
};

const WhyTrust = () => {
    const stats = [
        {
            value: 0,
            suffix: "",
            label: "Missed Orders",
            gradient: "from-brand-500 to-orange-400",
        },
        {
            value: 100,
            suffix: "%",
            label: "Response Rate",
            gradient: "from-blue-500 to-cyan-400",
        },
        {
            value: 24,
            suffix: "/7",
            label: "Availability",
            gradient: "from-purple-500 to-pink-400",
        }
    ];

    return (
        <section id="trust" className="py-20 bg-gray-50 relative">
            <div className="container mx-auto px-6 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="max-w-[1000px] mx-auto bg-white rounded-[3rem] p-12 md:p-16 shadow-xl shadow-gray-200/50 flex flex-col md:flex-row items-center justify-between gap-12 relative overflow-hidden"
                >
                    {/* Soft Background Mesh */}
                    <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-brand-50/50 rounded-full blur-[80px] pointer-events-none -translate-y-1/2 translate-x-1/2"></div>

                    <div className="text-center md:text-left md:w-1/3 relative z-10">
                        <h2 className="text-2xl md:text-3xl font-display font-medium text-gray-900 mb-3">
                            Trusted by <br className="hidden md:block" /> Restaurants.
                        </h2>
                        <p className="text-gray-400 font-light text-sm md:text-base leading-relaxed">
                            We don't just promise results. <br /> We engineer them.
                        </p>
                    </div>

                    <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-0 relative z-10">
                        {stats.map((stat, index) => (
                            <div key={index} className="text-center relative group">
                                {/* Subtle Divider for Desktop */}
                                {index !== 0 && (
                                    <div className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 h-12 w-px bg-gray-100"></div>
                                )}

                                <div className={`text-5xl md:text-6xl font-display font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-br ${stat.gradient}`}>
                                    <CountUpAnimation end={stat.value} suffix={stat.suffix} />
                                </div>
                                <h3 className="text-xs md:text-sm font-medium text-gray-400 tracking-widest uppercase">{stat.label}</h3>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

export default WhyTrust;
