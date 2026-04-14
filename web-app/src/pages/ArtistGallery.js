import React, { useState, useEffect } from 'react';
import Axios from 'axios';
import { Trash2, Plus, X, Eye, Lock, Globe, Edit } from 'lucide-react';
import ArtistSideNav from '../components/ArtistSideNav';
import ConfirmModal from '../components/ConfirmModal';
import './PortalStyles.css';
import './ArtistStyles.css';
import { API_URL } from '../config';
import { TATTOO_STYLES } from '../constants/tattooStyles';

function ArtistGallery() {
    const [works, setWorks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedWork, setSelectedWork] = useState(null);
    const [editingId, setEditingId] = useState(null);

    // Modal states for animations
    const [addWorkModal, setAddWorkModal] = useState({ mounted: false, visible: false });
    const [viewWorkModal, setViewWorkModal] = useState({ mounted: false, visible: false });
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        imageUrl: '',
        category: 'Realism',
        isPublic: true,
        priceEstimate: ''
    });
    
    // Get the real logged-in user ID
    const [user] = useState(() => {
        const saved = localStorage.getItem('user');
        return saved ? JSON.parse(saved) : null;
    });
    const artistId = user ? user.id : 1;

    // Modal animation handlers
    const openModal = (setter, item = null) => {
        if (item) {
            setSelectedWork(item);
            setEditingId(null); // Ensure we aren't in edit mode when just viewing
        }
        setter({ mounted: true, visible: false });
        setTimeout(() => setter({ mounted: true, visible: true }), 10);
    };

    const closeModal = (setter) => {
        setter(prev => ({ ...prev, visible: false }));
        setTimeout(() => {
            setter({ mounted: false, visible: false });
            setSelectedWork(null);
        }, 400); // Match CSS transition duration
    };

    const openAddModal = () => {
        setEditingId(null);
        setFormData({ 
            title: '', 
            description: '', 
            imageUrl: '',
            category: 'Realism',
            isPublic: true,
            priceEstimate: ''
        });
        openModal(setAddWorkModal);
    };

    const handleEditClick = (work) => {
        setEditingId(work.id);
        setFormData({
            title: work.title,
            description: work.description || '',
            imageUrl: work.image_url,
            category: work.category || 'Realism',
            isPublic: work.is_public === 1 || work.is_public === true,
            priceEstimate: work.price_estimate || ''
        });
        
        // Close view modal if it's open
        if (viewWorkModal.visible) {
            setViewWorkModal(prev => ({ ...prev, visible: false }));
            setTimeout(() => setViewWorkModal({ mounted: false, visible: false }), 400);
        }
        
        openModal(setAddWorkModal);
    };

    useEffect(() => {
        fetchPortfolio();
    }, []);

    const fetchPortfolio = async () => {
        try {
            const res = await Axios.get(`${API_URL}/api/artist/${artistId}/portfolio`);
            if (res.data.success) setWorks(res.data.works);
            setLoading(false);
        } catch (e) {
            console.error(e);
            setLoading(false);
        }
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData({ ...formData, imageUrl: reader.result });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await Axios.put(`${API_URL}/api/artist/portfolio/${editingId}`, {
                    artistId,
                    ...formData
                });
            } else {
                await Axios.post(`${API_URL}/api/artist/portfolio`, {
                    artistId,
                    ...formData
                });
            }
            closeModal(setAddWorkModal);
            // Reset form correctly (preserving defaults)
            setFormData({ 
                title: '', 
                description: '', 
                imageUrl: '',
                category: 'Realism',
                isPublic: true,
                priceEstimate: ''
            });
            setEditingId(null);
            fetchPortfolio();
        } catch (error) {
            console.error("Error adding work:", error);
            // Show the actual error message from the server
            alert(error.response?.data?.message || "Failed to save work");
        }
    };

    const handleDelete = (id) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Delete Portfolio Work',
            message: 'Are you sure you want to delete this work?',
            onConfirm: async () => {
                setConfirmDialog({ isOpen: false });
                try {
                    await Axios.delete(`${API_URL}/api/artist/portfolio/${id}`);
                    setWorks(works.filter(w => w.id !== id));
                } catch (error) {
                    console.error("Error deleting work:", error);
                }
                // Also close view mode if delete is triggered from there
                if (viewWorkModal.mounted) {
                    closeModal(setViewWorkModal);
                }
            }
        });
    };

    const toggleVisibility = async (work) => {
        try {
            const newStatus = !work.is_public;
            await Axios.put(`${API_URL}/api/artist/portfolio/${work.id}/visibility`, {
                isPublic: newStatus
            });
            
            // Update local state immediately for responsiveness
            const updatedWork = { ...work, is_public: newStatus };
            if (selectedWork && selectedWork.id === work.id) setSelectedWork(updatedWork);
            setWorks(prev => prev.map(w => w.id === work.id ? updatedWork : w));
        } catch (error) {
            console.error("Error updating visibility:", error);
        }
    };

  return (
    <div className="portal-layout">
        <ArtistSideNav />
        <div className="portal-container artist-portal page-container-enter">
            <header className="portal-header">
                <h1>My Portfolio</h1>
                <button className="btn btn-primary" onClick={openAddModal}>
                    <Plus size={18} /> Add Work
                </button>
            </header>

            <div className="portal-content">
                {loading ? <div className="no-data">Loading...</div> : (
                    <div className="gallery-grid">
                        {works.length > 0 ? works.map(work => (
                            <div key={work.id} className="gallery-item" onClick={() => openModal(setViewWorkModal, work)}>
                                <img 
                                    src={work.image_url} 
                                    alt={work.title} 
                                    loading="lazy"
                                />
                                <div className="gallery-overlay">
                                    <h3>{work.title}</h3>
                                    <p>{work.category}</p>
                                    <button className="delete-btn" onClick={(e) => { e.stopPropagation(); handleDelete(work.id); }}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        )) : (
                            <div className="no-data">No works in portfolio. Add some!</div>
                        )}
                    </div>
                )}
            </div>

            {/* View Work Modal */}
            {viewWorkModal.mounted && selectedWork && (
                <div className={`modal-overlay ${viewWorkModal.visible ? 'open' : ''}`} onClick={() => closeModal(setViewWorkModal)}>
                    <div className="modal-content large" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <h2 style={{ margin: 0 }}>{selectedWork.title}</h2>
                                <button onClick={() => handleEditClick(selectedWork)} className="action-btn edit-btn" style={{ padding: '6px', borderRadius: '8px' }} title="Edit Work">
                                    <Edit size={16}/>
                                </button>
                            </div>
                            <button className="close-btn" onClick={() => closeModal(setViewWorkModal)}><X size={24}/></button>
                        </div>
                        <div className="modal-body" style={{ maxHeight: '75vh' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 320px', gap: '30px' }}>
                                {/* Left: Hero Image */}
                                <div style={{ 
                                    backgroundColor: '#f8fafc', 
                                    borderRadius: '20px', 
                                    overflow: 'hidden', 
                                    display: 'flex', 
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    border: '1px solid #e2e8f0',
                                    minHeight: '400px'
                                }}>
                                    <img 
                                        src={selectedWork.image_url} 
                                        alt={selectedWork.title} 
                                        style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain' }} 
                                    />
                                </div>

                                {/* Right: Info Panel */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                        <span className="badge" style={{ backgroundColor: '#e0e7ff', color: '#4338ca', padding: '6px 12px', fontSize: '0.8rem', fontWeight: 700 }}>
                                            {selectedWork.category || 'Uncategorized'}
                                        </span>
                                        <div 
                                            className="badge" 
                                            style={{ 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                gap: '8px', 
                                                backgroundColor: selectedWork.is_public ? '#dcfce7' : '#f3f4f6', 
                                                color: selectedWork.is_public ? '#166534' : '#4b5563', 
                                                cursor: 'pointer',
                                                padding: '6px 12px'
                                            }}
                                            onClick={() => toggleVisibility(selectedWork)}
                                        >
                                            {selectedWork.is_public ? <Globe size={14}/> : <Lock size={14}/>}
                                            <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{selectedWork.is_public ? 'Public' : 'Hidden'}</span>
                                        </div>
                                    </div>

                                    <div className="work-details" style={{ flex: 1 }}>
                                        <label style={{ fontWeight: 700, fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Project Story</label>
                                        <p style={{ lineHeight: '1.7', color: '#334155', margin: 0 }}>{selectedWork.description || 'No description provided for this masterpiece.'}</p>
                                        
                                        {selectedWork.price_estimate && (
                                            <div style={{ marginTop: '24px', padding: '20px', backgroundColor: '#fdf4ff', borderRadius: '16px', border: '1px solid #fae8ff' }}>
                                                <label style={{ fontWeight: 700, fontSize: '0.75rem', color: '#a21caf', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Market Valuation</label>
                                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#701a75' }}>₱{Number(selectedWork.price_estimate).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ padding: '15px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <Globe size={12}/> Added to archive on {new Date(selectedWork.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="action-btn delete-btn" style={{ marginRight: 'auto', padding: '10px 16px' }} onClick={() => handleDelete(selectedWork.id)}>
                                <Trash2 size={16} /> Delete Work
                            </button>
                            <button className="btn btn-secondary" onClick={() => closeModal(setViewWorkModal)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add/Edit Modal */}
            {addWorkModal.mounted && (
                <div className={`modal-overlay ${addWorkModal.visible ? 'open' : ''}`} onClick={() => closeModal(setAddWorkModal)}>
                    <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingId ? 'Edit Masterpiece' : 'Upload New Work'}</h2>
                            <button className="close-btn" onClick={() => closeModal(setAddWorkModal)}><X size={24}/></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body" style={{ maxHeight: '75vh' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 350px', gap: '30px' }}>
                                    {/* Left: Metadata */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                        <div className="form-group">
                                            <label style={{ fontWeight: 700, fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Project Title</label>
                                            <input 
                                                type="text" 
                                                className="form-input"
                                                placeholder="e.g. Neo-Traditional Sleeve Detail"
                                                value={formData.title}
                                                onChange={e => setFormData({...formData, title: e.target.value})}
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label style={{ fontWeight: 700, fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Project Description</label>
                                            <textarea 
                                                className="form-input"
                                                placeholder="Describe the style, execution, or story behind this work..."
                                                style={{ minHeight: '120px' }}
                                                value={formData.description}
                                                onChange={e => setFormData({...formData, description: e.target.value})}
                                            />
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                            <div className="form-group">
                                                <label style={{ fontWeight: 700, fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Style Category</label>
                                                <select className="form-input" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                                                    {TATTOO_STYLES.map(style => (
                                                        <option key={style} value={style}>{style}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="form-group">
                                                <label style={{ fontWeight: 700, fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Price Est. (₱)</label>
                                                <input 
                                                    type="number" 
                                                    className="form-input"
                                                    placeholder="0"
                                                    value={formData.priceEstimate}
                                                    onChange={e => setFormData({...formData, priceEstimate: e.target.value})}
                                                />
                                            </div>
                                        </div>
                                        <div className="form-group" style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 600, color: '#334155' }}>
                                                <input 
                                                    type="checkbox" 
                                                    style={{ width: '18px', height: '18px' }}
                                                    checked={formData.isPublic} 
                                                    onChange={e => setFormData({...formData, isPublic: e.target.checked})} 
                                                /> 
                                                Make this work public in the studio gallery
                                            </label>
                                        </div>
                                    </div>

                                    {/* Right: Media Upload */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                        <label style={{ fontWeight: 700, fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '0', display: 'block' }}>Media Asset</label>
                                        <div style={{ 
                                            border: '2px dashed #cbd5e1', 
                                            borderRadius: '20px', 
                                            padding: formData.imageUrl ? '10px' : '40px 20px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            textAlign: 'center',
                                            background: '#f8fafc',
                                            transition: 'all 0.3s ease',
                                            cursor: 'pointer',
                                            position: 'relative',
                                            minHeight: '200px'
                                        }} onClick={() => document.getElementById('work-file-upload').click()}>
                                            {formData.imageUrl ? (
                                                <img src={formData.imageUrl} alt="Upload Preview" style={{ width: '100%', borderRadius: '12px', maxHeight: '400px', objectFit: 'cover' }} />
                                            ) : (
                                                <>
                                                    <div style={{ background: '#fff', padding: '12px', borderRadius: '50%', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', marginBottom: '12px' }}>
                                                        <Plus size={24} className="text-bronze" />
                                                    </div>
                                                    <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', color: '#475569' }}>Drop image or click to browse</p>
                                                    <p style={{ margin: '5px 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>High quality JPG or PNG (Max 5MB)</p>
                                                </>
                                            )}
                                            <input 
                                                id="work-file-upload"
                                                type="file" 
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                                style={{ display: 'none' }}
                                                required={!formData.imageUrl}
                                            />
                                        </div>
                                        {formData.imageUrl && (
                                            <button 
                                                type="button" 
                                                className="btn-glass" 
                                                style={{ width: '100%', justifyContent: 'center', fontSize: '0.85rem' }}
                                                onClick={() => document.getElementById('work-file-upload').click()}
                                            >
                                                Change Image
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => closeModal(setAddWorkModal)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" style={{ padding: '10px 40px' }}>{editingId ? 'Update Archive' : 'Publish to Portfolio'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmModal 
                {...confirmDialog} 
                onCancel={() => setConfirmDialog({ isOpen: false })} 
            />
        </div>
    </div>
  );
}

export default ArtistGallery;
