import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Axios from 'axios';
import { Printer, Download, Package, RefreshCw, TrendingUp, AlertTriangle, Box, Tag, DollarSign, Activity, Search } from 'lucide-react';
import AdminSideNav from '../components/AdminSideNav';
import { API_URL } from '../config';
import './PortalStyles.css';
import './AdminStyles.css';

function AdminBusinessReports() {
    const [reportType, setReportType] = useState('sales'); // 'sales' or 'inventory'
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(1); // First of the month
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => {
        const d = new Date();
        return d.toISOString().split('T')[0];
    });
    const [searchTerm, setSearchTerm] = useState('');
    
    const [loading, setLoading] = useState(false);
    
    // Data stores
    const [invoices, setInvoices] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [transactions, setTransactions] = useState([]);
    
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            if (reportType === 'sales') {
                const res = await Axios.get(`${API_URL}/api/admin/invoices`);
                if (res.data.success) setInvoices(res.data.data || []);
            } else if (reportType === 'inventory') {
                const [invRes, transRes] = await Promise.all([
                    Axios.get(`${API_URL}/api/admin/inventory`),
                    Axios.get(`${API_URL}/api/admin/inventory/transactions`)
                ]);
                if (invRes.data.success) setInventory(invRes.data.data || []);
                if (transRes.data.success) setTransactions(transRes.data.data || []);
            }
        } catch (error) {
            console.error("Error fetching report data:", error);
        } finally {
            setLoading(false);
        }
    }, [reportType]);
    
    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    /* ═══════════════ SALES AGGREGATION ═══════════════ */
    const salesReport = useMemo(() => {
        if (reportType !== 'sales') return null;
        
        const sDate = new Date(startDate);
        const eDate = new Date(endDate);
        eDate.setHours(23, 59, 59, 999);
        
        const periodInvoices = invoices.filter(inv => {
            const d = new Date(inv.created_at || inv.issue_date);
            return d >= sDate && d <= eDate && inv.status?.toLowerCase() === 'paid';
        });
        
        let grossRevenue = 0;
        let totalDiscounts = 0;
        let serviceRevenue = 0;
        let retailRevenue = 0;
        
        // Product mix
        const productSales = {};
        
        periodInvoices.forEach(inv => {
            const amt = parseFloat(inv.amount) || 0;
            const disc = parseFloat(inv.discount_amount) || 0;
            
            grossRevenue += amt;
            totalDiscounts += disc;
            
            const type = (inv.service_type || '').toLowerCase();
            if (type.includes('retail') || type.includes('pos')) {
                retailRevenue += (amt - disc);
                
                // Parse items for product mix
                if (inv.items) {
                    try {
                        const items = typeof inv.items === 'string' ? JSON.parse(inv.items) : inv.items;
                        items.forEach(item => {
                            if (!productSales[item.name]) {
                                productSales[item.name] = { name: item.name, quantity: 0, revenue: 0 };
                            }
                            productSales[item.name].quantity += parseInt(item.quantity) || 0;
                            productSales[item.name].revenue += (parseFloat(item.retail_price) || 0) * (parseInt(item.quantity) || 0);
                        });
                    } catch (e) {
                        console.error("Failed to parse invoice items", e);
                    }
                }
            } else {
                serviceRevenue += (amt - disc);
            }
        });
        
        const netRevenue = grossRevenue - totalDiscounts;
        const totalTransactions = periodInvoices.length;
        const atv = totalTransactions > 0 ? netRevenue / totalTransactions : 0;
        
        const topProducts = Object.values(productSales).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
        
        return { grossRevenue, totalDiscounts, netRevenue, totalTransactions, atv, serviceRevenue, retailRevenue, topProducts };
    }, [invoices, startDate, endDate, reportType]);
    
    /* ═══════════════ INVENTORY AGGREGATION ═══════════════ */
    const inventoryReport = useMemo(() => {
        if (reportType !== 'inventory') return null;
        
        const sDate = new Date(startDate);
        const eDate = new Date(endDate);
        eDate.setHours(23, 59, 59, 999);
        
        let totalValue = 0;
        let totalItems = 0;
        let lowStockCount = 0;
        const lowStockItems = [];
        
        inventory.forEach(item => {
            const qty = parseInt(item.quantity) || 0;
            const min = parseInt(item.min_stock_level) || 0;
            const cost = parseFloat(item.cost) || parseFloat(item.retail_price) || 0;
            
            totalItems += qty;
            totalValue += (qty * cost);
            
            if (qty <= min) {
                lowStockCount++;
                lowStockItems.push(item);
            }
        });
        
        // Compute Movement/Turnover from transactions
        const movements = {};
        transactions.forEach(tx => {
            const d = new Date(tx.created_at || tx.transaction_date);
            if (d >= sDate && d <= eDate) {
                const isOut = tx.type?.toLowerCase() === 'out';
                const qty = parseInt(tx.quantity) || 0;
                
                if (!movements[tx.item_name]) {
                    movements[tx.item_name] = { name: tx.item_name, consumed: 0, added: 0 };
                }
                
                if (isOut) movements[tx.item_name].consumed += qty;
                else movements[tx.item_name].added += qty;
            }
        });
        
        const topConsumed = Object.values(movements)
            .filter(m => m.consumed > 0)
            .sort((a, b) => b.consumed - a.consumed)
            .slice(0, 10);
            
        return { totalValue, totalItems, lowStockCount, lowStockItems, topConsumed };
    }, [inventory, transactions, startDate, endDate, reportType]);

    /* ═══════════════ EXPORTS ═══════════════ */
    const exportCSV = () => {
        let headers = [];
        let rows = [];
        let filename = '';
        
        if (reportType === 'sales' && salesReport) {
            filename = `Sales_Report_${startDate}_to_${endDate}.csv`;
            headers = ['Metric', 'Value'];
            rows = [
                ['Gross Revenue', salesReport.grossRevenue],
                ['Total Discounts', salesReport.totalDiscounts],
                ['Net Revenue', salesReport.netRevenue],
                ['Total Transactions', salesReport.totalTransactions],
                ['Average Transaction Value', salesReport.atv],
                ['Service Revenue', salesReport.serviceRevenue],
                ['Retail Revenue', salesReport.retailRevenue],
                [],
                ['Top Products', 'Quantity Sold', 'Revenue Generated']
            ];
            salesReport.topProducts.forEach(p => {
                rows.push([`"${p.name}"`, p.quantity, p.revenue]);
            });
        } else if (reportType === 'inventory' && inventoryReport) {
            filename = `Inventory_Report_${startDate}_to_${endDate}.csv`;
            headers = ['Metric', 'Value'];
            rows = [
                ['Total Stock Value', inventoryReport.totalValue],
                ['Total Items on Hand', inventoryReport.totalItems],
                ['Low Stock Items Count', inventoryReport.lowStockCount],
                [],
                ['Top Consumed Items', 'Quantity Consumed', 'Quantity Added']
            ];
            inventoryReport.topConsumed.forEach(p => {
                rows.push([`"${p.name}"`, p.consumed, p.added]);
            });
            rows.push([]);
            rows.push(['Low Stock Alerts', 'Current Qty', 'Min Threshold']);
            inventoryReport.lowStockItems.forEach(item => {
                rows.push([`"${item.name}"`, item.quantity, item.min_stock_level]);
            });
        }
        
        if (rows.length === 0) return;
        
        const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    const printPDF = () => {
        const pw = window.open('', '_blank', 'width=800,height=900');
        let bodyHtml = '';
        
        if (reportType === 'sales' && salesReport) {
            bodyHtml = `
                <div class="grid">
                    <div class="card"><small>Net Revenue</small><p>₱${salesReport.netRevenue.toLocaleString("en-PH", {minimumFractionDigits:2})}</p></div>
                    <div class="card"><small>Transactions</small><p>${salesReport.totalTransactions}</p></div>
                    <div class="card"><small>Avg Value (ATV)</small><p>₱${salesReport.atv.toLocaleString("en-PH", {minimumFractionDigits:2})}</p></div>
                    <div class="card"><small>Discounts Given</small><p style="color:#ef4444">₱${salesReport.totalDiscounts.toLocaleString("en-PH", {minimumFractionDigits:2})}</p></div>
                </div>
                <h2>Revenue Mix</h2>
                <table>
                    <tr><th>Services (Tattoos)</th><th>Retail (POS)</th></tr>
                    <tr>
                        <td>₱${salesReport.serviceRevenue.toLocaleString("en-PH", {minimumFractionDigits:2})}</td>
                        <td>₱${salesReport.retailRevenue.toLocaleString("en-PH", {minimumFractionDigits:2})}</td>
                    </tr>
                </table>
                <h2>Top Selling Retail Products</h2>
                <table>
                    <thead><tr><th>Product Name</th><th>Quantity Sold</th><th>Revenue Generated</th></tr></thead>
                    <tbody>
                        ${salesReport.topProducts.map(p => `<tr><td>${p.name}</td><td>${p.quantity}</td><td>₱${p.revenue.toLocaleString("en-PH", {minimumFractionDigits:2})}</td></tr>`).join('')}
                        ${salesReport.topProducts.length === 0 ? '<tr><td colspan="3" style="text-align:center">No retail products sold in this period.</td></tr>' : ''}
                    </tbody>
                </table>
            `;
        } else if (reportType === 'inventory' && inventoryReport) {
            bodyHtml = `
                <div class="grid">
                    <div class="card"><small>Total Stock Value</small><p>₱${inventoryReport.totalValue.toLocaleString("en-PH", {minimumFractionDigits:2})}</p></div>
                    <div class="card"><small>Items on Hand</small><p>${inventoryReport.totalItems}</p></div>
                    <div class="card"><small>Low Stock Alerts</small><p style="color:#ef4444">${inventoryReport.lowStockCount} items</p></div>
                </div>
                <h2>Most Consumed Items (Turnover)</h2>
                <table>
                    <thead><tr><th>Item Name</th><th>Quantity Consumed</th><th>Quantity Added</th></tr></thead>
                    <tbody>
                        ${inventoryReport.topConsumed.map(p => `<tr><td>${p.name}</td><td>${p.consumed}</td><td>${p.added}</td></tr>`).join('')}
                        ${inventoryReport.topConsumed.length === 0 ? '<tr><td colspan="3" style="text-align:center">No inventory consumed in this period.</td></tr>' : ''}
                    </tbody>
                </table>
                <h2>Low Stock / Reorder Alerts</h2>
                <table>
                    <thead><tr><th>Item Name</th><th>Current Stock</th><th>Minimum Threshold</th></tr></thead>
                    <tbody>
                        ${inventoryReport.lowStockItems.map(p => `<tr><td>${p.name}</td><td style="color:#ef4444;font-weight:bold;">${p.quantity}</td><td>${p.min_stock_level}</td></tr>`).join('')}
                        ${inventoryReport.lowStockItems.length === 0 ? '<tr><td colspan="3" style="text-align:center">All stock levels are healthy.</td></tr>' : ''}
                    </tbody>
                </table>
            `;
        }
        
        pw.document.write(`
            <html>
                <head>
                    <title>InkVistAR ${reportType === 'sales' ? 'Sales & Revenue' : 'Inventory Management'} Report</title>
                    <style>
                        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1e293b; }
                        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
                        h1 { margin: 0 0 10px 0; color: #0f172a; }
                        .meta { color: #64748b; font-size: 0.9rem; }
                        .grid { display: flex; gap: 20px; margin-bottom: 30px; flex-wrap: wrap; }
                        .card { flex: 1; min-width: 150px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; text-align: center; }
                        .card p { font-size: 1.4rem; font-weight: 700; margin: 5px 0 0 0; color: #1e293b; }
                        table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 30px; }
                        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
                        th { background-color: #f1f5f9; font-weight: 600; color: #475569; font-size: 0.9rem; }
                        h2 { font-size: 1.2rem; color: #334155; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
                        .footer { margin-top: 40px; text-align: center; font-size: 0.8rem; color: #94a3b8; }
                        @media print { body { padding: 20px; } }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>InkVistAR Studio</h1>
                        <h2>${reportType === 'sales' ? 'Sales & Revenue Report' : 'Inventory Management Report'}</h2>
                        <div class="meta">Period: ${startDate} to ${endDate}</div>
                        <div class="meta">Generated: ${new Date().toLocaleString()}</div>
                    </div>
                    ${bodyHtml}
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
                <header className="portal-header" style={{ marginBottom: '24px' }}>
                    <div className="header-title">
                        <h1>Business Reports</h1>
                    </div>
                    <div className="header-actions">
                        <button className="btn btn-secondary" onClick={exportCSV} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Download size={18} /> Export CSV
                        </button>
                        <button className="btn btn-primary" onClick={printPDF} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Printer size={18} /> Print PDF
                        </button>
                    </div>
                </header>
                <p className="header-subtitle" style={{ marginTop: '-15px', marginBottom: '24px' }}>Generate aggregated insights for Sales and Inventory management.</p>

                {loading ? null : reportType === 'sales' && salesReport ? (
                    <div className="analytics-dashboard-layout" style={{ marginBottom: '24px' }}>
                        <div className="card glass-card">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                <div style={{ padding: '8px', background: '#ecfdf5', borderRadius: '8px', color: '#10b981' }}><DollarSign size={20} /></div>
                                <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#64748b' }}>Net Revenue</h3>
                            </div>
                            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#1e293b' }}>₱{salesReport.netRevenue.toLocaleString("en-PH", {minimumFractionDigits:2})}</div>
                        </div>
                        <div className="card glass-card">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                <div style={{ padding: '8px', background: '#eff6ff', borderRadius: '8px', color: '#3b82f6' }}><Activity size={20} /></div>
                                <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#64748b' }}>Transactions</h3>
                            </div>
                            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#1e293b' }}>{salesReport.totalTransactions}</div>
                        </div>
                        <div className="card glass-card">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                <div style={{ padding: '8px', background: '#f5f3ff', borderRadius: '8px', color: '#8b5cf6' }}><Tag size={20} /></div>
                                <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#64748b' }}>Avg Transaction Val</h3>
                            </div>
                            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#1e293b' }}>₱{salesReport.atv.toLocaleString("en-PH", {minimumFractionDigits:2})}</div>
                        </div>
                    </div>
                ) : reportType === 'inventory' && inventoryReport ? (
                    <div className="analytics-dashboard-layout" style={{ marginBottom: '24px' }}>
                        <div className="card glass-card">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                <div style={{ padding: '8px', background: '#fef3c7', borderRadius: '8px', color: '#d97706' }}><Box size={20} /></div>
                                <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#64748b' }}>Total Stock Value</h3>
                            </div>
                            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#1e293b' }}>₱{inventoryReport.totalValue.toLocaleString("en-PH", {minimumFractionDigits:2})}</div>
                        </div>
                        <div className="card glass-card">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                <div style={{ padding: '8px', background: '#f1f5f9', borderRadius: '8px', color: '#475569' }}><Package size={20} /></div>
                                <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#64748b' }}>Total Items on Hand</h3>
                            </div>
                            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#1e293b' }}>{inventoryReport.totalItems}</div>
                        </div>
                        <div className="card glass-card">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                <div style={{ padding: '8px', background: '#fef2f2', borderRadius: '8px', color: '#ef4444' }}><AlertTriangle size={20} /></div>
                                <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#64748b' }}>Low Stock Alerts</h3>
                            </div>
                            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: inventoryReport.lowStockCount > 0 ? '#ef4444' : '#10b981' }}>{inventoryReport.lowStockCount}</div>
                        </div>
                    </div>
                ) : null}

                <div className="premium-filter-bar premium-filter-bar--stacked glass-card">
                    <div className="premium-search-box--full">
                        <Search size={18} className="search-icon" />
                        <input 
                            type="text" 
                            placeholder="Search records or products..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <div className="premium-filters-row">
                        <div className="modern-view-toggle">
                            <button 
                                className={`toggle-btn ${reportType === 'sales' ? 'active' : ''}`}
                                onClick={() => { setReportType('sales'); setSearchTerm(''); }}
                            >
                                <TrendingUp size={16} /> Sales & Revenue
                            </button>
                            <button 
                                className={`toggle-btn ${reportType === 'inventory' ? 'active' : ''}`}
                                onClick={() => { setReportType('inventory'); setSearchTerm(''); }}
                            >
                                <Package size={16} /> Inventory Assets
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
                                />
                            </div>
                            <div className="date-picker-wrapper">
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginRight: '8px' }}>To</label>
                                <input 
                                    type="date" 
                                    className="premium-date-input" 
                                    value={endDate} 
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>
                            <button className="icon-btn-v2" onClick={fetchData} title="Refresh Data">
                                <RefreshCw size={18} className={loading ? 'spinning' : ''} />
                            </button>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div style={{ padding: '80px', textAlign: 'center', color: '#64748b' }}>
                        <div className="premium-loader" style={{ margin: '0 auto 16px' }}></div>
                        <p>Aggregating report data...</p>
                    </div>
                ) : reportType === 'sales' && salesReport ? (
                    <div className="dashboard-grid fade-in" style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {/* Mix Table */}
                        <div className="grid-2col" style={{ gap: '24px' }}>
                            <div className="glass-card">
                                <div className="card-header-v2">
                                    <div className="header-title"><h2>Bestselling Retail Products</h2></div>
                                </div>
                                <table className="premium-table">
                                    <thead><tr><th>Product</th><th>Qty Sold</th><th>Revenue</th></tr></thead>
                                    <tbody>
                                        {salesReport.topProducts
                                            .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
                                            .map((p, i) => (
                                                <tr key={i}>
                                                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                                                    <td>{p.quantity}</td>
                                                    <td style={{ fontWeight: 600, color: '#10b981' }}>₱{p.revenue.toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        {salesReport.topProducts.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                                            <tr><td colSpan="3" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>No retail data matches your search.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            
                            <div className="glass-card">
                                <div className="card-header-v2">
                                    <div className="header-title"><h2>Revenue by Source</h2></div>
                                </div>
                                <table className="premium-table">
                                    <thead><tr><th>Source</th><th>Amount</th><th>% of Total</th></tr></thead>
                                    <tbody>
                                        <tr>
                                            <td style={{ fontWeight: 600 }}>Tattoo Services</td>
                                            <td style={{ fontWeight: 600 }}>₱{salesReport.serviceRevenue.toLocaleString()}</td>
                                            <td>{salesReport.netRevenue > 0 ? ((salesReport.serviceRevenue / salesReport.netRevenue) * 100).toFixed(1) : 0}%</td>
                                        </tr>
                                        <tr>
                                            <td style={{ fontWeight: 600 }}>Retail POS</td>
                                            <td style={{ fontWeight: 600 }}>₱{salesReport.retailRevenue.toLocaleString()}</td>
                                            <td>{salesReport.netRevenue > 0 ? ((salesReport.retailRevenue / salesReport.netRevenue) * 100).toFixed(1) : 0}%</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ) : reportType === 'inventory' && inventoryReport ? (
                    <div className="dashboard-grid fade-in" style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div className="grid-2col" style={{ gap: '24px' }}>
                            <div className="glass-card">
                                <div className="card-header-v2">
                                    <div className="header-title"><h2>Highest Turnover (Most Consumed)</h2></div>
                                </div>
                                <table className="premium-table">
                                    <thead><tr><th>Item Name</th><th>Consumed</th><th>Restocked</th></tr></thead>
                                    <tbody>
                                        {inventoryReport.topConsumed
                                            .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
                                            .map((p, i) => (
                                                <tr key={i}>
                                                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                                                    <td style={{ fontWeight: 600, color: '#f59e0b' }}>-{p.consumed}</td>
                                                    <td style={{ color: '#10b981' }}>+{p.added}</td>
                                                </tr>
                                            ))}
                                        {inventoryReport.topConsumed.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                                            <tr><td colSpan="3" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>No consumption matches your search.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            
                            <div className="glass-card">
                                <div className="card-header-v2">
                                    <div className="header-title"><h2>Low Stock / Reorder Alerts</h2></div>
                                </div>
                                <table className="premium-table">
                                    <thead><tr><th>Item Name</th><th>Current Stock</th><th>Min Threshold</th></tr></thead>
                                    <tbody>
                                        {inventoryReport.lowStockItems
                                            .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
                                            .map((p, i) => (
                                                <tr key={i}>
                                                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                                                    <td style={{ fontWeight: 700, color: '#ef4444' }}>{p.quantity}</td>
                                                    <td>{p.min_stock_level}</td>
                                                </tr>
                                            ))}
                                        {inventoryReport.lowStockItems.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                                            <tr><td colSpan="3" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>No low stock alerts match your search.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}

export default AdminBusinessReports;
