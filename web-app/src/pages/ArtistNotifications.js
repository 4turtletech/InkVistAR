import React, { useState, useEffect } from 'react';
import Axios from 'axios';
import { 
    Bell, 
    Check, 
    CalendarPlus, 
    XCircle, 
    CheckCircle, 
    Info, 
    AlertTriangle, 
    Clock,
    CheckCheck
} from 'lucide-react';
import ArtistSideNav from '../components/ArtistSideNav';
import './PortalStyles.css';
import { API_URL } from '../config';

function ArtistNotifications() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [user] = useState(() => {
        const saved = localStorage.getItem('user');
        return saved ? JSON.parse(saved) : null;
    });
    const artistId = user ? user.id : 1;

    useEffect(() => {
        fetchNotifications();
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
            case 'appointment_request': 
                return { icon: CalendarPlus, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', label: 'New Request' };
            case 'appointment_confirmed': 
                return { icon: CheckCircle, color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', label: 'Confirmed' };
            case 'appointment_cancelled': 
                return { icon: XCircle, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', label: 'Cancelled' };
            case 'appointment_completed':
                return { icon: Check, color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', label: 'Completed' };
            case 'system':
                return { icon: Info, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)', label: 'System' };
            default:
                return { icon: Bell, color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.1)', label: 'Notification' };
        }
    };

    return (
        <div className="portal-layout">
            <ArtistSideNav />
            <div className="portal-container artist-portal">
                <header className="portal-header">
                    <div className="header-title">
                        <h1>Notification Center</h1>
                    </div>
                    <div className="header-actions">
                        <button className="premium-btn primary" onClick={markAllRead}>
                            <CheckCheck size={18} />
                            Mark All as Read
                        </button>
                    </div>
                </header>

                <p className="header-subtitle" style={{ marginTop: '-3.5rem', marginBottom: '2.5rem', marginRight: '-5.5rem', textAlign: 'left' }}>Stay updated with your latest sessions and requests</p>

                <div className="portal-content">
                    {loading ? (
                        <div className="dashboard-loader-container">
                            <div className="premium-loader"></div>
                            <p>Loading notifications...</p>
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
                                                                <Check size={14}/> Mark as Read
                                                            </button>
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
                                    <h3>Notification Inbox Clear</h3>
                                    <p>You have addressed all your updates.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ArtistNotifications;
