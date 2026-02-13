import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const StatCard = ({ label, value, trend, trendUp }) => (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <p className="text-sm text-gray-500 font-medium mb-1">{label}</p>
        <div className="flex items-end justify-between">
            <h3 className="text-3xl font-bold text-gray-900">{value}</h3>
            <span className={`text-xs font-bold px-2 py-1 rounded-full ${trendUp ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                {trend}
            </span>
        </div>
    </div>
);

const DashboardHome = () => {
    const [stats, setStats] = useState({
        revenue: 0,
        activeOrders: 0,
        totalClients: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // 1. Total Revenue (Axis Commission)
                const { data: financeData } = await supabase
                    .from('axis_finance')
                    .select('axis_commission');

                const totalRevenue = financeData?.reduce((sum, row) => sum + (Number(row.axis_commission) || 0), 0) || 0;

                // 2. Active Orders
                const { count: activeOrders } = await supabase
                    .from('orders')
                    .select('*', { count: 'exact', head: true })
                    .in('status', ['In Progress', 'Out for Delivery', 'Pending']);

                // 3. Total Clients
                const { count: totalClients } = await supabase
                    .from('clients')
                    .select('*', { count: 'exact', head: true });

                setStats({
                    revenue: totalRevenue,
                    activeOrders: activeOrders || 0,
                    totalClients: totalClients || 0
                });
            } catch (error) {
                console.error('Error fetching dashboard stats:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    const formatCurrency = (val) => `₦${val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Overview</h2>
                <p className="text-gray-500">Welcome back! Here's what's happening today.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    label="Total Commission Revenue"
                    value={loading ? "..." : formatCurrency(stats.revenue)}
                    trend={loading ? "..." : "Lifetime"}
                    trendUp={true}
                />
                <StatCard
                    label="Active Orders"
                    value={loading ? "..." : stats.activeOrders}
                    trend="Currently cooking/delivering"
                    trendUp={true}
                />
                <StatCard
                    label="Total Clients"
                    value={loading ? "..." : stats.totalClients}
                    trend="Onboarded Businesses"
                    trendUp={true}
                />
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 min-h-[400px] flex flex-col items-center justify-center text-gray-400 gap-4">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
                    <span className="text-2xl">📊</span>
                </div>
                <p>Detailed analytics charts coming soon...</p>
            </div>
        </div>
    );
};

export default DashboardHome;
