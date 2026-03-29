import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';

export default function Evaluations() {
    const [clients, setClients] = useState([]);
    const [selectedBusiness, setSelectedBusiness] = useState('');
    const [simUserId, setSimUserId] = useState(`sim_${Math.floor(Math.random() * 10000)}`);
    const [sessionId, setSessionId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    
    // Evaluation Form State
    const [evalRating, setEvalRating] = useState(10);
    const [evalSummary, setEvalSummary] = useState('');
    const [evalWorked, setEvalWorked] = useState('');
    const [evalDidntWork, setEvalDidntWork] = useState('');
    const [evalProblem, setEvalProblem] = useState('');
    const [evalStatus, setEvalStatus] = useState('');

    const messagesEndRef = useRef(null);

    // Fetch clients
    useEffect(() => {
        const fetchClients = async () => {
            const { data, error } = await supabase.from('clients').select('id, business_name').order('business_name');
            if (data) setClients(data);
            if (data && data.length > 0) setSelectedBusiness(data[0].id);
        };
        fetchClients();
    }, []);

    // Fetch and poll messages
    useEffect(() => {
        if (!selectedBusiness || !simUserId) return;

        const loadSessionAndMessages = async () => {
            // Find active session
            const { data: session } = await supabase
                .from('chat_sessions')
                .select('id')
                .eq('client_id', selectedBusiness)
                .eq('whatsapp_user_id', simUserId)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (session) {
                setSessionId(session.id);
                // Load messages
                const { data: chatMsgs } = await supabase
                    .from('chat_messages')
                    .select('*')
                    .eq('session_id', session.id)
                    .order('created_at', { ascending: true });
                if (chatMsgs) {
                    // Only update if changed to avoid scroll jumping
                    setMessages(prev => JSON.stringify(prev) !== JSON.stringify(chatMsgs) ? chatMsgs : prev);
                }
            } else {
                setSessionId(null);
                setMessages([]);
            }
        };

        loadSessionAndMessages();
        const interval = setInterval(loadSessionAndMessages, 2000); // Poll every 2s
        return () => clearInterval(interval);
    }, [selectedBusiness, simUserId]);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedBusiness) return;

        const text = newMessage;
        setNewMessage('');
        setIsSending(true);

        // Optimistically add to UI
        const tempMsg = { id: 'temp', role: 'user', content: text, created_at: new Date().toISOString() };
        setMessages(prev => [...prev, tempMsg]);

        try {
            const businessName = clients.find(c => c.id === selectedBusiness)?.business_name;
            await fetch('/api/admin/simulate-message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    business_id: selectedBusiness,
                    business_name: businessName,
                    user_id: simUserId,
                    message: text
                })
            });
        } catch (error) {
            console.error('Failed to send message:', error);
        } finally {
            setIsSending(false);
        }
    };

    const handleSubmitEvaluation = async (e) => {
        e.preventDefault();
        if (!sessionId) {
            setEvalStatus('Error: No active chat session to evaluate. Send a message first.');
            return;
        }

        setEvalStatus('Saving...');
        const { error } = await supabase.from('agent_evaluations').insert({
            session_id: sessionId,
            business_id: selectedBusiness,
            rating: evalRating,
            summary: evalSummary,
            worked: evalWorked,
            didnt_work: evalDidntWork,
            problem: evalProblem
        });

        if (error) {
            console.error(error);
            setEvalStatus(`Error saving: ${error.message}`);
        } else {
            setEvalStatus('Evaluation Saved Successfully! ✅');
            // Generate new sim ID to start fresh for next eval
            setTimeout(() => {
                setEvalStatus('');
                setSimUserId(`sim_${Math.floor(Math.random() * 10000)}`);
                setEvalSummary('');
                setEvalWorked('');
                setEvalDidntWork('');
                setEvalProblem('');
                setEvalRating(10);
            }, 3000);
        }
    };

    return (
        <div className="p-6 h-[calc(100vh-80px)] overflow-hidden">
            <h1 className="text-2xl font-bold mb-6">Agent Evaluation & Simulation</h1>
            
            <div className="flex gap-6 h-full pb-10">
                {/* LEFT: Chat Interface */}
                <div className="w-1/2 flex flex-col bg-white rounded-lg shadow border border-gray-200 h-full">
                    <div className="p-4 border-b border-gray-200 bg-gray-50 flex gap-4">
                        <select 
                            className="flex-1 p-2 border rounded"
                            value={selectedBusiness}
                            onChange={e => setSelectedBusiness(e.target.value)}
                        >
                            <option value="">Select Business...</option>
                            {clients.map(c => (
                                <option key={c.id} value={c.id}>{c.business_name}</option>
                            ))}
                        </select>
                        <input 
                            type="text" 
                            className="w-1/3 p-2 border rounded font-mono text-sm"
                            value={simUserId}
                            onChange={e => setSimUserId(e.target.value)}
                            placeholder="User ID (e.g. sim_123)"
                        />
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#e5ddd5]">
                        {messages.length === 0 ? (
                            <div className="text-center text-gray-500 mt-10">
                                No messages yet. Send one to start the simulation!
                            </div>
                        ) : (
                            messages.map(msg => (
                                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] p-3 rounded-lg ${msg.role === 'user' ? 'bg-[#dcf8c6]' : 'bg-white'}`}>
                                        {msg.content}
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <form onSubmit={handleSendMessage} className="p-3 border-t bg-gray-50 flex gap-2">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={e => setNewMessage(e.target.value)}
                            className="flex-1 border p-2 rounded-full px-4 focus:outline-none focus:ring-2 focus:ring-green-400"
                            placeholder="Type a message to the agent..."
                            disabled={isSending}
                        />
                        <button 
                            type="submit" 
                            disabled={isSending || !newMessage.trim()}
                            className="bg-green-600 text-white px-6 py-2 rounded-full font-medium"
                        >
                            Send
                        </button>
                    </form>
                </div>

                {/* RIGHT: Evaluation Form */}
                <div className="w-1/2 bg-white rounded-lg shadow border border-gray-200 h-full overflow-y-auto p-6">
                    <h2 className="text-xl font-semibold mb-4 border-b pb-2">Manual Evaluation</h2>
                    <form onSubmit={handleSubmitEvaluation} className="space-y-4">
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Rating (1-10)</label>
                            <input 
                                type="number" 
                                min="1" max="10" 
                                className="w-full border rounded p-2"
                                value={evalRating}
                                onChange={e => setEvalRating(parseInt(e.target.value))}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Overall Summary</label>
                            <textarea 
                                className="w-full border rounded p-2 h-20"
                                value={evalSummary}
                                onChange={e => setEvalSummary(e.target.value)}
                                placeholder="High level summary of the conversation"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">What Worked</label>
                            <textarea 
                                className="w-full border rounded p-2 h-20"
                                value={evalWorked}
                                onChange={e => setEvalWorked(e.target.value)}
                                placeholder="What did the agent do well?"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">What Didn't Work</label>
                            <textarea 
                                className="w-full border rounded p-2 h-20"
                                value={evalDidntWork}
                                onChange={e => setEvalDidntWork(e.target.value)}
                                placeholder="What instructions did the agent fail to follow?"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">The Problem / Next Steps</label>
                            <textarea 
                                className="w-full border rounded p-2 h-20"
                                value={evalProblem}
                                onChange={e => setEvalProblem(e.target.value)}
                                placeholder="Core technical or prompt problem to fix"
                            />
                        </div>

                        <button 
                            type="submit" 
                            className="w-full bg-blue-600 text-white font-medium py-3 rounded-lg hover:bg-blue-700 transition"
                        >
                            Save Evaluation
                        </button>
                        
                        {evalStatus && (
                            <div className={`p-3 rounded text-center font-medium ${evalStatus.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                {evalStatus}
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
}
