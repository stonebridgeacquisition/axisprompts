import React from 'react';

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
    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Overview</h2>
                <p className="text-gray-500">Welcome back! Here's what's happening today.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard label="Total Revenue" value="₦2.4M" trend="+12.5%" trendUp={true} />
                <StatCard label="Active Orders" value="156" trend="+8.2%" trendUp={true} />
                <StatCard label="Pending Messages" value="12" trend="-4.5%" trendUp={false} />
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 min-h-[400px] flex items-center justify-center text-gray-400">
                Chart Placeholder
            </div>
        </div>
    );
};

export default DashboardHome;
