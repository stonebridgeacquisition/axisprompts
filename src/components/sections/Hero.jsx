import React, { useRef, useEffect } from 'react';
import { motion, useInView } from 'framer-motion';
import { Sparkles, ShieldCheck, ArrowRight } from 'lucide-react';
const Hero = ({ onOpenBooking }) => {

    return (
        <section className="relative pt-4 pb-16 lg:pt-28 lg:pb-32 overflow-hidden bg-white selection:bg-brand-100 selection:text-brand-900">

            {/* 1. Background: Advanced Light Beams & Aurora */}
            <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
                {/* Top Center Glow (Subtle Brand) */}
                <div className="absolute top-[-30%] left-1/2 -translate-x-1/2 w-[1200px] h-[800px] bg-brand-500/5 rounded-full blur-[120px] mix-blend-multiply animate-pulse-slow"></div>

                {/* Right Side Accent (Teal/Purple for depth) */}
                <div className="absolute top-[10%] right-[-10%] w-[800px] h-[800px] bg-purple-500/5 rounded-full blur-[100px] mix-blend-multiply animate-float"></div>

                {/* Left Side Accent (Warmth) */}
                <div className="absolute bottom-[20%] left-[-10%] w-[800px] h-[800px] bg-orange-500/5 rounded-full blur-[120px] mix-blend-multiply animate-float-delayed"></div>

                {/* Subtle Grid Texture for structure */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]"></div>
            </div>

            <div className="container mx-auto px-6 relative z-10">
                <div className="flex flex-col lg:flex-row items-center gap-0 lg:gap-20">

                    {/* Left: Content - First Screen on Mobile (Shortened to Peek) */}
                    <div className="w-full lg:w-[55%] max-w-3xl text-center lg:text-left flex flex-col justify-start pt-4 lg:justify-center lg:pt-0 lg:py-0">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                        >
                            {/* Chip / Pill */}
                            <div className="inline-flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-3 py-1 mb-6 lg:px-4 lg:py-1.5 lg:mb-8 shadow-sm hover:shadow-md transition-shadow cursor-default">
                                <Sparkles size={14} className="text-brand-500 fill-brand-500" />
                                <span className="text-[10px] lg:text-xs font-bold text-gray-800 tracking-wide uppercase">Nigerian Food Businesses</span>
                            </div>

                            {/* Massive Headline */}
                            <h1 className="font-display text-4xl md:text-5xl lg:text-7xl font-bold text-gray-900 leading-[1.1] mb-6 lg:mb-8 -tracking-[0.03em] drop-shadow-sm">
                                Every WhatsApp DM answered in 30 seconds. <br className="hidden lg:block" />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 via-purple-600 to-brand-600 animate-shimmer bg-[length:200%_auto]">Or you don't pay.</span>
                            </h1>

                            <p className="text-lg md:text-2xl text-gray-500 mb-8 lg:mb-10 leading-relaxed font-light max-w-2xl mx-auto lg:mx-0 px-2 lg:px-0">
                                Our AI employee handles every customer message on WhatsApp so you never lose a sale, even at 3am.
                            </p>

                            {/* CTA & Trust */}
                            <div className="flex flex-col sm:flex-row items-center gap-4 lg:gap-6 justify-center lg:justify-start mb-8 lg:mb-12">
                                <button
                                    onClick={onOpenBooking}
                                    className="group relative px-6 py-3 lg:px-8 lg:py-4 rounded-2xl bg-gray-900 text-white font-bold text-base lg:text-lg overflow-hidden shadow-xl shadow-gray-900/20 transition-all hover:scale-[1.02] hover:shadow-gray-900/30 active:scale-[0.98]"
                                >
                                    <span className="relative z-10 flex items-center gap-2">
                                        Start Free <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                    </span>
                                    {/* Glassy sheen effect on button */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-[150%] skew-x-12 group-hover:animate-beam"></div>
                                </button>

                                <div className="flex items-center gap-3 lg:gap-4 text-xs lg:text-sm font-medium text-gray-500">
                                    <div className="flex -space-x-2">
                                        {[1, 2, 3, 4].map((i) => (
                                            <div key={i} className={`w-6 h-6 lg:w-8 lg:h-8 rounded-full border-2 border-white bg-gray-${i * 100} flex items-center justify-center text-[10px] uppercase font-bold text-gray-400`}>
                                                {/* Placeholder avatars since we removed images - abstract faces */}
                                                <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 rounded-full"></div>
                                            </div>
                                        ))}
                                    </div>
                                    <p>Loved by 500+ businesses</p>
                                </div>
                            </div>

                            {/* Feature List (No Credit Card etc) */}
                            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-4 gap-y-2 lg:gap-x-8 lg:gap-y-4 text-xs lg:text-sm font-medium text-gray-500">
                                <div className="flex items-center gap-1.5 lg:gap-2">
                                    <ShieldCheck size={14} className="text-brand-600 lg:w-[18px] lg:h-[18px]" />
                                    <span>No credit card</span>
                                </div>
                                <div className="hidden sm:block w-1 h-1 rounded-full bg-gray-300"></div>
                                <div>7-day free trial</div>
                                <div className="hidden sm:block w-1 h-1 rounded-full bg-gray-300"></div>
                                <div>Cancel anytime</div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Right: Advanced 3D Device Visual - Second Screen on Mobile */}
                    <div className="w-full lg:w-[45%] flex flex-col justify-center items-center perspective-1000 py-10 lg:py-0">
                        <motion.div
                            initial={{ opacity: 0, rotateY: 10, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, rotateY: 0, scale: 1, y: 0 }}
                            transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
                            className="relative"
                        >
                            {/* Back Glow */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[600px] bg-brand-500/20 blur-[80px] -z-10 rounded-full animate-pulse-slow"></div>

                            {/* The Device Frame - Modern Glass/White */}
                            <div className="relative w-[320px] h-[660px] bg-white rounded-[3.5rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1),0_0_0_12px_rgba(255,255,255,0.4)] border border-gray-100 overflow-hidden ring-1 ring-gray-900/5">

                                {/* Screen Content */}
                                <div className="relative h-full w-full bg-gray-50 flex flex-col">
                                    {/* Mock Header */}
                                    <div className="h-24 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-end pb-4 px-6 justify-between z-10">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-orange-400 flex items-center justify-center text-white font-bold text-lg">A</div>
                                            <div>
                                                <div className="h-3 w-24 bg-gray-200 rounded-full mb-1.5"></div>
                                                <div className="h-2 w-16 bg-green-100 text-green-600 text-[10px] font-bold px-1.5 rounded-full flex items-center">Online</div>
                                            </div>
                                        </div>
                                        <div className="w-6 h-6 rounded-full bg-gray-50 border border-gray-100"></div>
                                    </div>

                                    {/* Chat Bubbles Mock - Animated Burger Order */}
                                    <ChatSimulation />

                                    {/* Input Area */}
                                    <div className="h-20 bg-white border-t border-gray-100 p-4 flex gap-3 items-center">
                                        <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                                            <span className="text-xl">+</span>
                                        </div>
                                        <div className="flex-1 h-10 rounded-full bg-gray-50 border border-gray-100 px-4 flex items-center text-sm text-gray-400">
                                            Type a message...
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-500 flex items-center justify-center">
                                            <ArrowRight size={16} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                </div>
            </div>
        </section>
    );
};

// Sub-component for the Chat Simulation to keep main component clean
const ChatSimulation = () => {
    const containerRef = useRef(null);
    const isInView = useInView(containerRef, { once: true, amount: 0.5 });
    const [step, setStep] = React.useState(0);

    React.useEffect(() => {
        if (!isInView) return;

        const schedule = [
            { step: 1, delay: 500 },   // User Typing
            { step: 2, delay: 1500 },  // User: "Classic Cheese Burger?"
            { step: 3, delay: 2000 },  // AI Typing
            { step: 4, delay: 2800 },  // AI: "Great choice..."
            { step: 5, delay: 4000 },  // User Typing
            { step: 6, delay: 5000 },  // User: "Make it a meal"
            { step: 7, delay: 6000 },  // User Typing (Address)
            { step: 8, delay: 7000 },  // User: Address
            { step: 9, delay: 7500 },  // AI Typing
            { step: 10, delay: 8500 }, // AI: Payment Link
            { step: 11, delay: 10000 }, // User Typing (Paying)
            { step: 12, delay: 11500 }, // User: Receipt
            { step: 13, delay: 12000 }, // AI Typing
            { step: 14, delay: 13000 }, // AI: Confirmation
        ];

        let timeouts = [];
        schedule.forEach(({ step: s, delay }) => {
            timeouts.push(setTimeout(() => setStep(s), delay));
        });

        return () => timeouts.forEach(clearTimeout);
    }, [isInView]);

    return (
        <div ref={containerRef} className="flex-1 p-6 space-y-4 overflow-hidden bg-gray-50/50 flex flex-col justify-end pb-8">

            {/* Step 1: User Typing */}
            {step === 1 && <TypingIndicator isUser={true} />}

            {/* Step 2+: User Message 1 */}
            {step >= 2 && (
                <UserMessage text="Hi, can I get the Classic Cheese Burger? 🍔" time="12:30 PM" />
            )}

            {/* Step 3: AI Typing */}
            {step === 3 && <TypingIndicator isUser={false} />}

            {/* Step 4+: AI Message 1 (Price) */}
            {step >= 4 && (
                <AiMessage>
                    Great choice! 😋 The <span className="font-bold text-white">Classic Cheese Burger</span> is ₦4,500.
                    <br /><br />
                    Should I add fries and a drink for a full meal? 🍟🥤
                </AiMessage>
            )}

            {/* Step 5: User Typing */}
            {step === 5 && <TypingIndicator isUser={true} />}

            {/* Step 6+: User Reply (Meal) */}
            {step >= 6 && (
                <UserMessage text="Yes please! Make it a meal." time="12:31 PM" />
            )}

            {/* Step 7: User Typing (Address) */}
            {step === 7 && <TypingIndicator isUser={true} />}

            {/* Step 8+: User Message (Address) */}
            {step >= 8 && (
                <UserMessage text="Delivery to 15 Glover Road, Ikoyi, Lagos." time="12:32 PM" />
            )}

            {/* Step 9: AI Typing */}
            {step === 9 && <TypingIndicator isUser={false} />}

            {/* Step 10+: AI Message (Payment) */}
            {step >= 10 && (
                <AiMessage delay="0.1s">
                    Noted! 📝 Total is <span className="font-bold text-white">₦6,500</span>.
                    <br /><br />
                    Please pay using the secure link below:
                    <div className="mt-3 bg-white/10 p-3 rounded-lg flex items-center gap-3 cursor-pointer hover:bg-white/20 transition-colors">
                        <div className="w-8 h-8 rounded bg-white flex items-center justify-center text-brand-600 font-bold text-xs">PAY</div>
                        <div className="text-xs font-mono text-brand-100">axis.pay/ord/8921</div>
                    </div>
                </AiMessage>
            )}

            {/* Step 11: User Typing (Receipt) */}
            {step === 11 && <TypingIndicator isUser={true} />}

            {/* Step 12+: User Message (Receipt) */}
            {step >= 12 && (
                <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="flex gap-3 items-end"
                >
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0 border-2 border-white overflow-hidden">
                        <div className="w-full h-full bg-gray-300 flex items-center justify-center text-[10px] text-gray-500 font-bold">U</div>
                    </div>
                    <div className="bg-white p-2 rounded-2xl rounded-bl-none shadow-sm border border-gray-100 max-w-[85%] origin-bottom-left">
                        <div className="h-24 w-32 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200 relative overflow-hidden">
                            <div className="absolute inset-0 flex flex-col items-center justify-center opacity-50">
                                <div className="w-8 h-8 rounded-full border-2 border-green-500 mb-1"></div>
                                <div className="h-1 w-12 bg-gray-300 rounded"></div>
                            </div>
                            <span className="relative z-10 text-[10px] font-bold text-gray-400 bg-white/80 px-2 py-1 rounded-full">Receipt.jpg</span>
                        </div>
                        <span className="text-[10px] text-gray-300 mt-1 block px-1">12:35 PM</span>
                    </div>
                </motion.div>
            )}

            {/* Step 13: AI Typing */}
            {step === 13 && <TypingIndicator isUser={false} />}

            {/* Step 14: AI Confirmation */}
            {step >= 14 && (
                <AiMessage delay="0.2s">
                    Payment received! 🎉
                    <br /><br />
                    Order <span className="font-bold text-white">#2049</span> is confirmed and preparing.
                    <br />
                    Rider will arrive in ~25 mins. 🛵
                </AiMessage>
            )}

        </div>
    );
};

// Reusable Components to clean up the simulation code
const UserMessage = ({ text, time }) => (
    <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="flex gap-3 items-end"
    >
        <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0 border-2 border-white overflow-hidden">
            <div className="w-full h-full bg-gray-300 flex items-center justify-center text-[10px] text-gray-500 font-bold">U</div>
        </div>
        <div className="bg-white p-4 rounded-2xl rounded-bl-none shadow-sm border border-gray-100 max-w-[85%] origin-bottom-left">
            <p className="text-gray-600 text-sm leading-relaxed">{text}</p>
            <span className="text-[10px] text-gray-300 mt-2 block">{time}</span>
        </div>
    </motion.div>
);

const AiMessage = ({ children, delay = "0.1s" }) => (
    <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="flex gap-3 items-end flex-row-reverse"
    >
        <div className="w-8 h-8 rounded-full bg-brand-600 flex-shrink-0 flex items-center justify-center shadow-lg shadow-brand-500/30 border-2 border-white">
            <Sparkles size={12} className="text-white" />
        </div>
        <div className="bg-brand-600 p-4 rounded-2xl rounded-br-none shadow-md shadow-brand-500/10 text-white max-w-[85%] relative group origin-bottom-right">
            <div className="text-sm leading-relaxed font-medium">
                {children}
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
                <span className="text-[10px] text-brand-100/70">Just now</span>
                <span className="flex items-center gap-1 text-[10px] bg-white/20 px-2 py-0.5 rounded-full text-white font-semibold shadow-inner">
                    <Sparkles size={8} /> Replied in {delay}
                </span>
            </div>
        </div>
    </motion.div>
);

const TypingIndicator = ({ isUser }) => (
    <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className={`flex gap-3 items-end ${!isUser ? 'flex-row-reverse' : ''}`}
    >
        <div className={`w-8 h-8 rounded-full flex-shrink-0 border-2 border-white overflow-hidden ${isUser ? 'bg-gray-200' : 'bg-brand-600'}`}>
            {isUser ? (
                <div className="w-full h-full bg-gray-300 flex items-center justify-center text-[10px] text-gray-500 font-bold">U</div>
            ) : (
                <div className="w-full h-full flex items-center justify-center"><Sparkles size={12} className="text-white" /></div>
            )}
        </div>
        <div className={`px-4 py-3 rounded-2xl shadow-sm border border-gray-100 ${isUser ? 'bg-white rounded-bl-none' : 'bg-gray-100 rounded-br-none'}`}>
            <div className="flex gap-1">
                <motion.div
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                    className="w-1.5 h-1.5 bg-gray-400 rounded-full"
                />
                <motion.div
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                    className="w-1.5 h-1.5 bg-gray-400 rounded-full"
                />
                <motion.div
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                    className="w-1.5 h-1.5 bg-gray-400 rounded-full"
                />
            </div>
        </div>
    </motion.div>
);

export default Hero;
