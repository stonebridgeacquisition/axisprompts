import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, X, Loader2, Check, ToggleLeft, ToggleRight, Upload, Save, Truck, Store } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const ClientMenu = () => {
    const { client } = useOutletContext();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingItem, setEditingItem] = useState(null);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Tabs
    const [activeTab, setActiveTab] = useState('menu'); // 'menu' or 'delivery'

    // Delivery Fee State
    const [deliveryFees, setDeliveryFees] = useState([]);
    const [deliveryImage, setDeliveryImage] = useState(client?.delivery_fee_image_url || null);
    const [newLocation, setNewLocation] = useState('');
    const [newFee, setNewFee] = useState('');
    const [uploadingImage, setUploadingImage] = useState(false);
    const [deliveryMethod, setDeliveryMethod] = useState(client?.delivery_method || 'rider_collects');
    const [deliveryInstructions, setDeliveryInstructions] = useState(client?.delivery_instructions || '');
    const [savingDeliveryConfig, setSavingDeliveryConfig] = useState(false);

    // Form State
    const [newItem, setNewItem] = useState({
        name: '',
        price: '',
        category: '',
        description: '',
        track_inventory: false,
        stock_level: 0,
        options: [] // e.g., [{ name: 'Large', price: '5000' }]
    });

    // Variant State
    const [variantName, setVariantName] = useState('');
    const [variantPrice, setVariantPrice] = useState('');

    useEffect(() => {
        if (client?.id) fetchMenuItems();
    }, [client?.id]);

    const fetchMenuItems = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('menu_items')
                .select('*')
                .eq('client_id', client.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setItems(data || []);

            // Fetch delivery fees from the delivery_fees table
            const { data: feeData, error: feeError } = await supabase
                .from('delivery_fees')
                .select('*')
                .eq('client_id', client.id)
                .order('created_at', { ascending: true });

            if (!feeError) setDeliveryFees(feeData || []);

            // Fetch delivery config from client record
            const { data: clientData } = await supabase
                .from('clients')
                .select('delivery_fee_image_url, delivery_method, delivery_instructions')
                .eq('id', client.id)
                .single();

            if (clientData) {
                setDeliveryImage(clientData.delivery_fee_image_url);
                setDeliveryMethod(clientData.delivery_method || 'rider_collects');
                setDeliveryInstructions(clientData.delivery_instructions || '');
            }

        } catch (error) {
            console.error("Error fetching menu:", error);
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
                    delivery_instructions: deliveryInstructions
                })
                .eq('id', client.id);

            if (error) throw error;
            alert('Delivery settings saved!');
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

            // Instead of just saving the image, call the new AI processing function
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

            // The edge function inserts rows into delivery_fees table and saves image URL
            // Refresh the local state
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

    const handleAddVariant = () => {
        if (!variantName || !variantPrice) return;
        setNewItem(prev => ({
            ...prev,
            options: [...prev.options, { name: variantName, price: variantPrice }]
        }));
        setVariantName('');
        setVariantPrice('');
    };

    const removeVariant = (index) => {
        setNewItem(prev => ({
            ...prev,
            options: prev.options.filter((_, i) => i !== index)
        }));
    };

    const handleAddItem = async (e) => {
        e.preventDefault();
        if (!newItem.name || !newItem.price) return;

        try {
            const { data, error } = await supabase
                .from('menu_items')
                .insert([{
                    client_id: client.id,
                    name: newItem.name,
                    price: newItem.price, // Base Price
                    category: newItem.category || 'General',
                    description: newItem.description,
                    track_inventory: newItem.track_inventory,
                    stock_level: newItem.track_inventory ? newItem.stock_level : null,
                    options: newItem.options,
                    is_available: true
                }])
                .select();

            if (error) throw error;

            setItems([data[0], ...items]);
            setNewItem({ name: '', price: '', category: '', description: '', track_inventory: false, stock_level: 0, options: [] });
            setIsAdding(false);
        } catch (error) {
            console.error("Error adding item:", error);
            alert("Failed to add item");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure?")) return;
        try {
            const { error } = await supabase.from('menu_items').delete().eq('id', id);
            if (error) throw error;
            setItems(items.filter(item => item.id !== id));
        } catch (error) {
            console.error("Error deleting item:", error);
        }
    };

    const openEdit = (item) => {
        setEditingItem({
            ...item,
            options: item.options || []
        });
        setVariantName('');
        setVariantPrice('');
    };

    const handleUpdateItem = async (e) => {
        e.preventDefault();
        if (!editingItem) return;
        setSaving(true);
        try {
            const { data, error } = await supabase
                .from('menu_items')
                .update({
                    name: editingItem.name,
                    price: editingItem.price,
                    category: editingItem.category,
                    description: editingItem.description,
                    track_inventory: editingItem.track_inventory,
                    stock_level: editingItem.track_inventory ? editingItem.stock_level : null,
                    options: editingItem.options,
                    is_available: editingItem.is_available
                })
                .eq('id', editingItem.id)
                .select();

            if (error) throw error;
            setItems(items.map(item => item.id === editingItem.id ? data[0] : item));
            setEditingItem(null);
        } catch (error) {
            console.error("Error updating item:", error);
            alert("Failed to update item");
        } finally {
            setSaving(false);
        }
    };

    const handleToggleAvailability = async (item) => {
        const newVal = !item.is_available;
        try {
            const { error } = await supabase
                .from('menu_items')
                .update({ is_available: newVal })
                .eq('id', item.id);

            if (error) throw error;
            setItems(items.map(i => i.id === item.id ? { ...i, is_available: newVal } : i));
            // Also update the editing modal if it's open
            if (editingItem?.id === item.id) {
                setEditingItem(prev => ({ ...prev, is_available: newVal }));
            }
        } catch (error) {
            console.error("Error toggling availability:", error);
        }
    };

    const handleEditVariantAdd = () => {
        if (!variantName || !variantPrice) return;
        setEditingItem(prev => ({
            ...prev,
            options: [...(prev.options || []), { name: variantName, price: variantPrice }]
        }));
        setVariantName('');
        setVariantPrice('');
    };

    const handleEditVariantRemove = (index) => {
        setEditingItem(prev => ({
            ...prev,
            options: prev.options.filter((_, i) => i !== index)
        }));
    };

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Menu & Pricing</h2>
                    <p className="text-gray-500">Manage your menu items and delivery fees.</p>
                </div>

                {activeTab === 'menu' && (
                    <div className="flex items-center gap-2">
                        <label className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 cursor-pointer ${uploading
                            ? 'bg-gray-200 text-gray-500'
                            : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}>
                            <input
                                type="file"
                                accept=".pdf,image/*"
                                className="hidden"
                                disabled={uploading}
                                onChange={async (e) => {
                                    const file = e.target.files[0];
                                    if (!file || !client?.id) return;
                                    setUploading(true);
                                    try {
                                        const path = `${client.id}/menu-${Date.now()}`;
                                        const { error: upErr } = await supabase.storage.from('menus').upload(path, file, { upsert: true });
                                        if (upErr) throw upErr;
                                        const { data: urlData } = supabase.storage.from('menus').getPublicUrl(path);
                                        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-menu`, {
                                            method: 'POST',
                                            headers: {
                                                'Content-Type': 'application/json',
                                                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
                                            },
                                            body: JSON.stringify({ client_id: client.id, menu_url: urlData.publicUrl })
                                        });
                                        const result = await res.json();
                                        if (result.error) throw new Error(result.error);
                                        alert(`✅ Extracted ${result.count} items from your menu!`);
                                        fetchMenuItems();
                                    } catch (err) {
                                        console.error('Upload error:', err);
                                        alert(`Failed to process menu: ${err.message}`);
                                    } finally {
                                        setUploading(false);
                                        e.target.value = '';
                                    }
                                }}
                            />
                            {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                            {uploading ? 'Processing...' : 'Upload AI Menu'}
                        </label>
                        <button
                            onClick={() => setIsAdding(!isAdding)}
                            className="px-4 py-2 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/20 flex items-center gap-2"
                        >
                            {isAdding ? <X size={18} /> : <Plus size={18} />}
                            {isAdding ? 'Cancel' : 'Add Item'}
                        </button>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl">
                <button
                    onClick={() => setActiveTab('menu')}
                    className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'menu'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Menu Items
                </button>
                <button
                    onClick={() => setActiveTab('delivery')}
                    className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'delivery'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Delivery Fees
                </button>
            </div>

            {/* Tab Content: Menu Items */}
            {activeTab === 'menu' && (
                <>
                    {/* Add Item Form */}
                    {isAdding && (
                        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm animate-in slide-in-from-top-4 duration-300">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Add New Item</h3>
                            <form onSubmit={handleAddItem} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Item Name</label>
                                        <input
                                            type="text"
                                            value={newItem.name}
                                            onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                            placeholder="e.g. Jollof Rice"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Price (₦)</label>
                                        <input
                                            type="number"
                                            value={newItem.price}
                                            onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                            placeholder="0.00"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Category</label>
                                        <input
                                            type="text"
                                            value={newItem.category}
                                            onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                            placeholder="e.g. Main Dish"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Description (Optional)</label>
                                        <input
                                            type="text"
                                            value={newItem.description}
                                            onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                                            placeholder="Brief description..."
                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                        />
                                    </div>
                                </div>

                                {/* Stock Management Section */}
                                <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${newItem.track_inventory ? 'bg-brand-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                                            <Plus size={20} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900 text-sm">Inventory Tracking</p>
                                            <p className="text-xs text-gray-500">Enable this if you want to limit stock for this item</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {newItem.track_inventory && (
                                            <div className="flex items-center gap-2">
                                                <label className="text-xs font-bold text-gray-500 uppercase">Qty:</label>
                                                <input
                                                    type="number"
                                                    value={newItem.stock_level}
                                                    onChange={(e) => setNewItem({ ...newItem, stock_level: Number(e.target.value) })}
                                                    className="w-20 px-3 py-1.5 text-sm rounded-lg border border-gray-300 focus:outline-none focus:border-brand-500"
                                                    min="0"
                                                />
                                            </div>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => setNewItem(prev => ({ ...prev, track_inventory: !prev.track_inventory }))}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${newItem.track_inventory ? 'bg-brand-600' : 'bg-gray-300'}`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${newItem.track_inventory ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>
                                </div>

                                {/* Variants Section */}
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Variants / Sizes (Optional)</label>

                                    <div className="flex flex-wrap md:flex-nowrap gap-2 mb-3">
                                        <input
                                            type="text"
                                            placeholder="Name (e.g. Large)"
                                            value={variantName}
                                            onChange={(e) => setVariantName(e.target.value)}
                                            className="flex-1 min-w-[120px] px-3 py-2 text-sm rounded border border-gray-300 focus:outline-none focus:border-brand-500"
                                        />
                                        <input
                                            type="number"
                                            placeholder="Price"
                                            value={variantPrice}
                                            onChange={(e) => setVariantPrice(e.target.value)}
                                            className="w-full md:w-24 px-3 py-2 text-sm rounded border border-gray-300 focus:outline-none focus:border-brand-500"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleAddVariant}
                                            className="w-full md:w-auto px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-bold transition-colors"
                                        >
                                            Add
                                        </button>
                                    </div>

                                    {newItem.options.length > 0 && (
                                        <div className="space-y-2">
                                            {newItem.options.map((opt, idx) => (
                                                <div key={idx} className="flex items-center justify-between bg-white px-3 py-2 rounded border border-gray-200 text-sm">
                                                    <span>{opt.name} - ₦{opt.price}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeVariant(idx)}
                                                        className="text-red-500 hover:text-red-700"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-end gap-3 pt-2">
                                    <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-gray-500 hover:text-gray-700 font-medium">Cancel</button>
                                    <button type="submit" className="px-6 py-2 bg-brand-600 text-white rounded-lg font-bold hover:bg-brand-700 transition-colors">Save Item</button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                        {/* Search Bar */}
                        <div className="p-4 border-b border-gray-200">
                            <div className="relative">
                                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search menu items..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 pr-4 py-2 w-full rounded-lg border border-gray-300 focus:outline-none focus:border-brand-500 text-sm"
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto min-h-[400px]">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Item Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Price</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Stock</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Variants</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                                <Loader2 className="animate-spin mx-auto mb-2 text-brand-600" size={24} />
                                                Loading items...
                                            </td>
                                        </tr>
                                    ) : filteredItems.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                                No menu items found. Add some to get started.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredItems.map((item) => (
                                            <tr
                                                key={item.id}
                                                className={`hover:bg-gray-50 transition-colors group cursor-pointer ${!item.is_available ? 'opacity-60' : ''}`}
                                                onClick={() => openEdit(item)}
                                            >
                                                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                                    {item.name}
                                                    {item.description && <p className="text-xs text-gray-400 font-normal mt-0.5">{item.description}</p>}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500">
                                                    <span className="inline-flex px-2 py-1 rounded bg-gray-100 text-xs font-medium border border-gray-200">
                                                        {item.category || 'General'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm font-bold text-gray-900">
                                                    ₦{Number(item.price).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4 text-sm">
                                                    {!item.track_inventory ? (
                                                        <span className="text-gray-400 text-xs font-medium italic">Unlimited</span>
                                                    ) : (
                                                        <span className={`inline-flex items-center gap-1.5 font-bold ${item.stock_level <= 0 ? 'text-red-600' : item.stock_level <= 5 ? 'text-orange-600' : 'text-gray-900'}`}>
                                                            {item.stock_level}
                                                            {item.stock_level <= 0 && <span className="text-[10px] uppercase bg-red-100 px-1.5 py-0.5 rounded">Out</span>}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-sm">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleToggleAvailability(item); }}
                                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${item.is_available
                                                            ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                                                            : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                                                            }`}
                                                    >
                                                        {item.is_available ? (
                                                            <><ToggleRight size={14} /> Available</>
                                                        ) : (
                                                            <><ToggleLeft size={14} /> Unavailable</>
                                                        )}
                                                    </button>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500">
                                                    {item.options && Array.isArray(item.options) && item.options.length > 0 ? (
                                                        <div className="flex flex-wrap gap-1">
                                                            {item.options.map((opt, i) => (
                                                                <span key={i} className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100">
                                                                    {opt.name}: ₦{opt.price}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-300 text-xs">—</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                                    <div className="flex items-center justify-end gap-2 text-gray-400">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); openEdit(item); }}
                                                            className="p-2 hover:bg-brand-50 hover:text-brand-600 rounded-lg transition-colors"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                                                            className="p-2 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Edit Item Modal */}
                    {editingItem && (
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setEditingItem(null)}>
                            <div
                                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                                    <h3 className="text-lg font-bold text-gray-900">Edit Menu Item</h3>
                                    <button onClick={() => setEditingItem(null)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors">
                                        <X size={20} />
                                    </button>
                                </div>

                                <form onSubmit={handleUpdateItem} className="p-6 space-y-4">
                                    {/* Availability Toggle */}
                                    <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 bg-gray-50">
                                        <div>
                                            <p className="font-medium text-gray-900 text-sm">Availability</p>
                                            <p className="text-xs text-gray-500">Controls whether the agent offers this item</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setEditingItem(prev => ({ ...prev, is_available: !prev.is_available }))}
                                            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${editingItem.is_available ? 'bg-green-500' : 'bg-gray-300'
                                                }`}
                                        >
                                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${editingItem.is_available ? 'translate-x-6' : 'translate-x-1'
                                                }`} />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Item Name</label>
                                            <input
                                                type="text"
                                                value={editingItem.name}
                                                onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Price (₦)</label>
                                            <input
                                                type="number"
                                                value={editingItem.price}
                                                onChange={(e) => setEditingItem({ ...editingItem, price: e.target.value })}
                                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Category</label>
                                            <input
                                                type="text"
                                                value={editingItem.category || ''}
                                                onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Description</label>
                                            <input
                                                type="text"
                                                value={editingItem.description || ''}
                                                onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-sm"
                                            />
                                        </div>
                                    </div>

                                    {/* Edit Stock Section */}
                                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex items-center justify-between">
                                        <div>
                                            <p className="font-bold text-gray-900 text-sm">Inventory Tracking</p>
                                            <p className="text-xs text-gray-500">Control item availability by quantity</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            {editingItem.track_inventory && (
                                                <div className="flex items-center gap-2">
                                                    <label className="text-xs font-bold text-gray-500 uppercase">Stock:</label>
                                                    <input
                                                        type="number"
                                                        value={editingItem.stock_level || 0}
                                                        onChange={(e) => setEditingItem({ ...editingItem, stock_level: Number(e.target.value) })}
                                                        className="w-20 px-3 py-1 text-sm rounded border border-gray-300"
                                                        min="0"
                                                    />
                                                </div>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => setEditingItem(prev => ({ ...prev, track_inventory: !prev.track_inventory }))}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${editingItem.track_inventory ? 'bg-brand-600' : 'bg-gray-300'}`}
                                            >
                                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${editingItem.track_inventory ? 'translate-x-6' : 'translate-x-1'}`} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Edit Variants */}
                                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Variants / Sizes</label>
                                        <div className="flex flex-wrap md:flex-nowrap gap-2 mb-3">
                                            <input
                                                type="text"
                                                placeholder="Variant name (e.g. Large)"
                                                value={variantName}
                                                onChange={(e) => setVariantName(e.target.value)}
                                                className="flex-1 min-w-[120px] px-3 py-2 text-sm rounded border border-gray-300"
                                            />
                                            <input
                                                type="number"
                                                placeholder="Price"
                                                value={variantPrice}
                                                onChange={(e) => setVariantPrice(e.target.value)}
                                                className="w-full md:w-28 px-3 py-2 text-sm rounded border border-gray-300"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleEditVariantAdd}
                                                className="w-full md:w-auto px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm font-medium"
                                            >
                                                Add
                                            </button>
                                        </div>
                                        {editingItem.options && editingItem.options.length > 0 && (
                                            <div className="space-y-2">
                                                {editingItem.options.map((opt, idx) => (
                                                    <div key={idx} className="flex items-center justify-between bg-white px-3 py-2 rounded border border-gray-200 text-sm">
                                                        <span>{opt.name} — ₦{Number(opt.price).toLocaleString()}</span>
                                                        <button type="button" onClick={() => handleEditVariantRemove(idx)} className="text-red-500 hover:text-red-700">
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-end gap-3 pt-2">
                                        <button type="button" onClick={() => setEditingItem(null)} className="px-4 py-2 text-gray-500 hover:text-gray-700 font-medium">
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={saving}
                                            className="px-6 py-2 bg-brand-600 text-white rounded-lg font-bold hover:bg-brand-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                                        >
                                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                            {saving ? 'Saving...' : 'Save Changes'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Tab Content: Delivery Fees */}
            {activeTab === 'delivery' && (
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

                        <button
                            onClick={handleSaveDeliveryConfig}
                            disabled={savingDeliveryConfig}
                            className="px-5 py-2.5 bg-brand-600 text-white rounded-lg font-bold hover:bg-brand-700 transition-colors flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-brand-500/20"
                        >
                            {savingDeliveryConfig ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            {savingDeliveryConfig ? 'Saving...' : 'Save Settings'}
                        </button>
                    </div>

                    {deliveryMethod !== 'rider_collects' && (
                        <>
                            {/* Image Upload Section */}
                            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
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
                            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                                <h3 className="text-lg font-bold text-gray-900 mb-1">Fee Locations</h3>
                                <p className="text-sm text-gray-500 mb-6">Manually list your delivery zones and fees for simpler extraction.</p>

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
                                    <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 overflow-hidden">
                                        {deliveryFees.map((fee) => (
                                            <div key={fee.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                                                <div>
                                                    <p className="font-bold text-gray-900">{fee.location}</p>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className="font-bold text-gray-900 bg-gray-100 px-3 py-1 rounded-full text-sm">
                                                        ₦{Number(fee.fee).toLocaleString()}
                                                    </span>
                                                    <button
                                                        onClick={() => handleRemoveDeliveryFee(fee.id)}
                                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-500 text-sm border border-gray-100 rounded-lg bg-gray-50">
                                        No specific locations added yet. Add some above.
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default ClientMenu;

