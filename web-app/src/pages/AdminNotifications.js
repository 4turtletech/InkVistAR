import React, { useState, useEffect } from 'react';
import Axios from 'axios';
import {
    Bell,
    AlertTriangle,
    CheckCircle,
    Package,
    CalendarDays,
    CalendarCheck, // Added for appointment_confirmed
    XCircle, // Added for appointment_cancelled
    Settings,
    Clock,
    ArrowRight,
    Search,
    Filter,
    Check, // Keep Check for "Mark as Read"
    Trash2,
    CheckCheck,
    Info, // Added for system notifications
    RotateCcw, // Added for mark as unread
    Star, // Added for new reviews
    RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AdminSideNav from '../components/AdminSideNav';
import Pagination from '../components/Pagination';
import './AdminDashboard.css';
import './PortalStyles.css';
import './AdminStyles.css';
import { API_URL } from '../config';

function AdminNotifications() {
    const [notifications, setNotifications] = useState([]);
    const [systemAlerts, setSystemAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const unreadCount = notifications.filter(n => !n.is_read).length;
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('all'); // This is category type
    const [readStateFilter, setReadStateFilter] = useState('all'); // default to all
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [selectedNotification, setSelectedNotification] = useState(null);
    const [isRefreshingNotifs, setIsRefreshingNotifs] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        fetchNotifications();
        // Auto-poll every 30 seconds
        const interval = setInterval(() => {
            fetchNotifications();
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const user = JSON.parse(localStorage.getItem('user'));
            const adminId = user ? user.id : 1;

            const [notifsResponse, appointmentsResponse, inventoryResponse] = await Promise.all([
                Axios.get(`${API_URL}/api/notifications/${adminId}`), // Admin notifications
                Axios.get(`${API_URL}/api/admin/appointments`),
                Axios.get(`${API_URL}/api/admin/inventory?status=active`)
            ]);

            // Process Personal/Direct Notifications
            const directNotifs = notifsResponse.data.success ? notifsResponse.data.notifications : [];

            // Generate System-wide Alerts (Mirroring Dashboard logic for consistency)
            const alerts = [];

            // 1. Inventory Alerts
            if (inventoryResponse.data.success) {
                const lowStockItems = inventoryResponse.data.data.filter(item => item.current_stock <= item.min_stock);
                lowStockItems.forEach(item => {
                    alerts.push({
                        id: `inv-${item.id}`,
                        title: 'Inventory Alert',
                        message: `Low stock detected: ${item.name} (${item.current_stock} remaining).`,
                        type: 'inventory',
                        severity: 'high',
                        created_at: new Date().toISOString(),
                        is_read: false,
                        path: '/admin/inventory'
                    });
                });
            }

            // 2. Pending Appointments
            if (appointmentsResponse.data.success) {
                const pendingConsultations = appointmentsResponse.data.data.filter(apt => apt.status === 'pending' && apt.service_type === 'Consultation');
                if (pendingConsultations.length > 0) {
                    alerts.push({
                        id: 'apt-pending',
                        title: 'Pending Consultations',
                        message: `There ${pendingConsultations.length === 1 ? 'is' : 'are'} ${pendingConsultations.length} pending consultation${pendingConsultations.length === 1 ? '' : 's'} awaiting review.`,
                        type: 'appointment',
                        severity: 'medium',
                        created_at: new Date().toISOString(),
                        is_read: false,
                        path: '/admin/appointments'
                    });
                }
            }

            // Combine and sort
            const combined = [
                ...alerts,
                ...directNotifs.map(n => ({
                    ...n,
                    severity: n.type === 'system' ? 'medium' : 'low',
                    path: n.type === 'payment_success' ? '/admin/billing' : (n.type === 'new_review' ? '/admin/reviews' : undefined)
                }))
            ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            setNotifications(combined);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching notifications:", error);
            setLoading(false);
            setNotifications([]);
        }
    };

    const getNotificationStyle = (type) => {
        switch (type) {
            case 'inventory':
                return { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', label: 'Inventory' };
            case 'appointment':
                return { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)', label: 'Booking' };
            case 'system':
                return { color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)', label: 'System' };
            case 'appointment_confirmed':
                return { color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', label: 'Confirmed' };
            case 'appointment_cancelled':
                return { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', label: 'Cancelled' };
            case 'appointment_completed':
                return { color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', label: 'Completed' };
            case 'payment_success':
                return { color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', label: 'Payment' };
            case 'pos_invoice':
                return { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)', label: 'Invoice' };
            case 'new_review':
                return { color: '#daa520', bg: 'rgba(218, 165, 32, 0.1)', label: 'Review' };
            default:
                return { color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.1)', label: 'Update' };
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'inventory': return <Package size={20} className="text-orange" />;
            case 'appointment': return <CalendarDays size={20} className="text-blue" />;
            case 'system': return <Settings size={20} className="text-purple" />;
            case 'appointment_confirmed': return <CalendarCheck size={20} className="text-green" />;
            case 'appointment_cancelled': return <XCircle size={20} className="text-red" />;
            case 'appointment_completed': return <CheckCircle size={20} className="text-green" />;
            case 'payment_success': return <CheckCircle size={20} className="text-green" />;
            case 'pos_invoice': return <Info size={20} className="text-blue" />;
            case 'appointment_request': return <CalendarDays size={20} className="text-orange" />;
            case 'new_review': return <Star size={20} className="text-gold" />;
            default: return <Bell size={20} />;
        }
    };

    const markAsRead = async (id) => {
        if (id.toString().startsWith('inv-') || id === 'apt-pending') {
            // These are computed alerts, we just remove them from view for this session
            setNotifications(notifications.filter(n => n.id !== id));
            return;
        }
        try {
            await Axios.put(`${API_URL}/api/notifications/${id}/read`);
            setNotifications(prev => {
                const updated = prev.map(n => n.id === id ? { ...n, is_read: 1 } : n);
                return updated;
            });
        } catch (e) {
            console.error(e);
        }
    };

    const markAsUnread = async (id) => {
        // Computed alerts (inv- or apt-pending) don't have a backend state to mark as unread.
        // They are transient and are re-generated on page load if conditions are met.
        // For these, we will simply not perform any action.
        if (id.toString().startsWith('inv-') || id === 'apt-pending') {
            console.log(`Attempted to mark computed alert ${id} as unread. Not applicable as it's a client-side generated notification.`);
            return;
        }
        try {
            // The backend endpoint `/api/notifications/:id/read` supports a body with `is_read`.
            // Sending `is_read: 0` will mark it as unread.
            await Axios.put(`${API_URL}/api/notifications/${id}/read`, { is_read: 0 });
            setNotifications(prev => {
                const updated = prev.map(n => n.id === id ? { ...n, is_read: 0 } : n);
                return updated;
            });
        } catch (e) {
            console.error("Error marking notification as unread:", e);
            // Optionally, show a user-friendly error message
        }
    };

    const markAllRead = async () => {
        try {
            const unreadIds = notifications.filter(n => !n.is_read && !n.id.toString().startsWith('inv-') && n.id !== 'apt-pending').map(n => n.id);
            if (unreadIds.length > 0) {
                await Promise.all(unreadIds.map(id => Axios.put(`${API_URL}/api/notifications/${id}/read`)));
                setNotifications(notifications.map(n => ({ ...n, is_read: 1 })));
            }
        } catch (e) {
            console.error(e);
        }
    };

    const formatNotificationTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInDays = (now - date) / (1000 * 60 * 60 * 24);

        if (diffInDays < 7) {
            const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            if (date.toDateString() === now.toDateString()) {
                return time;
            }
            const day = date.toLocaleDateString([], { weekday: 'short' });
            return `${day} ${time}`;
        }
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    const filterButtonStyle = (isActive, type = 'default') => {
        if (!isActive) return { background: 'rgba(255,255,255,0.05)', color: '#be9055', border: '1px solid #cbd5e1' };

        // Distinguish Unread with a more urgent amber color
        const activeBg = type === 'unread' ? '#f59e0b' : '#daa520';
        return { background: activeBg, color: 'white', fontWeight: '600', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' };
    };


    const filteredNotifs = notifications.filter(n => {
        const matchesSearch = n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            n.message.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesTypeFilter = activeFilter === 'all' || n.type === activeFilter;
        const matchesReadFilter = readStateFilter === 'all' ? true : (readStateFilter === 'unread' ? !n.is_read : n.is_read);
        
        return matchesSearch && matchesTypeFilter && matchesReadFilter;
    });

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, activeFilter, readStateFilter]);

    const totalPages = Math.ceil(filteredNotifs.length / itemsPerPage);
    const currentItems = filteredNotifs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="portal-layout">
            <AdminSideNav />
            <div className="portal-container admin-portal">
                <header className="portal-header">
                    <div className="header-title">
                        <h1>Notification Center</h1>
                    </div>
                    <div className="header-actions">
                        <button
                            className="premium-btn secondary"
                            onClick={async () => {
                                setIsRefreshingNotifs(true);
                                await fetchNotifications();
                                setIsRefreshingNotifs(false);
                            }}
                            title="Refresh notifications"
                            style={{ marginRight: '10px' }}
                        >
                            <RefreshCw size={16} style={isRefreshingNotifs ? { animation: 'spin 1s linear infinite' } : {}} /> Refresh
                        </button>
                        <button
                            className="premium-btn primary"
                            onClick={markAllRead}
                            style={{ marginRight: '10px' }}
                        >
                            <CheckCheck size={18} /> Mark All Read
                        </button>
                        <button
                            className="premium-btn secondary"
                            onClick={async () => {
                                setNotifications(notifications.filter(n => !n.id.toString().startsWith('inv-') && n.id !== 'apt-pending'));
                            }}
                            title="Clear system alerts"
                        >
                            <Trash2 size={16} /> Clear Alerts
                        </button>
                    </div>
                </header>

                <p className="header-subtitle">System alerts and direct updates</p>

                <div className="portal-stats-row">
                    <div className="glass-card" style={{ flex: '1 1 200px', padding: '20px', textAlign: 'center' }}>
                        <span style={{ display: 'block', color: '#64748b', fontSize: '0.9rem', marginBottom: '8px' }}>Total Updates</span>
                        <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#1e293b' }}>{notifications.length}</span>
                    </div>
                    <div className="glass-card" style={{ flex: '1 1 200px', padding: '20px', textAlign: 'center' }}>
                        <span style={{ display: 'block', color: '#64748b', fontSize: '0.9rem', marginBottom: '8px' }}>Unread Alerts</span>
                        <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: unreadCount > 0 ? '#b7954e' : 'inherit' }}>{unreadCount}</span>
                    </div>
                </div>

                <div className="filter-bar">
                    <button
                        className={`filter-btn ${readStateFilter === 'all' ? 'active' : ''}`}
                        onClick={() => setReadStateFilter('all')}
                        style={filterButtonStyle(readStateFilter === 'all')}
                    >
                        All
                    </button>
                    <button
                        className={`filter-btn ${readStateFilter === 'unread' ? 'active' : ''}`}
                        onClick={() => setReadStateFilter('unread')}
                        style={filterButtonStyle(readStateFilter === 'unread', 'unread')}
                    >
                        Unread
                    </button>
                    <button
                        className={`filter-btn ${readStateFilter === 'read' ? 'active' : ''}`}
                        onClick={() => setReadStateFilter('read')}
                        style={filterButtonStyle(readStateFilter === 'read')}
                    >
                        Read
                    </button>
                </div>

                <div className="portal-content">
                    <div className="premium-filter-bar" style={{ marginBottom: '20px', display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <div className="premium-search-box premium-search-box--full" style={{ flex: '0 0 75%', margin: 0 }}>
                            <Search size={16} className="text-muted" />
                            <input
                                type="text"
                                placeholder="Search notifications..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="premium-filter-item" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                            <Filter size={16} style={{ color: '#64748b' }} />
                            <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: '600', whiteSpace: 'nowrap' }}>Type:</span>
                            <select
                                value={activeFilter}
                                onChange={(e) => setActiveFilter(e.target.value)}
                                className="premium-select-v2"
                                style={{ flex: 1, minWidth: 0 }}
                            >
                                <option value="all">All Notifications</option>
                                <option value="inventory">Inventory Alerts</option>
                                <option value="appointment">Booking Requests</option>
                                <option value="system">System Updates</option>
                            </select>
                        </div>
                    </div>

                    {loading ? (
                        <div className="dashboard-loader-container">
                            <div className="premium-loader"></div>
                            <p>Fetching alerts...</p>
                        </div>
                    ) : (
                        <div className="notifications-wrapper">
                            {currentItems.length > 0 ? (
                                <div className="notifications-stream">
                                    {currentItems.map((n) => {
                                        const Icon = getIcon(n.type);
                                        const style = getNotificationStyle(n.type);
                                        return (
                                            <div key={n.id} className={`glass-card notification-record ${n.is_read ? 'read' : 'unread'}`} style={{ padding: '12px 20px', cursor: 'pointer', position: 'relative' }} onClick={(e) => {
                                                if (!e.target.closest('.notif-actions')) {
                                                    setSelectedNotification(n);
                                                    if (!n.is_read && n.id && typeof n.id === 'number') markAsRead(n.id);
                                                }
                                            }}>
                                                <div className="notif-id-marker"></div>
                                                <div className="notif-main" style={{ display: 'flex', alignItems: 'center', gap: '20px', overflow: 'hidden' }}>
                                                    <div className="icon-badge" style={{ background: style.bg, padding: '6px', borderRadius: '6px', flexShrink: 0 }}>
                                                        {Icon}
                                                    </div>

                                                    <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                                                        <span className="subject-text" style={{ fontSize: '0.95rem', minWidth: '150px', color: n.is_read ? '#64748b' : '#1e293b', display: 'block' }}>{n.title}</span>
                                                        <p className="notif-body" style={{ margin: 0, fontSize: '0.9rem', color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.message}</p>
                                                    </div>

                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                                                        <span className="notif-time" style={{ fontSize: '0.75rem', color: '#94a3b8', minWidth: '80px', textAlign: 'right' }}>
                                                            {formatNotificationTime(n.created_at)}
                                                        </span>

                                                        <div className="notif-actions" style={{ display: 'flex', gap: '8px' }}>
                                                            {n.path && (
                                                                <button
                                                                    className="notif-btn primary"
                                                                    style={{ padding: '6px 12px', background: '#3b82f6', color: 'white', borderRadius: '6px', fontSize: '0.8rem', border: 'none', cursor: 'pointer', display: 'flex', gap: '4px', alignItems: 'center' }}
                                                                    onClick={() => navigate(n.path)}
                                                                >
                                                                    Take Action <ArrowRight size={14} />
                                                                </button>
                                                            )}
                                                            {!n.is_read ? (
                                                                <button className="notif-btn ghost" onClick={() => markAsRead(n.id)} title="Mark as Read" style={{ padding: '6px', background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                                                                    <Check size={14} />
                                                                </button>
                                                            ) : (
                                                                <button className="notif-btn ghost" onClick={() => markAsUnread(n.id)} title="Mark as Unread" style={{ padding: '6px', background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                                                                    <RotateCcw size={14} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="all-clear" style={{ padding: '40px', textAlign: 'center', color: '#10b981' }}>
                                    <CheckCircle size={48} color="#10b981" style={{ margin: '0 auto 16px' }} />
                                    <h3 style={{ margin: '0 0 8px 0', color: '#1e293b' }}>Notification Inbox Clear</h3>
                                    <p style={{ margin: 0, color: '#64748b' }}>You have addressed all system alerts and updates.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {!loading && filteredNotifs.length > 0 && (
                        <div style={{ marginTop: '20px' }}>
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={setCurrentPage}
                                itemsPerPage={itemsPerPage}
                                onItemsPerPageChange={(newVal) => {
                                    setItemsPerPage(newVal);
                                    setCurrentPage(1);
                                }}
                                totalItems={filteredNotifs.length}
                                unit="notifications"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Notification View Modal */}
            {selectedNotification && (
                <div className="modal-overlay open" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000 }} onClick={() => setSelectedNotification(null)}>
                    <div className="modal-content" style={{ background: 'white', borderRadius: '12px', width: '90%', maxWidth: '500px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header" style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ background: getNotificationStyle(selectedNotification.type).bg, padding: '8px', borderRadius: '8px' }}>
                                    {getIcon(selectedNotification.type)}
                                </div>
                                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#1e293b' }}>{selectedNotification.title}</h3>
                            </div>
                            <button className="close-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }} onClick={() => setSelectedNotification(null)}><XCircle size={24} /></button>
                        </div>
                        <div className="modal-body" style={{ padding: '20px', color: '#475569', lineHeight: '1.5' }}>
                            <p style={{ margin: 0 }}>{selectedNotification.message}</p>
                        </div>
                        <div className="modal-footer" style={{ padding: '20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Sent: {new Date(selectedNotification.created_at).toLocaleString()}</span>
                            <div className="notif-actions" style={{ display: 'flex', gap: '10px' }}>
                                {(selectedNotification.path || selectedNotification.related_id) && (
                                    <button className="btn btn-primary" style={{ padding: '8px 16px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', display: 'flex', gap: '6px', alignItems: 'center' }} onClick={() => {
                                        const link = selectedNotification.path || `/admin/appointments?appointment=${selectedNotification.related_id}`;
                                        navigate(link);
                                        setSelectedNotification(null);
                                    }}>Take Action <ArrowRight size={14} /></button>
                                )}
                                <button className="btn btn-secondary" style={{ padding: '8px 16px', background: 'white', border: '1px solid #e2e8f0', color: '#475569', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }} onClick={() => setSelectedNotification(null)}>Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
export default AdminNotifications;
