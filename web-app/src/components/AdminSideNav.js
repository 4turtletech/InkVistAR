import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    LogOut,
    Users,
    Calendar,
    Package,
    BarChart3,
    Settings,
    Users2,
    ChevronLeft,
    ChevronRight,
    Menu,
    Building2,
    UserCircle,
    Receipt
} from 'lucide-react';
import '../styles/AdminSideNav.css';

function AdminSideNav() {
    const navigate = useNavigate();
    const [collapsed, setCollapsed] = useState(() => {
        const stored = localStorage.getItem('adminSidenavCollapsed');
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
        localStorage.setItem('adminSidenavCollapsed', next ? 'true' : 'false');
    };

    const quickActions = [
        {
            label: 'Dashboard',
            icon: LayoutDashboard,
            path: '/admin/dashboard',
            description: 'Overview'
        },
        {
            label: 'Users',
            icon: Users,
            path: '/admin/users',
            description: 'Manage all users'
        },
        {
            label: 'Clients',
            icon: UserCircle,
            path: '/admin/clients',
            description: 'Client profiles'
        },
        {
            label: 'Studio',
            icon: Building2,
            path: '/admin/studio',
            description: 'Manage branches'
        },
        {
            label: 'Appointments',
            icon: Calendar,
            path: '/admin/appointments',
            description: 'View appointments'
        },
        {
            label: 'Staff',
            icon: Users2,
            path: '/admin/staff',
            description: 'Manage staff'
        },
        {
            label: 'Inventory',
            icon: Package,
            path: '/admin/inventory',
            description: 'Manage inventory'
        },
        {
            label: 'Analytics',
            icon: BarChart3,
            path: '/admin/analytics',
            description: 'View reports'
        },
        {
            label: 'Billing',
            icon: Receipt,
            path: '/admin/billing',
            description: 'Payments & Invoices'
        },
        {
            label: 'Settings',
            icon: Settings,
            path: '/admin/settings',
            description: 'System settings'
        }
    ];

    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/login');
    };


    return (
        <aside className={`admin-sidenav ${collapsed ? 'collapsed' : ''}`}>
            <div className="sidenav-header">
                <h3>Admin Panel</h3>
                <button className="sidenav-toggle" onClick={toggleCollapsed} title={collapsed ? 'Expand' : 'Collapse'}>
                    {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                </button>
            </div>

            <nav className="sidenav-menu">
                    <div className="menu-section">
                        <p className="menu-label">Quick Actions</p>
                        <ul className="menu-list">
                            {quickActions.map((action, index) => {
                                const IconComponent = action.icon;
                                return (
                                    <li key={index}>
                                        <button
                                            className="menu-item"
                                            onClick={() => navigate(action.path)}
                                            title={action.description}
                                        >
                                            <IconComponent size={20} />
                                            <span className="menu-text">{action.label}</span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                
                    <div className="menu-section menu-section-bottom">
                        <button
                            className="menu-item logout-item"
                            onClick={handleLogout}
                            title="Logout"
                        >
                            <LogOut size={20} />
                            <span className="menu-text">Logout</span>
                        </button>
                    </div>
                </nav>
            </aside>
    );
}

export default AdminSideNav;
