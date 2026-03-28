import React, { useState, useEffect } from 'react';
import { ChevronLeft, Link as LinkIcon, Copy, Check, User, Users, Shield, Mail, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const SetupDashboard = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('general');
    const [copied, setCopied] = useState(false);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [accessCode, setAccessCode] = useState('');
    const [savingCode, setSavingCode] = useState(false);
    
    // AI Prompt State
    const [agentPrompt, setAgentPrompt] = useState('');
    const [savingPrompt, setSavingPrompt] = useState(false);

    // Mock Team Data (Replace with DB fetch later)
    const [teamMembers, setTeamMembers] = useState([
        { id: 1, name: 'You', email: '', role: 'Owner', status: 'Active' },
    ]);

    useEffect(() => {
        const fetchUserAndTeam = async () => {
            // 1. Get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUser(user);
            }

            // 2. Mock others? or fetch from admin_users table
            const { data: admins, error } = await supabase
                .from('admin_users')
                .select('*');

            if (!error && admins) {
                // Map DB users to UI format
                // Note: supabase.auth.users() is not accessible from client. 
                // So 'admin_users' table should ideally have 'email' and 'name' columns sync'd.
                const mappedAdmins = admins.map(admin => ({
                    id: admin.id,
                    name: admin.email.split('@')[0], // Fallback name
                    email: admin.email,
                    role: admin.role || 'Admin',
                    status: 'Active'
                }));
                setTeamMembers(mappedAdmins);
            }

            // 3. Get platform settings (access code & prompt)
            const { data: settings, error: settingsError } = await supabase
                .from('platform_settings')
                .select('key, value');

            if (!settingsError && settings) {
                const codeSetting = settings.find(s => s.key === 'onboarding_access_code');
                const promptSetting = settings.find(s => s.key === 'universal_agent_prompt');
                
                if (codeSetting) setAccessCode(codeSetting.value);
                if (promptSetting) setAgentPrompt(promptSetting.value);
            }

            setLoading(false);
        };
        fetchUserAndTeam();
    }, []);

    // The Onboarding Link
    const onboardingLink = "https://app.swiftorderai.com/onboarding";

    const handleCopy = () => {
        navigator.clipboard.writeText(onboardingLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleInvite = async () => {
        const email = prompt("Enter team member's email address:");
        if (!email) return;

        try {
            setLoading(true);
            const { data, error } = await supabase.functions.invoke('invite-admin', {
                body: { email }
            });

            if (error) throw error;

            alert('Invitation sent successfully!');
            // Refresh to show new user
            window.location.reload();
        } catch (err) {
            console.error('Invite error:', err);
            alert('Failed to send invite: ' + (err.message || 'Unknown error'));
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateCode = async () => {
        if (!accessCode) return;
        setSavingCode(true);
        try {
            const { error } = await supabase
                .from('platform_settings')
                .update({ value: accessCode })
                .eq('key', 'onboarding_access_code');

            if (error) throw error;
            alert('Access code updated successfully!');
        } catch (err) {
            console.error('Error updating access code:', err);
            alert('Failed to update access code');
        } finally {
            setSavingCode(false);
        }
    };

    const handleUpdatePrompt = async () => {
        if (!agentPrompt) return;
        setSavingPrompt(true);
        try {
            // First try to select it, if it doesn't exist we insert
            const { data: existing } = await supabase
                .from('platform_settings')
                .select('key')
                .eq('key', 'universal_agent_prompt')
                .maybeSingle();

            let error;
            if (existing) {
                const res = await supabase.from('platform_settings').update({ value: agentPrompt }).eq('key', 'universal_agent_prompt');
                error = res.error;
            } else {
                const res = await supabase.from('platform_settings').insert({ key: 'universal_agent_prompt', value: agentPrompt });
                error = res.error;
            }

            if (error) throw error;
            alert('Agent Prompt updated successfully! Changes will reflect immediately on the next message.');
        } catch (err) {
            console.error('Error updating prompt:', err);
            alert('Failed to update agent prompt');
        } finally {
            setSavingPrompt(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/admin/crm')}
                    className="p-2 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-gray-200 text-gray-500"
                >
                    <ChevronLeft size={20} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                    <p className="text-gray-500">Manage your profile, team, and client onboarding.</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden min-h-[500px]">
                <div className="flex flex-col md:flex-row h-full">
                    {/* Sidebar Tabs */}
                    <div className="w-full md:w-64 bg-gray-50/50 border-b md:border-b-0 md:border-r border-gray-200 p-4">
                        <nav className="space-y-1">
                            <button
                                onClick={() => setActiveTab('general')}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${activeTab === 'general' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
                            >
                                <User size={18} />
                                General Profile
                            </button>
                            <button
                                onClick={() => setActiveTab('team')}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${activeTab === 'team' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
                            >
                                <Users size={18} />
                                Team Members
                            </button>
                            <button
                                onClick={() => setActiveTab('onboarding')}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${activeTab === 'onboarding' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
                            >
                                <LinkIcon size={18} />
                                Client Onboarding
                            </button>
                            <button
                                onClick={() => setActiveTab('prompt')}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${activeTab === 'prompt' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                                AI System Prompt
                            </button>
                        </nav>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 p-6 md:p-8">
                        {loading ? (
                            <div className="h-full flex items-center justify-center text-gray-400">Loading settings...</div>
                        ) : (
                            <>
                                {/* General Tab */}
                                {activeTab === 'general' && (
                                    <div className="max-w-xl space-y-8">
                                        <div>
                                            <h2 className="text-lg font-bold text-gray-900 mb-1">Your Profile</h2>
                                            <p className="text-sm text-gray-500">Manage your personal account details.</p>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-500">
                                                    <Mail size={16} />
                                                    <span className="flex-1">{user?.email || 'Loading...'}</span>
                                                    <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded">Verified</span>
                                                </div>
                                                <p className="text-xs text-gray-400 mt-1">Contact support to change your email.</p>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-500">
                                                    <Shield size={16} />
                                                    <span>Owner / Super Admin</span>
                                                </div>
                                            </div>

                                            <div className="pt-6 border-t border-gray-100">
                                                <h3 className="text-md font-bold text-gray-900 mb-4">Security</h3>
                                                <form onSubmit={async (e) => {
                                                    e.preventDefault();
                                                    const password = e.target.password.value;
                                                    if (!password) return;

                                                    try {
                                                        const { error } = await supabase.auth.updateUser({ password });
                                                        if (error) throw error;
                                                        alert('Password updated successfully!');
                                                        e.target.reset();
                                                    } catch (err) {
                                                        alert('Failed to update password: ' + err.message);
                                                    }
                                                }} className="space-y-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Update Password</label>
                                                        <div className="flex gap-2">
                                                            <input
                                                                name="password"
                                                                type="password"
                                                                placeholder="Enter new password"
                                                                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-brand-500 outline-none"
                                                                minLength={6}
                                                            />
                                                            <button type="submit" className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
                                                                Update
                                                            </button>
                                                        </div>
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            {user?.app_metadata?.provider === 'email' ?
                                                                "Set a new password here. You will need it for your next login." :
                                                                "You manage your password through your login provider."}
                                                        </p>
                                                    </div>
                                                </form>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Team Tab */}
                                {activeTab === 'team' && (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h2 className="text-lg font-bold text-gray-900 mb-1">Team Management</h2>
                                                <p className="text-sm text-gray-500">Manage who has access to this dashboard.</p>
                                            </div>
                                            <button
                                                onClick={handleInvite}
                                                className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-bold hover:bg-brand-700 transition-colors flex items-center gap-2"
                                            >
                                                <Plus size={16} />
                                                Invite Member
                                            </button>
                                        </div>

                                        <div className="border border-gray-200 rounded-xl overflow-hidden">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                                                    <tr>
                                                        <th className="px-4 py-3">Member</th>
                                                        <th className="px-4 py-3">Role</th>
                                                        <th className="px-4 py-3">Status</th>
                                                        <th className="px-4 py-3 text-right">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {teamMembers.map((member) => (
                                                        <tr key={member.id} className="hover:bg-gray-50/50">
                                                            <td className="px-4 py-3">
                                                                <div>
                                                                    <p className="font-medium text-gray-900">{member.name}</p>
                                                                    <p className="text-gray-500 text-xs">{member.email}</p>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                                                                    {member.role}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${member.status === 'Active' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                                                                    {member.status}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-right text-gray-400">
                                                                {member.role === 'Owner' ? (
                                                                    <span className="text-xs">Cannot remove</span>
                                                                ) : (
                                                                    <button className="text-red-500 hover:text-red-700 text-xs font-medium">Remove</button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Onboarding Tab */}
                                {activeTab === 'onboarding' && (
                                    <div className="max-w-xl mx-auto text-center space-y-8 py-8">
                                        <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mx-auto text-brand-600 mb-4">
                                            <LinkIcon size={32} />
                                        </div>

                                        <div>
                                            <h2 className="text-xl font-bold text-gray-900 mb-2">Client Onboarding Link</h2>
                                            <p className="text-gray-500 text-sm leading-relaxed">
                                                Copy this secure link and send it to your client.
                                                They will use it to set up their account and AI agent.
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2 p-2 rounded-xl border border-gray-200 bg-gray-50 text-left">
                                            <input
                                                type="text"
                                                readOnly
                                                value={onboardingLink}
                                                className="flex-1 bg-transparent border-0 focus:ring-0 text-gray-600 font-mono text-xs px-2"
                                            />
                                            <button
                                                onClick={handleCopy}
                                                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center gap-1 ${copied ? 'bg-green-600 text-white' : 'bg-brand-600 text-white hover:bg-brand-700'}`}
                                            >
                                                {copied ? <Check size={14} /> : <Copy size={14} />}
                                                {copied ? 'Copied' : 'Copy'}
                                            </button>
                                        </div>

                                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-800 text-left">
                                            <strong>Security Note:</strong> This link allows anyone to create a client account under your agency. Do not share it publicly.
                                        </div>

                                        {/* Access Code Management */}
                                        <div className="pt-8 mt-8 border-t border-gray-100 text-left">
                                            <div className="flex items-center gap-2 mb-4 text-brand-600">
                                                <Shield size={20} />
                                                <h3 className="text-lg font-bold text-gray-900">Onboarding Security</h3>
                                            </div>
                                            <p className="text-sm text-gray-500 mb-4">
                                                Require an access code for clients to fill the onboarding form. This prevents unauthorized submissions.
                                            </p>

                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Onboarding Access Code</label>
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            value={accessCode}
                                                            onChange={(e) => setAccessCode(e.target.value)}
                                                            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm font-mono shadow-sm"
                                                            placeholder="e.g. AXIS2026"
                                                        />
                                                        <button
                                                            onClick={handleUpdateCode}
                                                            disabled={savingCode}
                                                            className="px-6 py-2.5 bg-gray-900 text-white rounded-lg font-bold text-sm hover:bg-gray-800 transition-all disabled:opacity-50"
                                                        >
                                                            {savingCode ? 'Updating...' : 'Update Code'}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* AI Prompt Tab */}
                                {activeTab === 'prompt' && (
                                    <div className="space-y-6">
                                        <div>
                                            <h2 className="text-xl font-bold text-gray-900 mb-2">Universal Agent Prompt</h2>
                                            <p className="text-sm text-gray-500 leading-relaxed md:w-3/4">
                                                This is the core instructions given to the AI across ALL businesses. 
                                                Do not remove <code>{`{{AGENT_NAME}}`}</code> or <code>{`{{BUSINESS_NAME}}`}</code> placeholders, as they are used to inject client-specific fields. Changes here take effect instantly.
                                            </p>
                                        </div>
                                        
                                        <div className="flex flex-col gap-4">
                                            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-inner flex flex-col h-[500px]">
                                                <div className="bg-gray-50 px-4 py-2 flex items-center justify-between border-b border-gray-200">
                                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">System Prompt (Markdown)</span>
                                                </div>
                                                <textarea
                                                    className="w-full flex-1 p-4 bg-gray-900 text-gray-100 font-mono text-sm leading-relaxed focus:outline-none resize-none"
                                                    value={agentPrompt}
                                                    onChange={e => setAgentPrompt(e.target.value)}
                                                    placeholder="Enter the master AI prompt here..."
                                                ></textarea>
                                            </div>
                                            
                                            <div className="flex justify-end">
                                                <button
                                                    onClick={handleUpdatePrompt}
                                                    disabled={savingPrompt || !agentPrompt}
                                                    className="px-6 py-2.5 bg-brand-600 text-white rounded-lg font-bold text-sm hover:bg-brand-700 transition-all disabled:opacity-50"
                                                >
                                                    {savingPrompt ? 'Saving Prompt...' : 'Save Universal Prompt'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SetupDashboard;
