import React, { useState, useEffect } from 'react';
import Axios from 'axios';
import { Play, CheckCircle, Upload, Save, X, Package, FileText, Image as ImageIcon, Clock } from 'lucide-react';
import ArtistSideNav from '../components/ArtistSideNav';
import './PortalStyles.css';
import { API_URL } from '../config';

function ArtistSessions() {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeSession, setActiveSession] = useState(null);
    const [sessionData, setSessionData] = useState({
        notes: '',
        inkUsed: '',
        needlesUsed: '',
        beforePhoto: null,
        afterPhoto: null
    });
    
    const [user] = useState(() => {
        const saved = localStorage.getItem('user');
        return saved ? JSON.parse(saved) : null;
    });
    const artistId = user ? user.id : 1;

    const fetchSessions = async () => {
        try {
            // Fetch today's appointments
            const today = new Date().toISOString().split('T')[0];
            const res = await Axios.get(`${API_URL}/api/artist/${artistId}/appointments?date=${today}`);
            if (res.data.success) {
                setSessions(res.data.appointments.filter(a => a.status !== 'cancelled'));
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

    const handleManageSession = (session) => {
        setActiveSession(session);
        setSessionData({
            notes: session.notes || '',
            inkUsed: '', 
            needlesUsed: '',
            beforePhoto: null,
            afterPhoto: null
        });
    };

    const handlePhotoUpload = (e, type) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setSessionData(prev => ({ ...prev, [type]: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUpdateStatus = async (newStatus) => {
        try {
            await Axios.put(`${API_URL}/api/appointments/${activeSession.id}/status`, { status: newStatus });
            setActiveSession(prev => ({ ...prev, status: newStatus }));
            
            // If completing, close modal and refresh
            if (newStatus === 'completed') {
                alert('Session marked as completed!');
                setActiveSession(null);
                fetchSessions();
            }
        } catch (error) {
            console.error("Error updating status:", error);
            alert("Failed to update status");
        }
    };

    const handleSaveDetails = async () => {
        if (!activeSession) return;
        try {
            // Combine notes and supplies for storage
            const combinedNotes = `${sessionData.notes}\n\n[Supplies Log]\nInk: ${sessionData.inkUsed}\nNeedles: ${sessionData.needlesUsed}`;

            await Axios.put(`${API_URL}/api/appointments/${activeSession.id}/details`, {
                notes: combinedNotes,
                beforePhoto: sessionData.beforePhoto,
                afterPhoto: sessionData.afterPhoto
            });
            
            alert('Session details saved successfully!');
            setActiveSession(null);
            fetchSessions();
        } catch (error) {
            console.error("Error saving details:", error);
            alert("Failed to save session details");
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
                        <div className="data-card">
                            <h2>Today's Queue</h2>
                            {sessions.length > 0 ? (
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
                                            {sessions.map(session => (
                                                <tr key={session.id}>
                                                    <td>{session.start_time}</td>
                                                    <td>{session.client_name}</td>
                                                    <td>{session.design_title}</td>
                                                    <td><span className={`status-badge ${session.status}`}>{session.status}</span></td>
                                                    <td>
                                                        <button className="btn btn-primary" onClick={() => handleManageSession(session)} style={{padding: '5px 10px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px'}}>
                                                            <Play size={14}/> Manage
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : <p className="no-data">No sessions scheduled for today.</p>}
                        </div>
                    )}
                </div>
            </div>

            {/* Active Session Modal */}
            {activeSession && (
                <div className="modal-overlay">
                    <div className="modal-content session-modal" style={{maxWidth: '800px', width: '90%'}}>
                        <div className="modal-header">
                            <div>
                                <h2>Session: {activeSession.client_name}</h2>
                                <p style={{margin: 0, color: '#666'}}>{activeSession.design_title}</p>
                            </div>
                            <button className="close-btn" onClick={() => setActiveSession(null)}><X size={20}/></button>
                        </div>
                        
                        <div className="modal-body">
                            {/* Status Control */}
                            <div className="data-card" style={{marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc'}}>
                                <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                                    <span className={`status-badge ${activeSession.status}`}>{activeSession.status.toUpperCase()}</span>
                                    {activeSession.status === 'confirmed' && <span style={{color: '#666', fontSize: '0.9rem'}}>Ready to start</span>}
                                </div>
                                <div style={{display: 'flex', gap: '10px'}}>
                                    {activeSession.status === 'confirmed' && (
                                        <button className="btn btn-primary" onClick={() => handleUpdateStatus('in_progress')}>
                                            <Play size={16} style={{marginRight: '5px'}}/> Start Session
                                        </button>
                                    )}
                                    {activeSession.status === 'in_progress' && (
                                        <button className="btn btn-primary" style={{backgroundColor: '#10b981'}} onClick={() => handleUpdateStatus('completed')}>
                                            <CheckCircle size={16} style={{marginRight: '5px'}}/> Complete Session
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Photos */}
                            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px'}}>
                                <div className="photo-upload-box" style={{border: '2px dashed #e2e8f0', borderRadius: '8px', padding: '20px', textAlign: 'center'}}>
                                    <label style={{display: 'block', marginBottom: '10px', fontWeight: '600'}}>Before Photo</label>
                                    {sessionData.beforePhoto ? (
                                        <img src={sessionData.beforePhoto} alt="Before" style={{width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '4px'}} />
                                    ) : (
                                        <label className="btn btn-secondary" style={{cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px'}}>
                                            <Upload size={16}/> Upload
                                            <input type="file" hidden accept="image/*" onChange={(e) => handlePhotoUpload(e, 'beforePhoto')} />
                                        </label>
                                    )}
                                </div>
                                <div className="photo-upload-box" style={{border: '2px dashed #e2e8f0', borderRadius: '8px', padding: '20px', textAlign: 'center'}}>
                                    <label style={{display: 'block', marginBottom: '10px', fontWeight: '600'}}>After Photo</label>
                                    {sessionData.afterPhoto ? (
                                        <img src={sessionData.afterPhoto} alt="After" style={{width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '4px'}} />
                                    ) : (
                                        <label className="btn btn-secondary" style={{cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px'}}>
                                            <Upload size={16}/> Upload
                                            <input type="file" hidden accept="image/*" onChange={(e) => handlePhotoUpload(e, 'afterPhoto')} />
                                        </label>
                                    )}
                                </div>
                            </div>

                            {/* Notes & Supplies */}
                            <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px'}}>
                                <div className="form-group">
                                    <label><FileText size={16} style={{verticalAlign: 'middle'}}/> Session Notes</label>
                                    <textarea 
                                        className="form-input" 
                                        rows="5"
                                        value={sessionData.notes}
                                        onChange={(e) => setSessionData({...sessionData, notes: e.target.value})}
                                        placeholder="Record session details, skin reaction, etc..."
                                    />
                                </div>
                                <div className="form-group">
                                    <label><Package size={16} style={{verticalAlign: 'middle'}}/> Supply Log</label>
                                    <input 
                                        type="text" 
                                        className="form-input" 
                                        placeholder="Ink (e.g. Dynamic Blk)"
                                        value={sessionData.inkUsed}
                                        onChange={(e) => setSessionData({...sessionData, inkUsed: e.target.value})}
                                        style={{marginBottom: '10px'}}
                                    />
                                    <input 
                                        type="text" 
                                        className="form-input" 
                                        placeholder="Needles (e.g. 1209RL)"
                                        value={sessionData.needlesUsed}
                                        onChange={(e) => setSessionData({...sessionData, needlesUsed: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>
                        
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setActiveSession(null)}>Close</button>
                            <button className="btn btn-primary" onClick={handleSaveDetails}>
                                <Save size={16} style={{marginRight: '5px'}}/> Save Details
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ArtistSessions;