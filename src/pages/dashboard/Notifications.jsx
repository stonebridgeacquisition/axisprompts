import React, { useState, useEffect } from 'react';
import { Send, Loader2, Bell, Check, Users, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const Notifications = () => {
    const [clients, setClients] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    // Form
    const [selectedClient, setSelectedClient] = useState('');
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [clientsRes, notifsRes] = await Promise.all([
                supabase.from('clients').select('id, business_name').order('business_name'),
                supabase.from('notifications').select('*, clients(business_name)').order('created_at', { ascending: false }).limit(50)
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
            const { error } = await supabase.from('notifications').insert({
                client_id: selectedClient === 'all' ? null : selectedClient,
                title: title.trim(),
                message: message.trim()
            });

            // If "all clients" selected, insert one for each client
            if (selectedClient === 'all') {
                const rows = clients.map(c => ({
                    client_id: c.id,
                    title: title.trim(),
                    message: message.trim()
                }));
                const { error: bulkErr } = await supabase.from('notifications').insert(rows);
                if (bulkErr) throw bulkErr;
            } else {
                if (error) throw error;
            }

            setTitle('');
            setMessage('');
            setSelectedClient('');
            fetchData();
        } catch (err) {
            console.error('Error sending notification:', err);
            alert('Failed to send notification');
        } finally {
            setSending(false);
        }
    };

    const formatDate = (d) => new Date(d).toLocaleDateString('en-NG', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
                <p className="text-gray-500">Send notifications to your clients.</p>
            </div>

            {/* Send Form */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Send size={18} className="text-brand-600" />
                    Send Notification
                </h3>
                <form onSubmit={handleSend} className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Recipient</label>
                        <select
                            value={selectedClient}
                            onChange={(e) => setSelectedClient(e.target.value)}
                            required
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm bg-white"
                        >
                            <option value="">Select a client...</option>
                            <option value="all">📢 All Clients</option>
                            {clients.map(c => (
                                <option key={c.id} value={c.id}>{c.business_name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. System Maintenance Notice"
                            required
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Message</label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Write your notification message..."
                            rows={4}
                            required
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm resize-none"
                        />
                    </div>
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={sending || !selectedClient || !title.trim() || !message.trim()}
                            className="px-6 py-2.5 bg-brand-600 text-white rounded-lg font-bold hover:bg-brand-700 transition-colors flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-brand-500/20"
                        >
                            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                            {sending ? 'Sending...' : 'Send Notification'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Sent History */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900">Sent Notifications</h3>
                </div>
                {loading ? (
                    <div className="p-12 text-center text-gray-500">
                        <Loader2 className="animate-spin mx-auto mb-2 text-brand-600" size={24} />
                        Loading...
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="p-12 text-center text-gray-400">
                        No notifications sent yet.
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {notifications.map((n) => (
                            <div key={n.id} className="p-5 hover:bg-gray-50 transition-colors">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex gap-3 items-start">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center mt-0.5 ${n.is_read ? 'bg-gray-100 text-gray-400' : 'bg-brand-50 text-brand-600'}`}>
                                            {n.is_read ? <Check size={14} /> : <Bell size={14} />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">{n.title}</p>
                                            <p className="text-sm text-gray-500 mt-0.5">{n.message}</p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className="text-xs text-gray-400">{formatDate(n.created_at)}</span>
                                                <span className="text-xs text-gray-300">•</span>
                                                <span className="text-xs font-medium text-gray-500">
                                                    {n.clients?.business_name || 'All Clients'}
                                                </span>
                                                {n.is_read && (
                                                    <span className="text-xs bg-green-50 text-green-600 px-1.5 py-0.5 rounded-full font-medium">Read</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Notifications;
