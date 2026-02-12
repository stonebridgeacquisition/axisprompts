import React, { useState } from 'react';
import { Store, CreditCard, BookOpen, Globe, Upload, Check, ChevronRight, Loader2, Plus, X, FileText, PenLine } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { createSubaccount } from '../../lib/paystack';

const Onboarding = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // File states
    const [logoFile, setLogoFile] = useState(null);
    const [menuFile, setMenuFile] = useState(null);
    const [menuMode, setMenuMode] = useState('upload'); // 'upload' or 'manual'
    const [manualMenuItems, setManualMenuItems] = useState([]);
    const [newItemName, setNewItemName] = useState('');
    const [newItemPrice, setNewItemPrice] = useState('');
    const [newItemCategory, setNewItemCategory] = useState('');

    const [formData, setFormData] = useState({
        businessName: '',
        slug: '',
        email: '',
        phone: '',
        accountName: '',
        accountNumber: '',
        bankName: '',
        address: '',
        cuisine: '',
        contact: '',
        bankCode: '',
        openingHours: ''
    });

    const [banks, setBanks] = useState([]);

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

    React.useEffect(() => {
        const fetchBanks = async () => {
            try {
                console.log("Fetching banks from Paystack...");
                const response = await fetch('https://api.paystack.co/bank?country=nigeria');
                const data = await response.json();
                console.log("Bank Data:", data);
                if (data.status) {
                    // Sort alphabetically
                    const sorted = data.data.sort((a, b) => a.name.localeCompare(b.name));
                    setBanks(sorted);
                } else {
                    console.warn("Paystack API failed, using fallback banks.");
                    setBanks(FALLBACK_BANKS);
                }
            } catch (error) {
                console.error("Error fetching banks, using fallback:", error);
                setBanks(FALLBACK_BANKS);
            }
        };
        fetchBanks();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        if (name === 'businessName') {
            const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
            setFormData(prev => ({ ...prev, slug }));
        }
    };

    const handleFileChange = (e, type) => {
        const file = e.target.files[0];
        if (file) {
            if (type === 'logo') setLogoFile(file);
            if (type === 'menu') setMenuFile(file);
        }
    };

    const handleNext = () => setStep(prev => prev + 1);
    const handlePrev = () => setStep(prev => prev - 1);

    const addManualItem = () => {
        if (!newItemName || !newItemPrice) return;
        setManualMenuItems(prev => [...prev, {
            name: newItemName,
            price: Number(newItemPrice),
            category: newItemCategory || 'General'
        }]);
        setNewItemName('');
        setNewItemPrice('');
        setNewItemCategory('');
    };

    const removeManualItem = (index) => {
        setManualMenuItems(prev => prev.filter((_, i) => i !== index));
    };

    const uploadFile = async (file, bucket, path) => {
        if (!file) return null;
        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(path, file, { upsert: true });

        if (error) {
            console.error(`Error uploading to ${bucket}:`, error);
            throw error;
        }

        const { data: publicUrlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(path);

        return publicUrlData.publicUrl;
    };

    const handleSubmit = async () => {
        // HARD BLOCK: Do absolutely NOTHING if not on the final step
        if (step !== 4) {
            return;
        }

        setLoading(true);

        try {
            const timestamp = Date.now();
            let logoUrl = null;
            let menuUrl = null;
            let subaccountCode = null;

            // 0. Create Paystack Subaccount
            if (formData.bankCode && formData.accountNumber) {
                try {
                    const subaccountData = await createSubaccount({
                        business_name: formData.businessName,
                        bank_code: formData.bankCode,
                        account_number: formData.accountNumber
                    });
                    subaccountCode = subaccountData.subaccount_code;
                    console.log("Subaccount Created:", subaccountCode);
                } catch (err) {
                    console.error("Subaccount Creation Failed:", err);
                    // Don't block onboarding if subaccount fails, just log it
                    // The subaccount can be created manually later
                }
            }

            // 1. Upload Logo
            if (logoFile) {
                const logoPath = `${formData.slug || 'unknown'}/logo_${timestamp}.${logoFile.name.split('.').pop()}`;
                logoUrl = await uploadFile(logoFile, 'logos', logoPath);
            }

            // 2. Upload Menu
            if (menuFile) {
                const menuPath = `${formData.slug || 'unknown'}/menu_${timestamp}.${menuFile.name.split('.').pop()}`;
                menuUrl = await uploadFile(menuFile, 'menus', menuPath);
            }

            // 3. Insert Client Data
            const { data, error } = await supabase
                .from('clients')
                .insert([
                    {
                        business_name: formData.businessName,
                        slug: formData.slug || formData.businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                        email: formData.email,
                        phone_number: formData.phone,
                        logo_url: logoUrl,
                        bank_name: formData.bankName,
                        bank_code: formData.bankCode,
                        account_number: formData.accountNumber,
                        account_name: formData.accountName,
                        paystack_subaccount_code: subaccountCode,
                        address: formData.address,
                        cuisine: formData.cuisine,
                        team_contact: formData.contact,
                        menu_url: menuUrl,
                        status: 'Active',
                        opening_hours: formData.openingHours
                    }
                ])
                .select();

            if (error) throw error;

            const newClient = data[0];
            console.log("Client Created:", newClient);

            // 4. Initialize Finance Table (Best effort)
            try {
                const { error: financeError } = await supabase
                    .from('finance')
                    .insert([
                        {
                            client_id: newClient.id,
                            total_revenue: 0,
                            pending_payouts: 0
                        }
                    ]);
                if (financeError) console.error("Finance Init Error:", financeError);
            } catch (err) {
                console.error("Finance Init Exception:", err);
            }

            // 5a. Process Menu Image with AI (fire-and-forget — don't block redirect)
            if (menuUrl) {
                try {
                    console.log("Triggering menu processing...");
                    fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-menu`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
                        },
                        body: JSON.stringify({
                            client_id: newClient.id,
                            menu_url: menuUrl
                        })
                    }).then(res => res.json())
                        .then(result => console.log("Menu processing result:", result))
                        .catch(err => console.error("Menu processing error:", err));
                } catch (err) {
                    console.error("Menu trigger error:", err);
                }
            }

            // 5b. Insert manually added menu items directly
            if (manualMenuItems.length > 0) {
                try {
                    const rows = manualMenuItems.map(item => ({
                        client_id: newClient.id,
                        name: item.name,
                        price: item.price,
                        category: item.category || 'General',
                        description: '',
                        options: [],
                        is_available: true
                    }));
                    const { error: menuError } = await supabase.from('menu_items').insert(rows);
                    if (menuError) console.error("Manual menu insert error:", menuError);
                    else console.log(`Inserted ${rows.length} manual menu items`);
                } catch (err) {
                    console.error("Manual menu insert exception:", err);
                }
            }

            // Redirect
            navigate(`/client/${formData.slug}`);

        } catch (error) {
            console.error("Submission Error:", error);
            alert(`Error creating dashboard: ${error.message || error.error_description || "Unknown error"}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center">

            {/* Header */}
            <div className="text-center mb-10">
                <div className="mx-auto w-12 h-12 bg-brand-600 rounded-xl flex items-center justify-center text-white font-bold text-xl mb-4 shadow-lg shadow-brand-500/20">
                    A
                </div>
                <h1 className="text-3xl font-bold text-gray-900">Welcome to AxisPrompt</h1>
                <p className="text-gray-500 mt-2">Let's get your AI Agent set up in minutes.</p>
            </div>

            {/* Config Form */}
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl shadow-gray-200/50 overflow-hidden border border-gray-100">

                {/* Progress Bar */}
                <div className="bg-gray-50 border-b border-gray-100 px-8 py-4 flex items-center justify-between text-sm font-medium text-gray-500">
                    <span className={step >= 1 ? "text-brand-600" : ""}>1. Business</span>
                    <ChevronRight size={16} className="text-gray-300" />
                    <span className={step >= 2 ? "text-brand-600" : ""}>2. Bank</span>
                    <ChevronRight size={16} className="text-gray-300" />
                    <span className={step >= 3 ? "text-brand-600" : ""}>3. Knowledge</span>
                    <ChevronRight size={16} className="text-gray-300" />
                    <span className={step >= 4 ? "text-brand-600" : ""}>4. Menu</span>
                </div>

                <div className="p-8">

                    {/* Step 1: Business Info */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <Store className="text-brand-600" size={24} />
                                Business Identity
                            </h2>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                                <input
                                    type="text"
                                    name="businessName"
                                    value={formData.businessName}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                    placeholder="e.g. Mama's Kitchen"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                        placeholder="owner@example.com"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                        placeholder="+234..."
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Upload Logo</label>
                                <label className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors cursor-pointer block">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleFileChange(e, 'logo')}
                                        className="hidden"
                                    />
                                    <Upload className="mx-auto text-gray-400 mb-2" />
                                    <p className="text-sm text-gray-500">
                                        {logoFile ? logoFile.name : "Click to upload brand logo"}
                                    </p>
                                </label>
                            </div>
                            <div className="bg-blue-50 p-4 rounded-lg flex gap-3 text-blue-700 text-sm">
                                <Globe size={16} className="shrink-0 mt-0.5" />
                                <p>Your dashboard will be created at: <br /><span className="font-mono font-bold">app.axisprompt.com/client/{formData.slug || '...'}</span></p>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Bank Info - No changes needed to structure */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <CreditCard className="text-brand-600" size={24} />
                                Payout Configuration
                            </h2>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                                <select
                                    name="bankCode"
                                    value={formData.bankCode}
                                    onChange={(e) => {
                                        const selectedBank = banks.find(b => b.code === e.target.value);
                                        setFormData(prev => ({
                                            ...prev,
                                            bankCode: e.target.value,
                                            bankName: selectedBank ? selectedBank.name : ''
                                        }));
                                    }}
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-white"
                                >
                                    <option value="">Select a Bank</option>
                                    {banks.map((bank) => (
                                        <option key={bank.id} value={bank.code}>
                                            {bank.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                                <input
                                    type="text"
                                    name="accountNumber"
                                    value={formData.accountNumber}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 font-mono"
                                    placeholder="0123456789"
                                    maxLength={10}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
                                <input
                                    type="text"
                                    name="accountName"
                                    value={formData.accountName}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                    placeholder="Account Holder Name"
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 3: Knowledge Base - No changes needed to structure */}
                    {step === 3 && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <BookOpen className="text-brand-600" size={24} />
                                Agent Knowledge Base
                            </h2>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Physical Address</label>
                                <input
                                    type="text"
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                    placeholder="Full delivery address"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Cuisine Type</label>
                                <input
                                    type="text"
                                    name="cuisine"
                                    value={formData.cuisine}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                    placeholder="e.g. Nigerian, Fast Food"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Team Contact (Escalation)</label>
                                <input
                                    type="text"
                                    name="contact"
                                    value={formData.contact}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                    placeholder="For issues requiring human intervention"
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 4: Menu (Optional) */}
                    {step === 4 && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <Upload className="text-brand-600" size={24} />
                                    Menu Setup
                                    <span className="text-xs font-normal text-gray-400 ml-2">(Optional — you can do this later)</span>
                                </h2>
                            </div>

                            {/* Toggle between Upload and Manual */}
                            <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
                                <button
                                    type="button"
                                    onClick={() => setMenuMode('upload')}
                                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-all ${menuMode === 'upload'
                                        ? 'bg-white shadow-sm text-brand-600'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    <FileText size={16} />
                                    Upload Image / PDF
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMenuMode('manual')}
                                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-all ${menuMode === 'manual'
                                        ? 'bg-white shadow-sm text-brand-600'
                                        : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    <PenLine size={16} />
                                    Add Manually
                                </button>
                            </div>

                            {/* Upload Mode */}
                            {menuMode === 'upload' && (
                                <>
                                    <label className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center hover:bg-gray-50 transition-colors cursor-pointer group block">
                                        <input
                                            type="file"
                                            accept=".pdf,image/*"
                                            onChange={(e) => handleFileChange(e, 'menu')}
                                            className="hidden"
                                        />
                                        <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-brand-100 transition-colors">
                                            <Upload className="text-brand-600" size={24} />
                                        </div>
                                        <h3 className="font-bold text-gray-900 mb-1">
                                            {menuFile ? menuFile.name : "Upload Menu PDF or Image"}
                                        </h3>
                                        <p className="text-sm text-gray-500">Our AI will automatically extract all items and prices</p>
                                    </label>
                                    <div className="bg-blue-50 p-3 rounded-lg text-blue-700 text-sm">
                                        <p>📸 Upload a clear photo or PDF of your menu. The AI will extract item names, prices, and categories automatically.</p>
                                    </div>
                                </>
                            )}

                            {/* Manual Mode */}
                            {menuMode === 'manual' && (
                                <div className="space-y-4">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Item name (e.g. Jollof Rice)"
                                            value={newItemName}
                                            onChange={(e) => setNewItemName(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addManualItem(); } }}
                                            className="flex-1 px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm"
                                        />
                                        <input
                                            type="number"
                                            placeholder="Price"
                                            value={newItemPrice}
                                            onChange={(e) => setNewItemPrice(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addManualItem(); } }}
                                            className="w-28 px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Category"
                                            value={newItemCategory}
                                            onChange={(e) => setNewItemCategory(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addManualItem(); } }}
                                            className="w-32 px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm"
                                        />
                                        <button
                                            type="button"
                                            onClick={addManualItem}
                                            className="px-3 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
                                        >
                                            <Plus size={18} />
                                        </button>
                                    </div>

                                    {manualMenuItems.length > 0 && (
                                        <div className="bg-gray-50 rounded-xl border border-gray-200 divide-y divide-gray-200">
                                            {manualMenuItems.map((item, idx) => (
                                                <div key={idx} className="flex items-center justify-between px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-medium text-gray-900 text-sm">{item.name}</span>
                                                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">{item.category}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-bold text-gray-900 text-sm">₦{item.price.toLocaleString()}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeManualItem(idx)}
                                                            className="text-red-400 hover:text-red-600 transition-colors"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="px-4 py-2 bg-gray-100 text-xs text-gray-500 font-medium">
                                                {manualMenuItems.length} item{manualMenuItems.length !== 1 ? 's' : ''} added
                                            </div>
                                        </div>
                                    )}

                                    {manualMenuItems.length === 0 && (
                                        <div className="text-center py-6 text-gray-400 text-sm">
                                            No items added yet. Type an item name, price, and click +
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="bg-yellow-50 p-3 rounded-lg text-yellow-800 text-sm">
                                <p>💡 You can always add or edit menu items from your dashboard later.</p>
                            </div>
                        </div>
                    )}

                    {/* Nav Actions */}
                    <div className="mt-10 flex items-center justify-between pt-6 border-t border-gray-100">
                        {step > 1 ? (
                            <button
                                type="button"
                                onClick={handlePrev}
                                className="px-6 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                Back
                            </button>
                        ) : (
                            <div></div>
                        )}

                        {step < 4 ? (
                            <button
                                type="button"
                                onClick={handleNext}
                                className="px-6 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-lg shadow-lg shadow-brand-500/20 transition-all"
                            >
                                Continue
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={loading}
                                className={`px-8 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-lg shadow-green-500/20 flex items-center gap-2 transition-all ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {loading ? 'Creating Dashboard...' : 'Complete Setup'}
                                {loading && <Loader2 size={18} className="animate-spin" />}
                                {!loading && <Check size={18} />}
                            </button>
                        )}
                    </div>

                </div>
            </div>

            <p className="mt-8 text-gray-400 text-sm">Need help? Contact support@axisprompt.com</p>
        </div>
    );
};

export default Onboarding;
