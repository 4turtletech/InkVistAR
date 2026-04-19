import React, { useState, useEffect } from 'react';
import Axios from 'axios';
import { Plus, Download, FileText, Settings, CreditCard, CheckCircle, Printer, X, Trash2, Edit, Search, Filter, SlidersHorizontal } from 'lucide-react';
import { filterName, filterMoney, clampNumber } from '../utils/validation';
import PhilippinePeso from '../components/PhilippinePeso';

import AdminSideNav from '../components/AdminSideNav';
import './AdminUsers.css';
import './AdminSettings.css'; // Reusing form styles
import './AdminBilling.css';
import ConfirmModal from '../components/ConfirmModal';
import Pagination from '../components/Pagination';
import './PortalStyles.css';
import './AdminStyles.css';
import { API_URL } from '../config';

function AdminBilling() {
    const [activeTab, setActiveTab] = useState('invoices');
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sourceFilter, setSourceFilter] = useState('all');
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
    
    // Validation states
    const [invoiceErrors, setInvoiceErrors] = useState({});
    const [payoutErrors, setPayoutErrors] = useState({});

    const validateInvoiceField = (field, value) => {
        let errorMsg = '';
        switch(field) {
            case 'client':
                if (!value.trim()) errorMsg = 'Client name is required';
                break;
            case 'type':
                if (!value) errorMsg = 'Service type is required';
                break;
            case 'amount':
                if (!value || parseFloat(value) <= 0) errorMsg = 'Amount must be greater than 0';
                break;
            default: break;
        }
        setInvoiceErrors(prev => ({ ...prev, [field]: errorMsg }));
        return errorMsg === '';
    };

    const handleInvoiceChange = (field, value) => {
        setNewInvoice(prev => ({ ...prev, [field]: value }));
        validateInvoiceField(field, value);
    };

    const validatePayoutField = (field, value) => {
        let errorMsg = '';
        switch (field) {
            case 'artistId':
                if (!value) errorMsg = 'Artist selection is required';
                break;
            case 'amount':
                if (!value || parseFloat(value) <= 0) errorMsg = 'Amount must be greater than 0';
                break;
            default: break;
        }
        setPayoutErrors(prev => ({ ...prev, [field]: errorMsg }));
        return errorMsg === '';
    };

    const handlePayoutChange = (field, value) => {
        setNewPayout(prev => ({ ...prev, [field]: value }));
        validatePayoutField(field, value);
    };

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
            setInvoiceErrors({});
            setInvoiceModal({ mounted: true, visible: false, mode: 'edit', id: invoice.id });
        } else {
            setNewInvoice({ client: '', amount: '', type: 'Tattoo Session', status: 'Pending' });
            setInvoiceErrors({});
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
        const clientValid = validateInvoiceField('client', newInvoice.client);
        const typeValid = validateInvoiceField('type', newInvoice.type);
        const amountValid = validateInvoiceField('amount', newInvoice.amount);
        
        if (!clientValid || !typeValid || !amountValid) {
            showAlert("Error", "Please fix validation errors before saving.", "warning");
            return;
        }

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
        const artistValid = validatePayoutField('artistId', newPayout.artistId);
        const amountValid = validatePayoutField('amount', newPayout.amount);

        if (!artistValid || !amountValid) {
            showAlert("Error", "Please fix validation errors before saving.", "warning");
            return;
        }

        try {
            const res = await Axios.post(`${API_URL}/api/admin/payouts`, newPayout);
            if (res.data.success) {
                showAlert("Success", "Payout recorded successfully", "success");
                setPayoutModal({ mounted: false, visible: false });
                setNewPayout({ artistId: '', amount: '', method: 'Bank Transfer', reference: '' });
                setPayoutErrors({});
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
        const matchesSearch = (inv.client_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                              inv.id.toString().includes(searchTerm) ||
                              (inv.invoice_number || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || (inv.status || '').toLowerCase() === statusFilter.toLowerCase();
        const isPOS = (inv.service_type || '').toLowerCase().includes('retail') || (inv.service_type || '').toLowerCase().includes('pos');
        const matchesSource = sourceFilter === 'all' || 
            (sourceFilter === 'pos' && isPOS) || 
            (sourceFilter === 'session' && !isPOS);
        return matchesSearch && matchesStatus && matchesSource;
    });

    // Pagination logic
    const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
    const paginatedInvoices = filteredInvoices.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Compute autocomplete suggestions dynamically from the dataset
    const searchSuggestions = Array.from(new Set([
        ...invoices.map(i => (i.id || '').toString()),
        ...invoices.map(i => (i.client_name || '').trim())
    ])).filter(Boolean);

    return (
        <div className="admin-page-with-sidenav">
            <AdminSideNav />
            <div className="admin-page page-container-enter">
                <header className="portal-header">
                    <div className="header-title">
                        <h1>Billing & Payments</h1>
                    </div>
                    <div className="header-actions">
                         <button className={`btn ${activeTab === 'invoices' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('invoices')}>
                            <FileText size={18} className="admin-st-c02c7d9c"/> Transaction Logs
                        </button>
                        <button className={`btn ${activeTab === 'config' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('config')}>
                            <Settings size={18} className="admin-st-c02c7d9c"/> Configuration
                        </button>
                        <button className={`btn ${activeTab === 'payouts' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('payouts')}>
                            <CreditCard size={18} className="admin-st-c02c7d9c"/> Artist Payouts
                        </button>
                    </div>
                </header>
                <p className="header-subtitle">Manage studio revenue, invoices, and payment tracking</p>

                {activeTab === 'invoices' ? (
                        <>
                        <div className="stats-row">
                            <div className="stat-item">
                                <span className="stat-label">Total Revenue</span>
                                <span className="stat-count">₱{invoices.filter(i => i.status?.toLowerCase() === 'paid').reduce((sum, inv) => sum + parseFloat(inv.amount || 0), 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Pending Receivable</span>
                                <span className="stat-count">₱{invoices.filter(i => i.status?.toLowerCase() === 'pending').reduce((sum, inv) => sum + parseFloat(inv.amount || 0), 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Invoices Issued</span>
                                <span className="stat-count">{invoices.length}</span>
                            </div>
                        </div>

                        <div className="premium-filter-bar premium-filter-bar--stacked">
                            <div className="premium-search-box premium-search-box--full">
                                <Search size={16} className="premium-search-icon" />
                                <input
                                    type="text"
                                    list="search-suggestions-billing"
                                    placeholder="Search invoices by client or ID..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    maxLength={100}
                                />
                                <datalist id="search-suggestions-billing">
                                    {searchSuggestions.map(suggestion => (
                                        <option key={suggestion} value={suggestion} />
                                    ))}
                                </datalist>
                            </div>

                            <div className="premium-filters-row">
                                <div className="premium-filter-item">
                                    <Filter size={16} />
                                    <span>Status:</span>
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
                                </div>

                                <div className="premium-filter-item">
                                    <SlidersHorizontal size={16} />
                                    <span>Sort:</span>
                                    <select className="premium-select-v2">
                                        <option value="date">Date</option>
                                        <option value="amount">Amount</option>
                                    </select>
                                </div>

                                <div className="premium-filter-item">
                                    <Filter size={16} />
                                    <span>Source:</span>
                                    <select 
                                        value={sourceFilter} 
                                        onChange={(e) => setSourceFilter(e.target.value)}
                                        className="premium-select-v2"
                                    >
                                        <option value="all">All Sources</option>
                                        <option value="session">Session Payments</option>
                                        <option value="pos">POS Sales</option>
                                    </select>
                                </div>

                                <button className="btn btn-primary admin-st-4796037d" onClick={openModal} >
                                    <Plus size={18} className="admin-st-c02c7d9c" /> Create Invoice
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
                                            <th>Method</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr><td colSpan="8" className="no-data admin-st-3927920f">Loading invoices...</td></tr>
                                        ) : paginatedInvoices.map(inv => (
                                            <tr key={inv.id}>
                                                <td>{inv.invoice_number || `INV-${inv.id}`}</td>
                                                <td>{inv.client_name || 'Walk-in Customer'}</td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        {inv.service_type}
                                                        {((inv.service_type || '').toLowerCase().includes('retail') || (inv.service_type || '').toLowerCase().includes('pos')) && (
                                                            <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: 'rgba(99,102,241,0.1)', color: '#6366f1', whiteSpace: 'nowrap' }}>POS</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td>{new Date(inv.created_at).toLocaleDateString()}</td>
                                                <td>₱{Number(inv.amount).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                <td>
                                                    {(() => {
                                                        try {
                                                            const evt = typeof inv.raw_event === 'string' ? JSON.parse(inv.raw_event) : inv.raw_event;
                                                            return <span style={{fontWeight: '600', color: '#475569'}}>{evt?.method || 'Digital'}</span>;
                                                        } catch(e) {
                                                            return <span style={{fontWeight: '600', color: '#475569'}}>Digital</span>;
                                                        }
                                                    })()}
                                                </td>
                                                <td>
                                                    <span className={`badge status-${(inv.status || '').toLowerCase() === 'paid' ? 'active' : 'pending'}`}>
                                                        {inv.status || 'Unknown'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="admin-st-ce770332">
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
                                            <input type="number" className="form-input" value={config.baseRate} onChange={(e) => handleConfigChange(null, 'baseRate', clampNumber(e.target.value, 0, 100000))} />
                                        </div>
                                        <div className="form-group">
                                            <label>Minimum Deposit (%)</label>
                                            <input type="number" className="form-input" value={config.depositRate} onChange={(e) => handleConfigChange(null, 'depositRate', clampNumber(e.target.value, 0, 100))} />
                                        </div>
                                        <div className="form-group">
                                            <label>Tax Rate (%)</label>
                                            <input type="number" className="form-input" value={config.taxRate} onChange={(e) => handleConfigChange(null, 'taxRate', clampNumber(e.target.value, 0, 100))} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="settings-panel glass-card admin-st-cf0f3aef">
                                <h2>Complexity Multipliers</h2>
                                <div className="settings-section">
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Simple (x)</label>
                                            <input type="number" step="0.1" className="form-input" value={config.complexity.simple} onChange={(e) => handleConfigChange('complexity', 'simple', clampNumber(e.target.value, 0.1, 10))} />
                                        </div>
                                        <div className="form-group">
                                            <label>Detailed (x)</label>
                                            <input type="number" step="0.1" className="form-input" value={config.complexity.detailed} onChange={(e) => handleConfigChange('complexity', 'detailed', clampNumber(e.target.value, 0.1, 10))} />
                                        </div>
                                        <div className="form-group">
                                            <label>Complex (x)</label>
                                            <input type="number" step="0.1" className="form-input" value={config.complexity.complex} onChange={(e) => handleConfigChange('complexity', 'complex', clampNumber(e.target.value, 0.1, 10))} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="settings-panel glass-card admin-st-cf0f3aef">
                                <h2>Style Multipliers</h2>
                                <div className="settings-section">
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Realism (x)</label>
                                            <input type="number" step="0.1" className="form-input" value={config.styles.realism} onChange={(e) => handleConfigChange('styles', 'realism', clampNumber(e.target.value, 0.1, 10))} />
                                        </div>
                                        <div className="form-group">
                                            <label>Traditional (x)</label>
                                            <input type="number" step="0.1" className="form-input" value={config.styles.traditional} onChange={(e) => handleConfigChange('styles', 'traditional', clampNumber(e.target.value, 0.1, 10))} />
                                        </div>
                                        <div className="form-group">
                                            <label>Japanese (x)</label>
                                            <input type="number" step="0.1" className="form-input" value={config.styles.japanese} onChange={(e) => handleConfigChange('styles', 'japanese', clampNumber(e.target.value, 0.1, 10))} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <button className="btn btn-primary admin-st-9424368e" onClick={saveConfig}>Save Configuration</button>
                        </div>
                    )) : activeTab === 'payouts' ? (
                    <div className="payouts-container">
                        <div className="stats-row admin-st-2579959f">
                            <div className="stat-item glass-card">
                                <span className="stat-label" >Total Paid to Artists</span>
                                <span className="stat-count">₱{payouts.reduce((sum, p) => sum + Number(p.amount), 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Pending Payouts (Est.)</span>
                                <span className="stat-count text-warning">₱ --</span>
                            </div>
                        </div>

                        <div className="premium-filter-bar">
                            <h2 className="admin-st-c4858c02">Payout History</h2>
                            <button className="btn btn-primary" onClick={() => {
                                setNewPayout({ artistId: '', amount: '', method: 'Bank Transfer', reference: '' });
                                setPayoutErrors({});
                                setPayoutModal({ mounted: true, visible: true });
                            }}>
                                <Plus size={18} className="admin-st-c02c7d9c" /> Record Payout
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
                                            <td>₱{Number(p.amount).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                            <td>{p.payout_method}</td>
                                            <td>{p.reference_no}</td>
                                            <td><span className="badge status-active">{p.status}</span></td>
                                        </tr>
                                    ))}
                                    {payouts.length === 0 && <tr><td colSpan="6" className="admin-st-3927920f">No payouts recorded.</td></tr>}
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
                                <div className="admin-flex-center admin-gap-15">
                                    <div className="admin-st-c911153f">
                                        <FileText size={20} className="text-bronze" />
                                    </div>
                                    <div>
                                        <h2 className="admin-m-0">{invoiceModal.mode === 'edit' ? 'Update Billing Record' : 'Generate Financial Invoice'}</h2>
                                        <p className="admin-st-925e4e02">Account Settlement & Revenue Log</p>
                                    </div>
                                </div>
                                <button className="close-btn" onClick={closeModal}><X size={24}/></button>
                            </div>
                            <form onSubmit={handleInvoiceSubmit}>
                                <div className="modal-body admin-st-7cea880d">
                                    <div className="form-group admin-mb-20">
                                        <label className={`admin-st-19644797 ${invoiceErrors.client ? 'text-red-500' : ''}`}>Recipient Entity (Client)</label>
                                        <input type="text" className={`form-input ${invoiceErrors.client ? 'border-red-500 bg-red-50' : ''}`} required value={newInvoice.client} onChange={e => handleInvoiceChange('client', filterName(e.target.value).slice(0, 100))} maxLength={100} />
                                        {invoiceErrors.client && <span className="text-red-500 text-xs mt-1 block">{invoiceErrors.client}</span>}
                                    </div>
                                    <div className="admin-st-f9a903f8">
                                        <div className="form-group">
                                            <label className={`admin-st-19644797 ${invoiceErrors.type ? 'text-red-500' : ''}`}>Service Classification</label>
                                            <select className={`form-input ${invoiceErrors.type ? 'border-red-500 bg-red-50' : ''}`} required value={newInvoice.type} onChange={e => handleInvoiceChange('type', e.target.value)}>
                                                <option value="Tattoo Session">Tattoo Session</option>
                                                <option value="Consultation">Consultation</option>
                                                <option value="Piercing">Piercing</option>
                                                <option value="Touch-up">Touch-up</option>
                                                <option value="Aftercare Check">Aftercare Check</option>
                                                <option value="Jewelry Purchase">Jewelry Purchase</option>
                                                <option value="Other">Other</option>
                                            </select>
                                            {invoiceErrors.type && <span className="text-red-500 text-xs mt-1 block">{invoiceErrors.type}</span>}
                                        </div>
                                        <div className="form-group">
                                            <label className={`admin-st-19644797 ${invoiceErrors.amount ? 'text-red-500' : ''}`}>Settlement Amount (₱)</label>
                                            <input type="number" step="0.01" className={`form-input ${invoiceErrors.amount ? 'border-red-500 bg-red-50' : ''}`} required value={newInvoice.amount} onChange={e => handleInvoiceChange('amount', filterMoney(e.target.value))} />
                                            {invoiceErrors.amount && <span className="text-red-500 text-xs mt-1 block">{invoiceErrors.amount}</span>}
                                        </div>
                                    </div>
                                    <div className="admin-st-7460b907">
                                        <p className="admin-st-76a35748">
                                            * This action will generate a formal PDF invoice and log the transaction in the studio's centralized financial ledger.
                                        </p>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={closeModal}>Discard</button>
                                    <button type="submit" className="btn btn-primary admin-st-f9a92399">
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
                    <div className="modal-content xl admin-st-980ed307" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="admin-flex-center admin-gap-15">
                                <div className="admin-st-c911153f">
                                    <Printer size={20} className="text-bronze" />
                                </div>
                                <div>
                                    <h2 className="admin-m-0">Document Preview</h2>
                                    <p className="admin-st-925e4e02">Invoice ID: INV-{previewModal.invoice.id}</p>
                                </div>
                            </div>
                            <div className="admin-flex-center admin-gap-10">
                                <button className="btn btn-primary admin-st-a829cff3" onClick={handlePrintAction} >
                                    <Printer size={18} /> Print / Export PDF
                                </button>
                                <button className="close-btn" onClick={closePreview}><X size={24}/></button>
                            </div>
                        </div>

                        <div className="modal-body admin-st-9fb01d54">
                            <div id="printable-invoice" className="invoice-paper admin-st-e2ff4a71">
                                <div className="invoice-header admin-st-7d0a52ef">
                                    <div className="invoice-biz-info">
                                        <h1 className="admin-st-fea585a8">InkVistAR Studio</h1>
                                        <p className="admin-st-04bfc9c7">123 Tattoo Street, Art District</p>
                                        <p className="admin-st-04bfc9c7">Metropolis, NY 10001</p>
                                        <p className="admin-st-04bfc9c7">Phone: (555) 001-2024</p>
                                    </div>
                                    <div className="invoice-meta admin-st-7851dbc0">
                                        <h2 className="admin-st-208c2b41">INVOICE</h2>
                                        <p className="admin-st-04bfc9c7">Ref: INV-{previewModal.invoice.id}</p>
                                        <p className="admin-st-04bfc9c7">Date: {new Date(previewModal.invoice.created_at).toLocaleDateString()}</p>
                                        <p className="admin-st-04bfc9c7">Method: <strong className="admin-st-ca12521c">{(() => {
                                            try {
                                                const evt = typeof previewModal.invoice.raw_event === 'string' ? JSON.parse(previewModal.invoice.raw_event) : previewModal.invoice.raw_event;
                                                return evt?.method || 'Digital';
                                            } catch(e) { return 'Digital'; }
                                        })()}</strong></p>
                                    </div>
                                </div>

                                <div className="admin-st-f54ed4c4"></div>

                                <div className="invoice-bill-to admin-st-138f8f43">
                                    <h3 className="admin-st-8a586d88">Bill To</h3>
                                    <p className="admin-st-02a7e1b4">{previewModal.invoice.client_name}</p>
                                    <p className="admin-st-a0bdeeca">Client ID: CU-{previewModal.invoice.client_id || 'N/A'}</p>
                                </div>

                                {(() => {
                                    let items = null;
                                    try {
                                        items = typeof previewModal.invoice.items === 'string' ? JSON.parse(previewModal.invoice.items) : previewModal.invoice.items;
                                    } catch(e) {}
                                    
                                    if (items && Array.isArray(items) && items.length > 0) {
                                        return (
                                            <table className="admin-st-0c6b9fcd">
                                                <thead>
                                                    <tr className="admin-st-a7cac501">
                                                        <th className="admin-st-3d480a7a">Item Description</th>
                                                        <th style={{ padding: '10px', border: '1px solid #cbd5e1', textAlign: 'center', fontSize: '14px', backgroundColor: '#f1f5f9', color: '#475569' }}>Qty</th>
                                                        <th style={{ padding: '10px', border: '1px solid #cbd5e1', textAlign: 'right', fontSize: '14px', backgroundColor: '#f1f5f9', color: '#475569' }}>Unit Price</th>
                                                        <th className="admin-st-528bd0d7" style={{ textAlign: 'right' }}>Subtotal</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {items.map((item, idx) => (
                                                        <tr key={idx} className="admin-st-bd4d1d67">
                                                            <td className="admin-st-34eca13f">{item.name}</td>
                                                            <td style={{ padding: '10px', border: '1px solid #cbd5e1', textAlign: 'center', fontSize: '14px' }}>{item.quantity}</td>
                                                            <td style={{ padding: '10px', border: '1px solid #cbd5e1', textAlign: 'right', fontSize: '14px' }}>₱{Number(item.retail_price || item.cost).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                            <td className="admin-st-cd7ba92a" style={{ textAlign: 'right' }}>₱{(Number(item.retail_price || item.cost) * item.quantity).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                <tfoot>
                                                    <tr>
                                                        <td colSpan="3" className="admin-st-6bcbfc83" style={{ textAlign: 'right' }}>Total Settlement Amount:</td>
                                                        <td className="admin-st-b88baa1e" style={{ textAlign: 'right' }}>₱{Number(previewModal.invoice.amount).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        );
                                    }
                                    
                                    return (
                                        <table className="admin-st-0c6b9fcd">
                                            <thead>
                                                <tr className="admin-st-a7cac501">
                                                    <th className="admin-st-3d480a7a">Description of Services</th>
                                                    <th className="admin-st-528bd0d7">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr className="admin-st-bd4d1d67">
                                                    <td className="admin-st-34eca13f">{previewModal.invoice.service_type}</td>
                                                    <td className="admin-st-cd7ba92a">₱{Number(previewModal.invoice.amount).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                </tr>
                                            </tbody>
                                            <tfoot>
                                                <tr>
                                                    <td className="admin-st-6bcbfc83">Total Settlement Amount:</td>
                                                    <td className="admin-st-b88baa1e">₱{Number(previewModal.invoice.amount).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    );
                                })()}

                                <div className="invoice-footer admin-st-ba43e19b">
                                    <p className="admin-st-4e29dcb8">Thank you for choosing InkVistAR Studio for your creative projects.</p>
                                    <div className="admin-st-4e8808c5">
                                        <div>
                                            <p className="admin-st-b31ebddf">Invoice Status</p>
                                            <p style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: previewModal.invoice.status === 'paid' ? '#10b981' : '#f59e0b' }}>
                                                {previewModal.invoice.status.toUpperCase()}
                                            </p>
                                        </div>
                                        <div className="signature-line admin-text-center">
                                            <div className="admin-st-a1012144"></div>
                                            <p className="admin-st-857cce3f">Authorized Studio Signature</p>
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
                                <div className="admin-flex-center admin-gap-15">
                                    <div className="admin-st-c911153f">
                                        <PhilippinePeso size={20} className="text-bronze" />
                                    </div>
                                    <div>
                                        <h2 className="admin-m-0">Artist Remittance</h2>
                                        <p className="admin-st-925e4e02">Record internal staff payout</p>
                                    </div>
                                </div>
                                <button className="close-btn" onClick={() => setPayoutModal({ mounted: false, visible: false })}><X size={24}/></button>
                            </div>
                            <form onSubmit={handlePayoutSubmit}>
                                <div className="modal-body admin-st-7cea880d">
                                    <div className="form-group admin-st-7002f9ca">
                                        <label className={`admin-st-19644797 ${payoutErrors.artistId ? 'text-red-500' : ''}`}>Target Recipient (Artist)</label>
                                        <select className={`form-input ${payoutErrors.artistId ? 'border-red-500 bg-red-50' : ''}`} required value={newPayout.artistId} onChange={e => handlePayoutChange('artistId', e.target.value)}>
                                            <option value="">Select Professional Artist...</option>
                                            {artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                        </select>
                                        {payoutErrors.artistId && <span className="text-red-500 text-xs mt-1 block">{payoutErrors.artistId}</span>}
                                    </div>
                                    <div className="admin-st-c200c71d">
                                        <div className="form-group">
                                            <label className={`admin-st-19644797 ${payoutErrors.amount ? 'text-red-500' : ''}`}>Remittance Amount (₱)</label>
                                            <input type="number" step="0.01" className={`form-input ${payoutErrors.amount ? 'border-red-500 bg-red-50' : ''}`} required value={newPayout.amount} onChange={e => handlePayoutChange('amount', filterMoney(e.target.value))} />
                                            {payoutErrors.amount && <span className="text-red-500 text-xs mt-1 block">{payoutErrors.amount}</span>}
                                        </div>
                                        <div className="form-group">
                                            <label className="admin-st-19644797">Transfer Protocol</label>
                                            <select className="form-input" value={newPayout.method} onChange={e => handlePayoutChange('method', e.target.value)}>
                                                <option value="Bank Transfer">Bank Transfer</option>
                                                <option value="Cash">Cash Disbursement</option>
                                                <option value="G-Cash">G-Cash Digital</option>
                                                <option value="Wallet">System Wallet</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="admin-st-19644797">Transaction Reference / Memo</label>
                                        <input type="text" className="form-input" placeholder="Bank ref # or payout notes..." value={newPayout.reference} onChange={e => handlePayoutChange('reference', e.target.value.substring(0, 100))} maxLength={100} />
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setPayoutModal({ mounted: false, visible: false })}>Cancel</button>
                                    <button type="submit" className="btn btn-primary admin-st-f9a92399">Record Remittance</button>
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