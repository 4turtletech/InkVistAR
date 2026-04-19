import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import Axios from 'axios';
import { CheckCircle, Printer, Download, AlertCircle, Banknote, Wallet, CreditCard, Loader } from 'lucide-react';
import { API_URL } from '../config';
import CustomerSideNav from '../components/CustomerSideNav';
import './PortalStyles.css';

/**
 * CustomerInvoice — Standalone invoice/receipt view page.
 * Accessible at /customer/invoice/:invoiceNumber
 * Supports Print and Download (browser print-to-PDF).
 */
function CustomerInvoice() {
    const { invoiceNumber } = useParams();
    const [invoice, setInvoice] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const receiptRef = useRef(null);

    useEffect(() => {
        if (!invoiceNumber) return;
        fetchInvoice();
    }, [invoiceNumber]);

    const fetchInvoice = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await Axios.get(`${API_URL}/api/invoices/by-number/${invoiceNumber}`);
            if (res.data.success) {
                setInvoice(res.data.data);
            } else {
                setError('Invoice not found.');
            }
        } catch (err) {
            setError('Failed to load invoice. It may not exist or has been removed.');
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        if (!invoice) return;
        const printWindow = window.open('', '_blank', 'width=600,height=800');
        const changeGiven = parseFloat(invoice.change_given || 0);
        printWindow.document.write(`
            <html><head><title>Invoice ${invoice.invoice_number}</title>
            <style>
                body { font-family: 'Segoe UI', sans-serif; padding: 40px; color: #1e293b; max-width: 520px; margin: 0 auto; }
                .receipt-header { text-align: center; margin-bottom: 24px; border-bottom: 2px dashed #e2e8f0; padding-bottom: 16px; }
                .receipt-header h2 { margin: 0 0 4px; font-size: 1.4rem; }
                .receipt-header p { margin: 0; color: #94a3b8; font-size: 0.85rem; }
                .receipt-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 0.9rem; }
                .receipt-row.total { font-size: 1.2rem; font-weight: 800; border-top: 2px solid #e2e8f0; margin-top: 8px; padding-top: 12px; }
                .receipt-section { margin-bottom: 16px; padding: 12px 0; border-bottom: 1px dashed #e2e8f0; }
                .label { color: #64748b; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; }
                .value { font-weight: 600; }
                .success { color: #10b981; }
                .footer { text-align: center; margin-top: 24px; color: #94a3b8; font-size: 0.8rem; }
                @media print { body { padding: 20px; } }
            </style></head><body>
            <div class="receipt-header">
                <h2>InkVictus Tattoo Studio</h2>
                <p>Official Payment Receipt</p>
            </div>
            <div class="receipt-section">
                <div class="receipt-row"><span class="label">Invoice Number</span><span class="value">${invoice.invoice_number}</span></div>
                <div class="receipt-row"><span class="label">Date</span><span class="value">${new Date(invoice.created_at).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}</span></div>
                <div class="receipt-row"><span class="label">Client</span><span class="value">${invoice.client_name}</span></div>
                <div class="receipt-row"><span class="label">Service</span><span class="value">${invoice.service_type || 'Session Payment'}</span></div>
            </div>
            <div class="receipt-section">
                <div class="receipt-row total"><span>Amount Paid</span><span class="success">₱${Number(invoice.amount).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span></div>
            </div>
            <div class="receipt-section">
                <div class="receipt-row"><span class="label">Payment Method</span><span class="value">${invoice.payment_method || 'N/A'}</span></div>
                ${changeGiven > 0 ? `<div class="receipt-row"><span class="label">Change Given</span><span class="value success">₱${changeGiven.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span></div>` : ''}
            </div>
            <div class="footer"><p>Thank you for choosing InkVictus Tattoo Studio</p><p>BGC, Taguig City</p></div>
            </body></html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 300);
    };

    return (
        <div className="portal-layout">
            <CustomerSideNav />
            <div className="portal-container customer-portal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                        <Loader size={40} color="#b7954e" style={{ animation: 'spin 1s linear infinite' }} />
                        <p style={{ marginTop: '16px', color: '#64748b' }}>Loading invoice...</p>
                        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                    </div>
                ) : error ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                        <div style={{ width: '64px', height: '64px', background: '#fef2f2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                            <AlertCircle size={32} color="#ef4444" />
                        </div>
                        <h3 style={{ margin: '0 0 8px', color: '#1e293b', fontSize: '1.2rem' }}>Invoice Not Found</h3>
                        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>{error}</p>
                    </div>
                ) : invoice ? (
                    <div ref={receiptRef} style={{ width: '100%', maxWidth: '560px', margin: '0 auto' }}>
                        {/* Success Header */}
                        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                            <div style={{ width: '56px', height: '56px', background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                                <CheckCircle size={28} color="#10b981" />
                            </div>
                            <h2 style={{ margin: '0 0 4px', fontSize: '1.3rem', fontWeight: 700, color: '#1e293b' }}>Payment Receipt</h2>
                            <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>{invoice.invoice_number}</p>
                        </div>

                        {/* Receipt Card */}
                        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
                            {/* Studio Header */}
                            <div style={{ padding: '20px', borderBottom: '1px dashed #e2e8f0', textAlign: 'center' }}>
                                <h3 style={{ margin: '0 0 4px', fontSize: '1.2rem', fontWeight: 800, color: '#1e293b' }}>InkVictus Tattoo Studio</h3>
                                <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>Official Payment Receipt</p>
                            </div>

                            {/* Meta */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #f1f5f9', fontSize: '0.85rem' }}>
                                <div>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>Billed To</div>
                                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{invoice.client_name}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>Date</div>
                                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{new Date(invoice.created_at).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
                                </div>
                            </div>

                            {/* Line Item */}
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 20px', background: '#f8fafc', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                                    <span>Description</span>
                                    <span>Amount</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid #f1f5f9' }}>
                                    <span style={{ fontWeight: 500, color: '#1e293b', fontSize: '0.9rem' }}>{invoice.service_type || 'Session Payment'}</span>
                                    <span style={{ fontWeight: 700, color: '#10b981', fontSize: '1rem' }}>₱{Number(invoice.amount).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>

                            {/* Payment Info */}
                            <div style={{ padding: '14px 20px', borderTop: '1px dashed #e2e8f0', background: '#f0fdf4' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#475569', marginBottom: '4px' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        {invoice.payment_method === 'Cash' ? <Banknote size={14} /> : invoice.payment_method === 'GCash' ? <Wallet size={14} /> : <CreditCard size={14} />}
                                        Payment Method
                                    </span>
                                    <span style={{ fontWeight: 700 }}>{invoice.payment_method || 'N/A'}</span>
                                </div>
                                {parseFloat(invoice.change_given || 0) > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#16a34a', marginTop: '4px' }}>
                                        <span>Change Given</span>
                                        <span style={{ fontWeight: 700 }}>₱{parseFloat(invoice.change_given).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                                    </div>
                                )}
                            </div>

                            {/* Status Badge */}
                            <div style={{ padding: '14px 20px', borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
                                <span style={{
                                    display: 'inline-block', padding: '6px 16px', borderRadius: '20px',
                                    background: invoice.status === 'Paid' ? '#dcfce7' : '#fef3c7',
                                    color: invoice.status === 'Paid' ? '#166534' : '#92400e',
                                    fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase'
                                }}>
                                    {invoice.status || 'Paid'}
                                </span>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'center' }}>
                            <button onClick={handlePrint} style={{
                                padding: '12px 24px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px',
                                fontWeight: 600, cursor: 'pointer', color: '#475569', fontSize: '0.9rem',
                                display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                transition: 'all 0.2s'
                            }}>
                                <Printer size={16} /> Print
                            </button>
                            <button onClick={handlePrint} style={{
                                padding: '12px 24px', background: '#be9055', border: 'none', borderRadius: '12px',
                                fontWeight: 600, cursor: 'pointer', color: '#fff', fontSize: '0.9rem',
                                display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(193,154,107,0.3)',
                                transition: 'all 0.2s'
                            }}>
                                <Download size={16} /> Download PDF
                            </button>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
}

export default CustomerInvoice;
