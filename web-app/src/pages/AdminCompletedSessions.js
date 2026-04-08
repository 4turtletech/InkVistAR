import React, { useState, useEffect } from 'react';
import Axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, FileText, Image as ImageIcon, Package, Search, Filter, Calendar, Clock, User, DollarSign, X } from 'lucide-react';
import AdminSideNav from '../components/AdminSideNav';
import Pagination from '../components/Pagination';
import './PortalStyles.css';
import { API_URL } from '../config';

function AdminCompletedSessions() {
    const navigate = useNavigate();
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filteredSessions, setFilteredSessions] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('completed');
    const [sortBy, setSortBy] = useState('date');
    const [selectedSession, setSelectedSession] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [sessionModal, setSessionModal] = useState({ mounted: false, visible: false });

    const openModal = () => {
        setSessionModal({ mounted: true, visible: false });
        setTimeout(() => setSessionModal({ mounted: true, visible: true }), 10);
    };

    const closeModal = () => {
        setSessionModal(prev => ({ ...prev, visible: false }));
        setTimeout(() => {
            setSessionModal({ mounted: false, visible: false });
            setSelectedSession(null);
        }, 400);
    };

    useEffect(() => {
        fetchSessions();
    }, []);

    useEffect(() => {
        filterSessions();
    }, [sessions, searchTerm, statusFilter, sortBy]);

    const fetchSessions = async () => {
        try {
            const res = await Axios.get(`${API_URL}/api/admin/appointments`);
            if (res.data.success) {
                const completedSessions = res.data.data
                    .filter(apt => apt.status === 'completed' && !apt.is_deleted)
                    .map(apt => ({
                        id: apt.id,
                        clientName: apt.client_name,
                        clientId: apt.customer_id,
                        artistName: apt.artist_name,
                        artistId: apt.artist_id,
                        designTitle: apt.design_title,
                        date: apt.appointment_date ? apt.appointment_date.split('T')[0] : '',
                        time: apt.start_time,
                        status: apt.status,
                        notes: apt.notes,
                        beforePhoto: apt.before_photo,
                        afterPhoto: apt.after_photo,
                        price: apt.price || 0,
                        totalPaid: apt.total_paid || 0
                    }));
                setSessions(completedSessions);
                setFilteredSessions(completedSessions);
            }
            setLoading(false);
        } catch (error) {
            console.error("Error fetching sessions:", error);
            setLoading(false);
        }
    };

    const fetchSessionMaterials = async (id) => {
        try {
            const res = await Axios.get(`${API_URL}/api/appointments/${id}/materials`);
            if (res.data.success) {
                return { materials: res.data.materials || [], totalCost: res.data.totalCost || 0 };
            }
            return { materials: [], totalCost: 0 };
        } catch (e) {
            console.error(e);
            return { materials: [], totalCost: 0 };
        }
    };

    const filterSessions = () => {
        let filtered = [...sessions];

        if (searchTerm) {
            filtered = filtered.filter(s =>
                s.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.artistName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (s.designTitle && s.designTitle.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }

        if (statusFilter !== 'all' && statusFilter !== 'completed') {
            filtered = filtered.filter(s => s.status === statusFilter);
        }

        if (sortBy === 'date') {
            filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
        } else if (sortBy === 'client') {
            filtered.sort((a, b) => a.clientName.localeCompare(b.clientName));
        } else if (sortBy === 'artist') {
            filtered.sort((a, b) => a.artistName.localeCompare(b.artistName));
        }

        setFilteredSessions(filtered);
    };

    const handleViewSession = async (session) => {
        const materialsData = await fetchSessionMaterials(session.id);
        setSelectedSession({ ...session, ...materialsData });
        openModal();
    };

    const totalPages = Math.ceil(filteredSessions.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentSessions = filteredSessions.slice(startIndex, startIndex + itemsPerPage);

    return (
        <div className="portal-layout">
            <AdminSideNav />
            <div className="portal-container admin-portal">
                <header className="portal-header">
                    <h1>Completed Sessions</h1>
                    <p>View all completed tattoo sessions with details</p>
                </header>

                <div className="portal-content">
                    {loading ? (
                        <div className="no-data">Loading sessions...</div>
                    ) : (
                        <div className="table-card-container" style={{ minHeight: '500px' }}>
                            <div className="card-header-v2">
                                <h2>Session History</h2>
                                <span className="status-badge-v2 completed">{filteredSessions.length} Sessions</span>
                            </div>

                            {/* Filters */}
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                                <div style={{ flex: '1', minWidth: '200px' }}>
                                    <div style={{ position: 'relative' }}>
                                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                        <input
                                            type="text"
                                            placeholder="Search by client, artist, or design..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            style={{
                                                width: '100%', padding: '10px 10px 10px 40px', borderRadius: '8px',
                                                border: '1px solid #e2e8f0', fontSize: '0.9rem'
                                            }}
                                        />
                                    </div>
                                </div>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    style={{ padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff' }}
                                >
                                    <option value="date">Sort by Date</option>
                                    <option value="client">Sort by Client</option>
                                    <option value="artist">Sort by Artist</option>
                                </select>
                            </div>

                            {currentSessions.length > 0 ? (
                                <div className="table-responsive">
                                    <table className="portal-table">
                                        <thead>
                                            <tr>
                                                <th>Date</th>
                                                <th>Client</th>
                                                <th>Staff</th>
                                                <th>Design</th>
                                                <th>Materials Cost</th>
                                                <th>Price</th>
                                                <th>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {currentSessions.map(session => (
                                                <tr key={session.id}>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <Calendar size={14} className="text-muted" />
                                                            {session.date}
                                                        </div>
                                                    </td>
                                                    <td style={{ fontWeight: '600' }}>{session.clientName}</td>
                                                    <td>{session.artistName}</td>
                                                    <td>{session.designTitle || 'N/A'}</td>
                                                    <td>
                                                        <span style={{ color: '#10b981', fontWeight: '600' }}>
                                                            ₱{session.totalCost?.toLocaleString() || '0'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span style={{ fontWeight: '600' }}>₱{session.price.toLocaleString()}</span>
                                                    </td>
                                                    <td>
                                                        <button
                                                            className="btn btn-primary"
                                                            onClick={() => handleViewSession(session)}
                                                            style={{ padding: '6px 14px', fontSize: '0.85rem' }}
                                                        >
                                                            View Details
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="no-data-container" style={{ flex: 1 }}>
                                    <CheckCircle size={48} className="no-data-icon" />
                                    <p className="no-data-text">No completed sessions found.</p>
                                </div>
                            )}

                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={setCurrentPage}
                                itemsPerPage={itemsPerPage}
                                onItemsPerPageChange={setItemsPerPage}
                            />
                        </div>
                    )}
                </div>

                {/* Session Details Modal */}
                {sessionModal.mounted && selectedSession && (
                    <div className={`modal-overlay ${sessionModal.visible ? 'open' : ''}`} onClick={closeModal}>
                        <div className="modal-content xl" style={{ height: '90vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                    <div style={{ background: '#f8fafc', width: '50px', height: '50px', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <ImageIcon size={28} className="text-bronze" />
                                    </div>
                                    <div>
                                        <h2 style={{ margin: 0 }}>Archive Record: {selectedSession.clientName}</h2>
                                        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.9rem' }}>Project: {selectedSession.designTitle}</p>
                                    </div>
                                </div>
                                <button className="close-btn" onClick={closeModal}><X size={24} /></button>
                            </div>

                            <div className="modal-body" style={{ flex: 1, padding: '30px', maxHeight: 'none' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '40px', height: '100%' }}>
                                    {/* Left Column: Visual Archive & Notes */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                                        {/* Performance Metrics Row */}
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                                            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                                                <label style={{ fontWeight: 700, fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Procedure Date</label>
                                                <div style={{ fontWeight: 700, fontSize: '1rem' }}>{selectedSession.date}</div>
                                                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Started at {selectedSession.time}</div>
                                            </div>
                                            <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                                                <label style={{ fontWeight: 700, fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Primary Artist</label>
                                                <div style={{ fontWeight: 700, fontSize: '1rem' }}>{selectedSession.artistName}</div>
                                                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Senior Tattoo Artist</div>
                                            </div>
                                            <div style={{ background: '#f0fdf4', padding: '15px', borderRadius: '16px', border: '1px solid #dcfce7' }}>
                                                <label style={{ fontWeight: 700, fontSize: '0.7rem', color: '#166534', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Revenue Item</label>
                                                <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#166534' }}>₱{selectedSession.price.toLocaleString()}</div>
                                                <div style={{ fontSize: '0.8rem', color: '#15803d' }}>Payment Confirmed</div>
                                            </div>
                                        </div>

                                        {/* Visual Documentation */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                <label style={{ fontWeight: 700, fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Before State</label>
                                                <div style={{ background: '#f8fafc', borderRadius: '20px', overflow: 'hidden', border: '1px solid #e2e8f0', height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    {selectedSession.beforePhoto ? (
                                                        <img src={selectedSession.beforePhoto} alt="Before" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    ) : (
                                                        <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                                                            <ImageIcon size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
                                                            <div style={{ fontSize: '0.8rem' }}>No initial documentation</div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                <label style={{ fontWeight: 700, fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>After State</label>
                                                <div style={{ background: '#f8fafc', borderRadius: '20px', overflow: 'hidden', border: '1px solid #e2e8f0', height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    {selectedSession.afterPhoto ? (
                                                        <img src={selectedSession.afterPhoto} alt="After" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    ) : (
                                                        <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                                                            <ImageIcon size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
                                                            <div style={{ fontSize: '0.8rem' }}>No final documentation</div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Artist Notes Archive */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            <label style={{ fontWeight: 700, fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <FileText size={14}/> Procedure Narrative
                                            </label>
                                            <div style={{
                                                background: '#f8fafc', 
                                                border: '1px solid #e2e8f0', 
                                                borderRadius: '20px',
                                                padding: '24px', 
                                                fontSize: '0.95rem',
                                                lineHeight: '1.7',
                                                color: '#334155',
                                                minHeight: '120px',
                                                whiteSpace: 'pre-wrap'
                                            }}>
                                                {selectedSession.notes || 'No notes were recorded for this session.'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column: Logistics & Supplies */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                        <div style={{ 
                                            background: '#fff', 
                                            borderRadius: '24px', 
                                            border: '1px solid #e2e8f0', 
                                            padding: '24px',
                                            height: '100%',
                                            display: 'flex',
                                            flexDirection: 'column'
                                        }}>
                                            <label style={{ fontWeight: 700, fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Package size={14}/> Logistics & Consumables
                                            </label>
                                            
                                            <div style={{ flex: 1, overflowY: 'auto', marginBottom: '20px' }}>
                                                {selectedSession.materials && selectedSession.materials.length > 0 ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                        {selectedSession.materials.map((mat, idx) => (
                                                            <div key={idx} style={{
                                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                                padding: '12px 16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9'
                                                            }}>
                                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                    <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{mat.quantity}x {mat.item_name}</span>
                                                                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Itemized Consumable</span>
                                                                </div>
                                                                <span className={`badge status-consumed`} style={{ fontSize: '0.65rem' }}>{mat.status.toUpperCase()}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                                                        <Package size={32} style={{ opacity: 0.2, marginBottom: '10px' }} />
                                                        <p style={{ margin: 0, fontSize: '0.85rem' }}>No materials were itemized for this specific procedure.</p>
                                                    </div>
                                                )}
                                            </div>

                                            <div style={{ 
                                                background: '#f8fafc', 
                                                padding: '20px', 
                                                borderRadius: '20px', 
                                                border: '1px solid #e2e8f0',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center'
                                            }}>
                                                <div>
                                                    <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Logistics Cost</div>
                                                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b' }}>₱{selectedSession.totalCost?.toLocaleString() || 0}</div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10b981' }}>{selectedSession.materials ? selectedSession.materials.length : 0}</div>
                                                    <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Items Used</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button className="btn btn-primary" onClick={closeModal} style={{ padding: '10px 40px' }}>Done Reviewing</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default AdminCompletedSessions;
