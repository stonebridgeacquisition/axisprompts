import React, { useEffect, useState } from 'react';
import { Search, Plus, ExternalLink, MapPin, Phone, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const CRM = () => {
    const navigate = useNavigate();
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchClients = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error("Error fetching clients:", error);
            } else {
                setClients(data || []);
            }
            setLoading(false);
        };

        fetchClients();
    }, []);

    const filteredClients = clients.filter(client =>
        client.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">CRM & Leads</h1>
                    <p className="text-gray-500 mt-1">Manage your onboarded clients and view their statuses.</p>
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
                        placeholder="Search clients..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 shadow-sm"
                    />
                </div>
            </div>

            {/* Clients Grid */}
            {loading ? (
                <div className="text-center py-20 text-gray-500">Loading clients...</div>
            ) : filteredClients.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-gray-500">No clients found. Send an invite to onboard one!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredClients.map((client) => (
                        <div key={client.id} className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md transition-shadow group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    {client.logo_url ? (
                                        <img src={client.logo_url} alt={client.business_name} className="w-12 h-12 rounded-xl object-cover bg-gray-50" />
                                    ) : (
                                        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 font-bold text-lg">
                                            {client.business_name.charAt(0)}
                                        </div>
                                    )}
                                    <div>
                                        <h3 className="font-bold text-gray-900 group-hover:text-brand-600 transition-colors">{client.business_name}</h3>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${client.status === 'Active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                                            }`}>
                                            {client.status || 'Active'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3 mb-6">
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <MapPin size={16} />
                                    <span className="truncate">{client.address || 'No address'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <Phone size={16} />
                                    <span className="truncate">{client.phone_number || client.team_contact || 'No contact'}</span>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => navigate(`/admin/client/${client.id}`)}
                                    className="flex-1 px-4 py-2 bg-gray-50 text-gray-700 font-bold rounded-lg hover:bg-gray-100 transition-colors text-sm"
                                >
                                    View Details
                                </button>
                                <a
                                    href={`/client/${client.slug}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-4 py-2 border border-gray-200 text-gray-400 rounded-lg hover:text-brand-600 hover:border-brand-200 transition-colors"
                                >
                                    <ExternalLink size={18} />
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CRM;
