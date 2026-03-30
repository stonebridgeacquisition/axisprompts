import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Plus, Search, Edit2, Trash2, X, Loader2, Check, ToggleLeft, ToggleRight, Upload, List, LayoutGrid } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const MenuItemCard = ({ item, handleToggleAvailability, openEdit, handleDelete }) => (
    <div
        onClick={() => openEdit(item)}
        className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3 relative group hover:shadow-md transition-shadow cursor-pointer"
    >
        <div className="flex justify-between items-start gap-2">
            <div>
                <h4 className={`text-sm font-bold text-gray-900 ${!item.is_available ? 'opacity-60' : ''}`}>{item.name}</h4>
                <div className="text-xs text-gray-400 mt-1 line-clamp-2" title={item.description}>{item.description || "No description"}</div>
            </div>
            <button
                onClick={(e) => { e.stopPropagation(); handleToggleAvailability(item); }}
                className={`shrink-0 inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-semibold transition-colors ${item.is_available
                    ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                    : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                    }`}
            >
                {item.is_available ? (
                    <><ToggleRight size={12} /> Active</>
                ) : (
                    <><ToggleLeft size={12} /> Hidden</>
                )}
            </button>
        </div>

        <div className={`flex items-center justify-between text-xs ${!item.is_available ? 'opacity-60' : ''}`}>
            <span className="inline-flex px-2 py-1 rounded bg-gray-100 font-medium border border-gray-200 text-gray-500">
                {item.category || 'General'}
            </span>
            <span className="font-bold text-gray-900 text-sm">₦{Number(item.price).toLocaleString()}</span>
        </div>

        <div className={`flex items-center justify-between text-xs pt-3 border-t border-gray-100 mt-auto ${!item.is_available ? 'opacity-60' : ''}`}>
            <div className="flex flex-col gap-0.5">
                {!item.track_inventory ? (
                    <span className="text-gray-400 font-medium italic">Stock: Unlimited</span>
                ) : (
                    <span className={`font-bold flex items-center gap-1 z-10 ${item.stock_level <= 0 ? 'text-red-600' : item.stock_level <= 5 ? 'text-orange-600' : 'text-gray-900'}`}>
                        Stock: {item.stock_level}
                        {item.stock_level <= 0 && <span className="text-[9px] uppercase bg-red-100 px-1 rounded">Out</span>}
                    </span>
                )}
                {item.track_inventory && item.daily_stock && (
                    <span className="text-[10px] text-blue-600 font-medium">Resets to {item.daily_stock}</span>
                )}
            </div>

            <div className="flex items-center gap-1 shrink-0 relative z-20">
                <button
                    onClick={(e) => { e.stopPropagation(); openEdit(item); }}
                    className="p-1.5 hover:bg-brand-50 hover:text-brand-600 active:scale-95 rounded-lg transition-all text-gray-400"
                >
                    <Edit2 size={14} />
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                    className="p-1.5 hover:bg-red-50 hover:text-red-600 active:scale-95 rounded-lg transition-all text-gray-400"
                >
                    <Trash2 size={14} />
                </button>
            </div>
        </div>
    </div>
);

