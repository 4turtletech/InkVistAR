import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Axios from 'axios';
import { 
    Bell, 
    Check, 
    CalendarPlus, 
    CalendarCheck,
    XCircle, 
    CheckCircle, 
    Info, 
    AlertTriangle, 
    Clock,
    CheckCheck,
    RotateCcw,
    RefreshCw,
    Search,
    Star,
    CreditCard,
    Mail,
    ShieldAlert
} from 'lucide-react';
import ArtistSideNav from '../components/ArtistSideNav';
import Pagination from '../components/Pagination';
import './PortalStyles.css';
import './ArtistStyles.css';
import { API_URL } from '../config';

function ArtistNotifications() {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [selectedNotification, setSelectedNotification] = useState(null);
    const [isRefreshingNotifs, setIsRefreshingNotifs] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [user] = useState(() => {
        const saved = localStorage.getItem('user');
        return saved ? JSON.parse(saved) : null;
    });
    const artistId = user ? user.id : 1;

    useEffect(() => {
        fetchNotifications();
        // Auto-poll every 30 seconds
        const interval = setInterval(() => {
            fetchNotifications();
        }, 30000);
        return () => clearInterval(interval);
    }, [artistId]);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const res = await Axios.get(`${API_URL}/api/notifications/${artistId}`);
            if (res.data.success) {
                setNotifications(res.data.notifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
            }
            setLoading(false);
        } catch (e) {
            console.error(e);
            setLoading(false);
        }
    };

    const markRead = async (id) => {
        try {
            await Axios.put(`${API_URL}/api/notifications/${id}/read`);
            setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: 1 } : n));
        } catch (e) {
            console.error(e);
        }
    };

    const markUnread = async (id) => {
        try {
            await Axios.put(`${API_URL}/api/notifications/${id}/read`, { is_read: 0 });
            setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: 0 } : n));
        } catch (e) {
            console.error(e);
        }
    };



    const markAllRead = async () => {
        try {
            const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
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

    const getNotificationStyle = (type) => {
        switch (type) {
            case 'appointment_request': 
                return { icon: CalendarPlus, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', label: 'New Request' };
            case 'appointment_rejected':
                return { icon: XCircle, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', label: 'Declined' };
            case 'appointment_rescheduled':
                return { icon: Clock, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', label: 'Rescheduled' };
            case 'appointment_reminder':
                return { icon: Clock, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)', label: 'Upcoming' };
            case 'appointment_confirmed': 
                return { icon: CalendarCheck, color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', label: 'Confirmed' };
            case 'appointment_cancelled': 
                return { icon: XCircle, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', label: 'Cancelled' };
            case 'appointment_completed':
                return { icon: CheckCircle, color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', label: 'Completed' };
            case 'payment_success':
            case 'payment_received':
                return { icon: CreditCard, color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', label: 'Payment' };
            case 'pos_invoice':
                return { icon: CreditCard, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)', label: 'Invoice' };
            case 'action_required':
                return { icon: AlertTriangle, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', label: 'Action Needed' };
            case 'new_review':
            case 'review_prompt':
                return { icon: Star, color: '#b7954e', bg: 'rgba(183, 149, 78, 0.1)', label: 'Review' };
            case 'email_change':
                return { icon: Mail, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)', label: 'Account' };
            case 'password_change':
                return { icon: ShieldAlert, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', label: 'Security' };
            case 'system':
                return { icon: Info, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)', label: 'System' };
            default:
                return { icon: Bell, color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.1)', label: 'Notification' };
        }
    };

    const filteredNotifs = notifications.filter(n => {
        const matchesSearch = !searchTerm || 
            n.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
            n.message.toLowerCase().includes(searchTerm.toLowerCase());
        if (activeFilter === 'unread') return !n.is_read && matchesSearch;
        if (activeFilter === 'read') return n.is_read && matchesSearch;
        return matchesSearch;
    });

    const unreadCount = notifications.filter(n => !n.is_read).length;

    const totalPages = Math.ceil(filteredNotifs.length / itemsPerPage);
    const currentItems = filteredNotifs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="portal-layout">
            <ArtistSideNav />
            <div className="portal-container artist-portal">
                <header className="portal-header">
                    <div className="header-title">
                        <h1>Notification Center</h1>
                    </div>
                    <div className="header-actions">
                        <button className="premium-btn secondary" onClick={async () => {
                            setIsRefreshingNotifs(true);
                            await fetchNotifications();
                            setIsRefreshingNotifs(false);
                        }} title="Refresh notifications" style={{ marginRight: '10px' }}>
                            <RefreshCw size={16} style={isRefreshingNotifs ? { animation: 'spin 1s linear infinite' } : {}} /> Refresh
                        </button>
                        <button className="premium-btn primary" onClick={markAllRead}>
                            <CheckCheck size={18} />
                            Mark All as Read
                        </button>
                    </div>
                </header>

                <p className="header-subtitle" style={{ marginTop: '-2rem', marginBottom: '2.5rem', marginRight: '-5.5rem', textAlign: 'left' }}>Stay updated with your latest sessions and requests</p>

                <div className="portal-stats-row" style={{ display: 'flex', gap: '20px', marginBottom: '25px' }}>
                    <div className="glass-card" style={{ flex: 1, padding: '20px', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.85rem', color: '#64748b', display: 'block', marginBottom: '5px' }}>Total Updates</span>
                        <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#1e293b' }}>{notifications.length}</span>
                    </div>
                    <div className="glass-card" style={{ flex: 1, padding: '20px', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.85rem', color: '#64748b', display: 'block', marginBottom: '5px' }}>Unread Alerts</span>
                        <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: unreadCount > 0 ? '#b7954e' : 'inherit' }}>{unreadCount}</span>
                    </div>
                </div>

                <div className="filter-bar" style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
                    <button 
                        className={`filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
                        onClick={() => setActiveFilter('all')}
                        style={filterButtonStyle(activeFilter === 'all')}
                    >
                        All
                    </button>
                    <button 
                        className={`filter-btn ${activeFilter === 'unread' ? 'active' : ''}`}
                        onClick={() => setActiveFilter('unread')}
                        style={filterButtonStyle(activeFilter === 'unread')}
                    >
                        Unread
                    </button>
                    <button 
                        className={`filter-btn ${activeFilter === 'read' ? 'active' : ''}`}
                        onClick={() => setActiveFilter('read')}
                        style={filterButtonStyle(activeFilter === 'read')}
                    >
                        Read
                    </button>
                </div>

                <div className="portal-content">
                    {/* Search Bar */}
                    <div className="premium-filter-bar" style={{ marginBottom: '20px', display: 'flex' }}>
                        <div className="premium-search-box premium-search-box--full" style={{ margin: 0, flex: 1, width: '100%' }}>
                            <Search size={16} className="text-muted" />
                            <input
                                type="text"
                                placeholder="Search notifications..."
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div className="dashboard-loader-container">
                            <div className="premium-loader"></div>
                            <p>Loading notifications...</p>
                        </div>
                    ) : (
                        <div className="full-width" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: '500px' }}>
                            {currentItems.length > 0 ? (
                                <div className="notifications-stream" style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                                    {currentItems.map(n => {
                                        const style = getNotificationStyle(n.type);
                                        const Icon = style.icon;
                                        
                                        return (
                                            <div key={n.id} className={`glass-card notification-record ${n.is_read ? 'read' : 'unread'}`} style={{ padding: '12px 20px', cursor: 'pointer', position: 'relative' }} onClick={(e) => { 
                                                if (!e.target.closest('.notif-actions')) {
                                                    if (!n.is_read) markRead(n.id);
                                                    // Deep-link: navigate to appointments and auto-open the relevant one
                                                    if (n.type === 'email_change' || n.type === 'password_change') {
                                                        navigate('/artist/profile');
                                                    } else if (n.related_id) {
                                                        navigate('/artist/appointments', { state: { openAppointmentId: n.related_id } });
                                                    } else {
                                                        setSelectedNotification({ ...n, style });
                                                    }
                                                }
                                            }}>
                                                <div className="notif-id-marker"></div>
                                                <div className="notif-main" style={{ display: 'flex', alignItems: 'center', gap: '20px', overflow: 'hidden' }}>
                                                    <div className="icon-badge" style={{ background: style.bg, padding: '6px', borderRadius: '6px', flexShrink: 0 }}>
                                                        <Icon size={20} color={style.color}/>
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
                                                            {n.type === 'appointment_reminder' && (
                                                                <a
                                                                    href="/artist/sessions"
                                                                    className="notif-btn primary"
                                                                    style={{ padding: '4px 10px', fontSize: '0.75rem', backgroundColor: '#3b82f6', textDecoration: 'none' }}
                                                                >
                                                                    My Sessions
                                                                </a>
                                                            )}
                                                            {!n.is_read ? (
                                                                <button className="notif-btn ghost" onClick={() => markRead(n.id)} style={{ padding: '4px' }} title="Mark as Read">
                                                                    <Check size={14}/>
                                                                </button>
                                                            ) : (
                                                                <button className="notif-btn ghost" onClick={() => markUnread(n.id)} style={{ padding: '4px' }} title="Mark as Unread">
                                                                    <RotateCcw size={14}/>
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
                                <div className="all-clear" style={{ padding: '100px 0' }}>
                                    <CheckCircle size={48} color="#10b981" />
                                    <h3>Everything Up to Date</h3>
                                    <p>You have no new notifications at this time.</p>
                                </div>
                            )}

                            {filteredNotifs.length > itemsPerPage && (
                                <div style={{ marginTop: '20px' }}>
                                    <Pagination 
                                        currentPage={currentPage}
                                        totalPages={totalPages}
                                        onPageChange={setCurrentPage}
                                        itemsPerPage={itemsPerPage}
                                        onItemsPerPageChange={setItemsPerPage}
                                        totalItems={filteredNotifs.length}
                                        unit="notifications"
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Notification View Modal */}
            {selectedNotification && (
                <div className="modal-overlay" onClick={() => setSelectedNotification(null)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ background: selectedNotification.style.bg, padding: '10px', borderRadius: '12px' }}>
                                    <selectedNotification.style.icon size={24} color={selectedNotification.style.color} />
                                </div>
                                <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.25rem' }}>{selectedNotification.title}</h3>
                            </div>
                            <button className="close-btn" onClick={() => setSelectedNotification(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><XCircle size={24} /></button>
                        </div>
                        <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                            <p style={{ margin: 0, color: '#334155', fontSize: '1rem', lineHeight: '1.6' }}>{selectedNotification.message}</p>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '15px' }}>
                            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Sent: {new Date(selectedNotification.created_at).toLocaleString()}</span>
                            <div className="notif-actions" style={{ display: 'flex', gap: '10px' }}>

                                {selectedNotification.related_id && (
                                    <button onClick={() => { setSelectedNotification(null); navigate('/artist/appointments', { state: { openAppointmentId: selectedNotification.related_id } }); }} className="notif-btn primary" style={{ textDecoration: 'none', padding: '6px 12px', fontSize: '0.85rem', backgroundColor: '#3b82f6', color: '#fff', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>View Appointment</button>
                                )}
                                <button className="notif-btn ghost" onClick={() => setSelectedNotification(null)} style={{ padding: '6px 12px', fontSize: '0.85rem', cursor: 'pointer', background: 'none', border: 'none', color: '#64748b' }}>Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const filterButtonStyle = (isActive) => ({
    padding: '8px 20px',
    borderRadius: '20px',
    border: isActive ? '1px solid rgba(255,255,255,0.1)' : '1px solid #cbd5e1',
    background: isActive ? '#daa520' : 'rgba(255,255,255,0.05)',
    color: isActive ? 'white' : '#64748b',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(10px)'
});

export default ArtistNotifications;
