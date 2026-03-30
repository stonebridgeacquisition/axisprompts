import React, { useEffect, useState } from 'react';
import { Search, Phone, Mail, Calendar, CheckCircle, Clock, Send, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const Leads = () => {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('all'); // all, booked, pending, closed

    useEffect(() => {
        fetchLeads();
    }, []);

    const fetchLeads = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('booking_leads')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setLeads(data || []);
        } catch (err) {
            console.error('Error fetching leads:', err);
        } finally {
            setLoading(false);
        }
    };

    const toggleField = async (id, field, currentValue) => {
        const { error } = await supabase
            .from('booking_leads')
            .update({ [field]: !currentValue })
            .eq('id', id);

        if (!error) {
            setLeads(prev => prev.map(l => l.id === id ? { ...l, [field]: !currentValue } : l));
        }
    };

    const filteredLeads = leads.filter(lead => {
        const matchesSearch =
            lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            lead.phone?.includes(searchTerm);

        if (filter === 'booked') return matchesSearch && lead.booked_call;
        if (filter === 'pending') return matchesSearch && !lead.booked_call;
        if (filter === 'closed') return matchesSearch && lead.closed;
        return matchesSearch;
    });

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        const now = new Date();
        const diffMs = now - d;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHrs = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHrs < 24) return `${diffHrs}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return d.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });
    };

    const stats = {
        total: leads.length,
        booked: leads.filter(l => l.booked_call).length,
        followedUp: leads.filter(l => l.follow_up_sent).length,
        closed: leads.filter(l => l.closed).length,
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Booking Leads</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Track leads from the landing page booking form.</p>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Leads', value: stats.total, color: 'bg-gray-100 text-gray-700 dark:bg-dark-800 dark:text-gray-300' },
                    { label: 'Booked Call', value: stats.booked, color: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' },
                    { label: 'Followed Up', value: stats.followedUp, color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' },
                    { label: 'Closed', value: stats.closed, color: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400' },
                ].map((stat) => (
                    <div key={stat.label} className={`${stat.color} rounded-2xl p-4 border border-transparent`}>
                        <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">{stat.label}</p>
                        <p className="text-2xl font-bold mt-1">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Search & Filter */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by name, email, or phone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white dark:bg-dark-900 border border-gray-200 dark:border-dark-800 rounded-xl focus:outline-none focus:border-brand-500 shadow-sm dark:text-white text-sm"
                    />
                </div>
                <div className="flex items-center gap-2">
                    {['all', 'booked', 'pending', 'closed'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2.5 text-xs font-bold rounded-lg transition-all capitalize ${filter === f
                                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-md'
                                : 'bg-white dark:bg-dark-900 text-gray-500 border border-gray-200 dark:border-dark-800 hover:bg-gray-50 dark:hover:bg-dark-800'
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Leads Table */}
            {loading ? (
                <div className="text-center py-20 text-gray-500 dark:text-gray-400">Loading leads...</div>
            ) : filteredLeads.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-dark-900 rounded-2xl border border-gray-100 dark:border-dark-800">
                    <p className="text-gray-400">No leads found.</p>
                </div>
            ) : (
                <div className="bg-white dark:bg-dark-900 rounded-2xl border border-gray-200 dark:border-dark-800 overflow-hidden shadow-sm">
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-dark-800">
                                    <th className="text-left px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Lead</th>
                                    <th className="text-left px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Contact</th>
                                    <th className="text-center px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Booked</th>
                                    <th className="text-center px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Follow-up</th>
                                    <th className="text-center px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Closed</th>
                                    <th className="text-right px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-dark-800">
                                {filteredLeads.map((lead) => (
                                    <tr key={lead.id} className="hover:bg-gray-50/50 dark:hover:bg-dark-800/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center text-brand-600 dark:text-brand-400 font-bold text-sm">
                                                    {lead.name?.charAt(0)?.toUpperCase() || '?'}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{lead.name}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                                    <Mail size={12} /> {lead.email}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                                    <Phone size={12} /> {lead.phone}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => toggleField(lead.id, 'booked_call', lead.booked_call)}
                                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${lead.booked_call
                                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                    : 'bg-gray-100 text-gray-400 dark:bg-dark-800 dark:text-gray-500 hover:bg-yellow-50 hover:text-yellow-600'
                                                    }`}
                                            >
                                                {lead.booked_call ? <><CheckCircle size={10} /> Yes</> : <><Clock size={10} /> No</>}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => toggleField(lead.id, 'follow_up_sent', lead.follow_up_sent)}
                                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${lead.follow_up_sent
                                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                                    : 'bg-gray-100 text-gray-400 dark:bg-dark-800 dark:text-gray-500 hover:bg-blue-50 hover:text-blue-600'
                                                    }`}
                                            >
                                                {lead.follow_up_sent ? <><Send size={10} /> Sent</> : <><Clock size={10} /> No</>}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => toggleField(lead.id, 'closed', lead.closed)}
                                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${lead.closed
                                                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                                                    : 'bg-gray-100 text-gray-400 dark:bg-dark-800 dark:text-gray-500 hover:bg-purple-50 hover:text-purple-600'
                                                    }`}
                                            >
                                                {lead.closed ? <><CheckCircle size={10} /> Closed</> : <><XCircle size={10} /> Open</>}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-xs text-gray-400 dark:text-gray-500">{formatDate(lead.created_at)}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden divide-y divide-gray-100 dark:divide-dark-800">
                        {filteredLeads.map((lead) => (
                            <div key={lead.id} className="p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center text-brand-600 dark:text-brand-400 font-bold text-sm">
                                            {lead.name?.charAt(0)?.toUpperCase() || '?'}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900 dark:text-white text-sm">{lead.name}</p>
                                            <p className="text-xs text-gray-400">{formatDate(lead.created_at)}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-1 pl-13">
                                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                        <Mail size={12} /> {lead.email}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                        <Phone size={12} /> {lead.phone}
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => toggleField(lead.id, 'booked_call', lead.booked_call)}
                                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${lead.booked_call
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                            : 'bg-gray-100 text-gray-400 dark:bg-dark-800'
                                            }`}
                                    >
                                        {lead.booked_call ? <><CheckCircle size={10} /> Booked</> : <><Clock size={10} /> Not Booked</>}
                                    </button>
                                    <button
                                        onClick={() => toggleField(lead.id, 'follow_up_sent', lead.follow_up_sent)}
                                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${lead.follow_up_sent
                                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                            : 'bg-gray-100 text-gray-400 dark:bg-dark-800'
                                            }`}
                                    >
                                        {lead.follow_up_sent ? <><Send size={10} /> Followed Up</> : <><Clock size={10} /> No Follow-up</>}
                                    </button>
                                    <button
                                        onClick={() => toggleField(lead.id, 'closed', lead.closed)}
                                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${lead.closed
                                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                                            : 'bg-gray-100 text-gray-400 dark:bg-dark-800'
                                            }`}
                                    >
                                        {lead.closed ? <><CheckCircle size={10} /> Closed</> : <><XCircle size={10} /> Open</>}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Leads;
