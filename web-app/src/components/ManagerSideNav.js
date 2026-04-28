import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    Image,
    Package,
    Calendar,
    CreditCard,
    Users2,
    ChevronLeft,
    ChevronRight,
    LogOut,
    Building2,
    Bell,
    Menu
} from 'lucide-react';
import Axios from 'axios';
import { API_URL } from '../config';
import { playNotificationSound } from '../utils/notificationSound';
import '../styles/ManagerSideNav.css';

function ManagerSideNav() {
    const navigate = useNavigate();
    const location = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(() => {
        const stored = localStorage.getItem('managerSidenavCollapsed');
        return stored === 'true';
    });
    const [unreadNotifCount, setUnreadNotifCount] = useState(0);

    const managerUser = JSON.parse(localStorage.getItem('user') || 'null');
    const managerId = managerUser ? managerUser.id : null;

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
        localStorage.setItem('managerSidenavCollapsed', next ? 'true' : 'false');
    };

    // Fetch unread notification count with polling
    useEffect(() => {
        if (!managerId) return;
        const fetchCount = async () => {
            try {
                const res = await Axios.get(`${API_URL}/api/notifications/${managerId}?limit=100`);
                if (res.data.success) {
                    const newCount = res.data.unreadCount || 0;
                    setUnreadNotifCount(prev => {
                        if (newCount > prev && prev !== undefined) {
                            playNotificationSound();
                        }
                        return newCount;
                    });
                }
            } catch (e) { /* silent */ }
        };
        fetchCount();
        const interval = setInterval(fetchCount, 30000);
        return () => clearInterval(interval);
    }, [managerId]);

    const menuItems = [
        { label: 'Dashboard', icon: LayoutDashboard, path: '/manager' },
        { label: 'Appointments', icon: Calendar, path: '/manager/appointments' },
        { label: 'Users', icon: Users, path: '/manager/users' },
        { label: 'Analytics', icon: LayoutDashboard, path: '/manager/analytics' },
        { label: 'Inventory', icon: Package, path: '/manager/inventory' },
        { label: 'Staff', icon: Users2, path: '/manager/staff' },
        { label: 'Notifications', icon: Bell, path: '/manager/notifications' },
    ];

    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/login');
    };

    const handleNavigate = (path) => {
        navigate(path);
        setMobileOpen(false);
    };

    return (
        <>
        <button className="mobile-menu-toggle" onClick={() => setMobileOpen(!mobileOpen)}>
            <Menu size={22} />
        </button>
        {mobileOpen && <div className="sidenav-overlay" onClick={() => setMobileOpen(false)} />}
        <aside className={`manager-sidenav ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
            <div className="sidenav-header">
                <div className="logo-container" onClick={() => navigate('/')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="logo-box" style={{ background: 'rgba(193, 154, 107, 0.1)', color: '#be9055', padding: '6px', borderRadius: '8px', display: 'flex' }}>
                        <Building2 size={24} />
                    </div>
                    <span className="logo-text" style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>InkVictus</span>
                </div>
                <button className="close-nav" onClick={toggleCollapsed}>
                    {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                </button>
            </div>

            <nav className="sidenav-menu">
                <div className="menu-section">
                    <p className="menu-label">Management</p>
                    <ul className="menu-list">
                        {menuItems.map((item, index) => {
                            const Icon = item.icon;
                            const isActive = location.pathname === item.path;
                            return (
                                <li key={index}>
                                    <button
                                        className={`menu-item ${isActive ? 'active' : ''}`}
                                        onClick={() => handleNavigate(item.path)}
                                    >
                                        <Icon size={20} />
                                        <span className="menu-text">{item.label}</span>
                                        {item.label === 'Notifications' && unreadNotifCount > 0 && (
                                            <span className="notification-badge">{unreadNotifCount > 99 ? '99+' : unreadNotifCount}</span>
                                        )}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </div>

                <div className="menu-section-bottom">
                    <button className="menu-item logout-item" onClick={handleLogout}>
                        <LogOut size={20} />
                        <span className="menu-text">Logout</span>
                    </button>
                </div>
            </nav>
        </aside>
        </>
    );
}

export default ManagerSideNav;