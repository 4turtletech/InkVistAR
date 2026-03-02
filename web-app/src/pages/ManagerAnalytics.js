import React, { useState, useEffect } from 'react';
import Axios from 'axios';
import ManagerSideNav from '../components/ManagerSideNav';
import './PortalStyles.css';
import { API_URL } from '../config';

function ManagerAnalytics() {
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            try {
                const usersRes = await Axios.get(`${API_URL}/api/debug/users`);
                const users = usersRes.data.success ? usersRes.data.users : [];
                const totalArtists = users.filter(u => u.user_type === 'artist').length;
                const totalClients = users.filter(u => u.user_type === 'customer').length;
                setSummary({ totalArtists, totalClients, totalUsers: users.length });
                setLoading(false);
            } catch (e) {
                console.error(e);
                setLoading(false);
            }
        };
        fetch();
    }, []);

    return (
        <div className="portal-layout">
            <ManagerSideNav />
            <div className="portal-container manager-portal">
                <header className="portal-header">
                    <h1>Analytics (Manager)</h1>
                </header>

                <div className="portal-content">
                    {loading ? (
                        <div className="no-data">Loading summary...</div>
                    ) : (
                        <div className="stats-grid">
                            <div className="stat-card">
                                <h3>Total Users</h3>
                                <p className="stat-value">{summary.totalUsers}</p>
                            </div>
                            <div className="stat-card">
                                <h3>Artists</h3>
                                <p className="stat-value">{summary.totalArtists}</p>
                            </div>
                            <div className="stat-card">
                                <h3>Customers</h3>
                                <p className="stat-value">{summary.totalClients}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ManagerAnalytics;
