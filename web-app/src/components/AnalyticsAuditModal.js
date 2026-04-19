import React, { useState, useEffect } from 'react';
import { X, BarChart3, Plus, Trash2, Edit3, Check, Search, ChevronLeft, ChevronRight, FileText, PieChart as PieChartIcon } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

/* ═══════════════ SHARED CONSTANTS ═══════════════ */
const RAINBOW_PALETTE = ['#3b82f6', '#ef4444', '#10b981', '#a855f7', '#f59e0b', '#06b6d4', '#ec4899', '#84cc16', '#6366f1', '#14b8a6'];
const EXPENSE_COLORS = { Inventory: '#f59e0b', Marketing: '#3b82f6', Bills: '#ef4444', Payouts: '#a855f7', Equipment: '#10b981', Licensing: '#06b6d4', Maintenance: '#ec4899', Extras: '#84cc16' };
const EXPENSE_CATEGORIES = ['Inventory', 'Marketing', 'Bills', 'Payouts', 'Equipment', 'Licensing', 'Maintenance', 'Extras'];
const renderPieLabel = ({ name, percent }) => percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : '';
const ITEMS_PER_PAGE = 8;

// Check if an expense is within the 1-hour edit window
const isWithinEditWindow = (createdAt) => {
    if (!createdAt) return false;
    const diff = new Date() - new Date(createdAt);
    return diff < 60 * 60 * 1000; // 1 hour in ms
};

/**
 * AnalyticsAuditModal — Shared audit modal for widget click-through.
 * Used by both AdminAnalytics and AdminDashboard.
 *
 * Props:
 *  - auditModal: { open, title, type, data }
 *  - onClose: () => void
 *  - analytics: full analytics data object (for audit log arrays)
 *  - expenseList: array of manual expenses
 *  - expenseLoading: boolean
 *  - expenseForm: { category, description, amount }
 *  - setExpenseForm: setter
 *  - onAddExpense: form submit handler
 *  - onDeleteExpense: (id) => void
 *  - onEditExpense: (id, data) => void
 *  - formatDuration: (seconds) => string
 *  - darkMode: boolean (true for Analytics dark page, false for Dashboard light page)
 */
