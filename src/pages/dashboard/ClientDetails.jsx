import React, { useEffect, useState } from 'react';
import { ChevronLeft, ExternalLink, Power, CreditCard, BookOpen, MapPin, Phone, Utensils, FileText, Loader2, Mail, Clock, ShieldCheck } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const ClientDetails = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [client, setClient] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchClientDetails = async () => {
            try {
                const { data, error } = await supabase
                    .from('clients')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error) throw error;
                setClient(data);
            } catch (error) {
                console.error("Error fetching client details:", error);
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchClientDetails();
    }, [id]);

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <Loader2 className="animate-spin text-brand-600" size={32} />
            </div>
        );
    }

    if (!client) {
        return (
            <div className="text-center py-20 text-gray-500">
                Client not found.
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/admin/crm')}
                    className="p-2 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-gray-200 text-gray-500"
                >
                    <ChevronLeft size={20} />
                </button>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-gray-900">{client.business_name}</h1>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${client.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                            {client.status || 'Active'}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                        <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">/{client.slug}</span>
                        <span>•</span>
                        <a href={`/client/${client.slug}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-brand-600 transition-colors">
                            View Dashboard <ExternalLink size={12} />
                        </a>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Left Column: Core Info */}
                <div className="md:col-span-2 space-y-6">

                    {/* Bank Details */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 relative overflow-hidden group">
                        <div className="flex items-center gap-2 mb-4 text-brand-600">
                            <CreditCard size={20} />
                            <h3 className="text-lg font-bold text-gray-900">Bank Information</h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Account Name</p>
                                <p className="mt-1 text-sm font-medium text-gray-900 bg-gray-50 p-2 rounded-lg border border-gray-100">{client.account_name || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Bank Name</p>
                                <p className="mt-1 text-sm font-medium text-gray-900 bg-gray-50 p-2 rounded-lg border border-gray-100">{client.bank_name || 'N/A'}</p>
                            </div>
                            <div className="sm:col-span-2">
                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Account Number</p>
                                <p className="mt-1 text-xl font-mono font-bold text-gray-900 tracking-wider bg-gray-50 p-3 rounded-lg border border-gray-100 inline-block">{client.account_number || 'N/A'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Knowledge Base */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                        <div className="flex items-center gap-2 mb-4 text-brand-600">
                            <BookOpen size={20} />
                            <h3 className="text-lg font-bold text-gray-900">Agent Knowledge Base</h3>
                        </div>
                        <div className="space-y-4">
                            <div className="flex gap-3 items-start p-3 rounded-xl bg-gray-50/50">
                                <MapPin size={18} className="text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase">Physical Address</p>
                                    <p className="text-sm text-gray-900">{client.address || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="flex gap-3 items-start p-3 rounded-xl bg-gray-50/50">
                                <Utensils size={18} className="text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase">Cuisine Type</p>
                                    <p className="text-sm text-gray-900">{client.cuisine || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="flex gap-3 items-start p-3 rounded-xl bg-gray-50/50">
                                <Phone size={18} className="text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase">Team Contact</p>
                                    <p className="text-sm text-gray-900 font-mono">{client.team_contact || client.phone_number || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="flex gap-3 items-start p-3 rounded-xl bg-gray-50/50">
                                <Mail size={18} className="text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase">Email Address</p>
                                    <p className="text-sm text-gray-900 font-mono">{client.email || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="flex gap-3 items-start p-3 rounded-xl bg-gray-50/50">
                                <Clock size={18} className="text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase">Opening Hours</p>
                                    <p className="text-sm text-gray-900">{client.opening_hours || 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Menu */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-gray-900 font-bold">
                            <FileText size={20} className="text-brand-600" />
                            Active Menu
                        </div>
                        {client.menu_url ? (
                            <a
                                href={client.menu_url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                            >
                                View Menu File <ExternalLink size={14} />
                            </a>
                        ) : (
                            <span className="text-gray-400 text-sm">No menu uploaded</span>
                        )}
                    </div>
                </div>

                {/* Sidebar Actions */}
                <div className="space-y-4">
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sticky top-24">
                        <h4 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider text-xs">Quick Actions</h4>

                        {/* Subscription Management */}
                        <div className="mb-6 pb-6 border-b border-gray-100">
                            <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Subscription Status</label>
                            <select
                                value={client.subscription_status || 'trial'}
                                onChange={async (e) => {
                                    const newStatus = e.target.value;
                                    if (confirm(`Change subscription status to ${newStatus}?`)) {
                                        const { error } = await supabase
                                            .from('clients')
                                            .update({ subscription_status: newStatus })
                                            .eq('id', client.id);

                                        if (!error) {
                                            setClient({ ...client, subscription_status: newStatus });
                                            // Also update main status if needed
                                            if (newStatus === 'expired' || newStatus === 'inactive') {
                                                await supabase.from('clients').update({ status: 'Inactive' }).eq('id', client.id);
                                                setClient(prev => ({ ...prev, status: 'Inactive', subscription_status: newStatus }));
                                            } else if (newStatus === 'active') {
                                                await supabase.from('clients').update({ status: 'Active' }).eq('id', client.id);
                                                setClient(prev => ({ ...prev, status: 'Active', subscription_status: newStatus }));
                                            }
                                        }
                                    }
                                }}
                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
                            >
                                <option value="trial">Trial</option>
                                <option value="active">Active (Paid)</option>
                                <option value="inactive">Inactive</option>
                                <option value="expired">Expired</option>
                            </select>
                            <p className="text-xs text-gray-400 mt-2 leading-tight">
                                Manually override the subscription status. 'Active' enables full access. 'Expired' blocks access.
                            </p>
                        </div>

                        <h4 className="text-sm font-bold text-gray-900 mb-2 uppercase tracking-wider text-xs">Account Status</h4>
                        <div className="space-y-2">
                            <button
                                onClick={async () => {
                                    const isActive = (client.status || 'Active') === 'Active';
                                    const newStatus = isActive ? 'Inactive' : 'Active';
                                    if (!window.confirm(`${isActive ? 'Deactivate' : 'Reactivate'} ${client.business_name}?`)) return;
                                    const { error } = await supabase
                                        .from('clients')
                                        .update({ status: newStatus })
                                        .eq('id', client.id);
                                    if (error) {
                                        console.error('Error updating status:', error);
                                        alert('Failed to update status');
                                    } else {
                                        setClient({ ...client, status: newStatus });
                                    }
                                }}
                                className={`w-full py-2.5 px-3 text-sm font-medium rounded-lg text-left transition-colors flex items-center gap-2 group ${(client.status || 'Active') === 'Active'
                                    ? 'bg-white border border-red-200 hover:bg-red-50 text-red-600'
                                    : 'bg-green-50 border border-green-200 hover:bg-green-100 text-green-700'
                                    }`}
                            >
                                <Power size={16} />
                                {(client.status || 'Active') === 'Active' ? 'Deactivate Account' : 'Reactivate Account'}
                            </button>
                        </div>
                        <p className="text-xs text-gray-400 mt-4 leading-relaxed">
                            {(client.status || 'Active') === 'Active'
                                ? "Deactivating will immediately disable the client's dashboard and pause all agent activity."
                                : "This client is currently inactive. Reactivate to restore dashboard access and agent activity."
                            }
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ClientDetails;
