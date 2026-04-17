import React, { useState, useEffect } from 'react';
import Axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, Download, Package, Printer, Filter, Clock, X, Plus, Trash2, ChevronRight, TrendingUp, DollarSign, BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import PhilippinePeso from '../components/PhilippinePeso';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

import AdminSideNav from '../components/AdminSideNav';
import ConfirmModal from '../components/ConfirmModal';
import './AdminAnalytics.css';
import './AdminStyles.css';
import { API_URL } from '../config';

/* ═══════════════ CHART COLOR PALETTES ═══════════════ */
const GOLD_PALETTE = ['#b7954e', '#d4af37', '#8a6c4a', '#e2c87d', '#C19A6B', '#be9055'];
const CHART_COLORS = ['#b7954e', '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];
const EXPENSE_COLORS = { Inventory: '#b7954e', Marketing: '#3b82f6', Bills: '#ef4444', Payouts: '#8b5cf6', Equipment: '#f59e0b', Licensing: '#14b8a6', Maintenance: '#ec4899', Extras: '#64748b' };
const EXPENSE_CATEGORIES = ['Inventory', 'Marketing', 'Bills', 'Payouts', 'Equipment', 'Licensing', 'Maintenance', 'Extras'];

/* ═══════════════ CUSTOM TOOLTIP ═══════════════ */
const GoldTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="analytics-custom-tooltip">
            <p className="tooltip-label">{label}</p>
            {payload.map((p, i) => (
                <p key={i} className="tooltip-value" style={{ color: p.color || '#b7954e' }}>
                    {p.name}: {typeof p.value === 'number' && p.name !== 'Appointments' ? `₱${p.value.toLocaleString("en-PH", { minimumFractionDigits: 2 })}` : p.value}
                </p>
            ))}
        </div>
    );
};

/* ═══════════════ PIE LABEL ═══════════════ */
const renderPieLabel = ({ name, percent }) => percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : '';

