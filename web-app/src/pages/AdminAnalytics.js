import React, { useState, useEffect } from 'react';
import Axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Download, Package, Printer, Filter, X, BarChart3, PieChart as PieChartIcon, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

import AdminSideNav from '../components/AdminSideNav';
import ConfirmModal from '../components/ConfirmModal';
import AnalyticsMetricCards from '../components/AnalyticsMetricCards';
import AnalyticsAuditModal, { RAINBOW_PALETTE, renderPieLabel } from '../components/AnalyticsAuditModal';
import './AdminAnalytics.css';
import './AdminStyles.css';
import { API_URL } from '../config';

const DARK_BRAND = '#e2e8f0';

/* ═══════════════ CUSTOM TOOLTIP ═══════════════ */
const DarkTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="analytics-custom-tooltip">
            <p className="tooltip-label">{label}</p>
            {payload.map((p, i) => (
                <p key={i} className="tooltip-value" style={{ color: p.color || '#cbd5e1' }}>
                    {p.name}: {typeof p.value === 'number' && p.name !== 'Appointments' ? `₱${p.value.toLocaleString("en-PH", { minimumFractionDigits: 2 })}` : p.value}
                </p>
            ))}
        </div>
    );
};

function AdminAnalytics() {
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

    const timeframeLabel = revenueTimeframe === 'monthly' ? 'This Month' : revenueTimeframe === 'yearly' ? 'This Year' : 'All Time';

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
                                <Filter size={16} color={DARK_BRAND} />
                                <span>Revenue:</span>
                                <select value={revenueTimeframe} onChange={(e) => setRevenueTimeframe(e.target.value)} className="premium-select-glass">
                                    <option value="monthly">This Month</option>
                                    <option value="yearly">This Year</option>
                                    <option value="all">All Time</option>
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
                        {/* ═══════════════ METRIC CARDS (shared component) ═══════════════ */}
                        <AnalyticsMetricCards analytics={analytics} onCardClick={openAuditModal} formatDuration={formatDuration} showAll={true} variant="dark" />

                        {/* ═══════════════ CHARTS ROW 1: Trend (wide left) + Sources (narrow right) ═══════════════ */}
                        <div className="analytics-dashboard-layout">
                            <div className="card glass-card card-colspan-2">
                                <h2><BarChart3 size={18} style={{ verticalAlign: 'middle', marginRight: '8px', color: '#94a3b8' }} />Revenue Trend ({timeframeLabel})</h2>
                                <div style={{ width: '100%', height: 280 }}>
                                    <ResponsiveContainer>
                                        <BarChart data={analytics.revenue.chart} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                            <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                                            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={v => `₱${(v / 1000).toFixed(0)}k`} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                                            <Tooltip content={<DarkTooltip />} />
                                            <Legend wrapperStyle={{ color: '#94a3b8' }} />
                                            <Bar dataKey="value" name="Revenue" fill={RAINBOW_PALETTE[0]} radius={[6, 6, 0, 0]} />
                                            <Bar dataKey="appointments" name="Appointments" fill={RAINBOW_PALETTE[2]} radius={[6, 6, 0, 0]} opacity={0.7} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="card glass-card card-colspan-1">
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
                            </div>
                        </div>

                        {/* ═══════════════ CHARTS ROW 2: Styles (narrow left) + Artists (wide right) — REVERSED ═══════════════ */}
                        <div className="analytics-dashboard-layout reverse">
                            <div className="card glass-card card-colspan-1">
                                <h2><PieChartIcon size={18} style={{ verticalAlign: 'middle', marginRight: '8px', color: '#94a3b8' }} />Popular Styles</h2>
                                <div style={{ width: '100%', height: 280 }}>
                                    {analytics.styles.length > 0 ? (
                                        <ResponsiveContainer>
                                            <PieChart>
                                                <Pie data={analytics.styles.map(s => ({ name: s.name, value: s.count }))} cx="50%" cy="50%" outerRadius={90} paddingAngle={2} dataKey="value" label={renderPieLabel} labelLine={true}>
                                                    {analytics.styles.map((_, i) => <Cell key={i} fill={RAINBOW_PALETTE[(i * 2) % RAINBOW_PALETTE.length]} />)}
                                                </Pie>
                                                <Tooltip formatter={(v) => `${v} works`} />
                                                <Legend wrapperStyle={{ color: '#94a3b8' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>No style data yet</div>
                                    )}
                                </div>
                            </div>

                            <div className="card glass-card card-colspan-2">
                                <h2><BarChart3 size={18} style={{ verticalAlign: 'middle', marginRight: '8px', color: '#94a3b8' }} />Top Artists by Revenue</h2>
                                <div style={{ width: '100%', height: 280 }}>
                                    {analytics.artists.length > 0 ? (
                                        <ResponsiveContainer>
                                            <BarChart data={analytics.artists} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={v => `₱${(v / 1000).toFixed(0)}k`} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                                                <YAxis dataKey="name" type="category" tick={{ fill: '#cbd5e1', fontSize: 12, fontWeight: 600 }} width={100} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                                                <Tooltip content={<DarkTooltip />} />
                                                <Bar dataKey="revenue" name="Revenue" fill={RAINBOW_PALETTE[4]} radius={[0, 6, 6, 0]} barSize={24}>
                                                   {analytics.artists.map((_, index) => <Cell key={`cell-${index}`} fill={RAINBOW_PALETTE[index % RAINBOW_PALETTE.length]} />)}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>No artist data yet</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ═══════════════ CHARTS ROW 3: Inventory (wide left) + Appointments (narrow right) ═══════════════ */}
                        <div className="analytics-dashboard-layout">
                            <div className="card glass-card card-colspan-2">
                                <h2><Package size={18} style={{ verticalAlign: 'middle', marginRight: '8px', color: '#94a3b8' }} />Inventory Consumption</h2>
                                <div style={{ width: '100%', height: 280 }}>
                                    {analytics.inventory.length > 0 ? (
                                        <ResponsiveContainer>
                                            <BarChart data={analytics.inventory} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                                                <YAxis dataKey="name" type="category" tick={{ fill: '#cbd5e1', fontSize: 12, fontWeight: 600 }} width={100} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                                                <Tooltip formatter={(v, name, props) => `${v} ${props.payload.unit || 'units'}`} />
                                                <Bar dataKey="used" name="Used" fill={RAINBOW_PALETTE[2]} radius={[0, 6, 6, 0]} barSize={24}>
                                                   {analytics.inventory.map((_, index) => <Cell key={`cell-${index}`} fill={RAINBOW_PALETTE[(index + 5) % RAINBOW_PALETTE.length]} />)}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>No inventory data yet</div>
                                    )}
                                </div>
                            </div>

                            <div className="card glass-card card-colspan-1">
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
                                                <Cell fill={RAINBOW_PALETTE[2]} /> {/* Green - Completed */}
                                                <Cell fill={RAINBOW_PALETTE[0]} /> {/* Blue - Scheduled */}
                                                <Cell fill={RAINBOW_PALETTE[1]} /> {/* Red - Cancelled */}
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
                    formatDuration={formatDuration}
                    darkMode={true}
                />
            </div>
            <ConfirmModal {...confirmDialog} onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))} />
        </div>
    );
}

export default AdminAnalytics;
