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
    const [readStateFilter, setReadStateFilter] = useState('unread'); // default to unread
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [selectedNotification, setSelectedNotification] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchNotifications();
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
                    path: n.type === 'payment_success' ? '/admin/billing' : undefined
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
        if (!isActive) return { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)' };

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
        <div className="admin-page-with-sidenav">
            <AdminSideNav />
            <div className="admin-page portal-container">
                <header className="portal-header">
                    <div className="header-title">
                        <h1>Notification Center</h1>
                    </div>
                    <div className="header-actions">
                        <button
                            className="premium-btn primary"
                            onClick={markAllRead}
                        >
                            <CheckCheck size={18} /> Mark All Read
                        </button>
                        <button
                            className="premium-btn secondary"
                            onClick={async () => {
                                // Clear computed alerts (Inventory/Bookings)
                                setNotifications(notifications.filter(n => !n.id.toString().startsWith('inv-') && n.id !== 'apt-pending'));
                            }}
                            title="Clear system alerts"
                        >
                            <Trash2 size={16} /> Clear Alerts
                        </button>
                    </div>
                </header>
                <p className="header-subtitle admin-st-a4f2a175">System alerts and direct updates</p>

                <div className="portal-stats-row admin-st-06856550">
                    <div className="glass-card admin-st-e257337a">
                        <span className="admin-st-24a5143d">Total Updates</span>
                        <span className="admin-st-780e31e0">{notifications.length}</span>
                    </div>
                    <div className="glass-card" style={{ flex: 1, padding: '20px', textAlign: 'center', borderLeft: unreadCount > 0 ? '4px solid #f59e0b' : 'none' }}>
                        <span className="admin-st-24a5143d">Unread Alerts</span>
                        <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: unreadCount > 0 ? '#f59e0b' : 'inherit' }}>{unreadCount}</span>
                    </div>
                </div>

                <div className="filter-bar admin-st-c9ea7af3">
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

                <main className="dashboard-main-content">
                    <div className="glass-card table-card-v2 full-width">
                        <div className="premium-filter-bar admin-st-64c9f606">
                            <div className="premium-search-box admin-st-90530afc">
                                <Search size={18} className="admin-st-80066d40" />
                                <input
                                    type="text"
                                    placeholder="Search notifications..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="admin-st-f6234f9f"
                                />
                            </div>

                            <div className="premium-filters-group">
                                <div className="admin-st-0d9f88e7">
                                    <Filter size={16} />
                                    <span>Type:</span>
                                </div>
                                <select
                                    value={activeFilter}
                                    onChange={(e) => setActiveFilter(e.target.value)}
                                    className="premium-select-v2 admin-st-15f46c68"
                                >
                                    <option value="all" className="admin-st-66e41284">All Notifications</option>
                                    <option value="inventory" className="admin-st-66e41284">Inventory Alerts</option>
                                    <option value="appointment" className="admin-st-66e41284">Booking Requests</option>
                                    <option value="system" className="admin-st-66e41284">System Updates</option>
                                </select>
                            </div>
                        </div>

                        {loading ? (
                            <div className="empty-state">
                                <div className="premium-loader"></div>
                                <p>Processing alert stream...</p>
                            </div>
                        ) : (
                            <div className="notifications-stream">
                                {currentItems.length > 0 ? (
                                    <div className="notifications-stream admin-st-15246701">
                                        {currentItems.map((n) => {
                                            const Icon = getIcon(n.type);
                                            const style = getNotificationStyle(n.type);
                                            return (
                                                <div key={n.id} className={`glass-card notification-record ${n.is_read ? 'read' : 'unread'}`} style={{ padding: '12px 20px', borderLeft: !n.is_read ? `4px solid ${style.color}` : '1px solid rgba(255,255,255,0.1)', fontWeight: n.is_read ? 'normal' : '600', cursor: 'pointer' }} onClick={(e) => {
                                                    if (!e.target.closest('.notif-actions')) {
                                                        setSelectedNotification(n);
                                                        if (!n.is_read && n.id && typeof n.id === 'number') markAsRead(n.id);
                                                    }
                                                }}>
                                                    <div className="notif-id-marker"></div>
                                                    <div className="notif-main admin-flex-center admin-gap-15">
                                                        <div className="icon-badge admin-st-9da56724" style={{ background: style.bg }}>
                                                            {Icon}
                                                        </div>

                                                        <div className="admin-st-44920c0e">
                                                            <span className="subject-text" style={{ fontSize: '0.95rem', minWidth: '150px', color: n.is_read ? '#64748b' : '#1e293b' }}>{n.title}</span>
                                                            <p className="notif-body admin-st-b9880071">{n.message}</p>
                                                        </div>

                                                        <div className="admin-st-991ea8ae">
                                                            <span className="notif-time admin-st-94741f99">
                                                                {formatNotificationTime(n.created_at)}
                                                            </span>

                                                            <div className="notif-actions admin-st-ade7e518">
                                                                {n.path && (
                                                                    <button
                                                                        className="notif-btn primary admin-st-397af07e"
                                                                        onClick={() => navigate(n.path)}
                                                                    >
                                                                        Take Action <ArrowRight size={16} />
                                                                    </button>
                                                                )}
                                                                {!n.is_read ? (
                                                                    <button className="notif-btn ghost admin-st-69ced960" onClick={() => markAsRead(n.id)} title="Mark as Read">
                                                                        <Check size={14} />
                                                                    </button>
                                                                ) : (
                                                                    <button className="notif-btn ghost admin-st-69ced960" onClick={() => markAsUnread(n.id)} title="Mark as Unread">
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
                                    <div className="all-clear admin-st-f933ea04">
                                        <CheckCircle size={48} color="#10b981" />
                                        <h3>Notification Inbox Clear</h3>
                                        <p>You have addressed all system alerts and updates.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {!loading && filteredNotifs.length > 0 && (
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
                        )}
                    </div>
                </main>
            </div>

            {/* Notification View Modal */}
            {selectedNotification && (
                <div className="modal-overlay open admin-st-e20839c6" onClick={() => setSelectedNotification(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header admin-st-0abc30a2">
                            <div className="admin-st-b0dbc89c">
                                <div className="admin-st-6e19c74b" style={{ background: getNotificationStyle(selectedNotification.type).bg }}>
                                    {getIcon(selectedNotification.type)}
                                </div>
                                <h3 className="admin-st-9840f93f">{selectedNotification.title}</h3>
                            </div>
                            <button className="close-btn admin-st-f32d59a5" onClick={() => setSelectedNotification(null)}><XCircle size={24} /></button>
                        </div>
                        <div className="modal-body admin-st-4085b14b">
                            <p className="admin-st-707f7391">{selectedNotification.message}</p>
                        </div>
                        <div className="modal-footer admin-st-16f41633">
                            <span className="admin-st-00ead0ce">Sent: {new Date(selectedNotification.created_at).toLocaleString()}</span>
                            <div className="notif-actions admin-flex-center admin-gap-10">
                                {(selectedNotification.path || selectedNotification.related_id) && (
                                    <button className="btn btn-primary admin-st-45ce59e0" onClick={() => {
                                        const link = selectedNotification.path || `/admin/appointments?appointment=${selectedNotification.related_id}`;
                                        navigate(link);
                                        setSelectedNotification(null);
                                    }}>Take Action <ArrowRight size={14} /></button>
                                )}
                                <button className="btn btn-secondary admin-st-d0455f69" onClick={() => setSelectedNotification(null)}>Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
export default AdminNotifications;
