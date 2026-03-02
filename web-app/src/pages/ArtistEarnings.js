import React, { useState, useEffect } from 'react';
import Axios from 'axios';
import { DollarSign, TrendingUp, CreditCard, Download } from 'lucide-react';
import ArtistSideNav from '../components/ArtistSideNav';
import './PortalStyles.css';
import { API_URL } from '../config';

function ArtistEarnings(){
    const [stats, setStats] = useState({ 
        totalEarnings: 0, 
        totalCommission: 0,
        pendingPayout: 0 
    });
    const [sessionEarnings, setSessionEarnings] = useState([]);
    const [payoutHistory, setPayoutHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [user] = useState(() => {
        const saved = localStorage.getItem('user');
        return saved ? JSON.parse(saved) : null;
    });
    const artistId = user ? user.id : 1;
    const COMMISSION_RATE = 0.7; // 70% to artist

    useEffect(() => {
        const fetch = async () => {
            try {
                setLoading(true);
                // Fetch appointments to calculate earnings
                const res = await Axios.get(`${API_URL}/api/artist/${artistId}/appointments?status=completed`);
                
                if (res.data.success) {
                    const completedAppts = res.data.appointments.map(appt => {
                        // Mock price logic since DB doesn't have price column yet
                        // In real app, this would come from DB
                        const basePrice = appt.price || 150; 
                        const artistShare = basePrice * COMMISSION_RATE;
                        const studioShare = basePrice * (1 - COMMISSION_RATE);
                        
                        return {
                            ...appt,
                            basePrice,
                            artistShare,
                            studioShare
                        };
                    });

                    setSessionEarnings(completedAppts);

                    // Calculate Stats
                    const totalEarnings = completedAppts.reduce((sum, a) => sum + a.artistShare, 0);
                    // Mock pending payout (e.g., last 3 appointments not paid out yet)
                    const pendingPayout = completedAppts.slice(0, 3).reduce((sum, a) => sum + a.artistShare, 0); 

                    setStats({
                        totalEarnings,
                        totalCommission: totalEarnings, // Artist's take
                        pendingPayout
                    });

                    // Generate Payout History (Group by Month)
                    const monthlyGroups = completedAppts.reduce((acc, appt) => {
                        const date = new Date(appt.appointment_date);
                        const monthKey = date.toLocaleString('default', { month: 'long', year: 'numeric' });
                        
                        if (!acc[monthKey]) {
                            acc[monthKey] = { month: monthKey, amount: 0, status: 'Paid', date: date };
                        }
                        acc[monthKey].amount += appt.artistShare;
                        return acc;
                    }, {});

                    const history = Object.values(monthlyGroups).sort((a, b) => b.date - a.date);
                    setPayoutHistory(history);
                }
                setLoading(false);
            } catch(e){ console.error(e); setLoading(false); }
        };
        fetch();
    }, [artistId]);

    return (
        <div className="portal-layout">
            <ArtistSideNav />
            <div className="portal-container artist-portal">
                <header className="portal-header">
                    <h1>Earnings & Commissions</h1>
                    <button className="btn btn-secondary" style={{display: 'flex', gap: '5px', alignItems: 'center'}}>
                        <Download size={16}/> Export Report
                    </button>
                </header>
                
                <div className="portal-content">
                    {loading ? <div className="no-data">Loading...</div> : (
                        <>
                            {/* Summary Stats */}
                            <div className="stats-grid">
                                <div className="stat-card">
                                    <DollarSign className="stat-icon" size={32} />
                                    <div className="stat-info">
                                        <p className="stat-label">Total Earnings</p>
                                        <p className="stat-value">₱{stats.totalEarnings.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                                    </div>
                                </div>
                                <div className="stat-card">
                                    <TrendingUp className="stat-icon" size={32} />
                                    <div className="stat-info">
                                        <p className="stat-label">Commission Rate</p>
                                        <p className="stat-value">{(COMMISSION_RATE * 100)}%</p>
                                    </div>
                                </div>
                                <div className="stat-card">
                                    <CreditCard className="stat-icon" size={32} />
                                    <div className="stat-info">
                                        <p className="stat-label">Pending Payout</p>
                                        <p className="stat-value">₱{stats.pendingPayout.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
                                {/* Session-based Earnings */}
                                <div className="data-card">
                                    <h2>Session Earnings</h2>
                                    {sessionEarnings.length > 0 ? (
                                        <div className="table-responsive">
                                            <table className="portal-table">
                                                <thead>
                                                    <tr>
                                                        <th>Date</th>
                                                        <th>Client</th>
                                                        <th>Service</th>
                                                        <th>Total</th>
                                                        <th>Your Cut ({COMMISSION_RATE * 100}%)</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {sessionEarnings.map((session) => (
                                                        <tr key={session.id}>
                                                            <td>{new Date(session.appointment_date).toLocaleDateString()}</td>
                                                            <td>{session.client_name}</td>
                                                            <td>{session.design_title}</td>
                                                            <td>₱{session.basePrice.toFixed(2)}</td>
                                                            <td style={{color: '#10b981', fontWeight: 'bold'}}>₱{session.artistShare.toFixed(2)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : <p className="no-data">No completed sessions yet.</p>}
                                </div>

                                {/* Payout History */}
                                <div className="data-card">
                                    <h2>Payout History</h2>
                                    {payoutHistory.length > 0 ? (
                                        <div className="table-responsive">
                                            <table className="portal-table">
                                                <thead>
                                                    <tr>
                                                        <th>Month</th>
                                                        <th>Amount</th>
                                                        <th>Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {payoutHistory.map((payout, i) => (
                                                        <tr key={i}>
                                                            <td>{payout.month}</td>
                                                            <td>₱{payout.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                                            <td><span className="status-badge completed">{payout.status}</span></td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : <p className="no-data">No payout history.</p>}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ArtistEarnings;
