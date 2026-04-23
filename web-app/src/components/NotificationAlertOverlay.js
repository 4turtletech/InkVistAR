import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ArrowRight, X, MessageSquare } from 'lucide-react';

/**
 * Global Notification Slide-in Alert
 * Shows the latest unread notification as a top-right toast for 10 seconds,
 * then smoothly slides out before unmounting.
 */
function NotificationAlertOverlay() {
    const navigate = useNavigate();
    const [activeNotif, setActiveNotif] = useState(null);
    const [role, setRole] = useState(null);
    const [isExiting, setIsExiting] = useState(false);
    const timerRef = useRef(null);

    const dismissWithAnimation = () => {
        setIsExiting(true);
        setTimeout(() => {
            setActiveNotif(null);
            setIsExiting(false);
        }, 400); // matches slideOutRight duration
    };

    useEffect(() => {
        const handleNewNotification = (e) => {
            const { notif, role: userRole } = e.detail;
            if (!notif) return;

            // Check if we already showed this notification in this session
            const shownList = JSON.parse(sessionStorage.getItem('shownSlideNotifications') || '[]');
            if (shownList.includes(notif.id)) return;

            // Add to shown list
            shownList.push(notif.id);
            sessionStorage.setItem('shownSlideNotifications', JSON.stringify(shownList));

            // Cancel any previous exit/timer
            setIsExiting(false);
            if (timerRef.current) clearTimeout(timerRef.current);

            setActiveNotif(notif);
            setRole(userRole);

            // Auto-hide after 10 seconds with slide-out
            timerRef.current = setTimeout(() => {
                dismissWithAnimation();
            }, 10000);
        };

        window.addEventListener('latest-notification', handleNewNotification);
        return () => {
            window.removeEventListener('latest-notification', handleNewNotification);
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    if (!activeNotif) return null;

    const handleClick = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        if (role === 'admin') navigate('/admin/notifications');
        else if (role === 'artist') navigate('/artist/notifications');
        else if (role === 'customer') navigate('/customer/notifications');
        setActiveNotif(null);
        setIsExiting(false);
    };

    const isChatNotif = activeNotif.type === 'support_session' || (activeNotif.title || '').toLowerCase().includes('support live chat');

    const handleTakeAction = (e) => {
        e.stopPropagation();
        if (timerRef.current) clearTimeout(timerRef.current);
        navigate('/admin/chat');
        setActiveNotif(null);
        setIsExiting(false);
    };

    return (
        <div style={{
            position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
            background: '#fff', color: '#1e293b',
            borderRadius: '14px', padding: '16px', boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
            border: '1px solid #e2e8f0',
            display: 'flex', alignItems: 'flex-start', gap: '12px', width: '360px',
            animation: isExiting
                ? 'slideOutRight 0.4s cubic-bezier(0.55, 0.09, 0.68, 0.53) forwards'
                : 'slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            cursor: 'pointer'
        }} onClick={handleClick}>
            <div style={{
                background: isChatNotif ? '#eff6ff' : '#f8fafc',
                borderRadius: '10px', padding: '10px', display: 'flex', flexShrink: 0,
                border: `1px solid ${isChatNotif ? '#bfdbfe' : '#e2e8f0'}`
            }}>
                {isChatNotif
                    ? <MessageSquare size={20} color="#3b82f6" />
                    : <Bell size={20} color="#be9055" />
                }
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '0.85rem', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {activeNotif.title || 'New Notification'}
                </p>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {activeNotif.message || ''}
                </p>
                <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {isChatNotif && role === 'admin' && (
                        <button onClick={handleTakeAction} style={{
                            padding: '5px 12px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 700,
                            background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff',
                            border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                            transition: 'opacity 0.2s'
                        }}>
                            <MessageSquare size={11} /> Open Chat
                        </button>
                    )}
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        View details <ArrowRight size={12} />
                    </span>
                </div>
            </div>
            <button onClick={(e) => { e.stopPropagation(); if (timerRef.current) clearTimeout(timerRef.current); dismissWithAnimation(); }} style={{
                background: 'transparent', border: 'none', padding: '4px', cursor: 'pointer', color: '#94a3b8',
                display: 'flex', marginTop: '-4px', marginRight: '-4px'
            }}>
                <X size={16} />
            </button>
            <style>{`
                @keyframes slideInRight { from { opacity: 0; transform: translateX(100px); } to { opacity: 1; transform: translateX(0); } }
                @keyframes slideOutRight { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(100px); } }
            `}</style>
        </div>
    );
}

export default NotificationAlertOverlay;
