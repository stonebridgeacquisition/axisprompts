import React, { useRef, useState, useEffect } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { Sparkles, Utensils, ChevronRight } from 'lucide-react';

const MenuShowcase = () => {
    const sectionRef = useRef(null);
    const isInView = useInView(sectionRef, { once: true, amount: 0.5 });

    return (
        <section ref={sectionRef} className="py-20 lg:py-32 bg-gray-950 relative overflow-hidden selection:bg-brand-500 selection:text-white">
            {/* Background Accents */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-500/10 rounded-full blur-[120px] animate-pulse-slow"></div>
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:3rem_3rem]"></div>
            </div>

            <div className="container mx-auto px-6 relative z-10 flex flex-col items-center">
                <div className="max-w-2xl text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-6 leading-tight">
                        See how it handles <span className="text-brand-500 italic">real</span> orders.
                    </h2>
                    <p className="text-gray-400 text-lg font-light">
                        From menu exploration to payment confirmation, everything is automated.
                    </p>
                </div>

                <div className="relative w-full max-w-[360px]">
                    {/* The Phone Frame */}
                    <div className="relative bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[3rem] shadow-2xl shadow-black/50 overflow-hidden ring-1 ring-white/20 h-[640px] flex flex-col">

                        {/* Status Bar Mock */}
                        <div className="h-6 w-full flex justify-between px-8 pt-2 items-center text-[10px] text-white/40 font-medium">
                            <span>9:41</span>
                            <div className="flex gap-1">
                                <div className="w-3 h-2 bg-white/20 rounded-sm"></div>
                                <div className="w-3 h-2 bg-white/40 rounded-sm"></div>
                            </div>
                        </div>

                        {/* Header */}
                        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-brand-500 flex items-center justify-center text-white ring-2 ring-brand-500/20 shadow-lg">
                                    <Utensils size={18} />
                                </div>
                                <div>
                                    <h4 className="text-white font-bold text-sm leading-none mb-1">Kitchen AI Agent</h4>
                                    <div className="flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                                        <span className="text-[10px] text-green-400 font-bold uppercase tracking-wider">Online</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Simulation Space */}
                        <MenuSimulation active={isInView} />

                        {/* Message Input Mock */}
                        <div className="p-4 bg-white/5 border-t border-white/10 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40 text-lg">+</div>
                            <div className="flex-1 h-10 rounded-full bg-white/5 border border-white/10 px-4 flex items-center text-[11px] text-white/30 italic">
                                Message...
                            </div>
                            <div className="w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center shadow-lg">
                                <ChevronRight size={16} />
                            </div>
                        </div>
                    </div>

                    {/* Aesthetic Glow behind phone */}
                    <div className="absolute -inset-4 bg-brand-500/20 blur-3xl -z-10 rounded-[3rem] opacity-50"></div>
                </div>
            </div>
        </section>
    );
};

