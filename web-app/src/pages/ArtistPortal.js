import React, { useState, useEffect, useRef, useMemo } from 'react';
import Axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
    Calendar, TrendingUp, Clock, Bell, CheckCircle, RefreshCw,
    BarChart3, Activity, ArrowRight
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Cell, AreaChart, Area
} from 'recharts';
import PhilippinePeso from '../components/PhilippinePeso';
import Pagination from '../components/Pagination';

import './PortalStyles.css';
import './ArtistStyles.css';
import './AdminAnalytics.css';
import ArtistSideNav from '../components/ArtistSideNav';
import { API_URL } from '../config';

// ── Gold-themed palette for artist portal charts ──
const ARTIST_CHART_COLORS = ['#be9055', '#d4af37', '#c19a6b', '#a67c52', '#8b6914'];

function ArtistPortal() {
    const navigate = useNavigate();
    const [artist, setArtist] = useState({
        name: '', earnings: 0,
        appointments: 0, monthly_earnings: 0, hourly_rate: 0
    });
    const [appointments, setAppointments] = useState([]);
    const [todaysAppointments, setTodaysAppointments] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showNotifDropdown, setShowNotifDropdown] = useState(false);
    const [isRefreshingNotifs, setIsRefreshingNotifs] = useState(false);
    const notifRef = useRef(null);

    // Pagination state for upcoming sessions
    const [upcomingPage, setUpcomingPage] = useState(1);
    const [upcomingPerPage, setUpcomingPerPage] = useState(5);

    const [user] = useState(() => {
        const saved = localStorage.getItem('user');
        return saved ? JSON.parse(saved) : null;
    });
    const artistId = user ? user.id : 1;

    useEffect(() => {
        fetchArtistData();
        fetchNotifications();
    }, [artistId]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (notifRef.current && !notifRef.current.contains(event.target)) {
                setShowNotifDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchNotifications = async () => {
        try {
            const res = await Axios.get(`${API_URL}/api/notifications/${artistId}`);
            if (res.data.success) {
                const sortedNotifs = res.data.notifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                setNotifications(sortedNotifs.slice(0, 5));
                setUnreadCount(sortedNotifs.filter(n => !n.is_read).length);
            }
        } catch (error) {
            console.error("Error fetching notifications:", error);
        }
    };

    const refreshNotifications = async () => {
        setIsRefreshingNotifs(true);
        await fetchNotifications();
        setIsRefreshingNotifs(false);
    };

    const fetchArtistData = async () => {
        try {
            setLoading(true);
            const dashboardResponse = await Axios.get(`${API_URL}/api/artist/dashboard/${artistId}`);
            if (dashboardResponse.data.success) {
                const { artist: artistData, stats } = dashboardResponse.data;
                setArtist({
                    ...artistData,
                    earnings: stats?.total_earnings || 0,
                    monthly_earnings: stats?.monthly_earnings || 0,
                    appointments: stats?.total_appointments || 0
                });
                setNotifications(dashboardResponse.data.notifications || []);
            }

            const appointmentsResponse = await Axios.get(`${API_URL}/api/artist/${artistId}/appointments`);
            if (appointmentsResponse.data.success) {
                const allAppointments = appointmentsResponse.data.appointments || [];
                setAppointments(allAppointments);

                const now = new Date();
                const today = now.getFullYear() + '-' +
                    String(now.getMonth() + 1).padStart(2, '0') + '-' +
                    String(now.getDate()).padStart(2, '0');
                const todayAppts = allAppointments.filter(apt => {
                    if (!apt.appointment_date) return false;
                    const d = new Date(apt.appointment_date);
                    const localAptDate = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
                    return localAptDate === today && apt.status !== 'cancelled';
                });
                setTodaysAppointments(todayAppts);
            }
            setLoading(false);
        } catch (error) {
            console.error("Error fetching artist data:", error);
            setLoading(false);
        }
    };

    // ── Relative time formatter ──
    const relativeTime = (dateStr) => {
        const now = new Date();
        const d = new Date(dateStr);
        const diffMs = now - d;
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHrs = Math.floor(diffMins / 60);
        if (diffHrs < 24) return `${diffHrs}h ago`;
        const diffDays = Math.floor(diffHrs / 24);
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays}d ago`;
        return d.toLocaleDateString();
    };

    // ── Chart Data: Upcoming Sessions by Day (next 7 days) ──
    const upcomingByDay = useMemo(() => {
        const days = [];
        const now = new Date();
        for (let i = 0; i < 7; i++) {
            const d = new Date(now);
            d.setDate(d.getDate() + i);
            const dateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
            const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            const count = appointments.filter(apt => {
                if (!apt.appointment_date || apt.status === 'cancelled') return false;
                const ad = new Date(apt.appointment_date);
                const adStr = ad.getFullYear() + '-' + String(ad.getMonth() + 1).padStart(2, '0') + '-' + String(ad.getDate()).padStart(2, '0');
                return adStr === dateStr;
            }).length;
            days.push({ day: label, count, dateStr });
        }
        return days;
    }, [appointments]);

    // ── Chart Data: Monthly Earnings Trend (last 6 months) ──
    const monthlyEarningsTrend = useMemo(() => {
        const monthMap = {};
        const now = new Date();
        // Initialize last 6 months
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = d.toLocaleString('default', { month: 'short' });
            monthMap[key] = { month: label, sortKey: key, earned: 0, sessions: 0 };
        }
        // Sum completed+paid appointments
        const commRate = artist.commission_rate || 0.30;
        appointments.forEach(apt => {
            if ((apt.status || '').toLowerCase() !== 'completed') return;
            if ((apt.payment_status || '').toLowerCase() !== 'paid') return;
            const d = new Date(apt.appointment_date);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (monthMap[key]) {
                monthMap[key].earned += (parseFloat(apt.price || 0) * commRate);
                monthMap[key].sessions += 1;
            }
        });
        return Object.values(monthMap).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    }, [appointments, artist.commission_rate]);

    // ── Cumulative earnings trend for mini AreaChart in Total Earnings card ──
    const cumulativeEarningsTrend = useMemo(() => {
        let running = 0;
        return monthlyEarningsTrend.map(m => {
            running += m.earned;
            return { month: m.month, total: running };
        });
    }, [monthlyEarningsTrend]);

    // ── Upcoming appointments (for table) ──
    const upcomingAppointments = useMemo(() => {
        const now = new Date();
        const today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
        return appointments.filter(apt => {
            if (!apt.appointment_date && !apt.date) return false;
            const d = new Date(apt.appointment_date || apt.date);
            const localAptDate = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
            return localAptDate >= today && apt.status !== 'cancelled';
        }).sort((a, b) => new Date(a.appointment_date || a.date) - new Date(b.appointment_date || b.date));
    }, [appointments]);

    // Pagination for upcoming
    const upcomingTotalPages = Math.ceil(upcomingAppointments.length / upcomingPerPage);
    const currentUpcoming = upcomingAppointments.slice((upcomingPage - 1) * upcomingPerPage, upcomingPage * upcomingPerPage);

    const formatCurrency = (val) => `₱${Number(val || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const CHART_HEIGHT = 80;

    return (
        <div className="portal-layout">
            <ArtistSideNav />
            <div className="portal-container artist-portal">
                <header className="portal-header">
                    <div className="header-title">
                        <h1>Artist Dashboard</h1>
                    </div>
                    <div className="header-actions">
                        <div className="notif-btn-wrapper admin-st-fab32c0e" ref={notifRef}>
                            <button className="notif-trigger-btn" onClick={() => setShowNotifDropdown(!showNotifDropdown)}>
                                <Bell size={20} />
                                {unreadCount > 0 && <span className="notif-badge-dot"></span>}
                            </button>

                            {showNotifDropdown && (
                                <div className="notif-dropdown-v2 glass-card">
                                    <div className="notif-dropdown-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h3>Notifications</h3>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); refreshNotifications(); }}
                                            title="Refresh notifications"
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', transition: 'all 0.2s' }}
                                        >
                                            <RefreshCw size={16} style={isRefreshingNotifs ? { animation: 'spin 1s linear infinite' } : {}} />
                                        </button>
                                    </div>
                                    <div className="notif-dropdown-list">
                                        {notifications.length > 0 ? (
                                            notifications.map(n => (
                                                <div key={n.id} className={`notif-dropdown-item ${!n.is_read ? 'unread' : ''}`} onClick={() => { setShowNotifDropdown(false); navigate('/artist/notifications'); }}>
                                                    <div className="notif-item-content">
                                                        <span className="notif-item-title">{n.title}</span>
                                                        <span className="notif-item-msg">{n.message}</span>
                                                        <span className="notif-item-time">{relativeTime(n.created_at)}</span>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="notif-empty">No notifications yet</div>
                                        )}
                                    </div>
                                    <div className="notif-dropdown-footer">
                                        <button onClick={() => { setShowNotifDropdown(false); navigate('/artist/notifications'); }}>See All Updates</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>
                <p className="header-subtitle">Welcome back, {artist.name || 'Artist'}</p>

                <div className="portal-content">
                    {loading ? (
                        <div className="dashboard-loader-container" style={{ padding: '80px 0', textAlign: 'center' }}>
                            <div className="premium-loader"></div>
                            <p style={{ color: '#64748b', marginTop: '12px' }}>Loading dashboard...</p>
                        </div>
                    ) : (
                        <>
                            {/* ═══════════════ METRIC CARDS (AnalyticsMetricCards-style with mini charts) ═══════════════ */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', padding: '0 2rem', marginBottom: '1.5rem' }}>
                                {/* Total Earnings — AreaChart trend */}
                                <div className="card glass-card" style={{ cursor: 'pointer', padding: '20px', display: 'flex', flexDirection: 'column' }} onClick={() => navigate('/artist/earnings')}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ background: '#f0fdf4', color: '#22c55e', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <PhilippinePeso size={22} />
                                        </div>
                                        <div style={{ minWidth: 0 }}>
                                            <span style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: '2px' }}>Total Earnings</span>
                                            <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formatCurrency(artist.earnings)}</h3>
                                        </div>
                                    </div>
                                    <div style={{ width: '100%', height: CHART_HEIGHT, marginTop: '16px' }}>
                                        <ResponsiveContainer>
                                            <AreaChart data={cumulativeEarningsTrend} margin={{ top: 10, right: 5, left: 5, bottom: 0 }}>
                                                <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 9 }} axisLine={false} tickLine={false} />
                                                <Area type="monotone" dataKey="total" stroke="#10b981" fill="#dcfce7" strokeWidth={2} activeDot={{ r: 4 }} />
                                                <Tooltip
                                                    formatter={(value) => [formatCurrency(value), 'Cumulative']}
                                                    contentStyle={{ fontSize: '0.75rem', borderRadius: '8px' }}
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div style={{ marginTop: 'auto', paddingTop: '12px', fontSize: '0.75rem', fontWeight: 600, color: '#10b981' }}>
                                        View full earnings report →
                                    </div>
                                </div>

                                {/* This Month's Earnings — AreaChart monthly */}
                                <div className="card glass-card" style={{ cursor: 'pointer', padding: '20px', display: 'flex', flexDirection: 'column' }} onClick={() => navigate('/artist/earnings')}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ background: '#fff7ed', color: '#f97316', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <TrendingUp size={22} />
                                        </div>
                                        <div style={{ minWidth: 0 }}>
                                            <span style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: '2px' }}>This Month's Earnings</span>
                                            <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formatCurrency(artist.monthly_earnings)}</h3>
                                        </div>
                                    </div>
                                    <div style={{ width: '100%', height: CHART_HEIGHT, marginTop: '16px' }}>
                                        <ResponsiveContainer>
                                            <AreaChart data={monthlyEarningsTrend} margin={{ top: 10, right: 5, left: 5, bottom: 0 }}>
                                                <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 9 }} axisLine={false} tickLine={false} />
                                                <Area type="monotone" dataKey="earned" stroke="#be9055" fill="#fef3c7" strokeWidth={2} activeDot={{ r: 4 }} />
                                                <Tooltip
                                                    formatter={(value) => [formatCurrency(value), 'Monthly']}
                                                    contentStyle={{ fontSize: '0.75rem', borderRadius: '8px' }}
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div style={{ marginTop: 'auto', paddingTop: '12px', fontSize: '0.75rem', fontWeight: 600, color: '#be9055' }}>
                                        View monthly breakdown →
                                    </div>
                                </div>

                                {/* Total Sessions — simple metric */}
                                <div className="card glass-card" style={{ cursor: 'pointer', padding: '20px', display: 'flex', flexDirection: 'column' }} onClick={() => navigate('/artist/appointments')}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ background: '#eff6ff', color: '#3b82f6', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <Calendar size={22} />
                                        </div>
                                        <div style={{ minWidth: 0 }}>
                                            <span style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: '2px' }}>Total Sessions</span>
                                            <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#1e293b' }}>{artist.appointments || 0}</h3>
                                        </div>
                                    </div>
                                    <div style={{ width: '100%', height: CHART_HEIGHT, marginTop: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '12px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(248, 250, 252, 0.6)', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Upcoming</span>
                                            <span style={{ fontWeight: 800, fontSize: '1.15rem', color: '#3b82f6' }}>{upcomingAppointments.length}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(248, 250, 252, 0.6)', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Today</span>
                                            <span style={{ fontWeight: 800, fontSize: '1.15rem', color: '#10b981' }}>{todaysAppointments.length}</span>
                                        </div>
                                    </div>
                                    <div style={{ marginTop: 'auto', paddingTop: '12px', fontSize: '0.75rem', fontWeight: 600, color: '#3b82f6' }}>
                                        View full schedule →
                                    </div>
                                </div>
                            </div>

                            {/* ═══════════════ CHARTS ROW: Week Ahead + Recent Activity ═══════════════ */}
                            <div className="analytics-dashboard-layout" style={{ padding: '0 2rem', marginTop: '1.5rem' }}>
                                {/* Upcoming Sessions by Day */}
                                <div className="card glass-card" style={{ width: '100%', boxSizing: 'border-box' }}>
                                    <h2><BarChart3 size={18} style={{ verticalAlign: 'middle', marginRight: '8px', color: '#94a3b8' }} />Week Ahead</h2>
                                    <div style={{ width: '100%', height: 250 }}>
                                        <ResponsiveContainer>
                                            <BarChart data={upcomingByDay} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                                <XAxis dataKey="day" tick={{ fill: '#1e293b', fontSize: 11, fontWeight: 600 }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
                                                <YAxis allowDecimals={false} tick={{ fill: '#1e293b', fontSize: 11 }} axisLine={false} tickLine={false} />
                                                <Tooltip
                                                    cursor={{ fill: 'rgba(190, 144, 85, 0.06)' }}
                                                    contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', padding: '10px 14px', fontSize: '0.85rem' }}
                                                    formatter={(value) => [`${value} session${value !== 1 ? 's' : ''}`, 'Booked']}
                                                />
                                                <Bar dataKey="count" name="Sessions" fill="#be9055" radius={[8, 8, 0, 0]} barSize={36}>
                                                    {upcomingByDay.map((entry, index) => (
                                                        <Cell key={`bar-${index}`} fill={entry.count > 0 ? ARTIST_CHART_COLORS[index % ARTIST_CHART_COLORS.length] : '#e2e8f0'} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div style={{ paddingTop: '8px', fontSize: '0.75rem', fontWeight: 600, color: '#be9055' }}>
                                        {upcomingAppointments.length} upcoming session{upcomingAppointments.length !== 1 ? 's' : ''} total
                                    </div>
                                </div>

                                {/* Recent Activity Feed */}
                                <div className="card glass-card" style={{ width: '100%', boxSizing: 'border-box' }}>
                                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Activity size={18} style={{ color: '#94a3b8' }} />
                                        Recent Activity
                                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500, marginLeft: 'auto' }}>{unreadCount} unread</span>
                                    </h2>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        {notifications.length > 0 ? notifications.map(notif => (
                                            <div key={notif.id}
                                                style={{
                                                    display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px',
                                                    borderRadius: '10px', cursor: 'pointer', transition: 'background 0.2s',
                                                    background: !notif.is_read ? 'rgba(190, 144, 85, 0.05)' : 'transparent',
                                                    borderLeft: !notif.is_read ? '3px solid #be9055' : '3px solid transparent'
                                                }}
                                                onClick={() => navigate('/artist/notifications')}
                                                onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; }}
                                                onMouseLeave={e => { e.currentTarget.style.background = !notif.is_read ? 'rgba(190, 144, 85, 0.05)' : 'transparent'; }}
                                            >
                                                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    <Bell size={14} color="#6366f1" />
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <p style={{ margin: 0, fontWeight: 600, color: '#1e293b', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{notif.title}</p>
                                                    <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{notif.message}</p>
                                                </div>
                                                <span style={{ fontSize: '0.7rem', color: '#94a3b8', flexShrink: 0, whiteSpace: 'nowrap' }}>{relativeTime(notif.created_at)}</span>
                                            </div>
                                        )) : (
                                            <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                                                <CheckCircle size={32} color="#10b981" style={{ marginBottom: '8px', opacity: 0.5 }} />
                                                <p style={{ margin: 0, fontSize: '0.9rem' }}>No recent activity</p>
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => navigate('/artist/notifications')}
                                        style={{ width: '100%', marginTop: '12px', padding: '10px', borderRadius: '8px', background: '#f1f5f9', color: '#475569', border: 'none', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }}
                                        onMouseEnter={e => { e.currentTarget.style.background = '#e2e8f0'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = '#f1f5f9'; }}
                                    >
                                        View All Notifications <ArrowRight size={14} />
                                    </button>
                                </div>
                            </div>

                            {/* ═══════════════ ROW 2: Today's Schedule + Monthly Earnings ═══════════════ */}
                            <div className="analytics-dashboard-layout" style={{ padding: '0 2rem', marginTop: '1.5rem' }}>
                                {/* Today's Schedule */}
                                <div className="card glass-card" style={{ width: '100%', boxSizing: 'border-box' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Clock size={18} style={{ color: '#94a3b8' }} />
                                            Today's Schedule
                                            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>({todaysAppointments.length} session{todaysAppointments.length !== 1 ? 's' : ''})</span>
                                        </h2>
                                        <button className="btn btn-secondary" onClick={() => navigate('/artist/sessions')} style={{ fontSize: '0.8rem', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            Launch Session View <ArrowRight size={14} />
                                        </button>
                                    </div>
                                    {todaysAppointments.length > 0 ? (
                                        <div className="table-responsive">
                                            <table className="portal-table">
                                                <thead>
                                                    <tr>
                                                        <th>Time</th>
                                                        <th>Client</th>
                                                        <th>Service</th>
                                                        <th>Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {todaysAppointments.map((apt) => (
                                                        <tr key={apt.id}>
                                                            <td style={{ fontWeight: 600 }}>{apt.start_time}</td>
                                                            <td>{apt.client_name}</td>
                                                            <td>{apt.design_title}</td>
                                                            <td><span className={`status-badge ${apt.status.toLowerCase()}`}>{apt.status}</span></td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div style={{ padding: '40px', textAlign: 'center' }}>
                                            <CheckCircle size={40} color="#10b981" style={{ marginBottom: '10px', opacity: 0.6 }} />
                                            <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>No appointments scheduled for today.</p>
                                        </div>
                                    )}
                                </div>

                                {/* Monthly Earnings Trend */}
                                <div className="card glass-card" style={{ width: '100%', boxSizing: 'border-box' }}>
                                    <h2><TrendingUp size={18} style={{ verticalAlign: 'middle', marginRight: '8px', color: '#94a3b8' }} />Earnings Trend (6 Months)</h2>
                                    <div style={{ width: '100%', height: 250 }}>
                                        <ResponsiveContainer>
                                            <BarChart data={monthlyEarningsTrend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                                <XAxis dataKey="month" tick={{ fill: '#1e293b', fontSize: 12, fontWeight: 600 }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
                                                <YAxis tick={{ fill: '#1e293b', fontSize: 11 }} tickFormatter={v => `₱${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                                                <Tooltip
                                                    cursor={{ fill: 'rgba(16, 185, 129, 0.06)' }}
                                                    contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', padding: '10px 14px', fontSize: '0.85rem' }}
                                                    formatter={(value) => [formatCurrency(value), 'Your Earnings']}
                                                    labelFormatter={(label, payload) => {
                                                        const sessions = payload && payload[0] ? payload[0].payload.sessions : 0;
                                                        return `${label} — ${sessions} session${sessions !== 1 ? 's' : ''}`;
                                                    }}
                                                />
                                                <Bar dataKey="earned" name="Earnings" fill="#10b981" radius={[8, 8, 0, 0]} barSize={32}>
                                                    {monthlyEarningsTrend.map((entry, index) => (
                                                        <Cell key={`earn-${index}`} fill={entry.earned > 0 ? '#10b981' : '#e2e8f0'} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <button
                                        onClick={() => navigate('/artist/earnings')}
                                        style={{ width: '100%', marginTop: '8px', padding: '10px', borderRadius: '8px', background: '#f1f5f9', color: '#475569', border: 'none', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }}
                                        onMouseEnter={e => { e.currentTarget.style.background = '#e2e8f0'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = '#f1f5f9'; }}
                                    >
                                        View Full Earnings Report <ArrowRight size={14} />
                                    </button>
                                </div>
                            </div>

                            {/* ═══════════════ UPCOMING SESSIONS TABLE (with pagination) ═══════════════ */}
                            <div style={{ padding: '1.5rem 2rem 0' }}>
                                <div className="card glass-card">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Calendar size={18} style={{ color: '#94a3b8' }} />
                                            Upcoming Sessions
                                            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>({upcomingAppointments.length} total)</span>
                                        </h2>
                                        <button className="btn btn-secondary" onClick={() => navigate('/artist/appointments')} style={{ fontSize: '0.8rem', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            View Full Schedule <ArrowRight size={14} />
                                        </button>
                                    </div>
                                    <div className="table-responsive">
                                        {upcomingAppointments.length > 0 ? (
                                            <table className="portal-table">
                                                <thead>
                                                    <tr>
                                                        <th>Client</th>
                                                        <th>Date</th>
                                                        <th>Time</th>
                                                        <th>Service</th>
                                                        <th>Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {currentUpcoming.map((apt) => (
                                                        <tr key={apt.id} style={{ cursor: 'pointer' }} onClick={() => navigate('/artist/appointments')}>
                                                            <td style={{ fontWeight: 600 }}>{apt.client_name || apt.client || 'N/A'}</td>
                                                            <td>{apt.appointment_date ? new Date(apt.appointment_date).toLocaleDateString() : 'N/A'}</td>
                                                            <td>{apt.start_time || apt.appointment_time || apt.time || 'N/A'}</td>
                                                            <td>{apt.design_title || apt.service_type || 'Tattoo Session'}</td>
                                                            <td><span className={`status-badge ${(apt.status || 'pending').toLowerCase()}`}>{apt.status || 'Pending'}</span></td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        ) : (
                                            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                                                <Calendar size={40} style={{ marginBottom: '10px', opacity: 0.3 }} />
                                                <p style={{ margin: 0, fontSize: '0.95rem' }}>No upcoming sessions scheduled</p>
                                            </div>
                                        )}
                                    </div>
                                    {upcomingAppointments.length > 0 && (
                                        <Pagination
                                            currentPage={upcomingPage}
                                            totalPages={upcomingTotalPages}
                                            onPageChange={setUpcomingPage}
                                            itemsPerPage={upcomingPerPage}
                                            onItemsPerPageChange={(newVal) => { setUpcomingPerPage(newVal); setUpcomingPage(1); }}
                                            totalItems={upcomingAppointments.length}
                                            unit="sessions"
                                        />
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    <style jsx>{`
                    .notif-trigger-btn {
                        background: none;
                        border: none;
                        color: #64748b;
                        cursor: pointer;
                        padding: 8px;
                        border-radius: 50%;
                        transition: all 0.2s;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        position: relative;
                    }
                    .notif-trigger-btn:hover { background: rgba(0,0,0,0.05); color: #1e293b; }
                    .notif-badge-dot {
                        position: absolute;
                        top: 5px;
                        right: 5px;
                        width: 10px;
                        height: 10px;
                        background-color: #ef4444;
                        border-radius: 50%;
                        border: 2px solid white;
                    }
                    .notif-dropdown-v2 {
                        position: absolute;
                        top: 100%;
                        right: 0;
                        width: 360px;
                        background: white;
                        border-radius: 12px;
                        box-shadow: 0 10px 25px rgba(0,0,0,0.1);
                        z-index: 1000;
                        margin-top: 10px;
                        border: 1px solid #e2e8f0;
                        animation: slideDown 0.2s ease-out;
                    }
                    @keyframes slideDown { 
                        from { opacity: 0; transform: translateY(-10px); } 
                        to { opacity: 1; transform: translateY(0); } 
                    }
                    .notif-dropdown-header { padding: 12px 16px; border-bottom: 1px solid #f1f5f9; }
                    .notif-dropdown-header h3 { margin: 0; font-size: 1rem; color: #1e293b; }
                    .notif-dropdown-list { max-height: 350px; overflow-y: auto; }
                    .notif-dropdown-item { padding: 12px 16px; border-bottom: 1px solid #f1f5f9; cursor: pointer; transition: background 0.2s; }
                    .notif-dropdown-item:hover { background: #f8fafc; }
                    .notif-dropdown-item.unread { background: #f0f9ff; }
                    .notif-item-content { display: flex; flex-direction: column; gap: 4px; }
                    .notif-item-title { font-weight: 600; font-size: 0.9rem; color: #1e293b; text-align: left; }
                    .notif-item-msg { font-size: 0.8rem; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: left; }
                    .notif-item-time { font-size: 0.7rem; color: #94a3b8; text-align: left; }
                    .notif-empty { padding: 30px; text-align: center; color: #94a3b8; font-size: 0.9rem; }
                    .notif-dropdown-footer { padding: 10px; border-top: 1px solid #f1f5f9; text-align: center; }
                    .notif-dropdown-footer button { 
                        background: none; border: none; color: #be9055; font-weight: 600; font-size: 0.85rem; 
                        cursor: pointer; transition: color 0.2s; 
                    }
                    .notif-dropdown-footer button:hover { color: #b8860b; text-decoration: underline; }
                `}</style>
                </div>
            </div>
        </div>
    );
}

export default ArtistPortal;
