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
                    <div className="settings-tabs admin-mb-20">
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
                                                <th>Comment</th>
                                                <th>Date</th>
                                                {activeTab === 'pending' && <th>Actions</th>}
                                                {activeTab === 'approved' && <th>Showcase</th>}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredReviews.map(r => (
                                                <tr key={r.id}>
                                                    <td className="admin-fw-600">{r.customer_name}</td>
                                                    <td>{r.artist_name}</td>
                                                    <td>
                                                        <div className="admin-flex-center admin-gap-5">
                                                            {r.rating} <Star size={14} color="#f59e0b" fill="#f59e0b" />
                                                        </div>
                                                    </td>
                                                    <td className="admin-max-w-md admin-text-sm admin-st-c41d69db">{r.comment || <span className="admin-color-slate-400 admin-st-28d1f7b9">No comment</span>}</td>
                                                    <td>{new Date(r.created_at).toLocaleDateString()}</td>
                                                    {activeTab === 'pending' && (
                                                        <td>
                                                            <div className="admin-flex-center admin-gap-5">
                                                                <button onClick={() => handleModeration(r.id, 'approved')} className="action-btn admin-bg-emerald-50 admin-color-emerald admin-border-none admin-p-5 admin-rounded-md" title="Approve"><CheckCircle size={16} /></button>
                                                                <button onClick={() => handleModeration(r.id, 'rejected')} className="action-btn admin-color-red admin-border-none admin-p-5 admin-rounded-md admin-st-72931cd2" title="Reject"><XCircle size={16} /></button>
                                                            </div>
                                                        </td>
                                                    )}
                                                    {activeTab === 'approved' && (
                                                        <td>
                                                            <label className="admin-flex-center admin-cursor-pointer admin-gap-10">
                                                                <input 
                                                                    type="checkbox" 
                                                                    checked={r.is_showcased === 1 || r.is_showcased === true} 
                                                                    onChange={(e) => handleModeration(r.id, 'approved', e.target.checked)}
                                                                    className="admin-cursor-pointer admin-st-95e08695"
                                                                />
                                                                <span className="admin-text-sm admin-color-slate-500">Show on Info Page</span>
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
