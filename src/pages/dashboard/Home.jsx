import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, ShoppingCart, DollarSign } from 'lucide-react';

const StatCard = ({ label, value, trend, icon: Icon, colorClass }) => (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-md group">
        <div className="flex items-center justify-between mb-4">
            <div className={`p-2 rounded-xl bg-opacity-10 ${colorClass.bg} ${colorClass.text}`}>
                <Icon size={20} />
            </div>
            <span className={`text-xs font-bold px-2 py-1 rounded-full ${trend.includes('+') ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                {trend}
            </span>
        </div>
        <p className="text-sm text-gray-500 font-medium mb-1">{label}</p>
        <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
    </div>
);

const DashboardHome = () => {
    const [stats, setStats] = useState({
        revenue: 0,
        activeOrders: 0,
        totalClients: 0
    });
    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // 1. Fetch Finance Data for Stats and Chart
                const { data: financeData } = await supabase
                    .from('axis_finance')
                    .select('axis_commission, created_at')
                    .order('created_at', { ascending: true });

                const totalRevenue = financeData?.reduce((sum, row) => sum + (Number(row.axis_commission) || 0), 0) || 0;

                // 2. Aggregate Chart Data (Last 6 Months)
                const monthlyData = {};
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

                // Initialize last 6 months
                for (let i = 5; i >= 0; i--) {
                    const d = new Date();
                    d.setMonth(d.getMonth() - i);
                    const label = `${months[d.getMonth()]}`;
                    monthlyData[label] = 0;
                }

                financeData?.forEach(row => {
                    const date = new Date(row.created_at);
                    const label = `${months[date.getMonth()]}`;
                    if (monthlyData.hasOwnProperty(label)) {
                        monthlyData[label] += Number(row.axis_commission) || 0;
                    }
                });

                const formattedChartData = Object.entries(monthlyData).map(([name, total]) => ({
                    name,
                    total: Math.round(total)
                }));
                setChartData(formattedChartData);

                // 3. Active Orders
                const { count: activeOrders } = await supabase
                    .from('orders')
                    .select('*', { count: 'exact', head: true })
                    .in('status', ['In Progress', 'Out for Delivery', 'Pending']);

                // 4. Total Clients
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

        fetchDashboardData();
    }, []);

    const formatCurrency = (val) => `₦${val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Executive Overview</h2>
                    <p className="text-gray-500 mt-1">Real-time performance metrics and revenue analytics.</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-gray-100 shadow-sm text-sm font-medium text-gray-600">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    System Online
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    label="Platform Revenue"
                    value={loading ? "..." : formatCurrency(stats.revenue)}
                    trend="+12.5%"
                    icon={TrendingUp}
                    colorClass={{ bg: 'bg-brand-500', text: 'text-brand-600' }}
                />
                <StatCard
                    label="Active Orders"
                    value={loading ? "..." : stats.activeOrders}
                    trend="Live"
                    icon={ShoppingCart}
                    colorClass={{ bg: 'bg-blue-500', text: 'text-blue-600' }}
                />
                <StatCard
                    label="Total Clients"
                    value={loading ? "..." : stats.totalClients}
                    trend="Growing"
                    icon={Users}
                    colorClass={{ bg: 'bg-purple-500', text: 'text-purple-600' }}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Revenue Chart */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">Revenue Flow</h3>
                            <p className="text-sm text-gray-500">Platform earnings over the last 6 months</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 bg-brand-500 rounded-sm"></span>
                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Commission</span>
                            </div>
                        </div>
                    </div>

                    <div className="h-[300px] w-full">
                        {loading ? (
                            <div className="h-full w-full bg-gray-50 animate-pulse rounded-xl" />
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                                        dy={10}
                                    />
                                    <YAxis
                                        hide // Keep it clean
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#fff',
                                            border: 'none',
                                            borderRadius: '12px',
                                            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                                        }}
                                        labelStyle={{ color: '#64748b', fontWeight: 'bold' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="total"
                                        stroke="#8b5cf6"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorTotal)"
                                        dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4, strokeWidth: 2, stroke: '#fff' }}
                                        activeDot={{ r: 6, strokeWidth: 0 }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Right Panel / Recent Activity Placeholder */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
                    <h3 className="text-xl font-bold text-gray-900 mb-6">Recent Growth</h3>
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-green-50 text-green-600 rounded-full flex items-center justify-center font-bold">
                                %
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-900">New High Record</p>
                                <p className="text-xs text-gray-500">Weekly revenue up by 15%</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold">
                                +
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-900">Client Expansion</p>
                                <p className="text-xs text-gray-500">3 new businesses joined Axis</p>
                            </div>
                        </div>
                        <div className="mt-8 pt-8 border-t border-gray-50">
                            <p className="text-xs text-gray-400 leading-relaxed text-center italic">
                                "Growth is never by mere chance; it is the result of forces working together."
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardHome;
