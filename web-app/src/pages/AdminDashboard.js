import React, { useState, useEffect, useRef } from 'react';
import Axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Users, Calendar, Palette, Settings, Package, BarChart3, AlertTriangle, Bell, Clock, CheckCircle, FileText, Search, ChevronLeft, ChevronRight, X, ShoppingCart, Info, SlidersHorizontal, RefreshCw } from 'lucide-react';
import PhilippinePeso from '../components/PhilippinePeso';
import AnalyticsMetricCards from '../components/AnalyticsMetricCards';
import AnalyticsAuditModal from '../components/AnalyticsAuditModal';
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

import './AdminDashboard.css';
import AdminSideNav from '../components/AdminSideNav';
import './PortalStyles.css';
import './AdminStyles.css';
import { API_URL } from '../config';
import { getDisplayCode } from '../utils/formatters';

function AdminDashboard() {
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalAppointments: 0,
        totalRevenue: 0,
        activeArtists: 0
    });
    const [revenueData, setRevenueData] = useState({ daily: 0, monthly: 0 });
    const [todaysAppointments, setTodaysAppointments] = useState([]);
    const [artistStatus, setArtistStatus] = useState([]);
    const [chartData, setChartData] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [users, setUsers] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [unreadNotifications, setUnreadNotifications] = useState(0);

    // Shared analytics state (for metric cards + audit modal)
    const [analyticsData, setAnalyticsData] = useState(null);
    const [auditModal, setAuditModal] = useState({ open: false, title: '', type: '', data: null });
    const [expenseForm, setExpenseForm] = useState({ category: 'Inventory', description: '', amount: '' });
    const [expenseList, setExpenseList] = useState([]);
    const [expenseLoading, setExpenseLoading] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [showNotifDropdown, setShowNotifDropdown] = useState(false);
    const [isRefreshingNotifs, setIsRefreshingNotifs] = useState(false);
    const notifRef = useRef(null);

    // Audit Logs State
    const [auditSearch, setAuditSearch] = useState('');
    const [auditPage, setAuditPage] = useState(1);
    const itemsPerPage = 5;

    // Appointments Pagination State
    const [appointmentSearch, setAppointmentSearch] = useState('');
    const [appointmentFilter, setAppointmentFilter] = useState('upcoming'); // 'upcoming', 'latest', 'all'
    const [appointmentPage, setAppointmentPage] = useState(1);
    const appointmentsPerPage = 10;
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [confirmModal, setConfirmModal] = useState({ open: false, message: '', onConfirm: null });

    const navigate = useNavigate();

    useEffect(() => {
        fetchDashboardData();
        fetchAnalyticsData();
        fetchExpenseData();
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (notifRef.current && !notifRef.current.contains(event.target)) {
                setShowNotifDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const refreshNotifications = async () => {
        try {
            setIsRefreshingNotifs(true);
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            if (user.id) {
                const res = await Axios.get(`${API_URL}/api/notifications/${user.id}`);
                if (res.data.success) {
                    setNotifications(res.data.notifications || []);
                    setUnreadNotifications(res.data.unreadCount);
                }
            }
        } catch (error) {
            console.error("Error refreshing notifications:", error);
        } finally {
            setIsRefreshingNotifs(false);
        }
    };

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const [usersResponse, appointmentsResponse, logsResponse, inventoryResponse, notificationsResponse] = await Promise.all([
                Axios.get(`${API_URL}/api/debug/users`),
                Axios.get(`${API_URL}/api/admin/appointments`),
                Axios.get(`${API_URL}/api/admin/audit-logs?limit=5`), // Limit logs for dashboard
                Axios.get(`${API_URL}/api/admin/inventory?status=active`),
                user.id ? Axios.get(`${API_URL}/api/notifications/${user.id}`) : Promise.resolve({ data: { unreadCount: 0 } })
            ]);

            if (usersResponse.data.success) {
                // Filter out deleted users for dashboard stats
                const users = usersResponse.data.users.filter(u => !u.is_deleted);
                setUsers(users);

                const appointments = appointmentsResponse.data.success ? appointmentsResponse.data.data : [];

                // Calculate stats
                const totalUsers = users.length;
                const activeArtists = users.filter(u => u.user_type === 'artist').length;
                const totalAppointments = appointments.length;

                // --- Process Data for Dashboard ---
                const now = new Date();
                const todayStr = now.toISOString().split('T')[0];
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();

                let dailyRev = 0;
                let monthlyRev = 0;
                let totalRev = 0;

                // Chart Data Prep (Last 7 Days)
                const last7Days = {};
                for (let i = 6; i >= 0; i--) {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    last7Days[d.toISOString().split('T')[0]] = 0;
                }

                appointments.forEach(apt => {
                    // Normalize date
                    let aptDateStr = typeof apt.appointment_date === 'string'
                        ? apt.appointment_date.split('T')[0]
                        : new Date(apt.appointment_date).toISOString().split('T')[0];

                    // Chart Counting
                    if (last7Days.hasOwnProperty(aptDateStr)) {
                        last7Days[aptDateStr]++;
                    }

                    // Revenue Calculation
                    if (apt.status !== 'cancelled') {
                        const paidTotal = Number(apt.total_paid) || 0;
                        totalRev += paidTotal;
                        if (aptDateStr === todayStr) dailyRev += paidTotal;
                        const aptDate = new Date(aptDateStr);
                        if (aptDate.getMonth() === currentMonth && aptDate.getFullYear() === currentYear) {
                            monthlyRev += paidTotal;
                        }
                    }
                });

                setRevenueData({ daily: dailyRev, monthly: monthlyRev });
                setChartData(Object.keys(last7Days).map(date => ({
                    day: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
                    count: last7Days[date]
                })));

                setStats({
                    totalUsers,
                    totalAppointments,
                    totalRevenue: totalRev,
                    activeArtists
                });

                setAppointments(appointments);

                // Today's Appointments
                const todayApptsList = appointments.filter(apt => {
                    let d = typeof apt.appointment_date === 'string' ? apt.appointment_date : new Date(apt.appointment_date).toISOString();
                    return d.startsWith(todayStr) && apt.status !== 'cancelled';
                });
                setTodaysAppointments(todayApptsList);

                // Artist Availability
                const artistList = users.filter(u => u.user_type === 'artist');
                const statusMap = artistList.map(artist => {
                    const isBusy = todayApptsList.some(apt => apt.artist_name === artist.name);
                    return {
                        id: artist.id,
                        name: artist.name,
                        status: isBusy ? 'Booked' : 'Available'
                    };
                });
                setArtistStatus(statusMap);

                // --- Generate Functional Alerts ---
                const generatedAlerts = [];
                let alertId = 1;

                // 1. Inventory Alerts
                if (inventoryResponse.data.success) {
                    const inventory = inventoryResponse.data.data;
                    const lowStockItems = inventory.filter(item => item.current_stock <= item.min_stock);

                    lowStockItems.slice(0, 2).forEach(item => { // Limit to 2 for UI cleanliness
                        generatedAlerts.push({
                            id: alertId++,
                            type: 'inventory',
                            message: `Low stock: ${item.name} (${item.current_stock} left)`,
                            severity: 'high'
                        });
                    });
                }

                // 2. TESTING the Appointments Alert
                const pendingAppointments = appointments.filter(apt => apt.status === 'pending');
                if (pendingAppointments.length > 0) {
                    generatedAlerts.push({
                        id: alertId++,
                        type: 'appointment', // Changed to 'appointment' for consistency with AdminNotifications
                        message: `You have ${pendingAppointments.length} pending appointment requests.`,
                        severity: 'medium'
                    });
                }

                setAlerts(generatedAlerts);
            }

            if (logsResponse?.data?.success) {
                setAuditLogs(logsResponse.data.data);
            }

            if (notificationsResponse.data.success) {
                setNotifications(notificationsResponse.data.notifications || []);
                setUnreadNotifications(notificationsResponse.data.unreadCount);
            }
            setLoading(false);
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
            setLoading(false);
        }
    };

    const showConfirm = (message, onConfirm) => {
        setConfirmModal({ open: true, message, onConfirm });
    };

    const handleStatusUpdate = async (id, status) => {
        showConfirm(
            `Are you sure you want to mark this appointment as "${status}"?`,
            async () => {
                try {
                    await Axios.put(`${API_URL}/api/appointments/${id}/status`, { status });
                    fetchDashboardData();
                } catch (error) {
                    console.error(error);
                }
            }
        );
    };

    const handleLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        navigate('/admin');
    };

    const handleNavigate = (path) => {
        navigate(path);
    };

    // Shared analytics fetch (same endpoint as AdminAnalytics)
    const fetchAnalyticsData = async () => {
        try {
            const res = await Axios.get(`${API_URL}/api/admin/analytics?timeframe=monthly`);
            if (res.data.success) setAnalyticsData(res.data.data);
        } catch (error) { console.error('Error fetching analytics for dashboard:', error); }
    };

    const fetchExpenseData = async () => {
        setExpenseLoading(true);
        try {
            const res = await Axios.get(`${API_URL}/api/admin/expenses`);
            if (res.data.success) setExpenseList(res.data.data);
        } catch (e) { console.error(e); }
        setExpenseLoading(false);
    };

    const handleAddExpenseDash = async (e) => {
        e.preventDefault();
        if (!expenseForm.amount || parseFloat(expenseForm.amount) <= 0) return;
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            await Axios.post(`${API_URL}/api/admin/expenses`, { ...expenseForm, amount: parseFloat(expenseForm.amount), userId: user?.id });
            setExpenseForm({ category: 'Inventory', description: '', amount: '' });
            fetchExpenseData();
            fetchAnalyticsData();
        } catch (e) { console.error(e); }
    };

    const handleDeleteExpenseDash = async (id) => {
        try {
            await Axios.delete(`${API_URL}/api/admin/expenses/${id}`);
            fetchExpenseData();
            fetchAnalyticsData();
        } catch (e) {
            const msg = e.response?.data?.message || 'Failed to delete expense.';
            alert(msg);
        }
    };

    const handleEditExpenseDash = async (id, data) => {
        try {
            await Axios.put(`${API_URL}/api/admin/expenses/${id}`, {
                category: data.category,
                description: data.description,
                amount: parseFloat(data.amount)
            });
            fetchExpenseData();
            fetchAnalyticsData();
        } catch (e) {
            const msg = e.response?.data?.message || 'Failed to edit expense.';
            alert(msg);
        }
    };

    const openDashAuditModal = (type) => {
        if (!analyticsData) return;
        let title = '', data = null;
        switch (type) {
            case 'revenue':
                title = 'Revenue Audit — Source Breakdown';
                data = { breakdown: analyticsData.revenue.breakdown, total: analyticsData.revenue.total, source: 'payments + invoices + manual_paid_amount' };
                break;
            case 'expenses':
                title = 'Operations Audits — Payouts & Procurements';
                data = { breakdown: analyticsData.expenses.breakdown, total: analyticsData.expenses.total, source: 'payouts + inventory transactions (type=in)', payouts_audit: analyticsData.expenses.payouts_audit, inventory_in_audit: analyticsData.expenses.inventory_in_audit };
                break;
            case 'overhead':
                title = 'Studio Overhead — Manual Expenses';
                data = { breakdown: analyticsData.overhead.breakdown, total: analyticsData.overhead.total, source: 'studio_expenses table' };
                fetchExpenseData();
                break;
            case 'appointments':
                title = 'Appointments Audit';
                data = { breakdown: [{ name: 'Completed', value: Number(analyticsData.appointments.completed) || 0 }, { name: 'Scheduled', value: Number(analyticsData.appointments.scheduled) || 0 }, { name: 'Cancelled', value: Number(analyticsData.appointments.cancelled) || 0 }].filter(b => b.value > 0), total: analyticsData.appointments.total, source: 'appointments table' };
                break;
            case 'users':
                title = 'User Base Audit';
                data = { breakdown: [{ name: 'Customers', value: Number(analyticsData.users?.customers) || 0 }, { name: 'Artists', value: Number(analyticsData.users?.artists) || 0 }, { name: 'Admins', value: Number(analyticsData.users?.admins) || 0 }].filter(b => b.value > 0), total: analyticsData.users?.total || 0, source: 'users table' };
                break;
            case 'artists':
                title = 'Artist Performance Audit';
                data = { list: analyticsData.artists, source: 'appointments joined with users' };
                break;
            case 'inventory':
                title = 'Inventory Consumption Audit';
                data = { list: analyticsData.inventory, source: 'inventory_transactions (type=out)' };
                break;
            case 'completion':
                title = 'Completion Rate Audit';
                data = { breakdown: [{ name: 'Completed', value: Number(analyticsData.appointments.completed) || 0 }, { name: 'Cancelled', value: Number(analyticsData.appointments.cancelled) || 0 }].filter(b => b.value > 0), rate: analyticsData.appointments.completionRate, source: 'appointments table' };
                break;
            case 'duration':
                title = 'Avg Session Duration Audit';
                data = { avgDuration: analyticsData.appointments.avgDuration, source: 'appointments: AVG(session_duration)' };
                break;
            default: break;
        }
        setAuditModal({ open: true, title, type, data });
    };

    const closeDashAuditModal = () => setAuditModal({ open: false, title: '', type: '', data: null });

    const formatDuration = (seconds) => {
        if (!seconds) return 'N/A';
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        return hrs > 0 ? `${hrs}h ${String(mins).padStart(2, '0')}m` : `${mins}m`;
    };

    // Filter and paginate logs
    const filteredLogs = auditLogs.filter(log => // Audit logs are already limited by the API call
        (log.user_name || 'System').toLowerCase().includes(auditSearch.toLowerCase()) ||
        (log.action || '').toLowerCase().includes(auditSearch.toLowerCase()) ||
        (log.details || '').toLowerCase().includes(auditSearch.toLowerCase())
    );
    const auditTotalPages = Math.ceil(filteredLogs.length / itemsPerPage);
    const displayedLogs = filteredLogs.slice((auditPage - 1) * itemsPerPage, auditPage * itemsPerPage);

    // Filter and paginate appointments
    const filteredAppointments = appointments.filter(apt => {
        const matchesSearch =
            (apt.client_name || '').toLowerCase().includes(appointmentSearch.toLowerCase()) ||
            (apt.artist_name || '').toLowerCase().includes(appointmentSearch.toLowerCase());

        if (!matchesSearch) return false;

        if (appointmentFilter === 'upcoming') {
            const today = new Date().toISOString().split('T')[0];
            const aptDate = typeof apt.appointment_date === 'string'
                ? apt.appointment_date.split('T')[0]
                : new Date(apt.appointment_date).toISOString().split('T')[0];

            return aptDate >= today && apt.status !== 'cancelled' && apt.status !== 'completed';
        }
        return true;
    });

    // Sorting
    if (appointmentFilter === 'latest') {
        filteredAppointments.sort((a, b) => b.id - a.id);
    } else {
        filteredAppointments.sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date));
    }

    const appointmentTotalPages = Math.ceil(filteredAppointments.length / appointmentsPerPage);
    const displayedAppointments = filteredAppointments.slice((appointmentPage - 1) * appointmentsPerPage, appointmentPage * appointmentsPerPage);

    return (
        <div className="admin-page-with-sidenav">
            <AdminSideNav />
            <div className="admin-page admin-dashboard-container page-container-enter">
                <header className="portal-header">
                    <div className="header-title">
                        <h1>Admin Dashboard</h1>
                    </div>
                    <div className="header-actions">
                        <div className="header-search">
                            <Search size={18} />
                            <input type="text" placeholder="Search system..." />
                        </div>

                        <div className="notif-btn-wrapper admin-st-fab32c0e" ref={notifRef} >
                            <button className="notif-trigger-btn" onClick={() => setShowNotifDropdown(!showNotifDropdown)}>
                                <Bell size={20} />
                                {unreadNotifications > 0 && <span className="notif-badge-dot"></span>}
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
                                                <div key={n.id} className={`notif-dropdown-item ${!n.is_read ? 'unread' : ''}`} onClick={() => { setShowNotifDropdown(false); navigate('/admin/notifications'); }}>
                                                    <div className="notif-item-content">
                                                        <span className="notif-item-title">{n.title}</span>
                                                        <span className="notif-item-msg">{n.message}</span>
                                                        <span className="notif-item-time">{new Date(n.created_at).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="notif-empty">No notifications yet</div>
                                        )}
                                    </div>
                                    <div className="notif-dropdown-footer">
                                        <button onClick={() => { setShowNotifDropdown(false); navigate('/admin/notifications'); }}>See All Updates</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>
                <p className="header-subtitle">System Overview & Management</p>

                {loading ? (
                    <div className="dashboard-loader-container">
                        <div className="premium-loader"></div>
                        <p>Loading premium dashboard...</p>
                    </div>
                ) : (
                    <div className="dashboard-content">
                        {/* Stats Section — Chart-Based Stat Cards */}
                        {analyticsData && (
                            <div className="stats-section">
                                {/* Revenue Card — PieChart donut matching Analytics */}
                                <div className="stat-card-v2 glass-card clickable" onClick={() => openDashAuditModal('revenue')} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                        <div className="stat-icon-wrapper green"><PhilippinePeso size={24} /></div>
                                        <div className="stat-info-v2" style={{ border: 'none' }}>
                                            <span className="stat-label-v2">Revenue (Month)</span>
                                            <h3 className="stat-value-v2">₱{Number(analyticsData.revenue?.total || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                                        </div>
                                    </div>
                                    {analyticsData.revenue?.breakdown?.length > 0 ? (
                                        <div style={{ width: '100%', height: 80, display: 'flex', alignItems: 'center' }}>
                                            <ResponsiveContainer width="50%" height="100%">
                                                <PieChart>
                                                    <Pie data={analyticsData.revenue.breakdown} cx="50%" cy="50%" innerRadius={14} outerRadius={30} paddingAngle={2} dataKey="value">
                                                        {analyticsData.revenue.breakdown.map((_, i) => <Cell key={i} fill={['#10b981', '#3b82f6', '#f59e0b', '#ec4899'][i % 4]} />)}
                                                    </Pie>
                                                    <Tooltip formatter={(v) => `₱${Number(v).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`} contentStyle={{ fontSize: '0.7rem', borderRadius: '8px' }} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                            <div style={{ fontSize: '0.65rem', color: '#64748b', lineHeight: 1.6, flex: 1 }}>
                                                {analyticsData.revenue.breakdown.map((b, i) => (
                                                    <div key={i}><span style={{ color: ['#10b981', '#3b82f6', '#f59e0b', '#ec4899'][i % 4], fontWeight: 700 }}>₱{Number(b.value).toLocaleString("en-PH", { minimumFractionDigits: 0 })}</span> {b.name}</div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ width: '100%', height: 80 }}>
                                            <ResponsiveContainer>
                                                <BarChart data={analyticsData.revenue.chart || []} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                                    <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                                                    <Tooltip formatter={(v) => `₱${Number(v).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`} contentStyle={{ fontSize: '0.75rem', borderRadius: '8px' }} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}
                                    <div className="stat-trend-v2" style={{ marginTop: '4px', color: '#64748b', fontSize: '0.75rem' }}>Click for source breakdown →</div>
                                </div>

                                {/* Appointments Card — Full Pie matching Analytics */}
                                <div className="stat-card-v2 glass-card clickable" onClick={() => openDashAuditModal('appointments')} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                        <div className="stat-icon-wrapper purple"><Calendar size={24} /></div>
                                        <div className="stat-info-v2" style={{ border: 'none' }}>
                                            <span className="stat-label-v2">Appointments</span>
                                            <h3 className="stat-value-v2">{analyticsData.appointments?.total || 0}</h3>
                                        </div>
                                    </div>
                                    <div style={{ width: '100%', height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {(analyticsData.appointments?.completed > 0 || analyticsData.appointments?.scheduled > 0 || analyticsData.appointments?.cancelled > 0) ? (
                                            <>
                                                <ResponsiveContainer width="50%" height="100%">
                                                    <PieChart>
                                                        <Pie data={[
                                                            { name: 'Completed', value: Number(analyticsData.appointments.completed) || 0 },
                                                            { name: 'Scheduled', value: Number(analyticsData.appointments.scheduled) || 0 },
                                                            { name: 'Cancelled', value: Number(analyticsData.appointments.cancelled) || 0 }
                                                        ].filter(d => d.value > 0)} cx="50%" cy="50%" outerRadius={30} paddingAngle={3} dataKey="value">
                                                            <Cell fill="#10b981" />
                                                            <Cell fill="#3b82f6" />
                                                            <Cell fill="#ef4444" />
                                                        </Pie>
                                                        <Tooltip contentStyle={{ fontSize: '0.7rem', borderRadius: '8px' }} />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                                <div style={{ fontSize: '0.65rem', color: '#64748b', lineHeight: 1.6 }}>
                                                    <div><span style={{ color: '#10b981', fontWeight: 700 }}>{analyticsData.appointments.completed}</span> completed</div>
                                                    <div><span style={{ color: '#3b82f6', fontWeight: 700 }}>{analyticsData.appointments.scheduled}</span> scheduled</div>
                                                    <div><span style={{ color: '#ef4444', fontWeight: 700 }}>{analyticsData.appointments.cancelled}</span> cancelled</div>
                                                </div>
                                            </>
                                        ) : (
                                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>No appointments yet</span>
                                        )}
                                    </div>
                                    <div className="stat-trend-v2" style={{ marginTop: '4px', color: '#64748b', fontSize: '0.75rem' }}>Click for status breakdown →</div>
                                </div>

                                {/* Users Card — Bar with XAxis labels matching Analytics */}
                                <div className="stat-card-v2 glass-card clickable" onClick={() => openDashAuditModal('users')} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                        <div className="stat-icon-wrapper blue"><Users size={24} /></div>
                                        <div className="stat-info-v2" style={{ border: 'none' }}>
                                            <span className="stat-label-v2">Total Users</span>
                                            <h3 className="stat-value-v2">{analyticsData.users?.total || 0}</h3>
                                        </div>
                                    </div>
                                    {analyticsData.users && (
                                        <div style={{ width: '100%', height: 80, display: 'flex', alignItems: 'center' }}>
                                            <ResponsiveContainer width="55%" height="100%">
                                                <BarChart data={[
                                                    { name: 'Customers', count: Number(analyticsData.users.customers) || 0 },
                                                    { name: 'Artists', count: Number(analyticsData.users.artists) || 0 },
                                                    { name: 'Admins', count: Number(analyticsData.users.admins) || 0 }
                                                ]} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                                        <Cell fill="#3b82f6" />
                                                        <Cell fill="#a855f7" />
                                                        <Cell fill="#f59e0b" />
                                                    </Bar>
                                                    <Tooltip contentStyle={{ fontSize: '0.7rem', borderRadius: '8px' }} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                            <div style={{ fontSize: '0.65rem', color: '#64748b', lineHeight: 1.6, flex: 1 }}>
                                                <div><span style={{ color: '#3b82f6', fontWeight: 700 }}>{analyticsData.users.customers || 0}</span> Customers</div>
                                                <div><span style={{ color: '#a855f7', fontWeight: 700 }}>{analyticsData.users.artists || 0}</span> Artists</div>
                                                <div><span style={{ color: '#f59e0b', fontWeight: 700 }}>{analyticsData.users.admins || 0}</span> Admins</div>
                                            </div>
                                        </div>
                                    )}
                                    <div className="stat-trend-v2" style={{ marginTop: '4px', color: '#64748b', fontSize: '0.75rem' }}>Click for user audit →</div>
                                </div>

                                {/* Active Artists Card */}
                                <div className="stat-card-v2 glass-card clickable" onClick={() => openDashAuditModal('artists')} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                        <div className="stat-icon-wrapper orange"><Palette size={24} /></div>
                                        <div className="stat-info-v2" style={{ border: 'none' }}>
                                            <span className="stat-label-v2">Active Artists</span>
                                            <h3 className="stat-value-v2">{analyticsData.artists?.length || 0}</h3>
                                        </div>
                                    </div>
                                    {analyticsData.artists?.length > 0 && (
                                        <div style={{ width: '100%', height: 80 }}>
                                            <ResponsiveContainer>
                                                <BarChart data={analyticsData.artists.slice(0, 5)} layout="vertical" margin={{ top: 0, right: 0, left: 40, bottom: 0 }}>
                                                    <Bar dataKey="revenue" radius={[0, 4, 4, 0]} barSize={10}>
                                                        {analyticsData.artists.slice(0, 5).map((_, i) => <Cell key={i} fill={['#f97316', '#a855f7', '#3b82f6', '#10b981', '#ec4899'][i % 5]} />)}
                                                    </Bar>
                                                    <Tooltip formatter={(v) => `₱${Number(v).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`} contentStyle={{ fontSize: '0.7rem', borderRadius: '8px' }} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}
                                    <div className="stat-trend-v2" style={{ marginTop: '4px', color: '#64748b', fontSize: '0.75rem' }}>Click for performance audit →</div>
                                </div>
                            </div>
                        )}

                        <div className="dashboard-layout-grid">
                            <div className="layout-column">
                                {/* Weekly Activity Chart */}
                                <div className="glass-card">
                                    <div className="card-header-v2">
                                        <div className="header-title">
                                            <BarChart3 size={20} />
                                            <h2>Weekly Appointments</h2>
                                        </div>
                                    </div>
                                    <div className="premium-chart">
                                        {chartData.map((item, index) => (
                                            <div key={index} className="modern-bar-group">
                                                <div className="bar-rail">
                                                    <div
                                                        className="bar-fill"
                                                        style={{ height: `${Math.min(item.count * 15, 100)}%` }}
                                                    >
                                                        <div className="bar-tooltip">{item.count}</div>
                                                    </div>
                                                </div>
                                                <span className="bar-label">{item.day}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="glass-card">
                                    <div className="card-header-v2">
                                        <div className="header-title">
                                            <Calendar size={20} />
                                            <h2>Appointments Overview</h2>
                                        </div>
                                        <div className="card-actions admin-st-bb81d8eb">
                                            <div className="filter-pill-group">
                                                <button
                                                    className={`filter-pill ${appointmentFilter === 'upcoming' ? 'active' : ''}`}
                                                    onClick={() => { setAppointmentFilter('upcoming'); setAppointmentPage(1); }}
                                                >Upcoming</button>
                                                <button
                                                    className={`filter-pill ${appointmentFilter === 'latest' ? 'active' : ''}`}
                                                    onClick={() => { setAppointmentFilter('latest'); setAppointmentPage(1); }}
                                                >Latest Added</button>
                                                <button
                                                    className={`filter-pill ${appointmentFilter === 'all' ? 'active' : ''}`}
                                                    onClick={() => { setAppointmentFilter('all'); setAppointmentPage(1); }}
                                                >All</button>
                                            </div>
                                            <div className="header-search admin-st-bea296a0">
                                                <Search size={14} />
                                                <input
                                                    type="text"
                                                    placeholder="Search..."
                                                    value={appointmentSearch}
                                                    onChange={(e) => { setAppointmentSearch(e.target.value); setAppointmentPage(1); }}
                                                    className="admin-st-fb2a7115"
                                                    maxLength={100}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="modern-table-wrapper">
                                        <table className="premium-table">
                                            <thead>
                                                <tr>
                                                    <th>Client</th>
                                                    <th>Staff</th>
                                                    <th>Service</th>
                                                    <th>Date</th>
                                                    <th>Status</th>
                                                    <th className="admin-st-7851dbc0">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {displayedAppointments.length > 0 ? displayedAppointments.map((appointment) => (
                                                    <tr key={appointment.id}>
                                                        <td>{appointment.client_name}</td>
                                                        <td>{appointment.artist_name}</td>
                                                        <td>
                                                            <span className="badge-v2 pending admin-st-606efc58">
                                                                {appointment.service_type || 'Tattoo Session'}
                                                            </span>
                                                        </td>
                                                        <td className="date-time-cell">
                                                            <div className="primary-date">{new Date(appointment.appointment_date).toLocaleDateString()}</div>
                                                            <div className="secondary-time">{appointment.start_time}</div>
                                                        </td>
                                                        <td>
                                                            <span className={`badge-v2 ${appointment.status.toLowerCase()}`}>
                                                                {appointment.status}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <div className="table-actions-v2">
                                                                {appointment.status === 'pending' && appointment.service_type?.toLowerCase() === 'consultation' && (
                                                                    <>
                                                                        <button className="icon-btn-v2 check" title="Approve" onClick={() => handleStatusUpdate(appointment.id, 'confirmed')}>
                                                                            <CheckCircle size={16} />
                                                                        </button>
                                                                        <button className="icon-btn-v2 cross" title="Reject" onClick={() => handleStatusUpdate(appointment.id, 'cancelled')}>
                                                                            <AlertTriangle size={16} />
                                                                        </button>
                                                                    </>
                                                                )}
                                                                <button
                                                                    className="icon-btn-v2"
                                                                    title="Details"
                                                                    onClick={() => { setSelectedAppointment(appointment); setIsDetailModalOpen(true); }}
                                                                >
                                                                    <FileText size={16} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )) : (
                                                    <tr><td colSpan="6" className="no-data admin-st-3927920f">No appointments found</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    {appointmentTotalPages > 1 && (
                                        <div className="card-footer-v2 admin-st-700e3e2e">
                                            <button
                                                className="icon-btn-v2"
                                                disabled={appointmentPage === 1}
                                                onClick={() => setAppointmentPage(p => p - 1)}
                                            ><ChevronLeft size={16} /></button>
                                            <span className="admin-st-c949b242">{appointmentPage} / {appointmentTotalPages}</span>
                                            <button
                                                className="icon-btn-v2"
                                                disabled={appointmentPage === appointmentTotalPages}
                                                onClick={() => setAppointmentPage(p => p + 1)}
                                            ><ChevronRight size={16} /></button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="layout-column">
                                {/* Artist Status */}
                                <div className="glass-card">
                                    <div className="card-header-v2">
                                        <div className="header-title">
                                            <Palette size={20} />
                                            <h2>Artist Status</h2>
                                        </div>
                                    </div>
                                    <div className="artist-occupancy-list">
                                        {artistStatus.length > 0 ? artistStatus.map(artist => (
                                            <div key={artist.id} className="occupancy-item">
                                                <div className="occupancy-info">
                                                    <div className={`occupancy-dot ${artist.status.toLowerCase() === 'available' ? 'available' : 'booked'}`}></div>
                                                    <span className="artist-name-v2">{artist.name}</span>
                                                </div>
                                                <span className={`occupancy-tag ${artist.status.toLowerCase() === 'available' ? 'available' : 'booked'}`}>
                                                    {artist.status}
                                                </span>
                                            </div>
                                        )) : <p className="no-data">No artists found</p>}
                                    </div>
                                </div>

                                {/* System Alerts */}
                                <div className="glass-card">
                                    <div className="card-header-v2">
                                        <div className="header-title">
                                            <Bell size={20} />
                                            <h2>System Alerts</h2>
                                        </div>
                                        <button className="view-all-btn admin-st-d3ffc78c" onClick={() => navigate('/admin/notifications')}>View All</button>
                                    </div>
                                    <div className="alerts-stack">
                                        {alerts.length > 0 ? alerts.map(alert => (
                                            <div key={alert.id} className={`priority-alert-item ${alert.severity}`}>
                                                <div className="alert-content-v2">
                                                    <span className="alert-type-v2">{alert.type}</span>
                                                    <p>{alert.message}</p>
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="all-clear">
                                                <CheckCircle size={32} />
                                                <p>All systems operational</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Today's Appointments */}
                                <div className="glass-card">
                                    <div className="card-header-v2">
                                        <div className="header-title">
                                            <Clock size={20} />
                                            <h2>Today's Schedule</h2>
                                        </div>
                                        <button className="view-all-btn admin-st-d3ffc78c" onClick={() => navigate('/admin/appointments')}>View All</button>
                                    </div>
                                    <div className="audit-stream">
                                        {todaysAppointments.length > 0 ? todaysAppointments.map(apt => (
                                            <div key={apt.id} className="audit-entry">
                                                <div className="entry-marker"></div>
                                                <div className="entry-content">
                                                    <div className="entry-time">{apt.start_time}</div>
                                                    <div className="entry-desc">
                                                        <strong>{apt.artist_name}</strong> session with {apt.client_name || 'Walk-in'}
                                                        <span className={`badge-v2 ${apt.status}`} style={{ marginLeft: '10px', fontSize: '0.7em', padding: '2px 6px' }}>{apt.status}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )) : <p className="no-data admin-st-eb108882" style={{ border: 'none', padding: '20px 0' }}>No appointments for today.</p>}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Standalone POS Launcher Wrapper */}
                        <div className="admin-st-pos-banner" style={{ marginTop: '28px', marginBottom: '28px' }}>
                            <div className="clickable" onClick={() => navigate('/admin/pos')} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '24px', padding: '28px', background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.95))', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderRadius: '20px', border: '1.5px solid rgba(59, 130, 246, 0.3)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)' }}>
                                <div style={{ background: 'rgba(59, 130, 246, 0.15)', borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                                    <ShoppingCart size={32} color="#3b82f6" />
                                </div>
                                <div style={{ textAlign: 'left', flex: 1 }}>
                                    <h2 style={{ margin: '0 0 6px', fontSize: '1.3rem', fontWeight: 700, fontFamily: "'Playfair Display', serif", color: '#ffffff' }}>Launch POS System</h2>
                                    <p style={{ margin: 0, color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.85rem' }}>Process walk-ins, merchandise, and retail inventory sales independently</p>
                                </div>
                                <button style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '12px 28px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem', flexShrink: 0 }} onClick={(e) => { e.stopPropagation(); navigate('/admin/pos'); }}>
                                    Launch Terminal
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ═══════════════ ANALYTICS AUDIT MODAL (shared) ═══════════════ */}
            <AnalyticsAuditModal
                auditModal={auditModal}
                onClose={closeDashAuditModal}
                analytics={analyticsData}
                expenseList={expenseList}
                expenseLoading={expenseLoading}
                expenseForm={expenseForm}
                setExpenseForm={setExpenseForm}
                onAddExpense={handleAddExpenseDash}
                onDeleteExpense={handleDeleteExpenseDash}
                onEditExpense={handleEditExpenseDash}
                formatDuration={formatDuration}
                darkMode={false}
            />

            {/* Appointment Detail Modal */}
            {isDetailModalOpen && selectedAppointment && (
                <div className="modal-overlay open" onClick={() => setIsDetailModalOpen(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="admin-flex-center admin-gap-15">
                                <div className="admin-st-c911153f">
                                    <Clock size={20} className="text-bronze" />
                                </div>
                                <div>
                                    <h2 className="admin-m-0">Session Intelligence</h2>
                                    <p className="admin-st-925e4e02">Appointment Ref: {getDisplayCode(selectedAppointment.booking_code || selectedAppointment.bookingCode, selectedAppointment.id)}</p>
                                </div>
                            </div>
                            <button className="close-btn" onClick={() => setIsDetailModalOpen(false)}>
                                <X size={24} />
                            </button>
                        </div>
                        <div className="modal-body admin-st-7cea880d">
                            <div className="admin-st-2f580e88">
                                <div className="detail-item admin-st-8edafd44">
                                    <span className="admin-st-2591d288">Client Entity</span>
                                    <span className="admin-st-c9f09bca">{selectedAppointment.client_name}</span>
                                </div>
                                <div className="detail-item admin-st-8edafd44">
                                    <span className="admin-st-2591d288">Assigned Professional</span>
                                    <span className="admin-st-c9f09bca">{selectedAppointment.artist_name}</span>
                                </div>
                                <div className="detail-item admin-st-8edafd44">
                                    <span className="admin-st-2591d288">Scheduled Date</span>
                                    <span className="admin-st-c9f09bca">{new Date(selectedAppointment.appointment_date).toLocaleDateString()}</span>
                                </div>
                                <div className="detail-item admin-st-8edafd44">
                                    <span className="admin-st-2591d288">Timeline (Start)</span>
                                    <span className="admin-st-c9f09bca">{selectedAppointment.start_time}</span>
                                </div>
                                <div className="detail-item admin-st-8edafd44">
                                    <span className="admin-st-2591d288">Status Lifecycle</span>
                                    <span className={`status-badge-v2 ${selectedAppointment.status.toLowerCase()}`}>
                                        {selectedAppointment.status}
                                    </span>
                                </div>
                                <div className="detail-item admin-st-8edafd44">
                                    <span className="admin-st-2591d288">Service Protocol</span>
                                    <span className="admin-st-c9f09bca">{selectedAppointment.service_type || 'Tattoo Session'}</span>
                                </div>
                                {selectedAppointment.notes && (
                                    <div className="detail-item admin-st-bb130abb">
                                        <span className="admin-st-2591d288">Operational Memo / Notes</span>
                                        <span className="admin-st-9aa3b024">
                                            {selectedAppointment.notes}
                                        </span>
                                    </div>
                                )}
                                <div className="detail-item admin-st-0ce7012c">
                                    <span className="admin-st-2591d288">Valuation (Total)</span>
                                    <span className="admin-st-362525e0">₱{Number(selectedAppointment.price || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                <div className="detail-item admin-st-1c711d5e">
                                    <span className="admin-st-e26908b3">Financial Clearance (Paid)</span>
                                    <span className="admin-st-da64dae6">
                                        ₱{Number(selectedAppointment.total_paid || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setIsDetailModalOpen(false)}>
                                Dismiss Details
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            {confirmModal.open && (
                <div className="modal-overlay open" onClick={() => setConfirmModal({ open: false, message: '', onConfirm: null })}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="admin-st-14fa8787">System Confirmation</h2>
                            <button className="close-btn" onClick={() => setConfirmModal({ open: false, message: '', onConfirm: null })}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body admin-st-06ff1ea3">
                            <div className="admin-st-969fbc7a">
                                <SlidersHorizontal size={24} className="admin-st-606a2b73" />
                            </div>
                            <p className="admin-st-9e8bc04b">{confirmModal.message}</p>
                        </div>
                        <div className="modal-footer admin-st-651c59bd">
                            <button
                                className="btn btn-secondary admin-st-49cdf874"
                                onClick={() => setConfirmModal({ open: false, message: '', onConfirm: null })}
                            >
                                Revert
                            </button>
                            <button
                                className="btn btn-primary admin-st-49cdf874"
                                onClick={() => {
                                    confirmModal.onConfirm?.();
                                    setConfirmModal({ open: false, message: '', onConfirm: null });
                                }}
                            >
                                Authorize
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminDashboard;
