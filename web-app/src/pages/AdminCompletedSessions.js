import React, { useState, useEffect } from 'react';
import Axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, FileText, Image, Package, Search, Filter, Calendar, Clock, User, DollarSign, X } from 'lucide-react';
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
                        <div className="modal-content" style={{ maxWidth: '900px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <div>
                                    <h2>Session: {selectedSession.clientName}</h2>
                                    <p style={{ margin: 0, color: '#666' }}>{selectedSession.designTitle}</p>
                                </div>
                                <button className="close-btn" onClick={closeModal}><X size={20} /></button>
                            </div>

                            <div className="modal-body">
                                {/* Session Info Cards */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
                                    <div className="data-card" style={{ background: '#f8fafc' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                            <Calendar size={20} color="#3b82f6" />
                                            <strong>Date</strong>
                                        </div>
                                        <p style={{ margin: 0, fontSize: '0.95rem' }}>{selectedSession.date}</p>
                                        <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>{selectedSession.time}</p>
                                    </div>
                                    <div className="data-card" style={{ background: '#f8fafc' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                            <User size={20} color="#3b82f6" />
                                            <strong>Client</strong>
                                        </div>
                                        <p style={{ margin: 0 }}>{selectedSession.clientName}</p>
                                    </div>
                                    <div className="data-card" style={{ background: '#f8fafc' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                            <FileText size={20} color="#3b82f6" />
                                            <strong>Artist</strong>
                                        </div>
                                        <p style={{ margin: 0 }}>{selectedSession.artistName}</p>
                                    </div>
                                    <div className="data-card" style={{ background: '#f8fafc' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                            <DollarSign size={20} color="#10b981" />
                                            <strong>Price</strong>
                                        </div>
                                        <p style={{ margin: 0, fontWeight: '600', color: '#10b981' }}>₱{selectedSession.price.toLocaleString()}</p>
                                    </div>
                                </div>

                                {/* Photos */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                                    <div className="photo-upload-box" style={{ border: '2px dashed #e2e8f0', borderRadius: '8px', padding: '20px', textAlign: 'center' }}>
                                        <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600' }}>Before Photo</label>
                                        {selectedSession.beforePhoto ? (
                                            <img src={selectedSession.beforePhoto} alt="Before" style={{ width: '100%', maxHeight: '250px', objectFit: 'cover', borderRadius: '4px' }} />
                                        ) : (
                                            <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>No before photo uploaded</p>
                                        )}
                                    </div>
                                    <div className="photo-upload-box" style={{ border: '2px dashed #e2e8f0', borderRadius: '8px', padding: '20px', textAlign: 'center' }}>
                                        <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600' }}>After Photo</label>
                                        {selectedSession.afterPhoto ? (
                                            <img src={selectedSession.afterPhoto} alt="After" style={{ width: '100%', maxHeight: '250px', objectFit: 'cover', borderRadius: '4px' }} />
                                        ) : (
                                            <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>No after photo uploaded</p>
                                        )}
                                    </div>
                                </div>

                                {/* Session Notes */}
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600' }}>
                                        <FileText size={16} style={{ verticalAlign: 'middle' }} /> Session Notes
                                    </label>
                                    <div style={{
                                        background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px',
                                        padding: '15px', minHeight: '100px', whiteSpace: 'pre-wrap'
                                    }}>
                                        {selectedSession.notes || 'No notes recorded'}
                                    </div>
                                </div>

                                {/* Materials Used */}
                                <div>
                                    <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600' }}>
                                        <Package size={16} style={{ verticalAlign: 'middle' }} /> Materials Used
                                    </label>
                                    <div style={{
                                        background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '15px'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #e2e8f0' }}>
                                            <strong>Total Material Cost</strong>
                                            <strong style={{ color: '#10b981' }}>₱{selectedSession.totalCost?.toLocaleString() || 0}</strong>
                                        </div>
                                        {selectedSession.materials && selectedSession.materials.length > 0 ? (
                                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                                {selectedSession.materials.map((mat, idx) => (
                                                    <li key={idx} style={{
                                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                        padding: '8px 0', borderBottom: '1px solid #e2e8f0'
                                                    }}>
                                                        <span>{mat.quantity}x {mat.item_name}</span>
                                                        <span style={{
                                                            fontSize: '0.8rem',
                                                            padding: '2px 8px',
                                                            borderRadius: '4px',
                                                            background: mat.status === 'consumed' ? '#d1fae5' : '#fef3c7',
                                                            color: mat.status === 'consumed' ? '#065640' : '#92400e'
                                                        }}>
                                                            {mat.status.toUpperCase()}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p style={{ color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>No materials logged for this session</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={closeModal}>Close</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default AdminCompletedSessions;
