import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { Store, Loader2, ArrowRight, CheckCircle, Mail } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const ClientSignup = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1 = Signup Form, 2 = OTP Verification
    const [loading, setLoading] = useState(false);
    const [businessName, setBusinessName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchBusiness = async () => {
            if (!slug) return;
            const { data } = await supabase
                .from('clients')
                .select('business_name')
                .eq('slug', slug)
                .single();
            if (data) setBusinessName(data.business_name);
        };
        fetchBusiness();
    }, [slug]);

    const handleSignup = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // 1. Check if client exists with this email AND matches this slug
            const { data: client, error: clientCheckError } = await supabase
                .from('clients')
                .select('id, business_name, user_id, slug')
                .eq('email', email)
                .maybeSingle();

            if (clientCheckError) throw clientCheckError;

            if (!client || client.slug !== slug) {
                throw new Error(`This email does not belong to ${businessName || 'this business'}.`);
            }

            if (client.user_id) {
                throw new Error("This account has already been claimed. Please log in instead.");
            }

            // 2. Sign up with Supabase
            const { data, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        business_name: client.business_name
                    }
                }
            });

            if (signUpError) throw signUpError;

            // 3. Move to OTP step
            setStep(2);

        } catch (err) {
            console.error('Signup Error:', err);
            if (err.status === 429) {
                setError("Supabase email limit reached. Please wait 1 minute, use a different email, or disable 'Confirm Email' in Supabase settings.");
            } else {
                setError(err.message || "Failed to sign up");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // 1. Verify OTP
            const { data: { session }, error: verifyError } = await supabase.auth.verifyOtp({
                email,
                token: otp,
                type: 'signup'
            });

            if (verifyError) throw verifyError;

            if (!session) throw new Error("Verification failed. Please try again.");

            // 2. Fetch Slug (The trigger should have linked the user by now)
            await new Promise(r => setTimeout(r, 1000));

            const { data: client, error: fetchError } = await supabase
                .from('clients')
                .select('slug')
                .eq('email', email)
                .single();

            if (fetchError || !client) {
                navigate(`/client/${slug}/login`);
                return;
            }

            // 3. Send Welcome Email (Non-blocking)
            supabase.functions.invoke('send-welcome-email', {
                body: {
                    email,
                    businessName: client?.business_name || 'Business Owner',
                    slug: client?.slug,
                    loginUrl: `${window.location.origin}/client/${client.slug}/login`
                }
            }).then(({ error }) => {
                if (error) console.error('Failed to send welcome email:', error);
            });

            navigate(`/client/${client.slug}`);

        } catch (err) {
            console.error('Verification Error:', err);
            setError(err.message || "Invalid code");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 w-full max-w-md p-8 border border-gray-100">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-600 text-white mb-4 shadow-lg shadow-brand-500/30">
                        <Store size={24} />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {businessName ? `Join ${businessName}` : 'Sign Up'}
                    </h1>
                    <p className="text-gray-500 mt-2">Enter the email you used for onboarding to claim your dashboard</p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm border border-red-100 mb-6 transition-all">
                        {error}
                    </div>
                )}

                {step === 1 ? (
                    <form onSubmit={handleSignup} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Business Email</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all"
                                placeholder="owner@restaurant.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Create Password</label>
                            <input
                                type="password"
                                required
                                minLength={6}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-lg shadow-brand-500/20 transition-all transform active:scale-[0.98] disabled:opacity-50 flex justify-center items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" />
                                    Checking...
                                </>
                            ) : (
                                <>
                                    Verify Email
                                    <ArrowRight size={20} />
                                </>
                            )}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyOtp} className="space-y-6">
                        <div className="bg-blue-50 p-4 rounded-xl flex gap-3 text-blue-700 text-sm mb-4">
                            <Mail size={20} className="shrink-0" />
                            <p>We sent a 6-digit confirmation code to <b>{email}</b>. Please enter it below.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Verification Code</label>
                            <input
                                type="text"
                                required
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-center tracking-widest font-mono text-xl"
                                placeholder="00000000"
                                maxLength={8}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg shadow-green-500/20 transition-all transform active:scale-[0.98] disabled:opacity-50 flex justify-center items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" />
                                    Verifying...
                                </>
                            ) : (
                                <>
                                    Complete Setup
                                    <CheckCircle size={20} />
                                </>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={() => setStep(1)}
                            className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 font-medium"
                        >
                            Change Email
                        </button>
                    </form>
                )}

                <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                    <p className="text-gray-600 text-sm">
                        Already activated?{' '}
                        <Link to={`/client/${slug}/login`} className="text-brand-600 font-bold hover:underline">
                            Sign In
                        </Link>
                    </p>
                </div>
            </div>

            <p className="text-center text-gray-400 text-sm mt-8">
                &copy; {new Date().getFullYear()} Swift Order AI. All rights reserved.
            </p>
        </div>
    );
};

export default ClientSignup;
