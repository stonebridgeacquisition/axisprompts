import React, { useState, useEffect } from 'react';
import {
    Send,
    Loader2,
    Bell,
    Check,
    Users,
    ChevronDown,
    Activity,
    Megaphone,
    Wallet,
    CreditCard,
    ShoppingBag,
    Trash2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

const Notifications = () => {
    const [clients, setClients] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [activeTab, setActiveTab] = useState('announcements'); // announcements or activity

    // Form
    const [selectedClient, setSelectedClient] = useState('');
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [clientsRes, notifsRes] = await Promise.all([
                supabase.from('clients').select('id, business_name').order('business_name'),
                supabase.from('notifications')
                    .select('*, clients(business_name)')
                    .eq('is_system', activeTab === 'activity')
                    .order('created_at', { ascending: false })
                    .limit(50)
            ]);
            setClients(clientsRes.data || []);
            setNotifications(notifsRes.data || []);
        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!selectedClient || !title.trim() || !message.trim()) return;
        setSending(true);
        try {
            // If "all clients" selected, insert one for each client
            if (selectedClient === 'all') {
                const rows = clients.map(c => ({
                    client_id: c.id,
                    title: title.trim(),
                    message: message.trim(),
                    is_system: false
                }));
                const { error: bulkErr } = await supabase.from('notifications').insert(rows);
                if (bulkErr) throw bulkErr;
            } else {
                const { error } = await supabase.from('notifications').insert({
                    client_id: selectedClient,
                    title: title.trim(),
                    message: message.trim(),
                    is_system: false
                });
                if (error) throw error;
            }

            setTitle('');
            setMessage('');
            setSelectedClient('');
            if (activeTab === 'announcements') fetchData();
            else setActiveTab('announcements');
        } catch (err) {
            console.error('Error sending notification:', err);
            alert('Failed to send notification');
        } finally {
            setSending(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this activity record?')) return;
        const { error } = await supabase.from('notifications').delete().eq('id', id);
        if (!error) {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }
    };

    const formatDate = (d) => new Date(d).toLocaleDateString('en-NG', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const getActivityIcon = (type) => {
        switch (type) {
            case 'payment': return <CreditCard size={16} className="text-green-600" />;
            case 'user': return <Users size={16} className="text-blue-600" />;
            case 'order': return <ShoppingBag size={16} className="text-orange-600" />;
            default: return <Activity size={16} className="text-brand-600" />;
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Announcements & Activity</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Monitor platform events and communicate with clients.</p>
                </div>

                {/* Tab Switcher */}
                <div className="flex bg-gray-100 dark:bg-dark-800 p-1 rounded-xl w-fit">
                    <button
                        onClick={() => setActiveTab('announcements')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'announcements' ? 'bg-white dark:bg-dark-700 text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <Megaphone size={16} />
                        Announcements
                    </button>
                    <button
                        onClick={() => setActiveTab('activity')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'activity' ? 'bg-white dark:bg-dark-700 text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <Activity size={16} />
                        Activity Log
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Send Form (Only on Announcements tab mainly, but kept for convenience) */}
                <div className="lg:col-span-1 border-r border-gray-100 dark:border-dark-800 lg:pr-6 space-y-6">
                    <div className="bg-white dark:bg-dark-900 rounded-2xl border border-gray-200 dark:border-dark-800 shadow-sm p-6 overflow-hidden relative">
                        {/* Decorative Background */}
                        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-brand-50 dark:bg-brand-900/10 rounded-full blur-3xl opacity-50" />

                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Send size={18} className="text-brand-600" />
                            Notify Clients
                        </h3>
                        <form onSubmit={handleSend} className="space-y-4 relative">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Recipient</label>
                                <select
                                    value={selectedClient}
                                    onChange={(e) => setSelectedClient(e.target.value)}
                                    required
                                    className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-dark-700 dark:bg-dark-800 text-sm focus:outline-none focus:border-brand-500 dark:text-white transition-colors"
                                >
                                    <option value="">Select client...</option>
                                    <option value="all">📢 All Clients</option>
                                    {clients.map(c => (
                                        <option key={c.id} value={c.id}>{c.business_name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Title</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Quick update..."
                                    required
                                    className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-dark-700 dark:bg-dark-800 text-sm focus:outline-none focus:border-brand-500 dark:text-white transition-colors"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Message</label>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Tell them something..."
                                    rows={3}
                                    required
                                    className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-dark-700 dark:bg-dark-800 text-sm focus:outline-none focus:border-brand-500 dark:text-white transition-colors resize-none"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={sending || !selectedClient || !title.trim() || !message.trim()}
                                className="w-full py-2.5 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-brand-500/20 active:scale-[0.98]"
                            >
                                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                {sending ? 'Sending...' : 'Broadcast'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Right Column: List */}
                <div className="lg:col-span-2">
                    <div className="bg-white dark:bg-dark-900 rounded-2xl border border-gray-200 dark:border-dark-800 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-dark-800 bg-gray-50/50 dark:bg-dark-900/50 flex items-center justify-between">
                            <h3 className="font-bold text-gray-900 dark:text-white">
                                {activeTab === 'announcements' ? 'Outbox' : 'Platform Events'}
                            </h3>
                            <span className="text-xs text-gray-400 font-medium">{notifications.length} records</span>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            {loading ? (
                                <div className="p-12 text-center text-gray-500">
                                    <Loader2 className="animate-spin mx-auto mb-2 text-brand-600" size={24} />
                                    Loading activity...
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="p-12 text-center text-gray-400">
                                    <div className="w-16 h-16 bg-gray-50 dark:bg-dark-800 rounded-full flex items-center justify-center mx-auto mb-4 grayscale opacity-50">
                                        <Bell size={24} />
                                    </div>
                                    <p>No {activeTab} history found.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-50 dark:divide-dark-800">
                                    <AnimatePresence mode="popLayout">
                                        {notifications.map((n) => (
                                            <motion.div
                                                layout
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                key={n.id}
                                                className="p-5 hover:bg-gray-50/80 dark:hover:bg-dark-800/50 transition-colors group"
                                            >
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex gap-4 items-start">
                                                        <div className={`mt-1 w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${activeTab === 'activity' ? 'bg-white dark:bg-dark-800 border border-gray-100 dark:border-dark-700' : 'bg-brand-50 dark:bg-brand-900/20 text-brand-600'
                                                            }`}>
                                                            {activeTab === 'activity' ? getActivityIcon(n.type) : <Megaphone size={18} />}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{n.title}</p>
                                                                {activeTab === 'activity' && (
                                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full uppercase font-bold tracking-tight ${n.type === 'payment' ? 'bg-green-100 text-green-700' :
                                                                            n.type === 'user' ? 'bg-blue-100 text-blue-700' :
                                                                                'bg-orange-100 text-orange-700'
                                                                        }`}>
                                                                        {n.type || 'system'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{n.message}</p>
                                                            <div className="flex items-center gap-3 mt-3">
                                                                <span className="text-[11px] text-gray-400 font-medium">{formatDate(n.created_at)}</span>
                                                                {activeTab === 'announcements' && (
                                                                    <>
                                                                        <span className="w-1 h-1 bg-gray-300 rounded-full" />
                                                                        <span className="text-[11px] font-bold text-brand-600/70">
                                                                            {n.clients?.business_name || 'All Clients'}
                                                                        </span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={() => handleDelete(n.id)}
                                                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Notifications;