const MenuSimulation = ({ active }) => {
    const scrollRef = useRef(null);
    const [step, setStep] = useState(0);

    // Auto-scroll logic
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [step]);

    useEffect(() => {
        if (!active) return; // Changed from 'active' to 'isInView'

        const schedule = [
            { s: 1, d: 800 },    // User: Hi
            { s: 2, d: 2000 },   // AI thinking
            { s: 3, d: 3000 },   // AI: Menu list
            { s: 4, d: 6000 },   // User: Spice question
            { s: 5, d: 8000 },   // AI: Explanation
            { s: 6, d: 10000 },  // User: Order + Address
            { s: 7, d: 12000 },  // AI: Payment Link
            { s: 8, d: 15000 },  // User: Sends receipt
            { s: 9, d: 16500 },  // AI: Confirmation
        ];

        let timeouts = schedule.map(({ s, d }) => setTimeout(() => setStep(s), d));
        return () => timeouts.forEach(clearTimeout);
    }, [active]); // Dependency changed to local isInView

    return (
        <div
            ref={scrollRef}
            className="flex-1 p-5 space-y-6 overflow-y-auto no-scrollbar scroll-smooth flex flex-col pt-8 pb-10"
        >
            {/* Removed <div ref={containerRef} /> as scrollRef is now used for useInView */}

            <AnimatePresence>
                {/* Step 1: User Query */}
                {step >= 1 && (
                    <motion.div initial={{ opacity: 0, scale: 0.9, x: 20 }} animate={{ opacity: 1, scale: 1, x: 0 }} className="flex justify-end">
                        <div className="bg-brand-500 text-white px-4 py-2.5 rounded-2xl rounded-tr-none text-sm shadow-lg max-w-[85%]">
                            Hi! What do you have available today?
                        </div>
                    </motion.div>
                )}

                {/* Step 2: Thinking */}
                {step === 2 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex gap-2 items-center text-white/30 text-[10px] font-bold uppercase tracking-widest pl-2">
                        <div className="w-1 h-1 bg-white/40 rounded-full animate-bounce"></div>
                        <div className="w-1 h-1 bg-white/40 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                        <div className="w-1 h-1 bg-white/40 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                        <span>Checking Inventory</span>
                    </motion.div>
                )}

                {/* Step 3: AI Menu Response */}
                {step >= 3 && (
                    <motion.div initial={{ opacity: 0, scale: 0.9, x: -20 }} animate={{ opacity: 1, scale: 1, x: 0 }} className="flex gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center shrink-0 shadow-lg mt-0.5">
                            <Sparkles size={12} className="text-white" />
                        </div>
                        <div className="bg-white/10 text-white/90 p-3.5 rounded-2xl rounded-tl-none text-sm border border-white/10 shadow-xl max-w-[85%] leading-relaxed">
                            Welcome! 🥗🔥 Here's what's fresh:
                            <br /><br />
                            • <span className="text-brand-400 font-bold">Seafood Platter</span> — ₦12,500
                            <br />
                            • <span className="text-brand-400 font-bold">Deluxe Jollof</span> — ₦5,500
                            <br /><br />
                            Would you like more details on any of these?
                        </div>
                    </motion.div>
                )}

                {/* Step 4: User Question */}
                {step >= 4 && (
                    <motion.div initial={{ opacity: 0, scale: 0.9, x: 20 }} animate={{ opacity: 1, scale: 1, x: 0 }} className="flex justify-end">
                        <div className="bg-brand-500 text-white px-4 py-2.5 rounded-2xl rounded-tr-none text-sm shadow-lg max-w-[85%]">
                            Is the seafood platter very spicy? 🌶️
                        </div>
                    </motion.div>
                )}

                {/* Step 5: AI Explanation */}
                {step >= 5 && (
                    <motion.div initial={{ opacity: 0, scale: 0.9, x: -20 }} animate={{ opacity: 1, scale: 1, x: 0 }} className="flex gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center shrink-0 shadow-lg mt-0.5">
                            <Sparkles size={12} className="text-white" />
                        </div>
                        <div className="bg-white/10 text-white/90 p-3.5 rounded-2xl rounded-tl-none text-sm border border-white/10 max-w-[85%] leading-relaxed">
                            It's medium-spicy by default, but we can make it mild if you prefer! Comes with garlic butter too. 🥣✨
                        </div>
                    </motion.div>
                )}

                {/* Step 6: User Order */}
                {step >= 6 && (
                    <motion.div initial={{ opacity: 0, scale: 0.9, x: 20 }} animate={{ opacity: 1, scale: 1, x: 0 }} className="flex justify-end">
                        <div className="bg-brand-500 text-white px-4 py-2.5 rounded-2xl rounded-tr-none text-sm shadow-lg max-w-[85%]">
                            Perfect, I'll take one mild platter! Deliver to 5 Glover Road, Ikoyi.
                        </div>
                    </motion.div>
                )}

                {/* Step 7: AI Payment */}
                {step >= 7 && (
                    <motion.div initial={{ opacity: 0, scale: 0.9, x: -20 }} animate={{ opacity: 1, scale: 1, x: 0 }} className="flex gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center shrink-0 shadow-lg mt-0.5">
                            <Sparkles size={12} className="text-white" />
                        </div>
                        <div className="bg-white/10 text-white/90 p-3.5 rounded-2xl rounded-tl-none text-sm border border-white/10 max-w-[85%] leading-relaxed">
                            Noted! 📝 Total including delivery is <span className="text-brand-400 font-bold">₦13,500</span>.
                            <br /><br />
                            Please pay here:
                            <div className="mt-3 bg-white/5 border border-white/10 p-3 rounded-xl flex items-center gap-3">
                                <div className="w-8 h-8 rounded bg-brand-500 flex items-center justify-center text-white font-bold text-[10px]">PAY</div>
                                <div className="text-[10px] font-mono text-brand-200">axis.pay/ord/9821</div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Step 8: User Receipt */}
                {step >= 8 && (
                    <motion.div initial={{ opacity: 0, scale: 0.9, x: 20 }} animate={{ opacity: 1, scale: 1, x: 0 }} className="flex justify-end">
                        <div className="bg-white p-2 rounded-2xl rounded-tr-none shadow-xl border border-gray-100 max-w-[70%]">
                            <div className="h-24 w-32 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100 relative overflow-hidden">
                                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-30">
                                    <div className="w-8 h-8 rounded-full border-2 border-green-500 mb-1"></div>
                                    <div className="h-1 w-12 bg-gray-300 rounded"></div>
                                </div>
                                <span className="relative z-10 text-[10px] font-bold text-gray-400 bg-white shadow-sm px-2 py-1 rounded-full border border-gray-100">Receipt.jpg</span>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Step 9: Confirmed */}
                {step >= 9 && (
                    <motion.div initial={{ opacity: 0, scale: 0.9, x: -20 }} animate={{ opacity: 1, scale: 1, x: 0 }} className="flex gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center shrink-0 shadow-lg mt-0.5">
                            <Sparkles size={12} className="text-white" />
                        </div>
                        <div className="bg-white/10 text-white/90 p-3.5 rounded-2xl rounded-tl-none text-sm border border-white/10 max-w-[85%] leading-relaxed">
                            Got it! 🎉 Payment confirmed for Order <span className="font-bold text-white">#4291</span>.
                            <br /><br />
                            Our rider is picking it up. See you in ~30 mins! 🛵🔥
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default MenuShowcase;
