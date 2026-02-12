import React, { useState, useEffect } from 'react';
import { Save, Loader2, Store, CreditCard, MapPin, Phone, Mail, Globe, User, Check, Clock } from 'lucide-react';
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
    const [banks, setBanks] = useState(FALLBACK_BANKS);

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
        opening_hours: ''
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
                opening_hours: client.opening_hours || ''
            };
            setForm(data);
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
                    opening_hours: form.opening_hours
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

                {/* Business Info */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                    <div className="flex items-center gap-2 mb-5 text-brand-600">
                        <Store size={20} />
                        <h3 className="text-lg font-bold text-gray-900">Business Information</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <InputField label="Business Name" name="business_name" value={form.business_name} onChange={handleChange} icon={Store} placeholder="Your business name" />
                        <InputField label="Email" name="email" value={form.email} onChange={handleChange} type="email" icon={Mail} placeholder="email@example.com" />
                        <InputField label="Phone Number" name="phone_number" value={form.phone_number} onChange={handleChange} icon={Phone} placeholder="+234..." />
                        <InputField label="Team Contact" name="team_contact" value={form.team_contact} onChange={handleChange} icon={User} placeholder="Manager's phone" />
                        <InputField label="Cuisine Type" name="cuisine" value={form.cuisine} onChange={handleChange} icon={Globe} placeholder="e.g. Nigerian, Continental" />
                        <div className="sm:col-span-2">
                            <InputField label="Address" name="address" value={form.address} onChange={handleChange} icon={MapPin} placeholder="Business address" />
                        </div>
                        <div className="sm:col-span-2">
                            <InputField label="Opening Hours" name="opening_hours" value={form.opening_hours} onChange={handleChange} icon={Clock} placeholder="e.g. 9:00 AM - 10:00 PM (Daily)" />
                        </div>
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
                        disabled={saving}
                        className="px-6 py-2.5 bg-brand-600 text-white rounded-lg font-bold hover:bg-brand-700 transition-colors flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-brand-500/20"
                    >
                        {saving ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : saved ? (
                            <Check size={16} />
                        ) : (
                            <Save size={16} />
                        )}
                        {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ClientSettings;
