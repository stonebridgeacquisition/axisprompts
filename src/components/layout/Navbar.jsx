import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Sparkles } from 'lucide-react';

const Navbar = () => {
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navLinks = [
        { name: "Home", href: "/" },
        { name: "Features", href: "/#features" },
        { name: "For Who?", href: "/#target" },
        { name: "Process", href: "/#process" },
        { name: "Trust", href: "/#trust" },
        { name: "Guarantee", href: "/#guarantee" },
        { name: "FAQ", href: "/#faq" },
    ];

    return (
        <>
            <motion.nav
                initial={{ y: -100 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.5 }}
                className={`fixed top-0 left-0 right-0 z-50 flex justify-center pt-6 px-4 transition-all duration-300 ${scrolled ? 'pt-4' : 'pt-6'}`}
            >
                <div
                    className={`
                        flex items-center justify-between px-6 py-3 rounded-full transition-all duration-500 border
                        ${scrolled ? 'md:bg-white/80 md:backdrop-blur-2xl md:border-gray-200 md:shadow-lg md:w-full md:max-w-4xl' : 'bg-transparent border-transparent w-full md:max-w-6xl'}
                        border-transparent bg-transparent
                    `}
                >
                    {/* Desktop Links (Left Aligned) */}
                    <div className="hidden md:flex items-center gap-1 mr-auto ml-2">
                        {navLinks.map((link) => (
                            <a
                                key={link.name}
                                href={link.href}
                                className="px-5 py-2 text-sm font-medium text-gray-600 hover:text-brand-600 transition-all relative group rounded-full hover:bg-gray-100/50"
                            >
                                {link.name}
                                {/* Glowing dot instead of underline */}
                                <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-brand-500 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-[0_0_8px_rgba(249,75,37,0.8)]"></span>
                            </a>
                        ))}
                    </div>

                    {/* CTA Button (Desktop) - Soft Turn */}
                    <div className="hidden md:block absolute right-3 top-1/2 -translate-y-1/2">
                        <a
                            href="#cta"
                            className="
                                relative overflow-hidden px-6 py-2.5 rounded-full text-sm font-bold text-white uppercase tracking-wide
                                bg-gradient-to-r from-brand-600 to-brand-500
                                shadow-lg shadow-brand-500/20 hover:shadow-brand-500/40
                                hover:-translate-y-0.5 transition-all duration-300 group
                            "
                        >
                            <span className="relative z-10">Start Free</span>
                            {/* Shine Effect */}
                            <div className="absolute inset-0 bg-white/20 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300"></div>
                        </a>
                    </div>

                    {/* Mobile CTA Button - Fixed Top Right (Replaces Menu) */}
                    <a
                        href="#cta"
                        className="md:hidden fixed top-6 right-6 z-50 px-5 py-2.5 bg-gradient-to-r from-brand-600 to-brand-500 text-white text-xs font-bold uppercase tracking-widest rounded-full shadow-lg shadow-brand-500/20 hover:scale-105 transition-all"
                    >
                        Start Free
                    </a>
                </div>
            </motion.nav>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20, backdropFilter: "blur(0px)" }}
                        animate={{ opacity: 1, y: 0, backdropFilter: "blur(20px)" }}
                        exit={{ opacity: 0, y: -20, backdropFilter: "blur(0px)" }}
                        className="fixed inset-0 z-40 bg-dark-950/80 pt-28 px-6 md:hidden"
                    >
                        <div className="flex flex-col gap-6 items-center">
                            {navLinks.map((link, i) => (
                                <motion.a
                                    key={link.name}
                                    href={link.href}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 * i }}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="text-2xl font-medium text-white hover:text-brand-400 transition-colors"
                                >
                                    {link.name}
                                </motion.a>
                            ))}
                            <a
                                href="#cta"
                                onClick={() => setMobileMenuOpen(false)}
                                className="w-full text-center px-6 py-4 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 text-white font-bold text-lg mt-8 shadow-lg shadow-brand-500/30"
                            >
                                Book a Demo
                            </a>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default Navbar;
