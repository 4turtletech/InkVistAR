import React, { useState, useEffect } from 'react';
import Axios from 'axios';
import { Bell, Check, CalendarPlus, XCircle, CheckCircle, Info, AlertTriangle, Clock } from 'lucide-react';
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
            const res = await Axios.get(`${API_URL}/api/notifications/${artistId}`);
            if (res.data.success) setNotifications(res.data.notifications);
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

    const getNotificationStyle = (type) => {
        switch (type) {
            case 'appointment_request': // New appointment assigned
                return { icon: CalendarPlus, color: '#4f46e5', bg: '#e0e7ff', label: 'New Request' };
            case 'appointment_confirmed': // Schedule change (confirmed)
                return { icon: CheckCircle, color: '#10b981', bg: '#d1fae5', label: 'Confirmed' };
            case 'appointment_cancelled': // Schedule change (cancelled)
                return { icon: XCircle, color: '#ef4444', bg: '#fee2e2', label: 'Cancelled' };
            case 'appointment_completed':
                return { icon: Check, color: '#059669', bg: '#d1fae5', label: 'Completed' };
            case 'system':
                return { icon: Info, color: '#3b82f6', bg: '#dbeafe', label: 'System' };
            default:
                return { icon: Bell, color: '#6b7280', bg: '#f3f4f6', label: 'Notification' };
        }
    };

    return (
        <div className="portal-layout">
            <ArtistSideNav />
            <div className="portal-container artist-portal">
                <header className="portal-header">
                    <h1>Notifications</h1>
                </header>
                <div className="portal-content">
                    {loading ? <div className="no-data">Loading...</div> : (
                        <div className="data-card">
                            {notifications.length > 0 ? (
                                <div className="notifications-list">
                                    {notifications.map(n => {
                                        const style = getNotificationStyle(n.type);
                                        const Icon = style.icon;
                                        
                                        return (
                                            <div key={n.id} className={`notification-item ${n.is_read ? 'read' : 'unread'}`} style={{
                                                padding: '20px', 
                                                borderBottom: '1px solid #eee', 
                                                display: 'flex', 
                                                justifyContent: 'space-between', 
                                                alignItems: 'flex-start', 
                                                backgroundColor: n.is_read ? 'transparent' : '#f8fafc',
                                                transition: 'background-color 0.2s'
                                            }}>
                                                <div style={{display: 'flex', gap: '15px'}}>
                                                    <div style={{background: style.bg, padding: '12px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                                                        <Icon size={24} color={style.color}/>
                                                    </div>
                                                    <div>
                                                        <h4 style={{margin: '0 0 5px 0', fontSize: '1rem', color: '#1e293b'}}>{n.title}</h4>
                                                        <p style={{margin: '0 0 8px 0', color: '#64748b', fontSize: '0.95rem', lineHeight: '1.4'}}>{n.message}</p>
                                                        <small style={{color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem'}}>
                                                            <Clock size={12}/> {new Date(n.created_at).toLocaleString()}
                                                        </small>
                                                    </div>
                                                </div>
                                                {!n.is_read && (
                                                    <button className="action-btn" onClick={() => markRead(n.id)} title="Mark as read" style={{background: 'transparent', border: '1px solid #e2e8f0', color: '#64748b', padding: '8px'}}>
                                                        <Check size={18}/>
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : <p className="no-data">No notifications</p>}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ArtistNotifications;