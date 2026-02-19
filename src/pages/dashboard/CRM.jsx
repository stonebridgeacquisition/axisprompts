import React, { useEffect, useState } from 'react';
import { Search, Plus, ExternalLink, MapPin, Phone, Settings, ShoppingBag, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const CRM = () => {
    const navigate = useNavigate();
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [metrics, setMetrics] = useState({});

    useEffect(() => {
        const fetchClientsAndMetrics = async () => {
            setLoading(true);
            try {
                // 1. Fetch Clients
                const { data: clientData, error: clientError } = await supabase
                    .from('clients')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (clientError) throw clientError;

                // 2. Fetch Metrics (Grouped by Client)
                const { data: financeData, error: financeError } = await supabase
                    .from('axis_finance')
                    .select('client_id, axis_commission, total_amount')
                    .eq('status', 'completed');

                if (financeError) throw financeError;

                // Process metrics manually for flexibility
                const stats = {};
                financeData?.forEach(item => {
                    if (!stats[item.client_id]) {
                        stats[item.client_id] = { orders: 0, revenue: 0 };
                    }
                    // Count only non-subscription payments as "orders" for this view if we want
                    // But usually, any finance record is a success event
                    stats[item.client_id].orders += 1;
                    stats[item.client_id].revenue += (item.axis_commission || 0);
                });

                setClients(clientData || []);
                setMetrics(stats);
            } catch (error) {
                console.error("Error fetching CRM data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchClientsAndMetrics();
    }, []);

    const filteredClients = clients.filter(client =>
        client.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const formatCurrency = (val) => new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        minimumFractionDigits: 0
    }).format(val || 0);

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">CRM & Leads</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your onboarded clients and view their performance.</p>
                </div>
                <button
                    onClick={() => navigate('/admin/setup/new')}
                    className="px-5 py-2.5 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 hover:shadow-lg hover:shadow-brand-500/20 transition-all flex items-center gap-2"
                >
                    <Plus size={20} />
                    Onboard Client
                </button>
            </div>

            {/* Config/Search */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search by business name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white dark:bg-dark-900 border border-gray-200 dark:border-dark-800 rounded-xl focus:outline-none focus:border-brand-500 shadow-sm dark:text-white"
                    />
                </div>
            </div>

            {/* Clients Grid */}
            {loading ? (
                <div className="text-center py-20 text-gray-500">Loading clients and metrics...</div>
            ) : filteredClients.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 dark:bg-dark-900 rounded-2xl border border-gray-100 dark:border-dark-800">
                    <p className="text-gray-500 dark:text-gray-400">No clients found matching your search.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredClients.map((client) => {
                        const stat = metrics[client.id] || { orders: 0, revenue: 0 };
                        return (
                            <div key={client.id} className="bg-white dark:bg-dark-900 border border-gray-200 dark:border-dark-800 rounded-2xl p-6 hover:shadow-lg hover:border-brand-200 dark:hover:border-brand-900/50 transition-all group">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex items-center gap-4">
                                        {client.logo_url ? (
                                            <img src={client.logo_url} alt={client.business_name} className="w-14 h-14 rounded-2xl object-cover bg-gray-50 dark:bg-dark-800 border border-gray-100 dark:border-dark-700" />
                                        ) : (
                                            <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center text-brand-600 font-bold text-xl">
                                                {client.business_name.charAt(0)}
                                            </div>
                                        )}
                                        <div>
                                            <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-brand-600 transition-colors">{client.business_name}</h3>
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${client.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                                }`}>
                                                {client.status || 'Active'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase">Comm. Revenue</p>
                                        <p className="text-sm font-bold text-brand-600">{formatCurrency(stat.revenue)}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="bg-gray-50 dark:bg-dark-800/50 p-3 rounded-xl border border-gray-100 dark:border-dark-800">
                                        <div className="flex items-center gap-2 text-gray-400 mb-1">
                                            <ShoppingBag size={14} />
                                            <span className="text-[10px] font-bold uppercase">Orders</span>
                                        </div>
                                        <p className="text-lg font-bold text-gray-900 dark:text-white">{stat.orders}</p>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-dark-800/50 p-3 rounded-xl border border-gray-100 dark:border-dark-800">
                                        <div className="flex items-center gap-2 text-gray-400 mb-1">
                                            <TrendingUp size={14} />
                                            <span className="text-[10px] font-bold uppercase">Growth</span>
                                        </div>
                                        <p className="text-lg font-bold text-gray-900 dark:text-white">--</p>
                                    </div>
                                </div>

                                <div className="space-y-2 mb-4 border-t border-gray-50 dark:border-dark-800 pt-4">
                                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                        <MapPin size={14} className="shrink-0" />
                                        <span className="truncate">{client.address || 'No location set'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                        <Phone size={14} className="shrink-0" />
                                        <span className="truncate">{client.phone_number || client.team_contact || 'No contact'}</span>
                                    </div>
                                </div>

                                {/* Subscription Status Bar */}
                                <div className="mb-6">
                                    {(() => {
                                        const now = new Date();
                                        const isGrace = client.is_grace_period;
                                        const isSub = client.subscription_status === 'active';
                                        const isTrial = client.subscription_status === 'trial';

                                        let color = 'bg-gray-200 dark:bg-dark-700';
                                        let label = 'Inactive';
                                        let progress = 0;
                                        let daysRemaining = 0;

                                        if (client.payment_model === 'commission') {
                                            color = 'bg-brand-500';
                                            label = 'Commission Plan';
                                            progress = 0;
                                        } else if (isGrace) {
                                            color = 'bg-red-500';
                                            label = 'Grace Period';
                                            progress = 100;
                                        } else if (isSub && client.subscription_end_date) {
                                            color = 'bg-green-500';
                                            label = 'Subscription';
                                            const end = new Date(client.subscription_end_date);
                                            // Assume 30 day cycle if we don't have start date
                                            const start = new Date(end.getTime() - (30 * 24 * 60 * 60 * 1000));
                                            progress = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
                                            daysRemaining = Math.max(0, Math.ceil((end - now) / (24 * 60 * 60 * 1000)));
                                        } else if (isTrial && client.trial_end_date) {
                                            color = 'bg-blue-500';
                                            label = 'Free Trial';
                                            const end = new Date(client.trial_end_date);
                                            const start = new Date(client.created_at);
                                            progress = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
                                            daysRemaining = Math.max(0, Math.ceil((end - now) / (24 * 60 * 60 * 1000)));
                                        }

                                        if (isNaN(progress)) progress = 0;

                                        return (
                                            <>
                                                <div className="flex justify-between items-end mb-1.5">
                                                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isGrace ? 'text-red-500' : 'text-gray-400'}`}>
                                                        {label}
                                                    </span>
                                                    {((isSub || isTrial) && !isGrace && client.payment_model !== 'commission') && (
                                                        <span className="text-[10px] font-bold text-gray-400">
                                                            {daysRemaining} days left
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="h-1.5 w-full bg-gray-100 dark:bg-dark-800 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full transition-all duration-500 ${color}`}
                                                        style={{ width: `${client.payment_model === 'commission' ? 100 : progress}%` }}
                                                    />
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => navigate(`/admin/client/${client.id}`)}
                                        className="flex-1 px-4 py-2 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 transition-all text-sm shadow-sm"
                                    >
                                        Profile
                                    </button>
                                    <a
                                        href={`/client/${client.slug}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-4 py-2 border border-gray-200 dark:border-dark-800 text-gray-400 hover:text-brand-600 hover:border-brand-200 dark:hover:border-brand-900/50 rounded-xl transition-all"
                                    >
                                        <ExternalLink size={18} />
                                    </a>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default CRM;
