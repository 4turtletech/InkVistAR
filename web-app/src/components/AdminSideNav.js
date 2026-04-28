import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Star,
    LayoutDashboard,
    LogOut,
    Users,
    Calendar,
    MessageSquare,
    Package,
    ShoppingCart,
    BarChart3,
    Settings,
    Users2,
    ChevronLeft,
    ChevronRight,
    Menu,
    Building2,
    UserCircle,
    Receipt,
    ChevronDown,
    ChevronUp,
    AppWindow,
    Bell
} from 'lucide-react';
import io from 'socket.io-client';
import Axios from 'axios';
import { API_URL, SOCKET_URL } from '../config';
import { playNotificationSound } from '../utils/notificationSound';
import ConfirmModal from './ConfirmModal';
import PaymentAlertOverlay from './PaymentAlertOverlay';
import NotificationAlertOverlay from './NotificationAlertOverlay';
import '../styles/AdminSideNav.css';

function AdminSideNav() {
    const navigate = useNavigate();
    const location = useLocation();
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(() => {
        const stored = localStorage.getItem('adminSidenavCollapsed');
        return stored === 'true';
    });
    const [userManagementOpen, setUserManagementOpen] = useState(() => {
        const stored = localStorage.getItem('userManagementOpen');
        return stored === 'true';
    });
    const [unreadChatCount, setUnreadChatCount] = useState(0);
    const [unreadNotifCount, setUnreadNotifCount] = useState(0);
    const [urgentPaymentCount, setUrgentPaymentCount] = useState(0);
    const prevPaymentCountRef = useRef(0);

    const adminUser = JSON.parse(localStorage.getItem('user') || 'null');
    const adminId = adminUser ? adminUser.id : null;

    useEffect(() => {
        if (collapsed) {
            document.body.classList.add('sidenav-collapsed');
        } else {
            document.body.classList.remove('sidenav-collapsed');
        }
        return () => document.body.classList.remove('sidenav-collapsed');
    }, [collapsed]);

    const toggleCollapsed = () => {
        const next = !collapsed;
        setCollapsed(next);
        // Automatically close dropdown when collapsing
        if (next) {
            setUserManagementOpen(false);
            localStorage.setItem('userManagementOpen', 'false');
        }
        localStorage.setItem('adminSidenavCollapsed', next ? 'true' : 'false');
    };

    // Socket.io for Real-time Chat Notifications
    useEffect(() => {
        const socket = io(SOCKET_URL);

        socket.on('connect', () => {
            socket.emit('join_admin_tracking');
        });

        socket.on('support_sessions_update', (sessions) => {
            // Count sessions where last message is not from admin
            // (Assuming 'Admin' is the sender name for all admins)
            const waiting = sessions.filter(s => s.lastMessage && s.messages.length > 0 && s.messages[s.messages.length - 1].sender !== 'System Admin').length;
            // Wait, the sender name in server.js for emergency login is 'System Admin'. 
            // Better to check if sender doesn't contain 'Admin' or 'Agent'.
            const waitingCount = sessions.filter(s => {
                const lastMsg = s.messages[s.messages.length - 1];
                return lastMsg && !lastMsg.sender.toLowerCase().includes('admin') && !lastMsg.sender.toLowerCase().includes('agent');
            }).length;

            setUnreadChatCount(waitingCount);
        });

        return () => socket.disconnect();
    }, []);

    // Fetch unread notification count with polling (10s, silent merge)
    useEffect(() => {
        if (!adminId) return;
        const fetchCount = async () => {
            try {
                const res = await Axios.get(`${API_URL}/api/notifications/${adminId}?limit=100`);
                if (res.data.success) {
                    setUnreadNotifCount(prev => {
                        const newCount = res.data.unreadCount || 0;
                        if (newCount > prev && prev !== undefined) {
                            playNotificationSound();
                        }
                        return newCount !== prev ? newCount : prev;
                    });
                    
                    if (res.data.notifications && res.data.notifications.length > 0) {
                        const latestUnread = res.data.notifications.find(n => !n.is_read);
                        if (latestUnread) {
                            window.dispatchEvent(new CustomEvent('latest-notification', { detail: { notif: latestUnread, role: 'admin' } }));
                        }
                    }
                }
            } catch (e) { /* silent */ }
        };
        fetchCount();
        const interval = setInterval(fetchCount, 10000);
        return () => clearInterval(interval);
    }, []);

    // Poll for urgent payment alerts (10s) — powers pulsing dot + global overlay
    useEffect(() => {
        if (!adminId) return;
        const fetchPaymentAlerts = async () => {
            try {
                const res = await Axios.get(`${API_URL}/api/admin/pending-payment-alerts`);
                if (res.data.success) {
                    const alerts = res.data.alerts || [];
                    const newCount = alerts.length;
                    setUrgentPaymentCount(prev => {
                        // Dispatch custom event when new alerts appear
                        if (newCount > prevPaymentCountRef.current) {
                            window.dispatchEvent(new CustomEvent('payment-alert', { detail: { alerts } }));
                        }
                        prevPaymentCountRef.current = newCount;
                        return newCount !== prev ? newCount : prev;
                    });
                    // Also dispatch on mount if alerts exist (for login scenario)
                    if (newCount > 0 && prevPaymentCountRef.current === 0) {
                        setTimeout(() => {
                            window.dispatchEvent(new CustomEvent('payment-alert', { detail: { alerts } }));
                        }, 500);
                    }
                }
            } catch (e) { /* silent */ }
        };
        fetchPaymentAlerts();
        const interval = setInterval(fetchPaymentAlerts, 10000);
        return () => clearInterval(interval);
    }, []);

    const toggleUserManagement = () => {
        // Fix: If collapsed, expand first before opening dropdown
        if (collapsed) {
            setCollapsed(false);
            localStorage.setItem('adminSidenavCollapsed', 'false');
        }
        const next = !userManagementOpen;
        setUserManagementOpen(next);
        localStorage.setItem('userManagementOpen', next ? 'true' : 'false');
    };

    const menuRef = useRef(null);

    useEffect(() => {
        const savedScroll = sessionStorage.getItem('adminSidebarScroll');
        if (savedScroll && menuRef.current) {
            menuRef.current.scrollTop = parseInt(savedScroll, 10);
        }
    }, [location.pathname]); // Restore on path change

    const handleMenuScroll = (e) => {
        sessionStorage.setItem('adminSidebarScroll', e.target.scrollTop);
    };

    const isActive = (path) => location.pathname === path;
    const isParentActive = (children) => children.some(child => location.pathname === child.path);

    const handleNavigate = (path) => {
        navigate(path);
        setMobileOpen(false);
    };

    const quickActions = [
        { label: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard', description: 'Overview' },
        { label: 'User Management', icon: Users, path: '/admin/users', description: 'Manage all users' },
        { label: 'Appointments', icon: Calendar, path: '/admin/appointments', description: 'View appointments' },
        { label: 'Chat', icon: MessageSquare, path: '/admin/chat', description: 'Chat with customers' },
        { label: 'Inventory', icon: Package, path: '/admin/inventory', description: 'Manage inventory' },
        { label: 'POS System', icon: ShoppingCart, path: '/admin/pos', description: 'Point of Sale' },
        { label: 'Analytics', icon: BarChart3, path: '/admin/analytics', description: 'View reports' },
        { label: 'Billing', icon: Receipt, path: '/admin/billing', description: 'Payments & Invoices' },

        { label: 'Studio', icon: Building2, path: '/admin/studio', description: 'Manage branches' },
        { label: 'Notifications', icon: Bell, path: '/admin/notifications', description: 'System alerts & updates' }
    ];

    const handleLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        navigate('/login');
    };

    return (
        <>
        <button className="mobile-menu-toggle" onClick={() => setMobileOpen(!mobileOpen)}>
            <Menu size={22} />
        </button>
        {mobileOpen && <div className="sidenav-overlay" onClick={() => setMobileOpen(false)} />}
        <aside className={`admin-sidenav ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
            <div className="sidenav-header">
                <div className="logo-container" onClick={() => navigate('/')} style={{ cursor: 'pointer', padding: '0 10px' }}>
                    {collapsed ? (
                        <img src="/images/logo.png" alt="InkVictus Icon" style={{ objectFit: 'contain', width: '100%', padding: '8px' }} />
                    ) : (
                        <img src="data:image/jpeg;base64,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" alt="InkVictus" style={{ objectFit: 'contain', width: '100%', padding: '8px 12px' }} />
                    )}
                </div>
                <button className="sidenav-toggle" onClick={toggleCollapsed} title={collapsed ? 'Expand' : 'Collapse'}>
                    {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                </button>
            </div>

            <nav className="sidenav-menu">
                <div className="menu-section" ref={menuRef} onScroll={handleMenuScroll}>
                    <p className="menu-label">Main Menu</p>
                    <ul className="menu-list">
                        {quickActions.map((action, index) => {
                            const IconComponent = action.icon;
                            const active = action.path ? isActive(action.path) : isParentActive(action.children || []);

                            if (action.isDropdown) {
                                return (
                                    <li key={index} className="dropdown-item">
                                        <button
                                            className={`menu-item dropdown-toggle ${userManagementOpen ? 'open' : ''} ${active ? 'parent-active' : ''}`}
                                            onClick={toggleUserManagement}
                                            title={action.label}
                                        >
                                            <IconComponent size={20} />
                                            <span className="menu-text">{action.label}</span>
                                            <span className="dropdown-arrow">
                                                {userManagementOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            </span>
                                        </button>
                                        {userManagementOpen && (
                                            <ul className="dropdown-menu">
                                                {action.children.map((child, childIndex) => {
                                                    const ChildIcon = child.icon;
                                                    const childActive = isActive(child.path);
                                                    return (
                                                        <li key={childIndex}>
                                                            <button
                                                                className={`menu-item dropdown-child ${childActive ? 'active' : ''}`}
                                                                onClick={() => handleNavigate(child.path)}
                                                                title={child.description}
                                                            >
                                                                <ChildIcon size={18} />
                                                                <span className="menu-text">{child.label}</span>
                                                            </button>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        )}
                                    </li>
                                );
                            }

                            return (
                                <li key={index}>
                                    <button
                                        className={`menu-item ${active ? 'active' : ''}`}
                                        onClick={() => handleNavigate(action.path)}
                                        title={action.description}
                                    >
                                        <IconComponent size={20} />
                                        <span className="menu-text">{action.label}</span>
                                        {action.label === 'Chat' && unreadChatCount > 0 && (
                                            <span className="notification-dot"></span>
                                        )}
                                        {action.label === 'Notifications' && unreadNotifCount > 0 && (
                                            <span className="notification-badge">{unreadNotifCount > 99 ? '99+' : unreadNotifCount}</span>
                                        )}
                                        {action.label === 'Notifications' && urgentPaymentCount > 0 && (
                                            <span className="urgent-pulse-dot" title={`${urgentPaymentCount} session(s) pending payment`}></span>
                                        )}
                                        {active && <div className="active-indicator" />}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </div>

                <div className="menu-section menu-section-bottom">
                    <button
                        className="menu-item logout-item"
                        onClick={() => setShowLogoutConfirm(true)}
                        title="Logout"
                    >
                        <LogOut size={20} />
                        <span className="menu-text">Logout</span>
                    </button>
                </div>
            </nav>

            <ConfirmModal
                isOpen={showLogoutConfirm}
                title="Confirm Logout"
                message="Are you sure you want to sign out of your account?"
                confirmText="Yes, Logout"
                cancelText="Cancel"
                type="logout"
                onConfirm={handleLogout}
                onClose={() => setShowLogoutConfirm(false)}
            />
        </aside>
        <PaymentAlertOverlay />
        <NotificationAlertOverlay />
        </>
    );
}

export default AdminSideNav;
