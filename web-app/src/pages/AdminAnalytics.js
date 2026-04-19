import React, { useState, useEffect } from 'react';
import Axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Download, Package, Printer, Filter, X, BarChart3, PieChart as PieChartIcon, Calendar, LayoutDashboard, Check } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, Treemap } from 'recharts';

import AdminSideNav from '../components/AdminSideNav';
import ConfirmModal from '../components/ConfirmModal';
import AnalyticsMetricCards from '../components/AnalyticsMetricCards';
import AnalyticsAuditModal, { RAINBOW_PALETTE, renderPieLabel } from '../components/AnalyticsAuditModal';
import './AdminAnalytics.css';
import './PortalStyles.css';
import './AdminStyles.css';
import { API_URL } from '../config';


function AdminAnalytics() {
    const WIDGET_OPTIONS = [
        { id: 'metric_cards', label: 'Summary Metric Cards', icon: <BarChart3 size={16} /> },
        { id: 'revenue_trend', label: 'Revenue Trend', icon: <BarChart3 size={16} /> },
        { id: 'revenue_sources', label: 'Revenue Sources', icon: <PieChartIcon size={16} /> },
        { id: 'popular_styles', label: 'Popular Styles', icon: <PieChartIcon size={16} /> },
        { id: 'top_artists', label: 'Top Artists', icon: <BarChart3 size={16} /> },
        { id: 'inventory', label: 'Inventory Consumption', icon: <Package size={16} /> },
        { id: 'appointments', label: 'Appointment Breakdown', icon: <Calendar size={16} /> },
    ];

    const [visibleWidgets, setVisibleWidgets] = useState(() => {
        const saved = localStorage.getItem('inkvistar_admin_analytics_widgets');
        if (saved) return JSON.parse(saved);
        return WIDGET_OPTIONS.map(w => w.id);
    });
    const [isWidgetModalOpen, setIsWidgetModalOpen] = useState(false);

    const toggleWidget = (id) => {
        setVisibleWidgets(prev => {
            const next = prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id];
            localStorage.setItem('inkvistar_admin_analytics_widgets', JSON.stringify(next));
            return next;
        });
    };

    const [dateRange, setDateRange] = useState('month');
    const [revenueTimeframe, setRevenueTimeframe] = useState('monthly');
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

    useEffect(() => { fetchAnalytics(); fetchExpenses(); }, [revenueTimeframe]);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const res = await Axios.get(`${API_URL}/api/admin/analytics?timeframe=${revenueTimeframe}`);
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
            showAlert('Success', 'Overhead expense recorded.', 'success');
        } catch (e) { showAlert('Error', 'Failed to record expense.', 'danger'); }
    };

    const handleDeleteExpense = async (id) => {
        try {
            await Axios.delete(`${API_URL}/api/admin/expenses/${id}`);
            fetchExpenses();
            fetchAnalytics();
        } catch (e) {
            const msg = e.response?.data?.message || 'Failed to delete expense.';
            showAlert('Error', msg, 'danger');
        }
    };

    const handleEditExpense = async (id, data) => {
        try {
            await Axios.put(`${API_URL}/api/admin/expenses/${id}`, {
                category: data.category,
                description: data.description,
                amount: parseFloat(data.amount)
            });
            fetchExpenses();
            fetchAnalytics();
            showAlert('Success', 'Expense updated.', 'success');
        } catch (e) {
            const msg = e.response?.data?.message || 'Failed to edit expense.';
            showAlert('Error', msg, 'danger');
        }
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
                title = 'Operations Audits — Payouts & Procurements';
                data = { 
                    breakdown: analytics.expenses.breakdown, 
                    total: analytics.expenses.total, 
                    source: 'payouts table + inventory transactions (type=in)',
                    payouts_audit: analytics.expenses.payouts_audit,
                    inventory_in_audit: analytics.expenses.inventory_in_audit
                };
                break;
            case 'overhead':
                title = 'Studio Overhead — Manual Expenses';
                data = { breakdown: analytics.overhead.breakdown, total: analytics.overhead.total, source: 'studio_expenses table' };
                fetchExpenses();
                break;
            case 'appointments':
                title = 'Appointments Audit — Status Breakdown';
                data = {
                    breakdown: [
                        { name: 'Completed', value: Number(analytics.appointments.completed) || 0 },
                        { name: 'Scheduled', value: Number(analytics.appointments.scheduled) || 0 },
                        { name: 'Cancelled', value: Number(analytics.appointments.cancelled) || 0 }
                    ].filter(b => b.value > 0),
                    total: analytics.appointments.total,
                    source: 'appointments table (is_deleted=0)'
                };
                break;
            case 'users':
                title = 'User Base Audit';
                data = {
                    breakdown: [
                        { name: 'Customers', value: Number(analytics.users?.customers) || 0 },
                        { name: 'Artists', value: Number(analytics.users?.artists) || 0 },
                        { name: 'Admins', value: Number(analytics.users?.admins) || 0 }
                    ].filter(b => b.value > 0),
                    total: analytics.users?.total || 0,
                    source: 'users table (is_deleted=0)'
                };
                break;
            case 'artists':
                title = 'Artist Performance Audit';
                data = { list: analytics.artists, source: 'appointments table joined with users table' };
                break;
            case 'inventory':
                title = 'Inventory Consumption Audit';
                data = { list: analytics.inventory, source: 'inventory_transactions table (type=out)' };
                break;
            case 'styles':
                title = 'Popular Styles — Booking Categories';
                data = {
                    breakdown: analytics.styles.map(s => ({ name: s.name, value: Number(s.count) || 0 })),
                    total: analytics.styles.reduce((sum, s) => sum + (Number(s.count) || 0), 0),
                    source: 'portfolio_works categories (tattoo art styles)'
                };
                break;
            case 'completion':
                title = 'Completion Rate Audit';
                data = {
                    breakdown: [
                        { name: 'Completed', value: Number(analytics.appointments.completed) || 0 },
                        { name: 'Cancelled', value: Number(analytics.appointments.cancelled) || 0 }
                    ].filter(b => b.value > 0),
                    rate: analytics.appointments.completionRate,
                    source: 'appointments table — completed / total (excluding deleted)'
                };
                break;
            case 'duration':
                title = 'Avg Session Duration Audit';
                data = { avgDuration: analytics.appointments.avgDuration, source: 'appointments table — AVG(session_duration) WHERE status=completed' };
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
            ['Expenses', 'Ops Expenses', `₱${Number(analytics.expenses.total).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`],
            ['Expenses', 'Overhead / Manual', `₱${Number(analytics.overhead?.total || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`],
            ['Appointments', 'Total', analytics.appointments.total],
            ['Appointments', 'Completed', analytics.appointments.completed],
            ['Appointments', 'Cancelled', analytics.appointments.cancelled],
            ['Appointments', 'Scheduled', analytics.appointments.scheduled],
            ['Users', 'Customers', analytics.users?.customers || 0],
            ['Users', 'Artists', analytics.users?.artists || 0],
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
        
        const csvContent = rows.map(e => e.map(cell => escapeCsv(cell)).join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `analytics_report_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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

    const timeframeLabel = revenueTimeframe === 'monthly' ? 'This Month' : revenueTimeframe === 'yearly' ? 'This Year' : 'All Time';

    return (
        <div className="admin-page-with-sidenav">
            <AdminSideNav />
            <div className="admin-page page-container-enter">
                <header className="portal-header">
                    <div className="header-title">
                        <h1>Analytics & Reports</h1>
                    </div>
                    <div className="header-actions">
                        <div className="filter-group-glass">
                            <Filter size={16} color="#64748b" />
                            <span style={{ color: '#64748b', fontWeight: 600 }}>Period:</span>
                            <select value={revenueTimeframe} onChange={(e) => setRevenueTimeframe(e.target.value)} className="premium-select-glass">
                                <option value="monthly">This Month</option>
                                <option value="yearly">This Year</option>
                                <option value="all">All Time</option>
                            </select>
                        </div>
                        <div style={{ position: 'relative' }}>
                            <button className="btn btn-secondary" onClick={() => setIsWidgetModalOpen(true)}><LayoutDashboard size={18} /> Layout</button>
                            {isWidgetModalOpen && (
                                <>
                                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }} onClick={() => setIsWidgetModalOpen(false)}></div>
                                    <div style={{ position: 'absolute', top: 'calc(100% + 10px)', right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 100, width: '280px', padding: '16px', animation: 'fadeIn 0.2s ease' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                            <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#1e293b' }}>Dashboard Widgets</h4>
                                            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }} onClick={() => setIsWidgetModalOpen(false)}><X size={16} /></button>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {WIDGET_OPTIONS.map(widget => {
                                                const isVisible = visibleWidgets.includes(widget.id);
                                                return (
                                                    <div 
                                                        key={widget.id} 
                                                        onClick={() => toggleWidget(widget.id)}
                                                        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', background: isVisible ? '#f8fafc' : 'transparent', border: `1px solid ${isVisible ? '#e2e8f0' : 'transparent'}`, borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '4px', border: `2px solid ${isVisible ? '#C19A6B' : '#cbd5e1'}`, background: isVisible ? '#C19A6B' : 'transparent' }}>
                                                            {isVisible && <Check size={14} color="white" strokeWidth={3} />}
                                                        </div>
                                                        <div style={{ color: isVisible ? '#C19A6B' : '#94a3b8', display: 'flex' }}>{widget.icon}</div>
                                                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: isVisible ? '#1e293b' : '#64748b' }}>{widget.label}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                        <button className="btn btn-secondary" onClick={handlePrint}><Printer size={18} /> Print</button>
                        <button className="btn btn-primary" onClick={handleExport}><Download size={18} /> Export</button>
                    </div>
                </header>
                <p className="header-subtitle">Track your studio's performance and inventory</p>

                {loading ? (
                    <div className="no-data" style={{ padding: '60px 0', textAlign: 'center', color: '#64748b' }}>Loading analytics...</div>
                ) : !analytics ? (
                    <div className="no-data" style={{ padding: '60px 0', textAlign: 'center', color: '#64748b' }}>No analytics data available.</div>
                ) : (
                    <>
                        {/* ═══════════════ DYNAMIC LAYOUT ═══════════════ */}
                        {(() => {
                            const availableCharts = [
                                {
                                    id: 'revenue_trend',
                                    widthInfo: 'wide',
                                    element: (
                                        <div key="revenue_trend" className="card glass-card" onClick={() => openAuditModal('revenue')} style={{ cursor: 'pointer', width: '100%', boxSizing: 'border-box' }}>
                                            <h2><BarChart3 size={18} style={{ verticalAlign: 'middle', marginRight: '8px', color: '#94a3b8' }} />Revenue Trend ({timeframeLabel})</h2>
                                            <div style={{ width: '100%', height: 280 }}>
                                                <ResponsiveContainer>
                                                    <BarChart data={analytics.revenue.chart} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                                        <XAxis dataKey="month" tick={{ fill: '#171516', fontSize: 12, fontWeight: 600 }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
                                                        <YAxis tick={{ fill: '#171516', fontSize: 11 }} tickFormatter={v => `₱${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                                                        <Tooltip
                                                            cursor={{ fill: 'rgba(99, 102, 241, 0.06)' }}
                                                            contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', padding: '10px 14px', fontSize: '0.85rem' }}
                                                            formatter={(value, name) => [`₱${Number(value).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Revenue']}
                                                            labelFormatter={(label, payload) => {
                                                                const appts = payload && payload[0] ? payload[0].payload.appointments : 0;
                                                                return `${label} — ${appts} appointment${appts !== 1 ? 's' : ''}`;
                                                            }}
                                                        />
                                                        <Bar dataKey="value" name="Revenue" fill="#6366f1" radius={[8, 8, 0, 0]} barSize={48} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                            <div style={{ paddingTop: '8px', fontSize: '0.75rem', fontWeight: 600, color: '#6366f1' }}>View revenue source breakdown →</div>
                                        </div>
                                    )
                                },
                                {
                                    id: 'revenue_sources',
                                    widthInfo: 'narrow',
                                    element: (
                                        <div key="revenue_sources" className="card glass-card" onClick={() => openAuditModal('revenue')} style={{ cursor: 'pointer', width: '100%', boxSizing: 'border-box' }}>
                                            <h2><PieChartIcon size={18} style={{ verticalAlign: 'middle', marginRight: '8px', color: '#94a3b8' }} />Revenue Sources</h2>
                                            <div style={{ width: '100%', height: 280 }}>
                                                {analytics.revenue.breakdown.length > 0 ? (
                                                    <ResponsiveContainer>
                                                        <PieChart>
                                                            <Pie data={analytics.revenue.breakdown} cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={3} dataKey="value" label={renderPieLabel} labelLine={true}>
                                                                {analytics.revenue.breakdown.map((_, i) => <Cell key={i} fill={RAINBOW_PALETTE[i % RAINBOW_PALETTE.length]} />)}
                                                            </Pie>
                                                            <Tooltip formatter={(value) => `₱${Number(value).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`} />
                                                            <Legend />
                                                        </PieChart>
                                                    </ResponsiveContainer>
                                                ) : (
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>No revenue data yet</div>
                                                )}
                                            </div>
                                            <div style={{ paddingTop: '8px', fontSize: '0.75rem', fontWeight: 600, color: '#10b981' }}>Click to audit revenue sources →</div>
                                        </div>
                                    )
                                },
                                {
                                    id: 'popular_styles',
                                    widthInfo: 'narrow',
                                    element: (
                                        <div key="popular_styles" className="card glass-card" onClick={() => openAuditModal('styles')} style={{ cursor: 'pointer', width: '100%', boxSizing: 'border-box' }}>
                                            <h2><PieChartIcon size={18} style={{ verticalAlign: 'middle', marginRight: '8px', color: '#94a3b8' }} />Popular Styles</h2>
                                            <div style={{ width: '100%', height: 280 }}>
                                                {analytics.styles.length > 0 ? (
                                                    <ResponsiveContainer>
                                                        <PieChart>
                                                            <Pie data={analytics.styles.map(s => ({ name: s.name, value: Number(s.count) || 0 }))} cx="50%" cy="50%" outerRadius={90} paddingAngle={2} dataKey="value" label={renderPieLabel} labelLine={true}>
                                                                {analytics.styles.map((_, i) => <Cell key={i} fill={RAINBOW_PALETTE[(i * 2) % RAINBOW_PALETTE.length]} />)}
                                                            </Pie>
                                                            <Tooltip formatter={(v) => `${v} works`} />
                                                            <Legend wrapperStyle={{ color: '#171516' }} />
                                                        </PieChart>
                                                    </ResponsiveContainer>
                                                ) : (
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>No style data yet</div>
                                                )}
                                            </div>
                                            <div style={{ paddingTop: '8px', fontSize: '0.75rem', fontWeight: 600, color: '#a855f7' }}>View portfolio style breakdown →</div>
                                        </div>
                                    )
                                },
                                {
                                    id: 'top_artists',
                                    widthInfo: 'wide',
                                    element: (
                                        <div key="top_artists" className="card glass-card" onClick={() => openAuditModal('artists')} style={{ cursor: 'pointer', width: '100%', boxSizing: 'border-box' }}>
                                            <h2><BarChart3 size={18} style={{ verticalAlign: 'middle', marginRight: '8px', color: '#94a3b8' }} />Top Artists by Revenue</h2>
                                            <div style={{ width: '100%', height: 280 }}>
                                                {analytics.artists.length > 0 ? (
                                                    <ResponsiveContainer>
                                                        <BarChart data={analytics.artists} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                                                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                                            <XAxis type="number" tick={{ fill: '#171516', fontSize: 11 }} tickFormatter={v => `₱${(v / 1000).toFixed(0)}k`} axisLine={{ stroke: '#cbd5e1' }} tickLine={{ stroke: '#cbd5e1' }} />
                                                            <YAxis dataKey="name" type="category" tick={{ fill: '#171516', fontSize: 12, fontWeight: 600 }} width={100} axisLine={{ stroke: '#cbd5e1' }} tickLine={{ stroke: '#cbd5e1' }} />
                                                            <Tooltip formatter={(v) => `₱${Number(v).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                                                            <Bar dataKey="revenue" name="Revenue" fill={RAINBOW_PALETTE[4]} radius={[0, 6, 6, 0]} barSize={24}>
                                                               {analytics.artists.map((_, index) => <Cell key={`cell-${index}`} fill={RAINBOW_PALETTE[index % RAINBOW_PALETTE.length]} />)}
                                                            </Bar>
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                ) : (
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>No artist data yet</div>
                                                )}
                                            </div>
                                            <div style={{ paddingTop: '8px', fontSize: '0.75rem', fontWeight: 600, color: '#f59e0b' }}>View artist performance audit →</div>
                                        </div>
                                    )
                                },
                                {
                                    id: 'inventory',
                                    widthInfo: 'wide',
                                    element: (
                                        <div key="inventory" className="card glass-card" onClick={() => openAuditModal('inventory')} style={{ cursor: 'pointer', width: '100%', boxSizing: 'border-box' }}>
                                            <h2><Package size={18} style={{ verticalAlign: 'middle', marginRight: '8px', color: '#94a3b8' }} />Inventory Consumption</h2>
                                            <div style={{ width: '100%', height: 280 }}>
                                                {analytics.inventory.length > 0 ? (
                                                    <ResponsiveContainer>
                                                        <Treemap
                                                            data={analytics.inventory.map((item, i) => ({
                                                                name: item.name,
                                                                size: Number(item.used) || 1,
                                                                unit: item.unit || 'units',
                                                                fill: RAINBOW_PALETTE[(i + 5) % RAINBOW_PALETTE.length]
                                                            }))}
                                                            dataKey="size"
                                                            aspectRatio={4 / 3}
                                                            stroke="#fff"
                                                            content={({ x, y, width, height, name, size, unit, fill }) => {
                                                                if (width < 30 || height < 25) return null;
                                                                return (
                                                                    <g>
                                                                        <rect x={x} y={y} width={width} height={height} rx={6} fill={fill} stroke="#fff" strokeWidth={2} />
                                                                        {width > 50 && height > 35 && (
                                                                            <>
                                                                                <text x={x + width / 2} y={y + height / 2 - 8} textAnchor="middle" fill="#fff" fontSize={width > 100 ? 13 : 10} fontWeight={700}>
                                                                                    {name}
                                                                                </text>
                                                                                <text x={x + width / 2} y={y + height / 2 + 10} textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize={width > 100 ? 12 : 9}>
                                                                                    {size} {unit || 'units'}
                                                                                </text>
                                                                            </>
                                                                        )}
                                                                    </g>
                                                                );
                                                            }}
                                                        >
                                                            <Tooltip formatter={(v, name, props) => [`${v} ${props.payload.unit || 'units'}`, name]} />
                                                        </Treemap>
                                                    </ResponsiveContainer>
                                                ) : (
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>No inventory data yet</div>
                                                )}
                                            </div>
                                            <div style={{ paddingTop: '8px', fontSize: '0.75rem', fontWeight: 600, color: '#8b5cf6' }}>View consumption audit log →</div>
                                        </div>
                                    )
                                },
                                {
                                    id: 'appointments',
                                    widthInfo: 'narrow',
                                    element: (
                                        <div key="appointments" className="card glass-card" onClick={() => openAuditModal('appointments')} style={{ cursor: 'pointer', width: '100%', boxSizing: 'border-box' }}>
                                            <h2><Calendar size={18} style={{ verticalAlign: 'middle', marginRight: '8px', color: '#94a3b8' }} />Appointment Breakdown</h2>
                                            <div style={{ width: '100%', height: 280 }}>
                                                <ResponsiveContainer>
                                                    <PieChart>
                                                        <Pie
                                                            data={[
                                                                { name: 'Completed', value: Number(analytics.appointments.completed) || 0 },
                                                                { name: 'Scheduled', value: Number(analytics.appointments.scheduled) || 0 },
                                                                { name: 'Cancelled', value: Number(analytics.appointments.cancelled) || 0 }
                                                            ].filter(d => d.value > 0)}
                                                            cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} dataKey="value"
                                                            label={renderPieLabel} labelLine={true}
                                                        >
                                                            <Cell fill={RAINBOW_PALETTE[2]} />
                                                            <Cell fill={RAINBOW_PALETTE[0]} />
                                                            <Cell fill={RAINBOW_PALETTE[1]} />
                                                        </Pie>
                                                        <Tooltip />
                                                        <Legend />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>
                                            <div style={{ paddingTop: '8px', fontSize: '0.75rem', fontWeight: 600, color: '#3b82f6' }}>View appointment audit log →</div>
                                        </div>
                                    )
                                }
                            ];

                            const activeCharts = availableCharts.filter(c => visibleWidgets.includes(c.id));
                            const rows = [];
                            let i = 0;

                            while (i < activeCharts.length) {
                                if (i + 1 < activeCharts.length) {
                                    const current = activeCharts[i];
                                    const next = activeCharts[i + 1];

                                    if (current.widthInfo === 'wide' && next.widthInfo === 'narrow') {
                                        rows.push(
                                            <div key={`row-${i}`} className="analytics-dashboard-layout">
                                                {current.element}
                                                {next.element}
                                            </div>
                                        );
                                        i += 2;
                                    } else if (current.widthInfo === 'narrow' && next.widthInfo === 'wide') {
                                        rows.push(
                                            <div key={`row-${i}`} className="analytics-dashboard-layout reverse">
                                                {current.element}
                                                {next.element}
                                            </div>
                                        );
                                        i += 2;
                                    } else if (current.widthInfo === 'wide' && next.widthInfo === 'wide') {
                                        rows.push(
                                            <div key={`row-${i}`} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1.5rem', padding: '0 2rem', marginBottom: '1.5rem' }}>
                                                {current.element}
                                                {next.element}
                                            </div>
                                        );
                                        i += 2;
                                    } else {
                                        rows.push(
                                            <div key={`row-${i}`} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.5rem', padding: '0 2rem', marginBottom: '1.5rem' }}>
                                                {current.element}
                                                {next.element}
                                            </div>
                                        );
                                        i += 2;
                                    }
                                } else {
                                    const current = activeCharts[i];
                                    rows.push(
                                        <div key={`row-${i}`} style={{ padding: '0 2rem', marginBottom: '1.5rem', maxWidth: current.widthInfo === 'narrow' ? '500px' : '100%' }}>
                                            {current.element}
                                        </div>
                                    );
                                    i++;
                                }
                            }

                            return (
                                <>
                                    {visibleWidgets.includes('metric_cards') && (
                                        <AnalyticsMetricCards analytics={analytics} onCardClick={openAuditModal} formatDuration={formatDuration} showAll={true} variant="light" />
                                    )}
                                    {rows}
                                    {visibleWidgets.length === 0 && (
                                        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
                                            <LayoutDashboard size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                                            <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>All widgets are currently hidden</p>
                                            <p style={{ fontSize: '0.9rem' }}>Click the Layout button above to enable widgets.</p>
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                    </>
                )}

                {/* ═══════════════ AUDIT MODAL (shared component) ═══════════════ */}
                <AnalyticsAuditModal
                    auditModal={auditModal}
                    onClose={closeAuditModal}
                    analytics={analytics}
                    expenseList={expenseList}
                    expenseLoading={expenseLoading}
                    expenseForm={expenseForm}
                    setExpenseForm={setExpenseForm}
                    onAddExpense={handleAddExpense}
                    onDeleteExpense={handleDeleteExpense}
                    onEditExpense={handleEditExpense}
                    formatDuration={formatDuration}
                    darkMode={false}
                />
            </div>
            <ConfirmModal {...confirmDialog} onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))} />
        </div>
    );
}

export default AdminAnalytics;
