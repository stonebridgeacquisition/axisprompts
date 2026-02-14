import React, { useState, useEffect } from 'react';
import { TrendingUp, Loader2, ArrowDownLeft, ShoppingBag, DollarSign, RotateCcw } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const ClientFinance = () => {
    const { client } = useOutletContext();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refundingId, setRefundingId] = useState(null);
    const [stats, setStats] = useState({ totalRevenue: 0, paidOrders: 0, pendingOrders: 0 });

    useEffect(() => {
        if (client?.id) fetchData();
    }, [client?.id]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .eq('client_id', client.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const rows = data || [];
            setOrders(rows);

            const paid = rows.filter(o => o.payment_status === 'Paid');
            const pending = rows.filter(o => o.payment_status !== 'Paid' && o.payment_status !== 'Refunded');

            setStats({
                totalRevenue: paid.reduce((s, o) => s + Number(o.total_amount || 0), 0),
                paidOrders: paid.length,
                pendingOrders: pending.length
            });
        } catch (err) {
            console.error('Error fetching finance:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleRefund = async (order) => {
        if (!window.confirm(`Refund ₦${Number(order.total_amount).toLocaleString()} to ${order.customer_name || 'customer'}? This cannot be undone.`)) return;

        setRefundingId(order.id);
        try {
            const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-refund`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify({ order_id: order.id })
            });
            const result = await res.json();

            if (result.error) throw new Error(result.error);

            alert('✅ Refund processed successfully!');
            fetchData();
        } catch (err) {
            console.error('Refund error:', err);
            alert(`Refund failed: ${err.message}`);
        } finally {
            setRefundingId(null);
        }
    };

    const formatCurrency = (v) => `₦${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    const formatDate = (d) => new Date(d).toLocaleDateString('en-NG', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Finance & Payouts</h2>
                <p className="text-gray-500">Track your earnings from orders.</p>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="animate-spin text-brand-600" size={32} />
                </div>
            ) : (
                <>
                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-brand-900 rounded-2xl p-8 text-white relative overflow-hidden shadow-lg shadow-brand-900/20">
                            <div className="relative z-10">
                                <p className="text-brand-200 font-medium mb-1">Total Revenue</p>
                                <h3 className="text-4xl font-bold">{formatCurrency(stats.totalRevenue)}</h3>
                                <p className="text-brand-300 text-sm mt-2">{stats.paidOrders} paid orders</p>
                            </div>
                            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-800 rounded-full blur-[80px] -mr-16 -mt-16"></div>
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                    <TrendingUp size={20} />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Paid Orders</p>
                                    <p className="text-2xl font-bold text-gray-900">{stats.paidOrders}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                                    <ShoppingBag size={20} />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Pending Orders</p>
                                    <p className="text-2xl font-bold text-gray-900">{stats.pendingOrders}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Transactions */}
                    <div className="bg-white dark:bg-dark-900 rounded-2xl border border-gray-200 dark:border-dark-800 shadow-sm overflow-hidden transition-colors duration-200">
                        <div className="p-6 border-b border-gray-200 dark:border-dark-800">
                            <h3 className="font-bold text-gray-900 dark:text-white">Recent Transactions</h3>
                        </div>

                        {orders.length === 0 ? (
                            <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                                No transactions yet. They'll appear here after customers make payments.
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100 dark:divide-dark-800">
                                {orders.map((order) => (
                                    <div key={order.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-gray-50 dark:hover:bg-dark-800 transition-colors gap-4">
                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                            <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${order.payment_status === 'Refunded'
                                                    ? 'bg-gray-100 dark:bg-dark-800 text-gray-400'
                                                    : order.payment_status === 'Paid'
                                                        ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                                                        : 'bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'
                                                }`}>
                                                {order.payment_status === 'Refunded'
                                                    ? <RotateCcw size={18} />
                                                    : order.payment_status === 'Paid'
                                                        ? <ArrowDownLeft size={18} />
                                                        : <DollarSign size={18} />
                                                }
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                                        {order.customer_name || 'Customer'}
                                                    </p>
                                                    <span className="text-gray-300 dark:text-gray-700 hidden sm:inline">•</span>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate hidden sm:block">
                                                        {order.items_summary || 'Order'}
                                                    </p>
                                                </div>
                                                <p className="text-xs text-gray-400 truncate sm:hidden mb-1">
                                                    {order.items_summary || 'Order'}
                                                </p>
                                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                                    <p>{formatDate(order.created_at)}</p>
                                                    {order.paystack_reference && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="font-mono">{order.paystack_reference.slice(0, 8)}...</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between sm:justify-end gap-4 sm:min-w-[200px]">
                                            <div className="text-right">
                                                <p className={`font-bold text-base ${order.payment_status === 'Refunded' ? 'text-gray-400 line-through'
                                                        : order.payment_status === 'Paid' ? 'text-gray-900 dark:text-white' // Changed from green to neutral for better readability
                                                            : 'text-orange-600'
                                                    }`}>
                                                    {order.payment_status === 'Paid' ? '+' : ''}{formatCurrency(order.total_amount || 0)}
                                                </p>
                                                <div className="flex justify-end mt-1">
                                                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full ${order.payment_status === 'Refunded' ? 'bg-gray-100 text-gray-500 dark:bg-dark-800 dark:text-gray-400' :
                                                            order.status === 'Delivered' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' :
                                                                order.status === 'In Progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' :
                                                                    'bg-gray-100 text-gray-600 dark:bg-dark-800 dark:text-gray-400'
                                                        }`}>
                                                        {order.payment_status === 'Refunded' ? 'Refunded' : order.status}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Refund Button */}
                                            {order.payment_status === 'Paid' && order.paystack_reference && (
                                                <button
                                                    onClick={() => handleRefund(order)}
                                                    disabled={refundingId === order.id}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all disabled:opacity-50 group"
                                                    title="Process Refund"
                                                >
                                                    {refundingId === order.id ? (
                                                        <Loader2 size={18} className="animate-spin text-red-600" />
                                                    ) : (
                                                        <RotateCcw size={18} className="group-hover:-rotate-180 transition-transform duration-500" />
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default ClientFinance;
