import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                        {/* Total Revenue */}
                        <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col justify-center shadow-sm relative overflow-hidden">
                            <div className="flex flex-col mb-4">
                                <p className="text-sm font-medium text-gray-400 mb-1">Total Revenue</p>
                                <h3 className="text-4xl font-extrabold text-gray-900 tracking-tight">{formatCurrency(stats.totalRevenue)}</h3>
                            </div>
                            <div className="flex items-center text-sm mt-auto pt-4 border-t border-gray-50">
                                <span className="font-medium text-brand-600">
                                    {stats.paidOrders} paid orders
                                </span>
                            </div>
                        </div>

                        {/* Paid Orders */}
                        <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col justify-center shadow-sm">
                            <div className="flex flex-col mb-4">
                                <p className="text-sm font-medium text-gray-400 mb-1">Paid Orders</p>
                                <h3 className="text-4xl font-extrabold text-gray-900 tracking-tight">{stats.paidOrders}</h3>
                            </div>
                            <div className="flex items-center text-sm mt-auto pt-4 border-t border-gray-50">
                                <span className="text-gray-500 font-medium">Successfully completed</span>
                            </div>
                        </div>

                        {/* Pending Orders */}
                        <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col justify-center shadow-sm">
                            <div className="flex flex-col mb-4">
                                <p className="text-sm font-medium text-gray-400 mb-1">Pending Orders</p>
                                <h3 className="text-4xl font-extrabold text-gray-900 tracking-tight">{stats.pendingOrders}</h3>
                            </div>
                            <div className="flex items-center text-sm mt-auto pt-4 border-t border-gray-50">
                                <span className="text-gray-500 font-medium">Waiting for payment</span>
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
                                    <div key={order.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-gray-50 dark:hover:bg-dark-800 transition-colors gap-4 group border-b border-gray-100 dark:border-dark-800/50 last:border-0 relative">

                                        {/* Left: Details */}
                                        <div className="flex items-start gap-4 flex-1 min-w-0">
                                            <div className="min-w-0 flex-1 flex flex-col justify-center">
                                                <div className="flex items-center justify-between sm:justify-start gap-2 mb-1">
                                                    <p className="font-bold text-gray-900 dark:text-white truncate text-base">
                                                        {order.customer_name || 'Customer'}
                                                    </p>
                                                    {/* Amount shows here on mobile next to name, instead of bottom */}
                                                    <p className={`font-bold sm:hidden text-base shrink-0 ${order.payment_status === 'Refunded' ? 'text-gray-400 line-through'
                                                        : order.payment_status === 'Paid' ? 'text-gray-900 dark:text-gray-100'
                                                            : 'text-orange-600 dark:text-orange-400'
                                                        }`}>
                                                        {formatCurrency(order.total_amount || 0)}
                                                    </p>
                                                </div>

                                                <p className="text-sm text-gray-500 dark:text-gray-400 truncate mb-2 line-clamp-1 pr-2">
                                                    {order.items_summary || 'Order'}
                                                </p>

                                                <div className="flex flex-wrap items-center gap-2 text-[11px] sm:text-xs text-gray-400 font-medium">
                                                    <p>{formatDate(order.created_at)}</p>
                                                    {order.paystack_reference && (
                                                        <>
                                                            <span className="hidden sm:inline text-gray-300 dark:text-gray-700">•</span>
                                                            <span className="text-gray-400 tracking-wider text-[10px]">REF: {order.paystack_reference.slice(0, 8)}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right: Amount & Status (Desktop) / Status & Action (Mobile) */}
                                        <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 pt-3 sm:pt-0 border-t border-gray-100 dark:border-dark-800 sm:border-0 mt-2 sm:mt-0">
                                            <div className="text-left sm:text-right flex items-center sm:block gap-3">
                                                <p className={`hidden sm:block font-bold text-lg mb-1 ${order.payment_status === 'Refunded' ? 'text-gray-400 line-through'
                                                    : order.payment_status === 'Paid' ? 'text-gray-900 dark:text-white'
                                                        : 'text-orange-600'
                                                    }`}>
                                                    {formatCurrency(order.total_amount || 0)}
                                                </p>
                                                <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md inline-block ${order.payment_status === 'Refunded' ? 'bg-gray-100 text-gray-500 dark:bg-dark-800 dark:text-gray-400' :
                                                    order.status === 'Delivered' ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' :
                                                        order.status === 'In Progress' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' :
                                                            'bg-gray-100 text-gray-600 dark:bg-dark-800 dark:text-gray-400'
                                                    }`}>
                                                    {order.payment_status === 'Refunded' ? 'Refunded' : order.status}
                                                </span>
                                            </div>

                                            {/* Refund Button */}
                                            {order.payment_status === 'Paid' && order.paystack_reference && (
                                                <button
                                                    onClick={() => handleRefund(order)}
                                                    disabled={refundingId === order.id}
                                                    className="px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-50 sm:bg-transparent text-gray-600 hover:text-red-700 hover:bg-red-50 dark:bg-dark-800 sm:dark:bg-transparent dark:hover:bg-red-900/30 rounded-lg transition-all disabled:opacity-50 shrink-0 border border-gray-200 sm:border-gray-200 dark:border-dark-700 ml-auto flex items-center gap-1.5"
                                                    title="Process Refund"
                                                >
                                                    {refundingId === order.id ? (
                                                        <Loader2 size={14} className="animate-spin text-red-600" />
                                                    ) : (
                                                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Refund</span>
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