function AdminAnalytics() {
    const [dateRange, setDateRange] = useState('month');
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // Audit modal state
    const [auditModal, setAuditModal] = useState({ open: false, title: '', type: '', data: null });
    // Expense add form state
    const [expenseForm, setExpenseForm] = useState({ category: 'Inventory', description: '', amount: '' });
    const [expenseList, setExpenseList] = useState([]);
    const [expenseLoading, setExpenseLoading] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null, type: 'info', isAlert: false });

    const showAlert = (title, message, type = 'info') => {
        setConfirmDialog({ isOpen: true, title, message, type, isAlert: true, onConfirm: () => setConfirmDialog(prev => ({ ...prev, isOpen: false })) });
    };

    useEffect(() => { fetchAnalytics(); }, []);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const res = await Axios.get(`${API_URL}/api/admin/analytics`);
            if (res.data.success) setAnalytics(res.data.data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching analytics:", error);
            setLoading(false);
        }
    };

    const fetchExpenses = async () => {
        setExpenseLoading(true);
        try {
            const res = await Axios.get(`${API_URL}/api/admin/expenses`);
            if (res.data.success) setExpenseList(res.data.data);
        } catch (e) { console.error(e); }
        setExpenseLoading(false);
    };

    const handleAddExpense = async (e) => {
        e.preventDefault();
        if (!expenseForm.amount || parseFloat(expenseForm.amount) <= 0) return showAlert('Error', 'Please enter a valid amount.', 'warning');
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            await Axios.post(`${API_URL}/api/admin/expenses`, { ...expenseForm, amount: parseFloat(expenseForm.amount), userId: user?.id });
            setExpenseForm({ category: 'Inventory', description: '', amount: '' });
            fetchExpenses();
            fetchAnalytics();
            showAlert('Success', 'Expense recorded successfully.', 'success');
        } catch (e) { showAlert('Error', 'Failed to record expense.', 'danger'); }
    };

    const handleDeleteExpense = async (id) => {
        try {
            await Axios.delete(`${API_URL}/api/admin/expenses/${id}`);
            fetchExpenses();
            fetchAnalytics();
        } catch (e) { showAlert('Error', 'Failed to delete expense.', 'danger'); }
    };

    const openAuditModal = (type) => {
        if (!analytics) return;
        let title = '', data = null;
        switch (type) {
            case 'revenue':
                title = 'Revenue Audit — Source Breakdown';
                data = { breakdown: analytics.revenue.breakdown, total: analytics.revenue.total, source: 'payments table + invoices table + manual_paid_amount (appointments)' };
                break;
            case 'expenses':
                title = 'Expenses Audit — Category Breakdown';
                data = { breakdown: analytics.expenses.breakdown, total: analytics.expenses.total, source: 'studio_expenses table + inventory_transactions (type=in)' };
                fetchExpenses();
                break;
            case 'appointments':
                title = 'Appointments Audit — Status Breakdown';
                data = {
                    breakdown: [
                        { name: 'Completed', value: analytics.appointments.completed },
                        { name: 'Scheduled', value: analytics.appointments.scheduled },
                        { name: 'Cancelled', value: analytics.appointments.cancelled }
                    ].filter(b => b.value > 0),
                    total: analytics.appointments.total,
                    source: 'appointments table (is_deleted=0)'
                };
                break;
            case 'artists':
                title = 'Artist Performance Audit';
                data = { list: analytics.artists, source: 'appointments table joined with users table (proportional revenue split for collaborative sessions)' };
                break;
            case 'inventory':
                title = 'Inventory Consumption Audit';
                data = { list: analytics.inventory, source: 'inventory_transactions table (type=out), joined with inventory table' };
                break;
            case 'completion':
                title = 'Completion Rate Audit';
                data = {
                    breakdown: [
                        { name: 'Completed', value: analytics.appointments.completed },
                        { name: 'Cancelled', value: analytics.appointments.cancelled }
                    ].filter(b => b.value > 0),
                    rate: analytics.appointments.completionRate,
                    source: 'appointments table — completed / total (excluding deleted)'
                };
                break;
            case 'duration':
                title = 'Avg Session Duration Audit';
                data = { avgDuration: analytics.appointments.avgDuration, source: 'appointments table — AVG(session_duration) WHERE status=completed AND session_duration > 0' };
                break;
            default: break;
        }
        setAuditModal({ open: true, title, type, data });
    };

    const closeAuditModal = () => setAuditModal({ open: false, title: '', type: '', data: null });

    /* ═══════════════ CSV EXPORT ═══════════════ */
    const escapeCsv = (str) => {
        if (str === null || str === undefined) return '""';
        const s = String(str);
        return s.includes('"') || s.includes(',') ? `"${s.replace(/"/g, '""')}"` : `"${s}"`;
    };

    const handleExport = () => {
        if (!analytics) return;
        const rows = [
            ['Report Type', 'Metric', 'Value'],
            ['Revenue', 'Total Revenue', `₱${Number(analytics.revenue.total).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`],
            ['Expenses', 'Total Expenses', `₱${Number(analytics.expenses.total).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`],
            ['Appointments', 'Total', analytics.appointments.total],
            ['Appointments', 'Completed', analytics.appointments.completed],
            ['Appointments', 'Cancelled', analytics.appointments.cancelled],
            [],
            ['Artist Performance', 'Name', 'Revenue', 'Appointments'],
            ...analytics.artists.map(a => ['Artist', a.name, `₱${Number(a.revenue).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`, a.appointments]),
            [],
            ['Revenue Sources'],
            ...analytics.revenue.breakdown.map(b => ['Source', b.name, `₱${Number(b.value).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`]),
            [],
            ['Inventory Consumption', 'Item', 'Used Qty'],
            ...analytics.inventory.map(i => ['Inventory', i.name, `${i.used} ${i.unit}`])
        ];
        let csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.map(cell => escapeCsv(cell)).join(",")).join("\n");
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", `analytics_report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    };

    const handlePrint = () => {
        if (!analytics) return;
        const pw = window.open('', '_blank');
        const artistRows = analytics.artists.map(a => `<tr><td>${a.name}</td><td>₱${(Number(a.revenue) || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td><td>${a.appointments || 0}</td></tr>`).join('');
        const invRows = analytics.inventory.map(i => `<tr><td>${i.name}</td><td>${i.used || 0} ${i.unit || ''}</td></tr>`).join('');
        pw.document.write(`<html><head><title>Analytics Report - InkVistAR</title>
            <style>body{font-family:'Segoe UI',sans-serif;padding:30px;color:#1e293b}h1,h2{text-align:center}
            .grid{display:flex;gap:20px;justify-content:center;margin:20px 0;flex-wrap:wrap}
            .card{border:1px solid #e2e8f0;padding:16px 24px;border-radius:8px;text-align:center;min-width:140px}
            .card p{font-size:1.3rem;font-weight:700;margin:4px 0}
            table{width:100%;border-collapse:collapse;margin:12px 0 30px}
            th,td{border:1px solid #cbd5e1;padding:10px;text-align:left;font-size:14px}
            th{background:#f1f5f9;color:#475569}</style></head><body>
            <h1>Analytics & Performance Report — InkVistAR</h1>
            <p style="text-align:center">Range: ${dateRange.toUpperCase()} | Generated: ${new Date().toLocaleString()}</p>
            <div class="grid">
                <div class="card"><small>Total Revenue</small><p>₱${Number(analytics.revenue.total).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</p></div>
                <div class="card"><small>Total Expenses</small><p>₱${Number(analytics.expenses.total).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</p></div>
                <div class="card"><small>Appointments</small><p>${analytics.appointments.total}</p></div>
                <div class="card"><small>Completion Rate</small><p>${analytics.appointments.completionRate}%</p></div>
            </div>
            <h2>Artist Performance</h2>
            <table><thead><tr><th>Artist</th><th>Revenue</th><th>Appointments</th></tr></thead><tbody>${artistRows}</tbody></table>
            <h2>Inventory Consumption</h2>
            <table><thead><tr><th>Item</th><th>Used</th></tr></thead><tbody>${invRows}</tbody></table>
            </body></html>`);
        pw.document.close();
        pw.focus();
        setTimeout(() => { pw.print(); }, 250);
    };

    const formatDuration = (seconds) => {
        if (!seconds) return 'N/A';
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        return hrs > 0 ? `${hrs}h ${String(mins).padStart(2, '0')}m` : `${mins}m`;
    };

    return (
        <div className="admin-page-with-sidenav">
            <AdminSideNav />
            <div className="admin-page page-container-enter">
                <div className="analytics-sticky-header">
                    <header className="admin-header">
                        <div className="header-title-area">
                            <h1>Analytics & Reports</h1>
                            <p>Track your studio's performance and inventory</p>
                        </div>
                        <div className="header-actions-group">
                            <div className="filter-group-glass">
                                <Filter size={16} color="#b7954e" />
                                <span>Time Range:</span>
                                <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="premium-select-glass">
                                    <option value="week">Last Week</option>
                                    <option value="month">This Month</option>
                                    <option value="quarter">This Quarter</option>
                                    <option value="year">This Year</option>
                                </select>
                            </div>
                            <button className="btn btn-secondary" onClick={handlePrint}><Printer size={18} /> Print</button>
                            <button className="btn btn-primary" onClick={handleExport}><Download size={18} /> Export</button>
                        </div>
                    </header>
                </div>

                {loading ? (
                    <div className="no-data" style={{ padding: '60px 0', textAlign: 'center', color: '#64748b' }}>Loading analytics...</div>
                ) : !analytics ? (
                    <div className="no-data" style={{ padding: '60px 0', textAlign: 'center', color: '#64748b' }}>No analytics data available.</div>
                ) : (
                    <>
                        {/* ═══════════════ METRIC CARDS ═══════════════ */}
                        <div className="metrics-section">
                            <div className="metric-card glass-card metric-clickable primary-metric" onClick={() => openAuditModal('revenue')}>
                                <PhilippinePeso className="metric-icon" size={32} color="#b7954e" />
                                <div className="metric-content">
                                    <p className="metric-label">Total Revenue</p>
                                    <p className="metric-value">₱{Number(analytics.revenue.total).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                    <p className="metric-info metric-clickable-hint"><ChevronRight size={12} /> Click to view sources</p>
                                </div>
                            </div>

                            <div className="metric-card glass-card metric-clickable" style={{ borderLeft: '4px solid #b7954e' }} onClick={() => openAuditModal('expenses')}>
                                <DollarSign className="metric-icon" size={32} color="#b7954e" />
                                <div className="metric-content">
                                    <p className="metric-label">Total Expenses</p>
                                    <p className="metric-value">₱{Number(analytics.expenses?.total || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                    <p className="metric-info metric-clickable-hint"><ChevronRight size={12} /> Click to manage</p>
                                </div>
                            </div>

                            <div className="metric-card glass-card metric-clickable" onClick={() => openAuditModal('appointments')}>
                                <Calendar className="metric-icon" size={32} color="#b7954e" />
                                <div className="metric-content">
                                    <p className="metric-label">Total Appointments</p>
                                    <p className="metric-value">{analytics.appointments.total}</p>
                                    <p className="metric-info"><span style={{ color: '#10b981', fontWeight: 600 }}>{analytics.appointments.completed} completed</span></p>
                                </div>
                            </div>

                            <div className="metric-card glass-card metric-clickable" onClick={() => openAuditModal('artists')}>
                                <Users className="metric-icon" size={32} color="#b7954e" />
                                <div className="metric-content">
                                    <p className="metric-label">Active Artists</p>
                                    <p className="metric-value">{analytics.artists?.length || 0}</p>
                                    <p className="metric-info">Producing Revenue</p>
                                </div>
                            </div>

                            <div className="metric-card glass-card metric-clickable" onClick={() => openAuditModal('inventory')}>
                                <Package className="metric-icon" size={32} color="#b7954e" />
                                <div className="metric-content">
                                    <p className="metric-label">Inventory Used</p>
                                    <p className="metric-value">{analytics.inventory.reduce((s, i) => s + Number(i.used || 0), 0).toLocaleString()}</p>
                                    <p className="metric-info">Items consumed</p>
                                </div>
                            </div>

                            <div className="metric-card glass-card metric-clickable" onClick={() => openAuditModal('completion')}>
                                <div className="metric-icon" style={{ color: '#10b981', fontSize: '2rem' }}>✓</div>
                                <div className="metric-content">
                                    <p className="metric-label">Completion Rate</p>
                                    <p className="metric-value">{analytics.appointments.completionRate}%</p>
                                    <p className="metric-info" style={{ color: '#ef4444' }}>{analytics.appointments.cancelled} cancelled</p>
                                </div>
                            </div>

                            <div className="metric-card glass-card metric-clickable" onClick={() => openAuditModal('duration')}>
                                <Clock className="metric-icon" size={32} color="#b7954e" />
                                <div className="metric-content">
                                    <p className="metric-label">Avg Session Duration</p>
                                    <p className="metric-value">{formatDuration(analytics.appointments.avgDuration)}</p>
                                    <p className="metric-info">Per completed session</p>
                                </div>
                            </div>
                        </div>

                        {/* ═══════════════ CHARTS ROW 1: Revenue Trend + Revenue Sources ═══════════════ */}
                        <div className="analytics-grid">
                            <div className="card glass-card">
                                <h2><BarChart3 size={18} style={{ verticalAlign: 'middle', marginRight: '8px', color: '#b7954e' }} />Monthly Revenue Trend</h2>
                                <div style={{ width: '100%', height: 280 }}>
                                    <ResponsiveContainer>
                                        <BarChart data={analytics.revenue.chart} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                                            <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} />
                                            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={v => `₱${(v / 1000).toFixed(0)}k`} />
                                            <Tooltip content={<GoldTooltip />} />
                                            <Legend />
                                            <Bar dataKey="value" name="Revenue" fill="#b7954e" radius={[6, 6, 0, 0]} />
                                            <Bar dataKey="appointments" name="Appointments" fill="#d4af37" radius={[6, 6, 0, 0]} opacity={0.5} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="card glass-card">
                                <h2><PieChartIcon size={18} style={{ verticalAlign: 'middle', marginRight: '8px', color: '#b7954e' }} />Revenue Sources</h2>
                                <div style={{ width: '100%', height: 280 }}>
                                    {analytics.revenue.breakdown.length > 0 ? (
                                        <ResponsiveContainer>
                                            <PieChart>
                                                <Pie data={analytics.revenue.breakdown} cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={3} dataKey="value" label={renderPieLabel} labelLine={false}>
                                                    {analytics.revenue.breakdown.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                                                </Pie>
                                                <Tooltip formatter={(value) => `₱${Number(value).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`} />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>No revenue data yet</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ═══════════════ CHARTS ROW 2: Popular Styles + Top Artists ═══════════════ */}
                        <div className="analytics-grid">
                            <div className="card glass-card">
                                <h2><PieChartIcon size={18} style={{ verticalAlign: 'middle', marginRight: '8px', color: '#b7954e' }} />Popular Styles</h2>
                                <div style={{ width: '100%', height: 280 }}>
                                    {analytics.styles.length > 0 ? (
                                        <ResponsiveContainer>
                                            <PieChart>
                                                <Pie data={analytics.styles.map(s => ({ name: s.name, value: s.count }))} cx="50%" cy="50%" outerRadius={90} paddingAngle={2} dataKey="value" label={renderPieLabel} labelLine={false}>
                                                    {analytics.styles.map((_, i) => <Cell key={i} fill={GOLD_PALETTE[i % GOLD_PALETTE.length]} />)}
                                                </Pie>
                                                <Tooltip formatter={(v) => `${v} works`} />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>No style data yet</div>
                                    )}
                                </div>
                            </div>

                            <div className="card glass-card">
                                <h2><BarChart3 size={18} style={{ verticalAlign: 'middle', marginRight: '8px', color: '#b7954e' }} />Top Artists</h2>
                                <div style={{ width: '100%', height: 280 }}>
                                    {analytics.artists.length > 0 ? (
                                        <ResponsiveContainer>
                                            <BarChart data={analytics.artists} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                                                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={v => `₱${(v / 1000).toFixed(0)}k`} />
                                                <YAxis dataKey="name" type="category" tick={{ fill: '#1e293b', fontSize: 12, fontWeight: 600 }} width={100} />
                                                <Tooltip content={<GoldTooltip />} />
                                                <Bar dataKey="revenue" name="Revenue" fill="#b7954e" radius={[0, 6, 6, 0]} barSize={20} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>No artist data yet</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ═══════════════ CHARTS ROW 3: Inventory + Appointment Breakdown ═══════════════ */}
                        <div className="analytics-grid">
                            <div className="card glass-card">
                                <h2><Package size={18} style={{ verticalAlign: 'middle', marginRight: '8px', color: '#b7954e' }} />Inventory Consumption</h2>
                                <div style={{ width: '100%', height: 280 }}>
                                    {analytics.inventory.length > 0 ? (
                                        <ResponsiveContainer>
                                            <BarChart data={analytics.inventory} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                                                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} />
                                                <YAxis dataKey="name" type="category" tick={{ fill: '#1e293b', fontSize: 12, fontWeight: 600 }} width={100} />
                                                <Tooltip formatter={(v, name, props) => `${v} ${props.payload.unit || 'units'}`} />
                                                <Bar dataKey="used" name="Used" fill="#d4af37" radius={[0, 6, 6, 0]} barSize={20} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>No inventory data yet</div>
                                    )}
                                </div>
                            </div>

                            <div className="card glass-card">
                                <h2><Calendar size={18} style={{ verticalAlign: 'middle', marginRight: '8px', color: '#b7954e' }} />Appointment Breakdown</h2>
                                <div style={{ width: '100%', height: 280 }}>
                                    <ResponsiveContainer>
                                        <PieChart>
                                            <Pie
                                                data={[
                                                    { name: 'Completed', value: analytics.appointments.completed },
                                                    { name: 'Scheduled', value: analytics.appointments.scheduled },
                                                    { name: 'Cancelled', value: analytics.appointments.cancelled }
                                                ].filter(d => d.value > 0)}
                                                cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} dataKey="value"
                                                label={renderPieLabel} labelLine={false}
                                            >
                                                <Cell fill="#10b981" />
                                                <Cell fill="#3b82f6" />
                                                <Cell fill="#ef4444" />
                                            </Pie>
                                            <Tooltip />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* ═══════════════ AUDIT MODAL ═══════════════ */}
                {auditModal.open && (
                    <div className="modal-overlay open" onClick={closeAuditModal}>
                        <div className="modal-content xl" onClick={e => e.stopPropagation()} style={{ maxWidth: '700px' }}>
                            <div className="modal-header">
                                <div className="admin-flex-center admin-gap-15">
                                    <div style={{ width: '40px', height: '40px', background: 'rgba(183,149,78,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <BarChart3 size={20} color="#b7954e" />
                                    </div>
                                    <div>
                                        <h2 className="admin-m-0" style={{ fontSize: '1.1rem' }}>{auditModal.title}</h2>
                                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>Data source verification</p>
                                    </div>
                                </div>
                                <button className="close-btn" onClick={closeAuditModal}><X size={24} /></button>
                            </div>
                            <div className="modal-body" style={{ padding: '20px 24px', maxHeight: '65vh', overflowY: 'auto' }}>
                                {/* Data source badge */}
                                {auditModal.data?.source && (
                                    <div style={{ background: 'rgba(183,149,78,0.08)', border: '1px solid rgba(183,149,78,0.2)', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '0.78rem', color: '#8a6c4a' }}>
                                        <strong>📋 Data Source:</strong> {auditModal.data.source}
                                    </div>
                                )}

                                {/* Revenue / Expenses / Appointments — Pie + list */}
                                {auditModal.data?.breakdown && (
                                    <>
                                        <div style={{ width: '100%', height: 220, marginBottom: '16px' }}>
                                            <ResponsiveContainer>
                                                <PieChart>
                                                    <Pie data={auditModal.data.breakdown} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={3} dataKey="value" label={renderPieLabel} labelLine={false}>
                                                        {auditModal.data.breakdown.map((entry, i) => (
                                                            <Cell key={i} fill={auditModal.type === 'expenses' ? (EXPENSE_COLORS[entry.name] || CHART_COLORS[i]) : CHART_COLORS[i % CHART_COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip formatter={(v) => auditModal.type === 'appointments' || auditModal.type === 'completion' ? v : `₱${Number(v).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`} />
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
                                                            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: auditModal.type === 'expenses' ? (EXPENSE_COLORS[b.name] || CHART_COLORS[i]) : CHART_COLORS[i % CHART_COLORS.length], display: 'inline-block' }}></span>
                                                            {b.name}
                                                        </td>
                                                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                                                            {auditModal.type === 'appointments' || auditModal.type === 'completion' ? b.value : `₱${Number(b.value).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            {auditModal.data.total !== undefined && (
                                                <tfoot>
                                                    <tr>
                                                        <td style={{ fontWeight: 700 }}>Total</td>
                                                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#b7954e' }}>
                                                            {auditModal.type === 'appointments' || auditModal.type === 'completion' ? auditModal.data.total : `₱${Number(auditModal.data.total).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`}
                                                        </td>
                                                    </tr>
                                                </tfoot>
                                            )}
                                        </table>
                                    </>
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
                                                    {auditModal.type === 'artists' && <><td style={{ textAlign: 'right' }}>₱{Number(item.revenue || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td><td style={{ textAlign: 'right' }}>{item.appointments}</td></>}
                                                    {auditModal.type === 'inventory' && <td style={{ textAlign: 'right' }}>{item.used} {item.unit}</td>}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}

                                {/* Duration audit */}
                                {auditModal.type === 'duration' && (
                                    <div style={{ textAlign: 'center', padding: '24px' }}>
                                        <p style={{ fontSize: '2.5rem', fontWeight: 800, color: '#1e293b', margin: '0 0 8px' }}>{formatDuration(auditModal.data?.avgDuration)}</p>
                                        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Average across all completed sessions</p>
                                    </div>
                                )}

                                {/* ═══════ EXPENSES: Add Expense Form + List ═══════ */}
                                {auditModal.type === 'expenses' && (
                                    <div style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                                        <h3 style={{ margin: '0 0 12px', fontSize: '0.95rem', fontWeight: 700, color: '#1e293b' }}>
                                            <Plus size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                                            Record New Expense
                                        </h3>
                                        <form onSubmit={handleAddExpense} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                                            <select className="form-input" value={expenseForm.category} onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value })} style={{ flex: '0 0 140px', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
                                                {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                            <input type="text" placeholder="Description..." value={expenseForm.description} onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })} style={{ flex: 1, minWidth: '120px', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }} />
                                            <input type="number" placeholder="Amount (₱)" value={expenseForm.amount} onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })} required style={{ flex: '0 0 110px', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }} />
                                            <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem' }}>
                                                <Plus size={14} /> Add
                                            </button>
                                        </form>

                                        <h3 style={{ margin: '0 0 8px', fontSize: '0.95rem', fontWeight: 700, color: '#1e293b' }}>Expense Ledger</h3>
                                        {expenseLoading ? (
                                            <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Loading...</p>
                                        ) : expenseList.length === 0 ? (
                                            <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No manual expenses recorded yet. Inventory procurement costs are calculated automatically.</p>
                                        ) : (
                                            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                                <table className="data-table" style={{ fontSize: '0.8rem' }}>
                                                    <thead><tr><th>Date</th><th>Category</th><th>Description</th><th style={{ textAlign: 'right' }}>Amount</th><th></th></tr></thead>
                                                    <tbody>
                                                        {expenseList.map(exp => (
                                                            <tr key={exp.id}>
                                                                <td>{new Date(exp.created_at).toLocaleDateString()}</td>
                                                                <td>
                                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: EXPENSE_COLORS[exp.category] || '#64748b' }}></span>
                                                                        {exp.category}
                                                                    </span>
                                                                </td>
                                                                <td>{exp.description || '—'}</td>
                                                                <td style={{ textAlign: 'right', fontWeight: 600 }}>₱{Number(exp.amount).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td>
                                                                <td><button onClick={() => handleDeleteExpense(exp.id)} className="action-btn delete-btn" title="Delete" style={{ padding: '4px' }}><Trash2 size={14} /></button></td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={closeAuditModal}>Close</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <ConfirmModal {...confirmDialog} onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))} />
        </div>
    );
}

export default AdminAnalytics;
