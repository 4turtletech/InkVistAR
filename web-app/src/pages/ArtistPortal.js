import React, { useState, useEffect, useRef } from 'react';
import Axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Calendar, DollarSign, Users, BarChart3, Clock, LogOut, Bell, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import './PortalStyles.css';
import './ArtistStyles.css';
import ArtistSideNav from '../components/ArtistSideNav';
import { API_URL } from '../config';

function ArtistPortal() {
    const navigate = useNavigate();
    const [artist, setArtist] = useState({
        name: '',
        rating: 0,
        earnings: 0,
        appointments: 0,
        hourly_rate: 0
    });
    const [appointments, setAppointments] = useState([]);
    const [todaysAppointments, setTodaysAppointments] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showNotifDropdown, setShowNotifDropdown] = useState(false);
    const [isRefreshingNotifs, setIsRefreshingNotifs] = useState(false);
    const notifRef = useRef(null);

    const [user] = useState(() => {
        const saved = localStorage.getItem('user');
        return saved ? JSON.parse(saved) : null;
    });
    const artistId = user ? user.id : 1;

    useEffect(() => {
        fetchArtistData();
        fetchNotifications();
    }, [artistId]);

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
            const res = await Axios.get(`${API_URL}/api/notifications/${artistId}`);
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

    const fetchArtistData = async () => {
        try {
            setLoading(true);
            // Fetch artist dashboard data
            const dashboardResponse = await Axios.get(`${API_URL}/api/artist/dashboard/${artistId}`);
            if (dashboardResponse.data.success) {
                const { artist: artistData, stats } = dashboardResponse.data;
                setArtist({
                    ...artistData,
                    earnings: stats?.total_earnings || 0,
                    appointments: stats?.total_appointments || 0
                });
                setNotifications(dashboardResponse.data.notifications || []);
            }

            // Fetch artist appointments
            const appointmentsResponse = await Axios.get(`${API_URL}/api/artist/${artistId}/appointments`);
            if (appointmentsResponse.data.success) {
                const allAppointments = appointmentsResponse.data.appointments || [];
                setAppointments(allAppointments);

                // Filter today's appointments using local date instead of UTC
                const now = new Date();
                const today = now.getFullYear() + '-' +
                    String(now.getMonth() + 1).padStart(2, '0') + '-' +
                    String(now.getDate()).padStart(2, '0');
                const todayAppts = allAppointments.filter(apt => {
                    if (!apt.appointment_date) return false;
                    const d = new Date(apt.appointment_date);
                    const localAptDate = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
                    return localAptDate === today && apt.status !== 'cancelled';
                });
                setTodaysAppointments(todayAppts);
            }
            setLoading(false);
        } catch (error) {
            console.error("Error fetching artist data:", error);
            setLoading(false);
        }
    };

    return (
        <div className="portal-layout">
            <ArtistSideNav />
            <div className="portal-container artist-portal">
                <header className="portal-header">
                    <div className="header-title">
                        <h1>Artist Dashboard</h1>
                    </div>
                    <div className="artist-portal-header-actions">
                        <div className="artist-portal-notif-wrapper" ref={notifRef}>
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
                                                <div key={n.id} className={`notif-dropdown-item ${!n.is_read ? 'unread' : ''}`} onClick={() => { setShowNotifDropdown(false); navigate('/artist/notifications'); }}>
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
                                        <button onClick={() => { setShowNotifDropdown(false); navigate('/artist/notifications'); }}>See All Updates</button>
                                    </div>
                                </div>
                            )}
                        </div>
                        <button className="logout-btn artist-portal-logout" onClick={() => navigate('/login')}>
                            <LogOut size={20} />
                            Logout
                        </button>
                    </div>
                </header>

                <div className="portal-content">
                    {loading ? (
                        <div className="no-data">Loading artist data...</div>
                    ) : (
                        <>
                            {/* Stats Grid */}
                            <div className="stats-grid">
                                <div className="stat-card clickable artist-portal-clickable-card" onClick={() => navigate('/artist/earnings')} style={{ cursor: 'pointer' }}>
                                    <DollarSign className="stat-icon" size={32} />
                                    <div className="stat-info">
                                        <p className="stat-label">Total Earnings</p>
                                        <p className="stat-value">₱{Number(artist?.earnings || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                    </div>
                                </div>

                                <div className="stat-card clickable artist-portal-clickable-card" onClick={() => navigate('/artist/appointments')} style={{ cursor: 'pointer' }}>
                                    <Calendar className="stat-icon" size={32} />
                                    <div className="stat-info">
                                        <p className="stat-label">Appointments</p>
                                        <p className="stat-value">{artist?.appointments || 0}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="artist-portal-grid-layout">
                                <div className="data-card">
                                    <div className="artist-portal-section-header">
                                        <h2 className="artist-portal-section-title">Today's Schedule</h2>
                                        <button className="action-btn artist-portal-launch-btn" onClick={() => navigate('/artist/sessions')} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderRadius: '8px' }}>Launch Session View</button>
                                    </div>
                                    {todaysAppointments.length > 0 ? (
                                        <div className="table-responsive">
                                            <table className="portal-table">
                                                <thead>
                                                    <tr>
                                                        <th>Time</th>
                                                        <th>Client</th>
                                                        <th>Service</th>
                                                        <th>Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {todaysAppointments.map((apt) => (
                                                        <tr key={apt.id}>
                                                            <td>{apt.start_time}</td>
                                                            <td>{apt.client_name}</td>
                                                            <td>{apt.design_title}</td>
                                                            <td><span className={`status-badge ${apt.status.toLowerCase()}`}>{apt.status}</span></td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="artist-portal-no-data">
                                            <CheckCircle size={40} color="#10b981" style={{ marginBottom: '10px' }} />
                                            <p>No appointments scheduled for today.</p>
                                        </div>
                                    )}
                                </div>

                                {/* Notifications */}
                                <div className="data-card">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                                        <Bell size={20} />
                                        <h2 style={{ margin: 0, border: 'none', padding: 0 }}>Notifications</h2>
                                    </div>
                                    <div className="artist-portal-notif-list">
                                        {notifications.length > 0 ? notifications.map(notif => (
                                            <div key={notif.id} className="artist-portal-notif-item">
                                                <AlertCircle size={16} color="#6366f1" style={{ marginTop: '3px' }} />
                                                <div>
                                                    <p className="artist-portal-notif-item-title">{notif.title}</p>
                                                    <p className="artist-portal-notif-item-message">{notif.message}</p>
                                                </div>
                                            </div>
                                        )) : <p className="no-data">No new notifications</p>}
                                    </div>
                                </div>

                                {/* Recent Reviews Widget */}
                                <div className="data-card">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                                        <span style={{ fontSize: '20px' }}>⭐</span>
                                        <h2 style={{ margin: 0, border: 'none', padding: 0 }}>Recent Client Feedback</h2>
                                    </div>
                                    <div className="artist-portal-review-list" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                        <div style={{ padding: '15px', backgroundColor: '#f8fafc', borderRadius: '12px', borderLeft: '4px solid #f59e0b' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                                <span style={{ fontWeight: 600, color: '#1e293b' }}>Sarah Jenkins</span>
                                                <span style={{ color: '#f59e0b' }}>★★★★★</span>
                                            </div>
                                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b' }}>"Absolutely amazing attention to detail on my forearm sleeve. The session was practically painless!"</p>
                                        </div>
                                    </div>
                                    <button className="action-btn artist-portal-launch-btn" style={{ width: '100%', marginTop: '15px', padding: '10px', borderRadius: '8px', background: '#e2e8f0', color: '#1e293b' }} onClick={() => navigate('/artist/portfolio')}>
                                        Manage Portfolio & Reviews
                                    </button>
                                </div>
                            </div>

                            {/* Upcoming Appointments */}
                            <div className="data-card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                    <h2 style={{ margin: 0 }}>Upcoming Sessions</h2>
                                    <button className="action-btn artist-portal-launch-btn" onClick={() => navigate('/artist/appointments')} style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderRadius: '8px' }}>View Full Schedule</button>
                                </div>
                                <div className="table-responsive">
                                    {appointments.filter(apt => {
                                        if (!apt.appointment_date && !apt.date) return false;
                                        const d = new Date(apt.appointment_date || apt.date);
                                        const localAptDate = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
                                        const now = new Date();
                                        const today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
                                        return localAptDate >= today && apt.status !== 'cancelled';
                                    }).sort((a,b) => new Date(a.appointment_date || a.date) - new Date(b.appointment_date || b.date)).length > 0 ? (
                                        <table className="portal-table">
                                            <thead>
                                                <tr>
                                                    <th>Client</th>
                                                    <th>Date</th>
                                                    <th>Time</th>
                                                    <th>Status</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {appointments.filter(apt => {
                                                    if (!apt.appointment_date && !apt.date) return false;
                                                    const d = new Date(apt.appointment_date || apt.date);
                                                    const localAptDate = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
                                                    const now = new Date();
                                                    const today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
                                                    return localAptDate >= today && apt.status !== 'cancelled';
                                                }).sort((a,b) => new Date(a.appointment_date || a.date) - new Date(b.appointment_date || b.date)).slice(0, 5).map((apt) => (
                                                    <tr key={apt.id}>
                                                        <td>{apt.client_name || apt.client || 'N/A'}</td>
                                                        <td>{apt.appointment_date || apt.date || 'N/A'}</td>
                                                        <td>{apt.start_time || apt.appointment_time || apt.time || 'N/A'}</td>
                                                        <td><span className={`status-badge ${(apt.status || 'pending').toLowerCase()}`}>{apt.status || 'Pending'}</span></td>
                                                        <td>
                                                            <button className="action-btn" onClick={() => navigate('/artist/appointments')}>View</button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <p className="no-data">No upcoming appointments found</p>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                    <style jsx>{`
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
                        background: none; border: none; color: #daa520; font-weight: 600; font-size: 0.85rem; 
                        cursor: pointer; transition: color 0.2s; 
                    }
                    .notif-dropdown-footer button:hover { color: #b8860b; text-decoration: underline; }
                `}</style>
                </div>
            </div>
        </div>
    );
}

export default ArtistPortal;
