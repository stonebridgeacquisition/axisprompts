import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, HelpCircle } from 'lucide-react';

const FAQItem = ({ question, answer }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="border-b border-gray-100 last:border-0">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between w-full text-left py-6 group hover:bg-gray-50 -mx-4 px-4 rounded-lg transition-colors"
                aria-expanded={isOpen}
            >
                <span className={`text-lg font-medium transition-colors duration-300 ${isOpen ? 'text-brand-600' : 'text-gray-800'}`}>
                    {question}
                </span>
                <span className={`flex-shrink-0 ml-6 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 border ${isOpen ? 'bg-brand-500 border-brand-400 rotate-180' : 'bg-transparent border-gray-200 group-hover:border-gray-300'}`}>
                    {isOpen ? <Minus size={16} className="text-white" /> : <Plus size={16} className="text-gray-400" />}
                </span>
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                    >
                        <p className="text-gray-400 leading-relaxed pb-6 pr-4 pl-1 font-light text-base">
                            {answer}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const FAQ = () => {
    const faqs = [
        {
            question: "Will this replace my staff?",
            answer: "No. It handles repetitive replies so your team can focus on preparing food and serving customers. Think of it as a super-efficient assistant that never sleeps."
        },
        {
            question: "Can it make mistakes?",
            answer: "It only replies based on your approved menu and rules. Unlike humans who might get tired or forget details, the AI follows your instructions perfectly every time."
        },
        {
            question: "Does it work with WhatsApp and Instagram?",
            answer: "Yes, it integrates natively with both WhatsApp and Instagram DMs, managing all conversations from a single dashboard."
        },
        {
            question: "How long does setup take?",
            answer: "Setup is incredibly quick — typically just a few hours. We handle the technical integration for you, so you can start taking automated orders almost immediately."
        }
    ];

    return (
        <section id="faq" className="py-20 bg-white relative">
            <div className="container mx-auto px-6 max-w-3xl">
                <div className="text-center mb-10">
                    <h2 className="text-3xl md:text-4xl font-display font-bold text-gray-900 mb-2">
                        Common Questions
                    </h2>
                </div>

                <div className="divide-y divide-gray-100">
                    {faqs.map((faq, index) => (
                        <FAQItem key={index} {...faq} />
                    ))}
                </div>
            </div>
        </section>
    );
};

export default FAQ;
