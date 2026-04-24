import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Axios from 'axios';
import { ShoppingCart, Search, Plus, Minus, Trash2, Package, CheckCircle, X, RefreshCw, Filter, Trash, ArrowRight, AlertCircle, Tag, Send, User, CreditCard, Wallet, Banknote, Receipt, RotateCcw, Printer, Download } from 'lucide-react';
import { filterMoney, clampNumber } from '../utils/validation';
import PhilippinePeso from '../components/PhilippinePeso';

import AdminSideNav from '../components/AdminSideNav';
import ConfirmModal from '../components/ConfirmModal';
import './PortalStyles.css';
import './AdminStyles.css';
import { API_URL } from '../config';
import './AdminPOS.css';

function AdminPOS() {
    const [inventory, setInventory] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [showReceipt, setShowReceipt] = useState(false);
    const [lastOrder, setLastOrder] = useState(null);
    const [activeCategory, setActiveCategory] = useState('All');
    const [error, setError] = useState(null);
    const [discountType, setDiscountType] = useState('none');
    const [customDiscount, setCustomDiscount] = useState(0);
    const [showAssessment, setShowAssessment] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [amountTendered, setAmountTendered] = useState('');
    const searchInputRef = useRef(null);
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null, type: 'info', isAlert: false });

    const showAlert = (title, message, type = 'info') => {
        setConfirmDialog({ isOpen: true, title, message, type, isAlert: true, onConfirm: () => setConfirmDialog(prev => ({ ...prev, isOpen: false })) });
    };

    const showConfirm = (title, message, onConfirm) => {
        const confirmHandler = onConfirm || (() => setConfirmDialog(prev => ({ ...prev, isOpen: false })));
        setConfirmDialog({ isOpen: true, title, message, onConfirm: confirmHandler, type: 'warning', isAlert: !onConfirm });
    };

    useEffect(() => {
        console.log("POS System Mounting...");
        fetchInventory();
        fetchCustomers();
    }, []);

    const fetchInventory = useCallback(async () => {
        if (!API_URL) return setError("Configuration Error: API_URL is missing.");
        try {
            setLoading(true);
            setError(null);
            const response = await Axios.get(`${API_URL}/api/admin/inventory?status=active`);
            if (response.data.success) {
                // Sort by name by default
                const sorted = (response.data.data || []).sort((a, b) => a.name.localeCompare(b.name));
                setInventory(sorted);
            }
            setLoading(false);
        } catch (error) {
            console.error("Error fetching inventory:", error);
            setError("Failed to load inventory. Please check your connection.");
            setLoading(false);
        }
    }, []);

    const fetchCustomers = async () => {
        try {
            const response = await Axios.get(`${API_URL}/api/admin/users?status=active`);
            if (response.data.success) {
                const onlyCustomers = (response.data.data || []).filter(u => u.user_type === 'customer');
                setCustomers(onlyCustomers);
            }
        } catch (error) {
            console.error("Error fetching customers:", error);
        }
    };

    const addToCart = (item) => {
        const existing = cart.find(c => c.id === item.id);
        if (existing) {
            if (existing.quantity >= item.current_stock) {
                showAlert("Out of Stock", "Cannot add more. Insufficient stock.", "warning");
                return;
            }
            setCart(cart.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
        } else {
            if (item.current_stock <= 0) {
                showAlert("Out of Stock", "Item is completely out of stock.", "warning");
                return;
            }
            setCart([...cart, { ...item, quantity: 1 }]);
        }
    };

    const updateQuantity = (id, delta) => {
        setCart(cart.map(c => {
            if (c.id === id) {
                const newQty = c.quantity + delta;
                if (newQty <= 0) return c;
                if (newQty > c.current_stock) {
                    showAlert("Out of Stock", "Insufficient stock.", "warning");
                    return c;
                }
                return { ...c, quantity: newQty };
            }
            return c;
        }));
    };

    const removeFromCart = (id) => {
        setCart(cart.filter(c => c.id !== id));
    };

    const clearCart = () => {
        if (cart.length === 0) return;
        showConfirm("Clear Order", "Are you sure you want to clear the current order?", () => setCart([]));
    };

    const cartSubtotal = cart.reduce((sum, item) => sum + ((item.retail_price || item.cost) * item.quantity), 0);
    const discountAmount = discountType === 'pwd_senior' ? (cartSubtotal * 0.20) :
                           discountType === 'promo_10' ? (cartSubtotal * 0.10) :
                           discountType === 'custom' ? ((cartSubtotal * customDiscount) / 100) : 0;
    const cartTotal = cartSubtotal - discountAmount;

    const handleCheckout = async () => {
        if (cart.length === 0) return;
        const customer = customers.find(c => c.id === parseInt(selectedCustomerId));
        const clientLabel = customer ? customer.name : 'Walk-in Customer';

        // Cash validation
        if (paymentMethod === 'Cash' && (parseFloat(amountTendered) || 0) < cartTotal) {
            showAlert("Insufficient Payment", "The amount tendered is less than the total due.", "warning");
            return;
        }
        
        setIsCheckingOut(true);
        try {
            const promises = cart.map(item => 
                Axios.post(`${API_URL}/api/admin/inventory/${item.id}/transaction`, {
                    type: 'out',
                    quantity: item.quantity,
                    reason: 'POS Sale'
                })
            );
            
            await Promise.all(promises);

            // Capture the real invoice number from the backend response
            const invoiceRes = await Axios.post(`${API_URL}/api/admin/invoices`, {
                client: clientLabel,
                type: 'Retail POS Sale',
                amount: cartSubtotal,
                discount_amount: discountAmount,
                discount_type: discountType !== 'none' ? discountType : null,
                status: 'Paid',
                customerId: selectedCustomerId || null,
                items: cart
            });

            const tenderedNum = parseFloat(amountTendered) || 0;
            
            setLastOrder({
                items: [...cart],
                subtotal: cartSubtotal,
                discount_amount: discountAmount,
                total: cartTotal,
                date: new Date().toLocaleString(),
                orderId: invoiceRes.data.invoiceNumber || `INV-${String(invoiceRes.data.id).padStart(6, '0')}`,
                customerName: clientLabel,
                customerId: selectedCustomerId,
                paymentMethod: paymentMethod,
                amountTendered: paymentMethod === 'Cash' ? tenderedNum : cartTotal,
                changeGiven: paymentMethod === 'Cash' ? Math.max(0, tenderedNum - cartTotal) : 0
            });
            
            setCart([]);
            setShowAssessment(false);
            setShowReceipt(true);
            fetchInventory(); // Refresh stock
        } catch (error) {
            console.error("Checkout failed:", error);
            showAlert("Transaction Failed", "Checkout failed. Please try again.", "danger");
        } finally {
            setIsCheckingOut(false);
        }
    };

    const handleNewSale = () => {
        setShowReceipt(false);
        setShowAssessment(false);
        setCart([]);
        setSelectedCustomerId('');
        setDiscountType('none');
        setCustomDiscount(0);
        setPaymentMethod('Cash');
        setAmountTendered('');
        setLastOrder(null);
    };

    const handleSendReceipt = async () => {
        if (!selectedCustomerId) {
            showAlert("Required", "Please select a customer to send the receipt to.", "info");
            return;
        }

        setIsSending(true);
        try {
            // Assuming lastOrder is available and valid
            if (!lastOrder) throw new Error("No recent order found.");
    
            await Axios.post(`${API_URL}/api/admin/send-pos-invoice`, {
                orderId: lastOrder.orderId,
                items: lastOrder.items,
                total: lastOrder.total,
                date: lastOrder.date,
                customerId: selectedCustomerId
            });
            
            showAlert("Success", "Receipt sent to customer via notification!", "success");
        } catch (error) {
            console.error("Failed to send receipt:", error);
            showAlert("Error", "Failed to send receipt. Please try again.", "danger");
        } finally {
            setIsSending(false);
            setShowReceipt(false);
        }
    };
    


    const categories = useMemo(() => {
        const cats = new Set((inventory || []).map(item => item?.category).filter(Boolean));
        return ['All', ...Array.from(cats).sort()];
    }, [inventory]);

    const categoryCounts = useMemo(() => {
        return (inventory || []).reduce((acc, item) => {
            if (item?.category) acc[item.category] = (acc[item.category] || 0) + 1;
            return acc;
        }, {});
    }, [inventory]);

    const filteredInventory = useMemo(() => {
        return Array.isArray(inventory) ? inventory.filter(item => {
            if (!item) return false;
            const matchesSearch = (item.id || '').toString().includes(searchTerm) ||
                                 (item.name || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
                                 (item.category || '').toLowerCase().includes((searchTerm || '').toLowerCase());
            const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
            return matchesSearch && matchesCategory;
        }).sort((a, b) => {
            const aOut = a.current_stock <= 0 ? 1 : 0;
            const bOut = b.current_stock <= 0 ? 1 : 0;
            if (aOut !== bOut) return aOut - bOut;
            return a.name.localeCompare(b.name);
        }) : [];
    }, [inventory, searchTerm, activeCategory]);

    // Compute autocomplete suggestions dynamically from the dataset
    const searchSuggestions = Array.from(new Set([
        ...inventory.map(i => (i.id || '').toString()),
        ...inventory.map(i => (i.name || '').trim()),
        ...inventory.map(i => (i.category || '').trim())
    ])).filter(Boolean);

    return (
        <div className="admin-page-with-sidenav">
            <AdminSideNav />
            <div className="admin-page pos-container page-container-enter">
                <div className="pos-layout">
                    <div className="pos-main">
                        <header className="portal-header">
                            <div className="header-title">
                        <h1>Studio POS</h1>
                    </div>
                            <div className="header-actions">
                                <div className="pos-search">
                                    <Search size={18} className="search-icon" />
                                    <input 
                                        ref={searchInputRef}
                                        type="text" 
                                        list="search-suggestions-pos"
                                        placeholder="Search products..." 
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        maxLength={100}
                                    />
                                </div>
                                <button className="refresh-pos-btn" onClick={fetchInventory} title="Refresh Inventory">
                                    <RefreshCw size={20} className={loading ? 'spinning' : ''} />
                                </button>
                            </div>
                        </header>
                <p className="header-subtitle">Retail & Inventory Transactions</p>

                        <div className="pos-categories">
                            {categories.map(cat => (
                                <button 
                                    key={cat} 
                                    className={`cat-pill-v2 ${activeCategory === cat ? 'active' : ''}`}
                                    onClick={() => setActiveCategory(cat)}
                                >
                                    {cat}
                                    {cat !== 'All' && <span className="cat-count-badge">{categoryCounts[cat]}</span>}
                                </button>
                            ))}
                        </div>

                        {error && <div className="pos-error-msg">{error}</div>}

                        <div className="pos-grid">
                            {loading ? (
                                <div className="pos-loader-container"><div className="pos-spinner"></div><p>Syncing Inventory...</p></div>
                            ) : filteredInventory.length > 0 ? filteredInventory.map(item => (
                                <div 
                                    key={item.id} 
                                    className={`pos-card ${item.current_stock <= 0 ? 'out-of-stock' : ''}`} 
                                    onClick={() => item.current_stock > 0 && addToCart(item)}
                                >
                                    <div className="pos-card-icon" style={{ padding: item.image ? '0' : '', overflow: 'hidden' }}>
                                        {item.image ? (
                                            <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            item.category?.toLowerCase() === 'ink' ? <Tag size={20} /> : <Package size={20} />
                                        )}
                                    </div>
                                    <div className="pos-card-info">
                                        {item.current_stock <= item.min_stock && item.current_stock > 0 && <span className="low-stock-indicator"><AlertCircle size={10} /> Low Stock</span>}
                                        <h3>{item.name}</h3>
                                        <span className="pos-category">{item.category}</span>
                                        <div className="pos-card-footer">
                                            <span className="pos-price">₱{Number(item.retail_price || item.cost).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            <span className={`pos-stock ${item.current_stock <= item.min_stock ? 'low' : ''}`}>
                                                {item.current_stock} {item.unit}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="pos-no-items">
                                    <Filter size={48} />
                                    <p>No products found matching your search</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="pos-sidebar">
                        <div className="cart-container">
                            <div className="cart-header">
                                <ShoppingCart size={20} />
                                <h2>Current Order</h2>
                                <button className="clear-order-btn" onClick={clearCart} title="Clear all">
                                    <Trash size={16} />
                                </button>
                            </div>

                            <div className="cart-items">
                                {cart.length === 0 ? (
                                    <div className="empty-cart">
                                        <Package size={48} />
                                        <p>Your cart is empty</p>
                                    </div>
                                ) : cart.map(item => (
                                    <div key={item.id} className="cart-item">
                                        <div className="cart-item-info">
                                            <h4>{item.name}</h4>
                                            <span>₱{Number(item.retail_price || item.cost).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="cart-item-actions">
                                            <div className="qty-controls">
                                                <button onClick={() => updateQuantity(item.id, -1)}><Minus size={14} /></button>
                                                <span>{item.quantity}</span>
                                                <button onClick={() => updateQuantity(item.id, 1)}><Plus size={14} /></button>
                                            </div>
                                            <button className="remove-item-btn" onClick={() => removeFromCart(item.id)}><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="cart-footer">
                                <div className="cart-summary">
                                    <div className="summary-row" style={{ fontSize: '0.9rem', color: '#64748b' }}>
                                        <span>{cart.length} item{cart.length !== 1 ? 's' : ''}</span>
                                        <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '1.1rem' }}>₱{cartSubtotal.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                </div>
                                <button 
                                    className="checkout-btn" 
                                    disabled={cart.length === 0}
                                    onClick={() => { setAmountTendered(''); setShowAssessment(true); }}
                                >
                                    Review Order
                                    <ArrowRight size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ══════════════ ASSESSMENT MODAL ══════════════ */}
                {showAssessment && (
                    <div className="modal-overlay open" onClick={() => setShowAssessment(false)}>
                        <div className="modal-content large" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '620px' }}>
                            <div className="modal-header">
                                <div className="admin-flex-center admin-gap-15">
                                    <div style={{ width: '40px', height: '40px', background: '#eef2ff', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Receipt size={22} color="#6366f1" />
                                    </div>
                                    <div>
                                        <h2 className="admin-m-0" style={{ fontSize: '1.15rem' }}>Checkout Assessment</h2>
                                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Review order details before completing the sale</p>
                                    </div>
                                </div>
                                <button className="close-btn" onClick={() => setShowAssessment(false)}><X size={24} /></button>
                            </div>

                            <div className="modal-body" style={{ padding: '20px 24px', maxHeight: '65vh', overflowY: 'auto' }}>
                                {/* Cart Items Summary */}
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'block' }}>Order Summary</label>
                                    <div style={{ background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                        {cart.map((item, idx) => (
                                            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: idx < cart.length - 1 ? '1px solid #e2e8f0' : 'none' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, minWidth: '24px' }}>{item.quantity}×</span>
                                                    <span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#1e293b' }}>{item.name}</span>
                                                </div>
                                                <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.9rem' }}>₱{((item.retail_price || item.cost) * item.quantity).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Discount Section */}
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'block' }}>Discount</label>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <select 
                                            style={{ flex: 1, padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none', background: '#fff' }}
                                            value={discountType} 
                                            onChange={(e) => {
                                                setDiscountType(e.target.value);
                                                if(e.target.value !== 'custom') setCustomDiscount(0);
                                            }}
                                        >
                                            <option value="none">No Discount</option>
                                            <option value="pwd_senior">PWD / Senior (20%)</option>
                                            <option value="promo_10">Promo App (10%)</option>
                                            <option value="custom">Custom Percentage</option>
                                        </select>
                                        {discountType === 'custom' && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <input 
                                                    type="number" 
                                                    min="0" max="100" 
                                                    style={{ width: '70px', padding: '10px 8px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', textAlign: 'right' }} 
                                                    value={customDiscount}
                                                    onChange={e => setCustomDiscount(clampNumber(e.target.value, 0, 100))}
                                                />
                                                <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>%</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Totals */}
                                <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '14px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#64748b', marginBottom: '6px' }}>
                                        <span>Subtotal</span>
                                        <span>₱{cartSubtotal.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                    {discountAmount > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#ef4444', marginBottom: '6px' }}>
                                            <span>Discount</span>
                                            <span>-₱{discountAmount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.3rem', fontWeight: 800, color: '#1e293b', paddingTop: '8px', borderTop: '2px solid #e2e8f0' }}>
                                        <span>Total Due</span>
                                        <span>₱{cartTotal.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                </div>

                                {/* Assign Customer */}
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}><User size={13} /> Assign Customer</label>
                                    <select 
                                        value={selectedCustomerId} 
                                        onChange={(e) => setSelectedCustomerId(e.target.value)}
                                        style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none', background: '#fff' }}
                                    >
                                        <option value="">Guest / Walk-in</option>
                                        {customers.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Payment Method */}
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px', display: 'block' }}>Payment Method</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                                        {[
                                            { key: 'Cash', icon: <Banknote size={20} />, color: '#10b981' },
                                            { key: 'Card', icon: <CreditCard size={20} />, color: '#6366f1' },
                                            { key: 'GCash', icon: <Wallet size={20} />, color: '#3b82f6' }
                                        ].map(method => (
                                            <div
                                                key={method.key}
                                                onClick={() => { setPaymentMethod(method.key); if (method.key !== 'Cash') setAmountTendered(''); }}
                                                style={{
                                                    padding: '14px 12px', borderRadius: '12px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s',
                                                    border: paymentMethod === method.key ? `2px solid ${method.color}` : '2px solid #e2e8f0',
                                                    background: paymentMethod === method.key ? `${method.color}10` : 'white',
                                                    color: paymentMethod === method.key ? method.color : '#64748b'
                                                }}
                                            >
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                                                    {method.icon}
                                                    <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{method.key}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Cash Tender Input */}
                                {paymentMethod === 'Cash' && (
                                    <div style={{ marginBottom: '10px' }}>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'block' }}>Amount Tendered</label>
                                        <div style={{ position: 'relative' }}>
                                            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: '#64748b', fontSize: '1.1rem' }}>₱</span>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                placeholder="0.00"
                                                value={amountTendered}
                                                onChange={e => setAmountTendered(filterMoney(e.target.value))}
                                                style={{ width: '100%', padding: '14px 14px 14px 32px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '1.2rem', fontWeight: 700, outline: 'none', boxSizing: 'border-box' }}
                                                autoFocus
                                            />
                                        </div>
                                        {amountTendered && (
                                            <div style={{
                                                marginTop: '10px', padding: '12px 16px', borderRadius: '10px',
                                                background: (parseFloat(amountTendered) || 0) >= cartTotal ? '#f0fdf4' : '#fef2f2',
                                                border: `1px solid ${(parseFloat(amountTendered) || 0) >= cartTotal ? '#bbf7d0' : '#fecaca'}`,
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                            }}>
                                                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: (parseFloat(amountTendered) || 0) >= cartTotal ? '#166534' : '#991b1b' }}>
                                                    {(parseFloat(amountTendered) || 0) >= cartTotal ? 'Change Due' : 'Insufficient Amount'}
                                                </span>
                                                <span style={{ fontWeight: 800, fontSize: '1.1rem', color: (parseFloat(amountTendered) || 0) >= cartTotal ? '#16a34a' : '#ef4444' }}>
                                                    ₱{Math.max(0, (parseFloat(amountTendered) || 0) - cartTotal).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '16px 24px', borderTop: '1px solid #e2e8f0' }}>
                                <button className="btn btn-secondary" onClick={() => setShowAssessment(false)} style={{ padding: '10px 20px', borderRadius: '10px' }}>
                                    Cancel
                                </button>
                                <button 
                                    className="checkout-btn" 
                                    disabled={isCheckingOut || (paymentMethod === 'Cash' && (!amountTendered || (parseFloat(amountTendered) || 0) < cartTotal))}
                                    onClick={handleCheckout}
                                    style={{ width: 'auto', padding: '0 28px', height: '48px', fontSize: '1rem' }}
                                >
                                    {isCheckingOut ? 'Processing...' : <><CheckCircle size={18} /> Complete Transaction</>}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ══════════════ INVOICE / RECEIPT MODAL ══════════════ */}
                {showReceipt && lastOrder && (
                    <div className="modal-overlay open" onClick={handleNewSale}>
                        <div className="modal-content large" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '620px' }}>
                            <div className="modal-header">
                                <div className="admin-flex-center admin-gap-15">
                                    <div style={{ width: '40px', height: '40px', background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <CheckCircle size={22} color="#10b981" />
                                    </div>
                                    <div>
                                        <h2 className="admin-m-0" style={{ fontSize: '1.15rem' }}>Transaction Complete</h2>
                                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Invoice #{lastOrder.orderId}</p>
                                    </div>
                                </div>
                                <button className="close-btn" onClick={handleNewSale}><X size={24} /></button>
                            </div>

                            <div className="modal-body" style={{ padding: '20px 24px', maxHeight: '65vh', overflowY: 'auto' }}>
                                <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                    {/* Invoice Header */}
                                    <div style={{ padding: '20px', borderBottom: '1px dashed #e2e8f0', textAlign: 'center' }}>
                                        <h2 style={{ margin: '0 0 4px 0', fontSize: '1.3rem', fontWeight: 800, color: '#1e293b', letterSpacing: '-0.02em' }}>InkVistAR Studio</h2>
                                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>Official Sales Invoice</p>
                                    </div>

                                    {/* Invoice Meta */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #f1f5f9', fontSize: '0.85rem' }}>
                                        <div>
                                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>Billed To</div>
                                            <div style={{ fontWeight: 600, color: '#1e293b' }}>{lastOrder.customerName}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>Date & Time</div>
                                            <div style={{ fontWeight: 600, color: '#1e293b' }}>{lastOrder.date}</div>
                                        </div>
                                    </div>

                                    {/* Invoice Items */}
                                    <div style={{ padding: '0' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 20px', background: '#f8fafc', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                                            <span>Item</span>
                                            <div style={{ display: 'flex', gap: '40px' }}>
                                                <span style={{ minWidth: '30px', textAlign: 'center' }}>Qty</span>
                                                <span style={{ minWidth: '80px', textAlign: 'right' }}>Amount</span>
                                            </div>
                                        </div>
                                        {lastOrder.items.map(item => (
                                            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 20px', borderBottom: '1px solid #f1f5f9', fontSize: '0.9rem' }}>
                                                <span style={{ fontWeight: 500, color: '#1e293b' }}>{item.name}</span>
                                                <div style={{ display: 'flex', gap: '40px' }}>
                                                    <span style={{ minWidth: '30px', textAlign: 'center', color: '#64748b' }}>{item.quantity}</span>
                                                    <span style={{ minWidth: '80px', textAlign: 'right', fontWeight: 600, color: '#1e293b' }}>₱{((item.retail_price || item.cost) * item.quantity).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Invoice Totals */}
                                    <div style={{ padding: '14px 20px', borderTop: '1px dashed #e2e8f0', background: '#fafbfc' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#64748b', marginBottom: '4px' }}>
                                            <span>Subtotal</span>
                                            <span>₱{lastOrder.subtotal.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                        {lastOrder.discount_amount > 0 && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#ef4444', marginBottom: '4px' }}>
                                                <span>Discount</span>
                                                <span>-₱{lastOrder.discount_amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.15rem', fontWeight: 800, color: '#1e293b', paddingTop: '8px', borderTop: '1px solid #e2e8f0', marginTop: '4px' }}>
                                            <span>Total</span>
                                            <span>₱{lastOrder.total.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                    </div>

                                    {/* Payment Details */}
                                    <div style={{ padding: '14px 20px', borderTop: '1px dashed #e2e8f0', background: '#f0fdf4' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#475569', marginBottom: '4px' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                {lastOrder.paymentMethod === 'Cash' ? <Banknote size={14} /> : lastOrder.paymentMethod === 'Card' ? <CreditCard size={14} /> : <Wallet size={14} />}
                                                Payment Method
                                            </span>
                                            <span style={{ fontWeight: 700 }}>{lastOrder.paymentMethod}</span>
                                        </div>
                                        {lastOrder.paymentMethod === 'Cash' && (
                                            <>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#475569', marginBottom: '4px' }}>
                                                    <span>Amount Tendered</span>
                                                    <span style={{ fontWeight: 600 }}>₱{lastOrder.amountTendered.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: 800, color: '#16a34a', paddingTop: '6px', borderTop: '1px solid #bbf7d0', marginTop: '4px' }}>
                                                    <span>Change Given</span>
                                                    <span>₱{lastOrder.changeGiven.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', padding: '16px 24px', borderTop: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => {
                                            const pw = window.open('', '_blank', 'width=600,height=800');
                                            pw.document.write(`<html><head><title>Invoice #${lastOrder.orderId}</title>
                                            <style>
                                                body { font-family: 'Segoe UI', sans-serif; padding: 40px; color: #1e293b; max-width: 520px; margin: 0 auto; }
                                                .header { text-align: center; margin-bottom: 20px; border-bottom: 2px dashed #e2e8f0; padding-bottom: 16px; }
                                                .header h2 { margin: 0 0 4px; font-size: 1.4rem; }
                                                .header p { margin: 0; color: #94a3b8; font-size: 0.85rem; }
                                                .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 0.9rem; }
                                                .section { margin-bottom: 12px; padding: 10px 0; border-bottom: 1px dashed #e2e8f0; }
                                                .label { color: #64748b; font-size: 0.75rem; text-transform: uppercase; }
                                                .value { font-weight: 600; }
                                                .total { font-size: 1.2rem; font-weight: 800; border-top: 2px solid #e2e8f0; margin-top: 8px; padding-top: 12px; }
                                                .success { color: #10b981; }
                                                .footer { text-align: center; margin-top: 24px; color: #94a3b8; font-size: 0.8rem; }
                                                @media print { body { padding: 20px; } }
                                            </style></head><body>
                                            <div class="header"><h2>InkVistAR Studio</h2><p>Official Sales Invoice</p></div>
                                            <div class="section">
                                                <div class="row"><span class="label">Invoice #</span><span class="value">${lastOrder.orderId}</span></div>
                                                <div class="row"><span class="label">Date</span><span class="value">${lastOrder.date}</span></div>
                                                <div class="row"><span class="label">Client</span><span class="value">${lastOrder.customerName}</span></div>
                                            </div>
                                            <div class="section">
                                                ${lastOrder.items.map(i => `<div class="row"><span>${i.quantity}x ${i.name}</span><span class="value">₱${((i.retail_price || i.cost) * i.quantity).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>`).join('')}
                                            </div>
                                            <div class="section">
                                                <div class="row"><span>Subtotal</span><span>₱${lastOrder.subtotal.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                                                ${lastOrder.discount_amount > 0 ? `<div class="row" style="color:#ef4444"><span>Discount</span><span>-₱${lastOrder.discount_amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>` : ''}
                                                <div class="row total"><span>Total</span><span class="success">₱${lastOrder.total.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                                            </div>
                                            <div class="section">
                                                <div class="row"><span class="label">Payment</span><span class="value">${lastOrder.paymentMethod}</span></div>
                                                ${lastOrder.paymentMethod === 'Cash' ? `
                                                    <div class="row"><span class="label">Tendered</span><span class="value">₱${lastOrder.amountTendered.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                                                    <div class="row"><span class="label">Change</span><span class="value success">₱${lastOrder.changeGiven.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                                                ` : ''}
                                            </div>
                                            <div class="footer"><p>Thank you for shopping at InkVistAR Studio</p></div>
                                            </body></html>`);
                                            pw.document.close();
                                            pw.focus();
                                            setTimeout(() => pw.print(), 300);
                                        }}
                                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', borderRadius: '10px', fontWeight: 600 }}
                                    >
                                        <Printer size={16} /> Print
                                    </button>
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => {
                                            // Download = same print flow (browser "Save as PDF")
                                            const pw = window.open('', '_blank', 'width=600,height=800');
                                            pw.document.write(`<html><head><title>Invoice #${lastOrder.orderId}</title>
                                            <style>body { font-family: 'Segoe UI', sans-serif; padding: 40px; color: #1e293b; max-width: 520px; margin: 0 auto; }
                                            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px dashed #e2e8f0; padding-bottom: 16px; }
                                            .header h2 { margin: 0 0 4px; } .header p { margin: 0; color: #94a3b8; font-size: 0.85rem; }
                                            .row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 0.9rem; }
                                            .section { margin-bottom: 12px; padding: 10px 0; border-bottom: 1px dashed #e2e8f0; }
                                            .total { font-size: 1.2rem; font-weight: 800; border-top: 2px solid #e2e8f0; margin-top: 8px; padding-top: 12px; }
                                            .success { color: #10b981; } .footer { text-align: center; margin-top: 24px; color: #94a3b8; }
                                            </style></head><body>
                                            <div class="header"><h2>InkVistAR Studio</h2><p>Sales Invoice #${lastOrder.orderId}</p></div>
                                            <div class="section">${lastOrder.items.map(i => `<div class="row"><span>${i.quantity}x ${i.name}</span><span>₱${((i.retail_price || i.cost) * i.quantity).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>`).join('')}</div>
                                            <div class="section"><div class="row total"><span>Total</span><span class="success">₱${lastOrder.total.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div></div>
                                            <div class="footer"><p>Thank you for shopping at InkVistAR Studio</p></div>
                                            </body></html>`);
                                            pw.document.close();
                                            pw.focus();
                                            setTimeout(() => pw.print(), 300);
                                        }}
                                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', borderRadius: '10px', fontWeight: 600 }}
                                    >
                                        <Download size={16} /> Download
                                    </button>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button 
                                        className="btn btn-primary"
                                        onClick={handleSendReceipt} 
                                        disabled={isSending || !lastOrder.customerId}
                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '10px', cursor: lastOrder.customerId ? 'pointer' : 'not-allowed', opacity: lastOrder.customerId ? 1 : 0.5 }}
                                    >
                                        <Send size={16} /> {isSending ? 'Sending...' : 'Send to Customer'}
                                    </button>
                                    <button 
                                        className="checkout-btn"
                                        onClick={handleNewSale}
                                        style={{ width: 'auto', padding: '0 28px', height: '48px', fontSize: '1rem', background: '#10b981', color: 'white', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}
                                    >
                                        <RotateCcw size={18} /> New Sale
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <ConfirmModal {...confirmDialog} onClose={() => setConfirmDialog(prev => ({...prev, isOpen: false}))} />
        </div>
    );
}

export default AdminPOS;