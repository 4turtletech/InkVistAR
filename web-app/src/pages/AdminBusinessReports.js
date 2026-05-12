import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Axios from 'axios';
import { FileText, Search, Filter, Printer, Download, ShoppingCart, Package, RefreshCw } from 'lucide-react';
import AdminSideNav from '../components/AdminSideNav';
import { API_URL } from '../config';
import './PortalStyles.css';
import './AdminStyles.css';

function AdminBusinessReports() {
    const [reportType, setReportType] = useState('pos'); // 'pos' or 'inventory'
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(1); // First of the month
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => {
        const d = new Date();
        return d.toISOString().split('T')[0];
    });
    
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Generate Report
    const fetchReport = useCallback(async () => {
        setLoading(true);
        try {
            if (reportType === 'pos') {
                // Fetch invoices for POS sales
                const res = await Axios.get(`${API_URL}/api/admin/invoices`);
                if (res.data.success) {
                    setData(res.data.data || []);
                }
            } else if (reportType === 'inventory') {
                // Fetch inventory transactions
                const res = await Axios.get(`${API_URL}/api/admin/inventory/transactions`);
                if (res.data.success) {
                    setData(res.data.data || []);
                }
            }
        } catch (error) {
            console.error("Error fetching report data:", error);
        } finally {
            setLoading(false);
        }
    }, [reportType]);
    
    useEffect(() => {
        fetchReport();
    }, [fetchReport]);
    
    // Filter data based on dates and search
    const filteredData = useMemo(() => {
        if (!data || !Array.isArray(data)) return [];
        return data.filter(item => {
            // Date parsing
            let itemDateStr = '';
            if (reportType === 'pos') {
                itemDateStr = item.created_at || item.issue_date || '';
            } else {
                itemDateStr = item.created_at || item.transaction_date || '';
            }
            
            const itemDate = new Date(itemDateStr);
            const sDate = new Date(startDate);
            const eDate = new Date(endDate);
            eDate.setHours(23, 59, 59, 999);
            
            const withinDateRange = itemDate >= sDate && itemDate <= eDate;
            
            // Search term
            const matchSearch = Object.values(item).some(val => 
                String(val).toLowerCase().includes(searchTerm.toLowerCase())
            );
            
            return withinDateRange && matchSearch;
        }).sort((a, b) => new Date(b.created_at || b.issue_date || b.transaction_date) - new Date(a.created_at || a.issue_date || a.transaction_date));
    }, [data, startDate, endDate, searchTerm, reportType]);
    
    const exportCSV = () => {
        if (filteredData.length === 0) return;
        
        let headers = [];
        let rows = [];
        
        if (reportType === 'pos') {
            headers = ['Invoice ID', 'Client', 'Type', 'Amount', 'Discount', 'Status', 'Date'];
            rows = filteredData.map(item => [
                item.invoice_number || `INV-${item.id}`,
                `"${item.client_name || 'Walk-in'}"`,
                `"${item.type || 'Retail POS Sale'}"`,
                item.amount || 0,
                item.discount_amount || 0,
                item.status || 'Paid',
                new Date(item.created_at || item.issue_date).toLocaleDateString()
            ]);
        } else {
            headers = ['Transaction ID', 'Item Name', 'Type', 'Quantity', 'Reason', 'User', 'Date'];
            rows = filteredData.map(item => [
                item.id,
                `"${item.item_name || ''}"`,
                item.type || '',
                item.quantity || 0,
                `"${item.reason || ''}"`,
                `"${item.user_name || ''}"`,
                new Date(item.created_at).toLocaleDateString()
            ]);
        }
        
        const csvContent = [
            headers.join(','),
            ...rows.map(e => e.join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `inkvistar_${reportType}_report_${startDate}_to_${endDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    const printPDF = () => {
        const pw = window.open('', '_blank', 'width=800,height=900');
        
        let tableHeaders = '';
        let tableRows = '';
        
        if (reportType === 'pos') {
            const totalRevenue = filteredData.reduce((sum, item) => sum + (parseFloat(item.amount) || 0) - (parseFloat(item.discount_amount) || 0), 0);
            tableHeaders = `<th>Invoice ID</th><th>Client</th><th>Type</th><th>Amount</th><th>Status</th><th>Date</th>`;
            tableRows = filteredData.map(item => `
                <tr>
                    <td>${item.invoice_number || 'INV-'+item.id}</td>
                    <td>${item.client_name || 'Walk-in'}</td>
                    <td>${item.type || 'Retail'}</td>
                    <td>₱${((parseFloat(item.amount) || 0) - (parseFloat(item.discount_amount) || 0)).toLocaleString("en-PH", {minimumFractionDigits:2})}</td>
                    <td>${item.status}</td>
                    <td>${new Date(item.created_at || item.issue_date).toLocaleDateString()}</td>
                </tr>
            `).join('');
            
            tableRows += `<tr><td colspan="3" style="text-align:right; font-weight:bold;">Total Revenue:</td><td colspan="3" style="font-weight:bold; color:#10b981;">₱${totalRevenue.toLocaleString("en-PH", {minimumFractionDigits:2})}</td></tr>`;
        } else {
            tableHeaders = `<th>Item</th><th>Type</th><th>Quantity</th><th>Reason</th><th>Staff</th><th>Date</th>`;
            tableRows = filteredData.map(item => `
                <tr>
                    <td>${item.item_name}</td>
                    <td><span style="color: ${item.type === 'in' ? '#10b981' : '#ef4444'}">${item.type.toUpperCase()}</span></td>
                    <td>${item.quantity}</td>
                    <td>${item.reason}</td>
                    <td>${item.user_name || 'System'}</td>
                    <td>${new Date(item.created_at).toLocaleDateString()}</td>
                </tr>
            `).join('');
        }
        
        pw.document.write(`
            <html>
                <head>
                    <title>InkVistAR ${reportType === 'pos' ? 'POS Sales' : 'Inventory'} Report</title>
                    <style>
                        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1e293b; }
                        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
                        h1 { margin: 0 0 10px 0; color: #0f172a; }
                        .meta { color: #64748b; font-size: 0.9rem; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
                        th { background-color: #f8fafc; font-weight: 600; color: #475569; text-transform: uppercase; font-size: 0.8rem; }
                        tr:nth-child(even) { background-color: #f8fafc; }
                        .footer { margin-top: 40px; text-align: center; font-size: 0.8rem; color: #94a3b8; }
                        @media print { body { padding: 20px; } }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>InkVistAR Studio</h1>
                        <h2>${reportType === 'pos' ? 'Point of Sale (POS) Sales Report' : 'Inventory Transaction Report'}</h2>
                        <div class="meta">Period: ${startDate} to ${endDate}</div>
                        <div class="meta">Generated: ${new Date().toLocaleString()}</div>
                    </div>
                    <table>
                        <thead><tr>${tableHeaders}</tr></thead>
                        <tbody>${tableRows}</tbody>
                    </table>
                    <div class="footer">Confidential Internal Report • InkVistAR Studio</div>
                </body>
            </html>
        `);
        pw.document.close();
        pw.focus();
        setTimeout(() => pw.print(), 500);
    };

    return (
        <div className="admin-page-with-sidenav">
            <AdminSideNav />
            <div className="admin-page page-container-enter">
                {/* 1. Summary Widget (Headers) */}
                <header className="portal-header" style={{ marginBottom: '24px' }}>
                    <div className="header-title">
                        <h1>Report Generator</h1>
                    </div>
                    <div className="header-actions">
                        <button className="btn btn-secondary" onClick={exportCSV} disabled={filteredData.length === 0} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Download size={18} /> Export CSV
                        </button>
                        <button className="btn btn-primary" onClick={printPDF} disabled={filteredData.length === 0} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Printer size={18} /> Print PDF
                        </button>
                    </div>
                </header>
                <p className="header-subtitle" style={{ marginTop: '-15px', marginBottom: '24px' }}>Generate detailed tabular reports for Point of Sale and Inventory.</p>

                {/* 2. Filter / Search Bar */}
                <div className="premium-filter-bar premium-filter-bar--stacked glass-card">
                    <div className="premium-search-box--full">
                        <Search size={18} className="search-icon" />
                        <input 
                            type="text" 
                            placeholder="Search records by name, ID, or reason..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <div className="premium-filters-row">
                        <div className="modern-view-toggle">
                            <button 
                                className={`toggle-btn ${reportType === 'pos' ? 'active' : ''}`}
                                onClick={() => setReportType('pos')}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                <ShoppingCart size={16} /> POS Sales
                            </button>
                            <button 
                                className={`toggle-btn ${reportType === 'inventory' ? 'active' : ''}`}
                                onClick={() => setReportType('inventory')}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                <Package size={16} /> Inventory
                            </button>
                        </div>
                        
                        <div className="filter-group" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <div className="date-picker-wrapper">
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginRight: '8px' }}>From</label>
                                <input 
                                    type="date" 
                                    className="premium-date-input" 
                                    value={startDate} 
                                    onChange={(e) => setStartDate(e.target.value)}
                                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                                />
                            </div>
                            <div className="date-picker-wrapper">
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginRight: '8px' }}>To</label>
                                <input 
                                    type="date" 
                                    className="premium-date-input" 
                                    value={endDate} 
                                    onChange={(e) => setEndDate(e.target.value)}
                                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                                />
                            </div>
                            <button className="icon-btn-v2" onClick={fetchReport} title="Refresh Data">
                                <RefreshCw size={18} className={loading ? 'spinning' : ''} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* 3. Data Tables */}
                <div className="glass-card" style={{ marginTop: '24px', flex: 1 }}>
                    <div className="card-header-v2">
                        <div className="header-title">
                            <FileText size={20} />
                            <h2>{reportType === 'pos' ? 'POS Transactions Report' : 'Inventory Movements Report'}</h2>
                            <span className="count-badge">{filteredData.length} Records</span>
                        </div>
                    </div>
                    
                    <div className="modern-table-wrapper table-responsive" style={{ minHeight: '500px' }}>
                        {loading ? (
                            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                                <div className="premium-loader" style={{ margin: '0 auto 16px' }}></div>
                                <p>Loading report data...</p>
                            </div>
                        ) : (
                            <table className="premium-table">
                                <thead>
                                    {reportType === 'pos' ? (
                                        <tr>
                                            <th>Invoice ID</th>
                                            <th>Date</th>
                                            <th>Client</th>
                                            <th>Type</th>
                                            <th>Amount</th>
                                            <th>Discount</th>
                                            <th>Status</th>
                                        </tr>
                                    ) : (
                                        <tr>
                                            <th>ID</th>
                                            <th>Date</th>
                                            <th>Item Name</th>
                                            <th>Type</th>
                                            <th>Qty</th>
                                            <th>Reason</th>
                                            <th>Staff</th>
                                        </tr>
                                    )}
                                </thead>
                                <tbody>
                                    {filteredData.length > 0 ? filteredData.map((item) => (
                                        <tr key={item.id}>
                                            {reportType === 'pos' ? (
                                                <>
                                                    <td>{item.invoice_number || `INV-${item.id}`}</td>
                                                    <td className="date-time-cell">
                                                        <div className="primary-date">{new Date(item.created_at || item.issue_date).toLocaleDateString()}</div>
                                                    </td>
                                                    <td>{item.client_name || 'Walk-in'}</td>
                                                    <td>{item.type || 'Retail POS Sale'}</td>
                                                    <td style={{ fontWeight: 600 }}>₱{parseFloat(item.amount || 0).toLocaleString("en-PH", {minimumFractionDigits:2})}</td>
                                                    <td style={{ color: '#ef4444' }}>₱{parseFloat(item.discount_amount || 0).toLocaleString("en-PH", {minimumFractionDigits:2})}</td>
                                                    <td>
                                                        <span className={`badge-v2 ${item.status === 'Paid' ? 'completed' : 'pending'}`}>
                                                            {item.status || 'Paid'}
                                                        </span>
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td>#{item.id}</td>
                                                    <td className="date-time-cell">
                                                        <div className="primary-date">{new Date(item.created_at).toLocaleDateString()}</div>
                                                        <div className="secondary-time">{new Date(item.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                                    </td>
                                                    <td style={{ fontWeight: 600, color: '#334155' }}>{item.item_name}</td>
                                                    <td>
                                                        <span className={`badge-v2 ${item.type === 'in' ? 'completed' : 'cancelled'}`} style={{ textTransform: 'uppercase' }}>
                                                            {item.type}
                                                        </span>
                                                    </td>
                                                    <td style={{ fontWeight: 700, fontSize: '1.05rem' }}>
                                                        {item.type === 'in' ? '+' : '-'}{item.quantity}
                                                    </td>
                                                    <td>{item.reason}</td>
                                                    <td>{item.user_name || 'System'}</td>
                                                </>
                                            )}
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="7" className="no-data">
                                                <Filter size={32} style={{ opacity: 0.2, margin: '0 auto 12px' }} />
                                                <div>No records found for the selected period.</div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AdminBusinessReports;
