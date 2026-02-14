import React, { useState, useEffect } from 'react';
import { Search, ChevronDown, CheckCircle, Truck, Package, Clock, Loader2, RefreshCw } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const StatusBadge = ({ status }) => {
    const styles = {
        'In Progress': 'bg-blue-50 text-blue-700 ring-blue-600/20',
        'Out for Delivery': 'bg-orange-50 text-orange-700 ring-orange-600/20',
        'Delivered': 'bg-green-50 text-green-700 ring-green-600/20',
        'Cancelled': 'bg-red-50 text-red-700 ring-red-600/20',
    };

    const icon = {
        'In Progress': Clock,
        'Out for Delivery': Truck,
        'Delivered': CheckCircle,
    }[status] || Package;

    const IconComponent = icon;

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset ${styles[status] || 'bg-gray-50 text-gray-600 ring-gray-500/10'}`}>
            <IconComponent size={12} />
            {status}
        </span>
    );
};

const OrderDetailsModal = ({ order, onClose }) => {
    if (!order) return null;

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">
                            Order #{order.order_id || order.id.slice(0, 8)}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                            Placed on {new Date(order.created_at).toLocaleString()}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                    >
                        <ChevronDown className="rotate-180" size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-8">
                    {/* Status & Payment */}
                    <div className="flex flex-wrap gap-4">
                        <div className="flex-1 min-w-[200px] p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Order Status</span>
                            <StatusBadge status={order.status} />
                        </div>
                        <div className="flex-1 min-w-[200px] p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Payment</span>
                            <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 rounded-md text-xs font-bold ${order.payment_status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                    }`}>
                                    {order.payment_status || 'Pending'}
                                </span>
                                <span className="text-sm text-gray-600">
                                    via {order.payment_method || 'Paystack'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Customer Info */}
                    <div>
                        <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">Customer Details</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <label className="text-xs text-gray-500 block mb-1">Name</label>
                                <p className="font-medium text-gray-900">{order.customer_name}</p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 block mb-1">Phone</label>
                                <p className="font-medium text-gray-900">{order.customer_phone}</p>
                            </div>
                            <div className="sm:col-span-2">
                                <label className="text-xs text-gray-500 block mb-1">Delivery Address</label>
                                <div className="flex items-start gap-2 bg-gray-50 p-3 rounded-lg text-sm text-gray-700 border border-gray-200">
                                    <Truck size={16} className="mt-0.5 text-gray-400" />
                                    {order.delivery_address || 'No address provided (Pickup or Dine-in)'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Order Items */}
                    <div>
                        <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">Order Items</h4>
                        <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                            <div className="p-4 space-y-3">
                                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                                    {/* Handle both JSON array string and plain text summary */}
                                    {typeof order.items_summary === 'string' && order.items_summary.startsWith('[')
                                        ? JSON.parse(order.items_summary).map((item, idx) => (
                                            <div key={idx} className="flex justify-between py-1 border-b border-gray-200 last:border-0">
                                                <span>{item.quantity}x {item.name}</span>
                                                <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
                                            </div>
                                        ))
                                        : order.items_summary}
                                </p>
                            </div>
                            <div className="bg-gray-100 p-4 flex justify-between items-center border-t border-gray-200">
                                <span className="font-bold text-gray-900">Total Amount</span>
                                <span className="text-lg font-bold text-brand-700">{formatCurrency(order.total_amount)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        Close Details
                    </button>
                </div>
            </div>
        </div>
    );
};

