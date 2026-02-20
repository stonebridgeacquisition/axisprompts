import React, { useState, useEffect } from 'react';
import { Download, Loader2, TrendingUp, DollarSign, Users, ArrowUpRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const Finance = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalRevenue: 0,
        totalCommission: 0,
        totalSubRevenue: 0,
        totalClientPayouts: 0,
        transactionCount: 0
    });
    const [timeframe, setTimeframe] = useState('all'); // all, today, 7d, 30d

    useEffect(() => {
        fetchFinance();
    }, [timeframe]);

    const fetchFinance = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('axis_finance')
                .select('*')
                .order('created_at', { ascending: false });

            if (timeframe !== 'all') {
                const now = new Date();
                const startDate = new Date();

                if (timeframe === 'today') {
                    startDate.setHours(0, 0, 0, 0);
                } else if (timeframe === '7d') {
                    startDate.setDate(now.getDate() - 7);
                } else if (timeframe === '30d') {
                    startDate.setDate(now.getDate() - 30);
                }

                query = query.gte('created_at', startDate.toISOString());
            }

            const { data, error } = await query;

            if (error) throw error;

            const rows = data || [];
            setTransactions(rows);

            // Calculate stats
            const totalRevenue = rows.reduce((s, r) => s + Number(r.total_amount), 0);
            const totalCommission = rows.reduce((s, r) => {
                // Only count as commission if it's less than 100% (Order commissions are 0.5%)
                return r.commission_rate < 1 ? s + Number(r.axis_commission) : s;
            }, 0);
            const totalSubRevenue = rows.reduce((s, r) => {
                // Subscription revenue is where commission_rate is 100% (1.0)
                return r.commission_rate >= 1 ? s + Number(r.axis_commission) : s;
            }, 0);
            const totalClientPayouts = rows.reduce((s, r) => s + Number(r.client_revenue), 0);

            setStats({
                totalRevenue,
                totalCommission,
                totalSubRevenue,
                totalClientPayouts,
                transactionCount: rows.length
            });
        } catch (err) {
            console.error('Error fetching finance:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (val) => `₦${Number(val).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    const formatDate = (d) => new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Swift Order AI Finance</h2>
                    <p className="text-gray-500 dark:text-gray-400">All transactions across clients — 0.5% commission tracking.</p>
                </div>

                <div className="flex items-center gap-2 bg-gray-100 dark:bg-dark-800 p-1 rounded-xl border border-gray-200 dark:border-dark-700">
                    {[
                        { id: 'all', label: 'All Time' },
                        { id: 'today', label: 'Today' },
                        { id: '7d', label: '7 Days' },
                        { id: '30d', label: '30 Days' }
                    ].map((tf) => (
                        <button
                            key={tf.id}
                            onClick={() => setTimeframe(tf.id)}
                            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${timeframe === tf.id
                                    ? 'bg-white dark:bg-dark-700 text-brand-600 dark:text-brand-400 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            {tf.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-dark-900 p-5 rounded-2xl border border-gray-200 dark:border-dark-800 shadow-sm transition-colors">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Total Volume</span>
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg"><DollarSign size={16} className="text-blue-600 dark:text-blue-400" /></div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.totalRevenue)}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{stats.transactionCount} transactions</p>
                </div>

                <div className="bg-gradient-to-br from-brand-600 to-brand-700 p-5 rounded-2xl shadow-lg shadow-brand-500/20 text-white">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-white/70 uppercase">Subscription Revenue</span>
                        <div className="p-2 bg-white/20 rounded-lg"><TrendingUp size={16} className="text-white" /></div>
                    </div>
                    <p className="text-2xl font-bold">{formatCurrency(stats.totalSubRevenue)}</p>
                    <p className="text-xs text-white/60 mt-1">100% platform income</p>
                </div>

                <div className="bg-white dark:bg-dark-900 p-5 rounded-2xl border border-gray-200 dark:border-dark-800 shadow-sm transition-colors ring-2 ring-brand-500/10">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-brand-600 dark:text-brand-400 uppercase">Only Commissions</span>
                        <div className="p-2 bg-brand-50 dark:bg-brand-900/20 rounded-lg"><TrendingUp size={16} className="text-brand-600 dark:text-brand-400" /></div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.totalCommission)}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">0.5% from orders</p>
                </div>

                <div className="bg-white dark:bg-dark-900 p-5 rounded-2xl border border-gray-200 dark:border-dark-800 shadow-sm transition-colors">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Client Payouts</span>
                        <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg"><ArrowUpRight size={16} className="text-green-600 dark:text-green-400" /></div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.totalClientPayouts)}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">99.5% to clients</p>
                </div>

                <div className="bg-white dark:bg-dark-900 p-5 rounded-2xl border border-gray-200 dark:border-dark-800 shadow-sm transition-colors">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Active Clients</span>
                        <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg"><Users size={16} className="text-purple-600 dark:text-purple-400" /></div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {new Set(transactions.map(t => t.client_id).filter(Boolean)).size}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">With transactions</p>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white dark:bg-dark-900 border border-gray-200 dark:border-dark-800 rounded-xl overflow-hidden shadow-sm transition-colors">
                <div className="p-6 border-b border-gray-200 dark:border-dark-800">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">All Transactions</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-800">
                        <thead className="bg-gray-50 dark:bg-dark-800">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Client</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Customer</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Axis (0.5%)</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Client (99.5%)</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reference</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-dark-900 divide-y divide-gray-200 dark:divide-dark-800 text-gray-900 dark:text-white">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                        <Loader2 className="animate-spin mx-auto mb-2 text-brand-600" size={24} />
                                        Loading transactions...
                                    </td>
                                </tr>
                            ) : transactions.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                        No transactions yet. They'll appear here after customers make payments.
                                    </td>
                                </tr>
                            ) : (
                                transactions.map((txn) => (
                                    <tr key={txn.id} className="hover:bg-gray-50 dark:hover:bg-dark-800 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {formatDate(txn.created_at)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                            {txn.client_name || '—'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {txn.customer_name || txn.customer_email || '—'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900 dark:text-white">
                                            {formatCurrency(txn.total_amount)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-brand-600 dark:text-brand-400">
                                            {formatCurrency(txn.axis_commission)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 dark:text-green-400 font-medium">
                                            {formatCurrency(txn.client_revenue)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-400 dark:text-gray-500 font-mono">
                                            {txn.paystack_reference || '—'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Finance;
