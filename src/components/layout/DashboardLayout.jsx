import React, { useState } from 'react';
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

const SidebarLink = ({ to, icon: Icon, children }) => {
    const location = useLocation();
    const isActive = location.pathname === to;

    return (
        <NavLink
            to={to}
            className={`
                flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
                ${isActive
                    ? 'bg-brand-50 text-brand-600 font-medium'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }
            `}
        >
            <Icon size={20} className={isActive ? 'text-brand-600' : 'text-gray-400 group-hover:text-gray-600'} />
            <span>{children}</span>
        </NavLink>
    );
};

const DashboardLayout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [user, setUser] = useState(null);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const navigate = useNavigate();

    React.useEffect(() => {
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
        <div className="min-h-screen bg-gray-50 flex">

            {/* Sidebar (Desktop) */}
            <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-200 h-screen sticky top-0">
                <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center gap-2 text-brand-600 font-bold text-xl">
                        <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white">A</div>
                        AxisPrompt
                    </div>
                </div>

                <div className="flex-1 p-4 space-y-1 overflow-y-auto">
                    <SidebarLink to="/admin" icon={LayoutDashboard}>Dashboard</SidebarLink>
                    <SidebarLink to="/admin/crm" icon={Users}>CRM</SidebarLink>
                    <SidebarLink to="/admin/finance" icon={Wallet}>Finance</SidebarLink>
                    <SidebarLink to="/admin/notifications" icon={Bell}>Notifications</SidebarLink>
                    <div className="pt-4 mt-4 border-t border-gray-100">
                        <SidebarLink to="/admin/settings" icon={Settings}>Settings</SidebarLink>
                    </div>
                </div>

                <div className="p-4 border-t border-gray-100 relative">
                    <button
                        onClick={() => setUserMenuOpen(!userMenuOpen)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors text-left"
                    >
                        <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold">
                            {user?.email?.[0].toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">Admin</p>
                            <p className="text-xs text-gray-500 truncate">{user?.email || 'Loading...'}</p>
                        </div>
                        <ChevronDown size={16} className="text-gray-400" />
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
                                    className="absolute bottom-full left-4 right-4 mb-2 bg-white rounded-xl shadow-lg border border-gray-100 p-1 z-20 overflow-hidden"
                                >
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
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
                            className="fixed inset-0 bg-black z-40 lg:hidden"
                        />
                        <motion.aside
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="fixed inset-y-0 left-0 w-64 bg-white z-50 lg:hidden flex flex-col border-r border-gray-200"
                        >
                            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-brand-600 font-bold text-xl">
                                    <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white">A</div>
                                    AxisPrompt
                                </div>
                                <button onClick={() => setSidebarOpen(false)} className="p-2 -mr-2 text-gray-400 hover:text-gray-600">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="flex-1 p-4 space-y-1 overflow-y-auto">
                                <SidebarLink to="/admin" icon={LayoutDashboard}>Dashboard</SidebarLink>
                                <SidebarLink to="/admin/crm" icon={Users}>CRM</SidebarLink>
                                <SidebarLink to="/admin/finance" icon={Wallet}>Finance</SidebarLink>
                                <SidebarLink to="/admin/notifications" icon={Bell}>Notifications</SidebarLink>
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500 hover:text-gray-700">
                            <Menu size={24} />
                        </button>
                        <h1 className="text-lg font-semibold text-gray-800 hidden md:block">Dashboard</h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative hidden md:block">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search..."
                                className="pl-10 pr-4 py-2 rounded-full border border-gray-200 text-sm focus:outline-none focus:border-brand-500 w-64"
                            />
                        </div>
                        <button className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors">
                            <Bell size={20} />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                        </button>
                    </div>
                </header>

                <main className="flex-1 p-6 overflow-y-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