const ClientOrders = () => {
    const { client } = useOutletContext();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [updatingId, setUpdatingId] = useState(null);
    const [selectedOrder, setSelectedOrder] = useState(null);

    useEffect(() => {
        if (client?.id) fetchOrders();
    }, [client?.id]);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .eq('client_id', client.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setOrders(data || []);
        } catch (error) {
            console.error("Error fetching orders:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (e, id, newStatus) => {
        e.stopPropagation(); // Prevent row click
        setUpdatingId(id);
        try {
            const { error } = await supabase
                .from('orders')
                .update({ status: newStatus })
                .eq('id', id);

            if (error) throw error;

            // Optimistic update
            setOrders(orders.map(order =>
                order.id === id ? { ...order, status: newStatus } : order
            ));
        } catch (error) {
            console.error("Error updating status:", error);
            alert("Failed to update order status.");
        } finally {
            setUpdatingId(null);
        }
    };

    const filteredOrders = orders.filter(order =>
        (order.order_id && order.order_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (order.customer_name && order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Format items summary from JSON or Text
    const formatItems = (items) => {
        if (!items) return "No items";
        if (Array.isArray(items)) {
            return items.map(i => `${i.quantity}x ${i.name}`).join(", ");
        }
        return items; // Fallback if it's simple text
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Orders</h2>
                    <p className="text-gray-500">Manage and track your delivery status.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={fetchOrders}
                        className="px-4 py-2 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/20 flex items-center gap-2"
                    >
                        <RefreshCw size={16} className={loading && !orders.length ? "animate-spin" : ""} />
                        Refresh Orders
                    </button>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                {/* Search Bar */}
                <div className="p-4 border-b border-gray-200 flex items-center gap-4 bg-gray-50/50">
                    <div className="relative flex-1 max-w-md">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by Order ID or Customer..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 w-full rounded-lg border border-gray-300 focus:outline-none focus:border-brand-500 text-sm"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto min-h-[400px]">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Order ID</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Customer</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Delivery Address</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Items Ordered</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Total</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading && orders.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                                        <Loader2 className="animate-spin mx-auto mb-2 text-brand-600" size={24} />
                                        Loading orders...
                                    </td>
                                </tr>
                            ) : filteredOrders.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                                        No recent orders found.
                                    </td>
                                </tr>
                            ) : (
                                filteredOrders.map((order) => (
                                    <tr
                                        key={order.id}
                                        onClick={() => setSelectedOrder(order)}
                                        className="hover:bg-gray-50 transition-colors group cursor-pointer"
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            #{order.order_id ? order.order_id : order.id.slice(0, 6)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{order.customer_name}</div>
                                            <div className="text-xs text-gray-500">{order.customer_phone}</div>
                                            <div className="text-xs text-gray-400">{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={order.delivery_address}>
                                            {order.delivery_address || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                                            {formatItems(order.items_summary)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                                            ₦{order.total_amount ? Number(order.total_amount).toLocaleString() : '0'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {updatingId === order.id ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                                    <Loader2 size={12} className="animate-spin" /> Updating...
                                                </span>
                                            ) : (
                                                <StatusBadge status={order.status} />
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm" onClick={(e) => e.stopPropagation()}>
                                            <div className="relative inline-block text-left group/action">
                                                <button className="text-brand-600 hover:text-brand-800 font-medium text-xs border border-brand-200 bg-brand-50 px-3 py-1.5 rounded-lg transition-colors flex items-center justify-end gap-1 ml-auto">
                                                    Update Status <ChevronDown size={14} />
                                                </button>

                                                {/* Dropdown */}
                                                <div className="hidden group-hover/action:block absolute right-0 mt-1 w-40 rounded-lg shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20 p-1">
                                                    {['In Progress', 'Out for Delivery', 'Delivered', 'Cancelled'].map((status) => (
                                                        <button
                                                            key={status}
                                                            onClick={(e) => handleStatusUpdate(e, order.id, status)}
                                                            className={`block w-full text-left px-4 py-2 text-xs rounded-md ${order.status === status ? 'bg-gray-100 font-bold text-gray-900' : 'text-gray-700 hover:bg-gray-50'}`}
                                                        >
                                                            {status}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Order Details Modal */}
            {selectedOrder && (
                <OrderDetailsModal
                    order={selectedOrder}
                    onClose={() => setSelectedOrder(null)}
                />
            )}
        </div>
    );
};

export default ClientOrders;
