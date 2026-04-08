import React, { useState, useEffect } from 'react';
import Axios from 'axios';
import { Play, CheckCircle, Upload, Save, X, Package, FileText, Image as ImageIcon, Clock, Search, Calendar, Plus } from 'lucide-react';
import ArtistSideNav from '../components/ArtistSideNav';
import ConfirmModal from '../components/ConfirmModal';
import Pagination from '../components/Pagination';
import './PortalStyles.css';
import { API_URL } from '../config';

function ArtistSessions() {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [activeSession, setActiveSession] = useState(null);
    const [sessionData, setSessionData] = useState({
        notes: '',
        beforePhoto: null,
        afterPhoto: null
    });

    const [sessionMaterials, setSessionMaterials] = useState([]);
    const [sessionCost, setSessionCost] = useState(0);
    const [inventoryItems, setInventoryItems] = useState([]);
    const [serviceKits, setServiceKits] = useState({});
    const [addingMaterial, setAddingMaterial] = useState(false);
    const [inventorySearch, setInventorySearch] = useState('');
    const [isCompletingSession, setIsCompletingSession] = useState(false);

    const [sessionModal, setSessionModal] = useState({ mounted: false, visible: false });
    const [inventoryModal, setInventoryModal] = useState({ mounted: false, visible: false });
    const [isSaving, setIsSaving] = useState(false);
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: null,
        type: 'danger',
        isAlert: false
    });

    const showAlert = (title, message, type = 'info') => {
        setConfirmModal({
            isOpen: true,
            title,
            message,
            type,
            isAlert: true,
            onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
        });
    };

    const [user] = useState(() => {
        const saved = localStorage.getItem('user');
        return saved ? JSON.parse(saved) : null;
    });
    const artistId = user ? user.id : 1;

    const fetchSessions = async () => {
        try {
            // Fetch all appointments for the artist, then filter by today locally
            const res = await Axios.get(`${API_URL}/api/artist/${artistId}/appointments`);
            if (res.data.success) {
                // Use local date instead of UTC to avoid timezone issues
                const now = new Date();
                const today = now.getFullYear() + '-' +
                    String(now.getMonth() + 1).padStart(2, '0') + '-' +
                    String(now.getDate()).padStart(2, '0');
                const todaySessions = res.data.appointments.filter(a => {
                    const appointmentDate = typeof a.appointment_date === 'string'
                        ? a.appointment_date.split('T')[0]
                        : new Date(a.appointment_date).toISOString().split('T')[0];
                    return appointmentDate === today && a.status !== 'cancelled';
                });
                setSessions(todaySessions);
            }
            setLoading(false);
        } catch (e) {
            console.error(e);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSessions();
    }, [artistId]);

    useEffect(() => {
        if (activeSession) {
            fetchInventory();
            fetchServiceKits();
            if (activeSession.status === 'in_progress' || activeSession.status === 'completed') {
                fetchSessionMaterials(activeSession.id);
            }
        }
    }, [activeSession?.id, activeSession?.status]);

    const fetchInventory = async () => {
        try {
            const res = await Axios.get(`${API_URL}/api/admin/inventory`);
            if (res.data.success && res.data.data) {
                setInventoryItems(res.data.data.filter(item => item.current_stock > 0 && !item.is_deleted));
            }
        } catch (e) { console.error(e); }
    };

    const fetchServiceKits = async () => {
        try {
            const res = await Axios.get(`${API_URL}/api/admin/service-kits`);
            if (res.data.success) {
                setServiceKits(res.data.data || {});
            }
        } catch (e) { console.error(e); }
    };

    const fetchSessionMaterials = async (id) => {
        try {
            const res = await Axios.get(`${API_URL}/api/appointments/${id}/materials`);
            if (res.data.success) {
                setSessionMaterials(res.data.materials || []);
                setSessionCost(res.data.totalCost || 0);
            }
        } catch (e) { console.error(e); }
    };

    const handleReleaseMaterial = async (materialId) => {
        if (!activeSession) return;
        try {
            const res = await Axios.post(`${API_URL}/api/appointments/${activeSession.id}/release-material`, {
                materialId: Number(materialId) // Ensure materialId is a number
            });
            if (res.data.success) {
                showAlert("Success", "Item returned to inventory successfully", "success");
            } else {
                showAlert("Error", res.data.message || 'Failed to release material.', "warning");
            }
        } catch (e) {
            const errorMsg = e.response?.data?.message || "Failed to connect to the server.";
            showAlert("Release Error", errorMsg, "danger");
        } finally {
            // Always refetch materials to ensure UI is in sync with DB
            // This helps if the status changed unexpectedly or due to a race condition.
            fetchSessionMaterials(activeSession.id);
        }
    };

    const handleQuickAdd = async (inventoryId, quantity = 1) => {
        if (!activeSession) return;
        setAddingMaterial(true);
        try {
            const res = await Axios.post(`${API_URL}/api/appointments/${activeSession.id}/materials`, {
                inventory_id: inventoryId, quantity
            });
            if (res.data.success) {
                fetchSessionMaterials(activeSession.id);
            } else {
                showAlert("Inventory Error", res.data.message || 'Failed to add material. Check stock.', "warning");
            }
        } catch (e) {
            const errorMsg = e.response?.data?.message || "Failed to connect to the server while adding material.";
            showAlert("Inventory Error", errorMsg, "danger");
        } finally {
            setAddingMaterial(false);
        }
    };

    const handleQuickAddKit = async (kitItems) => {
        if (!activeSession || !kitItems || kitItems.length === 0) return;
        setAddingMaterial(true);
        try {
            let successCount = 0;
            let failedItems = [];

            for (const item of kitItems) {
                const res = await Axios.post(`${API_URL}/api/appointments/${activeSession.id}/materials`, {
                    inventory_id: item.inventory_id,
                    quantity: item.default_quantity
                });
                if (res.data.success) {
                    successCount++;
                } else {
                    failedItems.push(item.item_name);
                }
            }

            if (successCount > 0) {
                fetchSessionMaterials(activeSession.id);
                if (failedItems.length === 0) {
                    showAlert("Success", `Added ${successCount} items from kit!`, "success");
                } else {
                    showAlert("Partial Success", `Added ${successCount} items. Failed: ${failedItems.join(', ')}`, "warning");
                }
            } else {
                showAlert("Error", "Failed to add kit items. Check inventory levels.", "danger");
            }
        } catch (e) {
            const errorMsg = e.response?.data?.message || "Failed to connect to the server while adding kit.";
            showAlert("Connection Error", errorMsg, "danger");
        } finally {
            setAddingMaterial(false);
        }
    };

    const openInventoryModal = () => {
        setInventoryModal({ mounted: true, visible: false });
        setTimeout(() => setInventoryModal({ mounted: true, visible: true }), 10);
    };

    const closeInventoryModal = () => {
        setInventoryModal(prev => ({ ...prev, visible: false }));
        setTimeout(() => {
            setInventoryModal({ mounted: false, visible: false });
        }, 400);
    };

    const openSessionModal = () => {
        setSessionModal({ mounted: true, visible: false });
        setTimeout(() => setSessionModal({ mounted: true, visible: true }), 10);
    };

    const closeSessionModal = () => {
        setSessionModal(prev => ({ ...prev, visible: false }));
        setTimeout(() => {
            setSessionModal({ mounted: false, visible: false });
            setActiveSession(null);
            fetchSessions(); // Refresh today's queue to reflect status changes (e.g. In Progress)
        }, 400);
    };

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const appointmentId = params.get('appointment');
        if (appointmentId && sessions.length > 0) {
            const target = sessions.find(s => s.id.toString() === appointmentId);
            if (target) {
                handleManageSession(target);
                window.history.replaceState({}, '', '/artist/sessions');
            }
        }
    }, [sessions]);

    const handleManageSession = (session) => {
        setActiveSession(session);
        setSessionData({
            notes: session.notes || '',
            beforePhoto: null,
            afterPhoto: null
        });
        openSessionModal();
    };

    const handlePhotoUpload = (e, type) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 800; // Resize to max 800px width
                    const scaleSize = MAX_WIDTH / img.width;
                    const finalWidth = img.width > MAX_WIDTH ? MAX_WIDTH : img.width;
                    const finalHeight = img.width > MAX_WIDTH ? img.height * scaleSize : img.height;
                    
                    canvas.width = finalWidth;
                    canvas.height = finalHeight;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    
                    const resizedBase64 = canvas.toDataURL('image/jpeg', 0.7); // 70% quality jpeg
                    setSessionData(prev => ({ ...prev, [type]: resizedBase64 }));
                };
                img.src = reader.result;
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUpdateStatus = async (newStatus) => {
        if (newStatus === 'completed') {
            setIsCompletingSession(true);
        } else {
            await processStatusUpdate(newStatus);
        }
    };

    const confirmCompletion = () => {
        setConfirmModal({
            isOpen: true,
            title: 'Session Completion Status',
            message: `Does this piece need another session, or is the tattoo fully complete? (Total material cost: ₱${sessionCost.toLocaleString()} will be recorded).`,
            confirmText: 'Fully Complete ✨',
            cancelText: 'Needs Another Session',
            type: 'info',
            onConfirm: async () => {
                await processStatusUpdate('completed', true);
                setConfirmModal({ ...confirmModal, isOpen: false });
                setIsCompletingSession(false);
            },
            onClose: async () => {
                await processStatusUpdate('completed', false);
                setConfirmModal({ ...confirmModal, isOpen: false });
                setIsCompletingSession(false);
            }
        });
    };

    const processStatusUpdate = async (newStatus, isFullyComplete = true) => {
        try {
            // Save session details (notes, photos) before completing
            if (newStatus === 'completed' && (sessionData.notes || sessionData.beforePhoto || sessionData.afterPhoto)) {
                await Axios.put(`${API_URL}/api/appointments/${activeSession.id}/details`, {
                    notes: sessionData.notes,
                    beforePhoto: sessionData.beforePhoto,
                    afterPhoto: sessionData.afterPhoto
                });
            }

            const res = await Axios.put(`${API_URL}/api/appointments/${activeSession.id}/status`, { 
                status: newStatus,
                isFullyComplete 
            });
            if (res.data.success) {
                setActiveSession(prev => ({ ...prev, status: newStatus }));

                if (newStatus === 'completed') {
                    closeSessionModal();
                    fetchSessions();
                } else if (newStatus === 'in_progress') {
                    setTimeout(() => fetchSessionMaterials(activeSession.id), 1000);
                }
            } else {
                showAlert("Update Failed", "Failed to update session status. Please try again.", "warning");
            }
        } catch (error) {
            console.error("Error updating status:", error);
            showAlert("Connection Error", "Failed to connect to the server while updating status.", "danger");
        }
    };

    const handleSaveDetails = async () => {
        if (!activeSession) return;
        setIsSaving(true);
        try {
            console.log('💾 Saving session details...');
            console.log(`   - Appointment ID: ${activeSession.id}`);
            console.log(`   - Notes: ${sessionData.notes ? sessionData.notes.substring(0, 50) + '...' : 'empty'}`);
            console.log(`   - Before Photo: ${sessionData.beforePhoto ? 'YES (' + (sessionData.beforePhoto.length / 1024 / 1024).toFixed(2) + ' MB)' : 'NO'}`);
            console.log(`   - After Photo: ${sessionData.afterPhoto ? 'YES (' + (sessionData.afterPhoto.length / 1024 / 1024).toFixed(2) + ' MB)' : 'NO'}`);

            const res = await Axios.put(`${API_URL}/api/appointments/${activeSession.id}/details`, {
                notes: sessionData.notes,
                beforePhoto: sessionData.beforePhoto,
                afterPhoto: sessionData.afterPhoto
            });
            console.log('✅ Response:', res.data);
            if (res.data.success) {
                showAlert("Saved", "Session details saved successfully!", "success");
                setActiveSession(null);
                fetchSessions();
            } else {
                showAlert("Error", "Failed to save session details. " + res.data.message, "danger");
            }
        } catch (error) {
            console.error("Error saving details:", error);
            showAlert("Error", "Failed to save session details. Please check your connection.", "danger");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="portal-layout">
            <ArtistSideNav />
            <div className="portal-container artist-portal">
                <header className="portal-header">
                    <h1>Tattoo Sessions</h1>
                    <p>Manage today's active sessions</p>
                </header>
                <div className="portal-content">
                    {loading ? <div className="no-data">Loading...</div> : (
                        <div className="table-card-container" style={{ minHeight: '500px' }}>
                            <div className="card-header-v2">
                                <h2>Today's Queue</h2>
                                <span className={`status-badge-v2 pending`}>{sessions.length} Appointments</span>
                            </div>
                            {sessions.length > 0 ? (
                                <>
                                    <div className="table-responsive">
                                        <table className="portal-table">
                                        <thead>
                                            <tr>
                                                <th>Time</th>
                                                <th>Client</th>
                                                <th>Design</th>
                                                <th>Status</th>
                                                <th>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sessions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(session => (
                                                <tr key={session.id}>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                                                            <Clock size={14} className="text-muted" />
                                                            {session.start_time || 'N/A'}
                                                        </div>
                                                    </td>
                                                    <td style={{ fontWeight: '600' }}>{session.client_name}</td>
                                                    <td>{session.design_title}</td>
                                                    <td><span className={`status-badge ${session.status}`}>{session.status}</span></td>
                                                    <td>
                                                        <button className="btn btn-primary" onClick={() => handleManageSession(session)} style={{ padding: '6px 14px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <Play size={14} /> Manage Session
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <Pagination
                                    currentPage={currentPage}
                                    totalPages={Math.ceil(sessions.length / itemsPerPage)}
                                    onPageChange={setCurrentPage}
                                    itemsPerPage={itemsPerPage}
                                    onItemsPerPageChange={(newVal) => {
                                        setItemsPerPage(newVal);
                                        setCurrentPage(1);
                                    }}
                                    totalItems={sessions.length}
                                    unit="sessions"
                                />
                                </>
                            ) : (
                                <div className="no-data-container" style={{ flex: 1 }}>
                                    <Calendar size={48} className="no-data-icon" />
                                    <p className="no-data-text">No sessions scheduled for today.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <ConfirmModal
                    isOpen={confirmModal.isOpen}
                    title={confirmModal.title}
                    message={confirmModal.message}
                    confirmText={confirmModal.confirmText}
                    onConfirm={confirmModal.onConfirm}
                    onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                    type={confirmModal.type}
                    isAlert={confirmModal.isAlert}
                />
            </div>

            {/* Active Session Modal */}
            {sessionModal.mounted && activeSession && (
                <div className={`modal-overlay ${sessionModal.visible ? 'open' : ''}`} onClick={closeSessionModal}>
                    <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h2 style={{ margin: 0 }}>Active Session: {activeSession.client_name}</h2>
                                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.9rem' }}>Project: {activeSession.design_title}</p>
                            </div>
                            <button className="close-btn" onClick={closeSessionModal}><X size={24} /></button>
                        </div>

                        <div className="modal-body" style={{ maxHeight: '75vh' }}>
                            {/* Status Control Panel */}
                            <div style={{ 
                                background: 'rgba(255, 255, 255, 0.5)', 
                                backdropFilter: 'blur(10px)',
                                border: '1px solid #e2e8f0',
                                borderRadius: '20px',
                                padding: '20px',
                                marginBottom: '24px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <span className={`badge ${activeSession.status}`} style={{ padding: '8px 16px', fontSize: '0.8rem', fontWeight: 800 }}>
                                        {activeSession.status.toUpperCase()}
                                    </span>
                                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                        {activeSession.status === 'confirmed' ? 'Ready for procedure' : 
                                         activeSession.status === 'in_progress' ? 'Session currently active' : 'Session archived'}
                                    </div>
                                </div>
                                
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    {activeSession.status === 'confirmed' && (
                                        <button className="btn btn-primary" style={{ padding: '10px 24px' }} onClick={() => handleUpdateStatus('in_progress')}>
                                            <Play size={18} /> Start Procedure
                                        </button>
                                    )}
                                    {activeSession.status === 'in_progress' && !isCompletingSession && (
                                        <button className="btn btn-primary" style={{ backgroundColor: '#10b981', padding: '10px 24px' }} onClick={() => handleUpdateStatus('completed')}>
                                            <CheckCircle size={18} /> Complete Work
                                        </button>
                                    )}
                                    {isCompletingSession && (
                                        <button className="btn btn-secondary" style={{ padding: '10px 20px' }} onClick={() => setIsCompletingSession(false)}>
                                            Cancel
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(400px, 1fr) 350px', gap: '30px' }}>
                                {/* Left Column: Visual Documentation & Notes */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                    {/* Visual Documentation */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                        <div style={{ 
                                            background: '#f8fafc',
                                            borderRadius: '16px',
                                            border: '1px solid #e2e8f0',
                                            padding: '15px',
                                            textAlign: 'center'
                                        }}>
                                            <label style={{ fontWeight: 700, fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '10px', display: 'block' }}>Before State</label>
                                            <div style={{ height: '180px', borderRadius: '12px', overflow: 'hidden', background: '#fff', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {sessionData.beforePhoto ? (
                                                    <img src={sessionData.beforePhoto} alt="Before" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <button className="btn-glass" onClick={() => document.getElementById('before-photo-input').click()}>
                                                        <Upload size={16} /> Upload
                                                    </button>
                                                )}
                                                <input id="before-photo-input" type="file" hidden accept="image/*" onChange={(e) => handlePhotoUpload(e, 'beforePhoto')} />
                                            </div>
                                        </div>
                                        <div style={{ 
                                            background: '#f8fafc',
                                            borderRadius: '16px',
                                            border: '1px solid #e2e8f0',
                                            padding: '15px',
                                            textAlign: 'center'
                                        }}>
                                            <label style={{ fontWeight: 700, fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '10px', display: 'block' }}>Post Procedure</label>
                                            <div style={{ height: '180px', borderRadius: '12px', overflow: 'hidden', background: '#fff', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {sessionData.afterPhoto ? (
                                                    <img src={sessionData.afterPhoto} alt="After" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <button className="btn-glass" onClick={() => document.getElementById('after-photo-input').click()}>
                                                        <Upload size={16} /> Upload
                                                    </button>
                                                )}
                                                <input id="after-photo-input" type="file" hidden accept="image/*" onChange={(e) => handlePhotoUpload(e, 'afterPhoto')} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Artist Notes */}
                                    <div className="form-group">
                                        <label style={{ fontWeight: 700, fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <FileText size={14}/> Procedure Notes & Observations
                                        </label>
                                        <textarea
                                            className="form-input"
                                            rows="8"
                                            value={sessionData.notes}
                                            onChange={(e) => setSessionData({ ...sessionData, notes: e.target.value })}
                                            placeholder="Document procedure details, pigment choices, or client skin response..."
                                            style={{ borderRadius: '16px', minHeight: '200px' }}
                                        />
                                    </div>
                                </div>

                                {/* Right Column: Supplies & Logistics */}
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
                                            <Package size={14}/> Consumption Log
                                        </label>

                                        {isCompletingSession || activeSession.status === 'in_progress' ? (
                                            <>
                                                <div style={{ flex: 1, overflowY: 'auto', marginBottom: '20px' }}>
                                                    {sessionMaterials.length === 0 ? (
                                                        <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                                                            <Package size={32} style={{ marginBottom: '10px', opacity: 0.3 }} />
                                                            <p style={{ margin: 0, fontSize: '0.85rem' }}>No supplies logged yet.</p>
                                                        </div>
                                                    ) : (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                            {sessionMaterials.map((mat, idx) => (
                                                                <div key={idx} style={{ 
                                                                    display: 'flex', 
                                                                    justifyContent: 'space-between', 
                                                                    alignItems: 'center', 
                                                                    padding: '10px 12px', 
                                                                    background: '#f8fafc',
                                                                    borderRadius: '12px',
                                                                    border: '1px solid #f1f5f9'
                                                                }}>
                                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                        <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{mat.quantity}x {mat.item_name}</span>
                                                                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{mat.category}</span>
                                                                    </div>
                                                                    {mat.status === 'hold' && (
                                                                        <button
                                                                            onClick={() => handleReleaseMaterial(mat.id)}
                                                                            style={{ background: '#fee2e2', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '6px', borderRadius: '8px' }}
                                                                        >
                                                                            <X size={14} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '10px 15px', borderRadius: '12px' }}>
                                                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Total Cost</span>
                                                        <span style={{ fontWeight: 800, color: '#10b981' }}>₱{sessionCost.toLocaleString()}</span>
                                                    </div>

                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <button 
                                                            className="btn-glass" 
                                                            style={{ flex: 1, fontSize: '0.75rem', justifyContent: 'center', padding: '8px' }}
                                                            onClick={openInventoryModal}
                                                            disabled={addingMaterial}
                                                        >
                                                            <Plus size={14}/> Add Item
                                                        </button>
                                                        {Object.keys(serviceKits).length > 0 && (
                                                            <select
                                                                disabled={addingMaterial}
                                                                className="premium-select-v2"
                                                                style={{ flex: 1.2, fontSize: '0.75rem', background: '#f8fafc' }}
                                                                onChange={(e) => {
                                                                    if (e.target.value) {
                                                                        handleQuickAddKit(serviceKits[e.target.value]);
                                                                        e.target.value = '';
                                                                    }
                                                                }}
                                                            >
                                                                <option value="">Apply Kit</option>
                                                                {Object.keys(serviceKits).map(kitName => (
                                                                    <option key={kitName} value={kitName}>{kitName}</option>
                                                                ))}
                                                            </select>
                                                        )}
                                                    </div>

                                                    {isCompletingSession && (
                                                        <button 
                                                            className="btn btn-primary" 
                                                            onClick={confirmCompletion}
                                                            style={{ marginTop: '5px', justifyContent: 'center', fontWeight: 800 }}
                                                        >
                                                            Finalize Session
                                                        </button>
                                                    )}
                                                </div>
                                            </>
                                        ) : (
                                            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
                                                <Clock size={32} style={{ marginBottom: '10px', opacity: 0.3 }} />
                                                <p style={{ margin: 0, fontSize: '0.85rem' }}>{activeSession.status === 'confirmed' ? 'Start procedure to log supplies.' : 'Supply log archived.'}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={closeSessionModal}>Close View</button>
                            <button className="btn btn-primary" style={{ padding: '10px 32px' }} onClick={handleSaveDetails} disabled={isSaving}>
                                <Save size={18} /> {isSaving ? 'Saving...' : 'Sync Progress'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Inventory Selection Modal */}
            {inventoryModal.mounted && (
                <div className={`modal-overlay ${inventoryModal.visible ? 'open' : ''}`} onClick={closeInventoryModal}>
                    <div className="modal-content" style={{ maxWidth: '550px' }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h2 style={{ margin: 0 }}>Add Supplies</h2>
                                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>Search and select items to log for this session</p>
                            </div>
                            <button className="close-btn" onClick={closeInventoryModal}><X size={24} /></button>
                        </div>
                        <div className="modal-body" style={{ maxHeight: '60vh' }}>
                            <div className="premium-search-box" style={{ marginBottom: '20px' }}>
                                <Search size={18} className="text-muted" />
                                <input
                                    type="text"
                                    placeholder="Search by name or category..."
                                    value={inventorySearch}
                                    onChange={(e) => setInventorySearch(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {inventoryItems.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>No items in stock.</div>
                                ) : (
                                    (() => {
                                        const filtered = inventoryItems.filter(item =>
                                            !inventorySearch ||
                                            (item.name && item.name.toLowerCase().includes(inventorySearch.toLowerCase())) ||
                                            (item.category && item.category.toLowerCase().includes(inventorySearch.toLowerCase()))
                                        );
                                        return filtered.length > 0 ? filtered.map(item => (
                                            <div
                                                key={item.id}
                                                onClick={() => {
                                                    handleQuickAdd(item.id, 1);
                                                    closeInventoryModal();
                                                }}
                                                style={{
                                                    padding: '12px 16px',
                                                    background: '#f8fafc',
                                                    border: '1px solid #e2e8f0',
                                                    borderRadius: '12px',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                                className="inventory-item-row"
                                            >
                                                <div>
                                                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{item.name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                        {item.category} • {item.current_stock} {item.unit} available
                                                    </div>
                                                </div>
                                                <button className="btn-glass" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>Add</button>
                                            </div>
                                        )) : <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>No matching items found.</div>;
                                    })()
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ArtistSessions;