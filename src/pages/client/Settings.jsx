import React, { useState, useEffect } from 'react';
import { Save, Loader2, Store, CreditCard, MapPin, Phone, Mail, Globe, User, Check, Clock, Upload, Bell } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const FALLBACK_BANKS = [
    { name: 'Access Bank', code: '044' },
    { name: 'Ecobank Nigeria', code: '050' },
    { name: 'Fidelity Bank', code: '070' },
    { name: 'First Bank of Nigeria', code: '011' },
    { name: 'Guaranty Trust Bank', code: '058' },
    { name: 'Kuda Bank', code: '50211' },
    { name: 'Moniepoint Microfinance Bank', code: '50371' },
    { name: 'Opay', code: '999992' },
    { name: 'PalmPay', code: '999991' },
    { name: 'Stanbic IBTC Bank', code: '221' },
    { name: 'Sterling Bank', code: '232' },
    { name: 'United Bank for Africa', code: '033' },
    { name: 'Zenith Bank', code: '057' }
];

// Moved outside to prevent re-rendering focus loss
const InputField = ({ label, name, value, onChange, type = 'text', icon: Icon, placeholder, disabled }) => (
    <div>
        <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">{label}</label>
        <div className="relative">
            {Icon && <Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />}
            <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                disabled={disabled}
                className={`w-full ${Icon ? 'pl-10' : 'pl-4'} pr-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm ${disabled ? 'bg-gray-50 text-gray-500' : ''}`}
            />
        </div>
    </div>
);

