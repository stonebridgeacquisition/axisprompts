import React, { useState, useEffect } from 'react';
import { Share, PlusSquare, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const IOSInstallPrompt = () => {
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [showPrompt, setShowPrompt] = useState(false);

    useEffect(() => {
        // Detect if the device is iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIpadOrIphone = /iphone|ipad|ipod/.test(userAgent);

        // Detect if the app is already installed/running in standalone mode
        const isRunningStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;

        setIsIOS(isIpadOrIphone);
        setIsStandalone(isRunningStandalone);

        // If it's iOS and NOT installed, show the prompt (unless they dismissed it recently)
        if (isIpadOrIphone && !isRunningStandalone) {
            const hasDismissed = localStorage.getItem('ios_install_prompt_dismissed');
            // Show prompt if they haven't dismissed it, or if it's been more than 24 hours
            if (!hasDismissed || Date.now() - parseInt(hasDismissed) > 86400000) {
                // Add a small delay so it doesn't aggressively interrupt login
                const timer = setTimeout(() => setShowPrompt(true), 3000);
                return () => clearTimeout(timer);
            }
        }
    }, []);

    const handleDismiss = () => {
        localStorage.setItem('ios_install_prompt_dismissed', Date.now().toString());
        setShowPrompt(false);
    };

    if (!showPrompt || !isIOS || isStandalone) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                className="fixed bottom-4 left-4 right-4 z-[100] bg-white dark:bg-dark-900 border border-brand-200 dark:border-brand-900/50 rounded-2xl shadow-2xl p-4 flex flex-col gap-3"
            >
                <div className="flex justify-between items-start">
                    <div className="flex-1 pr-4">
                        <h3 className="font-bold text-gray-900 dark:text-white text-sm">Enable Instant Push Notifications</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Apple requires you to add this dashboard to your Home Screen to receive order alerts.
                        </p>
                    </div>
                    <button
                        onClick={handleDismiss}
                        className="p-1 -mr-1 -mt-1 text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-full dark:bg-dark-800 dark:hover:bg-dark-700 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="bg-brand-50 dark:bg-brand-900/20 rounded-xl p-3 text-sm text-brand-800 dark:text-brand-300 font-medium space-y-2 mt-1">
                    <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white dark:bg-dark-800 text-brand-600 text-xs font-bold shrink-0 shadow-sm">1</span>
                        <span>Tap the <Share size={16} className="inline mx-1 text-blue-500" /> Share button below</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white dark:bg-dark-800 text-brand-600 text-xs font-bold shrink-0 shadow-sm">2</span>
                        <span>Select "Add to Home Screen" <PlusSquare size={16} className="inline mx-1 text-gray-600 dark:text-gray-400" /></span>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default IOSInstallPrompt;
