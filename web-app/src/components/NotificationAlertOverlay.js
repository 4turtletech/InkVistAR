import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ArrowRight, X } from 'lucide-react';

/**
 * Global Notification Slide-in Alert
 * Shows the latest unread notification as a bottom-right toast for 10 seconds.
 */
function NotificationAlertOverlay() {
    const navigate = useNavigate();
    const [activeNotif, setActiveNotif] = useState(null);
    const [role, setRole] = useState(null);

    useEffect(() => {
        let timer;
        const handleNewNotification = (e) => {
            const { notif, role: userRole } = e.detail;
            if (!notif) return;

            // Check if we already showed this notification in this session
            const shownList = JSON.parse(sessionStorage.getItem('shownSlideNotifications') || '[]');
            if (shownList.includes(notif.id)) return;

            // Add to shown list
            shownList.push(notif.id);
            sessionStorage.setItem('shownSlideNotifications', JSON.stringify(shownList));

            setActiveNotif(notif);
            setRole(userRole);

            // Auto-hide after 10 seconds
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => {
                setActiveNotif(null);
            }, 10000);
        };

        window.addEventListener('latest-notification', handleNewNotification);
        return () => {
            window.removeEventListener('latest-notification', handleNewNotification);
            if (timer) clearTimeout(timer);
        };
    }, []);

    if (!activeNotif) return null;

    const handleClick = () => {
        if (role === 'admin') navigate('/admin/notifications');
        else if (role === 'artist') navigate('/artist/notifications');
        else if (role === 'customer') navigate('/customer/notifications');
        setActiveNotif(null);
    };

    return (
        <div style={{
            position: 'fixed', bottom: '80px', right: '20px', zIndex: 9999,
            background: '#fff', color: '#1e293b',
            borderRadius: '14px', padding: '16px', boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
            border: '1px solid #e2e8f0',
            display: 'flex', alignItems: 'flex-start', gap: '12px', width: '340px',
            animation: 'slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1)', cursor: 'pointer'
        }} onClick={handleClick}>
            <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '10px', display: 'flex', flexShrink: 0, border: '1px solid #e2e8f0' }}>
                <Bell size={20} color="#be9055" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '0.85rem', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {activeNotif.title || 'New Notification'}
                </p>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {activeNotif.message || ''}
                </p>
                <div style={{ marginTop: '8px', fontSize: '0.7rem', fontWeight: 600, color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    View details <ArrowRight size={12} />
                </div>
            </div>
            <button onClick={(e) => { e.stopPropagation(); setActiveNotif(null); }} style={{
                background: 'transparent', border: 'none', padding: '4px', cursor: 'pointer', color: '#94a3b8',
                display: 'flex', marginTop: '-4px', marginRight: '-4px'
            }}>
                <X size={16} />
            </button>
            <style>{`
                @keyframes slideInRight { from { opacity: 0; transform: translateX(100px); } to { opacity: 1; transform: translateX(0); } }
            `}</style>
        </div>
    );
}

export default NotificationAlertOverlay;
