import React, { useState, useEffect } from 'react';
import Axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import AdminSideNav from '../components/AdminSideNav';
import './AdminUsers.css';
import './PortalStyles.css';
import './AdminStyles.css';
import ConfirmModal from '../components/ConfirmModal';
import Pagination from '../components/Pagination';
import { API_URL } from '../config';
import { Search, Filter, SlidersHorizontal, UserPlus, Users, Palette, UserCircle, CheckCircle, X } from 'lucide-react';

function AdminUsers() {
    const navigate = useNavigate();
    const location = useLocation();
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('all');
    const [filterStatus, setFilterStatus] = useState('active');
    const [sortBy, setSortBy] = useState('name');
    const [loading, setLoading] = useState(true);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [selectedUser, setSelectedUser] = useState(null);

    // Modal state for animations
    const [userModal, setUserModal] = useState({ mounted: false, visible: false });
    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: null,
        type: 'danger',
        isAlert: false
    });

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        user_type: 'customer',
        status: 'active',
        password: ''
    });

    // Modal animation handlers
    const openModal = () => {
        setUserModal({ mounted: true, visible: false });
        setTimeout(() => setUserModal({ mounted: true, visible: true }), 10);
    };

    const closeModal = () => {
        setUserModal(prev => ({ ...prev, visible: false }));
        setTimeout(() => {
            setUserModal({ mounted: false, visible: false });
            setSelectedUser(null);
        }, 400); // Match CSS transition duration
    };

    const showAlert = (title, message, type = 'info') => {
        setConfirmDialog({
            isOpen: true,
            title,
            message,
            type,
            isAlert: true,
            onConfirm: () => setConfirmDialog(prev => ({ ...prev, isOpen: false }))
        });
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        filterAndSortUsers();
    }, [users, searchTerm, filterRole, filterStatus, sortBy]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await Axios.get(`${API_URL}/api/admin/users?status=${filterStatus}`);
            if (response.data.success) {
                setUsers(response.data.data);
            }
            setLoading(false);
        } catch (error) {
            console.error("Error fetching users:", error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [filterStatus]); // Refetch when status filter changes

    const filterAndSortUsers = () => {
        let filtered = users.filter(user => {
            const matchesSearch =
                user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (user.phone && user.phone.includes(searchTerm));

            const matchesRole = filterRole === 'all' || user.user_type === filterRole;

            return matchesSearch && matchesRole;
        });

        // Sort
        if (sortBy === 'name') {
            filtered.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sortBy === 'email') {
            filtered.sort((a, b) => a.email.localeCompare(b.email));
        } else if (sortBy === 'role') {
            filtered.sort((a, b) => a.user_type.localeCompare(b.user_type));
        }

        setFilteredUsers(filtered);
        setCurrentPage(1); // Reset to first page on filter change
    };

    // Pagination logic
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handleEdit = (user) => {
        setSelectedUser(user);
        setFormData({
            name: user.name,
            email: user.email,
            phone: user.phone || '',
            user_type: user.user_type,
            status: user.is_deleted ? 'inactive' : 'active',
            password: ''
        });
        openModal();
    };

    const handleDelete = (userId) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Deactivate User',
            message: 'Are you sure you want to deactivate this user?',
            onConfirm: async () => {
                setConfirmDialog({ isOpen: false });
                try {
                    await Axios.delete(`${API_URL}/api/admin/users/${userId}`);
                    setUsers(users.filter(u => u.id !== userId));
                } catch (error) {
                    console.error("Error deactivating user:", error);
                }
            }
        });
    };

    const handleRestore = async (userId) => {
        try {
            await Axios.put(`${API_URL}/api/admin/users/${userId}/restore`);
            setUsers(users.filter(u => u.id !== userId));
        } catch (error) {
            console.error("Error restoring user:", error);
        }
    };

    const handlePermanentDelete = (userId) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Permanent Deletion',
            message: 'This will PERMANENTLY delete the user and cannot be undone. Continue?',
            confirmText: 'Permanently Delete',
            onConfirm: async () => {
                setConfirmDialog({ isOpen: false });
                try {
                    await Axios.delete(`${API_URL}/api/admin/users/${userId}/permanent`);
                    setUsers(users.filter(u => u.id !== userId));
                } catch (error) {
                    console.error("Error deleting user:", error);
                }
            }
        });
    };

    const handleSave = async () => {
        try {
            if (selectedUser) {
                // Update existing user via API
                await Axios.put(`${API_URL}/api/admin/users/${selectedUser.id}`, {
                    name: formData.name,
                    email: formData.email,
                    type: formData.user_type,
                    phone: formData.phone,
                    status: formData.status
                });
                showAlert("Success", "User updated successfully!", "success");
            } else {
                // Add new user via API
                if (!formData.password) {
                    showAlert("Password Required", "Password is required for new users", "warning");
                    return;
                }
                await Axios.post(`${API_URL}/api/admin/users`, {
                    name: formData.name,
                    email: formData.email,
                    password: formData.password,
                    type: formData.user_type,
                    phone: formData.phone,
                    status: formData.status
                });
                showAlert("Success", "User added successfully!", "success");
            }
            fetchUsers(); // Refresh list from database
            closeModal();
            setSelectedUser(null);
            setFormData({
                name: '',
                email: '',
                phone: '',
                user_type: 'customer',
                status: 'active',
                password: ''
            });
        } catch (error) {
            console.error("Error saving user:", error);
            showAlert("Error", 'Error saving user: ' + (error.response?.data?.message || error.message), "danger");
        }
    };

    const handleAddNew = () => {
        setSelectedUser(null);
        setFormData({
            name: '',
            email: '',
            phone: '',
            user_type: 'customer',
            status: 'active',
            password: ''
        });
        openModal();
    };

    return (
        <div className="admin-page-with-sidenav">
            <AdminSideNav />
            <div className="admin-page page-container-enter">
                <header className="admin-users-header">
                    <div className="header-title-area">
                        <h1>User Management</h1>
                        <p>Manage platform users, roles, and account status</p>
                    </div>
                    <div className="header-actions-group">
                        <button className="btn-indigo" onClick={handleAddNew}>
                            <UserPlus size={18} /> Add New User
                        </button>
                    </div>
                </header>

                <div className="premium-filter-bar">
                    <div className="premium-search-box">
                        <Search size={18} className="text-muted" />
                        <input
                            type="text"
                            placeholder="Search by name, email, or phone..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="premium-filters-group">
                        <div className="admin-st-5d251045">
                            <Filter size={16} />
                            <span>Filter by:</span>
                        </div>
                        <select
                            value={filterRole}
                            onChange={(e) => setFilterRole(e.target.value)}
                            className="premium-select-v2"
                        >
                            <option value="all">All Roles</option>
                            <option value="admin">Admin</option>
                            <option value="artist">Artist</option>
                            <option value="manager">Manager</option>
                            <option value="customer">Customer</option>
                        </select>

                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="premium-select-v2"
                        >
                            <option value="active">Active Users</option>
                            <option value="deleted">Deactivated Users</option>
                        </select>

                        <div className="admin-st-a8cc8c61">
                            <SlidersHorizontal size={16} />
                            <span>Sort:</span>
                        </div>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="premium-select-v2"
                        >
                            <option value="name">Name</option>
                            <option value="email">Email</option>
                            <option value="role">Role</option>
                        </select>
                    </div>
                </div>

                <div className="users-stats-grid">
                    <div className="stat-card-v2 glass-card">
                        <div className="stat-icon-wrapper blue">
                            <Users size={24} />
                        </div>
                        <div className="stat-info-v2">
                            <span className="stat-label-v2">Total Users</span>
                            <h3 className="stat-value-v2">{users.length}</h3>
                            <div className="stat-trend-v2">Platform Wide</div>
                        </div>
                    </div>
                    <div className="stat-card-v2 glass-card">
                        <div className="stat-icon-wrapper green">
                            <CheckCircle size={24} />
                        </div>
                        <div className="stat-info-v2">
                            <span className="stat-label-v2">Filtered Results</span>
                            <h3 className="stat-value-v2">{filteredUsers.length}</h3>
                            <div className="stat-trend-v2">Current View</div>
                        </div>
                    </div>
                    <div className="stat-card-v2 glass-card">
                        <div className="stat-icon-wrapper purple">
                            <Palette size={24} />
                        </div>
                        <div className="stat-info-v2">
                            <span className="stat-label-v2">Active Artists</span>
                            <h3 className="stat-value-v2">{users.filter(u => u.user_type === 'artist').length}</h3>
                            <div className="stat-trend-v2">Studio Staff</div>
                        </div>
                    </div>
                    <div className="stat-card-v2 glass-card">
                        <div className="stat-icon-wrapper orange">
                            <UserCircle size={24} />
                        </div>
                        <div className="stat-info-v2">
                            <span className="stat-label-v2">Total Customers</span>
                            <h3 className="stat-value-v2">{users.filter(u => u.user_type === 'customer').length}</h3>
                            <div className="stat-trend-v2">Client Base</div>
                        </div>
                    </div>
                </div>

                <div className="table-card-container glass-card">
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Phone</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="7" className="no-data admin-st-3927920f">Loading users...</td></tr>
                                ) : paginatedUsers.length > 0 ? (
                                    paginatedUsers.map((user) => (
                                        <tr key={user.id}>
                                            <td>#{user.id}</td>
                                            <td>{user.name}</td>
                                            <td>{user.email}</td>
                                            <td>{user.phone || '-'}</td>
                                            <td>
                                                <span className={`badge role-${user.user_type}`}>
                                                    {user.user_type}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`badge status-${user.is_deleted ? 'inactive' : 'active'}`}>
                                                    {user.is_deleted ? 'Inactive' : 'Active'}
                                                </span>
                                            </td>
                                            <td className="actions-cell">
                                                <button className="action-btn edit-btn" onClick={() => handleEdit(user)}>
                                                    Review
                                                </button>
                                                {!user.is_deleted ? (
                                                    <button className="action-btn delete-btn" onClick={() => handleDelete(user.id)}>
                                                        Deactivate
                                                    </button>
                                                ) : (
                                                    <>
                                                        <button className="action-btn view-btn" onClick={() => handleRestore(user.id)} className="admin-st-f1f5ea52">Restore</button>
                                                        <button className="action-btn delete-btn" onClick={() => handlePermanentDelete(user.id)} className="admin-st-2cf55662">Delete</button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="no-data">No users found</td>
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
                        totalItems={filteredUsers.length}
                        unit="users"
                    />
                </div>

                {/* Modal */}
                {userModal.mounted && (
                    <div className={`modal-overlay ${userModal.visible ? 'open' : ''}`} onClick={closeModal}>
                        <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2>{selectedUser ? 'Edit User Profile' : 'Create New User'}</h2>
                                <button className="close-btn" onClick={closeModal}><X size={24} /></button>
                            </div>
                            <div className="modal-body">
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="premium-label">Full Name *</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="form-input"
                                            placeholder="Full Name"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="premium-label">Email Address *</label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            className="form-input"
                                            placeholder="email@example.com"
                                        />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="premium-label">Phone Number</label>
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            className="form-input"
                                            placeholder="Phone"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="premium-label">User Role *</label>
                                        <select
                                            value={formData.user_type}
                                            onChange={(e) => setFormData({ ...formData, user_type: e.target.value })}
                                            className="form-input"
                                            disabled={selectedUser?.email === 'admin@inkvistar.com'}
                                        >
                                            <option value="customer">Customer (Client)</option>
                                            <option value="artist">Artist (Staff)</option>
                                            <option value="manager">Manager</option>
                                            <option value="admin">System Admin</option>
                                        </select>
                                        {selectedUser?.email === 'admin@inkvistar.com' && (
                                            <small className="admin-st-d0cf404f">Primary admin role protected</small>
                                        )}
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="premium-label">Account Status</label>
                                        <select
                                            value={formData.status}
                                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                            className="form-input"
                                        >
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive / Deactivated</option>
                                            <option value="suspended">Suspended</option>
                                        </select>
                                    </div>
                                    {!selectedUser && (
                                        <div className="form-group">
                                            <label className="premium-label">Initial Password *</label>
                                            <input
                                                type="password"
                                                value={formData.password || ''}
                                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                className="form-input"
                                                placeholder="Secure password"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="modal-footer">
                                <div className="admin-st-c6588e1a">
                                    {selectedUser && selectedUser.email !== 'admin@inkvistar.com' && (
                                        <button
                                            className="action-btn delete-btn admin-st-af6a31d1"
                                            onClick={() => {
                                                handlePermanentDelete(selectedUser.id);
                                                closeModal();
                                            }}
                                        >
                                            Delete Forever
                                        </button>
                                    )}
                                </div>
                                <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                                <button className="btn btn-primary admin-st-9be3106b" onClick={handleSave} >
                                    {selectedUser ? 'Save Changes' : 'Create User'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                <ConfirmModal
                    isOpen={confirmDialog.isOpen}
                    title={confirmDialog.title}
                    message={confirmDialog.message}
                    confirmText={confirmDialog.confirmText}
                    onConfirm={confirmDialog.onConfirm}
                    onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
                    type={confirmDialog.type}
                    isAlert={confirmDialog.isAlert}
                />
            </div>
        </div>
    );
}

export default AdminUsers;
