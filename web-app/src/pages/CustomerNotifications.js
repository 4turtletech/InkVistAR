import './CustomerStyles.css';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Axios from 'axios';
import { 
    Bell, 
    Check, 
    CalendarCheck, 
    XCircle, 
    CheckCircle, 
    Info, 
    Clock,
    CheckCheck, 
    RotateCcw,
    Mail,
    Trash2,
    CalendarPlus,
    Droplets,
    Sun,
    Activity,
    ShieldAlert,
    RefreshCw,
    Search,
    Star,
    CreditCard
} from 'lucide-react';
import CustomerSideNav from '../components/CustomerSideNav';
import Pagination from '../components/Pagination';
import './PortalStyles.css';
import { API_URL } from '../config';

function CustomerNotifications() {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [selectedNotification, setSelectedNotification] = useState(null);
    const [isAftercareModalOpen, setIsAftercareModalOpen] = useState(false);
    const [reviewedAppointments, setReviewedAppointments] = useState(new Set());
    const [isRefreshingNotifs, setIsRefreshingNotifs] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [user] = useState(() => {
        const saved = localStorage.getItem('user');
        return saved ? JSON.parse(saved) : null;
    });
    const customerId = user ? user.id : null;

    useEffect(() => {
        if (customerId) fetchNotifications(true);
        // Auto-poll every 10 seconds (subtle/silent)
        const interval = setInterval(() => {
            if (customerId) fetchNotifications(false);
        }, 10000);
        return () => clearInterval(interval);
    }, [customerId]);

    // Check which review_prompt appointments already have reviews
    useEffect(() => {
        const reviewPrompts = notifications.filter(n => n.type === 'review_prompt' && n.related_id);
        if (reviewPrompts.length === 0) return;
        
        const checkReviews = async () => {
            const checked = new Set();
            await Promise.all(reviewPrompts.map(async (n) => {
                try {
                    const res = await Axios.get(`${API_URL}/api/reviews/check/${n.related_id}`);
                    if (res.data.exists) checked.add(Number(n.related_id));
                } catch (e) { /* ignore */ }
            }));
            setReviewedAppointments(checked);
        };
        checkReviews();
    }, [notifications]);

    const fetchNotifications = async (showLoader = false) => {
        try {
            if (showLoader) setLoading(true);
            const res = await Axios.get(`${API_URL}/api/notifications/${customerId}`);
            if (res.data.success) {
                const sorted = res.data.notifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                setNotifications(prev => {
                    const prevIds = prev.map(n => `${n.id}-${n.is_read}`).join(',');
                    const newIds = sorted.map(n => `${n.id}-${n.is_read}`).join(',');
                    return prevIds !== newIds ? sorted : prev;
                });
            }
            if (showLoader) setLoading(false);
        } catch (e) {
            console.error(e);
            if (showLoader) setLoading(false);
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

    const markUnread = async (id) => {
        try {
            await Axios.put(`${API_URL}/api/notifications/${id}/read`, { is_read: 0 });
            setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: 0 } : n));
        } catch (e) {
            console.error(e);
        }
    };

    const markAllRead = async () => {
        try {
            const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
            if (unreadIds.length > 0) {
                await Promise.all(unreadIds.map(id => Axios.put(`${API_URL}/api/notifications/${id}/read`)));
                setNotifications(notifications.map(n => ({ ...n, is_read: 1 })));
            }
        } catch (e) {
            console.error(e);
        }
    };

    const formatNotificationTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInDays = (now - date) / (1000 * 60 * 60 * 24);

        if (diffInDays < 7) {
            const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            if (date.toDateString() === now.toDateString()) {
                return time;
            }
            const day = date.toLocaleDateString([], { weekday: 'short' });
            return `${day} ${time}`;
        }
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    const getNotificationStyle = (type) => {
        switch (type) {
            case 'appointment_request':
                return { icon: CalendarPlus, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', label: 'Requested' };
            case 'appointment_rejected':
                return { icon: XCircle, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', label: 'Declined' };
            case 'appointment_rescheduled':
                return { icon: Clock, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', label: 'Rescheduled' };
            case 'appointment_reminder':
                return { icon: Clock, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)', label: 'Upcoming' };
            case 'appointment_confirmed': 
                return { icon: CalendarCheck, color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', label: 'Confirmed' };
            case 'appointment_cancelled': 
                return { icon: XCircle, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', label: 'Cancelled' };
            case 'appointment_completed':
                return { icon: CheckCircle, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)', label: 'Completed' };
            case 'payment_received':
            case 'payment_success':
                return { icon: CreditCard, color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', label: 'Payment' };
            case 'system':
                return { icon: Info, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)', label: 'System' };
            case 'pos_invoice':
                return { icon: CreditCard, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)', label: 'Invoice' };

            case 'aftercare_reminder':
                return { icon: Info, color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.1)', label: 'Aftercare' };
            case 'review_prompt':
                return { icon: Star, color: '#b7954e', bg: 'rgba(183, 149, 78, 0.1)', label: 'Review' };
            case 'email_change':
                return { icon: Mail, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)', label: 'Account' };
            case 'password_change':
                return { icon: ShieldAlert, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', label: 'Security' };
            default:
                return { icon: Bell, color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.1)', label: 'Notification' };
        }
    };

    const filteredNotifs = notifications.filter(n => {
        const matchesSearch = !searchTerm || 
            n.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
            n.message.toLowerCase().includes(searchTerm.toLowerCase());
        if (activeFilter === 'unread') return !n.is_read && matchesSearch;
        if (activeFilter === 'read') return n.is_read && matchesSearch;
        return matchesSearch;
    });

    const unreadCount = notifications.filter(n => !n.is_read).length;

    // Pagination logic
    const totalPages = Math.ceil(filteredNotifs.length / itemsPerPage);
    const currentItems = filteredNotifs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    if (!customerId) return <div className="portal-layout"><CustomerSideNav /><div className="portal-container">Please login to view notifications</div></div>;

    return (
        <div className="portal-layout">
            <CustomerSideNav />
            <div className="portal-container customer-portal customer-st-5f9aa399" >
                <header className="portal-header">
                    <div className="header-title">
                        <h1>Updates & Alerts</h1>
                    </div>
                    <div className="header-actions">
                        <button className="premium-btn secondary" onClick={async () => {
                            setIsRefreshingNotifs(true);
                            await fetchNotifications();
                            setIsRefreshingNotifs(false);
                        }} title="Refresh notifications" style={{ marginRight: '10px' }}>
                            <RefreshCw size={16} style={isRefreshingNotifs ? { animation: 'spin 1s linear infinite' } : {}} /> Refresh
                        </button>
                        <button className="premium-btn primary" onClick={markAllRead}>
                            <CheckCheck size={18} />
                            Mark All Read
                        </button>
                    </div>
                </header>

                <p className="header-subtitle customer-st-a37b17a0" >Stay informed about your tattoo journey</p>

                <div className="portal-stats-row customer-st-9eeb7fb7" >
                    <div className="glass-card customer-st-7743f948" >
                        <span className="customer-st-dd32c518" >Total Updates</span>
                        <span className="customer-st-05fe7b62" >{notifications.length}</span>
                    </div>
                    <div className="glass-card" style={{ flex: '1 1 200px', padding: '20px', textAlign: 'center' }}>
                        <span className="customer-st-dd32c518" >Unread Alerts</span>
                        <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: unreadCount > 0 ? '#b7954e' : 'inherit' }}>{unreadCount}</span>
                    </div>
                </div>

                <div className="filter-bar customer-st-35ad0876" >
                    <button 
                        className={`filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
                        onClick={() => setActiveFilter('all')}
                        style={filterButtonStyle(activeFilter === 'all')}
                    >
                        All
                    </button>
                    <button 
                        className={`filter-btn ${activeFilter === 'unread' ? 'active' : ''}`}
                        onClick={() => setActiveFilter('unread')}
                        style={filterButtonStyle(activeFilter === 'unread')}
                    >
                        Unread
                    </button>
                    <button 
                        className={`filter-btn ${activeFilter === 'read' ? 'active' : ''}`}
                        onClick={() => setActiveFilter('read')}
                        style={filterButtonStyle(activeFilter === 'read')}
                    >
                        Read
                    </button>
                </div>

                <div className="portal-content">
                    {/* Search Bar */}
                    <div className="premium-filter-bar" style={{ marginBottom: '20px', display: 'flex' }}>
                        <div className="premium-search-box premium-search-box--full" style={{ margin: 0, flex: 1, width: '100%' }}>
                            <Search size={16} className="text-muted" />
                            <input
                                type="text"
                                placeholder="Search notifications..."
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div className="dashboard-loader-container">
                            <div className="premium-loader"></div>
                            <p>Fetching your updates...</p>
                        </div>
                    ) : (
                        <div className="notifications-wrapper customer-st-38951e22" >
                                {currentItems.length > 0 ? (
                                    <div className="notifications-stream customer-st-2bb70a3c" >
                                        {currentItems.map(n => {
                                            const style = getNotificationStyle(n.type);
                                            const Icon = style.icon;
                                            
                                            return (
                                                <div key={n.id} className={`glass-card notification-record ${n.is_read ? 'read' : 'unread'}`} style={{ padding: '12px 20px', cursor: 'pointer', position: 'relative' }} onClick={(e) => { 
                                                    if (!e.target.closest('.notif-actions')) {
                                                        if (!n.is_read) markRead(n.id);
                                                        if (n.type === 'email_change' || n.type === 'password_change') {
                                                            navigate('/customer/profile');
                                                        } else {
                                                            setSelectedNotification({ ...n, style });
                                                        }
                                                    }
                                                }}>
                                                    <div className="notif-id-marker"></div>
                                                    <div className="notif-main" style={{ display: 'flex', alignItems: 'center', gap: '20px', overflow: 'hidden' }}>
                                                        <div className="icon-badge" style={{ background: style.bg, padding: '6px', borderRadius: '6px', flexShrink: 0 }}>
                                                            <Icon size={20} color={style.color}/>
                                                        </div>
                                                        
                                                        <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                                                            <span className="subject-text" style={{ fontSize: '0.95rem', minWidth: '150px', color: n.is_read ? '#64748b' : '#1e293b', display: 'block' }}>{n.title}</span>
                                                            <p className="notif-body" style={{ margin: 0, fontSize: '0.9rem', color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.message}</p>
                                                        </div>

                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                                                            <span className="notif-time" style={{ fontSize: '0.75rem', color: '#94a3b8', minWidth: '80px', textAlign: 'right' }}>
                                                                {formatNotificationTime(n.created_at)}
                                                            </span>
                                                            
                                                            <div className="notif-actions" style={{ display: 'flex', gap: '8px' }}>
                                                                {!n.is_read ? (
                                                                    <button className="notif-btn ghost customer-st-1b8f69ba" onClick={() => markRead(n.id)} title="Mark as Read">
                                                                        <Check size={14}/>
                                                                    </button>
                                                                ) : (
                                                                    <button className="notif-btn ghost customer-st-1b8f69ba" onClick={() => markUnread(n.id)} title="Mark as Unread">
                                                                        <RotateCcw size={14}/>
                                                                    </button>
                                                                )}
                                                                {n.type === 'appointment_reminder' && (
                                                                    <a className="notif-btn primary customer-st-b615ccfe" href="/customer/bookings" >
                                                                        View Upcoming
                                                                    </a>
                                                                )}
                                                                {n.type === 'pos_invoice' && (
                                                                    <a className="notif-btn primary customer-st-be163e3f" href={`${API_URL}/api/invoices/${n.related_id}`} target="_blank" rel="noopener noreferrer" >
                                                                        Invoice
                                                                    </a>
                                                                )}
                                                                {n.type === 'aftercare_reminder' && (
                                                                    <button className="notif-btn primary customer-st-3d39e5b0" onClick={(e) => { e.stopPropagation(); setIsAftercareModalOpen(true); }} >
                                                                        View Guide
                                                                    </button>
                                                                )}
                                                                {n.type === 'review_prompt' && (
                                                                    reviewedAppointments.has(Number(n.related_id)) ? (
                                                                        <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                            <CheckCircle size={14} /> Review Submitted
                                                                        </span>
                                                                    ) : (
                                                                        <a className="notif-btn primary customer-st-9bd8a3c8" href={`/customer/reviews/new?appointment=${n.related_id}`} >
                                                                            Leave Review
                                                                        </a>
                                                                    )
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="all-clear customer-st-3e3d331f" >
                                        <CheckCircle size={48} color="#10b981" />
                                        <h3>Everything Up to Date</h3>
                                        <p>You have no new notifications at this time.</p>
                                    </div>
                                )}

                                {filteredNotifs.length > itemsPerPage && (
                                    <div className="customer-st-842c3fb4" >
                                        <Pagination 
                                            currentPage={currentPage}
                                            totalPages={totalPages}
                                            onPageChange={setCurrentPage}
                                            itemsPerPage={itemsPerPage}
                                            onItemsPerPageChange={setItemsPerPage}
                                            totalItems={filteredNotifs.length}
                                            unit="notifications"
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                </div>
            </div>

            {/* Notification View Modal */}
            {selectedNotification && (
                <div className="modal-overlay customer-st-ec6d11c3" onClick={() => setSelectedNotification(null)} >
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="customer-st-18b79f09" >
                            <div className="customer-st-da70abb8" >
                                <div style={{ background: selectedNotification.style.bg, padding: '10px', borderRadius: '12px' }}>
                                    <selectedNotification.style.icon size={24} color={selectedNotification.style.color} />
                                </div>
                                <h3 className="customer-st-a047e906" >{selectedNotification.title}</h3>
                            </div>
                            <button className="close-btn customer-st-6df53034" onClick={() => setSelectedNotification(null)} ><XCircle size={24} /></button>
                        </div>
                        <div className="customer-st-49ffbede" >
                            <p className="customer-st-5454b175" >{selectedNotification.message}</p>
                        </div>
                        <div className="customer-st-23aef110" >
                            <span className="customer-st-97b91651" >Sent: {new Date(selectedNotification.created_at).toLocaleString()}</span>
                            <div className="notif-actions customer-st-7cead41b" >
                                {selectedNotification.related_id && selectedNotification.type !== 'pos_invoice' && selectedNotification.type !== 'review_prompt' && selectedNotification.type !== 'aftercare_reminder' && selectedNotification.type !== 'email_change' && selectedNotification.type !== 'password_change' && selectedNotification.type !== 'payment_success' && (
                                    <a className="notif-btn primary customer-st-be17fc86" href={`/customer/bookings?appointment=${selectedNotification.related_id}`} >Take Action</a>
                                )}
                                {selectedNotification.type === 'payment_success' && (() => {
                                    // Extract invoice number from message (e.g., "Invoice INV-000001 is now available")
                                    const invoiceMatch = selectedNotification.message?.match(/INV-\d+/);
                                    const invoiceNum = invoiceMatch ? invoiceMatch[0] : null;
                                    return invoiceNum ? (
                                        <button className="notif-btn primary customer-st-be17fc86" onClick={() => window.open(`/customer/invoice/${invoiceNum}`, '_blank')}>View Invoice</button>
                                    ) : (
                                        <a className="notif-btn primary customer-st-be17fc86" href={`/customer/bookings?appointment=${selectedNotification.related_id}`}>View Booking</a>
                                    );
                                })()}
                                {selectedNotification.type === 'pos_invoice' && <a className="notif-btn primary customer-st-be17fc86" href={`${API_URL}/api/invoices/${selectedNotification.related_id}`} target="_blank" rel="noopener noreferrer" >View Invoice</a>}
                                {(selectedNotification.type === 'email_change' || selectedNotification.type === 'password_change') && <button className="notif-btn primary" onClick={() => navigate('/customer/profile')}>Manage Profile</button>}
                                {selectedNotification.type === 'aftercare_reminder' && <button className="notif-btn primary customer-st-b55afb9c" onClick={() => { setSelectedNotification(null); setIsAftercareModalOpen(true); }} >View Guide</button>}
                                {selectedNotification.type === 'review_prompt' && (
                                    reviewedAppointments.has(Number(selectedNotification.related_id)) ? (
                                        <span style={{ fontSize: '0.9rem', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                            <CheckCircle size={16} /> Review Already Submitted
                                        </span>
                                    ) : (
                                        <a className="notif-btn primary customer-st-3f2429fc" href={`/customer/reviews/new?appointment=${selectedNotification.related_id}`} >Leave Review</a>
                                    )
                                )}
                                <button className="notif-btn ghost customer-st-cb4a8d52" onClick={() => setSelectedNotification(null)} >Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Aftercare Modal */}
            {isAftercareModalOpen && (
                <div className="modal-overlay" onClick={() => setIsAftercareModalOpen(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ background: '#1e293b', border: '1px solid rgba(193, 154, 107, 0.3)', maxWidth: '650px', width: '100%', maxHeight: '85vh', overflowY: 'auto', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', padding: '0' }}>
                        
                        {/* Header */}
                        <div style={{ padding: '24px 30px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#1e293b', zIndex: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <div style={{ background: 'linear-gradient(135deg, rgba(193, 154, 107, 0.2), rgba(193, 154, 107, 0.05))', padding: '12px', borderRadius: '12px', border: '1px solid rgba(193, 154, 107, 0.2)' }}>
                                    <Info size={24} color="#be9055" />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontFamily: 'Playfair Display, serif', color: '#ffffff', fontSize: '1.5rem', fontWeight: 700 }}>Tattoo Aftercare Guide</h3>
                                    <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Follow these steps for a perfect heal</span>
                                </div>
                            </div>
                            <button className="close-btn" onClick={() => setIsAftercareModalOpen(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background='rgba(255,255,255,0.1)'} onMouseOut={(e) => e.currentTarget.style.background='rgba(255,255,255,0.05)'}>
                                <XCircle size={24} />
                            </button>
                        </div>

                        {/* Content */}
                        <div style={{ padding: '30px', color: '#cbd5e1', lineHeight: '1.6', fontSize: '0.95rem' }}>
                            <div style={{ display: 'grid', gap: '25px' }}>
                                
                                {/* Phase 1 */}
                                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '20px' }}>
                                    <h4 style={{ color: '#be9055', marginTop: 0, marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
                                        <Droplets size={18} /> Day 1-3: The Initial Healing
                                    </h4>
                                    <ul style={{ paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <li><strong style={{ color: '#fff' }}>Keep it covered:</strong> Leave the initial bandage/wrap on for 2-4 hours.</li>
                                        <li><strong style={{ color: '#fff' }}>First wash:</strong> Gently wash with unscented anti-bacterial soap and warm water. DO NOT scrub.</li>
                                        <li><strong style={{ color: '#fff' }}>Pat dry:</strong> Use a clean paper towel. Never rub, and never use a regular cloth towel.</li>
                                        <li><strong style={{ color: '#fff' }}>Moisturize sparingly:</strong> Apply a very thin layer of tattoo-specific ointment or Aquaphor.</li>
                                    </ul>
                                </div>

                                {/* Phase 2 */}
                                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '20px' }}>
                                    <h4 style={{ color: '#be9055', marginTop: 0, marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
                                        <Activity size={18} /> Day 4-14: Peeling & Flaking
                                    </h4>
                                    <ul style={{ paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <li><strong style={{ color: '#fff' }}>Switch to lotion:</strong> Stop ointment and switch to a fragrance-free lotion.</li>
                                        <li><strong style={{ color: '#fff' }}>DO NOT PICK OR SCRATCH:</strong> Flaking is normal. Picking will pull out ink and cause scarring.</li>
                                        <li><strong style={{ color: '#fff' }}>Keep it clean:</strong> Wash 1-2 times daily.</li>
                                    </ul>
                                </div>

                                {/* Warnings */}
                                <div style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '12px', padding: '20px' }}>
                                    <h4 style={{ color: '#f59e0b', marginTop: 0, marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
                                        <Sun size={18} /> What to Avoid for 2-3 Weeks
                                    </h4>
                                    <ul style={{ paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <li><strong style={{ color: '#fff' }}>No swimming:</strong> Avoid pools, hot tubs, oceans, and baths (showering is fine).</li>
                                        <li><strong style={{ color: '#fff' }}>No direct sunlight:</strong> Keep the tattoo covered or shaded.</li>
                                        <li><strong style={{ color: '#fff' }}>No heavy sweating:</strong> Avoid intense workouts or saunas for the first 48 hours.</li>
                                    </ul>
                                </div>

                            </div>

                            {/* Footer Warning */}
                            <div style={{ marginTop: '25px', padding: '15px', background: 'rgba(239, 68, 68, 0.05)', borderLeft: '4px solid #ef4444', borderRadius: '4px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                <ShieldAlert size={20} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                                <p style={{ margin: 0, fontStyle: 'italic', color: '#cbd5e1', fontSize: '0.9rem' }}>
                                    If you experience severe redness, swelling, or signs of infection, please contact the studio immediately or seek medical advice.
                                </p>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div style={{ padding: '20px 30px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'flex-end', background: '#1e293b', position: 'sticky', bottom: 0, zIndex: 10 }}>
                            <button onClick={() => setIsAftercareModalOpen(false)} style={{ background: '#be9055', color: '#ffffff', border: 'none', padding: '12px 30px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.3s', boxShadow: '0 4px 12px rgba(193, 154, 107, 0.3)', fontSize: '0.95rem' }} onMouseOver={(e) => e.currentTarget.style.transform='translateY(-2px)'} onMouseOut={(e) => e.currentTarget.style.transform='translateY(0)'}>
                                I Understand
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const filterButtonStyle = (isActive) => ({
    padding: '8px 20px',
    borderRadius: '20px',
    border: isActive ? '1px solid rgba(255,255,255,0.1)' : '1px solid #cbd5e1',
    background: isActive ? '#be9055' : 'rgba(255,255,255,0.05)',
    color: isActive ? 'white' : '#64748b',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(10px)'
});

export default CustomerNotifications;
