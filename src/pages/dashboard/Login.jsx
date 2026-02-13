import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const Login = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Check if user is already logged in (e.g. from Invite Link)
    useEffect(() => {
        const checkSession = async () => {
            try {
                const sessionPromise = supabase.auth.getSession();
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Auth timeout')), 5000)
                );
                const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);
                if (session) {
                    const { data: adminUser } = await supabase
                        .from('admin_users')
                        .select('id')
                        .eq('id', session.user.id)
                        .single();

                    if (adminUser) {
                        navigate('/admin');
                    }
                }
            } catch (err) {
                console.warn('Session check failed:', err.message);
            }
        };

        checkSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session) {
                // Double check admin just in case
                const { data: adminUser } = await supabase
                    .from('admin_users')
                    .select('id')
                    .eq('id', session.user.id)
                    .single();

                if (adminUser) {
                    navigate('/admin');
                }
            }
        });

        return () => subscription.unsubscribe();
    }, [navigate]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // 1. Authenticate user
            const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (authError) throw authError;

            // 2. Check if user is an admin
            const { data: adminUser, error: adminError } = await supabase
                .from('admin_users')
                .select('*')
                .eq('id', user.id)
                .single();

            if (adminError || !adminUser) {
                console.error('Admin check failed:', adminError, adminUser);
                console.log('User ID:', user.id);
                // For debugging: show the user ID so they can check DB
                alert(`Login Failed: User ${user.email} (ID: ${user.id}) is not an admin.\nError: ${adminError?.message || 'Record not found'}`);

                await supabase.auth.signOut();
                throw new Error('Unauthorized access. Admin privileges required.');
            }

            // 3. Redirect to dashboard
            navigate('/admin');

        } catch (err) {
            console.error('Login error:', err);
            setError(err.message || 'Failed to sign in');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 w-full max-w-md p-8 border border-gray-100">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-600 text-white mb-4 shadow-lg shadow-brand-500/30">
                        <LayoutDashboard size={24} />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Welcome Back</h1>
                    <p className="text-gray-500 mt-2">Sign in to access your dashboard</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm border border-red-100">
                            {error}
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all"
                            placeholder="admin@axisprompt.com"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-lg shadow-brand-500/20 transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            'Sign In'
                        )}
                    </button>
                </form>
            </div>

            <p className="text-center text-gray-400 text-sm mt-8">
                &copy; {new Date().getFullYear()} AxisPrompt. All rights reserved.
            </p>
        </div>
    );
};

export default Login;
