import React, { useState, useEffect } from 'react';
import Axios from 'axios';
import { Plus, Download, FileText, Settings, CreditCard, DollarSign, CheckCircle, Printer, X, Trash2, Edit, Search, Filter, SlidersHorizontal } from 'lucide-react';
import AdminSideNav from '../components/AdminSideNav';
import './AdminUsers.css';
import './AdminSettings.css'; // Reusing form styles
import './AdminBilling.css';
import ConfirmModal from '../components/ConfirmModal';
import Pagination from '../components/Pagination';
import { API_URL } from '../config';

function AdminBilling() {
    const [activeTab, setActiveTab] = useState('invoices');
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [payouts, setPayouts] = useState([]);
    const [artists, setArtists] = useState([]);
    const [payoutModal, setPayoutModal] = useState({ mounted: false, visible: false });
    const [newPayout, setNewPayout] = useState({ artistId: '', amount: '', method: 'Bank Transfer', reference: '' });

    const [config, setConfig] = useState({
        baseRate: 150,
        taxRate: 8,
        depositRate: 20,
        size: { small: 100, medium: 250, large: 500 },
        complexity: { simple: 1.0, detailed: 1.5, complex: 2.0 },
        styles: { realism: 1.2, traditional: 1.0, japanese: 1.3, tribal: 1.0 }
    });

    const [invoiceModal, setInvoiceModal] = useState({ mounted: false, visible: false, mode: 'create', id: null });
    const [newInvoice, setNewInvoice] = useState({ client: '', amount: '', type: 'Tattoo Session', status: 'Pending' });
    const [previewModal, setPreviewModal] = useState({ mounted: false, visible: false, invoice: null });

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [confirmDialog, setConfirmDialog] = useState({ 
        isOpen: false, 
        title: '', 
        message: '', 
        onConfirm: null,
        type: 'danger',
        isAlert: false
    });

    // Modal animation handlers
    const openModal = (mode = 'create', invoice = null) => {
        if (mode === 'edit' && invoice) {
            setNewInvoice({
                client: invoice.client_name,
                amount: invoice.amount,
                type: invoice.service_type,
                status: invoice.status
            });
            setInvoiceModal({ mounted: true, visible: false, mode: 'edit', id: invoice.id });
        } else {
            setNewInvoice({ client: '', amount: '', type: 'Tattoo Session', status: 'Pending' });
            setInvoiceModal({ mounted: true, visible: false, mode: 'create', id: null });
        }
        setTimeout(() => setInvoiceModal(prev => ({ ...prev, visible: true })), 10);
    };

    const closeModal = () => {
        setInvoiceModal(prev => ({ ...prev, visible: false }));
        setTimeout(() => {
            setInvoiceModal({ mounted: false, visible: false, mode: 'create', id: null });
        }, 400);
    };

    const showAlert = (title, message, type = 'info') => {
        setConfirmDialog({
            isOpen: true,
            title,
            message,
            type,
            isAlert: true,
            onConfirm: () => setConfirmDialog(prev => ({ ...prev, isOpen: false }))
        });
    };

    const openPreview = (invoice) => {
        setPreviewModal({ mounted: true, visible: false, invoice });
        setTimeout(() => setPreviewModal({ mounted: true, visible: true, invoice }), 10);
    };

    const closePreview = () => {
        setPreviewModal(prev => ({ ...prev, visible: false }));
        setTimeout(() => {
            setPreviewModal({ mounted: false, visible: false, invoice: null });
        }, 400);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [invRes, settingsRes, artistRes] = await Promise.all([
                Axios.get(`${API_URL}/api/admin/invoices`),
                Axios.get(`${API_URL}/api/admin/settings`),
                Axios.get(`${API_URL}/api/customer/artists`)
            ]);

            if (invRes.data.success) setInvoices(invRes.data.data);
            if (settingsRes.data.success && settingsRes.data.data.billing) setConfig(prev => ({ ...prev, ...settingsRes.data.data.billing }));
            if (artistRes.data.success) {
                setArtists(artistRes.data.artists);
            }
            
            // Real payouts fetch
            const pRes = await Axios.get(`${API_URL}/api/admin/payouts`);
            if (pRes.data.success) setPayouts(pRes.data.data);

            setLoading(false);
        } catch (error) {
            console.error("Error fetching billing data:", error);
            setLoading(false);
        }
    };

    const handleInvoiceSubmit = async (e) => {
        e.preventDefault();
        try {
            if (invoiceModal.mode === 'edit') {
                await Axios.put(`${API_URL}/api/admin/invoices/${invoiceModal.id}`, newInvoice);
            } else {
                await Axios.post(`${API_URL}/api/admin/invoices`, newInvoice);
            }
            closeModal();
            fetchData(); // Refresh list
        } catch (error) {
            console.error("Error saving invoice:", error);
            showAlert("Error", "Failed to save invoice: " + (error.response?.data?.message || error.message), "danger");
        }
    };

    const handleDeleteInvoice = (id) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Delete Invoice',
            message: 'Are you sure you want to delete this invoice?',
            onConfirm: async () => {
                setConfirmDialog({ isOpen: false });
                try {
                    await Axios.delete(`${API_URL}/api/admin/invoices/${id}`);
                    fetchData();
                } catch (error) {
                    console.error("Error deleting invoice:", error);
                }
            }
        });
    };

    const saveConfig = async () => {
        try {
            await Axios.post(`${API_URL}/api/admin/settings`, {
                section: 'billing',
                data: config
            });
            showAlert("Success", "Configuration saved successfully", "success");
        } catch (error) {
            console.error("Error saving config:", error);
            showAlert("Error", "Failed to save configuration", "danger");
        }
    };

    const handlePrintAction = () => {
        window.print();
    };

    const handlePayoutSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await Axios.post(`${API_URL}/api/admin/payouts`, newPayout);
            if (res.data.success) {
                showAlert("Success", "Payout recorded successfully", "success");
                setPayoutModal({ mounted: false, visible: false });
                fetchData();
            }
        } catch (error) {
            showAlert("Error", "Failed to record payout", "danger");
        }
    };

    const handleConfigChange = (section, key, value) => {
        if (section) {
            setConfig({ ...config, [section]: { ...config[section], [key]: parseFloat(value) } });
        } else {
            setConfig({ ...config, [key]: parseFloat(value) });
        }
    };

    const filteredInvoices = invoices.filter(inv => {
        const matchesSearch = inv.client_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              inv.id.toString().includes(searchTerm);
        const matchesStatus = statusFilter === 'all' || inv.status.toLowerCase() === statusFilter.toLowerCase();
        return matchesSearch && matchesStatus;
    });

    // Pagination logic
    const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
    const paginatedInvoices = filteredInvoices.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="admin-page-with-sidenav">
            <AdminSideNav />
            <div className="admin-page page-container-enter">
                <header className="admin-header">
                    <h1>Billing & Payments</h1>
                    <div style={{display: 'flex', gap: '10px'}}>
                         <button className={`btn ${activeTab === 'invoices' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('invoices')}>
                            <FileText size={18} style={{marginRight: '5px'}}/> Invoices
                        </button>
                        <button className={`btn ${activeTab === 'config' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('config')}>
                            <Settings size={18} style={{marginRight: '5px'}}/> Configuration
                        </button>
                        <button className={`btn ${activeTab === 'payouts' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('payouts')}>
                            <CreditCard size={18} style={{marginRight: '5px'}}/> Artist Payouts
                        </button>
                    </div>
                </header>

                {activeTab === 'invoices' ? (
                        <>
                        <div className="stats-row">
                            <div className="stat-item">
                                <span className="stat-label">Total Revenue (Feb)</span>
                                <span className="stat-count">₱12,450</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Pending Payments</span>
                                <span className="stat-count">₱1,200</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Invoices Issued</span>
                                <span className="stat-count">{invoices.length}</span>
                            </div>
                        </div>

                        <div className="premium-filter-bar">
                            <div className="premium-search-box">
                                <Search size={18} className="premium-search-icon" />
                                <input
                                    type="text"
                                    placeholder="Search invoices by client or ID..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <div className="premium-filters-group" style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'center' }}>
                                <div className="filter-label-group">
                                    <Filter size={16} />
                                    <span>Status:</span>
                                </div>
                                <select 
                                    value={statusFilter} 
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="premium-select-v2"
                                >
                                    <option value="all">All Status</option>
                                    <option value="pending">Pending</option>
                                    <option value="paid">Paid</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>

                                <div className="filter-label-group">
                                    <SlidersHorizontal size={16} />
                                    <span>Sort:</span>
                                </div>
                                <select className="premium-select-v2">
                                    <option value="date">Date</option>
                                    <option value="amount">Amount</option>
                                </select>

                                <button className="btn btn-primary" onClick={openModal} style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
                                    <Plus size={18} style={{ marginRight: '5px' }} /> Create Invoice
                                </button>
                            </div>
                        </div>

                        <div className="table-card-container">
                            <div className="table-responsive">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Invoice ID</th>
                                            <th>Client</th>
                                            <th>Service Type</th>
                                            <th>Date</th>
                                            <th>Amount</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr><td colSpan="7" className="no-data" style={{textAlign: 'center', padding: '2rem'}}>Loading invoices...</td></tr>
                                        ) : paginatedInvoices.map(inv => (
                                            <tr key={inv.id}>
                                                <td>INV-{inv.id}</td>
                                                <td>{inv.client_name}</td>
                                                <td>{inv.service_type}</td>
                                                <td>{new Date(inv.created_at).toLocaleDateString()}</td>
                                                <td>₱{inv.amount}</td>
                                                <td>
                                                    <span className={`badge status-${inv.status.toLowerCase() === 'paid' ? 'active' : 'pending'}`}>
                                                        {inv.status}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div style={{display: 'flex', gap: '5px'}}>
                                                        <button className="action-btn" title="View / Print Invoice" onClick={() => openPreview(inv)}>
                                                            <FileText size={16}/>
                                                        </button>
                                                        <button className="action-btn" title="Edit" onClick={() => openModal('edit', inv)}>
                                                            <Edit size={16}/>
                                                        </button>
                                                        <button className="action-btn delete-btn" title="Delete" onClick={() => handleDeleteInvoice(inv.id)}>
                                                            <Trash2 size={16}/>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <Pagination 
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={setCurrentPage}
                                itemsPerPage={itemsPerPage}
                                onItemsPerPageChange={(newVal) => {
                                    setItemsPerPage(newVal);
                                    setCurrentPage(1);
                                }}
                                totalItems={filteredInvoices.length}
                                unit="invoices"
                            />
                        </div>
                    </>
                ) : activeTab === 'config' ? (
                    !loading && (
                        <div className="settings-container">
                            <div className="settings-panel glass-card">
                                <h2>General Pricing Rules</h2>
                                <div className="settings-section">
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Base Hourly Rate (₱)</label>
                                            <input type="number" className="form-input" value={config.baseRate} onChange={(e) => handleConfigChange(null, 'baseRate', e.target.value)} />
                                        </div>
                                        <div className="form-group">
                                            <label>Minimum Deposit (%)</label>
                                            <input type="number" className="form-input" value={config.depositRate} onChange={(e) => handleConfigChange(null, 'depositRate', e.target.value)} />
                                        </div>
                                        <div className="form-group">
                                            <label>Tax Rate (%)</label>
                                            <input type="number" className="form-input" value={config.taxRate} onChange={(e) => handleConfigChange(null, 'taxRate', e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="settings-panel glass-card" style={{marginTop: '2rem'}}>
                                <h2>Complexity Multipliers</h2>
                                <div className="settings-section">
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Simple (x)</label>
                                            <input type="number" step="0.1" className="form-input" value={config.complexity.simple} onChange={(e) => handleConfigChange('complexity', 'simple', e.target.value)} />
                                        </div>
                                        <div className="form-group">
                                            <label>Detailed (x)</label>
                                            <input type="number" step="0.1" className="form-input" value={config.complexity.detailed} onChange={(e) => handleConfigChange('complexity', 'detailed', e.target.value)} />
                                        </div>
                                        <div className="form-group">
                                            <label>Complex (x)</label>
                                            <input type="number" step="0.1" className="form-input" value={config.complexity.complex} onChange={(e) => handleConfigChange('complexity', 'complex', e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="settings-panel glass-card" style={{marginTop: '2rem'}}>
                                <h2>Style Multipliers</h2>
                                <div className="settings-section">
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Realism (x)</label>
                                            <input type="number" step="0.1" className="form-input" value={config.styles.realism} onChange={(e) => handleConfigChange('styles', 'realism', e.target.value)} />
                                        </div>
                                        <div className="form-group">
                                            <label>Traditional (x)</label>
                                            <input type="number" step="0.1" className="form-input" value={config.styles.traditional} onChange={(e) => handleConfigChange('styles', 'traditional', e.target.value)} />
                                        </div>
                                        <div className="form-group">
                                            <label>Japanese (x)</label>
                                            <input type="number" step="0.1" className="form-input" value={config.styles.japanese} onChange={(e) => handleConfigChange('styles', 'japanese', e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <button className="btn btn-primary" style={{marginTop: '2rem', width: '160px'}} onClick={saveConfig}>Save Configuration</button>
                        </div>
                    )) : activeTab === 'payouts' ? (
                    <div className="payouts-container">
                        <div className="stats-row" style={{marginBottom: '2rem'}}>
                            <div className="stat-item glass-card">
                                <span className="stat-label" >Total Paid to Artists</span>
                                <span className="stat-count">₱{payouts.reduce((sum, p) => sum + Number(p.amount), 0).toLocaleString()}</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Pending Payouts (Est.)</span>
                                <span className="stat-count text-warning">₱ --</span>
                            </div>
                        </div>

                        <div className="premium-filter-bar">
                            <h2 style={{margin: 0}}>Payout History</h2>
                            <button className="btn btn-primary" onClick={() => setPayoutModal({ mounted: true, visible: true })}>
                                <Plus size={18} style={{ marginRight: '5px' }} /> Record Payout
                            </button>
                        </div>

                        <div className="table-card-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Staff</th>
                                        <th>Amount</th>
                                        <th>Method</th>
                                        <th>Reference</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {payouts.map(p => (
                                        <tr key={p.id}>
                                            <td>{new Date(p.created_at).toLocaleDateString()}</td>
                                            <td>{p.artist_name || 'Artist #' + p.artist_id}</td>
                                            <td>₱{Number(p.amount).toLocaleString()}</td>
                                            <td>{p.payout_method}</td>
                                            <td>{p.reference_no}</td>
                                            <td><span className="badge status-active">{p.status}</span></td>
                                        </tr>
                                    ))}
                                    {payouts.length === 0 && <tr><td colSpan="6" style={{textAlign: 'center', padding: '2rem'}}>No payouts recorded.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : null}

                {/* Create Invoice Modal */}
                {invoiceModal.mounted && (
                    <div className={`modal-overlay ${invoiceModal.visible ? 'open' : ''}`} onClick={closeModal}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <div style={{ background: '#f8fafc', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <FileText size={20} className="text-bronze" />
                                    </div>
                                    <div>
                                        <h2 style={{ margin: 0 }}>{invoiceModal.mode === 'edit' ? 'Update Billing Record' : 'Generate Financial Invoice'}</h2>
                                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Account Settlement & Revenue Log</p>
                                    </div>
                                </div>
                                <button className="close-btn" onClick={closeModal}><X size={24}/></button>
                            </div>
                            <form onSubmit={handleInvoiceSubmit}>
                                <div className="modal-body" style={{ padding: '30px' }}>
                                    <div className="form-group" style={{ marginBottom: '20px' }}>
                                        <label style={{ fontWeight: 700, fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Recipient Entity (Client)</label>
                                        <input type="text" className="form-input" required value={newInvoice.client} onChange={e => setNewInvoice({...newInvoice, client: e.target.value})} />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
                                        <div className="form-group">
                                            <label style={{ fontWeight: 700, fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Service Classification</label>
                                            <select className="form-input" required value={newInvoice.type} onChange={e => setNewInvoice({...newInvoice, type: e.target.value})}>
                                                <option value="Tattoo Session">Tattoo Session</option>
                                                <option value="Consultation">Consultation</option>
                                                <option value="Piercing">Piercing</option>
                                                <option value="Touch-up">Touch-up</option>
                                                <option value="Aftercare Check">Aftercare Check</option>
                                                <option value="Jewelry Purchase">Jewelry Purchase</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label style={{ fontWeight: 700, fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Settlement Amount (₱)</label>
                                            <input type="number" className="form-input" required value={newInvoice.amount} onChange={e => setNewInvoice({...newInvoice, amount: e.target.value})} />
                                        </div>
                                    </div>
                                    <div style={{ marginTop: '20px', padding: '15px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic' }}>
                                            * This action will generate a formal PDF invoice and log the transaction in the studio's centralized financial ledger.
                                        </p>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={closeModal}>Discard</button>
                                    <button type="submit" className="btn btn-primary" style={{ padding: '10px 30px' }}>
                                        {invoiceModal.mode === 'edit' ? 'Update Invoice' : 'Commit & Generate'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>

            {/* Invoice Preview Modal */}
            {previewModal.mounted && (
                <div className={`modal-overlay ${previewModal.visible ? 'open' : ''}`} onClick={closePreview}>
                    <div className="modal-content xl" style={{ height: '90vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <div style={{ background: '#f8fafc', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Printer size={20} className="text-bronze" />
                                </div>
                                <div>
                                    <h2 style={{ margin: 0 }}>Document Preview</h2>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Invoice ID: INV-{previewModal.invoice.id}</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button className="btn btn-primary" onClick={handlePrintAction} style={{ padding: '8px 20px' }}>
                                    <Printer size={18} /> Print / Export PDF
                                </button>
                                <button className="close-btn" onClick={closePreview}><X size={24}/></button>
                            </div>
                        </div>

                        <div className="modal-body" style={{ flex: 1, background: '#f1f5f9', padding: '40px', display: 'flex', justifyContent: 'center', overflowY: 'auto' }}>
                            <div id="printable-invoice" className="invoice-paper" style={{ 
                                background: '#fff', 
                                width: '100%', 
                                maxWidth: '800px', 
                                minHeight: '1000px', 
                                padding: '60px', 
                                borderRadius: '4px',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
                            }}>
                                <div className="invoice-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px' }}>
                                    <div className="invoice-biz-info">
                                        <h1 style={{ color: '#1e293b', margin: '0 0 10px', fontSize: '2rem', fontWeight: 800 }}>InkVistAR Studio</h1>
                                        <p style={{ margin: '2px 0', color: '#64748b' }}>123 Tattoo Street, Art District</p>
                                        <p style={{ margin: '2px 0', color: '#64748b' }}>Metropolis, NY 10001</p>
                                        <p style={{ margin: '2px 0', color: '#64748b' }}>Phone: (555) 001-2024</p>
                                    </div>
                                    <div className="invoice-meta" style={{ textAlign: 'right' }}>
                                        <h2 style={{ margin: '0 0 10px', fontSize: '1.5rem', fontWeight: 700 }}>INVOICE</h2>
                                        <p style={{ margin: '2px 0', color: '#64748b' }}>Ref: INV-{previewModal.invoice.id}</p>
                                        <p style={{ margin: '2px 0', color: '#64748b' }}>Date: {new Date(previewModal.invoice.created_at).toLocaleDateString()}</p>
                                    </div>
                                </div>

                                <div style={{ borderBottom: '2px solid #f1f5f9', marginBottom: '30px' }}></div>

                                <div className="invoice-bill-to" style={{ marginBottom: '40px' }}>
                                    <h3 style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '10px' }}>Bill To</h3>
                                    <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>{previewModal.invoice.client_name}</p>
                                    <p style={{ margin: '4px 0', color: '#64748b' }}>Client ID: CU-{previewModal.invoice.client_id || 'N/A'}</p>
                                </div>

                                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '60px' }}>
                                    <thead>
                                        <tr style={{ background: '#f8fafc' }}>
                                            <th style={{ padding: '15px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Description of Services</th>
                                            <th style={{ padding: '15px', textAlign: 'right', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '20px 15px', fontSize: '1rem' }}>{previewModal.invoice.service_type}</td>
                                            <td style={{ padding: '20px 15px', textAlign: 'right', fontSize: '1.1rem', fontWeight: 600 }}>₱{Number(previewModal.invoice.amount).toLocaleString()}</td>
                                        </tr>
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <td style={{ padding: '30px 15px', textAlign: 'right', fontWeight: 700, fontSize: '1.1rem' }}>Total Settlement Amount:</td>
                                            <td style={{ padding: '30px 15px', textAlign: 'right', fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>₱{Number(previewModal.invoice.amount).toLocaleString()}</td>
                                        </tr>
                                    </tfoot>
                                </table>

                                <div className="invoice-footer" style={{ marginTop: 'auto', paddingTop: '40px', borderTop: '1px solid #f1f5f9' }}>
                                    <p style={{ margin: '0 0 20px', color: '#64748b', fontStyle: 'italic' }}>Thank you for choosing InkVistAR Studio for your creative projects.</p>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                        <div>
                                            <p style={{ margin: 0, fontWeight: 700, fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase' }}>Invoice Status</p>
                                            <p style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: previewModal.invoice.status === 'paid' ? '#10b981' : '#f59e0b' }}>
                                                {previewModal.invoice.status.toUpperCase()}
                                            </p>
                                        </div>
                                        <div className="signature-line" style={{ textAlign: 'center' }}>
                                            <div style={{ borderBottom: '1px solid #1e293b', width: '250px', height: '40px', marginBottom: '8px' }}></div>
                                            <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Authorized Studio Signature</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={closePreview}>Close Preview</button>
                        </div>
                    </div>
                </div>
            )}
                {/* Record Payout Modal */}
                {payoutModal.mounted && (
                    <div className={`modal-overlay ${payoutModal.visible ? 'open' : ''}`} onClick={() => setPayoutModal({ mounted: false, visible: false })}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <div style={{ background: '#f8fafc', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <DollarSign size={20} className="text-bronze" />
                                    </div>
                                    <div>
                                        <h2 style={{ margin: 0 }}>Artist Remittance</h2>
                                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Record internal staff payout</p>
                                    </div>
                                </div>
                                <button className="close-btn" onClick={() => setPayoutModal({ mounted: false, visible: false })}><X size={24}/></button>
                            </div>
                            <form onSubmit={handlePayoutSubmit}>
                                <div className="modal-body" style={{ padding: '30px' }}>
                                    <div className="form-group" style={{marginBottom: '20px'}}>
                                        <label style={{ fontWeight: 700, fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Target Recipient (Artist)</label>
                                        <select className="form-input" required value={newPayout.artistId} onChange={e => setNewPayout({...newPayout, artistId: e.target.value})}>
                                            <option value="">Select Professional Artist...</option>
                                            {artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                        </select>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                                        <div className="form-group">
                                            <label style={{ fontWeight: 700, fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Remittance Amount (₱)</label>
                                            <input type="number" className="form-input" required value={newPayout.amount} onChange={e => setNewPayout({...newPayout, amount: e.target.value})} />
                                        </div>
                                        <div className="form-group">
                                            <label style={{ fontWeight: 700, fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Transfer Protocol</label>
                                            <select className="form-input" value={newPayout.method} onChange={e => setNewPayout({...newPayout, method: e.target.value})}>
                                                <option value="Bank Transfer">Bank Transfer</option>
                                                <option value="Cash">Cash Disbursement</option>
                                                <option value="G-Cash">G-Cash Digital</option>
                                                <option value="Wallet">System Wallet</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label style={{ fontWeight: 700, fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Transaction Reference / Memo</label>
                                        <input type="text" className="form-input" placeholder="Bank ref # or payout notes..." value={newPayout.reference} onChange={e => setNewPayout({...newPayout, reference: e.target.value})} />
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setPayoutModal({ mounted: false, visible: false })}>Cancel</button>
                                    <button type="submit" className="btn btn-primary" style={{ padding: '10px 30px' }}>Record Remittance</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

            <ConfirmModal 
                isOpen={confirmDialog.isOpen}
                title={confirmDialog.title}
                message={confirmDialog.message}
                confirmText={confirmDialog.confirmText}
                onConfirm={confirmDialog.onConfirm}
                onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
                type={confirmDialog.type}
                isAlert={confirmDialog.isAlert}
            />
        </div>
    );
}

export default AdminBilling;