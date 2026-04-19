import React, { useState, useEffect } from 'react';
import Axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Download, Package, Printer, Filter, X, BarChart3, PieChart as PieChartIcon, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, Treemap } from 'recharts';

import AdminSideNav from '../components/AdminSideNav';
import ConfirmModal from '../components/ConfirmModal';
import AnalyticsMetricCards from '../components/AnalyticsMetricCards';
import AnalyticsAuditModal, { RAINBOW_PALETTE, renderPieLabel } from '../components/AnalyticsAuditModal';
import './AdminAnalytics.css';
import './AdminStyles.css';
import { API_URL } from '../config';


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
                    breakdown: analytics.styles.map(s => ({ name: s.name, value: s.count })),
                    total: analytics.styles.reduce((sum, s) => sum + (s.count || 0), 0),
                    source: 'portfolio_works categories + appointment service types'
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
                <header className="admin-header">
                    <div className="header-title-area">
                        <h1>Analytics & Reports</h1>
                        <p>Track your studio's performance and inventory</p>
                    </div>
                    <div className="header-actions-group">
                        <div className="filter-group-glass">
                            <Filter size={16} color="#64748b" />
                            <span style={{ color: '#64748b', fontWeight: 600 }}>Period:</span>
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

                {loading ? (
                    <div className="no-data" style={{ padding: '60px 0', textAlign: 'center', color: '#64748b' }}>Loading analytics...</div>
                ) : !analytics ? (
                    <div className="no-data" style={{ padding: '60px 0', textAlign: 'center', color: '#64748b' }}>No analytics data available.</div>
                ) : (
                    <>
                        {/* ═══════════════ METRIC CARDS (shared component) ═══════════════ */}
                        <AnalyticsMetricCards analytics={analytics} onCardClick={openAuditModal} formatDuration={formatDuration} showAll={true} variant="light" />

                        {/* ═══════════════ CHARTS ROW 1: Trend (wide left) + Sources (narrow right) ═══════════════ */}
                        <div className="analytics-dashboard-layout">
                            <div className="card glass-card card-colspan-2" onClick={() => openAuditModal('revenue')} style={{ cursor: 'pointer' }}>
                                <h2><BarChart3 size={18} style={{ verticalAlign: 'middle', marginRight: '8px', color: '#94a3b8' }} />Revenue Trend ({timeframeLabel})</h2>
                                <div style={{ width: '100%', height: 280 }}>
                                    <ResponsiveContainer>
                                        <BarChart data={analytics.revenue.chart} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                            <defs>
                                                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.95} />
                                                    <stop offset="100%" stopColor="#818cf8" stopOpacity={0.7} />
                                                </linearGradient>
                                            </defs>
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
                                            <Bar dataKey="value" name="Revenue" fill="url(#revenueGradient)" radius={[8, 8, 0, 0]} barSize={48} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="card glass-card card-colspan-1" onClick={() => openAuditModal('revenue')} style={{ cursor: 'pointer' }}>
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
                            <div className="card glass-card card-colspan-1" onClick={() => openAuditModal('styles')} style={{ cursor: 'pointer' }}>
                                <h2><PieChartIcon size={18} style={{ verticalAlign: 'middle', marginRight: '8px', color: '#94a3b8' }} />Popular Styles</h2>
                                <div style={{ width: '100%', height: 280 }}>
                                    {analytics.styles.length > 0 ? (
                                        <ResponsiveContainer>
                                            <PieChart>
                                                <Pie data={analytics.styles.map(s => ({ name: s.name, value: s.count }))} cx="50%" cy="50%" outerRadius={90} paddingAngle={2} dataKey="value" label={renderPieLabel} labelLine={true}>
                                                    {analytics.styles.map((_, i) => <Cell key={i} fill={RAINBOW_PALETTE[(i * 2) % RAINBOW_PALETTE.length]} />)}
                                                </Pie>
                                                <Tooltip formatter={(v) => `${v} bookings`} />
                                                <Legend wrapperStyle={{ color: '#171516' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>No style data yet</div>
                                    )}
                                </div>
                            </div>

                            <div className="card glass-card card-colspan-2" onClick={() => openAuditModal('artists')} style={{ cursor: 'pointer' }}>
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
                            </div>
                        </div>

                        {/* ═══════════════ CHARTS ROW 3: Inventory (wide left) + Appointments (narrow right) ═══════════════ */}
                        <div className="analytics-dashboard-layout">
                            <div className="card glass-card card-colspan-2" onClick={() => openAuditModal('inventory')} style={{ cursor: 'pointer' }}>
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
                            </div>

                            <div className="card glass-card card-colspan-1" onClick={() => openAuditModal('appointments')} style={{ cursor: 'pointer' }}>
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
