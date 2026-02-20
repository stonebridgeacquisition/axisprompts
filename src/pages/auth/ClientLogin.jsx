import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { Store, Loader2, ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const ClientLogin = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [businessName, setBusinessName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
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

        // Auto-redirect if already logged in and matches this slug
        const checkExistingSession = async () => {
            try {
                const sessionPromise = supabase.auth.getSession();
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Auth timeout')), 5000)
                );
                const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);
                if (session) {
                    const { data: client } = await supabase
                        .from('clients')
                        .select('slug')
                        .eq('user_id', session.user.id)
                        .single();

                    if (client && client.slug === slug) {
                        navigate(`/client/${slug}`);
                    }
                }
            } catch (err) {
                console.warn('Client session check failed:', err.message);
            }
        };
        checkExistingSession();
    }, [slug, navigate]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // 1. Sign in
            const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (authError) throw authError;

            // 2. Fetch Client Details to verify portal matching
            const { data: client, error: clientError } = await supabase
                .from('clients')
                .select('slug, business_name')
                .eq('user_id', user.id)
                .single();

            if (clientError || !client) {
                throw new Error("No business account found linked to this email.");
            }

            // Enforce portal matching
            if (client.slug !== slug) {
                await supabase.auth.signOut();
                throw new Error(`This account belongs to ${client.business_name || 'another business'}. Please login through your unique portal.`);
            }

            // 3. Redirect to their specific dashboard
            navigate(`/client/${client.slug}`);

        } catch (err) {
            console.error('Login Error:', err);
            setError(err.message || "Failed to sign in");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-dark-950 flex flex-col items-center justify-center p-4 transition-colors duration-200">
            <div className="bg-white dark:bg-dark-900 rounded-2xl shadow-xl shadow-gray-200/50 dark:shadow-none w-full max-w-md p-8 border border-gray-100 dark:border-dark-800">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-600 text-white mb-4 shadow-lg shadow-brand-500/30">
                        <Store size={24} />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {businessName ? `Login to ${businessName}` : 'Partner Login'}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">Manage your restaurant and orders</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm border border-red-100 dark:border-red-800">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-gray-900 dark:text-white focus:border-brand-500 dark:focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all placeholder-gray-400 dark:placeholder-gray-500"
                            placeholder="owner@restaurant.com"
                        />
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                            <Link to={`/client/${slug}/forgot-password`} className="text-xs font-bold text-brand-600 hover:text-brand-700 dark:hover:text-brand-400">
                                Forgot password?
                            </Link>
                        </div>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-gray-900 dark:text-white focus:border-brand-500 dark:focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all placeholder-gray-400 dark:placeholder-gray-500"
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
                                Signing in...
                            </>
                        ) : (
                            <>
                                Sign In
                                <ArrowRight size={20} />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-gray-100 dark:border-dark-800 text-center">
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                        First time?{' '}
                        <Link to={`/client/${slug}/signup`} className="text-brand-600 font-bold hover:underline">
                            Sign up here
                        </Link>
                    </p>
                </div>
            </div>

            <p className="text-center text-gray-400 dark:text-gray-600 text-sm mt-8">
                &copy; {new Date().getFullYear()} Swift Order AI. All rights reserved.
            </p>
        </div>
    );
};

export default ClientLogin;
