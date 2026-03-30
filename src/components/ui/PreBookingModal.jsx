import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getCalApi } from '@calcom/embed-react';

const PreBookingModal = ({ isOpen, onClose }) => {
    const [formData, setFormData] = useState({
        businessName: '',
        email: '',
        whatsappNumber: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    // Stop propagation if clicking inside modal
    if (!isOpen) return null;

    const handleWhatsAppChange = (e) => {
        // Keep only numbers and allow max length of standard Nigeria number (10 or 11 digits after prefix)
        const val = e.target.value.replace(/\D/g, '').slice(0, 11);
        setFormData({ ...formData, whatsappNumber: val });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            // Basic validation
            if (!formData.businessName || !formData.email || !formData.whatsappNumber) {
                throw new Error("Please fill in all fields to proceed.");
            }

            // Normalize WhatsApp to include +234
            let phone = formData.whatsappNumber;
            // If they started with 0, remove it (e.g. 080... -> 80...)
            if (phone.startsWith('0')) phone = phone.substring(1);

            const fullPhone = `+234${phone}`;

            // Save lead to Supabase and get back the ID
            const { data: leadData, error: dbError } = await supabase
                .from('booking_leads')
                .insert({
                    name: formData.businessName,
                    email: formData.email,
                    phone: fullPhone,
                    booked_call: false,
                    follow_up_sent: false,
                    closed: false,
                })
                .select('id')
                .single();

            if (dbError) {
                console.error("Failed to save lead:", dbError);
                throw new Error("Something went wrong. Please try again.");
            }

            const leadId = leadData?.id;

            // Init and open Cal.com with lead_id passed via metadata
            const cal = await getCalApi();
            cal("ui", {
                styles: { branding: { brandColor: "#111827" } },
                hideEventTypeDetails: false,
                layout: "month_view",
            });

            // Cal.com requires metadata in URL format: ?metadata[key]=value
            // This is the documented way to ensure metadata appears in webhook payloads
            const calLink = leadId
                ? `swiftorderai/30min?metadata[lead_id]=${leadId}`
                : "swiftorderai/30min";

            cal("modal", { calLink, config: { layout: "month_view" } });

            // Close the pre-booking modal
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pb-20 sm:pb-6">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100"
                    >
                        {/* Header */}
                        <div className="px-6 py-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-start">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <Sparkles className="text-brand-600" size={20} /> Let's get started
                                </h2>
                                <p className="text-sm text-gray-500 mt-1">Quick details before we schedule your AI setup.</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-5">

                            {error && (
                                <div className="p-3 bg-red-50 text-red-600 border border-red-100 rounded-lg text-sm font-medium">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-semibold text-gray-900 mb-1.5">Business Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.businessName}
                                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                                    placeholder="e.g. Iya Basira Foods"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-900 mb-1.5">Email Address *</label>
                                <input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="you@email.com"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-900 mb-1.5">WhatsApp Number *</label>
                                <div className="relative flex items-center">
                                    <div className="absolute left-0 inset-y-0 px-4 flex items-center justify-center bg-gray-100 border-r border-gray-200 rounded-l-xl text-gray-600 font-semibold text-sm select-none">
                                        +234
                                    </div>
                                    <input
                                        type="tel"
                                        required
                                        value={formData.whatsappNumber}
                                        onChange={handleWhatsAppChange}
                                        placeholder="801 234 5678"
                                        className="w-full pl-16 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm tracking-wide"
                                    />
                                </div>
                                <p className="text-xs text-gray-400 mt-2">
                                    We use WhatsApp to deploy your AI and send you updates.
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-3.5 bg-gray-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition-all shadow-lg shadow-gray-900/20 disabled:opacity-70 disabled:cursor-not-allowed group mt-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="animate-spin" size={18} /> Processing...
                                    </>
                                ) : (
                                    <>
                                        Continue to Calendar <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default PreBookingModal;
