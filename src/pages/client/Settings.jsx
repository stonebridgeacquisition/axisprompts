import React, { useState, useEffect } from 'react';
import { Save, Loader2, Store, CreditCard, MapPin, Phone, Mail, Globe, User, Check, Clock, Upload, MessageCircle, Copy, RefreshCw, ExternalLink, Eye, EyeOff, Bell } from 'lucide-react';
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
        agent_name: '',
        email: '',
        phone_number: '',
        address: '',
        cuisine: '',
        team_contact: '',
        account_name: '',
        account_number: '',
        bank_name: '',
        bank_code: '',
        operating_hours: {
            Mon: { isOpen: true, open: '09:00', close: '22:00' },
            Tue: { isOpen: true, open: '09:00', close: '22:00' },
            Wed: { isOpen: true, open: '09:00', close: '22:00' },
            Thu: { isOpen: true, open: '09:00', close: '22:00' },
            Fri: { isOpen: true, open: '09:00', close: '22:00' },
            Sat: { isOpen: true, open: '09:00', close: '22:00' },
            Sun: { isOpen: false, open: '09:00', close: '22:00' },
        },
    });

    // WhatsApp integration state
    const [waForm, setWaForm] = useState({
        whatsapp_verify_token: '',
        whatsapp_app_secret: '',
        whatsapp_phone_number_id: '',
        whatsapp_access_token: '',
    });
    const [waSaving, setWaSaving] = useState(false);
    const [waSaved, setWaSaved] = useState(false);
    const [showSecret, setShowSecret] = useState(false);
    const [showToken, setShowToken] = useState(false);
    const [copiedField, setCopiedField] = useState(null);

    // Track original bank details to detect changes
    const [originalBank, setOriginalBank] = useState({ account_number: '', bank_code: '' });

    useEffect(() => {
        if (client) {
            // Load operating_hours from DB (new) or fallback to legacy columns
            let operating_hours = {
                Mon: { isOpen: true, open: '09:00', close: '22:00' },
                Tue: { isOpen: true, open: '09:00', close: '22:00' },
                Wed: { isOpen: true, open: '09:00', close: '22:00' },
                Thu: { isOpen: true, open: '09:00', close: '22:00' },
                Fri: { isOpen: true, open: '09:00', close: '22:00' },
                Sat: { isOpen: true, open: '09:00', close: '22:00' },
                Sun: { isOpen: false, open: '09:00', close: '22:00' },
            };

            if (client.operating_hours && typeof client.operating_hours === 'object') {
                // New path: load from operating_hours JSONB
                const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                for (const day of days) {
                    if (client.operating_hours[day]) {
                        operating_hours[day] = {
                            isOpen: true,
                            open: client.operating_hours[day].open || '09:00',
                            close: client.operating_hours[day].close || '22:00',
                        };
                    } else {
                        operating_hours[day] = {
                            isOpen: false,
                            open: '09:00',
                            close: '22:00',
                        };
                    }
                }
            } else if (client.open_time && client.close_time && client.open_days) {
                // Legacy fallback: convert old columns to new structure
                const openTime = client.open_time.substring(0, 5);
                const closeTime = client.close_time.substring(0, 5);
                const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                for (const day of days) {
                    operating_hours[day] = {
                        isOpen: client.open_days.includes(day),
                        open: openTime,
                        close: closeTime,
                    };
                }
            }

            const data = {
                business_name: client.business_name || '',
                agent_name: client.agent_name || 'Jade',
                email: client.email || '',
                phone_number: client.phone_number || '',
                address: client.address || '',
                cuisine: client.cuisine || '',
                team_contact: client.team_contact || '',
                account_name: client.account_name || '',
                account_number: client.account_number || '',
                bank_name: client.bank_name || '',
                bank_code: client.bank_code || '',
                operating_hours,
                logo_url: client.logo_url || '',
            };
            setForm(data);
            setLogoPreview(client.logo_url || null);
            setOriginalForm(data);
            setOriginalBank({ account_number: client.account_number || '', bank_code: client.bank_code || '' });

            // Load existing WhatsApp credentials
            setWaForm({
                whatsapp_verify_token: client.whatsapp_verify_token || '',
                whatsapp_app_secret: client.whatsapp_app_secret || '',
                whatsapp_phone_number_id: client.whatsapp_phone_number_id || '',
                whatsapp_access_token: client.whatsapp_access_token || '',
            });
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

    const handleDayChange = (day, field, value) => {
        setForm(prev => ({
            ...prev,
            operating_hours: {
                ...prev.operating_hours,
                [day]: {
                    ...prev.operating_hours[day],
                    [field]: value,
                },
            },
        }));
    };

    const handleApplySameHours = () => {
        // Find the first open day and copy its hours to all days
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const firstOpen = days.find(d => form.operating_hours[d].isOpen);
        if (!firstOpen) return;

        const template = form.operating_hours[firstOpen];
        const newHours = {};
        for (const day of days) {
            newHours[day] = {
                isOpen: true,
                open: template.open,
                close: template.close,
            };
        }
        setForm(prev => ({ ...prev, operating_hours: newHours }));
    };

    const generateVerifyToken = () => {
        const token = 'wa_' + Math.random().toString(36).substring(2, 10) + '_' + client.id.substring(0, 6);
        setWaForm(prev => ({ ...prev, whatsapp_verify_token: token }));
    };

    const copyToClipboard = (text, field) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handleWaChange = (e) => {
        const { name, value } = e.target;
        setWaForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveWhatsApp = async () => {
        if (!waForm.whatsapp_verify_token || !waForm.whatsapp_phone_number_id || !waForm.whatsapp_access_token) {
            alert('Please fill in all required WhatsApp fields.');
            return;
        }
        setWaSaving(true);
        setWaSaved(false);
        const { error } = await supabase
            .from('clients')
            .update({
                whatsapp_verify_token: waForm.whatsapp_verify_token,
                whatsapp_app_secret: waForm.whatsapp_app_secret,
                whatsapp_phone_number_id: waForm.whatsapp_phone_number_id,
                whatsapp_access_token: waForm.whatsapp_access_token,
            })
            .eq('id', client.id);
        setWaSaving(false);
        if (!error) {
            setWaSaved(true);
            setTimeout(() => setWaSaved(false), 3000);
        } else {
            alert('Failed to save WhatsApp credentials.');
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
            // Convert operating_hours form state to JSONB (omit closed days)
            const operatingHoursJsonb = {};
            for (const [day, dayData] of Object.entries(form.operating_hours)) {
                if (dayData.isOpen) {
                    operatingHoursJsonb[day] = {
                        open: dayData.open,
                        close: dayData.close,
                    };
                }
            }

            // 1. Update client in DB
            const { error } = await supabase
                .from('clients')
                .update({
                    business_name: form.business_name,
                    agent_name: form.agent_name,
                    email: form.email,
                    phone_number: form.phone_number,
                    address: form.address,
                    cuisine: form.cuisine,
                    team_contact: form.team_contact,
                    account_name: form.account_name,
                    account_number: form.account_number,
                    bank_name: form.bank_name,
                    bank_code: form.bank_code,
                    operating_hours: operatingHoursJsonb,
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
                        {/* Per-Day Operating Hours */}
                        <div className="sm:col-span-2">
                            <div className="flex items-center justify-between mb-3">
                                <label className="text-xs font-bold text-gray-500 uppercase">Operating Hours</label>
                                <button
                                    type="button"
                                    onClick={handleApplySameHours}
                                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded font-medium transition-colors"
                                >
                                    Same hours every day
                                </button>
                            </div>
                            <div className="space-y-2 border border-gray-200 rounded-lg overflow-hidden">
                                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                                    <div key={day} className="flex items-center gap-3 p-3 bg-white border-b last:border-b-0 border-gray-100 hover:bg-gray-50 transition-colors">
                                        <div className="w-12 text-sm font-semibold text-gray-700">{day}</div>
                                        <button
                                            type="button"
                                            onClick={() => handleDayChange(day, 'isOpen', !form.operating_hours[day].isOpen)}
                                            className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                                                form.operating_hours[day].isOpen
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-red-100 text-red-700'
                                            }`}
                                        >
                                            {form.operating_hours[day].isOpen ? '✓ Open' : '✕ Closed'}
                                        </button>
                                        <input
                                            type="time"
                                            value={form.operating_hours[day].open}
                                            onChange={(e) => handleDayChange(day, 'open', e.target.value)}
                                            disabled={!form.operating_hours[day].isOpen}
                                            className={`px-3 py-1.5 border border-gray-300 rounded text-sm ${
                                                form.operating_hours[day].isOpen
                                                    ? ''
                                                    : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                                            }`}
                                        />
                                        <span className="text-gray-400">→</span>
                                        <input
                                            type="time"
                                            value={form.operating_hours[day].close}
                                            onChange={(e) => handleDayChange(day, 'close', e.target.value)}
                                            disabled={!form.operating_hours[day].isOpen}
                                            className={`px-3 py-1.5 border border-gray-300 rounded text-sm ${
                                                form.operating_hours[day].isOpen
                                                    ? ''
                                                    : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                                            }`}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Telegram AI Assistant */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                    <div className="flex items-center gap-2 mb-2 text-brand-600">
                        <MessageCircle size={20} />
                        <h3 className="text-lg font-bold text-gray-900">Telegram AI Assistant</h3>
                    </div>
                    <p className="text-xs text-gray-400 mb-5">Manage your business on the go with your dedicated AI Assistant.</p>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#0088cc]/10 flex items-center justify-center shrink-0">
                                <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#0088cc]" fill="currentColor">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                                </svg>
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-gray-900">Swift Order AI Bot</h4>
                                <p className="text-xs text-gray-500 mt-1">Full account management: get order alerts, update your menu, track stock, and manage payments through natural conversation.</p>
                            </div>
                        </div>
                        <a
                            href={`https://t.me/swiftorderaibot?start=${client?.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full sm:w-auto px-4 py-2 bg-[#0088cc] hover:bg-[#007ab8] text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap shadow-sm"
                        >
                            Connect Assistant
                        </a>
                    </div>
                </div>

                {/* Onboarding SOP (Your WhatsApp setup checklist) */}
                <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 shadow-sm p-6 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-orange-400 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20 text-white text-xl font-bold">
                            📋
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Meta App Setup — Onboarding Checklist</h3>
                            <p className="text-sm text-gray-600 mt-0.5">Follow these steps during the onboarding call. Click each link to open the correct page.</p>
                        </div>
                    </div>

                    <div className="space-y-2">

                        {/* Step 1 */}
                        <div className="bg-white rounded-xl border border-amber-100 p-4">
                            <div className="flex items-start gap-3">
                                <span className="w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                                <div className="flex-1 space-y-2">
                                    <p className="text-sm font-semibold text-gray-800">Create a Meta Developer App</p>
                                    <p className="text-xs text-gray-500">Log in and create a new Business app, then add the WhatsApp product.</p>
                                    <a href="https://developers.facebook.com/apps/create/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-amber-700 font-semibold bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 hover:bg-amber-100 transition-colors">
                                        <ExternalLink size={12} /> Open App Creation Page
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* Step 2 */}
                        <div className="bg-white rounded-xl border border-amber-100 p-4">
                            <div className="flex items-start gap-3">
                                <span className="w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                                <div className="flex-1 space-y-2">
                                    <p className="text-sm font-semibold text-gray-800">Set App Profile Picture, Privacy Policy & Save</p>
                                    <p className="text-xs text-gray-500">Download the SwiftOrder logo below and upload it as the app icon. Paste the privacy policy URL into the app settings, then scroll to the bottom and click Save Changes.</p>
                                    <div className="flex flex-wrap gap-2">
                                        <a href="/IMG_6995.png" download="swiftorder-logo.png" className="inline-flex items-center gap-1.5 text-xs text-amber-700 font-semibold bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 hover:bg-amber-100 transition-colors">
                                            ⬇ Download App Logo
                                        </a>
                                        <button type="button" onClick={() => copyToClipboard('https://www.swiftorderai.com/privacy', 'privacy')} className="inline-flex items-center gap-1.5 text-xs text-amber-700 font-semibold bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 hover:bg-amber-100 transition-colors">
                                            {copiedField === 'privacy' ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                                            Copy Privacy Policy URL
                                        </button>
                                        <a href="https://developers.facebook.com/apps/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-amber-700 font-semibold bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 hover:bg-amber-100 transition-colors">
                                            <ExternalLink size={12} /> Go to App Basic Settings
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Step 3 */}
                        <div className="bg-white rounded-xl border border-amber-100 p-4">
                            <div className="flex items-start gap-3">
                                <span className="w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                                <div className="flex-1 space-y-2">
                                    <p className="text-sm font-semibold text-gray-800">Copy the App Secret</p>
                                    <p className="text-xs text-gray-500">Go to App Settings → Basic → click "Show" next to App Secret. Copy and paste it into the App Secret field below.</p>
                                    <a href="https://developers.facebook.com/apps/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-amber-700 font-semibold bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 hover:bg-amber-100 transition-colors">
                                        <ExternalLink size={12} /> Open App Settings → Basic
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* Step 4 */}
                        <div className="bg-white rounded-xl border border-amber-100 p-4">
                            <div className="flex items-start gap-3">
                                <span className="w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">4</span>
                                <div className="flex-1 space-y-2">
                                    <p className="text-sm font-semibold text-gray-800">Generate Permanent Access Token</p>
                                    <p className="text-xs text-gray-500">Go to Business Settings → System Users → Create a System User (Admin) → Add your app as an asset → Generate Token with <strong>whatsapp_business_messaging</strong> permission.</p>
                                    <a href="https://business.facebook.com/settings/system-users" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-amber-700 font-semibold bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 hover:bg-amber-100 transition-colors">
                                        <ExternalLink size={12} /> Open Business System Users
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* Step 5 */}
                        <div className="bg-white rounded-xl border border-amber-100 p-4">
                            <div className="flex items-start gap-3">
                                <span className="w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">5</span>
                                <div className="flex-1 space-y-2">
                                    <p className="text-sm font-semibold text-gray-800">Get Phone Number ID & Add a Real Number</p>
                                    <p className="text-xs text-gray-500">Go to WhatsApp → API Setup. Copy the Phone Number ID. To go live, click "Add phone number" and verify their business WhatsApp number.</p>
                                    <a href="https://developers.facebook.com/apps/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-amber-700 font-semibold bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 hover:bg-amber-100 transition-colors">
                                        <ExternalLink size={12} /> Open WhatsApp → API Setup
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* Step 6 */}
                        <div className="bg-white rounded-xl border border-amber-100 p-4">
                            <div className="flex items-start gap-3">
                                <span className="w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">6</span>
                                <div className="flex-1 space-y-2">
                                    <p className="text-sm font-semibold text-gray-800">Enable Messaging API</p>
                                    <p className="text-xs text-gray-500">Go to WhatsApp → Configuration and turn on the messaging API before proceeding.</p>
                                    <a href="https://developers.facebook.com/apps/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-amber-700 font-semibold bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 hover:bg-amber-100 transition-colors">
                                        <ExternalLink size={12} /> Open WhatsApp → Configuration
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* Step 7 */}
                        <div className="bg-white rounded-xl border border-amber-100 p-4">
                            <div className="flex items-start gap-3">
                                <span className="w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">7</span>
                                <div className="flex-1 space-y-2">
                                    <p className="text-sm font-semibold text-gray-800">Configure Webhook & Go Live</p>
                                    <p className="text-xs text-gray-500">Still in WhatsApp → Configuration, paste the Webhook URL and Verify Token from the section below. Click Verify & Save, then subscribe to <strong>messages</strong>. Finally, submit the app for review to go live.</p>
                                    <a href="https://developers.facebook.com/apps/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-amber-700 font-semibold bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 hover:bg-amber-100 transition-colors">
                                        <ExternalLink size={12} /> Open WhatsApp → Configuration
                                    </a>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* WhatsApp Integration */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-100 shadow-sm p-6 space-y-5">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-green-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/30">
                            <MessageCircle size={24} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">WhatsApp AI Integration</h3>
                            <p className="text-sm text-gray-600 mt-0.5">Connect your WhatsApp Business number so the AI can receive and reply to customer messages.</p>
                        </div>
                    </div>

                    {/* Step 1: Webhook URL */}
                    <div className="bg-white rounded-xl border border-green-100 p-4 space-y-3">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Step 1 — Your Unique Webhook URL</p>
                        <p className="text-xs text-gray-500">Copy this URL and paste it into the Webhook section of your Meta App.</p>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-gray-700 font-mono truncate">
                                {import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-agent?bid={client?.id}
                            </code>
                            <button type="button" onClick={() => copyToClipboard(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-agent?bid=${client?.id}`, 'webhook')} className="p-2.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-500">
                                {copiedField === 'webhook' ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                            </button>
                        </div>
                    </div>

                    {/* Step 2: Verify Token */}
                    <div className="bg-white rounded-xl border border-green-100 p-4 space-y-3">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Step 2 — Verify Token</p>
                        <p className="text-xs text-gray-500">Generate a token and paste it into the <strong>Verify Token</strong> field in your Meta App webhook setup.</p>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-gray-700 font-mono truncate">
                                {waForm.whatsapp_verify_token || 'Click Generate →'}
                            </code>
                            {waForm.whatsapp_verify_token && (
                                <button type="button" onClick={() => copyToClipboard(waForm.whatsapp_verify_token, 'token')} className="p-2.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-500">
                                    {copiedField === 'token' ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                                </button>
                            )}
                            <button type="button" onClick={generateVerifyToken} className="flex items-center gap-1.5 px-3 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors">
                                <RefreshCw size={13} /> Generate
                            </button>
                        </div>
                    </div>

                    {/* Step 3: Credentials */}
                    <div className="bg-white rounded-xl border border-green-100 p-4 space-y-3">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Step 3 — Paste Your Meta Credentials</p>
                        <p className="text-xs text-gray-500">These are found in your Meta App Dashboard under WhatsApp → API Setup.</p>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Phone Number ID <span className="text-red-400">*</span></label>
                                <input name="whatsapp_phone_number_id" value={waForm.whatsapp_phone_number_id} onChange={handleWaChange} placeholder="e.g. 123456789012345" className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 text-sm font-mono" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">App Secret <span className="text-gray-400">(for security verification)</span></label>
                                <div className="relative">
                                    <input name="whatsapp_app_secret" value={waForm.whatsapp_app_secret} onChange={handleWaChange} type={showSecret ? 'text' : 'password'} placeholder="Found in App Settings → Basic" className="w-full px-3 py-2.5 pr-10 rounded-lg border border-gray-300 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 text-sm font-mono" />
                                    <button type="button" onClick={() => setShowSecret(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><EyeOff size={15}/></button>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Permanent Access Token <span className="text-red-400">*</span></label>
                                <div className="relative">
                                    <input name="whatsapp_access_token" value={waForm.whatsapp_access_token} onChange={handleWaChange} type={showToken ? 'text' : 'password'} placeholder="Your System User Access Token" className="w-full px-3 py-2.5 pr-10 rounded-lg border border-gray-300 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 text-sm font-mono" />
                                    <button type="button" onClick={() => setShowToken(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><EyeOff size={15}/></button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold hover:underline">
                            <ExternalLink size={13}/> Open Meta Developer Console
                        </a>
                        <button
                            type="button"
                            onClick={handleSaveWhatsApp}
                            disabled={waSaving}
                            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-500/20 disabled:opacity-50"
                        >
                            {waSaving ? <Loader2 size={15} className="animate-spin" /> : waSaved ? <Check size={15} /> : <Save size={15} />}
                            {waSaving ? 'Saving...' : waSaved ? 'Saved!' : 'Save WhatsApp Settings'}
                        </button>
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
