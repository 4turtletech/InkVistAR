import React, { useState, useEffect } from 'react';
import Axios from 'axios';
import { Star, CheckCircle, XCircle } from 'lucide-react';
import AdminSideNav from '../components/AdminSideNav';
import './PortalStyles.css';
import './AdminStyles.css';
import { API_URL } from '../config';

function AdminReviews() {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('pending');

    useEffect(() => {
        fetchReviews();
    }, []);

    const fetchReviews = async () => {
        try {
            setLoading(true);
            const res = await Axios.get(`${API_URL}/api/admin/reviews`);
            if (res.data.success) {
                setReviews(res.data.reviews || []);
            }
            setLoading(false);
        } catch (e) {
            console.error(e);
            setLoading(false);
        }
    };

    const handleModeration = async (id, status, is_showcased = undefined) => {
        try {
            const res = await Axios.put(`${API_URL}/api/admin/reviews/${id}`, { status, is_showcased });
            if (res.data.success) {
                setReviews(reviews.map(r => r.id === id ? { ...r, status, is_showcased: is_showcased !== undefined ? is_showcased : r.is_showcased } : r));
            }
        } catch (e) {
            console.error(e);
        }
    };

    const filteredReviews = reviews.filter(r => r.status === activeTab);

    return (
        <div className="admin-layout">
            <AdminSideNav />
            <div className="admin-main">
                <header className="admin-header">
                    <div className="header-title">
                        <h1>Review Moderation</h1>
                        <p>Approve or reject customer reviews before they appear on artist pages.</p>
                    </div>
                </header>

                <div className="admin-content">
                    <div className="settings-tabs" style={{ marginBottom: '20px' }}>
                        <button className={`tab-button ${activeTab === 'pending' ? 'active' : ''}`} onClick={() => setActiveTab('pending')}>Pending ({reviews.filter(r=>r.status==='pending').length})</button>
                        <button className={`tab-button ${activeTab === 'approved' ? 'active' : ''}`} onClick={() => setActiveTab('approved')}>Approved</button>
                        <button className={`tab-button ${activeTab === 'rejected' ? 'active' : ''}`} onClick={() => setActiveTab('rejected')}>Rejected</button>
                    </div>

                    <div className="data-card">
                        {loading ? <p>Loading reviews...</p> : (
                            filteredReviews.length > 0 ? (
                                <div className="table-responsive">
                                    <table className="admin-table">
                                        <thead>
                                            <tr>
                                                <th>Client</th>
                                                <th>Artist</th>
                                                <th>Rating</th>
                                                <th style={{width: '35%'}}>Comment</th>
                                                <th>Date</th>
                                                {activeTab === 'pending' && <th>Actions</th>}
                                                {activeTab === 'approved' && <th>Showcase</th>}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredReviews.map(r => (
                                                <tr key={r.id}>
                                                    <td style={{fontWeight: 600}}>{r.customer_name}</td>
                                                    <td>{r.artist_name}</td>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                            {r.rating} <Star size={14} color="#f59e0b" fill="#f59e0b" />
                                                        </div>
                                                    </td>
                                                    <td style={{ maxWidth: '300px', fontSize: '0.9rem', lineHeight: '1.4' }}>
                                                        {r.comment || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No comment</span>}
                                                    </td>
                                                    <td>{new Date(r.created_at).toLocaleDateString()}</td>
                                                    {activeTab === 'pending' && (
                                                        <td>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <button onClick={() => handleModeration(r.id, 'approved')} className="action-btn" style={{ background: '#ecfdf5', color: '#10b981', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer' }} title="Approve"><CheckCircle size={18} /></button>
                                                                <button onClick={() => handleModeration(r.id, 'rejected')} className="action-btn" style={{ background: '#fef2f2', color: '#ef4444', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer' }} title="Reject"><XCircle size={18} /></button>
                                                            </div>
                                                        </td>
                                                    )}
                                                    {activeTab === 'approved' && (
                                                        <td>
                                                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                                                <input 
                                                                    type="checkbox" 
                                                                    checked={r.is_showcased === 1 || r.is_showcased === true} 
                                                                    onChange={(e) => handleModeration(r.id, 'approved', e.target.checked)}
                                                                    style={{ cursor: 'pointer', accentColor: '#3b82f6', width: '16px', height: '16px' }}
                                                                />
                                                                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Show on Info Page</span>
                                                            </label>
                                                        </td>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="no-data">No {activeTab} reviews found.</p>
                            )
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AdminReviews;
