import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
    ShoppingBag,
    Utensils,
    Wallet,
    Bell,
    Menu,
    X,
    LogOut,
    Loader2,
    Settings,
    Clock,
    AlertCircle,
    Lock,
    CreditCard
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ThemeToggle from '../ui/ThemeToggle'; // Adjust path if needed
import OneSignal from 'react-onesignal';

const ClientSidebarLink = ({ to, icon: Icon, children, end = false, disabled = false }) => {
    if (disabled) {
        return (
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-300 dark:text-gray-600 cursor-not-allowed text-sm font-medium">
                <Icon size={18} />
                <span>{children}</span>
                <Lock size={12} className="ml-auto" />
            </div>
        );
    }
    return (
        <NavLink
            to={to}
            end={end}
            className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group text-sm font-medium
                ${isActive
                    ? 'bg-gray-100 text-gray-900 border-l-2 border-brand-600 dark:bg-dark-800 dark:text-white dark:border-brand-500'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 border-l-2 border-transparent dark:text-gray-400 dark:hover:bg-dark-800 dark:hover:text-gray-200'
                }
            `}
        >
            {({ isActive }) => (
                <>
                    <Icon size={18} className={isActive ? 'text-brand-600 dark:text-brand-500' : 'text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300'} />
                    <span>{children}</span>
                </>
            )}
        </NavLink>
    );
};

const ClientLayout = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [client, setClient] = useState(null);
    const [loading, setLoading] = useState(true);
    const [trialDaysLeft, setTrialDaysLeft] = useState(null);
    const [isMobile, setIsMobile] = useState(false);

    // Handle resize for sidebar
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Notifications
    const [notifOpen, setNotifOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const notifRef = useRef(null);

    useEffect(() => {
        const fetchClient = async () => {
            if (!slug) return;

            try {
                const { data, error } = await supabase
                    .from('clients')
                    .select('*')
                    .eq('slug', slug)
                    .single();

                if (error) throw error;
                setClient(data);

                // Calculate trial days left
                if (data.subscription_status === 'trial' && data.trial_end_date) {
                    const end = new Date(data.trial_end_date);
                    const now = new Date();
                    const diffTime = end - now;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    setTrialDaysLeft(diffDays);
                } else if (data.subscription_status === 'expired' || data.subscription_status === 'inactive') {
                    setTrialDaysLeft(0);
                }

            } catch (error) {
                console.error("Error fetching client:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchClient();
    }, [slug]);

    // Fetch notifications when client is loaded
    useEffect(() => {
        if (!client?.id) return;

        // --- Initialize OneSignal ---
        const initOneSignal = async () => {
            try {
                if (!window.OneSignal) {
                    await OneSignal.init({
                        appId: import.meta.env.VITE_ONESIGNAL_APP_ID,
                        allowLocalhostAsSecureOrigin: true, // For testing local
                    });
                }

                // Login the user to OneSignal using their Supabase Client ID
                await OneSignal.login(client.id);

                // Prompt for push notification permissions
                await OneSignal.Slidedown.promptPush();
                console.log('OneSignal initialized for client:', client.id);
            } catch (err) {
                console.error('OneSignal initialization failed:', err);
            }
        };
        initOneSignal();
        // -----------------------------

        const fetchNotifications = async () => {
            const { data } = await supabase
                .from('notifications')
                .select('*')
                .eq('client_id', client.id)
                .order('created_at', { ascending: false })
                .limit(20);
            const notifs = data || [];
            setNotifications(notifs);
            setUnreadCount(notifs.filter(n => !n.is_read).length);
        };
        fetchNotifications();

        // Real-time subscription (optional - won't block page load if it fails)
        let channel;
        try {
            channel = supabase
                .channel('client-notifications')
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `client_id=eq.${client.id}`
                }, (payload) => {
                    setNotifications(prev => [payload.new, ...prev]);
                    setUnreadCount(prev => prev + 1);
                })
                .subscribe();
        } catch (err) {
            console.warn('Realtime subscription failed (non-critical):', err.message);
        }

        return () => { if (channel) supabase.removeChannel(channel); };
    }, [client?.id]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (notifRef.current && !notifRef.current.contains(e.target)) {
                setNotifOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMarkAllRead = async () => {
        if (unreadCount === 0) return;
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('client_id', client.id)
            .eq('is_read', false);

        if (!error) {
            setNotifications(notifications.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        }
    };

    const formatDate = (d) => {
        const date = new Date(d);
        const now = new Date();
        const diff = (now - date) / 1000; // seconds

        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return date.toLocaleDateString();
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-dark-900">
                <Loader2 className="animate-spin text-brand-600" size={32} />
            </div>
        );
    }

    if (!client) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-dark-900 text-gray-500 dark:text-gray-400">
                Client not found.
            </div>
        );
    }

    const now = new Date();
    const isSubscriptionExpired = client.subscription_status === 'active' && client.subscription_end_date && new Date(client.subscription_end_date) < now;
    const isTrialExpired = client.subscription_status === 'trial' && client.trial_end_date && new Date(client.trial_end_date) < now;

    const isAccessBlocked = client.payment_model === 'subscription' && (
        (client.subscription_status === 'expired' || client.subscription_status === 'inactive') ||
        (isSubscriptionExpired && !client.is_grace_period)
    );

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-dark-950 overflow-hidden font-sans transition-colors duration-200">

            {/* Mobile Overlay */}
            <AnimatePresence>
                {sidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSidebarOpen(false)}
                        className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <motion.aside
                initial={false}
                animate={{ x: isMobile && !sidebarOpen ? '-100%' : '0%' }}
                transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                className={`fixed md:relative z-50 w-72 h-full bg-white dark:bg-dark-900 border-r border-gray-200 dark:border-dark-800 flex flex-col md:translate-x-0 shadow-xl md:shadow-none transition-colors duration-200`}
            >
                {/* Logo Area */}
                <div className="p-6 border-b border-gray-100 dark:border-dark-800 flex items-center justify-between">
                    <div className="flex items-center gap-3 overflow-hidden">
                        {client?.logo_url ? (
                            <img
                                src={client.logo_url}
                                alt={client.business_name}
                                className="w-10 h-10 rounded-lg object-cover shadow-sm bg-gray-50 dark:bg-dark-800 flex-shrink-0"
                            />
                        ) : (
                            <div className="w-10 h-10 bg-brand-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-brand-500/20 flex-shrink-0">
                                {client?.business_name ? client.business_name.charAt(0).toUpperCase() : 'A'}
                            </div>
                        )}
                        <span className="text-lg font-bold text-gray-900 dark:text-white truncate">
                            {client?.business_name || 'Swift Order AI'}
                        </span>
                    </div>
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="md:hidden p-1 hover:bg-gray-100 dark:hover:bg-dark-800 rounded-lg text-gray-500 dark:text-gray-400 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Navigation */}
                <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
                    <p className="px-3 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Menu</p>

                    {/* Block access to these links if expired */}
                    <ClientSidebarLink to={`/client/${slug}`} icon={ShoppingBag} end={true} disabled={isAccessBlocked}>
                        Orders
                    </ClientSidebarLink>
                    <ClientSidebarLink to={`/client/${slug}/menu`} icon={Utensils} disabled={isAccessBlocked}>
                        Menu Management
                    </ClientSidebarLink>

                    {/* Always allow access to Finance & Settings so they can pay */}
                    <ClientSidebarLink to={`/client/${slug}/finance`} icon={Wallet}>
                        Finance
                    </ClientSidebarLink>
                    <ClientSidebarLink to={`/client/${slug}/settings`} icon={Settings}>
                        Settings
                    </ClientSidebarLink>
                    {client.payment_model !== 'commission' && (
                        <ClientSidebarLink to={`/client/${slug}/subscription`} icon={CreditCard}>
                            Subscription
                        </ClientSidebarLink>
                    )}
                </div>

                {/* Footer User Profile & Theme Toggle */}
                <div className="p-4 border-t border-gray-100 dark:border-dark-800 space-y-4">

                    {/* Theme Toggle */}
                    <div className="bg-gray-50 dark:bg-dark-800 rounded-lg p-3 border border-gray-100 dark:border-dark-700">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Appearance</p>
                        <ThemeToggle />
                    </div>

                    <button
                        onClick={async () => {
                            await supabase.auth.signOut();
                            navigate(`/client/${slug}/login`);
                        }}
                        className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm font-medium"
                    >
                        <LogOut size={18} />
                        <span>Log Out</span>
                    </button>
                </div>
            </motion.aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-full overflow-hidden relative">

                {/* Grace Period / Payment Failed Banner */}
                {client.is_grace_period && client.payment_model !== 'commission' && (
                    <div className="bg-red-600 text-white px-4 py-2 text-sm font-bold flex items-center justify-center gap-2 shadow-md relative z-20 animate-pulse">
                        <AlertCircle size={18} />
                        <span>Payment Failed: Your subscription renewal was unsuccessful.</span>
                        <span
                            onClick={() => navigate(`/client/${slug}/subscription`)}
                            className="underline cursor-pointer hover:text-white/80 ml-1"
                        >
                            Update card details now to avoid lockout.
                        </span>
                    </div>
                )}

                {/* Trial Banner */}
                {client.subscription_status === 'trial' && client.payment_model !== 'commission' && trialDaysLeft !== null && (
                    <div className={`${trialDaysLeft <= 1 ? 'bg-red-600' : 'bg-brand-600'} text-white px-4 py-2 text-sm font-medium flex items-center justify-center gap-2 shadow-sm relative z-20`}>
                        <Clock size={16} />
                        {trialDaysLeft === 0 ? (
                            "Your free trial expires today!"
                        ) : trialDaysLeft < 0 ? (
                            `Trial expired! Please subscribe to avoid lockout in ${3 + trialDaysLeft === 0 ? 'less than 1' : 3 + trialDaysLeft} day${3 + trialDaysLeft === 1 ? '' : 's'}.`
                        ) : (
                            `Free Trial: ${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'} left.`
                        )}
                        <span
                            onClick={() => navigate(`/client/${slug}/subscription`)}
                            className="underline cursor-pointer hover:text-white/80 ml-1"
                        >
                            Subscribe now to keep access.
                        </span>
                    </div>
                )}

                {/* Store Closed Banner */}
                {client.is_open === false && (
                    <div className="bg-orange-500 text-white px-4 py-2 text-sm font-bold flex items-center justify-center gap-2 shadow-sm relative z-20">
                        <AlertCircle size={18} />
                        <span>Your store is currently closed. The AI will not take any orders.</span>
                        <span
                            onClick={async () => {
                                const { error } = await supabase
                                    .from('clients')
                                    .update({ is_open: true })
                                    .eq('id', client.id);
                                if (!error) {
                                    client.is_open = true;
                                    setClient({ ...client, is_open: true });
                                }
                            }}
                            className="underline cursor-pointer hover:text-white/80 ml-1"
                        >
                            Open now
                        </span>
                    </div>
                )}

                {/* Header */}
                <header className="h-16 bg-white dark:bg-dark-900 border-b border-gray-200 dark:border-dark-800 flex items-center justify-between px-4 sm:px-8 z-10 shrink-0 transition-colors duration-200">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-dark-800 rounded-lg text-gray-600 dark:text-gray-400 md:hidden transition-colors"
                        >
                            <Menu size={20} />
                        </button>
                        <h1 className="text-sm font-semibold text-gray-800 dark:text-white hidden md:block">
                            Overview
                        </h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${client.is_open !== false ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                                {client.is_open !== false ? 'Open' : 'Closed'}
                            </span>
                            <button
                                onClick={async () => {
                                    const newVal = !(client.is_open !== false);

                                    if (!newVal) {
                                        const confirmClose = window.confirm("Are you sure you want to close manually?\n\nThe AI agent will immediately stop taking orders. It will not take any orders until your next scheduled open time tomorrow.");
                                        if (!confirmClose) return;
                                    }

                                    const { error } = await supabase
                                        .from('clients')
                                        .update({ is_open: newVal })
                                        .eq('id', client.id);
                                    if (!error) {
                                        client.is_open = newVal;
                                        setClient({ ...client, is_open: newVal });
                                    }
                                }}
                                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors ${client.is_open !== false ? 'bg-green-500' : 'bg-red-500'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${client.is_open !== false ? 'translate-x-2.5' : '-translate-x-2.5'}`} />
                            </button>
                        </div>

                        {/* Notifications Bell */}
                        <div className="relative" ref={notifRef}>
                            <button
                                onClick={() => setNotifOpen(!notifOpen)}
                                className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:text-gray-200 dark:hover:bg-dark-800 rounded-full transition-colors"
                            >
                                <Bell size={18} />
                                {unreadCount > 0 && (
                                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-white dark:border-dark-900 px-1">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </button>

                            {/* Dropdown */}
                            <AnimatePresence>
                                {notifOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                                        transition={{ duration: 0.15 }}
                                        className="absolute right-0 mt-2 w-80 bg-white dark:bg-dark-900 rounded-xl border border-gray-200 dark:border-dark-700 shadow-xl dark:shadow-black/50 z-50 overflow-hidden"
                                    >
                                        <div className="p-3 border-b border-gray-100 dark:border-dark-800 flex items-center justify-between bg-gray-50/50 dark:bg-dark-800/50">
                                            <h3 className="font-bold text-sm text-gray-900 dark:text-white">Notifications</h3>
                                            {unreadCount > 0 && (
                                                <button onClick={handleMarkAllRead} className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:hover:text-brand-400">
                                                    Mark all read
                                                </button>
                                            )}
                                        </div>
                                        <div className="max-h-[320px] overflow-y-auto">
                                            {notifications.length === 0 ? (
                                                <div className="p-8 text-center text-gray-400 dark:text-gray-500 text-sm">
                                                    No notifications yet
                                                </div>
                                            ) : (
                                                <div className="divide-y divide-gray-50 dark:divide-dark-800">
                                                    {notifications.map((n) => (
                                                        <div key={n.id} className={`p-4 hover:bg-gray-50 dark:hover:bg-dark-800 transition-colors ${!n.is_read ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>
                                                            <div className="flex gap-3">
                                                                <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${!n.is_read ? 'bg-blue-500' : 'bg-gray-300 dark:bg-dark-600'}`} />
                                                                <div>
                                                                    <p className={`text-sm ${!n.is_read ? 'font-bold text-gray-900 dark:text-white' : 'font-medium text-gray-600 dark:text-gray-300'}`}>
                                                                        {n.title}
                                                                    </p>
                                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                                                                        {n.message}
                                                                    </p>
                                                                    <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-2">
                                                                        {formatDate(n.created_at)}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </header>

                {/* Content Area */}
                <div className="flex-1 overflow-auto bg-gray-50 dark:bg-dark-950 p-4 sm:p-8 relative transition-colors duration-200">
                    {isAccessBlocked ? (
                        <div className="absolute inset-0 z-30 flex items-center justify-center bg-gray-50/80 dark:bg-dark-950/80 backdrop-blur-sm p-4">
                            <div className="bg-white dark:bg-dark-900 max-w-md w-full p-8 rounded-2xl shadow-xl text-center border border-gray-200 dark:border-dark-700">
                                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600">
                                    <Lock size={32} />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Locked</h2>
                                <p className="text-gray-600 dark:text-gray-300 mb-8">
                                    Your free trial has ended. Please subscribe to continue accepting orders and managing your menu.
                                </p>
                                <button
                                    onClick={() => navigate(`/client/${slug}/subscription`)}
                                    className="w-full py-3 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/20"
                                >
                                    Subscribe Now (₦50,000/mo)
                                </button>
                                <p className="text-xs text-gray-400 mt-4">
                                    Need help? Contact support.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <Outlet context={{ client, setClient }} />
                    )}
                </div>
            </main>
        </div>
    );
};

export default ClientLayout;
