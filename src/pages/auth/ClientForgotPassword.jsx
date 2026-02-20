import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { KeyRound, Loader2, ArrowRight, CheckCircle, Mail, Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const ClientForgotPassword = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1 = Request, 2 = Verify, 3 = New Password
    const [loading, setLoading] = useState(false);
    const [businessName, setBusinessName] = useState('');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
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

    const handleRequestCode = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Send OTP for password recovery
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    shouldCreateUser: false
                }
            });

            if (error) throw error;
            setStep(2);
        } catch (err) {
            console.error('Request Error:', err);
            setError(err.message || "Failed to send code");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.verifyOtp({
                email,
                token: otp,
                type: 'magiclink'
            });

            if (error) throw error;

            // If successful, user is now logged in.
            setStep(3);
        } catch (err) {
            console.error('Verification Error:', err);
            setError(err.message || "Invalid code");
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            // Success, redirect to dashboard or login
            const { data: { user } } = await supabase.auth.getUser();
            const { data: client } = await supabase
                .from('clients')
                .select('slug')
                .eq('user_id', user.id)
                .single();

            if (client) {
                navigate(`/client/${client.slug}`);
            } else {
                navigate(`/client/${slug}/login`);
            }

        } catch (err) {
            console.error('Reset Error:', err);
            setError(err.message || "Failed to reset password");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 w-full max-w-md p-8 border border-gray-100">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gray-900 text-white mb-4 shadow-lg shadow-gray-500/30">
                        <KeyRound size={24} />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {step === 1 && (businessName ? `Recover ${businessName} Account` : "Forgot Password")}
                        {step === 2 && "Enter Code"}
                        {step === 3 && "New Password"}
                    </h1>
                    <p className="text-gray-500 mt-2">
                        {step === 1 && "Enter your email to receive a recovery code"}
                        {step === 2 && `We sent a code to ${email}`}
                        {step === 3 && "Secure your account with a new password"}
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm border border-red-100 mb-6 transition-all">
                        {error}
                    </div>
                )}

                {step === 1 && (
                    <form onSubmit={handleRequestCode} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all"
                                placeholder="owner@restaurant.com"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 bg-gray-900 hover:bg-black text-white font-bold rounded-xl shadow-lg shadow-gray-500/20 transition-all flex justify-center items-center gap-2"
                        >
                            {loading ? <Loader2 size={20} className="animate-spin" /> : <>Send Code <ArrowRight size={20} /></>}
                        </button>
                    </form>
                )}

                {step === 2 && (
                    <form onSubmit={handleVerifyOtp} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Recovery Code</label>
                            <input
                                type="text"
                                required
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-center tracking-widest font-mono text-xl"
                                placeholder="000000"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 bg-gray-900 hover:bg-black text-white font-bold rounded-xl shadow-lg shadow-gray-500/20 transition-all flex justify-center items-center gap-2"
                        >
                            {loading ? <Loader2 size={20} className="animate-spin" /> : <>Verify Code <CheckCircle size={20} /></>}
                        </button>
                    </form>
                )}

                {step === 3 && (
                    <form onSubmit={handleResetPassword} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                            <input
                                type="password"
                                required
                                minLength={6}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all"
                                placeholder="New secure password"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg shadow-green-500/20 transition-all flex justify-center items-center gap-2"
                        >
                            {loading ? <Loader2 size={20} className="animate-spin" /> : <>Update & Login <Lock size={20} /></>}
                        </button>
                    </form>
                )}

                <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                    <p className="text-gray-600 text-sm">
                        Remembered it?{' '}
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

export default ClientForgotPassword;
