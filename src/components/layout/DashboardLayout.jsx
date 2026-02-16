import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
    LayoutDashboard,
    Users,
    Wallet,
    Settings,
    Bell,
    Search,
    Menu,
    X,
    ChevronDown,
    Loader2,
    Calendar,
    Briefcase,
    CreditCard
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ThemeToggle from '../ui/ThemeToggle';

const SidebarLink = ({ to, icon: Icon, children }) => {
    const location = useLocation();
    const isActive = location.pathname === to;

    return (
        <NavLink
            to={to}
            className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group whitespace-nowrap text-sm
                ${isActive
                    ? 'bg-brand-50 text-brand-600 font-medium dark:bg-brand-900/20 dark:text-brand-400'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-dark-800 dark:hover:text-gray-200'
                }
            `}
        >
            <Icon size={18} className={isActive ? 'text-brand-600 dark:text-brand-400' : 'text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300'} />
            <span>{children}</span>
        </NavLink>
    );
};

const DashboardLayout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [user, setUser] = useState(null);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const navigate = useNavigate();

    // Search & Notifications State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState({ clients: [], orders: [], payments: [] });
    const [isSearching, setIsSearching] = useState(false);
    const [showSearchResults, setShowSearchResults] = useState(false);

    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showNotifs, setShowNotifs] = useState(false);

    const searchRef = useRef(null);
    const notifRef = useRef(null);

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
            if (user) {
                fetchNotifications();
                subscribeToNotifications();
            }
        };
        getUser();

        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) setShowSearchResults(false);
            if (notifRef.current && !notifRef.current.contains(event.target)) setShowNotifs(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // --- Search Logic ---
    useEffect(() => {
        const delayDebounce = setTimeout(() => {
            if (searchQuery.length > 2) {
                handleSearch();
            } else {
                setSearchResults({ clients: [], orders: [], payments: [] });
                setShowSearchResults(false);
            }
        }, 300);
        return () => clearTimeout(delayDebounce);
    }, [searchQuery]);

    const handleSearch = async () => {
        setIsSearching(true);
        setShowSearchResults(true);
        try {
            const [clients, orders, finance] = await Promise.all([
                supabase.from('clients').select('id, business_name, slug').ilike('business_name', `%${searchQuery}%`).limit(3),
                supabase.from('orders').select('id, order_number, customer_name, client_id').ilike('customer_name', `%${searchQuery}%`).limit(3),
                supabase.from('axis_finance').select('id, paystack_reference, client_name').ilike('paystack_reference', `%${searchQuery}%`).limit(3)
            ]);

            setSearchResults({
                clients: clients.data || [],
                orders: orders.data || [],
                payments: finance.data || []
            });
        } catch (err) {
            console.error('Search error:', err);
        } finally {
            setIsSearching(false);
        }
    };

    // --- Notifications Logic ---
    const fetchNotifications = async () => {
        const { data } = await supabase
            .from('notifications')
            .select('*')
            .eq('is_system', true)
            .order('created_at', { ascending: false })
            .limit(10);

        setNotifications(data || []);
        setUnreadCount(data?.filter(n => !n.is_read).length || 0);
    };

    const subscribeToNotifications = () => {
        const subscription = supabase
            .channel('system_notifications')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: 'is_system=eq.true' }, (payload) => {
                setNotifications(prev => [payload.new, ...prev].slice(0, 10));
                setUnreadCount(c => c + 1);
            })
            .subscribe();
        return () => supabase.removeChannel(subscription);
    };

    const markAsRead = async () => {
        if (unreadCount === 0) return;
        setUnreadCount(0);
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('is_system', true)
            .eq('is_read', false);
        if (!error) {
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/admin/login');
    };

    const formatTime = (d) => {
        const date = new Date(d);
        const now = new Date();
        const diff = (now - date) / 1000;
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-dark-950 flex transition-colors duration-200">

            {/* Sidebar (Desktop) */}
            <aside className="hidden lg:flex flex-col w-64 bg-white dark:bg-dark-900 border-r border-gray-200 dark:border-dark-800 h-screen sticky top-0 transition-colors duration-200">
                <div className="p-5 border-b border-gray-100 dark:border-dark-800 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-brand-600 font-bold text-lg">
                        <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white shadow-lg shadow-brand-500/20">A</div>
                        <span className="dark:text-white">AxisPrompt</span>
                    </div>
                </div>

                <div className="flex-1 p-3 space-y-1 overflow-y-auto">
                    <SidebarLink to="/admin" icon={LayoutDashboard}>Dashboard</SidebarLink>
                    <SidebarLink to="/admin/crm" icon={Users}>CRM</SidebarLink>
                    <SidebarLink to="/admin/finance" icon={Wallet}>Finance</SidebarLink>
                    <SidebarLink to="/admin/notifications" icon={Bell}>Notifications</SidebarLink>
                    <div className="pt-4 mt-4 border-t border-gray-100 dark:border-dark-800">
                        <SidebarLink to="/admin/settings" icon={Settings}>Settings</SidebarLink>
                    </div>
                </div>

                {/* Theme Toggle Area */}
                <div className="px-4 pb-2">
                    <div className="bg-gray-50 dark:bg-dark-800 rounded-lg p-3 border border-gray-100 dark:border-dark-700">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Appearance</p>
                        <ThemeToggle />
                    </div>
                </div>

                <div className="p-3 border-t border-gray-100 dark:border-dark-800 relative">
                    <button
                        onClick={() => setUserMenuOpen(!userMenuOpen)}
                        className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-dark-800 cursor-pointer transition-colors text-left"
                    >
                        <div className="w-9 h-9 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400 font-bold text-sm">
                            {user?.email?.[0].toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">Admin</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email || 'Loading...'}</p>
                        </div>
                        <ChevronDown size={14} className="text-gray-400" />
                    </button>

                    {/* User Menu Dropdown */}
                    <AnimatePresence>
                        {userMenuOpen && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="absolute bottom-full left-3 right-3 mb-2 bg-white dark:bg-dark-900 rounded-xl shadow-xl dark:shadow-black/50 border border-gray-100 dark:border-dark-700 p-1 z-20 overflow-hidden"
                                >
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    >
                                        <div className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                                        </div>
                                        Sign Out
                                    </button>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>
            </aside>

            {/* Mobile Sidebar Overlay */}
            <AnimatePresence>
                {sidebarOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.5 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSidebarOpen(false)}
                            className="fixed inset-0 bg-black z-40 lg:hidden backdrop-blur-sm"
                        />
                        <motion.aside
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-dark-900 z-50 lg:hidden flex flex-col border-r border-gray-200 dark:border-dark-800 shadow-2xl"
                        >
                            <div className="p-5 border-b border-gray-100 dark:border-dark-800 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-brand-600 font-bold text-lg">
                                    <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white">A</div>
                                    <span className="dark:text-white">AxisPrompt</span>
                                </div>
                                <button onClick={() => setSidebarOpen(false)} className="p-2 -mr-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="flex-1 p-3 space-y-1 overflow-y-auto">
                                <SidebarLink to="/admin" icon={LayoutDashboard}>Dashboard</SidebarLink>
                                <SidebarLink to="/admin/crm" icon={Users}>CRM</SidebarLink>
                                <SidebarLink to="/admin/finance" icon={Wallet}>Finance</SidebarLink>
                                <SidebarLink to="/admin/notifications" icon={Bell}>Notifications</SidebarLink>
                                <div className="pt-4 mt-4 border-t border-gray-100 dark:border-dark-800">
                                    <SidebarLink to="/admin/settings" icon={Settings}>Settings</SidebarLink>
                                </div>
                            </div>
                            <div className="p-4 border-t border-gray-100 dark:border-dark-800">
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Appearance</p>
                                <ThemeToggle />
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 transition-colors duration-200">
                {/* Header */}
                <header className="bg-white dark:bg-dark-900 border-b border-gray-200 dark:border-dark-800 px-6 py-3 flex items-center justify-between sticky top-0 z-40 transition-colors duration-200">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                            <Menu size={24} />
                        </button>
                        <h1 className="text-lg font-bold text-gray-800 dark:text-white hidden md:block">Dashboard</h1>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Global Search */}
                        <div className="relative hidden md:block" ref={searchRef}>
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search everything..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onFocus={() => searchQuery.length > 2 && setShowSearchResults(true)}
                                className="pl-9 pr-4 py-2 rounded-full border border-gray-200 dark:border-dark-700 bg-gray-50 dark:bg-dark-800 text-sm focus:outline-none focus:border-brand-500 dark:focus:border-brand-500 w-64 lg:w-96 transition-all text-gray-900 dark:text-white placeholder-gray-400"
                            />

                            <AnimatePresence>
                                {showSearchResults && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="absolute top-full mt-2 left-0 right-0 bg-white dark:bg-dark-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-dark-800 overflow-hidden z-50 max-h-[400px] overflow-y-auto p-2"
                                    >
                                        {isSearching ? (
                                            <div className="p-4 flex items-center justify-center gap-2 text-gray-400 text-sm">
                                                <Loader2 size={16} className="animate-spin" />
                                                Searching...
                                            </div>
                                        ) : (
                                            <>
                                                {searchResults.clients.length === 0 && searchResults.orders.length === 0 && searchResults.payments.length === 0 ? (
                                                    <div className="p-4 text-center text-gray-400 text-sm">No results found for "{searchQuery}"</div>
                                                ) : (
                                                    <div className="space-y-4">
                                                        {searchResults.clients.length > 0 && (
                                                            <div>
                                                                <p className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Clients</p>
                                                                {searchResults.clients.map(c => (
                                                                    <button key={c.id} onClick={() => { navigate(`/admin/client/${c.id}`); setShowSearchResults(false); }} className="w-full text-left px-3 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-dark-800 flex items-center gap-3 transition-colors group">
                                                                        <div className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-lg group-hover:bg-purple-600 group-hover:text-white transition-colors"><Briefcase size={14} /></div>
                                                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{c.business_name}</span>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {searchResults.orders.length > 0 && (
                                                            <div>
                                                                <p className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Orders</p>
                                                                {searchResults.orders.map(o => (
                                                                    <button key={o.id} onClick={() => { navigate(`/admin/client/${o.client_id}`); setShowSearchResults(false); }} className="w-full text-left px-3 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-dark-800 flex items-center gap-3 transition-colors group">
                                                                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors"><Calendar size={14} /></div>
                                                                        <div className="flex flex-col">
                                                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{o.customer_name}</span>
                                                                            <span className="text-[10px] text-gray-400">Order #{o.order_number?.slice(-6).toUpperCase()}</span>
                                                                        </div>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {searchResults.payments.length > 0 && (
                                                            <div>
                                                                <p className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Finance</p>
                                                                {searchResults.payments.map(p => (
                                                                    <button key={p.id} onClick={() => { navigate(`/admin/finance`); setShowSearchResults(false); }} className="w-full text-left px-3 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-dark-800 flex items-center gap-3 transition-colors group">
                                                                        <div className="p-2 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-lg group-hover:bg-green-600 group-hover:text-white transition-colors"><CreditCard size={14} /></div>
                                                                        <div className="flex flex-col">
                                                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{p.client_name}</span>
                                                                            <span className="text-[10px] text-gray-400">{p.paystack_reference}</span>
                                                                        </div>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Notifications Bell */}
                        <div className="relative" ref={notifRef}>
                            <button
                                onClick={() => { setShowNotifs(!showNotifs); if (!showNotifs) markAsRead(); }}
                                className="relative p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-dark-800 rounded-full transition-colors"
                            >
                                <Bell size={20} />
                                {unreadCount > 0 && (
                                    <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white dark:border-dark-900 text-[10px] text-white font-bold flex items-center justify-center">
                                        {unreadCount}
                                    </span>
                                )}
                            </button>

                            <AnimatePresence>
                                {showNotifs && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                        className="absolute top-full right-0 mt-3 w-80 bg-white dark:bg-dark-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-dark-800 overflow-hidden z-50 transition-colors"
                                    >
                                        <div className="p-4 border-b border-gray-50 dark:border-dark-800 flex items-center justify-between">
                                            <h3 className="font-bold text-gray-900 dark:text-white">Activity</h3>
                                            <span className="text-xs text-brand-600 font-medium cursor-pointer hover:underline" onClick={() => navigate('/admin/notifications')}>View all</span>
                                        </div>
                                        <div className="max-h-[350px] overflow-y-auto divide-y divide-gray-50 dark:divide-dark-800">
                                            {notifications.length === 0 ? (
                                                <div className="p-8 text-center text-gray-400 text-sm">No new activity</div>
                                            ) : (
                                                notifications.map(n => (
                                                    <div key={n.id} className={`p-4 hover:bg-gray-50 dark:hover:bg-dark-800 transition-colors flex gap-3 ${!n.is_read ? 'bg-brand-50/30' : ''}`}>
                                                        <div className={`mt-1 p-2 rounded-xl shrink-0 ${n.type === 'payment' ? 'bg-green-100 text-green-600' :
                                                                n.type === 'user' ? 'bg-blue-100 text-blue-600' :
                                                                    'bg-brand-100 text-brand-600'
                                                            }`}>
                                                            {n.type === 'payment' ? <Wallet size={14} /> : n.type === 'user' ? <Users size={14} /> : <Bell size={14} />}
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold text-gray-900 dark:text-gray-100">{n.title}</p>
                                                            <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">{n.message}</p>
                                                            <p className="text-[10px] text-gray-400 mt-1">{formatTime(n.created_at)}</p>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </header>

                <main className="flex-1 p-6 overflow-y-auto bg-gray-50 dark:bg-dark-950 transition-colors duration-200">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
