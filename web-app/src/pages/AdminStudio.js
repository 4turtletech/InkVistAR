import React, { useState, useEffect } from 'react';
import Axios from 'axios';
import { useLocation } from 'react-router-dom';
import { MapPin, Clock, Users, Power, Trash2, Edit2, Plus, X, Search, Filter, SlidersHorizontal } from 'lucide-react';
import AdminSideNav from '../components/AdminSideNav';
import './PortalStyles.css';
import './AdminStyles.css';
import { API_URL } from '../config';
import ConfirmModal from '../components/ConfirmModal';

import AdminSettings from './AdminSettings';
import AdminReviews from './AdminReviews';
import './AdminUsers.css'; // Reusing styles

function AdminStudio() {
    const location = useLocation();
    const [activeTab, setActiveTab] = useState('branches');

    // Handle incoming URL tab parameter (e.g. from notifications)
    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const tab = queryParams.get('tab');
        if (tab) {
            setActiveTab(tab);
        }
    }, [location.search]);

    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [branchModal, setBranchModal] = useState({ mounted: false, visible: false });
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null, type: 'info', isAlert: false });
    const [errors, setErrors] = useState({});

    const validateField = (name, value) => {
        let errorMsg = "";
        if (name === 'name' && !value) errorMsg = "Branch Name is required";
        if (name === 'address' && !value) errorMsg = "Address is required";
        if (name === 'capacity') {
            if (!value) errorMsg = "Capacity is required";
            else if (isNaN(value) || value <= 0) errorMsg = "Capacity must be a positive number";
        }
        if (name === 'operating_hours' && !value) errorMsg = "Operating hours are required";
        setErrors(prev => ({ ...prev, [name]: errorMsg }));
        return errorMsg === "";
    };

    const showAlert = (title, message, type = 'info') => {
        setConfirmDialog({ isOpen: true, title, message, type, isAlert: true, onConfirm: () => setConfirmDialog(prev => ({ ...prev, isOpen: false })) });
    };
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        phone: '',
        operating_hours: '09:00 - 20:00',
        capacity: 50
    });
    const [editingId, setEditingId] = useState(null);
    const [filterStatus, setFilterStatus] = useState('active');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchBranches();
    }, [filterStatus]);

    // Modal animation handlers
    const openModal = () => {
        setBranchModal({ mounted: true, visible: false });
        setTimeout(() => setBranchModal({ mounted: true, visible: true }), 10);
    };

    const closeModal = () => {
        setErrors({});
        setBranchModal(prev => ({ ...prev, visible: false }));
        setTimeout(() => {
            setBranchModal({ mounted: false, visible: false });
        }, 400);
    };

    const fetchBranches = async () => {
        try {
            setLoading(true);
            const res = await Axios.get(`${API_URL}/api/admin/branches?status=${filterStatus}`);
            if (res.data && res.data.success && Array.isArray(res.data.data)) {
                setBranches(res.data.data);
            } else {
                setBranches([]);
            }
            setLoading(false);
        } catch (error) {
            console.error("Error fetching branches:", error);
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        
        const isNameValid = validateField('name', formData.name);
        const isAddressValid = validateField('address', formData.address);
        const isCapacityValid = validateField('capacity', formData.capacity);
        const isOpsValid = validateField('operating_hours', formData.operating_hours);
        
        if (!isNameValid || !isAddressValid || !isCapacityValid || !isOpsValid) return;
        
        try {
            if (editingId) {
                await Axios.put(`${API_URL}/api/admin/branches/${editingId}`, formData);
            } else {
                await Axios.post(`${API_URL}/api/admin/branches`, formData);
            }
            closeModal();
            setEditingId(null);
            setFormData({ name: '', address: '', phone: '', operating_hours: '09:00 - 20:00', capacity: 50 });
            fetchBranches();
            showAlert("Success", "Branch saved successfully", "success");
        } catch (error) {
            console.error("Error saving branch:", error);
            showAlert("Error", "Failed to save branch", "danger");
        }
    };

    const toggleStatus = async (branch) => {
        const newStatus = branch.status === 'Open' ? 'Closed' : 'Open';
        try {
            await Axios.put(`${API_URL}/api/admin/branches/${branch.id}`, { status: newStatus });
            fetchBranches();
        } catch (error) {
            console.error("Error updating status:", error);
        }
    };

    const handleDelete = (id) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Delete Branch',
            message: 'Are you sure you want to delete this branch?',
            onConfirm: async () => {
                setConfirmDialog({ isOpen: false });
                try {
                    await Axios.delete(`${API_URL}/api/admin/branches/${id}`);
                    fetchBranches();
                } catch (error) {
                    console.error("Error deleting branch:", error);
                }
            }
        });
    };

    const handleRestore = async (id) => {
        try {
            await Axios.put(`${API_URL}/api/admin/branches/${id}/restore`);
            fetchBranches();
        } catch (error) {
            console.error("Error restoring branch:", error);
        }
    };

    const openEditModal = (branch) => {
        setEditingId(branch.id);
        setErrors({});
        setFormData({
            name: branch.name,
            address: branch.address,
            phone: branch.phone,
            operating_hours: branch.operating_hours,
            capacity: branch.capacity
        });
        openModal();
    };

    const openAddModal = () => {
        setEditingId(null);
        setErrors({});
        setFormData({ name: '', address: '', phone: '', operating_hours: '09:00 - 20:00', capacity: 50 });
        openModal();
    };

    const filteredBranches = branches.filter(b => 
        b.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        b.address.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="admin-page-with-sidenav">
            <AdminSideNav />
            <div className="admin-page page-container-enter">
                <header className="portal-header">
                    <h1>Studio Settings</h1>
                    {activeTab === 'branches' && (
                        <button className="btn btn-primary" onClick={openAddModal}><Plus size={18} className="admin-st-c02c7d9c"/> Add Branch</button>
                    )}
                </header>

                <div className="admin-st-d14eab7d">
                    <button 
                        style={{ padding: '1rem 0', background: 'transparent', border: 'none', borderBottom: activeTab === 'branches' ? '2px solid #be9055' : '2px solid transparent', color: activeTab === 'branches' ? '#1e293b' : '#64748b', fontWeight: 'bold', cursor: 'pointer', outline: 'none' }}
                        onClick={() => setActiveTab('branches')}
                    >
                        Branches Directory
                    </button>
                    <button 
                        style={{ padding: '1rem 0', background: 'transparent', border: 'none', borderBottom: activeTab === 'settings' ? '2px solid #be9055' : '2px solid transparent', color: activeTab === 'settings' ? '#1e293b' : '#64748b', fontWeight: 'bold', cursor: 'pointer', outline: 'none' }}
                        onClick={() => setActiveTab('settings')}
                    >
                        System Preferences
                    </button>
                    <button 
                        style={{ padding: '1rem 0', background: 'transparent', border: 'none', borderBottom: activeTab === 'reviews' ? '2px solid #be9055' : '2px solid transparent', color: activeTab === 'reviews' ? '#1e293b' : '#64748b', fontWeight: 'bold', cursor: 'pointer', outline: 'none' }}
                        onClick={() => setActiveTab('reviews')}
                    >
                        Customer Reviews
                    </button>
                </div>

                {activeTab === 'branches' ? (
                    <>
                        <div className="premium-filter-bar premium-filter-bar--stacked">
                    <div className="premium-search-box premium-search-box--full">
                        <Search size={16} className="text-muted" />
                        <input
                            type="text"
                            placeholder="Search branches by name or address..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="premium-filters-row">
                        <div className="premium-filter-item">
                            <Filter size={16} />
                            <span>Status:</span>
                            <select
                                className="premium-select-v2"
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                            >
                                <option value="active">Active Branches</option>
                                <option value="deleted">Deleted Branches</option>
                            </select>
                        </div>

                        <div className="premium-filter-item">
                            <SlidersHorizontal size={16} />
                            <span>Sort:</span>
                            <select className="premium-select-v2">
                                <option value="name">Name</option>
                                <option value="capacity">Capacity</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="stats-row">
                    <div className="stat-item">
                        <span className="stat-label">Total Branches</span>
                        <span className="stat-count">{branches.length}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Open Now</span>
                        <span className="stat-count">{branches.filter(b => b.status === 'Open').length}</span>
                    </div>
                </div>

                <div className="portal-content">
                        <div className="table-card">
                            <div className="table-responsive">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th className="admin-st-a06603ef">Branch Name</th>
                                            <th>Address</th>
                                            <th>Operating Hours</th>
                                            <th>Capacity Tracking</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr><td colSpan="6" className="no-data admin-st-3927920f">Loading branches...</td></tr>
                                        ) : filteredBranches && filteredBranches.length > 0 ? filteredBranches.map((branch) => {
                                            if (!branch) return null;
                                            const capacity = Number(branch.capacity) || 1;
                                            const occupancy = Number(branch.current_occupancy) || 0;
                                            const occupancyPercent = Math.min((occupancy / capacity) * 100, 100);
                                            return (
                                                <tr key={branch.id}>
                                                    <td><strong>{branch.name}</strong><br/><small className="admin-st-169f06e0">{branch.phone}</small></td>
                                                    <td><div className="admin-st-5e3a23bb"><MapPin size={14}/> {branch.address}</div></td>
                                                    <td><div className="admin-st-5e3a23bb"><Clock size={14}/> {branch.operating_hours}</div></td>
                                                    <td>
                                                        <div className="admin-flex-center admin-gap-10">
                                                            <div className="admin-st-e03150eb">
                                                                <div style={{ width: `${occupancyPercent || 0}%`, height: '100%', background: occupancyPercent > 90 ? '#ef4444' : '#10b981', borderRadius: '4px' }}></div>
                                                            </div>
                                                            <span className="admin-st-e7992da2">{branch.current_occupancy}/{branch.capacity}</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className={`badge status-${branch.status.toLowerCase() === 'open' ? 'active' : 'inactive'}`}>
                                                            {branch.status}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div className="admin-st-ce770332">
                                                            {filterStatus === 'active' ? (
                                                                <>
                                                                    <button className="action-btn" onClick={() => toggleStatus(branch)} title="Toggle Status" style={{backgroundColor: branch.status === 'Open' ? '#f59e0b' : '#10b981'}}><Power size={16}/></button>
                                                                    <button className="action-btn edit-btn" onClick={() => openEditModal(branch)}><Edit2 size={16}/></button>
                                                                    <button className="action-btn delete-btn" onClick={() => handleDelete(branch.id)}><Trash2 size={16}/></button>
                                                                </>
                                                            ) : (
                                                                <button className="action-btn view-btn admin-st-f1f5ea52" onClick={() => handleRestore(branch.id)}>Restore</button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        }) : (
                                            <tr><td colSpan="6" className="no-data">No branches found. Add one to get started.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                </div>

                {/* Add/Edit Modal */}
                {branchModal.mounted && (
                    <div className={`modal-overlay ${branchModal.visible ? 'open' : ''}`} onClick={closeModal}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <div className="admin-flex-center admin-gap-15">
                                    <div className="admin-st-c911153f">
                                        <MapPin size={20} className="text-bronze" />
                                    </div>
                                    <div>
                                        <h2 className="admin-m-0">{editingId ? 'Modify Studio Branch' : 'Establish New Branch'}</h2>
                                        <p className="admin-st-925e4e02">Configure operational studio location</p>
                                    </div>
                                </div>
                                <button className="close-btn" onClick={closeModal}><X size={24}/></button>
                            </div>
                            <form onSubmit={handleSave}>
                                <div className="modal-body admin-st-7cea880d">
                                    <div className="form-group admin-mb-20">
                                        <label className="premium-label">Official Branch Designation</label>
                                        <input type="text" name="name" className={`form-input ${errors.name ? 'error' : ''}`} required value={formData.name} onChange={e => { setFormData({...formData, name: e.target.value}); validateField('name', e.target.value); }} placeholder="e.g., Downtown Sanctuary, Westside Hub" />
                                        {errors.name && <small style={{ color: '#ef4444', display: 'block', marginTop: '4px', fontSize: '0.8rem' }}>{errors.name}</small>}
                                    </div>
                                    <div className="form-group admin-mb-20">
                                        <label className="premium-label">Geographic Location (Full Address)</label>
                                        <input type="text" name="address" className={`form-input ${errors.address ? 'error' : ''}`} required value={formData.address} onChange={e => { setFormData({...formData, address: e.target.value}); validateField('address', e.target.value); }} />
                                        {errors.address && <small style={{ color: '#ef4444', display: 'block', marginTop: '4px', fontSize: '0.8rem' }}>{errors.address}</small>}
                                    </div>
                                    <div className="admin-st-c200c71d">
                                        <div className="form-group">
                                            <label className="premium-label">Contact Hotlink (Phone)</label>
                                            <input type="text" name="phone" className={`form-input ${errors.phone ? 'error' : ''}`} value={formData.phone} onChange={e => { setFormData({...formData, phone: e.target.value}); validateField('phone', e.target.value); }} />
                                            {errors.phone && <small style={{ color: '#ef4444', display: 'block', marginTop: '4px', fontSize: '0.8rem' }}>{errors.phone}</small>}
                                        </div>
                                        <div className="form-group">
                                            <label className="premium-label">Operational Capacity</label>
                                            <input type="number" name="capacity" className={`form-input ${errors.capacity ? 'error' : ''}`} required value={formData.capacity} onChange={e => { setFormData({...formData, capacity: e.target.value}); validateField('capacity', e.target.value); }} />
                                            {errors.capacity && <small style={{ color: '#ef4444', display: 'block', marginTop: '4px', fontSize: '0.8rem' }}>{errors.capacity}</small>}
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="premium-label">Standard Operating Protocol (Hours)</label>
                                        <input type="text" name="operating_hours" className={`form-input ${errors.operating_hours ? 'error' : ''}`} placeholder="e.g. 09:00 - 20:00" value={formData.operating_hours} onChange={e => { setFormData({...formData, operating_hours: e.target.value}); validateField('operating_hours', e.target.value); }} />
                                        {errors.operating_hours && <small style={{ color: '#ef4444', display: 'block', marginTop: '4px', fontSize: '0.8rem' }}>{errors.operating_hours}</small>}
                                    </div>
                                    
                                    <div className="glass-panel admin-st-194b571d">
                                        <p className="admin-st-76a35748">
                                            * Modifying branch details will update all associated staff records and public-facing portal listings instantly.
                                        </p>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                                    <button type="submit" className="btn btn-primary admin-st-6948e5f9">
                                        {editingId ? 'Update Branch' : 'Finalize Creation'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
                </>
                ) : activeTab === 'settings' ? (
                    <AdminSettings />
                ) : activeTab === 'reviews' ? (
                    <AdminReviews />
                ) : null}

                <ConfirmModal 
                    {...confirmDialog} 
                    onClose={() => setConfirmDialog({ isOpen: false })} 
                />
            </div>
        </div>
    );
}

export default AdminStudio;