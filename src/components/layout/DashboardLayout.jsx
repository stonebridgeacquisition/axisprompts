import React, { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
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
                    <SidebarLink to="/app" icon={LayoutDashboard}>Dashboard</SidebarLink>
                    <SidebarLink to="/app/crm" icon={Users}>CRM</SidebarLink>
                    <SidebarLink to="/app/finance" icon={Wallet}>Finance</SidebarLink>
                    <SidebarLink to="/app/notifications" icon={Bell}>Notifications</SidebarLink>
                    <div className="pt-4 mt-4 border-t border-gray-100">
                        <SidebarLink to="/app/settings" icon={Settings}>Settings</SidebarLink>
                    </div>
                </div>

                <div className="p-4 border-t border-gray-100">
                    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold">U</div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">User Name</p>
                            <p className="text-xs text-gray-500 truncate">user@example.com</p>
                        </div>
                        <ChevronDown size={16} className="text-gray-400" />
                    </div>
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
                                <SidebarLink to="/app" icon={LayoutDashboard}>Dashboard</SidebarLink>
                                <SidebarLink to="/app/crm" icon={Users}>CRM</SidebarLink>
                                <SidebarLink to="/app/finance" icon={Wallet}>Finance</SidebarLink>
                                <SidebarLink to="/app/notifications" icon={Bell}>Notifications</SidebarLink>
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
