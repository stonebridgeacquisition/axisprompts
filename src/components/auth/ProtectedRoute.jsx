import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = () => {
    const [loading, setLoading] = useState(true);
    const [authenticated, setAuthenticated] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                // Timeout wrapper: if auth takes more than 5s, treat as unauthenticated
                const sessionPromise = supabase.auth.getSession();
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Auth timeout')), 5000)
                );

                const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);

                if (!session) {
                    setLoading(false);
                    return;
                }

                // Verify admin status
                const { data: adminUser, error } = await supabase
                    .from('admin_users')
                    .select('id')
                    .eq('id', session.user.id)
                    .single();

                if (!error && adminUser) {
                    setAuthenticated(true);
                }
            } catch (err) {
                console.warn('Auth check failed:', err.message);
            } finally {
                setLoading(false);
            }
        };

        checkAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!session) setAuthenticated(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="animate-spin text-brand-600" size={32} />
            </div>
        );
    }

    return authenticated ? <Outlet /> : <Navigate to="/admin/login" replace />;
};

export default ProtectedRoute;
