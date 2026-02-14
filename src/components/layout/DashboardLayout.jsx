import React, { useState, useEffect } from 'react';
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
    ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ThemeToggle from '../ui/ThemeToggle'; // Adjust path if needed

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

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        getUser();
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/admin/login');
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
                <header className="bg-white dark:bg-dark-900 border-b border-gray-200 dark:border-dark-800 px-6 py-3 flex items-center justify-between sticky top-0 z-30 transition-colors duration-200">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                            <Menu size={24} />
                        </button>
                        <h1 className="text-lg font-bold text-gray-800 dark:text-white hidden md:block">Dashboard</h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative hidden md:block">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search..."
                                className="pl-9 pr-4 py-2 rounded-full border border-gray-200 dark:border-dark-700 bg-gray-50 dark:bg-dark-800 text-sm focus:outline-none focus:border-brand-500 dark:focus:border-brand-500 w-64 transition-colors text-gray-900 dark:text-white placeholder-gray-400"
                            />
                        </div>
                        <button className="relative p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-dark-800 rounded-full transition-colors">
                            <Bell size={20} />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-dark-900"></span>
                        </button>
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
