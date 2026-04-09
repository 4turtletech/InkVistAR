import './CustomerStyles.css';
import React, { useState, useEffect } from 'react';
import Axios from 'axios';
import { 
    Bell, 
    Check, 
    CalendarCheck, 
    XCircle, 
    CheckCircle, 
    Info, 
    Clock,
    CheckCheck, 
    RotateCcw,
    Mail,
    Trash2,
    CalendarPlus
} from 'lucide-react';
import CustomerSideNav from '../components/CustomerSideNav';
import Pagination from '../components/Pagination';
import './PortalStyles.css';
import { API_URL } from '../config';

function CustomerNotifications() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('unread');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [selectedNotification, setSelectedNotification] = useState(null);
    

    const [user] = useState(() => {
        const saved = localStorage.getItem('user');
        return saved ? JSON.parse(saved) : null;
    });
    const customerId = user ? user.id : null;

    useEffect(() => {
        if (customerId) fetchNotifications();
    }, [customerId]);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const res = await Axios.get(`${API_URL}/api/notifications/${customerId}`);
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
                return { icon: CalendarPlus, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', label: 'Requested' };
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
                return { icon: CheckCircle, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)', label: 'Completed' };
            case 'payment_received':
                return { icon: Check, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', label: 'Payment' };
            case 'system':
                return { icon: Info, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)', label: 'System' };
            case 'pos_invoice':
                return { icon: Check, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', label: 'Invoice' };

            case 'aftercare_reminder':
                return { icon: Info, color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.1)', label: 'Aftercare' };
            case 'review_prompt':
                return { icon: CheckCheck, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', label: 'Review' };
            default:
                return { icon: Bell, color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.1)', label: 'Notification' };
        }
    };

    const filteredNotifs = notifications.filter(n => {
        if (activeFilter === 'unread') return !n.is_read;
        if (activeFilter === 'read') return n.is_read;
        return true;
    });

    const unreadCount = notifications.filter(n => !n.is_read).length;

    // Pagination logic
    const totalPages = Math.ceil(filteredNotifs.length / itemsPerPage);
    const currentItems = filteredNotifs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    if (!customerId) return <div className="portal-layout"><CustomerSideNav /><div className="portal-container">Please login to view notifications</div></div>;

    return (
        <div className="portal-layout">
            <CustomerSideNav />
            <div className="portal-container customer-portal customer-st-5f9aa399" >
                <header className="portal-header">
                    <div className="header-title">
                        <h1>Updates & Alerts</h1>
                    </div>
                    <div className="header-actions">
                        <button className="premium-btn primary" onClick={markAllRead}>
                            <CheckCheck size={18} />
                            Mark All Read
                        </button>
                    </div>
                </header>

                <p className="header-subtitle customer-st-a37b17a0" >Stay informed about your tattoo journey</p>

                <div className="portal-stats-row customer-st-9eeb7fb7" >
                    <div className="glass-card customer-st-7743f948" >
                        <span className="customer-st-dd32c518" >Total Updates</span>
                        <span className="customer-st-05fe7b62" >{notifications.length}</span>
                    </div>
                    <div className="glass-card" style={{ flex: '1 1 200px', padding: '20px', textAlign: 'center', borderLeft: unreadCount > 0 ? '4px solid #f59e0b' : 'none' }}>
                        <span className="customer-st-dd32c518" >Unread Alerts</span>
                        <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: unreadCount > 0 ? '#f59e0b' : 'inherit' }}>{unreadCount}</span>
                    </div>
                </div>

                <div className="filter-bar customer-st-35ad0876" >
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
                    {loading ? (
                        <div className="dashboard-loader-container">
                            <div className="premium-loader"></div>
                            <p>Fetching your updates...</p>
                        </div>
                    ) : (
                        <div className="notifications-wrapper customer-st-38951e22" >
                                {currentItems.length > 0 ? (
                                    <div className="notifications-stream customer-st-2bb70a3c" >
                                        {currentItems.map(n => {
                                            const style = getNotificationStyle(n.type);
                                            const Icon = style.icon;
                                            
                                            return (
                                                <div key={n.id} className={`glass-card notification-record ${n.is_read ? 'read' : 'unread'}`} style={{ padding: '12px 20px', borderLeft: !n.is_read ? `4px solid ${style.color}` : '1px solid rgba(255,255,255,0.1)', fontWeight: n.is_read ? 'normal' : '600', cursor: 'pointer' }} onClick={(e) => { 
                                                    if (!e.target.closest('.notif-actions')) {
                                                        setSelectedNotification({ ...n, style });
                                                        if (!n.is_read) markRead(n.id);
                                                    }
                                                }}>
                                                    <div className="notif-id-marker"></div>
                                                    <div className="notif-main customer-st-c060295c" >
                                                        <div className="icon-badge" style={{ background: style.bg, padding: '6px', borderRadius: '6px', flexShrink: 0 }}>
                                                            <Icon size={16} color={style.color}/>
                                                        </div>
                                                        
                                                        <div className="customer-st-3229fd12" >
                                                            <span className="subject-text" style={{ fontSize: '0.95rem', minWidth: '150px', color: n.is_read ? '#64748b' : '#1e293b' }}>{n.title}</span>
                                                            <p className="notif-body customer-st-bab5df7a" >{n.message}</p>
                                                        </div>

                                                        <div className="customer-st-7c19c2d3" >
                                                            <span className="notif-time customer-st-02404bb8" >
                                                                {formatNotificationTime(n.created_at)}
                                                            </span>
                                                            
                                                            <div className="notif-actions customer-st-4557600f" >
                                                                {!n.is_read ? (
                                                                    <button className="notif-btn ghost customer-st-1b8f69ba" onClick={() => markRead(n.id)} title="Mark as Read">
                                                                        <Check size={14}/>
                                                                    </button>
                                                                ) : (
                                                                    <button className="notif-btn ghost customer-st-1b8f69ba" onClick={() => markUnread(n.id)} title="Mark as Unread">
                                                                        <RotateCcw size={14}/>
                                                                    </button>
                                                                )}
                                                                {n.type === 'appointment_reminder' && (
                                                                    <a className="notif-btn primary customer-st-b615ccfe" href="/customer/bookings" >
                                                                        View Upcoming
                                                                    </a>
                                                                )}
                                                                {n.type === 'pos_invoice' && (
                                                                    <a className="notif-btn primary customer-st-be163e3f" href={`${API_URL}/api/invoices/${n.related_id}`} target="_blank" rel="noopener noreferrer" >
                                                                        Invoice
                                                                    </a>
                                                                )}
                                                                {n.type === 'aftercare_reminder' && (
                                                                    <a className="notif-btn primary customer-st-3d39e5b0" href="/customer/aftercare" >
                                                                        View Guide
                                                                    </a>
                                                                )}
                                                                {n.type === 'review_prompt' && (
                                                                    <a className="notif-btn primary customer-st-9bd8a3c8" href={`/customer/reviews/new?appointment=${n.related_id}`} >
                                                                        Leave Review
                                                                    </a>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="all-clear customer-st-3e3d331f" >
                                        <CheckCircle size={48} color="#10b981" />
                                        <h3>Everything Up to Date</h3>
                                        <p>You have no new notifications at this time.</p>
                                    </div>
                                )}

                                {filteredNotifs.length > itemsPerPage && (
                                    <div className="customer-st-842c3fb4" >
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
                <div className="modal-overlay customer-st-ec6d11c3" onClick={() => setSelectedNotification(null)} >
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="customer-st-18b79f09" >
                            <div className="customer-st-da70abb8" >
                                <div style={{ background: selectedNotification.style.bg, padding: '10px', borderRadius: '12px' }}>
                                    <selectedNotification.style.icon size={24} color={selectedNotification.style.color} />
                                </div>
                                <h3 className="customer-st-a047e906" >{selectedNotification.title}</h3>
                            </div>
                            <button className="close-btn customer-st-6df53034" onClick={() => setSelectedNotification(null)} ><XCircle size={24} /></button>
                        </div>
                        <div className="customer-st-49ffbede" >
                            <p className="customer-st-5454b175" >{selectedNotification.message}</p>
                        </div>
                        <div className="customer-st-23aef110" >
                            <span className="customer-st-97b91651" >Sent: {new Date(selectedNotification.created_at).toLocaleString()}</span>
                            <div className="notif-actions customer-st-7cead41b" >
                                {selectedNotification.related_id && selectedNotification.type !== 'pos_invoice' && selectedNotification.type !== 'review_prompt' && selectedNotification.type !== 'aftercare_reminder' && (
                                    <a className="notif-btn primary customer-st-be17fc86" href={`/customer/bookings?appointment=${selectedNotification.related_id}`} >Take Action</a>
                                )}
                                {selectedNotification.type === 'pos_invoice' && <a className="notif-btn primary customer-st-be17fc86" href={`${API_URL}/api/invoices/${selectedNotification.related_id}`} target="_blank" rel="noopener noreferrer" >View Invoice</a>}
                                {selectedNotification.type === 'aftercare_reminder' && <a className="notif-btn primary customer-st-b55afb9c" href="/customer/aftercare" >View Guide</a>}
                                {selectedNotification.type === 'review_prompt' && <a className="notif-btn primary customer-st-3f2429fc" href={`/customer/reviews/new?appointment=${selectedNotification.related_id}`} >Leave Review</a>}
                                <button className="notif-btn ghost customer-st-cb4a8d52" onClick={() => setSelectedNotification(null)} >Close</button>
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
    border: '1px solid rgba(255,255,255,0.1)',
    background: isActive ? '#daa520' : 'rgba(255,255,255,0.05)',
    color: isActive ? 'white' : '#64748b',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(10px)'
});

export default CustomerNotifications;
