import React, { useState } from 'react';
import { ChevronLeft, Link as LinkIcon, Copy, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SetupDashboard = () => {
    const navigate = useNavigate();
    const [copied, setCopied] = useState(false);

    // The Onboarding Link
    const onboardingLink = "https://app.axisprompt.com/onboarding";

    const handleCopy = () => {
        navigator.clipboard.writeText(onboardingLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="max-w-3xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={() => navigate('/app/crm')}
                    className="p-2 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-gray-200 text-gray-500"
                >
                    <ChevronLeft size={20} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Invite Client</h1>
                    <p className="text-gray-500">Generate a secure link for client onboarding.</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 md:p-12 text-center space-y-8">

                <div className="w-20 h-20 bg-brand-50 rounded-full flex items-center justify-center mx-auto text-brand-600">
                    <LinkIcon size={40} />
                </div>

                <div className="max-w-lg mx-auto">
                    <h2 className="text-xl font-bold text-gray-900 mb-3">Send Onboarding Link</h2>
                    <p className="text-gray-500 leading-relaxed mb-8">
                        Copy the secure link below and send it to your client via WhatsApp or Email.
                        Once they complete the form, their dashboard and AI Agent will be automatically created.
                    </p>

                    <div className="flex items-center gap-2 p-2 rounded-xl border border-gray-200 bg-gray-50">
                        <input
                            type="text"
                            readOnly
                            value={onboardingLink}
                            className="flex-1 bg-transparent border-0 focus:ring-0 text-gray-600 font-mono text-sm px-2"
                        />
                        <button
                            onClick={handleCopy}
                            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${copied ? 'bg-green-600 text-white' : 'bg-brand-600 text-white hover:bg-brand-700'}`}
                        >
                            {copied ? <Check size={16} /> : <Copy size={16} />}
                            {copied ? 'Copied' : 'Copy'}
                        </button>
                    </div>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800 text-left max-w-lg mx-auto">
                    <strong>Note:</strong> This link is generic but secure (unlisted). Do not share it publicly.
                </div>

            </div>
        </div>
    );
};

export default SetupDashboard;
