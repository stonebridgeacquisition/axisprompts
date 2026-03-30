import React, { useState, useEffect } from 'react';
import { Truck, Store, Upload, Check, Loader2, Trash2, List, LayoutGrid } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const ClientDelivery = () => {
    const { client } = useOutletContext();
    const [loading, setLoading] = useState(true);

    // Delivery Fee State
    const [deliveryFees, setDeliveryFees] = useState([]);
    const [deliveryImage, setDeliveryImage] = useState(client?.delivery_fee_image_url || null);
    const [newLocation, setNewLocation] = useState('');
    const [newFee, setNewFee] = useState('');
    const [uploadingImage, setUploadingImage] = useState(false);

    // Delivery Configuration State
    const [deliveryMethod, setDeliveryMethod] = useState(client?.delivery_method || 'rider_collects');
    const [deliveryInstructions, setDeliveryInstructions] = useState(client?.delivery_instructions || '');
    const [offersPickup, setOffersPickup] = useState(client?.offers_pickup || false);

    const [savingDeliveryConfig, setSavingDeliveryConfig] = useState(false);
    const [originalDeliveryConfig, setOriginalDeliveryConfig] = useState(null);
    const [deliveryViewMode, setDeliveryViewMode] = useState('list');

    const isDeliveryDirty = originalDeliveryConfig && (
        deliveryMethod !== originalDeliveryConfig.delivery_method ||
        deliveryInstructions !== originalDeliveryConfig.delivery_instructions ||
        offersPickup !== originalDeliveryConfig.offers_pickup
    );

    useEffect(() => {
        if (window.innerWidth < 640) {
            setDeliveryViewMode('card');
        }
    }, []);

    useEffect(() => {
        if (client?.id) fetchDeliveryData();
    }, [client?.id]);

    const fetchDeliveryData = async () => {
        setLoading(true);
        try {
            // Fetch delivery fees from the delivery_fees table
            const { data: feeData, error: feeError } = await supabase
                .from('delivery_fees')
                .select('*')
                .eq('client_id', client.id)
                .order('created_at', { ascending: true });

            if (!feeError) setDeliveryFees(feeData || []);

            // Fetch delivery config from client record
            const { data: clientData, error: clientError } = await supabase
                .from('clients')
                .select('delivery_fee_image_url, delivery_method, delivery_instructions, offers_pickup')
                .eq('id', client.id)
                .single();

            if (!clientError && clientData) {
                setDeliveryImage(clientData.delivery_fee_image_url);
                setDeliveryMethod(clientData.delivery_method || 'rider_collects');
                setDeliveryInstructions(clientData.delivery_instructions || '');
                setOffersPickup(clientData.offers_pickup || false);

                setOriginalDeliveryConfig({
                    delivery_method: clientData.delivery_method || 'rider_collects',
                    delivery_instructions: clientData.delivery_instructions || '',
                    offers_pickup: clientData.offers_pickup || false
                });
            }
        } catch (error) {
            console.error("Error fetching delivery data:", error);
        } finally {
            setLoading(false);
        }
    };

    // Delivery Config Save
    const handleSaveDeliveryConfig = async () => {
        setSavingDeliveryConfig(true);
        try {
            const { error } = await supabase
                .from('clients')
                .update({
                    delivery_method: deliveryMethod,
                    delivery_instructions: deliveryInstructions,
                    offers_pickup: offersPickup
                })
                .eq('id', client.id);

            setOriginalDeliveryConfig({
                delivery_method: deliveryMethod,
                delivery_instructions: deliveryInstructions,
                offers_pickup: offersPickup
            });

            if (error) throw error;
        } catch (error) {
            console.error('Error saving delivery config:', error);
            alert('Failed to save delivery settings');
        } finally {
            setSavingDeliveryConfig(false);
        }
    };

    // Delivery Fee Actions
    const handleAddDeliveryFee = async (e) => {
        e.preventDefault();
        if (!newLocation || !newFee) return;

        try {
            const { data, error } = await supabase
                .from('delivery_fees')
                .insert([{
                    client_id: client.id,
                    location: newLocation,
                    fee: Number(newFee)
                }])
                .select();

            if (error) throw error;
            setDeliveryFees([...deliveryFees, data[0]]);
            setNewLocation('');
            setNewFee('');
        } catch (error) {
            console.error("Error adding delivery fee:", error);
            alert("Failed to add delivery fee");
        }
    };

    const handleRemoveDeliveryFee = async (feeId) => {
        try {
            const { error } = await supabase
                .from('delivery_fees')
                .delete()
                .eq('id', feeId);

            if (error) throw error;
            setDeliveryFees(deliveryFees.filter(f => f.id !== feeId));
        } catch (error) {
            console.error("Error removing delivery fee:", error);
        }
    };

    const handleUploadDeliveryImage = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingImage(true);
        try {
            const path = `delivery-fees/${client.id}-${Date.now()}`;
            const { error: uploadError } = await supabase.storage
                .from('menus') // Reusing the menus bucket for simplicity
                .upload(path, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('menus')
                .getPublicUrl(path);

            const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-delivery-fees`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify({ client_id: client.id, image_url: publicUrl })
            });
            const result = await res.json();

            if (!res.ok || result.error) throw new Error(result.error || 'Failed to process document');

            setDeliveryImage(publicUrl);

            // Re-fetch delivery fees to get the newly inserted rows
            const { data: newFees } = await supabase
                .from('delivery_fees')
                .select('*')
                .eq('client_id', client.id)
                .order('created_at', { ascending: true });

            setDeliveryFees(newFees || []);

            alert(`✅ Extracted ${result.count} locations from your document!`);
        } catch (error) {
            console.error("Error uploading image:", error);
            alert("Failed to upload image. Please try again.");
        } finally {
            setUploadingImage(false);
            e.target.value = ''; // Reset input
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                <Loader2 className="animate-spin mx-auto mb-3 text-brand-600" size={32} />
                Loading delivery settings...
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-24">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Delivery Management</h2>
                <p className="text-gray-500">Manage your delivery fees, locations, and methods.</p>
            </div>

            <div className="space-y-6">
                {/* Delivery Method Section */}
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                        <Truck className="text-brand-600" size={20} />
                        <h3 className="text-lg font-bold text-gray-900">Delivery Setup</h3>
                    </div>
                    <p className="text-sm text-gray-500 mb-6">How does your business handle delivery?</p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                        <button
                            type="button"
                            onClick={() => setDeliveryMethod('rider_collects')}
                            className={`p-4 rounded-xl border-2 text-left transition-all ${deliveryMethod === 'rider_collects' ? 'border-brand-600 bg-brand-50/50' : 'border-gray-100 hover:border-brand-200'}`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div className={`p-2 rounded-lg ${deliveryMethod === 'rider_collects' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                    <Truck size={18} />
                                </div>
                                {deliveryMethod === 'rider_collects' && (
                                    <div className="bg-brand-600 text-white p-0.5 rounded-full"><Check size={14} /></div>
                                )}
                            </div>
                            <h4 className="font-bold text-gray-900 text-sm">Rider Collects Fee</h4>
                            <p className="text-xs text-gray-500 mt-1">The delivery rider or company collects the delivery fee separately from the customer upon arrival.</p>
                        </button>

                        <button
                            type="button"
                            onClick={() => setDeliveryMethod('added_to_order')}
                            className={`p-4 rounded-xl border-2 text-left transition-all ${deliveryMethod === 'added_to_order' ? 'border-brand-600 bg-brand-50/50' : 'border-gray-100 hover:border-brand-200'}`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div className={`p-2 rounded-lg ${deliveryMethod === 'added_to_order' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                    <Upload size={18} />
                                </div>
                                {deliveryMethod === 'added_to_order' && (
                                    <div className="bg-brand-600 text-white p-0.5 rounded-full"><Check size={14} /></div>
                                )}
                            </div>
                            <h4 className="font-bold text-gray-900 text-sm">Added to Order Total</h4>
                            <p className="text-xs text-gray-500 mt-1">The delivery fee is added to the order total. The customer pays everything together online.</p>
                        </button>

                        <button
                            type="button"
                            onClick={() => setDeliveryMethod('quoted_rider_collects')}
                            className={`p-4 rounded-xl border-2 text-left transition-all ${deliveryMethod === 'quoted_rider_collects' ? 'border-brand-600 bg-brand-50/50' : 'border-gray-100 hover:border-brand-200'}`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div className={`p-2 rounded-lg ${deliveryMethod === 'quoted_rider_collects' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                    <Store size={18} />
                                </div>
                                {deliveryMethod === 'quoted_rider_collects' && (
                                    <div className="bg-brand-600 text-white p-0.5 rounded-full"><Check size={14} /></div>
                                )}
                            </div>
                            <h4 className="font-bold text-gray-900 text-sm">Quoted &amp; Rider Collects</h4>
                            <p className="text-xs text-gray-500 mt-1">We quote the customer a fee based on their location, but the rider collects it on delivery.</p>
                        </button>
                    </div>

                    {/* Pickup Toggle Section */}
                    <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100 flex items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${offersPickup ? 'bg-brand-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                                <Store size={20} />
                            </div>
                            <div>
                                <p className="font-bold text-gray-900 text-sm">Pickup Availability</p>
                                <p className="text-xs text-gray-500">Enable this if customers can collect orders from your location.</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setOffersPickup(!offersPickup)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${offersPickup ? 'bg-brand-600' : 'bg-gray-300'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${offersPickup ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>

                    <div className="space-y-2 mb-6">
                        <label className="text-xs font-bold text-gray-500 uppercase block">Special Delivery Instructions</label>
                        <textarea
                            value={deliveryInstructions}
                            onChange={(e) => setDeliveryInstructions(e.target.value)}
                            placeholder="e.g. We deliver within Abuja only. Orders above ₦10,000 get free delivery. Delivery takes 30-60 minutes..."
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm min-h-[100px] resize-y"
                        />
                        <p className="text-xs text-gray-400">These instructions help the AI agent respond accurately to delivery questions.</p>
                    </div>

                    <div className="flex justify-end pt-2">
                        <button
                            onClick={handleSaveDeliveryConfig}
                            disabled={savingDeliveryConfig || !isDeliveryDirty}
                            className={`
                            px-6 py-2.5 rounded-lg font-bold transition-all flex items-center gap-2 shadow-lg
                            ${isDeliveryDirty
                                    ? 'bg-brand-600 text-white hover:bg-brand-700 shadow-brand-500/20'
                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'}
                        `}
                        >
                            {savingDeliveryConfig ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <Check size={16} />
                            )}
                            {savingDeliveryConfig ? 'Saving...' : 'Save Settings'}
                        </button>
                    </div>
                </div>

                {deliveryMethod !== 'rider_collects' && (
                    <>
                        {/* Image Upload Section */}
                        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mt-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Delivery Fee Document</h3>
                                    <p className="text-sm text-gray-500">Upload an image or PDF of your delivery zones and fees for the AI to reference.</p>
                                </div>
                                <label className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer ${uploadingImage
                                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                    : 'bg-brand-600 text-white hover:bg-brand-700 shadow-lg shadow-brand-500/20'
                                    }`}>
                                    <input
                                        type="file"
                                        accept=".pdf,image/*"
                                        className="hidden"
                                        disabled={uploadingImage}
                                        onChange={handleUploadDeliveryImage}
                                    />
                                    {uploadingImage ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                                    {uploadingImage ? 'Uploading...' : 'Upload Document'}
                                </label>
                            </div>

                            {deliveryImage ? (
                                <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50 aspect-video max-h-[400px] flex items-center justify-center group">
                                    {deliveryImage.toLowerCase().endsWith('.pdf') ? (
                                        <iframe src={deliveryImage} className="w-full h-full" title="Delivery Fees PDF" />
                                    ) : (
                                        <img src={deliveryImage} alt="Delivery Fees" className="w-full h-full object-contain" />
                                    )}
                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity flex justify-between items-center">
                                        <a href={deliveryImage} target="_blank" rel="noopener noreferrer" className="text-white text-sm font-medium hover:underline">
                                            View Full Version
                                        </a>
                                    </div>
                                </div>
                            ) : (
                                <div className="border-2 border-dashed border-gray-200 rounded-lg p-12 flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                                    <Upload size={32} className="mb-3 text-gray-300" />
                                    <p className="text-sm">No document uploaded yet</p>
                                </div>
                            )}
                        </div>

                        {/* Manual Fee List Section */}
                        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mt-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-1">Fee Locations</h3>
                                    <p className="text-sm text-gray-500 max-w-md">Manually list your delivery zones and fees for simpler extraction.</p>
                                </div>
                                <div className="flex items-center bg-gray-50 p-1 rounded-lg border border-gray-200 shadow-sm shrink-0">
                                    <button
                                        onClick={() => setDeliveryViewMode('list')}
                                        className={`p-1.5 rounded-md transition-all flex items-center gap-1.5 px-3 text-sm font-medium ${deliveryViewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                        title="List View"
                                    >
                                        <List size={16} /> <span className="hidden sm:inline">List</span>
                                    </button>
                                    <button
                                        onClick={() => setDeliveryViewMode('card')}
                                        className={`p-1.5 rounded-md transition-all flex items-center gap-1.5 px-3 text-sm font-medium ${deliveryViewMode === 'card' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                        title="Card View"
                                    >
                                        <LayoutGrid size={16} /> <span className="hidden sm:inline">Grid</span>
                                    </button>
                                </div>
                            </div>

                            <form onSubmit={handleAddDeliveryFee} className="flex flex-col sm:flex-row gap-3 mb-6">
                                <input
                                    type="text"
                                    placeholder="Location (e.g., Lekki Phase 1)"
                                    value={newLocation}
                                    onChange={(e) => setNewLocation(e.target.value)}
                                    className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm"
                                    required
                                />
                                <div className="relative flex-1 sm:max-w-[200px]">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₦</span>
                                    <input
                                        type="number"
                                        placeholder="Amount"
                                        value={newFee}
                                        onChange={(e) => setNewFee(e.target.value)}
                                        className="w-full pl-8 pr-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm"
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="px-6 py-2.5 bg-gray-900 text-white rounded-lg font-bold hover:bg-gray-800 transition-colors whitespace-nowrap"
                                >
                                    Add Fee
                                </button>
                            </form>

                            {/* Fee List */}
                            {deliveryFees && deliveryFees.length > 0 ? (
                                deliveryViewMode === 'card' ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                        {deliveryFees.map((fee) => (
                                            <div key={fee.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col gap-2 hover:border-brand-300 transition-colors">
                                                <div className="flex justify-between items-start">
                                                    <p className="font-bold text-gray-900 line-clamp-2 pr-4">{fee.location}</p>
                                                    <button
                                                        onClick={() => handleRemoveDeliveryFee(fee.id)}
                                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0 -mt-1 -mr-1"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                                <div className="mt-auto pt-2">
                                                    <span className="font-bold text-brand-700 bg-brand-50 px-2.5 py-1 rounded inline-block text-sm border border-brand-100">
                                                        ₦{Number(fee.fee).toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 overflow-hidden">
                                        {deliveryFees.map((fee) => (
                                            <div key={fee.id} className="flex items-center justify-between p-3 sm:p-4 hover:bg-gray-50 transition-colors">
                                                <div className="pr-4 mr-auto min-w-[50%]">
                                                    <p className="font-bold text-gray-900 text-sm sm:text-base line-clamp-1">{fee.location}</p>
                                                </div>
                                                <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                                                    <span className="font-bold text-gray-900 bg-gray-100 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm whitespace-nowrap border border-gray-200">
                                                        ₦{Number(fee.fee).toLocaleString()}
                                                    </span>
                                                    <button
                                                        onClick={() => handleRemoveDeliveryFee(fee.id)}
                                                        className="p-1 sm:p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )
                            ) : (
                                <div className="text-center py-8 text-gray-500 text-sm border border-gray-100 rounded-lg bg-gray-50">
                                    No specific locations added yet. Add some above.
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Unsaved Changes Reminder Popup */}
            {isDeliveryDirty && !savingDeliveryConfig && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300 w-max max-w-[90vw]">
                    <div className="bg-red-600 text-white px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3 border border-red-500/20 whitespace-nowrap">
                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shrink-0" />
                        <span className="text-xs sm:text-sm font-bold">Unsaved changes</span>
                        <button
                            onClick={handleSaveDeliveryConfig}
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

export default ClientDelivery;
