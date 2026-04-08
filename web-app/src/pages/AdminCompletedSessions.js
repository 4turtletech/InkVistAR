import React, { useState, useEffect } from 'react';
import Axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, FileText, Image as ImageIcon, Package, Search, Filter, Calendar, Clock, User, DollarSign, X } from 'lucide-react';
import AdminSideNav from '../components/AdminSideNav';
import Pagination from '../components/Pagination';
import './PortalStyles.css';
import './AdminStyles.css';
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
                (s.id || '').toString().includes(searchTerm) ||
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

    // Compute autocomplete suggestions dynamically from the dataset
    const searchSuggestions = Array.from(new Set([
        ...sessions.map(s => (s.id || '').toString()),
        ...sessions.map(s => (s.clientName || '').trim()),
        ...sessions.map(s => (s.artistName || '').trim()),
        ...sessions.map(s => (s.designTitle || '').trim())
    ])).filter(Boolean);

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
                        <div className="table-card-container admin-st-3f9f7eaf">
                            <div className="card-header-v2">
                                <h2>Session History</h2>
                                <span className="status-badge-v2 completed">{filteredSessions.length} Sessions</span>
                            </div>

                            {/* Filters */}
                            <div className="admin-st-4d28b3db">
                                <div className="admin-st-1d9faff6">
                                    <div className="admin-st-d85c4e64">
                                        <Search size={18} className="admin-st-5a5e8413" />
                                        <input
                                            type="text"
                                            list="search-suggestions-sessions"
                                            placeholder="Search by ID, client, artist, or design..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="admin-st-0be6745d"
                                        />
                                        <datalist id="search-suggestions-sessions">
                                            {searchSuggestions.map(suggestion => (
                                                <option key={suggestion} value={suggestion} />
                                            ))}
                                        </datalist>
                                    </div>
                                </div>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="admin-st-441149a3"
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
                                                        <div className="admin-flex-center admin-gap-5">
                                                            <Calendar size={14} className="text-muted" />
                                                            {session.date}
                                                        </div>
                                                    </td>
                                                    <td className="admin-fw-600">{session.clientName}</td>
                                                    <td>{session.artistName}</td>
                                                    <td>{session.designTitle || 'N/A'}</td>
                                                    <td>
                                                        <span className="admin-st-2599643e">
                                                            ₱{session.totalCost?.toLocaleString() || '0'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className="admin-fw-600">₱{session.price.toLocaleString()}</span>
                                                    </td>
                                                    <td>
                                                        <button
                                                            className="btn btn-primary admin-st-3a8ba4fe"
                                                            onClick={() => handleViewSession(session)}
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
                                <div className="no-data-container admin-st-49cdf874">
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
                        <div className="modal-content xl admin-st-980ed307" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <div className="admin-flex-center admin-gap-20">
                                    <div className="admin-st-e836bc9c">
                                        <ImageIcon size={28} className="text-bronze" />
                                    </div>
                                    <div>
                                        <h2 className="admin-m-0">Archive Record: {selectedSession.clientName}</h2>
                                        <p className="admin-st-107902df">Project: {selectedSession.designTitle}</p>
                                    </div>
                                </div>
                                <button className="close-btn" onClick={closeModal}><X size={24} /></button>
                            </div>

                            <div className="modal-body admin-st-92565e46">
                                <div className="admin-st-232d6dae">
                                    {/* Left Column: Visual Archive & Notes */}
                                    <div className="admin-st-14907636">
                                        {/* Performance Metrics Row */}
                                        <div className="admin-st-4155de1d">
                                            <div className="admin-st-6af16ee8">
                                                <label className="admin-st-8e71d7c8">Procedure Date</label>
                                                <div className="admin-st-e9a1fb1d">{selectedSession.date}</div>
                                                <div className="admin-st-76f4deed">Started at {selectedSession.time}</div>
                                            </div>
                                            <div className="admin-st-6af16ee8">
                                                <label className="admin-st-8e71d7c8">Primary Artist</label>
                                                <div className="admin-st-e9a1fb1d">{selectedSession.artistName}</div>
                                                <div className="admin-st-76f4deed">Senior Tattoo Artist</div>
                                            </div>
                                            <div className="admin-st-306fe11e">
                                                <label className="admin-st-e634a3e2">Revenue Item</label>
                                                <div className="admin-st-7626e003">₱{selectedSession.price.toLocaleString()}</div>
                                                <div className="admin-st-f6d8a8be">Payment Confirmed</div>
                                            </div>
                                        </div>

                                        {/* Visual Documentation */}
                                        <div className="admin-st-2f580e88">
                                            <div className="admin-st-02ffc1e1">
                                                <label className="admin-st-c3be2f4d">Before State</label>
                                                <div className="admin-st-e36c5fa1">
                                                    {selectedSession.beforePhoto ? (
                                                        <img src={selectedSession.beforePhoto} alt="Before" className="admin-st-9e218869" />
                                                    ) : (
                                                        <div className="admin-st-d8e4e0a4">
                                                            <ImageIcon size={32} className="admin-st-c4c91f37" />
                                                            <div className="admin-st-fb2a7115">No initial documentation</div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="admin-st-02ffc1e1">
                                                <label className="admin-st-c3be2f4d">After State</label>
                                                <div className="admin-st-e36c5fa1">
                                                    {selectedSession.afterPhoto ? (
                                                        <img src={selectedSession.afterPhoto} alt="After" className="admin-st-9e218869" />
                                                    ) : (
                                                        <div className="admin-st-d8e4e0a4">
                                                            <ImageIcon size={32} className="admin-st-c4c91f37" />
                                                            <div className="admin-st-fb2a7115">No final documentation</div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Artist Notes Archive */}
                                        <div className="admin-st-02ffc1e1">
                                            <label className="admin-st-f7d8f00c">
                                                <FileText size={14}/> Procedure Narrative
                                            </label>
                                            <div className="admin-st-a5a703dd">
                                                {selectedSession.notes || 'No notes were recorded for this session.'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column: Logistics & Supplies */}
                                    <div className="admin-st-ff43421e">
                                        <div className="admin-st-8f4d2ab5">
                                            <label className="admin-st-3092c0d2">
                                                <Package size={14}/> Logistics & Consumables
                                            </label>
                                            
                                            <div className="admin-st-6ece488c">
                                                {selectedSession.materials && selectedSession.materials.length > 0 ? (
                                                    <div className="admin-st-b8aaf979">
                                                        {selectedSession.materials.map((mat, idx) => (
                                                            <div key={idx} className="admin-st-432a8b30">
                                                                <div className="admin-st-19bd18ad">
                                                                    <span className="admin-st-34acc2e5">{mat.quantity}x {mat.item_name}</span>
                                                                    <span className="admin-st-fef01c14">Itemized Consumable</span>
                                                                </div>
                                                                <span className={`badge status-consumed admin-st-12e5feb7`} >{mat.status.toUpperCase()}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="admin-st-998876b3">
                                                        <Package size={32} className="admin-st-f0ce07d4" />
                                                        <p className="admin-st-ab5697c1">No materials were itemized for this specific procedure.</p>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="admin-st-0e3ab090">
                                                <div>
                                                    <div className="admin-st-3de2cbb8">Logistics Cost</div>
                                                    <div className="admin-st-0481d00f">₱{selectedSession.totalCost?.toLocaleString() || 0}</div>
                                                </div>
                                                <div className="admin-st-7851dbc0">
                                                    <div className="admin-st-def2f630">{selectedSession.materials ? selectedSession.materials.length : 0}</div>
                                                    <div className="admin-st-3de2cbb8">Items Used</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button className="btn btn-primary admin-st-6948e5f9" onClick={closeModal} >Done Reviewing</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default AdminCompletedSessions;
