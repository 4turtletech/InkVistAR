import React, { useState, useEffect, useMemo } from 'react';
import Axios from 'axios';
import {
    Download, Filter, Clock, CheckCircle, Wallet,
    BarChart3, PieChart as PieChartIcon, TrendingUp
} from 'lucide-react';
import PhilippinePeso from '../components/PhilippinePeso';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

import ArtistSideNav from '../components/ArtistSideNav';
import Pagination from '../components/Pagination';
import { RAINBOW_PALETTE, renderPieLabel } from '../components/AnalyticsAuditModal';
import { generateReportHeader, downloadCsv } from '../utils/csvExport';
import './PortalStyles.css';
import './ArtistStyles.css';
import './AdminAnalytics.css';
import { API_URL } from '../config';

// ── Gold-themed palette for artist portal charts ──
const ARTIST_CHART_COLORS = ['#be9055', '#d4af37', '#c19a6b', '#a67c52', '#8b6914'];
const PAYMENT_COLORS = { paid: '#10b981', unpaid: '#f59e0b' };

function ArtistEarnings() {
    const [sessionEarnings, setSessionEarnings] = useState([]);
    const [payoutHistory, setPayoutHistory] = useState([]);
    const [rawStats, setRawStats] = useState({
        totalEarned: 0, pendingFromUnpaid: 0, totalPaidOut: 0, balanceToPay: 0
    });
    const [commissionRate, setCommissionRate] = useState(30);
    const [loading, setLoading] = useState(true);
    const [periodFilter, setPeriodFilter] = useState('all');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');

    // Pagination states
    const [sessionPage, setSessionPage] = useState(1);
    const [sessionPerPage, setSessionPerPage] = useState(10);
    const [payoutPage, setPayoutPage] = useState(1);
    const [payoutPerPage, setPayoutPerPage] = useState(5);

    const [user] = useState(() => {
        const saved = localStorage.getItem('user');
        return saved ? JSON.parse(saved) : null;
    });
    const artistId = user ? user.id : 1;

    useEffect(() => {
        const fetchLedger = async () => {
            try {
                setLoading(true);
                const res = await Axios.get(`${API_URL}/api/artist/${artistId}/earnings-ledger`);
                if (res.data.success) {
                    setRawStats(res.data.stats);
                    setCommissionRate((res.data.commissionRate * 100).toFixed(0));
                    setSessionEarnings(res.data.sessions.sort((a, b) => new Date(b.appointment_date) - new Date(a.appointment_date)));
                    setPayoutHistory(res.data.payouts || []);
                }
                setLoading(false);
            } catch (e) {
                console.error(e);
                setLoading(false);
            }
        };
        fetchLedger();
    }, [artistId]);

    // ── Period Filtering (client-side) ──
    const filterByPeriod = (dateStr) => {
        if (periodFilter === 'all') return true;
        const d = new Date(dateStr);
        const now = new Date();
        if (periodFilter === 'weekly') {
            const dayOfWeek = now.getDay();
            const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - mondayOffset);
            weekStart.setHours(0, 0, 0, 0);
            return d >= weekStart;
        }
        if (periodFilter === 'monthly') {
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }
        if (periodFilter === 'yearly') {
            return d.getFullYear() === now.getFullYear();
        }
        if (periodFilter === 'custom' && customStartDate && customEndDate) {
            const start = new Date(customStartDate + 'T00:00:00');
            const end = new Date(customEndDate + 'T23:59:59');
            return d >= start && d <= end;
        }
        return true;
    };

    const filteredSessions = useMemo(() =>
        sessionEarnings.filter(s => filterByPeriod(s.appointment_date)),
        [sessionEarnings, periodFilter, customStartDate, customEndDate] // eslint-disable-line react-hooks/exhaustive-deps
    );

    const filteredPayouts = useMemo(() =>
        payoutHistory.filter(p => filterByPeriod(p.created_at)),
        [payoutHistory, periodFilter, customStartDate, customEndDate] // eslint-disable-line react-hooks/exhaustive-deps
    );

    // ── Computed Metrics (from filtered data) ──
    const metrics = useMemo(() => {
        const totalEarned = filteredSessions
            .filter(s => s.payment_status === 'paid')
            .reduce((sum, s) => sum + (s.artistShare || 0), 0);
        const pendingUnpaid = filteredSessions
            .filter(s => s.payment_status !== 'paid')
            .reduce((sum, s) => sum + (s.artistShare || 0), 0);
        const totalPaidOut = filteredPayouts.reduce((sum, p) => sum + Number(p.amount || 0), 0);
        const balanceDue = totalEarned - totalPaidOut;
        return { totalEarned, pendingUnpaid, totalPaidOut, balanceDue };
    }, [filteredSessions, filteredPayouts]);

    // ── Chart Data: Earnings Trend by Month ──
    const earningsTrendData = useMemo(() => {
        const monthMap = {};
        filteredSessions.forEach(s => {
            const d = new Date(s.appointment_date);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
            if (!monthMap[key]) monthMap[key] = { month: label, sortKey: key, earned: 0, sessions: 0 };
            monthMap[key].earned += (s.artistShare || 0);
            monthMap[key].sessions += 1;
        });
        return Object.values(monthMap).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    }, [filteredSessions]);

    // ── Chart Data: Payment Status Donut ──
    const paymentStatusData = useMemo(() => {
        const paid = filteredSessions
            .filter(s => s.payment_status === 'paid')
            .reduce((sum, s) => sum + (s.artistShare || 0), 0);
        const unpaid = filteredSessions
            .filter(s => s.payment_status !== 'paid')
            .reduce((sum, s) => sum + (s.artistShare || 0), 0);
        const data = [];
        if (paid > 0) data.push({ name: 'Paid', value: paid });
        if (unpaid > 0) data.push({ name: 'Unpaid', value: unpaid });
        return data;
    }, [filteredSessions]);

    // ── Chart Data: Payout History by Month ──
    const payoutTrendData = useMemo(() => {
        const monthMap = {};
        filteredPayouts.forEach(p => {
            const d = new Date(p.created_at);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
            if (!monthMap[key]) monthMap[key] = { month: label, sortKey: key, amount: 0, count: 0 };
            monthMap[key].amount += Number(p.amount || 0);
            monthMap[key].count += 1;
        });
        return Object.values(monthMap).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    }, [filteredPayouts]);

    // ── Period Label ──
    const periodLabel = periodFilter === 'weekly' ? 'This Week' : periodFilter === 'monthly' ? 'This Month' : periodFilter === 'yearly' ? 'This Year' : periodFilter === 'custom' ? `${customStartDate || '...'} — ${customEndDate || '...'}` : 'All Time';

    // ── CSV Export ──
    const handleExport = () => {
        const headerRows = generateReportHeader('Artist Earnings Report', {
            'Period': periodLabel,
            'Commission Rate': `${commissionRate}%`
        });

        const dataRows = [
            ['Section', 'Metric', 'Value'],
            ['Summary', 'Total Earned (Paid)', `₱${metrics.totalEarned.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`],
            ['Summary', 'Pending (Unpaid)', `₱${metrics.pendingUnpaid.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`],
            ['Summary', 'Total Paid Out', `₱${metrics.totalPaidOut.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`],
            ['Summary', 'Balance Due', `₱${metrics.balanceDue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`],
            [],
            ['Date', 'Client', 'Service', 'Type', 'Session Total', 'Your Cut', 'Status'],
            ...filteredSessions.map(s => [
                new Date(s.appointment_date).toLocaleDateString(),
                s.client_name || '—',
                s.design_title || '',
                s.isCollab ? `Collab ${s.splitPercent}%` : (s.isReferral ? 'Referral (70%)' : 'Solo'),
                `₱${(s.basePrice || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
                `₱${(s.artistShare || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
                s.payment_status === 'paid' ? 'Paid' : 'Unpaid'
            ]),
            [],
            ['Payout Date', 'Amount', 'Method', 'Reference', 'Status'],
            ...filteredPayouts.map(p => [
                new Date(p.created_at).toLocaleDateString(),
                `₱${Number(p.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
                p.payout_method || 'N/A',
                p.reference_no || 'N/A',
                p.status || 'N/A'
            ])
        ];

        downloadCsv([...headerRows, ...dataRows], 'artist_earnings_report');
    };

    // ── Pagination ──
    const sessionTotalPages = Math.ceil(filteredSessions.length / sessionPerPage);
    const currentSessions = filteredSessions.slice((sessionPage - 1) * sessionPerPage, sessionPage * sessionPerPage);
    const payoutTotalPages = Math.ceil(filteredPayouts.length / payoutPerPage);
    const currentPayouts = filteredPayouts.slice((payoutPage - 1) * payoutPerPage, payoutPage * payoutPerPage);

    // Reset pages on filter change
    useEffect(() => { setSessionPage(1); setPayoutPage(1); }, [periodFilter]);

    const formatCurrency = (val) => `₱${Number(val || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return (
        <div className="portal-layout">
            <ArtistSideNav />
            <div className="portal-container artist-portal">
                <header className="portal-header">
                    <div className="header-title">
                        <h1>Earnings & Commissions</h1>
                    </div>
                    <div className="header-actions">
                        <div className="filter-group-glass">
                            <Filter size={16} color="#64748b" />
                            <span style={{ color: '#64748b', fontWeight: 600 }}>Period:</span>
                            <select value={periodFilter} onChange={(e) => { setPeriodFilter(e.target.value); if (e.target.value !== 'custom') { setCustomStartDate(''); setCustomEndDate(''); } }} className="premium-select-glass">
                                <option value="weekly">This Week</option>
                                <option value="monthly">This Month</option>
                                <option value="yearly">This Year</option>
                                <option value="all">All Time</option>
                                <option value="custom">Custom Range</option>
                            </select>
                            {periodFilter === 'custom' && (
                                <>
                                    <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="premium-select-glass" style={{ width: '140px', padding: '6px 10px' }} />
                                    <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>to</span>
                                    <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="premium-select-glass" style={{ width: '140px', padding: '6px 10px' }} />
                                </>
                            )}
                        </div>
                        <button className="btn btn-primary" onClick={handleExport} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <Download size={16} /> Export CSV
                        </button>
                    </div>
                </header>
                <p className="header-subtitle">Track your session earnings, payouts, and commission</p>

                {loading ? (
                    <div className="dashboard-loader-container" style={{ padding: '80px 0', textAlign: 'center' }}>
                        <div className="premium-loader"></div>
                        <p style={{ color: '#64748b', marginTop: '12px' }}>Loading earnings data...</p>
                    </div>
                ) : (
                    <>
                        {/* ═══════════════ METRIC CARDS ═══════════════ */}
                        <div className="metrics-section" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                            {[
                                { label: 'Total Earned', value: formatCurrency(metrics.totalEarned), icon: <PhilippinePeso size={28} />, color: '#10b981', sub: `From ${filteredSessions.filter(s => s.payment_status === 'paid').length} paid session${filteredSessions.filter(s => s.payment_status === 'paid').length !== 1 ? 's' : ''}` },
                                { label: 'Pending (Unpaid)', value: formatCurrency(metrics.pendingUnpaid), icon: <Clock size={28} />, color: '#f59e0b', sub: `${filteredSessions.filter(s => s.payment_status !== 'paid').length} unpaid session${filteredSessions.filter(s => s.payment_status !== 'paid').length !== 1 ? 's' : ''}` },
                                { label: 'Paid Out', value: formatCurrency(metrics.totalPaidOut), icon: <CheckCircle size={28} />, color: '#3b82f6', sub: `${filteredPayouts.length} payout${filteredPayouts.length !== 1 ? 's' : ''} disbursed` },
                                { label: 'Balance Due', value: formatCurrency(metrics.balanceDue), icon: <Wallet size={28} />, color: metrics.balanceDue > 0 ? '#be9055' : '#10b981', sub: `Commission rate: ${commissionRate}%` },
                            ].map((m, i) => (
                                <div key={i} className="metric-card glass-card" style={{ transition: 'transform 0.3s, box-shadow 0.3s' }}
                                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.12)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = ''; }}
                                >
                                    <div className="metric-icon" style={{ color: m.color, opacity: 0.85 }}>{m.icon}</div>
                                    <div className="metric-content">
                                        <p className="metric-label">{m.label}</p>
                                        <p className="metric-value" style={{ color: '#1e293b' }}>{m.value}</p>
                                        <p className="metric-info">{m.sub}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* ═══════════════ CHARTS ROW 1: Earnings Trend + Payment Status ═══════════════ */}
                        <div className="analytics-dashboard-layout" style={{ padding: '0 2rem', marginTop: '1.5rem' }}>
                            {/* Earnings Trend Bar Chart */}
                            <div className="card glass-card" style={{ width: '100%', boxSizing: 'border-box' }}>
                                <h2><BarChart3 size={18} style={{ verticalAlign: 'middle', marginRight: '8px', color: '#94a3b8' }} />Earnings Trend ({periodLabel})</h2>
                                <div style={{ width: '100%', height: 280 }}>
                                    {earningsTrendData.length > 0 ? (
                                        <ResponsiveContainer>
                                            <BarChart data={earningsTrendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                                <XAxis dataKey="month" tick={{ fill: '#1e293b', fontSize: 12, fontWeight: 600 }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
                                                <YAxis tick={{ fill: '#1e293b', fontSize: 11 }} tickFormatter={v => `₱${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                                                <Tooltip
                                                    cursor={{ fill: 'rgba(190, 144, 85, 0.06)' }}
                                                    contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', padding: '10px 14px', fontSize: '0.85rem' }}
                                                    formatter={(value) => [formatCurrency(value), 'Your Cut']}
                                                    labelFormatter={(label, payload) => {
                                                        const sessions = payload && payload[0] ? payload[0].payload.sessions : 0;
                                                        return `${label} — ${sessions} session${sessions !== 1 ? 's' : ''}`;
                                                    }}
                                                />
                                                <Bar dataKey="earned" name="Your Cut" fill="#be9055" radius={[8, 8, 0, 0]} barSize={48}>
                                                    {earningsTrendData.map((_, index) => (
                                                        <Cell key={`bar-${index}`} fill={ARTIST_CHART_COLORS[index % ARTIST_CHART_COLORS.length]} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', fontSize: '0.95rem' }}>No earnings data for this period</div>
                                    )}
                                </div>
                                <div style={{ paddingTop: '8px', fontSize: '0.75rem', fontWeight: 600, color: '#be9055' }}>
                                    {earningsTrendData.length > 0 ? `${filteredSessions.length} completed session${filteredSessions.length !== 1 ? 's' : ''} total` : ''}
                                </div>
                            </div>

                            {/* Payment Status Donut */}
                            <div className="card glass-card" style={{ width: '100%', boxSizing: 'border-box' }}>
                                <h2><PieChartIcon size={18} style={{ verticalAlign: 'middle', marginRight: '8px', color: '#94a3b8' }} />Payment Status</h2>
                                <div style={{ width: '100%', height: 280 }}>
                                    {paymentStatusData.length > 0 ? (
                                        <ResponsiveContainer>
                                            <PieChart>
                                                <Pie
                                                    data={paymentStatusData}
                                                    cx="50%" cy="50%"
                                                    innerRadius={55} outerRadius={95}
                                                    paddingAngle={3}
                                                    dataKey="value"
                                                    label={renderPieLabel}
                                                    labelLine={true}
                                                >
                                                    {paymentStatusData.map((entry, i) => (
                                                        <Cell key={i} fill={entry.name === 'Paid' ? PAYMENT_COLORS.paid : PAYMENT_COLORS.unpaid} />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(value, name) => [formatCurrency(value), name]} />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', fontSize: '0.95rem' }}>No session data for this period</div>
                                    )}
                                </div>
                                <div style={{ paddingTop: '8px', fontSize: '0.75rem', fontWeight: 600, color: '#10b981' }}>
                                    {paymentStatusData.length > 0 ? `Earnings from your ${commissionRate}% commission share` : ''}
                                </div>
                            </div>
                        </div>

                        {/* ═══════════════ CHARTS ROW 2: Payout History + Commission Summary ═══════════════ */}
                        <div className="analytics-dashboard-layout" style={{ padding: '0 2rem', marginTop: '1.5rem' }}>
                            {/* Payout History Bar Chart */}
                            <div className="card glass-card" style={{ width: '100%', boxSizing: 'border-box' }}>
                                <h2><BarChart3 size={18} style={{ verticalAlign: 'middle', marginRight: '8px', color: '#94a3b8' }} />Payout Disbursements ({periodLabel})</h2>
                                <div style={{ width: '100%', height: 280 }}>
                                    {payoutTrendData.length > 0 ? (
                                        <ResponsiveContainer>
                                            <BarChart data={payoutTrendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                                <XAxis dataKey="month" tick={{ fill: '#1e293b', fontSize: 12, fontWeight: 600 }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
                                                <YAxis tick={{ fill: '#1e293b', fontSize: 11 }} tickFormatter={v => `₱${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                                                <Tooltip
                                                    cursor={{ fill: 'rgba(59, 130, 246, 0.06)' }}
                                                    contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', padding: '10px 14px', fontSize: '0.85rem' }}
                                                    formatter={(value) => [formatCurrency(value), 'Payout Amount']}
                                                    labelFormatter={(label, payload) => {
                                                        const count = payload && payload[0] ? payload[0].payload.count : 0;
                                                        return `${label} — ${count} payout${count !== 1 ? 's' : ''}`;
                                                    }}
                                                />
                                                <Bar dataKey="amount" name="Payout Amount" fill="#6366f1" radius={[8, 8, 0, 0]} barSize={48}>
                                                    {payoutTrendData.map((_, index) => (
                                                        <Cell key={`payout-${index}`} fill={RAINBOW_PALETTE[index % RAINBOW_PALETTE.length]} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', fontSize: '0.95rem' }}>No payout data for this period</div>
                                    )}
                                </div>
                                <div style={{ paddingTop: '8px', fontSize: '0.75rem', fontWeight: 600, color: '#6366f1' }}>
                                    {payoutTrendData.length > 0 ? `${filteredPayouts.length} payout${filteredPayouts.length !== 1 ? 's' : ''} total` : ''}
                                </div>
                            </div>

                            {/* Commission Summary Card */}
                            <div className="card glass-card" style={{ width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                <h2><TrendingUp size={18} style={{ verticalAlign: 'middle', marginRight: '8px', color: '#94a3b8' }} />Commission Breakdown</h2>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '12px 0' }}>
                                    {[
                                        { label: 'Your Commission Rate', value: `${commissionRate}%`, color: '#be9055', desc: 'Applied to total session price' },
                                        { label: 'Total Sessions', value: filteredSessions.length, color: '#3b82f6', desc: `${periodLabel} completed sessions` },
                                        { label: 'Gross Session Revenue', value: formatCurrency(filteredSessions.reduce((s, a) => s + (a.basePrice || 0), 0)), color: '#6366f1', desc: 'Total session prices before split' },
                                        { label: 'Your Total Share', value: formatCurrency(filteredSessions.reduce((s, a) => s + (a.artistShare || 0), 0)), color: '#10b981', desc: `${commissionRate}% of gross revenue` },
                                    ].map((item, i) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(248, 250, 252, 0.6)', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                            <div>
                                                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.label}</p>
                                                <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>{item.desc}</p>
                                            </div>
                                            <span style={{ fontWeight: 800, fontSize: '1.3rem', color: item.color, letterSpacing: '-0.5px' }}>{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* ═══════════════ TABLES ═══════════════ */}
                        <div className="earnings-tables-grid" style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '20px', padding: '1.5rem 2rem 0' }}>
                            {/* Session Earnings Table */}
                            <div className="card glass-card">
                                <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <PhilippinePeso size={18} style={{ color: '#94a3b8' }} />
                                    Session Earnings
                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500, marginLeft: 'auto' }}>{filteredSessions.length} session{filteredSessions.length !== 1 ? 's' : ''}</span>
                                </h2>
                                {filteredSessions.length > 0 ? (
                                    <div className="table-responsive">
                                        <table className="portal-table">
                                            <thead>
                                                <tr>
                                                    <th>Date</th>
                                                    <th>Client</th>
                                                    <th>Service</th>
                                                    <th>Type</th>
                                                    <th>Total</th>
                                                    <th>Your Cut</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {currentSessions.map((session) => (
                                                    <tr key={session.id}>
                                                        <td>{new Date(session.appointment_date).toLocaleDateString()}</td>
                                                        <td>{session.client_name || '—'}</td>
                                                        <td>{session.design_title}</td>
                                                        <td>
                                                            {session.isCollab ? (
                                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(183, 149, 78, 0.1)', color: '#b7954e', padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, border: '1px solid rgba(183, 149, 78, 0.2)' }}>
                                                                    {session.splitPercent}% {session.collabPartnerName ? `w/ ${session.collabPartnerName}` : ''}
                                                                </span>
                                                            ) : session.isReferral ? (
                                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                                                    Referral (70%)
                                                                </span>
                                                            ) : (
                                                                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Solo</span>
                                                            )}
                                                        </td>
                                                        <td>{formatCurrency(session.basePrice)}</td>
                                                        <td style={{ color: session.payment_status === 'paid' ? '#10b981' : '#f59e0b', fontWeight: 'bold' }}>
                                                            {formatCurrency(session.artistShare)}
                                                            <span style={{ fontSize: '0.7rem', display: 'block', color: session.payment_status === 'paid' ? '#10b981' : '#f59e0b' }}>
                                                                {session.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : <p className="no-data" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No completed sessions for this period.</p>}
                                {filteredSessions.length > 0 && (
                                    <Pagination
                                        currentPage={sessionPage}
                                        totalPages={sessionTotalPages}
                                        onPageChange={setSessionPage}
                                        itemsPerPage={sessionPerPage}
                                        onItemsPerPageChange={(newVal) => { setSessionPerPage(newVal); setSessionPage(1); }}
                                        totalItems={filteredSessions.length}
                                        unit="sessions"
                                    />
                                )}
                            </div>

                            {/* Payout History Table */}
                            <div className="card glass-card">
                                <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <CheckCircle size={18} style={{ color: '#94a3b8' }} />
                                    Payout History
                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500, marginLeft: 'auto' }}>{filteredPayouts.length} payout{filteredPayouts.length !== 1 ? 's' : ''}</span>
                                </h2>
                                {filteredPayouts.length > 0 ? (
                                    <div className="table-responsive">
                                        <table className="portal-table">
                                            <thead>
                                                <tr>
                                                    <th>Date</th>
                                                    <th>Amount</th>
                                                    <th>Method</th>
                                                    <th>Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {currentPayouts.map((payout, i) => (
                                                    <tr key={payout.id || i}>
                                                        <td>{new Date(payout.created_at).toLocaleDateString()}</td>
                                                        <td style={{ fontWeight: 700, color: '#10b981' }}>{formatCurrency(payout.amount)}</td>
                                                        <td style={{ fontSize: '0.85rem', color: '#475569' }}>{payout.payout_method || 'N/A'}</td>
                                                        <td>
                                                            <span style={{
                                                                display: 'inline-block', padding: '3px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700,
                                                                background: (payout.status || '').toLowerCase() === 'completed' || (payout.status || '').toLowerCase() === 'paid'
                                                                    ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                                                color: (payout.status || '').toLowerCase() === 'completed' || (payout.status || '').toLowerCase() === 'paid'
                                                                    ? '#10b981' : '#f59e0b',
                                                                border: `1px solid ${(payout.status || '').toLowerCase() === 'completed' || (payout.status || '').toLowerCase() === 'paid'
                                                                    ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`
                                                            }}>
                                                                {payout.status || 'Pending'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : <p className="no-data" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No payout history for this period.</p>}
                                {filteredPayouts.length > payoutPerPage && (
                                    <Pagination
                                        currentPage={payoutPage}
                                        totalPages={payoutTotalPages}
                                        onPageChange={setPayoutPage}
                                        itemsPerPage={payoutPerPage}
                                        onItemsPerPageChange={(newVal) => { setPayoutPerPage(newVal); setPayoutPage(1); }}
                                        totalItems={filteredPayouts.length}
                                        unit="payouts"
                                    />
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default ArtistEarnings;