const ClientSettings = () => {
    const { client } = useOutletContext();
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [banks, setBanks] = useState(FALLBACK_BANKS);
    const [logoPreview, setLogoPreview] = useState(null);
    const [originalForm, setOriginalForm] = useState(null);

    const [form, setForm] = useState({
        business_name: '',
        email: '',
        phone_number: '',
        address: '',
        cuisine: '',
        team_contact: '',
        account_name: '',
        account_number: '',
        bank_name: '',
        bank_code: '',
        open_time: '',
        close_time: '',
        agent_name: 'Jade'
    });

    // Track original bank details to detect changes
    const [originalBank, setOriginalBank] = useState({ account_number: '', bank_code: '' });

    useEffect(() => {
        if (client) {
            const data = {
                business_name: client.business_name || '',
                email: client.email || '',
                phone_number: client.phone_number || '',
                address: client.address || '',
                cuisine: client.cuisine || '',
                team_contact: client.team_contact || '',
                account_name: client.account_name || '',
                account_number: client.account_number || '',
                bank_name: client.bank_name || '',
                bank_code: client.bank_code || '',
                open_time: client.open_time ? client.open_time.substring(0, 5) : '',
                close_time: client.close_time ? client.close_time.substring(0, 5) : '',
                agent_name: client.agent_name || 'Jade',
                logo_url: client.logo_url || ''
            };
            setForm(data);
            setLogoPreview(client.logo_url || null);
            setOriginalForm(data);
            setOriginalBank({ account_number: client.account_number || '', bank_code: client.bank_code || '' });
        }
    }, [client]);

    // Fetch banks
    useEffect(() => {
        const fetchBanks = async () => {
            try {
                const res = await fetch('https://api.paystack.co/bank', {
                    headers: { 'Authorization': `Bearer ${import.meta.env.VITE_PAYSTACK_SECRET_KEY}` }
                });
                const data = await res.json();
                if (data.status && data.data?.length) {
                    setBanks(data.data.map(b => ({ name: b.name, code: b.code })));
                }
            } catch { /* fallback banks */ }
        };
        fetchBanks();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'bank_code') {
            const selected = banks.find(b => b.code === value);
            setForm(prev => ({ ...prev, bank_code: value, bank_name: selected?.name || '' }));
        } else {
            setForm(prev => ({ ...prev, [name]: value }));
        }
    };

    const isDirty = originalForm && JSON.stringify(form) !== JSON.stringify(originalForm);

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !client?.id) return;

        // Validations
        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file.');
            return;
        }
        if (file.size > 2 * 1024 * 1024) { // 2MB
            alert('File size too large. Maximum 2MB allowed.');
            return;
        }

        setUploading(true);
        try {
            const timestamp = Date.now();
            const fileName = `logo_${timestamp}.${file.name.split('.').pop()}`;
            const filePath = `${client.slug || client.id}/${fileName}`;

            // 1. Upload to Supabase Storage
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('logos')
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('logos')
                .getPublicUrl(filePath);

            // 3. Update Database Immediately or just set in form?
            // User expectation is usually immediate profile pic update.
            const { error: dbError } = await supabase
                .from('clients')
                .update({ logo_url: publicUrl })
                .eq('id', client.id);

            if (dbError) throw dbError;

            setLogoPreview(publicUrl);
            setForm(prev => ({ ...prev, logo_url: publicUrl }));
            alert('Logo updated successfully!');
        } catch (error) {
            console.error('Logo upload error:', error);
            alert(`Failed to upload logo: ${error.message}`);
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setSaved(false);

        try {
            // 1. Update client in DB
            const { error } = await supabase
                .from('clients')
                .update({
                    business_name: form.business_name,
                    email: form.email,
                    phone_number: form.phone_number,
                    address: form.address,
                    cuisine: form.cuisine,
                    team_contact: form.team_contact,
                    account_name: form.account_name,
                    account_number: form.account_number,
                    bank_name: form.bank_name,
                    bank_code: form.bank_code,
                    open_time: form.open_time ? form.open_time + ':00' : null,
                    close_time: form.close_time ? form.close_time + ':00' : null,
                    agent_name: form.agent_name,
                    logo_url: form.logo_url
                })
                .eq('id', client.id);

            if (error) throw error;

            // 2. If bank details changed, update Paystack subaccount
            const bankChanged = form.account_number !== originalBank.account_number ||
                form.bank_code !== originalBank.bank_code;

            if (bankChanged && client.paystack_subaccount_code) {
                try {
                    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-subaccount`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
                        },
                        body: JSON.stringify({
                            subaccount_code: client.paystack_subaccount_code,
                            bank_code: form.bank_code,
                            account_number: form.account_number,
                            business_name: form.business_name
                        })
                    });
                    const result = await res.json();
                    if (result.error) {
                        console.error('Paystack subaccount update failed:', result.error);
                        alert(`Settings saved, but Paystack bank update failed: ${result.error}`);
                    } else {
                        console.log('Paystack subaccount updated');
                    }
                } catch (err) {
                    console.error('Paystack subaccount update error:', err);
                    alert('Settings saved, but could not update Paystack bank details.');
                }
            }

            setOriginalBank({ account_number: form.account_number, bank_code: form.bank_code });
            setOriginalForm(form);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            console.error('Error saving settings:', err);
            alert('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
                <p className="text-gray-500">Update your business information and bank details.</p>
            </div>

            <form onSubmit={handleSave} className="space-y-6">

                {/* Logo Section */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                        <div className="relative group">
                            <div className="w-24 h-24 rounded-2xl bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200 shadow-sm">
                                {logoPreview ? (
                                    <img src={logoPreview} alt="Business logo" className="w-full h-full object-cover" />
                                ) : (
                                    <Store size={32} className="text-gray-300" />
                                )}
                            </div>
                            <label className={`
                                absolute -bottom-2 -right-2 p-2 rounded-xl bg-white border border-gray-200 shadow-lg cursor-pointer transition-all hover:scale-110 text-gray-600 hover:text-brand-600
                                ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
                            `}>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleLogoUpload}
                                    disabled={uploading}
                                />
                                {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                            </label>
                        </div>
                        <div className="flex-1 text-center sm:text-left">
                            <h3 className="text-lg font-bold text-gray-900">Business Logo</h3>
                            <p className="text-sm text-gray-500 mt-1">
                                This will be displayed on your digital menu and customer dashboard.
                                <br />
                                <span className="text-xs text-gray-400 mt-2 block">PNG or JPG, max 2MB</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Business Info */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                    <div className="flex items-center gap-2 mb-5 text-brand-600">
                        <Store size={20} />
                        <h3 className="text-lg font-bold text-gray-900">Business Information</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <InputField label="Business Name" name="business_name" value={form.business_name} onChange={handleChange} icon={Store} placeholder="Your business name" />
                        <InputField label="AI Agent Name" name="agent_name" value={form.agent_name} onChange={handleChange} icon={User} placeholder="e.g. Jade, Sarah, Alex" />
                        <InputField label="Email" name="email" value={form.email} onChange={handleChange} type="email" icon={Mail} placeholder="email@example.com" />
                        <InputField label="Phone Number" name="phone_number" value={form.phone_number} onChange={handleChange} icon={Phone} placeholder="+234..." />
                        <InputField label="Team Contact" name="team_contact" value={form.team_contact} onChange={handleChange} icon={User} placeholder="Manager's phone" />
                        <InputField label="Cuisine Type" name="cuisine" value={form.cuisine} onChange={handleChange} icon={Globe} placeholder="e.g. Nigerian, Continental" />
                        <div className="sm:col-span-2">
                            <InputField label="Address" name="address" value={form.address} onChange={handleChange} icon={MapPin} placeholder="Business address" />
                        </div>
                        <div className="sm:col-span-2 grid grid-cols-2 gap-4">
                            <InputField label="Open Time" name="open_time" type="time" value={form.open_time} onChange={handleChange} />
                            <InputField label="Close Time" name="close_time" type="time" value={form.close_time} onChange={handleChange} />
                        </div>
                    </div>
                </div>

                {/* Notifications */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                    <div className="flex items-center gap-2 mb-2 text-brand-600">
                        <Bell size={20} />
                        <h3 className="text-lg font-bold text-gray-900">Notification Settings</h3>
                    </div>
                    <p className="text-xs text-gray-400 mb-5">Receive instant alerts for new orders directly to your Telegram app.</p>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#0088cc]/10 flex items-center justify-center shrink-0">
                                <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#0088cc]" fill="currentColor">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                                </svg>
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-gray-900">Telegram Order Alerts</h4>
                                <p className="text-xs text-gray-500 mt-1">Connect your account to get instantly notified on your phone when customers place orders.</p>
                            </div>
                        </div>
                        <a
                            href={`https://t.me/swiftorderaibot?start=${client?.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full sm:w-auto px-4 py-2 bg-[#0088cc] hover:bg-[#007ab8] text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap shadow-sm"
                        >
                            Connect Telegram
                        </a>
                    </div>
                </div>

                {/* Bank Details */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                    <div className="flex items-center gap-2 mb-2 text-brand-600">
                        <CreditCard size={20} />
                        <h3 className="text-lg font-bold text-gray-900">Bank Details</h3>
                    </div>
                    <p className="text-xs text-gray-400 mb-5">Changing your bank details will automatically update your Paystack payout account.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <InputField label="Account Name" name="account_name" value={form.account_name} onChange={handleChange} placeholder="Account holder name" />
                        <InputField label="Account Number" name="account_number" value={form.account_number} onChange={handleChange} placeholder="0123456789" />
                        <div className="sm:col-span-2">
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Bank</label>
                            <select
                                name="bank_code"
                                value={form.bank_code}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm bg-white"
                            >
                                <option value="">Select bank...</option>
                                {banks.map(b => (
                                    <option key={b.code} value={b.code}>{b.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Slug (read-only) */}
                <div className="bg-gray-50 rounded-2xl border border-gray-100 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase">Dashboard URL</p>
                            <p className="text-sm text-gray-700 font-mono mt-1">/client/{client?.slug}</p>
                        </div>
                        <span className="text-xs text-gray-400">Cannot be changed</span>
                    </div>
                </div>

                {/* Save */}
                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={saving || !isDirty}
                        className={`
                            px-6 py-2.5 rounded-lg font-bold transition-all flex items-center gap-2 shadow-lg
                            ${isDirty
                                ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-500/20'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'}
                        `}
                    >
                        {saving ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : saved ? (
                            <Check size={16} />
                        ) : (
                            <Save size={16} />
                        )}
                        {saving ? 'Saving...' : saved ? 'Saved!' : isDirty ? 'Save Changes' : 'Saved'}
                    </button>
                </div>
            </form>

            {/* Unsaved Changes Reminder Popup */}
            {isDirty && !saving && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300 w-max max-w-[90vw]">
                    <div className="bg-red-600 text-white px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3 border border-red-500/20 whitespace-nowrap">
                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shrink-0" />
                        <span className="text-xs sm:text-sm font-bold">Unsaved changes</span>
                        <button
                            onClick={handleSave}
                            className="px-3 py-1 bg-white text-red-600 rounded-lg text-xs font-bold hover:bg-gray-100 transition-colors shadow-sm active:scale-95"
                        >
                            Save Now
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClientSettings;
