import React, { useState } from 'react';
import { Store, CreditCard, BookOpen, Globe, Upload, Check, ChevronRight, Loader2, Plus, X, FileText, PenLine, Shield, ShoppingBag, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { createSubaccount } from '../../lib/paystack';

const Onboarding = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(0); // Changed to 0 for access code step
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [enteredCode, setEnteredCode] = useState('');
    const [requiredCode, setRequiredCode] = useState('');

    // File states
    const [logoFile, setLogoFile] = useState(null);
    const [menuFile, setMenuFile] = useState(null);
    const [menuMode, setMenuMode] = useState('upload'); // 'upload' or 'manual'
    const [manualMenuItems, setManualMenuItems] = useState([]);
    const [newItemName, setNewItemName] = useState('');
    const [newItemPrice, setNewItemPrice] = useState('');
    const [newItemCategory, setNewItemCategory] = useState('');
    const [newItemTrackInventory, setNewItemTrackInventory] = useState(false);
    const [newItemStockLevel, setNewItemStockLevel] = useState(0);

    // Delivery Fee Onboarding State
    const [deliveryFeeFile, setDeliveryFeeFile] = useState(null);
    const [onboardingDeliveryFees, setOnboardingDeliveryFees] = useState([]);
    const [newDeliveryLocation, setNewDeliveryLocation] = useState('');
    const [newDeliveryFee, setNewDeliveryFee] = useState('');
    const [onboardingDeliveryMethod, setOnboardingDeliveryMethod] = useState('rider_collects');
    const [onboardingDeliveryInstructions, setOnboardingDeliveryInstructions] = useState('');
    const [onboardingOffersPickup, setOnboardingOffersPickup] = useState(false);

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
        openTime: '09:00',
        closeTime: '22:00',
        agentName: 'Jade',
        paymentModel: 'subscription' // 'subscription' or 'commission'
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

        const fetchAccessCode = async () => {
            try {
                const { data, error } = await supabase
                    .from('platform_settings')
                    .select('value')
                    .eq('key', 'onboarding_access_code')
                    .single();
                if (!error && data) {
                    setRequiredCode(data.value);
                }
            } catch (err) {
                console.error("Error fetching access code:", err);
            }
        };

        fetchBanks();
        fetchAccessCode();
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

    const handleNext = () => {
        if (!validateStep()) return;
        setStep(prev => prev + 1);
    };

    const handlePrev = () => setStep(prev => prev - 1);

    const validateStep = () => {
        if (step === 1) {
            if (!formData.businessName || !formData.email || !formData.phone) {
                alert('Please fill in your Business Name, Email, and Phone Number to continue.');
                return false;
            }
        }
        if (step === 3) {
            if (!formData.bankCode || !formData.accountNumber || !formData.accountName) {
                alert('Please complete all your Bank Details to ensure you can receive payouts.');
                return false;
            }
        }
        if (step === 4) {
            if (!formData.address || !formData.cuisine || !formData.contact) {
                alert('Please provide your Address, Cuisine Type, and a Team Contact.');
                return false;
            }
        }
        return true;
    };

    const handleVerifyCode = (e) => {
        e.preventDefault();
        setVerifying(true);
        // Simulate a tiny delay for premium feel
        setTimeout(() => {
            if (enteredCode.trim().toUpperCase() === requiredCode.toUpperCase()) {
                setStep(1);
            } else {
                alert('Invalid access code. Please contact your agency for the correct code.');
            }
            setVerifying(false);
        }, 500);
    };

    const addManualItem = () => {
        if (!newItemName || !newItemPrice) return;
        setManualMenuItems(prev => [...prev, {
            name: newItemName,
            price: Number(newItemPrice),
            category: newItemCategory || 'General',
            track_inventory: newItemTrackInventory,
            stock_level: newItemTrackInventory ? Number(newItemStockLevel) : null
        }]);
        setNewItemName('');
        setNewItemPrice('');
        setNewItemCategory('');
        setNewItemTrackInventory(false);
        setNewItemStockLevel(0);
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
        if (step !== 6) {
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
                const splitPercentage = formData.paymentModel === 'commission' ? 3 : 0.5;
                console.log('DEBUG: paymentModel =', formData.paymentModel);
                console.log('DEBUG: splitPercentage =', splitPercentage);
                try {
                    const subaccountData = await createSubaccount({
                        business_name: formData.businessName,
                        bank_code: formData.bankCode,
                        account_number: formData.accountNumber,
                        percentage_charge: splitPercentage
                    });
                    subaccountCode = subaccountData.subaccount_code;
                    console.log("Subaccount Created:", subaccountCode, "with split:", splitPercentage + "%");
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
                        open_time: formData.openTime + ':00',
                        close_time: formData.closeTime + ':00',
                        payment_model: formData.paymentModel,
                        subscription_status: formData.paymentModel === 'commission' ? null : 'trial',
                        delivery_method: onboardingDeliveryMethod,
                        delivery_instructions: onboardingDeliveryInstructions || null,
                        offers_pickup: onboardingOffersPickup,
                        agent_name: formData.agentName || 'Jade'
                    }
                ])
                .select();

            if (error) throw error;

            const newClient = data[0];
            console.log("Client Created:", newClient);

            // 4. Trigger Admin Notification (New User)
            try {
                await supabase.from('notifications').insert({
                    title: '🎉 New Client Onboarded',
                    message: `${newClient.business_name} just completed setup.`,
                    is_system: true,
                    type: 'user'
                });
            } catch (err) {
                console.error("Notification Trigger Error:", err);
            }

            // 5. Initialize Finance Table (Best effort)
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
                        track_inventory: item.track_inventory,
                        stock_level: item.stock_level,
                        is_available: true
                    }));
                    const { error: menuError } = await supabase.from('menu_items').insert(rows);
                    if (menuError) console.error("Manual menu insert error:", menuError);
                    else console.log(`Inserted ${rows.length} manual menu items`);
                } catch (err) {
                    console.error("Manual menu insert exception:", err);
                }
            }

            // 5c. Insert delivery fees if added during onboarding
            if (onboardingDeliveryFees.length > 0) {
                try {
                    const feeRows = onboardingDeliveryFees.map(f => ({
                        client_id: newClient.id,
                        location: f.location,
                        fee: f.fee
                    }));
                    const { error: feeError } = await supabase.from('delivery_fees').insert(feeRows);
                    if (feeError) console.error("Delivery fee insert error:", feeError);
                    else console.log(`Inserted ${feeRows.length} delivery fees`);
                } catch (err) {
                    console.error("Delivery fee insert exception:", err);
                }
            }

            // 5d. Process delivery fee image if uploaded
            if (deliveryFeeFile) {
                try {
                    const feePath = `delivery-fees/${newClient.id}-${Date.now()}.${deliveryFeeFile.name.split('.').pop()}`;
                    const feeImgUrl = await uploadFile(deliveryFeeFile, 'menus', feePath);
                    if (feeImgUrl) {
                        // Fire-and-forget: call the AI extraction function
                        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-delivery-fees`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
                            },
                            body: JSON.stringify({ client_id: newClient.id, image_url: feeImgUrl })
                        }).then(r => r.json())
                            .then(result => console.log("Delivery fee processing result:", result))
                            .catch(err => console.error("Delivery fee processing error:", err));
                    }
                } catch (err) {
                    console.error("Delivery fee upload error:", err);
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
                <h1 className="text-3xl font-bold text-gray-900">Welcome to Swift Order AI</h1>
                <p className="text-gray-500 mt-2">Let's get your AI Agent set up in minutes.</p>
            </div>

            {/* Config Form */}
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl shadow-gray-200/50 overflow-hidden border border-gray-100">

                {/* Progress Bar */}
                {step > 0 && (
                    <div className="bg-gray-50 border-b border-gray-100 px-8 py-4 flex items-center justify-between text-sm font-medium text-gray-500 overflow-x-auto no-scrollbar">
                        <span className={step >= 1 ? "text-brand-600 shrink-0" : "shrink-0"}>1. Business</span>
                        <ChevronRight size={16} className="text-gray-300 shrink-0 mx-2" />
                        <span className={step >= 2 ? "text-brand-600 shrink-0" : "shrink-0"}>2. Plan</span>
                        <ChevronRight size={16} className="text-gray-300 shrink-0 mx-2" />
                        <span className={step >= 3 ? "text-brand-600 shrink-0" : "shrink-0"}>3. Bank</span>
                        <ChevronRight size={16} className="text-gray-300 shrink-0 mx-2" />
                        <span className={step >= 4 ? "text-brand-600 shrink-0" : "shrink-0"}>4. Knowledge</span>
                        <ChevronRight size={16} className="text-gray-300 shrink-0 mx-2" />
                        <span className={step >= 5 ? "text-brand-600 shrink-0" : "shrink-0"}>5. Menu</span>
                        <ChevronRight size={16} className="text-gray-300 shrink-0 mx-2" />
                        <span className={step >= 6 ? "text-brand-600 shrink-0" : "shrink-0"}>6. Delivery</span>
                    </div>
                )}

                <div className="p-8">
                    {/* Step 0: Gatekeeper */}
                    {step === 0 && (
                        <form onSubmit={handleVerifyCode} className="space-y-8 py-4">
                            <div className="text-center space-y-2">
                                <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mx-auto text-brand-600 mb-4 ring-8 ring-brand-50/50">
                                    <Shield size={32} />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900">Protected Form</h2>
                                <p className="text-gray-500">Please enter your agency's onboarding access code to continue.</p>
                            </div>

                            <div className="max-w-xs mx-auto space-y-4">
                                <div>
                                    <input
                                        type="text"
                                        value={enteredCode}
                                        onChange={(e) => setEnteredCode(e.target.value)}
                                        className="w-full text-center text-2xl font-bold tracking-[0.2em] font-mono px-4 py-4 rounded-xl border-2 border-gray-200 focus:border-brand-500 focus:ring-0 outline-none transition-all uppercase placeholder:text-gray-200"
                                        placeholder="••••••••"
                                        autoFocus
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={verifying}
                                    className="w-full py-4 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-xl shadow-brand-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-70"
                                >
                                    {verifying ? (
                                        <>
                                            <Loader2 size={20} className="animate-spin" />
                                            Verifying...
                                        </>
                                    ) : (
                                        <>
                                            Start Onboarding
                                            <ChevronRight size={20} />
                                        </>
                                    )}
                                </button>
                            </div>

                            <div className="text-center pt-4">
                                <p className="text-xs text-gray-400">
                                    Only authorized businesses can access this setup flow.
                                </p>
                            </div>
                        </form>
                    )}

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
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 shadow-sm transition-all text-sm"
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
                                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 shadow-sm transition-all text-sm"
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
                                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 shadow-sm transition-all text-sm"
                                        placeholder="+234..."
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">AI Agent Name</label>
                                <input
                                    type="text"
                                    name="agentName"
                                    value={formData.agentName}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 shadow-sm transition-all text-sm font-medium"
                                    placeholder="e.g. Jade, Sarah, Alex"
                                    required
                                />
                                <p className="text-[10px] text-gray-400 mt-1">This is how your AI will introduce itself to your customers.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Upload Logo</label>
                                <label className="border-2 border-dashed border-gray-200 bg-gray-50 rounded-2xl p-8 text-center hover:bg-brand-50 hover:border-brand-300 transition-colors cursor-pointer group block">
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
                            <div className="bg-blue-50 p-4 rounded-xl flex gap-3 text-blue-700 text-sm border border-blue-100 shadow-sm">
                                <Globe size={18} className="shrink-0 mt-0.5" />
                                <p>Your dashboard will be created at: <br /><span className="font-mono font-bold break-all text-blue-600">app.swiftorderai.com/client/{formData.slug || '...'}</span></p>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Plan Selection */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <Shield className="text-brand-600" size={24} />
                                Select Your Plan
                            </h2>
                            <p className="text-gray-500 text-sm">Choose how you'd like to partner with Swift Order AI.</p>

                            <div className="grid grid-cols-1 gap-4">
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, paymentModel: 'subscription' }))}
                                    className={`p-6 rounded-2xl border-2 text-left transition-all relative overflow-hidden group ${formData.paymentModel === 'subscription' ? 'border-brand-600 bg-brand-50/50' : 'border-gray-100 hover:border-brand-200 bg-white'}`}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`p-3 rounded-xl ${formData.paymentModel === 'subscription' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                            <CreditCard size={24} />
                                        </div>
                                        {formData.paymentModel === 'subscription' && (
                                            <div className="bg-brand-600 text-white p-1 rounded-full">
                                                <Check size={16} />
                                            </div>
                                        )}
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900">Standard Plan</h3>
                                    <p className="text-sm text-gray-600 mt-1">7-Day Free Trial, then ₦50k/month + 0.5% commission.</p>
                                    <div className="mt-4 flex flex-col gap-2">
                                        <div className="flex items-center gap-2 text-xs text-brand-700 font-medium">
                                            <Check size={14} />
                                            <span>Full platform access</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-brand-700 font-medium">
                                            <Check size={14} />
                                            <span>Priority support</span>
                                        </div>
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, paymentModel: 'commission' }))}
                                    className={`p-6 rounded-2xl border-2 text-left transition-all relative overflow-hidden group ${formData.paymentModel === 'commission' ? 'border-brand-600 bg-brand-50/50' : 'border-gray-100 hover:border-brand-200 bg-white'}`}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`p-3 rounded-xl ${formData.paymentModel === 'commission' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                            <ShoppingBag size={24} />
                                        </div>
                                        {formData.paymentModel === 'commission' && (
                                            <div className="bg-brand-600 text-white p-1 rounded-full">
                                                <Check size={16} />
                                            </div>
                                        )}
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900">Commission-Only</h3>
                                    <p className="text-sm text-gray-600 mt-1">₦0 setup, ₦0 monthly. We only make money when you do (3% commission).</p>
                                    <div className="mt-4 flex flex-col gap-2">
                                        <div className="flex items-center gap-2 text-xs text-brand-700 font-medium">
                                            <Check size={14} />
                                            <span>No monthly commitments</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-brand-700 font-medium">
                                            <Check size={14} />
                                            <span>Unlimited agent activity</span>
                                        </div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Bank Info */}
                    {step === 3 && (
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
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 shadow-sm transition-all text-sm"
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
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 shadow-sm transition-all text-sm"
                                    placeholder="Account Holder Name"
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 4: Knowledge Base */}
                    {step === 4 && (
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
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 shadow-sm transition-all text-sm"
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
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 shadow-sm transition-all text-sm"
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
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 shadow-sm transition-all text-sm"
                                    placeholder="For issues requiring human intervention"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Open Time</label>
                                    <input
                                        type="time"
                                        name="openTime"
                                        value={formData.openTime}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 shadow-sm transition-all text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Close Time</label>
                                    <input
                                        type="time"
                                        name="closeTime"
                                        value={formData.closeTime}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 shadow-sm transition-all text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 5: Menu (Optional) */}
                    {step === 5 && (
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

                                    {/* Stock Toggle and Input */}
                                    <div className="flex items-center gap-4 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setNewItemTrackInventory(!newItemTrackInventory)}
                                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${newItemTrackInventory ? 'bg-brand-600' : 'bg-gray-300'}`}
                                            >
                                                <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${newItemTrackInventory ? 'translate-x-5' : 'translate-x-1'}`} />
                                            </button>
                                            <span className="text-xs font-medium text-gray-600">Track Stock</span>
                                        </div>
                                        {newItemTrackInventory && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-gray-500">Qty:</span>
                                                <input
                                                    type="number"
                                                    value={newItemStockLevel}
                                                    onChange={(e) => setNewItemStockLevel(e.target.value)}
                                                    className="w-16 px-2 py-1 text-xs rounded border border-gray-300"
                                                    min="0"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {manualMenuItems.length > 0 && (
                                        <div className="bg-gray-50 rounded-xl border border-gray-200 divide-y divide-gray-200">
                                            {manualMenuItems.map((item, idx) => (
                                                <div key={idx} className="flex items-center justify-between px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-medium text-gray-900 text-sm">{item.name}</span>
                                                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">{item.category}</span>
                                                        {item.track_inventory && (
                                                            <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">STOCK: {item.stock_level}</span>
                                                        )}
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

                    {/* Step 6: Delivery Fees */}
                    {step === 6 && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <Truck className="text-brand-600" size={24} />
                                Delivery &amp; Pickup
                            </h2>
                            <p className="text-gray-500 text-sm">Tell us how your business handles fulfillment so the AI can assist your customers accurately.</p>

                            {/* Pickup Selection */}
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${onboardingOffersPickup ? 'bg-brand-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                                        <Store size={20} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900 text-sm">Offer Order Pickup</p>
                                        <p className="text-xs text-gray-500">Enable this if customers can collect orders from your location.</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setOnboardingOffersPickup(!onboardingOffersPickup)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${onboardingOffersPickup ? 'bg-brand-600' : 'bg-gray-300'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${onboardingOffersPickup ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>

                            {/* Delivery Method Selector */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase block">How do you charge for delivery?</label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setOnboardingDeliveryMethod('rider_collects')}
                                        className={`p-4 rounded-xl border-2 text-left transition-all ${onboardingDeliveryMethod === 'rider_collects' ? 'border-brand-600 bg-brand-50/50' : 'border-gray-100 hover:border-brand-200'}`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className={`p-2 rounded-lg ${onboardingDeliveryMethod === 'rider_collects' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                                <Truck size={18} />
                                            </div>
                                            {onboardingDeliveryMethod === 'rider_collects' && (
                                                <div className="bg-brand-600 text-white p-0.5 rounded-full"><Check size={14} /></div>
                                            )}
                                        </div>
                                        <h4 className="font-bold text-gray-900 text-sm">Rider Collects Fee</h4>
                                        <p className="text-xs text-gray-500 mt-1">Your rider/delivery company collects the fee separately on arrival.</p>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setOnboardingDeliveryMethod('added_to_order')}
                                        className={`p-4 rounded-xl border-2 text-left transition-all ${onboardingDeliveryMethod === 'added_to_order' ? 'border-brand-600 bg-brand-50/50' : 'border-gray-100 hover:border-brand-200'}`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className={`p-2 rounded-lg ${onboardingDeliveryMethod === 'added_to_order' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                                <ShoppingBag size={18} />
                                            </div>
                                            {onboardingDeliveryMethod === 'added_to_order' && (
                                                <div className="bg-brand-600 text-white p-0.5 rounded-full"><Check size={14} /></div>
                                            )}
                                        </div>
                                        <h4 className="font-bold text-gray-900 text-sm">Added to Order Total</h4>
                                        <p className="text-xs text-gray-500 mt-1">Fee is added to the order. Customer pays everything together.</p>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setOnboardingDeliveryMethod('quoted_rider_collects')}
                                        className={`p-4 rounded-xl border-2 text-left transition-all ${onboardingDeliveryMethod === 'quoted_rider_collects' ? 'border-brand-600 bg-brand-50/50' : 'border-gray-100 hover:border-brand-200'}`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className={`p-2 rounded-lg ${onboardingDeliveryMethod === 'quoted_rider_collects' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                                <Store size={18} />
                                            </div>
                                            {onboardingDeliveryMethod === 'quoted_rider_collects' && (
                                                <div className="bg-brand-600 text-white p-0.5 rounded-full"><Check size={14} /></div>
                                            )}
                                        </div>
                                        <h4 className="font-bold text-gray-900 text-sm">Quoted &amp; Rider Collects</h4>
                                        <p className="text-xs text-gray-500 mt-1">You quote the fee per location, but the rider collects it on delivery.</p>
                                    </button>
                                </div>
                            </div>

                            {/* Special Instructions */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase block">Special Delivery Instructions (Optional)</label>
                                <textarea
                                    value={onboardingDeliveryInstructions}
                                    onChange={(e) => setOnboardingDeliveryInstructions(e.target.value)}
                                    placeholder="e.g. We only deliver within Lagos Island. Free delivery for orders above ₦15,000..."
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 shadow-sm transition-all text-sm min-h-[80px] resize-y"
                                />
                            </div>

                            {onboardingDeliveryMethod !== 'rider_collects' && (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase block">Upload Fee Document (Optional)</label>
                                        <label className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed cursor-pointer transition-all ${deliveryFeeFile ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-brand-300 bg-gray-50'}`}>
                                            <input
                                                type="file"
                                                accept=".pdf,image/*"
                                                className="hidden"
                                                onChange={(e) => setDeliveryFeeFile(e.target.files[0] || null)}
                                            />
                                            <Upload size={20} className={deliveryFeeFile ? 'text-brand-600' : 'text-gray-400'} />
                                            <span className={`text-sm font-medium ${deliveryFeeFile ? 'text-brand-700' : 'text-gray-500'}`}>
                                                {deliveryFeeFile ? deliveryFeeFile.name : 'Click to upload an image or PDF'}
                                            </span>
                                        </label>
                                    </div>

                                    {/* Manual entry */}
                                    <div className="space-y-3">
                                        <label className="text-xs font-bold text-gray-500 uppercase block">Add Locations Manually</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="Location (e.g. Lekki)"
                                                value={newDeliveryLocation}
                                                onChange={(e) => setNewDeliveryLocation(e.target.value)}
                                                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-brand-500 text-sm"
                                            />
                                            <input
                                                type="number"
                                                placeholder="Fee (₦)"
                                                value={newDeliveryFee}
                                                onChange={(e) => setNewDeliveryFee(e.target.value)}
                                                className="w-28 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-brand-500 text-sm"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (!newDeliveryLocation || !newDeliveryFee) return;
                                                    setOnboardingDeliveryFees(prev => [...prev, { location: newDeliveryLocation, fee: Number(newDeliveryFee) }]);
                                                    setNewDeliveryLocation('');
                                                    setNewDeliveryFee('');
                                                }}
                                                className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                                            >
                                                <Plus size={18} />
                                            </button>
                                        </div>

                                        {onboardingDeliveryFees.length > 0 && (
                                            <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 overflow-hidden">
                                                {onboardingDeliveryFees.map((f, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-3">
                                                        <span className="font-medium text-gray-900 text-sm">{f.location}</span>
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-sm font-bold text-gray-900">₦{Number(f.fee).toLocaleString()}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => setOnboardingDeliveryFees(prev => prev.filter((_, i) => i !== idx))}
                                                                className="text-red-400 hover:text-red-600"
                                                            >
                                                                <X size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                </>
                            )}

                            <div className="bg-yellow-50 p-3 rounded-lg text-yellow-800 text-sm">
                                <p>💡 You can always add or edit delivery fees from your dashboard later.</p>
                            </div>
                        </div>
                    )}

                    {/* Nav Actions */}
                    {step > 0 && (
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

                            {step < 6 ? (
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
                    )}

                </div>
            </div>

            <p className="mt-8 text-gray-400 text-sm">Need help? Contact support@swiftorderai.com</p>
        </div>
    );
};

export default Onboarding;
