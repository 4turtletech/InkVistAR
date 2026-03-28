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
    CheckCheck
} from 'lucide-react';
import CustomerSideNav from '../components/CustomerSideNav';
import './PortalStyles.css';
import { API_URL } from '../config';

function CustomerNotifications() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    

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

    const getNotificationStyle = (type) => {
        switch (type) {
            case 'appointment_confirmed': 
                return { icon: CalendarCheck, color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', label: 'Confirmed' };
            case 'appointment_cancelled': 
                return { icon: XCircle, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', label: 'Cancelled' };
            case 'appointment_completed':
                return { icon: CheckCircle, color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', label: 'Completed' };
            case 'payment_received':
                return { icon: Check, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', label: 'Payment' };
            case 'system':
                return { icon: Info, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)', label: 'System' };
            case 'pos_invoice':
                return { icon: Check, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', label: 'Invoice' };

            default:
                return { icon: Bell, color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.1)', label: 'Notification' };
        }
    };

    if (!customerId) return <div className="portal-layout"><CustomerSideNav /><div className="portal-container">Please login to view notifications</div></div>;

    return (
        <div className="portal-layout">
            <CustomerSideNav />
            <div className="portal-container customer-portal">
                <header className="portal-header">
                    <div className="header-title">
                        <h1>Updates & Alerts</h1>
                        <p className="header-subtitle">Stay informed about your tattoo journey</p>
                    </div>
                    <div className="header-actions">
                        <button className="premium-btn primary" onClick={markAllRead}>
                            <CheckCheck size={18} />
                            Mark All Read
                        </button>
                    </div>
                </header>

                <div className="portal-content">
                    {loading ? (
                        <div className="dashboard-loader-container">
                            <div className="premium-loader"></div>
                            <p>Fetching your updates...</p>
                        </div>
                    ) : (
                        <div className="glass-card full-width" style={{ padding: '0', overflow: 'hidden' }}>
                            {notifications.length > 0 ? (
                                <div className="notifications-stream">
                                    {notifications.map(n => {
                                        const style = getNotificationStyle(n.type);
                                        const Icon = style.icon;
                                        
                                        return (
                                            <div key={n.id} className={`notification-record ${n.is_read ? 'read' : 'unread'}`}>
                                                <div className="notif-id-marker"></div>
                                                <div className="notif-main">
                                                    <div className="notif-header">
                                                        <div className="notif-subject">
                                                            <div className="icon-badge" style={{ background: style.bg, padding: '8px', borderRadius: '8px' }}>
                                                                <Icon size={18} color={style.color}/>
                                                            </div>
                                                            <span className="subject-text">{n.title}</span>
                                                            {!n.is_read && <span className="unread-dot"></span>}
                                                        </div>
                                                        <span className="notif-time">
                                                            <Clock size={12}/> {new Date(n.created_at).toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <p className="notif-body">{n.message}</p>
                                                    <div className="notif-actions">
                                                        {!n.is_read && (
                                                            <button className="notif-btn ghost" onClick={() => markRead(n.id)}>
                                                                <Check size={14}/> Acknowledge
                                                            </button>
                                                        )}
                                                          {n.type === 'pos_invoice' && (
                                                            <a
                                                                href={`${API_URL}/api/invoices/${n.related_id}`}
                                                                target="_blank" // Open in new tab
                                                                rel="noopener noreferrer"
                                                                className="notif-btn primary"
                                                            >
                                                                View Invoice
                                                            </a>
                                                        )}
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
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default CustomerNotifications;
