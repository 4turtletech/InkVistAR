import './CustomerStyles.css';
import React, { useState, useEffect, useRef } from 'react';
import Axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Calendar, Heart, Award, Users, Clock, LogOut, Plus, Bell, X, Package, RefreshCw, Sparkles, AlertTriangle, Droplets, Palette, PenTool, Gem, ArrowRight, Shield, MessageSquare } from 'lucide-react';
import './PortalStyles.css';
import CustomerSideNav from '../components/CustomerSideNav';
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
    const [activePrecare, setActivePrecare] = useState(null);
    const [showPreCareModal, setShowPreCareModal] = useState(false);
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
                    time: apt.start_time ? new Date(`1970-01-01T${apt.start_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '',
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
                // Capture pre-care data from dashboard response
                setActivePrecare(dashboardResponse.data.activePrecare || null);
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
                                    <div style={{ marginBottom: '24px', background: '#1a1416', color: '#fff', borderRadius: '16px', overflow: 'hidden', position: 'relative', border: '1px solid rgba(190,144,85,0.15)', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
                                        {/* Decorative glows - pointer-events:none so they don't block clicks */}
                                        <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '150px', height: '150px', background: 'radial-gradient(circle, rgba(190,144,85,0.15) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
                                        <div style={{ position: 'absolute', bottom: '-20px', left: '-20px', width: '100px', height: '100px', background: 'radial-gradient(circle, rgba(190,144,85,0.08) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
                                        
                                        {/* Header */}
                                        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(190,144,85,0.12)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 2 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <Sparkles size={18} color="#be9055" />
                                                <h2 style={{ color: '#e8d5b8', margin: 0, fontSize: '1rem', fontWeight: 700, letterSpacing: '-0.01em' }}>Healing Journey Tracker</h2>
                                            </div>
                                            <button onClick={() => navigate('/customer/aftercare')} style={{ 
                                                background: 'linear-gradient(135deg, #be9055, #a07840)', 
                                                color: '#fff', 
                                                border: 'none', 
                                                padding: '8px 18px', 
                                                borderRadius: '10px', 
                                                fontSize: '0.82rem', 
                                                fontWeight: 600, 
                                                cursor: 'pointer', 
                                                transition: 'all 0.25s ease',
                                                boxShadow: '0 4px 12px rgba(190,144,85,0.3)',
                                                position: 'relative',
                                                zIndex: 5
                                            }}>
                                                View Guide
                                            </button>
                                        </div>

                                        {/* Body */}
                                        <div style={{ padding: '20px', display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap', position: 'relative', zIndex: 2 }}>
                                            {/* Progress Ring */}
                                            <div style={{ position: 'relative', width: '90px', height: '90px', flexShrink: 0 }}>
                                                <svg width="90" height="90" viewBox="0 0 90 90" style={{ transform: 'rotate(-90deg)' }}>
                                                    <circle cx="45" cy="45" r="40" fill="none" stroke="rgba(190,144,85,0.12)" strokeWidth="6" />
                                                    <circle cx="45" cy="45" r="40" fill="none" stroke="#be9055" strokeWidth="6"
                                                        strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                                                        style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
                                                </svg>
                                                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                                    <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#be9055', lineHeight: 1 }}>{activeAftercare.currentDay}</span>
                                                    <span style={{ fontSize: '0.6rem', color: '#a08a6e', fontWeight: 600 }}>of {activeAftercare.totalDays}</span>
                                                </div>
                                            </div>

                                            <div style={{ flex: 1, minWidth: '180px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                                    <PhaseIcon size={14} color={phase.color} />
                                                    <span style={{ padding: '3px 10px', borderRadius: '16px', fontSize: '0.7rem', fontWeight: 700, background: `${phase.color}20`, color: phase.color, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                                        {phase.label}
                                                    </span>
                                                </div>
                                                <h3 style={{ fontSize: '1.05rem', margin: '0 0 6px 0', color: '#e8d5b8', fontFamily: "'Playfair Display', serif" }}>
                                                    {activeAftercare.designTitle}
                                                </h3>
                                                <p style={{ color: '#a08a6e', margin: 0, fontSize: '0.82rem', lineHeight: '1.5' }}>
                                                    {activeAftercare.todayMessage}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Pre-Care Conditioning Plan Banner (Tattoo sessions only) */}
                            {activePrecare && (() => {
                                const sessionDate = new Date(activePrecare.appointmentDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
                                return (
                                    <div
                                        onClick={() => setShowPreCareModal(true)}
                                        style={{
                                            marginBottom: '24px', background: '#12141a', color: '#fff', borderRadius: '16px',
                                            overflow: 'hidden', position: 'relative', cursor: 'pointer',
                                            border: '1px solid rgba(99,102,241,0.2)', boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                                            transition: 'all 0.3s ease'
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.2)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                                    >
                                        {/* Decorative glows */}
                                        <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '150px', height: '150px', background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
                                        <div style={{ position: 'absolute', bottom: '-20px', left: '-20px', width: '100px', height: '100px', background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

                                        {/* Header */}
                                        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(99,102,241,0.12)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 2 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <Shield size={18} color="#6366f1" />
                                                <h2 style={{ color: '#c7d2fe', margin: 0, fontSize: '1rem', fontWeight: 700, letterSpacing: '-0.01em' }}>Pre-Session Conditioning Plan</h2>
                                            </div>
                                            <span style={{
                                                background: 'rgba(99,102,241,0.15)', color: '#818cf8',
                                                padding: '5px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600
                                            }}>
                                                {activePrecare.daysUntil === 0 ? 'Today!' : activePrecare.daysUntil === 1 ? 'Tomorrow' : `${activePrecare.daysUntil} days away`}
                                            </span>
                                        </div>

                                        {/* Body */}
                                        <div style={{ padding: '18px 20px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', position: 'relative', zIndex: 2 }}>
                                            <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <Shield size={28} color="#6366f1" />
                                            </div>
                                            <div style={{ flex: 1, minWidth: '180px' }}>
                                                <h3 style={{ fontSize: '1rem', margin: '0 0 4px 0', color: '#e2e8f0', fontFamily: "'Playfair Display', serif" }}>
                                                    {activePrecare.designTitle}
                                                </h3>
                                                <p style={{ color: '#94a3b8', margin: '0 0 2px 0', fontSize: '0.82rem' }}>
                                                    with {activePrecare.artistName} · {sessionDate}
                                                </p>
                                                <p style={{ color: '#6366f1', margin: 0, fontSize: '0.78rem', fontWeight: 600 }}>
                                                    Tap to view your 6-step preparation guide →
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
                                <div className="modern-table-wrapper table-responsive">
                                    {appointments.length > 0 ? (
                                        <table className="premium-table mobile-card-table">
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
                                                        <td data-label="Artist">
                                                            <div className="client-cell">
                                                                <div className="avatar-placeholder">{apt.artist.charAt(0)}</div>
                                                                <span>{apt.artist}</span>
                                                            </div>
                                                        </td>
                                                        <td data-label="Service">{apt.service}</td>
                                                        <td data-label="Date & Time">
                                                            <div className="date-time-cell">
                                                                <div className="primary-date">{apt.date}</div>
                                                                <div className="secondary-time">{apt.time}</div>
                                                            </div>
                                                        </td>
                                                        <td data-label="Status"><span className={`status-badge-v2 ${apt.status.toLowerCase()}`}>{apt.status}</span></td>
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

                            {/* Tattoo Inspiration Banner */}
                            <div className="inspiration-banner">
                                <div className="inspiration-banner__glow inspiration-banner__glow--tr" />
                                <div className="inspiration-banner__glow inspiration-banner__glow--bl" />

                                <div className="inspiration-banner__content">
                                    <div className="inspiration-banner__header">
                                        <div className="inspiration-banner__title-group">
                                            <div className="inspiration-banner__accent-bar" />
                                            <h2 className="inspiration-banner__title">Tattoo Inspiration</h2>
                                        </div>
                                        <button className="inspiration-banner__browse-btn" onClick={() => navigate('/customer/gallery')}>
                                            Browse Gallery
                                        </button>
                                    </div>

                                    <div className="inspiration-banner__body">
                                        <div className="inspiration-banner__text">
                                            <h3 className="inspiration-banner__heading">
                                                Discover Your Next Piece
                                            </h3>
                                            <p className="inspiration-banner__desc">
                                                Browse our curated gallery of traditional, realism, and custom designs by our expert artists.
                                            </p>

                                            <div className="inspiration-banner__tags">
                                                {['Traditional', 'Realism', 'Blackwork', 'Neo-Trad', 'Watercolor'].map(s => (
                                                    <span key={s} className="inspiration-banner__tag">{s}</span>
                                                ))}
                                            </div>

                                            <button className="inspiration-banner__cta" onClick={() => navigate('/customer/gallery')}>
                                                Explore Designs <ArrowRight size={16} />
                                            </button>
                                        </div>

                                        <div className="inspiration-banner__grid">
                                            <div className="inspiration-banner__tile inspiration-banner__tile--gold" onClick={() => navigate('/customer/gallery')}>
                                                <Palette size={24} />
                                            </div>
                                            <div className="inspiration-banner__tile inspiration-banner__tile--purple" onClick={() => navigate('/customer/gallery')}>
                                                <Sparkles size={24} />
                                            </div>
                                            <div className="inspiration-banner__tile inspiration-banner__tile--green" onClick={() => navigate('/customer/gallery')}>
                                                <PenTool size={24} />
                                            </div>
                                            <div className="inspiration-banner__tile inspiration-banner__tile--blue" onClick={() => navigate('/customer/gallery')}>
                                                <Gem size={24} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Reports & Feedback — Quick Access Card */}
                            <div
                                className="action-card-v2 glass-card"
                                onClick={() => navigate('/customer/reports')}
                                style={{ marginTop: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px', padding: '20px 24px' }}
                            >
                                <div className="action-icon-wrapper" style={{ background: 'rgba(190,144,85,0.12)' }}>
                                    <MessageSquare size={22} color="#be9055" />
                                </div>
                                <div className="action-content-v2" style={{ flex: 1 }}>
                                    <span className="action-title-v2">Reports & Feedback</span>
                                    <span className="action-subtitle-v2">Submit bug reports or share your feedback</span>
                                </div>
                                <ArrowRight size={18} color="#94a3b8" />
                            </div>
                        </>
                    )}
                </div>
            </div>

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

            {/* Pre-Care Conditioning Plan Modal */}
            {showPreCareModal && activePrecare && (
                <div className="modal-overlay open" onClick={() => setShowPreCareModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', background: '#0f1117', border: '1px solid rgba(99,102,241,0.2)' }}>
                        <div className="modal-header" style={{ borderBottom: '1px solid rgba(99,102,241,0.15)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Shield size={20} color="#6366f1" />
                                <h3 style={{ margin: 0, color: '#c7d2fe' }}>Pre-Session Conditioning Plan</h3>
                            </div>
                            <button className="close-btn" onClick={() => setShowPreCareModal(false)}><X size={20} /></button>
                        </div>
                        <div className="modal-body" style={{ padding: '24px' }}>
                            {/* Session info */}
                            <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: '12px', padding: '16px', marginBottom: '20px', textAlign: 'center' }}>
                                <h4 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', color: '#e2e8f0', fontFamily: "'Playfair Display', serif" }}>{activePrecare.designTitle}</h4>
                                <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
                                    with {activePrecare.artistName} · {new Date(activePrecare.appointmentDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                                </p>
                                <span style={{ display: 'inline-block', marginTop: '8px', background: 'rgba(99,102,241,0.15)', color: '#818cf8', padding: '4px 14px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>
                                    {activePrecare.daysUntil === 0 ? 'Today!' : activePrecare.daysUntil === 1 ? 'Tomorrow' : `${activePrecare.daysUntil} days away`}
                                </span>
                            </div>

                            <p style={{ margin: '0 0 18px', fontSize: '0.9rem', color: '#94a3b8', lineHeight: '1.6', textAlign: 'center' }}>
                                Follow these <strong style={{ color: '#c7d2fe' }}>6 essential steps</strong> before your session for the best possible results.
                            </p>

                            {/* Pre-care steps */}
                            {[
                                { emoji: '1', title: 'Hydrate Thoroughly', desc: 'Drink plenty of water 24–48 hours before your session. Well-hydrated skin has better elasticity and holds ink more evenly.', color: '#3b82f6' },
                                { emoji: '2', title: 'Eat a Full Meal', desc: 'Have a balanced meal 1–2 hours before arriving. This keeps your blood sugar stable and helps you endure longer sessions.', color: '#10b981' },
                                { emoji: '3', title: 'Avoid Alcohol & Blood Thinners', desc: 'No alcohol for at least 24 hours prior. Also avoid ibuprofen and aspirin — they thin blood and increase bleeding during the session.', color: '#ef4444' },
                                { emoji: '4', title: 'Moisturize (But Not Day-Of)', desc: 'Keep the tattoo area moisturized daily leading up to your session, but do NOT apply lotion on the day of. Also, avoid sunburns at all costs!', color: '#f59e0b' },
                                { emoji: '5', title: 'Get a Good Night\'s Rest', desc: 'Aim for 7–8 hours of sleep the night before. Proper rest boosts your energy levels and improves pain tolerance.', color: '#8b5cf6' },
                                { emoji: '6', title: 'Wear Comfortable, Loose Clothing', desc: 'Choose clothes that provide easy access to the tattoo area. Loose fabrics prevent irritation on fresh ink afterward.', color: '#6366f1' }
                            ].map((step, idx) => (
                                <div key={idx} style={{
                                    display: 'flex', gap: '14px', padding: '14px',
                                    background: idx % 2 === 0 ? 'rgba(99,102,241,0.04)' : 'transparent',
                                    borderRadius: '10px', marginBottom: '4px', alignItems: 'flex-start'
                                }}>
                                    <div style={{
                                        width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
                                        background: `${step.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '1.2rem'
                                    }}>
                                        {step.emoji}
                                    </div>
                                    <div>
                                        <p style={{ margin: '0 0 4px', fontSize: '0.9rem', fontWeight: 700, color: '#e2e8f0' }}>{step.title}</p>
                                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8', lineHeight: '1.5' }}>{step.desc}</p>
                                    </div>
                                </div>
                            ))}

                            <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '10px', textAlign: 'center' }}>
                                <p style={{ margin: 0, fontSize: '0.82rem', color: '#6ee7b7' }}>
                                    Following these steps helps ensure <strong>better ink retention</strong>, <strong>less bleeding</strong>, and a <strong>smoother healing</strong> experience.
                                </p>
                            </div>
                        </div>
                        <div className="modal-footer" style={{ borderTop: '1px solid rgba(99,102,241,0.15)' }}>
                            <button className="btn btn-secondary" onClick={() => setShowPreCareModal(false)}>Got It!</button>
                            <button className="btn btn-primary" onClick={() => { setShowPreCareModal(false); navigate('/customer/bookings'); }}>View My Booking</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default CustomerPortal;
