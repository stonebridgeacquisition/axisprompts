import React, { useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { CreditCard, CheckCircle, AlertTriangle, ShieldCheck, Loader2, Calendar, Zap } from 'lucide-react';
import { usePaystackPayment } from 'react-paystack';

const Subscription = () => {
    const { client, setClient } = useOutletContext();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    // Plan Code from Environment Variables
    const SUBSCRIPTION_PLAN_CODE = import.meta.env.VITE_PAYSTACK_PLAN_CODE;

    // Config: Paystack Inline requires 'amount' even for plans (it should match the plan amount).
    // We send both 'plan' and 'amount' to ensure the first charge is correct and the subscription starts.
    const config = {
        reference: `sub_${new Date().getTime()}_${client?.id?.slice(0, 5)}`,
        email: client?.email,
        publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
        plan: SUBSCRIPTION_PLAN_CODE,
        amount: 5000000, // ₦50,000 in kobo
        channels: ['card'],
        metadata: {
            client_id: client?.id,
            plan_code: SUBSCRIPTION_PLAN_CODE,
            action: "subscription_payment",
            custom_fields: [
                { display_name: "Client ID", variable_name: "client_id", value: client?.id }
            ]
        }
    };

    const initializePayment = usePaystackPayment(config);

    const [verifying, setVerifying] = useState(false);

    const onSuccess = (response) => {
        // FOOLPROOF DEBUGGING
        console.log("!!! PAYSTACK BROWSER SUCCESS !!!", response);
        alert("Success! Paystack Reference: " + response.reference);
        handlePostPaymentVerification(response);
    };

    const handlePostPaymentVerification = async (response) => {
        setVerifying(true);
        setLoading(false);

        try {
            console.log("Starting Polling for Webhook...", response.reference);

            // Poll for status update (up to 15 times, every 2s = 30s total)
            let attempts = 0;
            const maxAttempts = 15;

            while (attempts < maxAttempts) {
                attempts++;
                console.log(`Verification attempt ${attempts}...`);

                // Fetch fresh client data
                const { data, error } = await supabase
                    .from('clients')
                    .select('*')
                    .eq('id', client.id)
                    .single();

                if (error) throw error;

                // Check if the webhook has finished (it will reset grace period and update date)
                if (data.is_grace_period === false && data.subscription_status === 'active') {
                    setClient(data);
                    alert("Subscription Activated! You now have unlimited access.");
                    navigate(`/client/${client.slug}`);
                    return;
                }

                // Wait before next attempt
                await new Promise(r => setTimeout(r, 2000));
            }

            // If we get here, it timed out
            alert("Payment processed! It takes a moment to sync with your dashboard. If your status doesn't update in 1 minute, please refresh the page.");
            navigate(`/client/${client.slug}`);

        } catch (error) {
            console.error("Error verifying subscription:", error);
            alert("Your payment was received, but we're having trouble updating the dashboard. Please refresh in a moment.");
        } finally {
            setVerifying(false);
        }
    };

    const onClose = () => {
        console.log('Payment closed');
    };

    const handleSubscribe = () => {
        if (!config.publicKey) {
            alert("Configuration Error: Paystack Public Key is missing. Please check your .env file.");
            console.error("Missing VITE_PAYSTACK_PUBLIC_KEY in .env");
            return;
        }

        if (!config.email) {
            alert("Error: Client email is missing. Cannot verify user.");
            return;
        }

        if (!config.plan) {
            console.warn("Missing VITE_PAYSTACK_PLAN_CODE in .env. Falling back to simple charge.");
        }

        console.log("Initializing Paystack Payment...", config);
        initializePayment(onSuccess, onClose);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-GB', {
            day: 'numeric', month: 'long', year: 'numeric'
        });
    };

    // Calculate status display
    let statusColor = 'bg-gray-100 text-gray-700';
    let statusText = 'Unknown';
    let statusIcon = AlertTriangle;
    let statusBg = 'bg-white';

    const now = new Date();
    const isSubscriptionExpired = client.subscription_end_date && new Date(client.subscription_end_date) < now;
    const isTrialExpired = client.trial_end_date && new Date(client.trial_end_date) < now;

    if (client.subscription_status === 'active' && !isSubscriptionExpired) {
        statusColor = 'bg-green-100 text-green-700';
        statusText = 'Active Subscription';
        statusIcon = CheckCircle;
        statusBg = 'bg-green-50/50 border-green-200';
    } else if (client.subscription_status === 'trial' && !isTrialExpired) {
        statusColor = 'bg-blue-100 text-blue-700';
        statusText = 'Free Trial';
        statusIcon = ShieldCheck;
        statusBg = 'bg-blue-50/50 border-blue-200';
    } else if (client.is_grace_period) {
        statusColor = 'bg-orange-100 text-orange-700';
        statusText = 'Payment Failed - Grace Period';
        statusIcon = AlertTriangle;
        statusBg = 'bg-orange-50/50 border-orange-200';
    } else {
        // Expired or Inactive
        statusColor = 'bg-red-100 text-red-700';
        statusText = 'Expired / Inactive';
        statusIcon = AlertTriangle;
        statusBg = 'bg-red-50/50 border-red-200';
    }

    return (
        <div className="max-w-2xl mx-auto py-12 px-4">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900">Subscription Status</h2>
                <p className="text-gray-500 mt-2">Manage your automated AxisPrompt subscription.</p>
            </div>

            {/* Main Status & Action Card */}
            <div className={`rounded-3xl border shadow-xl overflow-hidden bg-white`}>
                <div className={`p-8 border-b border-gray-100 ${statusBg}`}>
                    <div className="flex flex-col items-center text-center">
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 shadow-sm ${statusColor} bg-white`}>
                            {React.createElement(statusIcon, { size: 40 })}
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900">{statusText}</h3>

                        <div className="flex items-center gap-2 text-sm text-gray-600 mt-2 bg-white/60 px-3 py-1 rounded-full border border-gray-200/50">
                            <Calendar size={14} />
                            {client.subscription_status === 'active'
                                ? `Renews on: ${formatDate(client.subscription_end_date)}`
                                : client.subscription_status === 'trial'
                                    ? `Trial ends: ${formatDate(client.trial_end_date)}`
                                    : 'Subscription inactive'
                            }
                        </div>
                    </div>
                </div>

                <div className="p-8 text-center space-y-6">
                    {(client.subscription_status === 'active' && !client.is_grace_period) ? (
                        <div className="space-y-4">
                            <p className="text-gray-600">
                                You have <span className="font-bold text-green-600">UNLIMITED ACCESS</span> to all features.
                            </p>
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-sm text-gray-500">
                                Your card will be automatically charged ₦50,000 on renewal. <br />
                                You can cancel anytime by contacting support.
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div>
                                <h4 className="text-lg font-bold text-gray-900 mb-2">Unlock Unlimited Access</h4>
                                <p className="text-gray-600 leading-relaxed max-w-sm mx-auto">
                                    Subscribe to the <b>Pro Plan</b> for ₦50,000/month to remove all restrictions and enjoy unlimited orders, menu items, and AI features.
                                </p>
                            </div>

                            <button
                                onClick={handleSubscribe}
                                disabled={loading || verifying}
                                className="w-full sm:w-auto px-8 py-4 bg-gray-900 text-white rounded-2xl font-bold text-lg hover:bg-black transition-all transform hover:scale-[1.02] shadow-xl shadow-gray-900/20 flex items-center justify-center gap-3 mx-auto disabled:opacity-50"
                            >
                                {loading || verifying ? (
                                    <Loader2 className="animate-spin" />
                                ) : (
                                    <Zap size={24} className="text-yellow-400 fill-current" />
                                )}
                                <span>
                                    {verifying ? 'Verifying payment...' : 'Subscribe Now — ₦50,000/mo'}
                                </span>
                            </button>

                            <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                                <CreditCard size={14} />
                                <span>Secured by Paystack</span>
                            </div>
                        </div>
                    )}

                    {client.is_grace_period && (
                        <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-xl text-orange-800 text-sm text-left flex gap-3">
                            <AlertTriangle size={20} className="shrink-0 text-orange-600 mt-0.5" />
                            <div>
                                <p className="font-bold text-orange-900">Payment Action Required</p>
                                <p>Your last payment failed. Please use the button above to update your subscription and avoid account suspension.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Subscription;
