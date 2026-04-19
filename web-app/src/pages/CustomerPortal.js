import './CustomerStyles.css';
import React, { useState, useEffect, useRef } from 'react';
import Axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Calendar, Heart, Award, Users, Clock, LogOut, Plus, Bell, X, Package, RefreshCw, Sparkles, AlertTriangle, Droplets } from 'lucide-react';
import './PortalStyles.css';
import CustomerSideNav from '../components/CustomerSideNav';
import ChatWidget from '../components/ChatWidget';
import { API_URL } from '../config';

function CustomerPortal() {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const customerId = user ? user.id : null;

    const [customer, setCustomer] = useState({
        name: user.name || '',
        email: user.email || '',
        profile_image: user.profile_image || '',
        appointments: 0,
        favoriteArtists: 0,
        totalTattoos: 0,
        savedDesigns: 0
    });
    const [appointments, setAppointments] = useState([]);
    const [selectedApt, setSelectedApt] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [artists, setArtists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeAppointment, setActiveAppointment] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showNotifDropdown, setShowNotifDropdown] = useState(false);
    const [isRefreshingNotifs, setIsRefreshingNotifs] = useState(false);
    const [activeAftercare, setActiveAftercare] = useState(null);
    const notifRef = useRef(null);

    useEffect(() => {
        if (customerId) {
            fetchCustomerData();
            fetchNotifications();
        }
    }, [customerId]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (notifRef.current && !notifRef.current.contains(event.target)) {
                setShowNotifDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchNotifications = async () => {
        try {
            const res = await Axios.get(`${API_URL}/api/notifications/${customerId}`);
            if (res.data.success) {
                const sortedNotifs = res.data.notifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                setNotifications(sortedNotifs.slice(0, 5));
                setUnreadCount(sortedNotifs.filter(n => !n.is_read).length);
            }
        } catch (error) {
            console.error("Error fetching notifications:", error);
        }
    };

    const refreshNotifications = async () => {
        setIsRefreshingNotifs(true);
        await fetchNotifications();
        setIsRefreshingNotifs(false);
    };

    const fetchCustomerData = async () => {
        try {
            setLoading(true);

            // Fetch customer dashboard data
            const dashboardResponse = await Axios.get(`${API_URL}/api/customer/dashboard/${customerId}`);
            if (dashboardResponse.data.success) {
                const { customer: profile, stats, appointments: dashboardAppointments } = dashboardResponse.data;
                setCustomer({
                    ...profile,
                    appointments: stats?.upcoming || 0,
                    favoriteArtists: stats?.artists || 0,
                    totalTattoos: stats?.total_tattoos || 0,
                    savedDesigns: stats?.saved_designs || 0,
                });

                // Map appointments
                const mappedAppointments = dashboardAppointments.map(apt => ({
                    id: apt.id,
                    artist: apt.artist_name || 'Unknown',
                    service: apt.design_title || 'Tattoo',
                    date: new Date(apt.appointment_date).toLocaleDateString(),
                    time: apt.start_time,
                    status: apt.status.charAt(0).toUpperCase() + apt.status.slice(1),
                    price: apt.price || 0,
                    notes: apt.notes,
                    reference_image: apt.reference_image
                }));
                setAppointments(mappedAppointments);

                const now = new Date();
                const firstActiveAppointment = dashboardAppointments.find(apt => {
                    const appointmentDateTime = new Date(`${apt.appointment_date}T${apt.start_time}`);
                    return now >= appointmentDateTime;
                });
                setActiveAppointment(firstActiveAppointment);

                // Capture aftercare data from dashboard response
                setActiveAftercare(dashboardResponse.data.activeAftercare || null);
            }

            // Artist fetch removed as widget was replaced
            setLoading(false);
        } catch (error) {
            console.error("Error fetching customer data:", error);
            setLoading(false);
        }
    };

    return (
        <div className="portal-layout">
            <CustomerSideNav />
            <div className="portal-container customer-portal">
                <header className="portal-header">
                    <div className="header-title">
                        <h1>Customer Dashboard</h1>
                    </div>
                    <div className="header-actions customer-st-ab0e209e" >
                        <div className="notif-btn-wrapper customer-st-fb24e15a" ref={notifRef} >
                            <button className="notif-trigger-btn" onClick={() => setShowNotifDropdown(!showNotifDropdown)}>
                                <Bell size={22} />
                                {unreadCount > 0 && <span className="notif-badge-dot"></span>}
                            </button>
                            
                            {showNotifDropdown && (
                                <div className="notif-dropdown-v2 glass-card">
                                    <div className="notif-dropdown-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h3>Notifications</h3>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); refreshNotifications(); }}
                                            title="Refresh notifications"
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', transition: 'all 0.2s' }}
                                        >
                                            <RefreshCw size={16} style={isRefreshingNotifs ? { animation: 'spin 1s linear infinite' } : {}} />
                                        </button>
                                    </div>
                                    <div className="notif-dropdown-list">
                                        {notifications.length > 0 ? (
                                            notifications.map(n => (
                                                <div key={n.id} className={`notif-dropdown-item ${!n.is_read ? 'unread' : ''}`} onClick={() => { setShowNotifDropdown(false); navigate('/customer/notifications'); }}>
                                                    <div className="notif-item-content">
                                                        <span className="notif-item-title">{n.title}</span>
                                                        <span className="notif-item-msg">{n.message}</span>
                                                        <span className="notif-item-time">{new Date(n.created_at).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="notif-empty">No notifications yet</div>
                                        )}
                                    </div>
                                    <div className="notif-dropdown-footer">
                                        <button onClick={() => { setShowNotifDropdown(false); navigate('/customer/notifications'); }}>See All Updates</button>
                                    </div>
                                </div>
                            )}
                        </div>
                        {customer.profile_image && (
                            <div onClick={() => navigate('/customer/profile')} style={{
                                width: '40px', height: '40px', borderRadius: '50%',
                                overflow: 'hidden', border: '2px solid white',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)', cursor: 'pointer',
                                marginLeft: '10px'
                            }}>
                                <img className="customer-st-81466193" src={customer.profile_image} alt="Profile" />
                            </div>
                        )}
                    </div>
                </header>

                <p className="header-subtitle customer-st-5c2e40e1" >Welcome back, {customer.name || 'Inker'}!</p>

                <div className="portal-content">  
                    {loading ? (
                        <div className="dashboard-loader-container">
                            <div className="premium-loader"></div>
                            <p>Loading your profile...</p>
                        </div>
                    ) : (
                        <>
                            {/* Stats Grid */}
                            <div className="stats-grid">
                                <div className="stat-card-v2 customer-st-637517f0" onClick={() => navigate('/customer/bookings')} >
                                    <div className="stat-icon-wrapper blue">
                                        <Calendar size={24} />
                                    </div>
                                    <div className="stat-content">
                                        <span className="stat-label-v2">Upcoming Sessions</span>
                                        <h2 className="stat-value-v2">{customer.appointments}</h2>
                                    </div>
                                </div>

                                <div className="stat-card-v2 customer-st-637517f0" onClick={() => navigate('/customer/gallery', { state: { initialViewMode: 'Favorites' } })} >
                                    <div className="stat-icon-wrapper rose">
                                        <Heart size={24} />
                                    </div>
                                    <div className="stat-content">
                                        <span className="stat-label-v2">Saved Designs</span>
                                        <h2 className="stat-value-v2">{customer.savedDesigns}</h2>
                                    </div>
                                </div>

                                <div className="stat-card-v2 customer-st-637517f0" onClick={() => navigate('/customer/gallery', { state: { initialViewMode: 'My Tattoos' } })} >
                                    <div className="stat-icon-wrapper gold">
                                        <Award size={24} />
                                    </div>
                                    <div className="stat-content">
                                        <span className="stat-label-v2">My Tattoos</span>
                                        <h2 className="stat-value-v2">{customer.totalTattoos}</h2>
                                    </div>
                                </div>
                            </div>

                            {/* My Tattoo Journey & Aftercare Widget — Dynamic */}
                            {activeAftercare && (() => {
                                const progressPercent = (activeAftercare.currentDay / activeAftercare.totalDays) * 100;
                                const circumference = 2 * Math.PI * 40;
                                const strokeDashoffset = circumference - (progressPercent / 100) * circumference;
                                const phaseConfig = {
                                    initial: { label: 'Initial Healing', color: '#ef4444', icon: AlertTriangle },
                                    peeling: { label: 'Peeling & Itching', color: '#f59e0b', icon: Droplets },
                                    healing: { label: 'Final Healing', color: '#10b981', icon: Heart }
                                };
                                const phase = phaseConfig[activeAftercare.phase] || phaseConfig.healing;
                                const PhaseIcon = phase.icon;

                                return (
                                    <div className="data-card-v2" style={{ marginBottom: '24px', background: '#0f172a', color: '#fff', borderRadius: '16px', overflow: 'hidden', position: 'relative' }}>
                                        <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '150px', height: '150px', background: 'radial-gradient(circle, rgba(190,144,85,0.12) 0%, transparent 70%)', borderRadius: '50%' }} />
                                        <div className="card-header-v2" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <Sparkles size={18} color="#be9055" />
                                                <h2 style={{ color: '#fff', margin: 0, fontSize: '1rem', fontWeight: 700 }}>Healing Journey Tracker</h2>
                                            </div>
                                            <button onClick={() => navigate('/customer/aftercare')} style={{ background: 'rgba(190,144,85,0.15)', color: '#be9055', border: '1px solid rgba(190,144,85,0.3)', padding: '6px 14px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
                                                View Guide
                                            </button>
                                        </div>
                                        <div style={{ padding: '20px 0', display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
                                            {/* Progress Ring */}
                                            <div style={{ position: 'relative', width: '90px', height: '90px', flexShrink: 0 }}>
                                                <svg width="90" height="90" viewBox="0 0 90 90" style={{ transform: 'rotate(-90deg)' }}>
                                                    <circle cx="45" cy="45" r="40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
                                                    <circle cx="45" cy="45" r="40" fill="none" stroke="#be9055" strokeWidth="6"
                                                        strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                                                        style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
                                                </svg>
                                                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                                    <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#be9055', lineHeight: 1 }}>{activeAftercare.currentDay}</span>
                                                    <span style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 600 }}>of {activeAftercare.totalDays}</span>
                                                </div>
                                            </div>

                                            <div style={{ flex: 1, minWidth: '180px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                                    <PhaseIcon size={14} color={phase.color} />
                                                    <span style={{ padding: '3px 10px', borderRadius: '16px', fontSize: '0.7rem', fontWeight: 700, background: `${phase.color}20`, color: phase.color, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                                        {phase.label}
                                                    </span>
                                                </div>
                                                <h3 style={{ fontSize: '1.05rem', margin: '0 0 6px 0', color: '#fff', fontFamily: "'Playfair Display', serif" }}>
                                                    {activeAftercare.designTitle}
                                                </h3>
                                                <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.82rem', lineHeight: '1.5' }}>
                                                    {activeAftercare.todayMessage}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Upcoming Appointments */}
                            <div className="data-card-v2">
                                <div className="card-header-v2">
                                    <h2>Upcoming Sessions</h2>
                                    <button className="action-btn" onClick={() => navigate('/customer/bookings')}>Book New Session</button>
                                </div>
                                <div className="modern-table-wrapper">
                                    {appointments.length > 0 ? (
                                        <table className="premium-table">
                                            <thead>
                                                <tr>
                                                    <th>Artist</th>
                                                    <th>Service</th>
                                                    <th>Date & Time</th>
                                                    <th>Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {appointments.map((apt) => (
                                                    <tr className="customer-st-637517f0" key={apt.id} onClick={() => { setSelectedApt(apt); setIsModalOpen(true); }} >
                                                        <td>
                                                            <div className="client-cell">
                                                                <div className="avatar-placeholder">{apt.artist.charAt(0)}</div>
                                                                <span>{apt.artist}</span>
                                                            </div>
                                                        </td>
                                                        <td>{apt.service}</td>
                                                        <td>
                                                            <div className="date-time-cell">
                                                                <div className="primary-date">{apt.date}</div>
                                                                <div className="secondary-time">{apt.time}</div>
                                                            </div>
                                                        </td>
                                                        <td><span className={`status-badge-v2 ${apt.status.toLowerCase()}`}>{apt.status}</span></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <div className="empty-state-simple customer-st-28872d64" >
                                            <p>No upcoming appointments found.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="quick-actions-grid">
                                <button className="action-card-v2 glass-card" onClick={() => navigate('/customer/gallery', { state: { initialViewMode: 'Favorites' } })}>
                                    <div className="action-icon-wrapper blue">
                                        <Heart size={20} />
                                    </div>
                                    <div className="action-content-v2">
                                        <span className="action-title-v2">Saved Designs</span>
                                        <span className="action-subtitle-v2">Explore your inspirations</span>
                                    </div>
                                </button>

                                <button className="action-card-v2 glass-card" onClick={() => navigate('/customer/gallery', { state: { initialViewMode: 'My Tattoos' } })}>
                                    <div className="action-icon-wrapper gold">
                                        <Award size={20} />
                                    </div>
                                    <div className="action-content-v2">
                                        <span className="action-title-v2">My Tattoo History</span>
                                        <span className="action-subtitle-v2">View your completed works</span>
                                    </div>
                                </button>

                                <button className="action-card-v2 glass-card" onClick={() => navigate('/customer/bookings')}>
                                    <div className="action-icon-wrapper purple">
                                        <Calendar size={20} />
                                    </div>
                                    <div className="action-content-v2">
                                        <span className="action-title-v2">Schedule Session</span>
                                        <span className="action-subtitle-v2">Book your next masterpiece</span>
                                    </div>
                                </button>
                            </div>

                            {/* New styles for quick-actions-grid and action-card-v2 */}
                            <style jsx>{`
                            .quick-actions-grid {
                                display: grid;
                                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                                gap: 1.5rem; /* Spacing between cards */
                                margin-top: 2rem;
                            }
                            .action-card-v2 {
                                display: flex;
                                align-items: center;
                                padding: 1.25rem;
                                border-radius: 16px;
                                background: rgba(255, 255, 255, 0.05);
                                backdrop-filter: blur(10px);
                                border: 1px solid rgba(255, 255, 255, 0.1);
                                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                                cursor: pointer;
                                transition: all 0.3s ease;
                                text-align: left;
                                width: 100%;
                            }
                            .action-card-v2:hover {
                                transform: translateY(-5px);
                                box-shadow: 0 8px 12px rgba(0, 0, 0, 0.2);
                                border-color: #be9055;
                            }
                            .action-icon-wrapper {
                                width: 48px;
                                height: 48px;
                                border-radius: 12px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                margin-right: 1rem;
                                flex-shrink: 0;
                            }
                            .action-icon-wrapper.blue { background-color: rgba(59, 130, 246, 0.2); color: #3b82f6; }
                            .action-icon-wrapper.gold { background-color: rgba(218, 165, 32, 0.2); color: #be9055; }
                            .action-icon-wrapper.purple { background-color: rgba(139, 92, 246, 0.2); color: #8b5cf6; }
                            .action-content-v2 {
                                display: flex;
                                flex-direction: column;
                            }
                            .action-title-v2 {
                                font-size: 1.1rem;
                                font-weight: 600;
                                color: #0e0e0eff;
                                margin-bottom: 4px;
                            }
                            .action-subtitle-v2 {
                                font-size: 0.85rem;
                                color: #a0a0a0;
                            }
                            .notif-trigger-btn {
                                background: none;
                                border: none;
                                color: #64748b;
                                cursor: pointer;
                                padding: 8px;
                                border-radius: 50%;
                                transition: all 0.2s;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                            }
                            .notif-trigger-btn:hover { background: rgba(0,0,0,0.05); color: #1e293b; }
                            .notif-badge-dot {
                                position: absolute;
                                top: 5px;
                                right: 5px;
                                width: 10px;
                                height: 10px;
                                background-color: #ef4444;
                                border-radius: 50%;
                                border: 2px solid white;
                            }
                            .notif-dropdown-v2 {
                                position: absolute;
                                top: 100%;
                                right: 0;
                                width: 320px;
                                background: white;
                                border-radius: 12px;
                                box-shadow: 0 10px 25px rgba(0,0,0,0.1);
                                z-index: 1000;
                                margin-top: 10px;
                                border: 1px solid #e2e8f0;
                                animation: slideDown 0.2s ease-out;
                            }
                            @keyframes slideDown { 
                                from { opacity: 0; transform: translateY(-10px); } 
                                to { opacity: 1; transform: translateY(0); } 
                            }
                            .notif-dropdown-header { padding: 12px 16px; border-bottom: 1px solid #f1f5f9; }
                            .notif-dropdown-header h3 { margin: 0; font-size: 1rem; color: #1e293b; }
                            .notif-dropdown-list { max-height: 350px; overflow-y: auto; }
                            .notif-dropdown-item { padding: 12px 16px; border-bottom: 1px solid #f1f5f9; cursor: pointer; transition: background 0.2s; }
                            .notif-dropdown-item:hover { background: #f8fafc; }
                            .notif-dropdown-item.unread { background: #f0f9ff; }
                            .notif-item-content { display: flex; flex-direction: column; gap: 4px; }
                            .notif-item-title { font-weight: 600; font-size: 0.9rem; color: #1e293b; text-align: left; }
                            .notif-item-msg { font-size: 0.8rem; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: left; }
                            .notif-item-time { font-size: 0.7rem; color: #94a3b8; text-align: left; }
                            .notif-empty { padding: 30px; text-align: center; color: #94a3b8; font-size: 0.9rem; }
                            .notif-dropdown-footer { padding: 10px; border-top: 1px solid #f1f5f9; text-align: center; }
                            .notif-dropdown-footer button { 
                                background: none; border: none; color: #be9055; font-weight: 600; font-size: 0.85rem; 
                                cursor: pointer; transition: color 0.2s; 
                            }
                            .notif-dropdown-footer button:hover { color: #b8860b; text-decoration: underline; } /* This is a duplicate, but keeping for now */
                        `}</style>

                            {/* Tattoo Inspiration Banner — Premium */}
                            <div style={{ marginBottom: '24px', borderRadius: '20px', overflow: 'hidden', position: 'relative', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)', border: '1px solid rgba(190, 144, 85, 0.15)' }}>
                                {/* Decorative elements */}
                                <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(190,144,85,0.12) 0%, transparent 70%)', borderRadius: '50%' }} />
                                <div style={{ position: 'absolute', bottom: '-40px', left: '-40px', width: '150px', height: '150px', background: 'radial-gradient(circle, rgba(190,144,85,0.08) 0%, transparent 70%)', borderRadius: '50%' }} />
                                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(190,144,85,0.04) 0%, transparent 60%)', borderRadius: '50%' }} />

                                {/* Content */}
                                <div style={{ position: 'relative', zIndex: 1, padding: '32px 28px' }}>
                                    {/* Header row */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ width: '3px', height: '22px', background: 'linear-gradient(to bottom, #be9055, #d4a76a)', borderRadius: '2px' }} />
                                            <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#fff', letterSpacing: '0.3px' }}>Tattoo Inspiration</h2>
                                        </div>
                                        <button onClick={() => navigate('/customer/gallery')} style={{ background: 'rgba(190,144,85,0.1)', color: '#be9055', border: '1px solid rgba(190,144,85,0.25)', padding: '6px 16px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', letterSpacing: '0.2px' }}
                                            onMouseOver={e => { e.currentTarget.style.background = 'rgba(190,144,85,0.2)'; e.currentTarget.style.borderColor = 'rgba(190,144,85,0.4)'; }}
                                            onMouseOut={e => { e.currentTarget.style.background = 'rgba(190,144,85,0.1)'; e.currentTarget.style.borderColor = 'rgba(190,144,85,0.25)'; }}
                                        >
                                            Browse Gallery
                                        </button>
                                    </div>

                                    {/* Main content area */}
                                    <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
                                        {/* Left: Text content */}
                                        <div style={{ flex: 1, minWidth: '220px' }}>
                                            <h3 style={{ margin: '0 0 10px', color: '#be9055', fontSize: '1.4rem', fontFamily: "'Playfair Display', serif", fontWeight: 700, lineHeight: 1.3 }}>
                                                Discover Your<br />Next Piece
                                            </h3>
                                            <p style={{ margin: '0 0 18px', color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.6, maxWidth: '380px' }}>
                                                Browse our curated gallery of traditional, realism, and custom designs by our expert artists.
                                            </p>

                                            {/* Style tags */}
                                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
                                                {['Traditional', 'Realism', 'Blackwork', 'Neo-Trad', 'Watercolor'].map(style => (
                                                    <span key={style} style={{
                                                        padding: '5px 12px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 600,
                                                        background: 'rgba(255,255,255,0.04)', color: '#64748b',
                                                        border: '1px solid rgba(255,255,255,0.08)', letterSpacing: '0.3px'
                                                    }}>
                                                        {style}
                                                    </span>
                                                ))}
                                            </div>

                                            <button onClick={() => navigate('/customer/gallery')} style={{
                                                background: 'linear-gradient(135deg, #be9055 0%, #d4a76a 100%)', color: '#fff',
                                                border: 'none', padding: '11px 28px', borderRadius: '10px', fontSize: '0.85rem',
                                                fontWeight: 700, cursor: 'pointer', transition: 'all 0.3s',
                                                boxShadow: '0 4px 15px rgba(190, 144, 85, 0.25)', letterSpacing: '0.3px'
                                            }}
                                                onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(190, 144, 85, 0.35)'; }}
                                                onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(190, 144, 85, 0.25)'; }}
                                            >
                                                Explore Designs →
                                            </button>
                                        </div>

                                        {/* Right: Decorative preview grid */}
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', width: '160px', flexShrink: 0 }}>
                                            {[
                                                { bg: 'linear-gradient(135deg, rgba(190,144,85,0.2), rgba(190,144,85,0.05))', icon: '🎨' },
                                                { bg: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(139,92,246,0.03))', icon: '✨' },
                                                { bg: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.03))', icon: '🖋️' },
                                                { bg: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(59,130,246,0.03))', icon: '💎' }
                                            ].map((item, i) => (
                                                <div key={i} style={{
                                                    width: '72px', height: '72px', borderRadius: '14px',
                                                    background: item.bg, border: '1px solid rgba(255,255,255,0.05)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: '1.4rem', transition: 'transform 0.2s',
                                                    cursor: 'pointer'
                                                }}
                                                    onClick={() => navigate('/customer/gallery')}
                                                    onMouseOver={e => e.currentTarget.style.transform = 'scale(1.08)'}
                                                    onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                                                >
                                                    {item.icon}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
            {/* ChatWidget is always available, use activeAppointment.id if available as room, else null */}
            <ChatWidget
                room={activeAppointment ? activeAppointment.id : null}
                currentUser={`customer_${customerId}`}
            />

            {/* Appointment Details Modal */}
            {isModalOpen && selectedApt && (
                <div className="modal-overlay open" onClick={() => setIsModalOpen(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Session Details</h3>
                            <button className="close-btn" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="customer-st-5c49f804" >
                                <div className="customer-st-e8eceac8" >
                                    <label className="customer-st-3c5cf8dd" >Artist</label>
                                    <p className="customer-st-5d13f831" >{selectedApt.artist}</p>
                                </div>
                                <div className="customer-st-e8eceac8" >
                                    <label className="customer-st-3c5cf8dd" >Service</label>
                                    <p className="customer-st-5d13f831" >{selectedApt.service}</p>
                                </div>
                            </div>

                            <div className="customer-st-654b1414" >
                                <label className="customer-st-627edbaf" >Notes & Instructions</label>
                                <div className="customer-st-6f352cca" >
                                    <h4 className="customer-st-232eb362" >{selectedApt.service}</h4>
                                    <p className="customer-st-590a9062" >
                                        {selectedApt.notes || 'No specific notes provided for this session.'}
                                    </p>
                                    
                                    {selectedApt.reference_image && (
                                        <div className="customer-st-2dc9a8a0" >
                                            <p className="customer-st-af520488" >Reference Image</p>
                                            <div className="customer-st-e6f3b223" >
                                                <img className="customer-st-24a40422" src={selectedApt.reference_image} alt="Reference" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="billing-summary customer-st-aa822c5e" >
                                <div className="customer-st-f9ad4483" >
                                    <span className="customer-st-3cdb6192" >Status</span>
                                    <span className={`status-badge-v2 ${selectedApt.status.toLowerCase()}`}>{selectedApt.status}</span>
                                </div>
                                <div className="customer-st-f9ad4483" >
                                    <span className="customer-st-3cdb6192" >Scheduled For</span>
                                    <span className="customer-st-e7b1617c" >{selectedApt.date} at {selectedApt.time}</span>
                                </div>
                                {selectedApt.price > 0 && (
                                    <div className="customer-st-6edb6e51" >
                                        <span className="customer-st-d4f78aa8" >Estimated Cost</span>
                                        <span className="customer-st-8cb6763e" >₱{selectedApt.price.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Close</button>
                            <button className="btn btn-primary" onClick={() => { setIsModalOpen(false); navigate('/customer/bookings'); }}>Manage Bookings</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default CustomerPortal;
