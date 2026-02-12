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

const ClientOrders = () => {
    const { client } = useOutletContext();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [updatingId, setUpdatingId] = useState(null);

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

    const handleStatusUpdate = async (id, newStatus) => {
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
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Items Ordered</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Total</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading && orders.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                        <Loader2 className="animate-spin mx-auto mb-2 text-brand-600" size={24} />
                                        Loading orders...
                                    </td>
                                </tr>
                            ) : filteredOrders.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                        No recent orders found.
                                    </td>
                                </tr>
                            ) : (
                                filteredOrders.map((order) => (
                                    <tr key={order.id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            #{order.order_id ? order.order_id : order.id.slice(0, 6)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{order.customer_name}</div>
                                            <div className="text-xs text-gray-500">{order.customer_phone}</div>
                                            <div className="text-xs text-gray-400">{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
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
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                            <div className="relative inline-block text-left group/action">
                                                <button className="text-brand-600 hover:text-brand-800 font-medium text-xs border border-brand-200 bg-brand-50 px-3 py-1.5 rounded-lg transition-colors flex items-center justify-end gap-1 ml-auto">
                                                    Update Status <ChevronDown size={14} />
                                                </button>

                                                {/* Dropdown */}
                                                <div className="hidden group-hover/action:block absolute right-0 mt-1 w-40 rounded-lg shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20 p-1">
                                                    {['In Progress', 'Out for Delivery', 'Delivered', 'Cancelled'].map((status) => (
                                                        <button
                                                            key={status}
                                                            onClick={() => handleStatusUpdate(order.id, status)}
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
        </div>
    );
};

export default ClientOrders;