function AnalyticsAuditModal({
    auditModal, onClose, analytics,
    expenseList = [], expenseLoading = false, expenseForm, setExpenseForm,
    onAddExpense, onDeleteExpense, onEditExpense, formatDuration,
    darkMode = false
}) {
    const [auditSearch, setAuditSearch] = useState('');
    const [auditPage, setAuditPage] = useState(1);
    const [modalTab, setModalTab] = useState('summary');
    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState({ category: '', description: '', amount: '' });
    const [errors, setErrors] = useState({});

    const handleFormChange = (field, value) => {
        setExpenseForm(prev => ({ ...prev, [field]: value }));
        if (field === 'amount') {
            if (!value || parseFloat(value) <= 0) {
                setErrors(prev => ({ ...prev, amount: 'Amount must be > 0' }));
            } else {
                setErrors(prev => ({ ...prev, amount: '' }));
            }
        }
    };

    const handleEditChange = (field, value) => {
        setEditData(prev => ({ ...prev, [field]: value }));
        if (field === 'amount') {
            if (!value || parseFloat(value) <= 0) {
                setErrors(prev => ({ ...prev, editAmount: 'Must be > 0' }));
            } else {
                setErrors(prev => ({ ...prev, editAmount: '' }));
            }
        }
    };

    // Automatically reset tab to summary whenever the modal is opened
    useEffect(() => {
        if (auditModal?.open) {
            setModalTab('summary');
            setAuditSearch('');
            setAuditPage(1);
            setEditingId(null);
        }
    }, [auditModal?.open]);

    if (!auditModal.open || !auditModal.data) return null;

    const textPrimary = darkMode ? '#f1f5f9' : '#1e293b';
    const textSecondary = darkMode ? '#94a3b8' : '#64748b';
    const textMuted = darkMode ? '#64748b' : '#94a3b8';
    const brandColor = darkMode ? '#e2e8f0' : '#1e293b';

    // Helper: parse audit_log JSON from DB
    const parseAuditLog = (raw) => {
        if (!raw) return [];
        try { return typeof raw === 'string' ? JSON.parse(raw) : raw; }
        catch { return []; }
    };

    // Helper: format seconds to readable duration
    const fmtDuration = (secs) => {
        if (!secs || secs <= 0) return '—';
        const hrs = Math.floor(secs / 3600);
        const mins = Math.floor((secs % 3600) / 60);
        const s = secs % 60;
        if (hrs > 0) return `${hrs}h ${String(mins).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
        return `${String(mins).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
    };

    // Helper: determine contextual tab label
    const getSecondTabLabel = () => {
        switch (auditModal.type) {
            case 'revenue': case 'expenses': return 'Transaction Log';
            case 'duration': return 'Session Log';
            case 'overhead': return 'Expense Log';
            case 'styles': return 'Portfolio Log';
            default: return 'Audit Log';
        }
    };

    const getAuditLog = () => {
        switch (auditModal.type) {
            case 'revenue': return analytics?.revenue_audit || [];
            case 'appointments': return analytics?.appointments_audit || [];
            case 'completion': return analytics?.appointments_audit?.filter(a => a.status === 'completed' || a.status === 'cancelled') || [];
            case 'duration': return analytics?.duration_audit || [];
            case 'inventory': return analytics?.inventory_out_audit || [];
            case 'artists': return []; // handled separately
            case 'users': return analytics?.users_audit || [];
            case 'overhead': return analytics?.overhead?.audit || [];
            case 'styles': return analytics?.styles_audit || [];
            default: return [];
        }
    };

    const auditLog = getAuditLog();
    const filteredLog = auditLog.filter(row => {
        if (!auditSearch) return true;
        const s = auditSearch.toLowerCase();
        return Object.values(row).some(v => String(v || '').toLowerCase().includes(s));
    });
    const totalPages = Math.ceil(filteredLog.length / ITEMS_PER_PAGE);
    const paginatedLog = filteredLog.slice((auditPage - 1) * ITEMS_PER_PAGE, auditPage * ITEMS_PER_PAGE);

    // Reset search/page when modal data changes
    const handleSearchChange = (val) => {
        setAuditSearch(val);
        setAuditPage(1);
    };

    // Edit handlers
    const startEditing = (exp) => {
        setEditingId(exp.id);
        setEditData({ category: exp.category, description: exp.description || '', amount: exp.amount });
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditData({ category: '', description: '', amount: '' });
    };

    const saveEdit = () => {
        if (errors.editAmount) return; // Prevent saving if invalid
        if (onEditExpense && editingId) {
            onEditExpense(editingId, editData);
            setEditingId(null);
        }
    };

    // ═══ Render audit table columns based on type ═══
    const renderAuditTable = () => {
        if (auditModal.type === 'expenses' || auditModal.type === 'artists') return null;
        if (auditLog.length === 0) return null;

        return (
            <div style={{ marginTop: '16px', borderTop: '1px solid rgba(226,232,240,0.15)', paddingTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '12px', flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: textPrimary }}>{getSecondTabLabel()}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '8px 14px', minWidth: '220px' }}>
                        <Search size={16} color="#64748b" />
                        <input
                            type="text"
                            placeholder="Search logs..."
                            value={auditSearch}
                            onChange={e => handleSearchChange(e.target.value)}
                            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.85rem', color: textPrimary, width: '100%' }}
                        />
                    </div>
                </div>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    <table className="data-table" style={{ fontSize: '0.8rem', width: '100%' }}>
                        <thead>
                            <tr>
                                {auditModal.type === 'revenue' && <><th>Date</th><th>Description</th><th>Source</th><th style={{ textAlign: 'right' }}>Amount</th></>}
                                {auditModal.type === 'appointments' && <><th>Date</th><th>Client</th><th>Artist</th><th>Service</th><th>Status</th><th style={{ textAlign: 'right' }}>Paid</th></>}
                                {auditModal.type === 'completion' && <><th>Date</th><th>Client</th><th>Artist</th><th>Status</th><th style={{ textAlign: 'right' }}>Paid</th></>}
                                {auditModal.type === 'duration' && <><th>Date</th><th>Client</th><th>Artist</th><th>Duration</th><th>Session Timeline</th></>}
                                {auditModal.type === 'inventory' && <><th>Date</th><th>Item</th><th>Category</th><th>Qty</th><th>Reason</th><th>Action By</th><th style={{ textAlign: 'right' }}>Cost</th></>}
                                {auditModal.type === 'overhead' && <><th>Date</th><th>Category</th><th>Description</th><th>Action By</th><th style={{ textAlign: 'right' }}>Amount</th></>}
                                {auditModal.type === 'users' && <><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th>Verified</th></>}
                                {auditModal.type === 'styles' && <><th>Date Added</th><th>Title</th><th>Style</th><th>Artist</th></>}
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedLog.length > 0 ? paginatedLog.map((row, i) => (
                                <tr key={i}>
                                    {auditModal.type === 'revenue' && <>
                                        <td>{new Date(row.date).toLocaleDateString()}</td>
                                        <td style={{ fontWeight: 600 }}>{row.description}</td>
                                        <td><span className="status-badge success" style={{ fontSize: '0.7rem' }}>{row.source}</span></td>
                                        <td style={{ textAlign: 'right', color: '#10b981', fontWeight: 600 }}>₱{Number(row.amount).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td>
                                    </>}
                                    {auditModal.type === 'appointments' && <>
                                        <td>{new Date(row.appointment_date).toLocaleDateString()}</td>
                                        <td style={{ fontWeight: 600 }}>{row.client_name || 'Walk-in'}</td>
                                        <td>{row.artist_name}</td>
                                        <td><span className="status-badge" style={{ fontSize: '0.7rem' }}>{row.service_type || 'Tattoo'}</span></td>
                                        <td><span className={`status-badge ${row.status === 'completed' ? 'success' : row.status === 'cancelled' ? 'danger' : 'pending'}`} style={{ fontSize: '0.7rem' }}>{row.status}</span></td>
                                        <td style={{ textAlign: 'right', fontWeight: 600 }}>₱{Number(row.total_paid || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td>
                                    </>}
                                    {auditModal.type === 'completion' && <>
                                        <td>{new Date(row.appointment_date).toLocaleDateString()}</td>
                                        <td style={{ fontWeight: 600 }}>{row.client_name || 'Walk-in'}</td>
                                        <td>{row.artist_name}</td>
                                        <td><span className={`status-badge ${row.status === 'completed' ? 'success' : 'danger'}`} style={{ fontSize: '0.7rem' }}>{row.status}</span></td>
                                        <td style={{ textAlign: 'right', fontWeight: 600 }}>₱{Number(row.total_paid || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td>
                                    </>}
                                    {auditModal.type === 'duration' && <>
                                        <td>{new Date(row.appointment_date).toLocaleDateString()}</td>
                                        <td style={{ fontWeight: 600 }}>{row.client_name || 'Walk-in'}</td>
                                        <td>{row.artist_name}</td>
                                        <td style={{ fontWeight: 700, color: '#3b82f6' }}>{fmtDuration(row.session_duration)}</td>
                                        <td style={{ fontSize: '0.75rem', color: textSecondary }}>
                                            {parseAuditLog(row.audit_log).length > 0 ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                    {parseAuditLog(row.audit_log).map((entry, j) => (
                                                        <span key={j}><strong>{entry.timestamp}</strong> — {entry.action}</span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span style={{ color: textMuted }}>No timeline recorded</span>
                                            )}
                                        </td>
                                    </>}
                                    {auditModal.type === 'inventory' && <>
                                        <td>{new Date(row.created_at).toLocaleDateString()}</td>
                                        <td style={{ fontWeight: 600 }}>{row.item_name}</td>
                                        <td><span className="status-badge" style={{ fontSize: '0.7rem' }}>{row.category}</span></td>
                                        <td style={{ color: '#ef4444', fontWeight: 600 }}>-{row.quantity}</td>
                                        <td>{row.reason || '—'}</td>
                                        <td>{row.action_by || 'System'}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 600 }}>₱{Number(row.total_cost || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td>
                                    </>}
                                    {auditModal.type === 'overhead' && <>
                                        <td>{new Date(row.created_at).toLocaleDateString()}</td>
                                        <td style={{ fontWeight: 600 }}>{row.category}</td>
                                        <td>{row.description || '—'}</td>
                                        <td>{row.created_by_name || 'System Admin'}</td>
                                        <td style={{ textAlign: 'right', color: '#ef4444', fontWeight: 600 }}>- ₱{Number(row.amount || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td>
                                    </>}
                                    {auditModal.type === 'users' && <>
                                        <td style={{ fontWeight: 600 }}>{row.name}</td>
                                        <td>{row.email}</td>
                                        <td><span className={`status-badge ${row.user_type === 'admin' ? 'danger' : row.user_type === 'artist' ? 'success' : 'pending'}`} style={{ fontSize: '0.7rem', textTransform: 'capitalize' }}>{row.user_type}</span></td>
                                        <td>{new Date(row.created_at).toLocaleDateString()}</td>
                                        <td>{row.is_verified ? '✓' : '—'}</td>
                                    </>}
                                    {auditModal.type === 'styles' && <>
                                        <td>{new Date(row.created_at).toLocaleDateString()}</td>
                                        <td style={{ fontWeight: 600 }}>{row.title || 'Untitled'}</td>
                                        <td><span className="status-badge success" style={{ fontSize: '0.7rem' }}>{row.category}</span></td>
                                        <td>{row.artist_name || 'Unknown'}</td>
                                    </>}
                                </tr>
                            )) : (
                                <tr><td colSpan="7" style={{ textAlign: 'center', color: textMuted, padding: '20px' }}>No audit logs found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '12px', fontSize: '0.8rem', color: textSecondary }}>
                        <button onClick={() => setAuditPage(p => Math.max(1, p - 1))} disabled={auditPage === 1} style={{ background: 'none', border: '1px solid rgba(226,232,240,0.2)', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', color: textSecondary }}><ChevronLeft size={14} /></button>
                        <span>{auditPage} / {totalPages}</span>
                        <button onClick={() => setAuditPage(p => Math.min(totalPages, p + 1))} disabled={auditPage === totalPages} style={{ background: 'none', border: '1px solid rgba(226,232,240,0.2)', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', color: textSecondary }}><ChevronRight size={14} /></button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="modal-overlay open" onClick={onClose}>
            <div className="modal-content xl" onClick={e => e.stopPropagation()} style={{ maxWidth: '900px' }}>
                <div className="modal-header">
                    <div className="admin-flex-center admin-gap-15">
                        <div style={{ width: '40px', height: '40px', background: 'rgba(30,41,59,0.08)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <BarChart3 size={20} color={brandColor} />
                        </div>
                        <div>
                            <h2 className="admin-m-0" style={{ fontSize: '1.1rem' }}>{auditModal.title}</h2>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: textSecondary }}>Data source verification</p>
                        </div>
                    </div>
                    <button className="close-btn" onClick={onClose}><X size={24} /></button>
                </div>
                <div className="modal-body" style={{ padding: '0', maxHeight: '75vh', overflowY: 'auto' }}>
                    <div className="modal-tabs-wrapper-v2" style={{ padding: '20px 24px 0 24px', borderBottom: '1px solid rgba(226,232,240,0.5)', marginBottom: '20px', display: 'flex', gap: '8px' }}>
                        <button type="button" onClick={() => setModalTab('summary')} className={`modal-tab-btn ${modalTab === 'summary' ? 'active' : ''}`}>
                            <PieChartIcon size={14} /> Analytics Overview
                        </button>
                        {(auditModal.type !== 'expenses' && auditModal.type !== 'artists') && (
                            <button type="button" onClick={() => setModalTab('logs')} className={`modal-tab-btn ${modalTab === 'logs' ? 'active' : ''}`}>
                                <FileText size={14} /> {getSecondTabLabel()}
                            </button>
                        )}
                    </div>
                    
                    <div style={{ padding: '0 24px 20px 24px' }}>
                        {modalTab === 'summary' && (
                            <>

                    {/* General breakdown pie + list (Revenue/Appointments/Completion/Users) */}
                    {auditModal.data?.breakdown && auditModal.type !== 'expenses' && (
                        <>
                            <div style={{ width: '100%', height: 350, marginBottom: '16px' }}>
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie data={auditModal.data.breakdown} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={3} dataKey="value" label={renderPieLabel} labelLine={true}>
                                            {auditModal.data.breakdown.map((entry, i) => (
                                                <Cell key={i} fill={RAINBOW_PALETTE[i % RAINBOW_PALETTE.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(v) => ['appointments', 'completion', 'users', 'styles'].includes(auditModal.type) ? v : `₱${Number(v).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <table className="data-table" style={{ fontSize: '0.85rem' }}>
                                <thead><tr><th>Category</th><th style={{ textAlign: 'right' }}>Value</th></tr></thead>
                                <tbody>
                                    {auditModal.data.breakdown.map((b, i) => (
                                        <tr key={i}>
                                            <td style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: RAINBOW_PALETTE[i % RAINBOW_PALETTE.length], display: 'inline-block' }}></span>
                                                {b.name}
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: 600 }}>
                                                {['appointments', 'completion', 'users', 'styles'].includes(auditModal.type) ? `${b.value} bookings` : `₱${Number(b.value).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                {auditModal.data.total !== undefined && (
                                    <tfoot>
                                        <tr>
                                            <td style={{ fontWeight: 700 }}>Total</td>
                                            <td style={{ textAlign: 'right', fontWeight: 700, color: brandColor }}>
                                                {['appointments', 'completion', 'users', 'styles'].includes(auditModal.type) ? auditModal.data.total : `₱${Number(auditModal.data.total).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`}
                                            </td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </>
                    )}

                    {/* Audited EXPENSES View */}
                    {auditModal.type === 'expenses' && (
                        <>
                            <h3 style={{ margin: '0 0 12px', fontSize: '0.95rem', fontWeight: 700, color: textPrimary }}>Recent Artist Payouts</h3>
                            <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '24px' }}>
                                <table className="data-table" style={{ fontSize: '0.8rem' }}>
                                    <thead><tr><th>Date</th><th>Artist</th><th>Method</th><th style={{ textAlign: 'right' }}>Amount</th></tr></thead>
                                    <tbody>
                                        {auditModal.data.payouts_audit?.length > 0 ? auditModal.data.payouts_audit.map((p, i) => (
                                            <tr key={i}>
                                                <td>{new Date(p.created_at).toLocaleDateString()}</td>
                                                <td style={{ fontWeight: 600 }}>{p.artist_name || 'System Artist'}</td>
                                                <td><span className={`status-badge ${p.status === 'paid' ? 'success' : 'pending'}`}>{p.payout_method}</span></td>
                                                <td style={{ textAlign: 'right', color: '#ef4444', fontWeight: 600 }}>- ₱{Number(p.amount).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td>
                                            </tr>
                                        )) : <tr><td colSpan="4" style={{ textAlign: 'center', color: textMuted }}>No payouts history</td></tr>}
                                    </tbody>
                                </table>
                            </div>

                            <h3 style={{ margin: '0 0 12px', fontSize: '0.95rem', fontWeight: 700, color: textPrimary }}>Recent Inventory Procurements (Stock In)</h3>
                            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                <table className="data-table" style={{ fontSize: '0.8rem' }}>
                                    <thead><tr><th>Date</th><th>Item</th><th>Type</th><th>Qty</th><th style={{ textAlign: 'right' }}>Total Cost</th></tr></thead>
                                    <tbody>
                                        {auditModal.data.inventory_in_audit?.length > 0 ? auditModal.data.inventory_in_audit.map((t, i) => (
                                            <tr key={i}>
                                                <td>{new Date(t.created_at).toLocaleDateString()}</td>
                                                <td style={{ fontWeight: 600 }}>{t.name}</td>
                                                <td><span className="status-badge success">Restock</span></td>
                                                <td>{t.quantity}</td>
                                                <td style={{ textAlign: 'right', color: '#ef4444', fontWeight: 600 }}>- ₱{Number(t.total_cost).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td>
                                            </tr>
                                        )) : <tr><td colSpan="5" style={{ textAlign: 'center', color: textMuted }}>No restock history</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}

                    {/* Overhead Manual Expenses view */}
                    {auditModal.type === 'overhead' && (
                        <div style={{ marginTop: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                            <h3 style={{ margin: '0 0 12px', fontSize: '0.95rem', fontWeight: 700, color: textPrimary }}>
                                <Plus size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                                Record Manual Expense
                            </h3>
                            <form onSubmit={onAddExpense} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                                <select className="form-input" value={expenseForm?.category || 'Inventory'} onChange={e => handleFormChange('category', e.target.value)} style={{ flex: '0 0 140px', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
                                    {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <input type="text" placeholder="Description..." value={expenseForm?.description || ''} onChange={e => handleFormChange('description', e.target.value)} style={{ flex: 1, minWidth: '120px', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }} />
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <input type="number" placeholder="Amount (₱)" value={expenseForm?.amount || ''} onChange={e => handleFormChange('amount', e.target.value)} required style={{ flex: '0 0 110px', padding: '8px 10px', borderRadius: '8px', border: `1px solid ${errors.amount ? '#ef4444' : '#e2e8f0'}`, background: errors.amount ? '#fef2f2' : 'white', fontSize: '0.85rem' }} />
                                    {errors.amount && <span style={{ color: '#ef4444', fontSize: '0.7rem', marginTop: '2px' }}>{errors.amount}</span>}
                                </div>
                                <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem', alignSelf: 'flex-start' }} disabled={!!errors.amount}>
                                    <Plus size={14} /> Add
                                </button>
                            </form>

                            <h3 style={{ margin: '0 0 8px', fontSize: '0.95rem', fontWeight: 700, color: textPrimary }}>Expense Ledger</h3>
                            <p style={{ margin: '0 0 12px', fontSize: '0.75rem', color: textMuted }}>
                                Entries can be edited or deleted within 1 hour of creation.
                            </p>
                            {expenseLoading ? (
                                <p style={{ color: textMuted, fontSize: '0.85rem' }}>Loading...</p>
                            ) : expenseList.length === 0 ? (
                                <p style={{ color: textMuted, fontSize: '0.85rem' }}>No manual expenses recorded yet.</p>
                            ) : (
                                <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                                    <table className="data-table" style={{ fontSize: '0.8rem' }}>
                                        <thead><tr><th>Date</th><th>Category</th><th>Description</th><th style={{ textAlign: 'right' }}>Amount</th><th style={{ width: '80px', textAlign: 'center' }}>Actions</th></tr></thead>
                                        <tbody>
                                            {expenseList.map(exp => {
                                                const editable = isWithinEditWindow(exp.created_at);
                                                const isEditing = editingId === exp.id;

                                                return (
                                                    <tr key={exp.id}>
                                                        <td>{new Date(exp.created_at).toLocaleDateString()}</td>
                                                        <td>
                                                            {isEditing ? (
                                                                <select value={editData.category} onChange={e => setEditData({ ...editData, category: e.target.value })} style={{ padding: '4px 6px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.8rem' }}>
                                                                    {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                                                </select>
                                                            ) : (
                                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: EXPENSE_COLORS[exp.category] || '#64748b' }}></span>
                                                                    {exp.category}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td>
                                                            {isEditing ? (
                                                                <input type="text" value={editData.description} onChange={e => handleEditChange('description', e.target.value)} style={{ padding: '4px 6px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.8rem', width: '100%' }} />
                                                            ) : (
                                                                exp.description || '—'
                                                            )}
                                                        </td>
                                                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                                                            {isEditing ? (
                                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                                                    <input type="number" value={editData.amount} onChange={e => handleEditChange('amount', e.target.value)} style={{ padding: '4px 6px', borderRadius: '6px', border: `1px solid ${errors.editAmount ? '#ef4444' : '#e2e8f0'}`, background: errors.editAmount ? '#fef2f2' : 'white', fontSize: '0.8rem', width: '80px', textAlign: 'right' }} />
                                                                    {errors.editAmount && <span style={{ color: '#ef4444', fontSize: '0.65rem' }}>{errors.editAmount}</span>}
                                                                </div>
                                                            ) : (
                                                                `₱${Number(exp.amount).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`
                                                            )}
                                                        </td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            {editable ? (
                                                                isEditing ? (
                                                                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                                                        <button onClick={saveEdit} title="Save" style={{ padding: '4px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Check size={13} /></button>
                                                                        <button onClick={cancelEditing} title="Cancel" style={{ padding: '4px', background: '#94a3b8', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><X size={13} /></button>
                                                                    </div>
                                                                ) : (
                                                                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                                                        <button onClick={() => startEditing(exp)} title="Edit" style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6' }}><Edit3 size={14} /></button>
                                                                        <button onClick={() => onDeleteExpense(exp.id)} title="Delete" style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={14} /></button>
                                                                    </div>
                                                                )
                                                            ) : (
                                                                <span style={{ fontSize: '0.7rem', color: textMuted }}>Locked</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Artist / Inventory list */}
                    {auditModal.data?.list && (
                        <table className="data-table" style={{ fontSize: '0.85rem' }}>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Name</th>
                                    {auditModal.type === 'artists' && <><th style={{ textAlign: 'right' }}>Revenue</th><th style={{ textAlign: 'right' }}>Appointments</th></>}
                                    {auditModal.type === 'inventory' && <th style={{ textAlign: 'right' }}>Used</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {auditModal.data.list.map((item, i) => (
                                    <tr key={i}>
                                        <td>{i + 1}</td>
                                        <td style={{ fontWeight: 600 }}>{item.name}</td>
                                        {auditModal.type === 'artists' && <><td style={{ textAlign: 'right', color: '#10b981' }}>₱{Number(item.revenue || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td><td style={{ textAlign: 'right' }}>{item.appointments}</td></>}
                                        {auditModal.type === 'inventory' && <td style={{ textAlign: 'right', color: '#f59e0b', fontWeight: 600 }}>{item.used} {item.unit}</td>}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {/* Duration audit */}
                    {auditModal.type === 'duration' && (
                        <div style={{ textAlign: 'center', padding: '24px' }}>
                            <p style={{ fontSize: '2.5rem', fontWeight: 800, color: textPrimary, margin: '0 0 8px' }}>{formatDuration(auditModal.data?.avgDuration)}</p>
                            <p style={{ color: textSecondary, fontSize: '0.9rem' }}>Average across all completed sessions</p>
                        </div>
                    )}

                            </>
                        )}

                        {modalTab === 'logs' && (
                            <>
                                {/* ═══ TRANSACTION LOG TABLE (appended to all applicable types) ═══ */}
                                {renderAuditTable()}
                            </>
                        )}
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}

export { RAINBOW_PALETTE, EXPENSE_COLORS, EXPENSE_CATEGORIES, renderPieLabel };
export default AnalyticsAuditModal;
