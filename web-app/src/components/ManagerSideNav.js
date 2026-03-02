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
    LogOut
} from 'lucide-react';
import '../styles/ManagerSideNav.css';

function ManagerSideNav() {
    const navigate = useNavigate();
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(() => {
        const stored = localStorage.getItem('managerSidenavCollapsed');
        return stored === 'true';
    });

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

    const menuItems = [
        { label: 'Dashboard', icon: LayoutDashboard, path: '/manager' },
        { label: 'Appointments', icon: Calendar, path: '/manager/appointments' },
        { label: 'Users', icon: Users, path: '/manager/users' },
        { label: 'Analytics', icon: LayoutDashboard, path: '/manager/analytics' },
        { label: 'Inventory', icon: Package, path: '/manager/inventory' },
        { label: 'Staff', icon: Users2, path: '/manager/staff' },
    ];

    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/login');
    };

    return (
        <aside className={`manager-sidenav ${collapsed ? 'collapsed' : ''}`}>
            <div className="sidenav-header">
                <span>Manager Portal</span>
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
                                        onClick={() => navigate(item.path)}
                                    >
                                        <Icon size={20} />
                                        <span className="menu-text">{item.label}</span>
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
    );
}

export default ManagerSideNav;