const ClientMenu = () => {
    const { client } = useOutletContext();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingItem, setEditingItem] = useState(null);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    const [menuViewMode, setMenuViewMode] = useState('list');

    useEffect(() => {
        if (window.innerWidth < 640) {
            setMenuViewMode('card');
        }
    }, []);

    // Form State
    const [newItem, setNewItem] = useState({
        name: '',
        price: '',
        category: '',
        description: '',
        track_inventory: false,
        stock_level: 0,
        daily_stock: ''
    });

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



        } catch (error) {
            console.error("Error fetching menu:", error);
        } finally {
            setLoading(false);
        }
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
                    daily_stock: (newItem.track_inventory && newItem.daily_stock) ? newItem.daily_stock : null,
                    is_available: true
                }])
                .select();

            if (error) throw error;

            setItems([data[0], ...items]);
            setNewItem({ name: '', price: '', category: '', description: '', track_inventory: false, stock_level: 0, daily_stock: '' });
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
            daily_stock: item.daily_stock || ''
        });
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
                    daily_stock: (editingItem.track_inventory && editingItem.daily_stock) ? editingItem.daily_stock : null,
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

                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
                        <button
                            onClick={() => setMenuViewMode('list')}
                            className={`p-1.5 rounded-md transition-all flex items-center gap-1.5 px-3 text-sm font-medium ${menuViewMode === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                            title="List View"
                        >
                            <List size={16} /> <span className="hidden sm:inline">List</span>
                        </button>
                        <button
                            onClick={() => setMenuViewMode('card')}
                            className={`p-1.5 rounded-md transition-all flex items-center gap-1.5 px-3 text-sm font-medium ${menuViewMode === 'card' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                            title="Card View"
                        >
                            <LayoutGrid size={16} /> <span className="hidden sm:inline">Grid</span>
                        </button>
                    </div>
                    <label className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors flex items-center gap-2 cursor-pointer ${uploading
                        ? 'bg-gray-200 text-gray-500'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 shadow-sm'
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
                        {uploading ? 'Processing...' : <span className="hidden sm:inline">Upload AI Menu</span>}
                        {!uploading && <span className="sm:hidden">Upload</span>}
                    </label>
                    <button
                        onClick={() => setIsAdding(!isAdding)}
                        className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/20 flex items-center gap-2"
                    >
                        {isAdding ? <X size={16} /> : <Plus size={16} />}
                        {isAdding ? 'Cancel' : <span className="hidden sm:inline">Add Item</span>}
                        {!isAdding && <span className="sm:hidden">Add</span>}
                    </button>
                </div>
            </div>


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
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
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
                                        <div className="flex items-center gap-2">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Daily Restock:</label>
                                            <div className="relative flex items-center">
                                                <button
                                                    type="button"
                                                    onClick={() => setNewItem({ ...newItem, daily_stock: Math.max(1, (newItem.daily_stock || 1) - 1) })}
                                                    className="absolute left-1 w-6 h-6 flex items-center justify-center bg-gray-100/50 hover:bg-gray-100 text-gray-600 rounded-md transition-colors"
                                                >−</button>
                                                <input
                                                    type="number"
                                                    placeholder="Click to set..."
                                                    value={newItem.daily_stock || ''}
                                                    onChange={(e) => setNewItem({ ...newItem, daily_stock: e.target.value ? Number(e.target.value) : '' })}
                                                    className="w-[110px] px-8 py-1.5 text-center text-sm font-semibold rounded-lg border border-brand-200 focus:outline-none focus:border-brand-500 bg-brand-50/30 placeholder:text-brand-300 placeholder:font-normal"
                                                    min="1"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setNewItem({ ...newItem, daily_stock: (newItem.daily_stock || 0) + 1 })}
                                                    className="absolute right-1 w-6 h-6 flex items-center justify-center bg-gray-100/50 hover:bg-gray-100 text-gray-600 rounded-md transition-colors"
                                                >+</button>
                                            </div>
                                        </div>
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

                <div className="bg-gray-50/30 min-h-[400px]">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                            <Loader2 className="animate-spin mx-auto mb-3 text-brand-600" size={32} />
                            Loading items...
                        </div>
                    ) : filteredItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-500 text-center px-4">
                            No menu items found. Add some to get started.
                        </div>
                    ) : menuViewMode === 'card' ? (
                        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                            {filteredItems.map(item => (
                                <MenuItemCard
                                    key={item.id}
                                    item={item}
                                    handleToggleAvailability={handleToggleAvailability}
                                    openEdit={openEdit}
                                    handleDelete={handleDelete}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Item Name</th>
                                        <th className="hidden lg:table-cell px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
                                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Price</th>
                                        <th className="hidden sm:table-cell px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Stock</th>
                                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="hidden sm:table-cell px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Daily Restock</th>
                                        <th className="px-4 sm:px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredItems.map((item) => (
                                        <tr
                                            key={item.id}
                                            className={`hover:bg-gray-50 transition-colors group cursor-pointer ${!item.is_available ? 'opacity-60' : ''}`}
                                            onClick={() => openEdit(item)}
                                        >
                                            <td className="px-4 sm:px-6 py-4 text-sm font-medium text-gray-900 max-w-[150px] sm:max-w-xs xl:max-w-sm shrink-0">
                                                <div className="line-clamp-2">{item.name}</div>
                                                {item.description && <p className="hidden md:block text-xs text-gray-400 font-normal mt-0.5 truncate">{item.description}</p>}
                                            </td>
                                            <td className="hidden lg:table-cell px-6 py-4 text-sm text-gray-500">
                                                <span className="inline-flex px-2 py-1 rounded bg-gray-100 text-xs font-medium border border-gray-200 whitespace-nowrap">
                                                    {item.category || 'General'}
                                                </span>
                                            </td>
                                            <td className="px-4 sm:px-6 py-4 text-sm font-bold text-gray-900">
                                                ₦{Number(item.price).toLocaleString()}
                                            </td>
                                            <td className="hidden sm:table-cell px-6 py-4 text-sm whitespace-nowrap">
                                                {!item.track_inventory ? (
                                                    <span className="text-gray-400 text-xs font-medium italic">Unlimited</span>
                                                ) : (
                                                    <span className={`inline-flex items-center gap-1.5 font-bold ${item.stock_level <= 0 ? 'text-red-600' : item.stock_level <= 5 ? 'text-orange-600' : 'text-gray-900'}`}>
                                                        {item.stock_level}
                                                        {item.stock_level <= 0 && <span className="text-[10px] uppercase bg-red-100 px-1.5 py-0.5 rounded">Out</span>}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 sm:px-6 py-4 text-sm">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleToggleAvailability(item); }}
                                                    className={`inline-flex items-center justify-center p-1 sm:px-2.5 sm:py-1 rounded-full text-xs font-semibold transition-colors ${item.is_available
                                                        ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                                                        : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                                                        }`}
                                                >
                                                    {item.is_available ? (
                                                        <><ToggleRight size={14} className="hidden sm:block" /><span className="sm:hidden w-2 h-2 rounded-full bg-green-500" title="Available"></span> <span className="hidden sm:inline">Available</span></>
                                                    ) : (
                                                        <><ToggleLeft size={14} className="hidden sm:block" /><span className="sm:hidden w-2 h-2 rounded-full bg-red-500" title="Unavailable"></span> <span className="hidden sm:inline">Unavailable</span></>
                                                    )}
                                                </button>
                                            </td>
                                            <td className="hidden sm:table-cell px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                                                {item.track_inventory && item.daily_stock ? (
                                                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100 font-bold">
                                                        Resets to {item.daily_stock}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-300 text-xs">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm">
                                                <div className="flex items-center justify-end gap-1 sm:gap-2 text-gray-400">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); openEdit(item); }}
                                                        className="p-1 sm:p-2 hover:bg-brand-50 hover:text-brand-600 rounded-lg transition-colors"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                                                        className="p-1 sm:p-2 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Item Modal */}
            {editingItem && ReactDOM.createPortal(
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        zIndex: 9999,
                        background: 'rgba(0,0,0,0.5)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '16px',
                        overscrollBehavior: 'contain'
                    }}
                    onClick={() => setEditingItem(null)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
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
                            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <p className="font-bold text-gray-900 text-sm">Inventory Tracking</p>
                                    <p className="text-xs text-gray-500">Control item availability by quantity</p>
                                </div>
                                <div className="flex flex-wrap items-center justify-end gap-4 w-full md:w-auto">
                                    {editingItem.track_inventory && (
                                        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
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
                                            <div className="flex items-center gap-2">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Daily Restock:</label>
                                                <div className="relative flex items-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditingItem({ ...editingItem, daily_stock: Math.max(1, (editingItem.daily_stock || 1) - 1) })}
                                                        className="absolute left-1 w-6 h-6 flex items-center justify-center bg-gray-100/50 hover:bg-gray-100 text-gray-600 rounded-md transition-colors"
                                                    >−</button>
                                                    <input
                                                        type="number"
                                                        placeholder="Click to set..."
                                                        value={editingItem.daily_stock || ''}
                                                        onChange={(e) => setEditingItem({ ...editingItem, daily_stock: e.target.value ? Number(e.target.value) : '' })}
                                                        className="w-[110px] px-8 py-1.5 text-center text-sm font-semibold rounded-lg border border-brand-200 focus:outline-none focus:border-brand-500 bg-brand-50/30 placeholder:text-brand-300 placeholder:font-normal"
                                                        min="1"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditingItem({ ...editingItem, daily_stock: (editingItem.daily_stock || 0) + 1 })}
                                                        className="absolute right-1 w-6 h-6 flex items-center justify-center bg-gray-100/50 hover:bg-gray-100 text-gray-600 rounded-md transition-colors"
                                                    >+</button>
                                                </div>
                                            </div>
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
                </div>,
                document.body
            )}

        </div>
    );
};

export default ClientMenu;
