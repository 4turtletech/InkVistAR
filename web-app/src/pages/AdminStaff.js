import React, { useState, useEffect } from 'react';
import Axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    User, Mail, Phone, Calendar, Image,
    BarChart3, Clock, Trash2, X, Save, Shield, Briefcase,
    Search, Filter, SlidersHorizontal, Globe, Lock, Users, Palette, UserCircle, Users2
} from 'lucide-react';
import AdminSideNav from '../components/AdminSideNav';
import ConfirmModal from '../components/ConfirmModal';
import Pagination from '../components/Pagination';
import './AdminStaff.css';
import './PortalStyles.css';
import './AdminStyles.css';
import { API_URL } from '../config';
import { TATTOO_STYLES } from '../constants/tattooStyles';
import MultiSelectDropdown from '../components/MultiSelectDropdown';
import PhilippinePeso from '../components/PhilippinePeso';
import { filterName, filterMoney, clampNumber } from '../utils/validation';

function AdminStaff() {
    const navigate = useNavigate();
    const location = useLocation();

    // Main List State
    const [staff, setStaff] = useState([]);
    const [filteredStaff, setFilteredStaff] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [loading, setLoading] = useState(true);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Detailed View State
    const [selectedArtist, setSelectedArtist] = useState(null);
    const [activeTab, setActiveTab] = useState('profile');
    const [artistDetails, setArtistDetails] = useState({
        profile: {},
        appointments: [],
        portfolio: [],
        stats: {}
    });
    const [loadingDetails, setLoadingDetails] = useState(false);

    // Edit Form State
    const [formData, setFormData] = useState({});

    // Portfolio Edit State
    const [selectedWork, setSelectedWork] = useState(null);
    const [editWorkModal, setEditWorkModal] = useState({ mounted: false, visible: false });
    const [workFormData, setWorkFormData] = useState({
        title: '',
        description: '',
        category: 'Realism',
        isPublic: true,
        priceEstimate: ''
    });

    // Modal state for animations
    const [artistManagerModal, setArtistManagerModal] = useState({ mounted: false, visible: false });
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null, type: 'info', isAlert: false });

    // Validation state
    const [errors, setErrors] = useState({});

    const validateProfileField = (field, value) => {
        let errorMsg = "";
        if (field === 'name' && !value) errorMsg = "Name is required";
        setErrors(prev => ({ ...prev, [field]: errorMsg }));
        return errorMsg === "";
    };

    const handleProfileInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        validateProfileField(field, value);
    };

    const validateWorkField = (field, value) => {
        let errorMsg = "";
        if (field === 'title' && !value) errorMsg = "Title is required";
        setErrors(prev => ({ ...prev, [`work_${field}`]: errorMsg }));
        return errorMsg === "";
    };

    const handleWorkInputChange = (field, value) => {
        setWorkFormData(prev => ({ ...prev, [field]: value }));
        validateWorkField(field, value);
    };

    const showAlert = (title, message, type = 'info') => {
        setConfirmDialog({ isOpen: true, title, message, type, isAlert: true, onConfirm: () => setConfirmDialog(prev => ({ ...prev, isOpen: false })) });
    };

    useEffect(() => {
        fetchStaff();
    }, []);

    useEffect(() => {
        filterStaff();
    }, [staff, searchTerm, roleFilter]);

    const fetchStaff = async () => {
        try {
            setLoading(true);
            const response = await Axios.get(`${API_URL}/api/debug/users`);
            if (response.data.success) {
                const staffMembers = response.data.users
                    .filter(u => (u.user_type === 'artist' || u.user_type === 'manager' || u.user_type === 'admin') && !u.is_deleted)
                    .map(u => ({
                        ...u,
                        role: u.user_type.charAt(0).toUpperCase() + u.user_type.slice(1),
                        status: 'active' // Mock status for now
                    }));
                setStaff(staffMembers);
            }
            setLoading(false);
        } catch (error) {
            console.error("Error fetching staff:", error);
            setLoading(false);
        }
    };

    const filterStaff = () => {
        let filtered = staff.filter(s => {
            const matchesSearch =
                (s.id || '').toString().includes(searchTerm) ||
                (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (s.email || '').toLowerCase().includes(searchTerm.toLowerCase());
            const matchesRole = roleFilter === 'all' || s.role.toLowerCase() === roleFilter.toLowerCase();
            return matchesSearch && matchesRole;
        });
        setFilteredStaff(filtered);
        setCurrentPage(1); // Reset page on filter change
    };

    // Pagination logic
    const totalPages = Math.ceil(filteredStaff.length / itemsPerPage);
    const paginatedStaff = filteredStaff.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Modal animation handlers
    const openModal = () => {
        setArtistManagerModal({ mounted: true, visible: false });
        setTimeout(() => setArtistManagerModal({ mounted: true, visible: true }), 10);
    };

    const closeModal = () => {
        setArtistManagerModal(prev => ({ ...prev, visible: false }));
        setTimeout(() => {
            setArtistManagerModal({ mounted: false, visible: false });
            setSelectedArtist(null);
        }, 400); // Match CSS transition duration
    };

    const openEditWork = (work) => {
        setSelectedWork(work);
        setWorkFormData({
            title: work.title || '',
            description: work.description || '',
            category: work.category || 'Realism',
            isPublic: work.is_public === 1 || work.is_public === true,
            priceEstimate: work.price_estimate || ''
        });
        setEditWorkModal({ mounted: true, visible: false });
        setTimeout(() => setEditWorkModal({ mounted: true, visible: true }), 10);
    };

    const closeEditWork = () => {
        setEditWorkModal(prev => ({ ...prev, visible: false }));
        setTimeout(() => setEditWorkModal({ mounted: false, visible: false }), 400);
    };

    // --- Artist Management Functions ---

    const openArtistManager = async (artist) => {
        setSelectedArtist(artist);
        setLoadingDetails(true);
        setActiveTab('profile');
        openModal(); // Open modal immediately to show loading state

        try {
            const [dashboardRes, portfolioRes] = await Promise.all([
                Axios.get(`${API_URL}/api/artist/dashboard/${artist.id}`),
                Axios.get(`${API_URL}/api/artist/${artist.id}/portfolio`)
            ]);

            if (dashboardRes.data.success && portfolioRes.data.success) {
                const data = dashboardRes.data;
                setArtistDetails({
                    profile: data.artist,
                    appointments: data.appointments || [],
                    portfolio: portfolioRes.data.works || [],
                    stats: data.stats || {}
                });
                setFormData({
                    name: data.artist.name,
                    specialization: data.artist.specialization,
                    hourly_rate: data.artist.hourly_rate,
                    experience_years: data.artist.experience_years,
                    commission_rate: data.artist.commission_rate
                });
            } else {
                throw new Error(dashboardRes.data.message || portfolioRes.data.message || 'Failed to fetch artist details.');
            }
        } catch (error) {
            console.error("Error fetching artist details:", error);
            const errorMessage = error.response?.data?.message || error.message || "An unknown error occurred.";
            showAlert("Load Failed", `Could not load artist details: ${errorMessage}`, "danger");
            closeModal();
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleUpdateProfile = async () => {
        if (!validateProfileField('name', formData.name)) return;
        try {
            await Axios.put(`${API_URL}/api/artist/profile/${selectedArtist.id}`, formData);
            showAlert("Success", "Profile updated successfully", "success");
            // Refresh local data
            setArtistDetails(prev => ({
                ...prev,
                profile: { ...prev.profile, ...formData }
            }));
            fetchStaff(); // Refresh main list name if changed
        } catch (error) {
            console.error("Error updating profile:", error);
            showAlert("Error", "Failed to update profile", "danger");
        }
    };

    const handleSaveWork = async (e) => {
        if (e) e.preventDefault();
        if (!validateWorkField('title', workFormData.title)) return;
        try {
            await Axios.put(`${API_URL}/api/artist/portfolio/${selectedWork.id}`, {
                title: workFormData.title,
                description: workFormData.description,
                category: workFormData.category,
                priceEstimate: workFormData.priceEstimate,
                isPublic: workFormData.isPublic
            });

            // Update local state
            setArtistDetails(prev => ({
                ...prev,
                portfolio: prev.portfolio.map(w =>
                    w.id === selectedWork.id
                        ? {
                            ...w,
                            ...workFormData,
                            is_public: workFormData.isPublic ? 1 : 0
                        }
                        : w
                )
            }));
            closeEditWork();
            showAlert("Success", "Portfolio item updated", "success");
        } catch (error) {
            console.error("Error updating portfolio work:", error);
            showAlert("Error", "Failed to update portfolio item", "danger");
        }
    };

    const handleDeleteWork = (workId) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Delete Portfolio Item',
            message: 'Delete this portfolio item?',
            onConfirm: async () => {
                setConfirmDialog({ isOpen: false });
                try {
                    await Axios.delete(`${API_URL}/api/artist/portfolio/${workId}`);
                    setArtistDetails(prev => ({
                        ...prev,
                        portfolio: prev.portfolio.filter(w => w.id !== workId)
                    }));
                } catch (error) {
                    console.error("Error deleting work:", error);
                }
            }
        });
    };

    const handleBlockDate = async () => {
        // Since we can't easily prompt with our custom modal right now, we can show an alert or open a different modal
        // For now, let's keep it simple or remove it. Let's do a simple prompt for text, then success custom alert.
        const date = prompt("Enter date to block (YYYY-MM-DD):"); // Prompt returns text, so it's slightly ok, but ideally replaced with a custom modal in future.
        if (date) {
            try {
                await Axios.post(`${API_URL}/api/admin/appointments`, {
                    customerId: selectedArtist.id, // Self-booking for block
                    artistId: selectedArtist.id,
                    date: date,
                    startTime: '09:00',
                    endTime: '17:00',
                    designTitle: 'BLOCKED',
                    status: 'cancelled', // Using cancelled/blocked status
                    notes: 'Day off / Unavailable'
                });
                showAlert("Success", "Date blocked successfully", "success");
                // Refresh would be ideal here
            } catch (error) {
                console.error("Error blocking date:", error);
                showAlert("Error", "Failed to block date", "danger");
            }
        }
    };

    // --- Render Helpers ---

    const renderProfileTab = () => (
        <div className="tab-content">
            <div className="form-grid">
                <div className="form-group">
                    <label>Name</label>
                    <input
                        type="text"
                        className={`form-input ${errors.name ? 'error' : ''}`}
                        value={formData.name || ''}
                        onChange={e => handleProfileInputChange('name', filterName(e.target.value).slice(0, 100))}
                        maxLength={100}
                    />
                    {errors.name && <small style={{ color: '#ef4444', display: 'block', marginTop: '4px', fontSize: '0.8rem' }}>{errors.name}</small>}
                </div>
                <div className="form-group">
                    <label>Specialization / Styles</label>
                    <MultiSelectDropdown 
                        options={TATTOO_STYLES}
                        selectedStr={formData.specialization}
                        onChange={(newVal) => setFormData({ ...formData, specialization: newVal })}
                        placeholder="Select styles"
                    />
                </div>
                <div className="form-group">
                    <label>Experience (Years)</label>
                    <input
                        type="number"
                        className="form-input"
                        value={formData.experience_years !== undefined ? formData.experience_years : ''}
                        onChange={e => handleProfileInputChange('experience_years', clampNumber(e.target.value, 0, 100))}
                    />
                </div>
                <div className="form-group">
                    <label>Commission Rate (%)</label>
                    <input className="form-input admin-st-10bc60ad" type="text" value="30" disabled/>
                </div>
            </div>
            <button className="btn btn-primary admin-st-194b571d" onClick={handleUpdateProfile}>
                <Save size={18} className="admin-st-7f4ee4f3" /> Save Changes
            </button>

            <div className="stats-row admin-st-40088812">
                <div className="stat-item">
                    <span className="stat-label">Total Appointments</span>
                    <span className="stat-count">{artistDetails.stats.total_appointments}</span>
                </div>
                <div className="stat-item">
                    <span className="stat-label">Est. Revenue</span>
                    <span className="stat-count">₱{artistDetails.stats.total_earnings?.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
            </div>
        </div>
    );

    const renderScheduleTab = () => (
        <div className="tab-content">
            <div className="admin-st-07952507">
                <h3>Upcoming Schedule</h3>
                <button className="btn btn-secondary" onClick={handleBlockDate}>Block Date</button>
            </div>
            <div className="table-responsive">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Time</th>
                            <th>Client</th>
                            <th>Service</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {artistDetails.appointments.map(apt => (
                            <tr key={apt.id}>
                                <td>{new Date(apt.appointment_date).toLocaleDateString()}</td>
                                <td>{apt.start_time}</td>
                                <td>{apt.client_name}</td>
                                <td>{apt.design_title}</td>
                                <td><span className={`badge status-${apt.status}`}>{apt.status}</span></td>
                            </tr>
                        ))}
                        {artistDetails.appointments.length === 0 && <tr><td colSpan="5" className="no-data">No appointments found</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderPortfolioTab = () => (
        <div className="tab-content">
            <div className="gallery-grid-admin">
                {artistDetails.portfolio.map(work => (
                    <div key={work.id} className="gallery-item-admin admin-st-24b531c6" onClick={() => openEditWork(work)}>
                        <img src={work.image_url} alt={work.title} />
                        <div className="gallery-overlay">
                            <button className="delete-btn" onClick={(e) => { e.stopPropagation(); handleDeleteWork(work.id); }}>
                                <Trash2 size={16} />
                            </button>
                            <span>{work.title}</span>
                            {work.price_estimate && <span className="admin-st-1998107d">₱{Number(work.price_estimate).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>}
                        </div>
                    </div>
                ))}
                {artistDetails.portfolio.length === 0 && <p className="no-data">Portfolio is empty.</p>}
            </div>
        </div>
    );

    const renderEarningsTab = () => {
        const earnings = artistDetails.appointments
            .filter(a => a.status === 'completed')
            .map(a => ({
                ...a,
                amount: a.price || 0, // Use actual price from appointment
                commission: (a.price || 0) * (artistDetails.profile.commission_rate || 0.6)
            }));

        return (
            <div className="tab-content">
                <div className="stats-row admin-st-129729d4">
                    <div className="stat-item">
                        <span className="stat-label">Total Commission</span>
                        <span className="stat-count">₱{earnings.reduce((sum, e) => sum + e.commission, 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                </div>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Client</th>
                            <th>Total Amount</th>
                            <th>Artist Commission ({((artistDetails.profile.commission_rate || 0.6) * 100)}%)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {earnings.map(e => (
                            <tr key={e.id}>
                                <td>{new Date(e.appointment_date).toLocaleDateString()}</td>
                                <td>{e.client_name}</td>
                                <td>₱{e.amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td className="admin-st-9e10b928">₱{Number(e.commission).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    // Compute autocomplete suggestions dynamically from the dataset
    const searchSuggestions = Array.from(new Set([
        ...staff.map(s => (s.id || '').toString()),
        ...staff.map(s => (s.name || '').trim()),
        ...staff.map(s => (s.email || '').trim())
    ])).filter(Boolean);

    return (
        <div className="admin-page-with-sidenav">
            <AdminSideNav />
            <div className="admin-page page-container-enter">
                <header className="portal-header">
                    <div className="header-title">
                        <h1>Staff Management</h1>
                    </div>
                </header>
                <p className="header-subtitle">Manage studio artists, managers, and administrative personnel</p>

                <div className="premium-filter-bar">
                    <div className="premium-search-box">
                        <Search size={18} className="text-muted" />
                        <input
                            type="text"
                            list="search-suggestions-staff"
                            placeholder="Search staff by name, email, or id..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            maxLength={100}
                        />
                        <datalist id="search-suggestions-staff">
                            {searchSuggestions.map(suggestion => (
                                <option key={suggestion} value={suggestion} />
                            ))}
                        </datalist>
                    </div>

                    <div className="premium-filters-group">
                        <div className="admin-st-5d251045">
                            <Filter size={16} />
                            <span>Filter by:</span>
                        </div>
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="premium-select-v2"
                        >
                            <option value="all">All Roles</option>
                            <option value="artist">Artist</option>
                            <option value="manager">Manager</option>
                            <option value="admin">Admin</option>
                        </select>

                        <div className="admin-st-a8cc8c61">
                            <SlidersHorizontal size={16} />
                            <span>Sort:</span>
                        </div>
                        <select
                            className="premium-select-v2"
                            defaultValue="name"
                        >
                            <option value="name">Name</option>
                            <option value="email">Email</option>
                        </select>
                    </div>
                </div>

                <div className="staff-stats-grid">
                    <div className="stat-card-v2 glass-card">
                        <div className="stat-icon-wrapper blue">
                            <Users size={24} />
                        </div>
                        <div className="stat-info-v2">
                            <span className="stat-label-v2">Total Staff</span>
                            <h3 className="stat-value-v2">{staff.length}</h3>
                            <div className="stat-trend-v2">Active Personnel</div>
                        </div>
                    </div>
                    <div className="stat-card-v2 glass-card">
                        <div className="stat-icon-wrapper purple">
                            <Palette size={24} />
                        </div>
                        <div className="stat-info-v2">
                            <span className="stat-label-v2">Artists</span>
                            <h3 className="stat-value-v2">{staff.filter(s => s.user_type === 'artist').length}</h3>
                            <div className="stat-trend-v2">Creative Team</div>
                        </div>
                    </div>
                    <div className="stat-card-v2 glass-card">
                        <div className="stat-icon-wrapper orange">
                            <UserCircle size={24} />
                        </div>
                        <div className="stat-info-v2">
                            <span className="stat-label-v2">Managers</span>
                            <h3 className="stat-value-v2">{staff.filter(s => s.user_type === 'manager').length}</h3>
                            <div className="stat-trend-v2">Operations</div>
                        </div>
                    </div>
                    <div className="stat-card-v2 glass-card">
                        <div className="stat-icon-wrapper green">
                            <Shield size={24} />
                        </div>
                        <div className="stat-info-v2">
                            <span className="stat-label-v2">Administrators</span>
                            <h3 className="stat-value-v2">{staff.filter(s => s.user_type === 'admin').length}</h3>
                            <div className="stat-trend-v2">System Control</div>
                        </div>
                    </div>
                </div>

                <div className="table-card-container glass-card">
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="5" className="no-data admin-st-3927920f">Loading staff...</td></tr>
                                ) : paginatedStaff.length > 0 ? (
                                    paginatedStaff.map((member) => (
                                        <tr key={member.id}>
                                            <td><strong>{member.name}</strong></td>
                                            <td>{member.email}</td>
                                            <td><span className={`badge role-${member.user_type}`}>{member.role}</span></td>
                                            <td><span className="badge status-active">Active</span></td>
                                            <td>
                                                {member.user_type === 'artist' && (
                                                    <button className="btn btn-primary" onClick={() => openArtistManager(member)}>
                                                        Manage Artist
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="no-data">No staff members found</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        itemsPerPage={itemsPerPage}
                        onItemsPerPageChange={(newVal) => {
                            setItemsPerPage(newVal);
                            setCurrentPage(1);
                        }}
                        totalItems={filteredStaff.length}
                        unit="staff"
                    />
                </div>

                {/* Detailed Artist Manager Overlay */}
                {artistManagerModal.mounted && selectedArtist && (
                    <div className={`modal-overlay ${artistManagerModal.visible ? 'open' : ''}`} onClick={closeModal}>
                        <div className="modal-content xl admin-st-980ed307" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <div className="admin-flex-center admin-gap-20">
                                    <div className="admin-st-d84f98fc">
                                        <User size={28} />
                                    </div>
                                    <div>
                                        <h2 className="admin-m-0">{selectedArtist.name}</h2>
                                        <div className="admin-st-df628aac">
                                            <span className={`${`badge role-${selectedArtist.user_type} admin-st-500d49ab`} `} >{selectedArtist.role}</span>
                                            <span className="admin-st-3bf8f64b">Staff ID: #STR-{selectedArtist.id.toString().padStart(4, '0')}</span>
                                        </div>
                                    </div>
                                </div>
                                <button className="close-btn" onClick={closeModal}><X size={24} /></button>
                            </div>

                            <div className="settings-tabs admin-st-23c98a22">
                                <button className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
                                    <UserCircle size={16} /> Profile Information
                                </button>
                                <button className={`tab-button ${activeTab === 'schedule' ? 'active' : ''}`} onClick={() => setActiveTab('schedule')}>
                                    <Calendar size={16} /> Procedure Schedule
                                </button>
                                <button className={`tab-button ${activeTab === 'portfolio' ? 'active' : ''}`} onClick={() => setActiveTab('portfolio')}>
                                    <Palette size={16} /> Media Portfolio
                                </button>
                                <button className={`tab-button ${activeTab === 'earnings' ? 'active' : ''}`} onClick={() => setActiveTab('earnings')}>
                                    <PhilippinePeso size={16} /> Remittance Log
                                </button>
                            </div>

                            <div className="modal-body admin-st-89c672df">
                                {loadingDetails ? (
                                    <div className="admin-st-578fa77f">
                                        <div className="loading-spinner"></div>
                                        <p>Fetching performance metrics...</p>
                                    </div>
                                ) : (
                                    <div className="fade-in">
                                        {activeTab === 'profile' && renderProfileTab()}
                                        {activeTab === 'schedule' && renderScheduleTab()}
                                        {activeTab === 'portfolio' && renderPortfolioTab()}
                                        {activeTab === 'earnings' && renderEarningsTab()}
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={closeModal}>Close Management Portal</button>
                                {activeTab === 'profile' && (
                                    <button className="btn btn-primary admin-st-f9a92399" onClick={handleUpdateProfile} >
                                        <Save size={18} /> Sync Account Updates
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Portfolio Content Editor Modal */}
                {editWorkModal.mounted && selectedWork && (
                    <div className={`${`modal-overlay ${editWorkModal.visible ? 'open' : ''} admin-st-63d3f2c7`} `} onClick={closeEditWork} >
                        <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <div>
                                    <h2 className="admin-m-0">Review Portfolio Asset</h2>
                                    <p className="admin-st-9b9985a8">Update display metadata and gallery positioning</p>
                                </div>
                                <button className="close-btn" onClick={closeEditWork}><X size={24} /></button>
                            </div>
                            <form onSubmit={handleSaveWork}>
                                <div className="modal-body admin-st-cc3b3598">
                                    <div className="admin-st-ede7eeea">
                                        {/* Left: Visual Asset */}
                                        <div className="admin-st-52f745d6">
                                            <div className="admin-st-721d662a">
                                                <img src={selectedWork.image_url} alt="Preview" className="admin-st-2aa2aed6" />
                                            </div>
                                            <div className="form-group admin-st-cd631299">
                                                <label className="admin-st-32231f0d">
                                                    <input
                                                        type="checkbox"
                                                        className="admin-st-95e08695"
                                                        checked={workFormData.isPublic}
                                                        onChange={e => setWorkFormData({ ...workFormData, isPublic: e.target.checked })}
                                                    />
                                                    Visible in Public Studio Gallery
                                                </label>
                                            </div>
                                        </div>

                                        {/* Right: Metadata */}
                                        <div className="admin-st-ff43421e">
                                            <div className="form-group">
                                                <label className="admin-st-19644797">Asset Title</label>
                                                <input
                                                    type="text"
                                                    className={`form-input ${errors.work_title ? 'error' : ''}`}
                                                    value={workFormData.title}
                                                    onChange={e => handleWorkInputChange('title', filterName(e.target.value).slice(0, 100))}
                                                    required
                                                    maxLength={100}
                                                />
                                                {errors.work_title && <small style={{ color: '#ef4444', display: 'block', marginTop: '4px', fontSize: '0.8rem' }}>{errors.work_title}</small>}
                                            </div>
                                            <div className="admin-st-2f580e88">
                                                <div className="form-group">
                                                    <label className="admin-st-19644797">Style Category</label>
                                                    <MultiSelectDropdown 
                                                        options={TATTOO_STYLES}
                                                        selectedStr={workFormData.category}
                                                        onChange={(newVal) => setWorkFormData({ ...workFormData, category: newVal })}
                                                        placeholder="Select categories"
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label className="admin-st-19644797">Market Valuation (₱)</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        className="form-input"
                                                        value={workFormData.priceEstimate}
                                                        onChange={e => handleWorkInputChange('priceEstimate', filterMoney(e.target.value))}
                                                    />
                                                </div>
                                            </div>
                                            <div className="form-group">
                                                <label className="admin-st-19644797">Project Narrative</label>
                                                <textarea
                                                    className="form-input admin-st-7b393fc7"
                                                    rows="6"
                                                    value={workFormData.description}
                                                    onChange={e => handleWorkInputChange('description', e.target.value.substring(0, 500))}
                                                    maxLength={500}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={closeEditWork}>Discard Changes</button>
                                    <button type="submit" className="btn btn-primary admin-st-6948e5f9"><Save size={18} /> Update Content</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                <ConfirmModal
                    {...confirmDialog}
                    onClose={() => setConfirmDialog({ isOpen: false })}
                />
            </div>
        </div>
    );
}

export default AdminStaff;
