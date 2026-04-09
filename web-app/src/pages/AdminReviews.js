import React, { useState, useEffect } from 'react';
import Axios from 'axios';
import { Star, CheckCircle, XCircle, Inbox, Eye } from 'lucide-react';
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
    const pendingCount = reviews.filter(r => r.status === 'pending').length;
    const approvedCount = reviews.filter(r => r.status === 'approved').length;
    const rejectedCount = reviews.filter(r => r.status === 'rejected').length;

    const renderStars = (rating) => {
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                {[1, 2, 3, 4, 5].map(star => (
                    <Star 
                        key={star} 
                        size={14} 
                        color={rating >= star ? '#f59e0b' : '#e2e8f0'} 
                        fill={rating >= star ? '#f59e0b' : 'transparent'} 
                    />
                ))}
                <span style={{ marginLeft: '6px', fontWeight: 600, color: '#475569', fontSize: '0.9rem' }}>{rating}.0</span>
            </div>
        );
    };

    return (
        <div className="admin-page-with-sidenav">
            <AdminSideNav />
            <div className="admin-page page-container-enter">
                <header className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                        <h1 style={{ margin: 0 }}>Review Moderation</h1>
                        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.95rem' }}>Approve or reject customer reviews before they appear on artist pages.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#fef3c7', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, color: '#92400e' }}>
                            <Star size={14} fill="#f59e0b" color="#f59e0b" /> {pendingCount} Pending
                        </div>
                    </div>
                </header>

                {/* Tab Navigation */}
                <div style={{ display: 'flex', gap: '4px', padding: '0 24px', marginBottom: '24px' }}>
                    {[
                        { key: 'pending', label: 'Pending Review', count: pendingCount, color: '#f59e0b' },
                        { key: 'approved', label: 'Approved', count: approvedCount, color: '#10b981' },
                        { key: 'rejected', label: 'Rejected', count: rejectedCount, color: '#ef4444' }
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            style={{
                                padding: '10px 20px',
                                border: 'none',
                                borderBottom: activeTab === tab.key ? `3px solid ${tab.color}` : '3px solid transparent',
                                background: activeTab === tab.key ? '#fff' : 'transparent',
                                color: activeTab === tab.key ? '#1e293b' : '#94a3b8',
                                fontWeight: activeTab === tab.key ? 700 : 500,
                                fontSize: '0.9rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                borderRadius: '8px 8px 0 0',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            {tab.label}
                            <span style={{
                                background: activeTab === tab.key ? tab.color : '#e2e8f0',
                                color: activeTab === tab.key ? '#fff' : '#64748b',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                minWidth: '20px',
                                textAlign: 'center'
                            }}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div style={{ padding: '0 24px 24px' }}>
                    <div className="data-card" style={{ padding: 0, overflow: 'hidden' }}>
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                                <p>Loading reviews...</p>
                            </div>
                        ) : filteredReviews.length > 0 ? (
                            <div className="table-responsive">
                                <table className="admin-table" style={{ margin: 0 }}>
                                    <thead>
                                        <tr>
                                            <th style={{ padding: '14px 20px' }}>Client</th>
                                            <th style={{ padding: '14px 20px' }}>Artist</th>
                                            <th style={{ padding: '14px 20px' }}>Rating</th>
                                            <th style={{ padding: '14px 20px', width: '35%' }}>Comment</th>
                                            <th style={{ padding: '14px 20px' }}>Date</th>
                                            <th style={{ padding: '14px 20px' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredReviews.map(r => (
                                            <tr key={r.id} style={{ transition: 'background 0.15s' }}>
                                                <td style={{ fontWeight: 600, padding: '16px 20px', color: '#1e293b' }}>{r.customer_name}</td>
                                                <td style={{ padding: '16px 20px', color: '#475569' }}>{r.artist_name}</td>
                                                <td style={{ padding: '16px 20px' }}>
                                                    {renderStars(r.rating)}
                                                </td>
                                                <td style={{ padding: '16px 20px', maxWidth: '350px', fontSize: '0.9rem', lineHeight: '1.5', color: '#475569' }}>
                                                    {r.comment ? (
                                                        <div style={{ 
                                                            background: '#f8fafc', 
                                                            padding: '10px 14px', 
                                                            borderRadius: '8px', 
                                                            borderLeft: '3px solid #e2e8f0',
                                                            fontStyle: 'normal'
                                                        }}>
                                                            "{r.comment}"
                                                        </div>
                                                    ) : (
                                                        <span style={{ color: '#cbd5e1', fontStyle: 'italic' }}>No comment provided</span>
                                                    )}
                                                </td>
                                                <td style={{ padding: '16px 20px', color: '#64748b', fontSize: '0.85rem' }}>
                                                    {new Date(r.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                                </td>
                                                <td style={{ padding: '16px 20px' }}>
                                                    {activeTab === 'pending' && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <button 
                                                                onClick={() => handleModeration(r.id, 'approved')} 
                                                                style={{ 
                                                                    display: 'flex', alignItems: 'center', gap: '6px',
                                                                    background: '#ecfdf5', color: '#059669', 
                                                                    border: '1px solid #a7f3d0', padding: '8px 14px', 
                                                                    borderRadius: '8px', cursor: 'pointer', fontWeight: 600,
                                                                    fontSize: '0.85rem', transition: 'all 0.2s'
                                                                }} 
                                                                title="Approve"
                                                            >
                                                                <CheckCircle size={16} /> Approve
                                                            </button>
                                                            <button 
                                                                onClick={() => handleModeration(r.id, 'rejected')} 
                                                                style={{ 
                                                                    display: 'flex', alignItems: 'center', gap: '6px',
                                                                    background: '#fef2f2', color: '#dc2626', 
                                                                    border: '1px solid #fecaca', padding: '8px 14px', 
                                                                    borderRadius: '8px', cursor: 'pointer', fontWeight: 600,
                                                                    fontSize: '0.85rem', transition: 'all 0.2s'
                                                                }} 
                                                                title="Reject"
                                                            >
                                                                <XCircle size={16} /> Reject
                                                            </button>
                                                        </div>
                                                    )}
                                                    {activeTab === 'approved' && (
                                                        <label style={{ 
                                                            display: 'flex', alignItems: 'center', gap: '10px', 
                                                            cursor: 'pointer', padding: '8px 14px',
                                                            background: r.is_showcased ? '#eff6ff' : '#f8fafc',
                                                            border: r.is_showcased ? '1px solid #93c5fd' : '1px solid #e2e8f0',
                                                            borderRadius: '8px', transition: 'all 0.2s'
                                                        }}>
                                                            <input 
                                                                type="checkbox" 
                                                                checked={r.is_showcased === 1 || r.is_showcased === true} 
                                                                onChange={(e) => handleModeration(r.id, 'approved', e.target.checked)}
                                                                style={{ cursor: 'pointer', accentColor: '#3b82f6', width: '16px', height: '16px' }}
                                                            />
                                                            <span style={{ fontSize: '0.85rem', color: r.is_showcased ? '#1d4ed8' : '#64748b', fontWeight: r.is_showcased ? 600 : 400 }}>
                                                                {r.is_showcased ? 'Showcased' : 'Show on Page'}
                                                            </span>
                                                            {r.is_showcased && <Eye size={14} color="#3b82f6" />}
                                                        </label>
                                                    )}
                                                    {activeTab === 'rejected' && (
                                                        <button 
                                                            onClick={() => handleModeration(r.id, 'approved')} 
                                                            style={{ 
                                                                display: 'flex', alignItems: 'center', gap: '6px',
                                                                background: '#f8fafc', color: '#475569', 
                                                                border: '1px solid #e2e8f0', padding: '8px 14px', 
                                                                borderRadius: '8px', cursor: 'pointer', fontWeight: 500,
                                                                fontSize: '0.85rem', transition: 'all 0.2s'
                                                            }}
                                                        >
                                                            <CheckCircle size={16} /> Re-approve
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                                <Inbox size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                                <p style={{ fontSize: '1rem', margin: 0 }}>No {activeTab} reviews found.</p>
                                <p style={{ fontSize: '0.85rem', margin: '8px 0 0', color: '#cbd5e1' }}>
                                    {activeTab === 'pending' ? 'All reviews have been processed!' : `No reviews have been ${activeTab} yet.`}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AdminReviews;
