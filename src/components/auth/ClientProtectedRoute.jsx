import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Loader2 } from 'lucide-react';

const ClientProtectedRoute = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [authorized, setAuthorized] = useState(false);

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

                // Verify ownership
                const { data: client } = await supabase
                    .from('clients')
                    .select('id')
                    .eq('slug', slug)
                    .eq('user_id', session.user.id)
                    .single();

                if (client) {
                    setAuthorized(true);
                } else {
                    console.warn("Unauthorized access attempt to client dashboard");
                }
            } catch (err) {
                console.warn('Client auth check failed:', err.message);
            } finally {
                setLoading(false);
            }
        };

        if (slug) {
            checkAuth();
        } else {
            setLoading(false);
        }

    }, [slug, navigate]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="animate-spin text-brand-600" size={32} />
            </div>
        );
    }

    if (!authorized) {
        // Redirect to login if not authorized
        return <Navigate to={`/client/${slug}/login`} replace />;
    }

    return <Outlet />;
};

export default ClientProtectedRoute;
