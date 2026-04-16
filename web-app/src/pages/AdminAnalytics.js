import React, { useState, useEffect } from 'react';
import Axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { DollarSign, Calendar, Users, Download, Package, Printer, Filter, Clock } from 'lucide-react';
import AdminSideNav from '../components/AdminSideNav';
import './AdminAnalytics.css';
import './AdminStyles.css';
import { API_URL } from '../config';

function AdminAnalytics() {
    const [dateRange, setDateRange] = useState('month');
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const res = await Axios.get(`${API_URL}/api/admin/analytics`);
            if (res.data.success) {
                setAnalytics(res.data.data);
            }
            setLoading(false);
        } catch (error) {
            console.error("Error fetching analytics:", error);
            setLoading(false);
        }
    };

    const escapeCsv = (str) => {
        if (str === null || str === undefined) return '""';
        const stringified = String(str);
        if (stringified.includes('"') || stringified.includes(',')) {
            return `"${stringified.replace(/"/g, '""')}"`;
        }
        return `"${stringified}"`;
    };

    const handleExport = () => {
        if (!analytics) return;
        
        // Prepare CSV data
        const rows = [
            ['Report Type', 'Metric', 'Value'],
            ['Revenue', 'Total Revenue', `₱${Number(analytics.revenue.total).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
            ['Appointments', 'Total', analytics.appointments.total],
            ['Appointments', 'Completed', analytics.appointments.completed],
            ['Appointments', 'Cancelled', analytics.appointments.cancelled],
            [],
            ['Artist Performance', 'Name', 'Revenue', 'Appointments'],
            ...analytics.artists.map(a => ['Artist', a.name, `₱${Number(a.revenue).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, a.appointments]),
            [],
            ['Inventory Consumption', 'Item', 'Used Qty'],
            ...analytics.inventory.map(i => ['Inventory', i.name, `${i.used} ${i.unit}`])
        ];
        
        let csvContent = "data:text/csv;charset=utf-8," 
            + rows.map(e => e.map(cell => escapeCsv(cell)).join(",")).join("\n");
            
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `analytics_report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
    };
    
    const handlePrint = () => {
        if (!analytics) return;
        const printWindow = window.open('', '_blank');
        
        const artistRows = analytics.artists.map(a => `
            <tr>
                <td>${escapeCsv(a.name).replace(/"/g, '')}</td>
                <td>₱${(Number(a.revenue) || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td>${a.appointments || 0}</td>
            </tr>
        `).join('');

        const inventoryRows = analytics.inventory.map(i => `
            <tr>
                <td>${escapeCsv(i.name).replace(/"/g, '')}</td>
                <td>${i.used || 0} ${i.unit || ''}</td>
            </tr>
        `).join('');

        printWindow.document.write(`
            <html>
                <head>
                    <title>Print Analytics Report</title>
                    <style>
                        body { font-family: sans-serif; padding: 20px; color: #333; }
                        h1, h2 { color: #1e293b; text-align: center; }
                        .metric-grid { display: flex; justify-content: space-around; background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
                        .metric-card { text-align: center; border: 1px solid #cbd5e1; padding: 15px; border-radius: 8px; flex: 1; margin: 0 10px; background: #fff;}
                        .metric-card p { font-size: 1.5rem; font-weight: bold; margin: 5px 0; color: #0f172a; }
                        table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 30px; }
                        th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 14px; }
                        th { background-color: #f1f5f9; color: #475569; }
                    </style>
                </head>
                <body>
                    <h1>Analytics & Performance Report - InkVistAR</h1>
                    <p style="text-align:center;">Date Range: ${dateRange.toUpperCase()} | Generated on ${new Date().toLocaleString()}</p>
                    
                    <div class="metric-grid">
                        <div class="metric-card">
                            <small>Total Revenue</small>
                            <p>₱${(Number(analytics.revenue.total) || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                        <div class="metric-card">
                            <small>Total Appointments</small>
                            <p>${analytics.appointments.total}</p>
                            <small style="color: #64748b;">${analytics.appointments.completed} completed, ${analytics.appointments.cancelled} cancelled</small>
                        </div>
                        <div class="metric-card">
                            <small>Completion Rate</small>
                            <p>${analytics.appointments.completionRate || 0}%</p>
                        </div>
                    </div>

                    <h2>Artist Performance</h2>
                    <table>
                        <thead>
                            <tr><th>Artist Name</th><th>Revenue Generated</th><th>Appointments</th></tr>
                        </thead>
                        <tbody>${artistRows}</tbody>
                    </table>

                    <h2>Inventory Consumption</h2>
                    <table>
                        <thead>
                            <tr><th>Item Name</th><th>Units Used</th></tr>
                        </thead>
                        <tbody>${inventoryRows}</tbody>
                    </table>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);
    };

    return (
        <div className="admin-page-with-sidenav">
               <AdminSideNav />
            <div className="admin-page page-container-enter">
            <div className="analytics-sticky-header">
                <header className="admin-header">
                    <div className="header-title-area">
                        <h1>Analytics & Reports</h1>
                        <p>Track your studio's performance and inventory</p>
                    </div>
                    <div className="header-actions-group">
                        <div className="filter-group-glass">
                            <Filter size={16} color="#6366f1" />
                            <span>Time Range:</span>
                            <select 
                                value={dateRange}
                                onChange={(e) => setDateRange(e.target.value)}
                                className="premium-select-glass"
                            >
                                <option value="week">Last Week</option>
                                <option value="month">This Month</option>
                                <option value="quarter">This Quarter</option>
                                <option value="year">This Year</option>
                            </select>
                        </div>
                        <button className="btn btn-secondary" onClick={handlePrint}>
                            <Printer size={18} /> Print
                        </button>
                        <button className="btn btn-primary" onClick={handleExport}>
                            <Download size={18} /> Export
                        </button>
                    </div>
                </header>
            </div>

            {loading ? (
                <div className="no-data admin-st-28fdef5f">Loading analytics...</div>
            ) : !analytics ? (
                <div className="no-data admin-st-28fdef5f">No analytics data available.</div>
            ) : (
            <>
            {/* Print Only Header */}
            <div className="print-only-header">
                <div className="admin-st-c6657cae">
                    <div>
                        <h1 className="admin-st-b43c9608">InkVistAR Studio</h1>
                        <p className="admin-st-c4858c02">Analytics & Performance Report</p>
                    </div>
                    <div className="admin-st-7851dbc0">
                        <p className="admin-st-c4858c02">Date: {new Date().toLocaleDateString()}</p>
                        <p className="admin-st-c4858c02">Range: {dateRange.charAt(0).toUpperCase() + dateRange.slice(1)}</p>
                    </div>
                </div>
            </div>
            {/* Key Metrics */}
            <div className="metrics-section">
                <div className="metric-card glass-card primary-metric">
                    <DollarSign className="metric-icon" size={32} />
                    <div className="metric-content">
                        <p className="metric-label">Total Revenue</p>
                        <p className="metric-value">₱{Number(analytics.revenue.total).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                </div>

                <div className="metric-card glass-card" style={{ borderLeft: '4px solid #ef4444' }}>
                    <DollarSign className="metric-icon" size={32} color="#ef4444" />
                    <div className="metric-content">
                        <p className="metric-label">Total Expenses</p>
                        <p className="metric-value" style={{ color: '#ef4444' }}>₱{Number(analytics.expenses?.total || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        <p className="metric-info">Inventory procurements</p>
                    </div>
                </div>

                <div className="metric-card glass-card">
                    <Calendar className="metric-icon" size={32} />
                    <div className="metric-content">
                        <p className="metric-label">Total Appointments</p>
                        <p className="metric-value">{analytics.appointments.total}</p>
                        <p className="metric-info">
                            <span style={{color: '#10b981', fontWeight: '600'}}>{analytics.appointments.completed} completed</span>
                        </p>
                    </div>
                </div>

                <div className="metric-card glass-card">
                    <Users className="metric-icon" size={32} />
                    <div className="metric-content">
                        <p className="metric-label">Active Artists</p>
                        <p className="metric-value">{analytics.artists?.length || 0}</p>
                        <p className="metric-info">
                            Producing Revenue
                        </p>
                    </div>
                </div>

                <div className="metric-card glass-card">
                    <Package className="metric-icon" size={32} />
                    <div className="metric-content">
                        <p className="metric-label">Inventory Used</p>
                        <p className="metric-value">{analytics.inventory.reduce((sum, i) => sum + Number(i.used || 0), 0).toLocaleString()}</p>
                        <p className="metric-info">
                            Items consumed
                        </p>
                    </div>
                </div>

                <div className="metric-card glass-card">
                    <div className="metric-icon" style={{color: '#10b981'}}>✓</div>
                    <div className="metric-content">
                        <p className="metric-label">Completion Rate</p>
                        <p className="metric-value">{analytics.appointments.completionRate}%</p>
                        <p className="metric-info" style={{color: '#ef4444'}}>
                            {analytics.appointments.cancelled} cancelled
                        </p>
                    </div>
                </div>

                <div className="metric-card glass-card">
                    <Clock className="metric-icon" size={32} />
                    <div className="metric-content">
                        <p className="metric-label">Avg Session Duration</p>
                        <p className="metric-value">{analytics.appointments.avgDuration ? (() => { const hrs = Math.floor(analytics.appointments.avgDuration / 3600); const mins = Math.floor((analytics.appointments.avgDuration % 3600) / 60); return hrs > 0 ? `${hrs}h ${String(mins).padStart(2, '0')}m` : `${mins}m`; })() : 'N/A'}</p>
                        <p className="metric-info">
                            Per completed session
                        </p>
                    </div>
                </div>
            </div>

            <div className="analytics-grid">
                {/* Services Performance */}
                <div className="card glass-card">
                    <h2>Popular Styles</h2>
                    <div className="service-list">
                        {analytics.styles.map((style, index) => (
                            <div key={index} className="service-item">
                                <div className="service-info">
                                    <p className="service-name">{style.name}</p>
                                    <div className="service-stats">
                                        <span>{style.count} works</span>
                                    </div>
                                </div>
                                <div className="progress-bar">
                                    <div 
                                        className="progress-fill indigo-fill" 
                                        style={{ width: `${(style.count / Math.max(...analytics.styles.map(s => s.count))) * 100}%` }}
                                    >
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Artist Performance */}
                <div className="card glass-card">
                    <h2>Top Artists</h2>
                    <div className="artist-list">
                        {analytics.artists.map((artist, index) => (
                            <div key={index} className="artist-item">
                                <div className="artist-info" style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '50%' }}>
                                    <div className="artist-rank">#{index + 1}</div>
                                    <div className="artist-details">
                                        <p className="artist-name">{artist.name}</p>
                                        <p className="artist-rating">⭐ 5.0</p>
                                    </div>
                                </div>
                                <div className="artist-stats" style={{ display: 'flex', gap: '2rem', width: '50%', justifyContent: 'flex-end', paddingRight: '1rem' }}>
                                    <div className="stat">
                                        <span className="stat-value">₱{Number(artist.revenue || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        <span className="stat-label">Revenue</span>
                                    </div>
                                    <div className="stat">
                                        <span className="stat-value">{artist.appointments}</span>
                                        <span className="stat-label">Appointments</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="analytics-grid">
                {/* Inventory */}
                <div className="card glass-card">
                    <h2>Inventory Consumption</h2>
                    <div className="service-list">
                        {analytics.inventory.map((item, index) => (
                            <div key={index} className="service-item">
                                <div className="service-info">
                                    <p className="service-name">{item.name}</p>
                                    <div className="service-stats">
                                        <span>{item.used} {item.unit} used</span>
                                    </div>
                                </div>
                                <div className="progress-bar">
                                    <div 
                                        className="progress-fill indigo-fill" 
                                        style={{ width: `${(item.used / Math.max(...analytics.inventory.map(i => i.used))) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Monthly Trend */}
                <div className="card glass-card">
                    <h2>Monthly Revenue Trend</h2>
                    <div className="trend-chart">
                        {analytics.revenue.chart.map((data, index) => (
                            <div key={index} className="trend-item">
                                <div className="trend-bar-container">
                                    <div 
                                        className={`trend-bar ${Number(data.value) === 0 ? 'empty-trend-bar' : ''}`}
                                        style={{ height: Number(data.value) === 0 ? '24px' : `${Math.max(15, Math.min((Number(data.value) / 5000) * 100, 100))}%` }}
                                    >
                                        {Number(data.value) > 0 && <span className="bar-value">₱{Number(data.value).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>}
                                    </div>
                                </div>
                                <div className="trend-info">
                                    <p className="trend-month">{data.month}</p>
                                    {Number(data.value) > 0 && <p className="trend-appointments">{data.appointments} apt</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Additional Stats */}
            <div className="card glass-card">
                <h2>Appointment Breakdown</h2>
                <div className="breakdown-grid">
                    <div className="breakdown-item">
                        <div className="breakdown-stat">
                            <span className="stat-number">{analytics.appointments.completed}</span>
                            <span className="stat-label">Completed</span>
                        </div>
                        <div className="breakdown-percentage green">
                            {Math.round((analytics.appointments.completed / analytics.appointments.total) * 100)}%
                        </div>
                    </div>
                    <div className="breakdown-item">
                        <div className="breakdown-stat">
                            <span className="stat-number">{analytics.appointments.scheduled}</span>
                            <span className="stat-label">Scheduled</span>
                        </div>
                        <div className="breakdown-percentage blue">
                            {Math.round((analytics.appointments.scheduled / analytics.appointments.total) * 100)}%
                        </div>
                    </div>
                    <div className="breakdown-item">
                        <div className="breakdown-stat">
                            <span className="stat-number">{analytics.appointments.cancelled}</span>
                            <span className="stat-label">Cancelled</span>
                        </div>
                        <div className="breakdown-percentage red">
                            {Math.round((analytics.appointments.cancelled / analytics.appointments.total) * 100)}%
                        </div>
                    </div>
                    <div className="breakdown-item">
                        <div className="breakdown-stat">
                            <span className="stat-number">₱{analytics.appointments.total > 0 ? Number((analytics.revenue.total / analytics.appointments.total).toFixed(0)).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 0}</span>
                            <span className="stat-label">Avg per Appointment</span>
                        </div>
                        <div className="breakdown-percentage info">
                            Revenue/Apt
                        </div>
                    </div>
                </div>
            </div>
            </>
            )}
            </div>
        </div>
    );
}

export default AdminAnalytics;
