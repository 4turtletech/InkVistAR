import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Axios from 'axios';
import { AlertTriangle, X, CreditCard, ArrowRight, DollarSign, Clock, User, FileText, CheckCircle, Banknote, Wallet, Printer, Download, Send } from 'lucide-react';
import PhilippinePeso from './PhilippinePeso';
import ConfirmModal from './ConfirmModal';
import { API_URL } from '../config';
import { filterMoney } from '../utils/validation';

/**
 * PaymentAlertOverlay — Global overlay for Admin portal.
 * Renders a popup modal when a session is completed with an outstanding balance.
 * Also shows a persistent toast when the admin dismisses the modal.
 * Listens for 'payment-alert' custom events from AdminSideNav polling.
 */
function PaymentAlertOverlay() {
    const navigate = useNavigate();
    const [alerts, setAlerts] = useState([]);
    const [showPopup, setShowPopup] = useState(false);
    const [popupDismissed, setPopupDismissed] = useState(false);
    const [selectedAlert, setSelectedAlert] = useState(null);
    const [manualPaymentModal, setManualPaymentModal] = useState({ isOpen: false, amount: '', method: 'Cash', cashTendered: '' });
    const [isProcessing, setIsProcessing] = useState(false);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null, type: 'info', isAlert: false });
    const [receiptData, setReceiptData] = useState(null); // Holds invoice data after successful payment
    const [isSendingReceipt, setIsSendingReceipt] = useState(false);
    const hasShownOnLoginRef = useRef(false);
    const receiptRef = useRef(null);

    const showAlert = (title, message, type = 'info') => {
        setConfirmModal({
            isOpen: true, title, message, type, isAlert: true,
            onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
        });
    };

    // Listen for payment-alert events from AdminSideNav
    useEffect(() => {
        const handlePaymentAlert = (e) => {
            const { alerts: newAlerts } = e.detail;
            if (newAlerts && newAlerts.length > 0) {
                setAlerts(newAlerts);
                setSelectedAlert(prev => {
                    if (!prev) return newAlerts[0];
                    const stillExists = newAlerts.find(a => a.id === prev.id);
                    return stillExists || newAlerts[0];
                });
                const alreadyShownThisSession = sessionStorage.getItem('paymentAlertShown');
                if (!alreadyShownThisSession && !hasShownOnLoginRef.current) {
                    setShowPopup(true);
                    hasShownOnLoginRef.current = true;
                } else if (!hasShownOnLoginRef.current) {
                    setPopupDismissed(true);
                    hasShownOnLoginRef.current = true;
                }
            } else {
                setAlerts([]);
                setSelectedAlert(null);
                setShowPopup(false);
                setPopupDismissed(false);
                sessionStorage.removeItem('paymentAlertShown');
            }
        };

        window.addEventListener('payment-alert', handlePaymentAlert);
        return () => window.removeEventListener('payment-alert', handlePaymentAlert);
    }, []);

    const handleDismissPopup = () => {
        setShowPopup(false);
        setPopupDismissed(true);
        sessionStorage.setItem('paymentAlertShown', 'true');
    };

    const handleGoToAppointment = (alertItem) => {
        setShowPopup(false);
        navigate(`/admin/appointments?editId=${alertItem.id}`);
    };

    // Record manual payment — now returns invoice data
    const handleRecordPayment = async () => {
        if (!selectedAlert || !manualPaymentModal.amount || Number(manualPaymentModal.amount) <= 0) {
            showAlert('Invalid Amount', 'Please enter a valid payment amount.', 'warning');
            return;
        }

        // Cash validation: tendered must be >= payment amount
        if (manualPaymentModal.method === 'Cash') {
            const tendered = parseFloat(manualPaymentModal.cashTendered) || 0;
            const paymentAmt = parseFloat(manualPaymentModal.amount) || 0;
            if (tendered < paymentAmt) {
                showAlert('Insufficient Cash', 'The amount tendered is less than the payment amount.', 'warning');
                return;
            }
        }

        setIsProcessing(true);
        try {
            const res = await Axios.post(`${API_URL}/api/admin/appointments/${selectedAlert.id}/manual-payment`, {
                amount: Number(manualPaymentModal.amount),
                method: manualPaymentModal.method,
                cashTendered: manualPaymentModal.method === 'Cash' ? Number(manualPaymentModal.cashTendered) : null
            });
            if (res.data.success) {
                // Store invoice data and show receipt modal
                setReceiptData(res.data.invoice);
                setManualPaymentModal({ isOpen: false, amount: '', method: 'Cash', cashTendered: '' });
                // Remove this alert from list
                setAlerts(prev => {
                    const updated = prev.filter(a => a.id !== selectedAlert.id);
                    if (updated.length === 0) {
                        setShowPopup(false);
                        setPopupDismissed(false);
                        setSelectedAlert(null);
                    } else {
                        setSelectedAlert(updated[0]);
                    }
                    return updated;
                });
            } else {
                showAlert('Payment Error', res.data.message || 'Failed to record payment.', 'danger');
            }
        } catch (e) {
            const msg = e.response?.data?.message || 'Failed to connect to server.';
            showAlert('Connection Error', msg, 'danger');
        } finally {
            setIsProcessing(false);
        }
    };

    // Print receipt
    const handlePrintReceipt = () => {
        const printContent = receiptRef.current;
        if (!printContent) return;
        const printWindow = window.open('', '_blank', 'width=600,height=800');
        printWindow.document.write(`
            <html><head><title>Invoice ${receiptData?.invoiceNumber}</title>
            <style>
                body { font-family: 'Segoe UI', sans-serif; padding: 40px; color: #1e293b; }
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
                <div class="receipt-row"><span class="label">Invoice Number</span><span class="value">${receiptData?.invoiceNumber}</span></div>
                <div class="receipt-row"><span class="label">Date</span><span class="value">${new Date(receiptData?.date).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}</span></div>
                <div class="receipt-row"><span class="label">Client</span><span class="value">${receiptData?.clientName}</span></div>
                <div class="receipt-row"><span class="label">Service</span><span class="value">${receiptData?.designTitle}</span></div>
            </div>
            <div class="receipt-section">
                <div class="receipt-row"><span class="label">Total Quoted</span><span class="value">₱${Number(receiptData?.totalQuoted || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                <div class="receipt-row"><span class="label">Previously Paid</span><span class="value">₱${Number((receiptData?.totalPaid || 0) - (receiptData?.amountPaid || 0)).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                <div class="receipt-row total"><span>Amount Paid</span><span class="success">₱${Number(receiptData?.amountPaid || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
            </div>
            <div class="receipt-section">
                <div class="receipt-row"><span class="label">Payment Method</span><span class="value">${receiptData?.paymentMethod}</span></div>
                ${receiptData?.paymentMethod === 'Cash' ? `
                    <div class="receipt-row"><span class="label">Cash Tendered</span><span class="value">₱${Number(receiptData?.cashTendered || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                    <div class="receipt-row"><span class="label">Change Given</span><span class="value success">₱${Number(receiptData?.changeGiven || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                ` : ''}
                <div class="receipt-row"><span class="label">Remaining Balance</span><span class="value" style="color:${receiptData?.remainingBalance > 0 ? '#ef4444' : '#10b981'}">₱${Number(receiptData?.remainingBalance || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
            </div>
            <div class="footer"><p>Thank you for choosing InkVictus Tattoo Studio</p><p>BGC, Taguig City</p></div>
            </body></html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 300);
    };

    // Download receipt as PDF (uses browser print-to-PDF)
    const handleDownloadReceipt = () => {
        handlePrintReceipt(); // Browser print dialog allows "Save as PDF"
    };

    // Resend receipt email to customer
    const handleSendReceipt = async () => {
        if (!receiptData?.invoiceId) {
            showAlert('Error', 'Invoice ID not available.', 'warning');
            return;
        }
        setIsSendingReceipt(true);
        try {
            const res = await Axios.post(`${API_URL}/api/admin/invoices/${receiptData.invoiceId}/resend`);
            if (res.data.success) {
                showAlert('Sent', res.data.message, 'success');
            } else {
                showAlert('Error', res.data.message || 'Failed to send receipt.', 'danger');
            }
        } catch (e) {
            showAlert('Error', 'Failed to send receipt email.', 'danger');
        } finally {
            setIsSendingReceipt(false);
        }
    };

    if (alerts.length === 0 && !receiptData) return null;

    const remaining = selectedAlert ? Math.max(0, Number(selectedAlert.price || 0) - Number(selectedAlert.total_paid || 0)) : 0;
    const isUnquoted = selectedAlert && (!selectedAlert.price || Number(selectedAlert.price) <= 0);

    // Cash change calculation for the payment modal
    const paymentAmount = parseFloat(manualPaymentModal.amount) || 0;
    const cashTenderedAmount = parseFloat(manualPaymentModal.cashTendered) || 0;
    const cashChange = manualPaymentModal.method === 'Cash' ? Math.max(0, cashTenderedAmount - paymentAmount) : 0;
    const isCashSufficient = manualPaymentModal.method !== 'Cash' || cashTenderedAmount >= paymentAmount;

    return (
        <>
            {/* ===== POPUP MODAL ===== */}
            {showPopup && selectedAlert && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                    zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    animation: 'fadeIn 0.3s ease'
                }}>
                    <div style={{
                        background: '#fff', borderRadius: '20px', width: '95%', maxWidth: '580px',
                        boxShadow: '0 25px 60px rgba(0,0,0,0.3)', overflow: 'hidden',
                        animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}>
                        {/* Header */}
                        <div style={{
                            background: '#dc2626', padding: '20px 24px',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '12px', padding: '10px', display: 'flex' }}>
                                    <AlertTriangle size={24} color="#fff" />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem', fontWeight: 700 }}>Payment Resolution Required</h3>
                                    <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem' }}>
                                        {alerts.length} session{alerts.length > 1 ? 's' : ''} pending payment
                                    </p>
                                </div>
                            </div>
                            <button onClick={handleDismissPopup} style={{
                                background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '8px',
                                padding: '8px', cursor: 'pointer', color: '#fff', display: 'flex',
                                transition: 'background 0.2s'
                            }} title="Dismiss (alert will persist)">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Alert selector (if multiple) */}
                        {alerts.length > 1 && (
                            <div style={{ padding: '12px 24px', background: '#fef2f2', borderBottom: '1px solid #fecaca', display: 'flex', gap: '8px', overflowX: 'auto' }}>
                                {alerts.map(a => (
                                    <button key={a.id} onClick={() => setSelectedAlert(a)} style={{
                                        padding: '6px 14px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600,
                                        border: selectedAlert?.id === a.id ? '2px solid #dc2626' : '1px solid #fecaca',
                                        background: selectedAlert?.id === a.id ? '#fff' : 'transparent',
                                        color: selectedAlert?.id === a.id ? '#dc2626' : '#991b1b',
                                        cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s'
                                    }}>
                                        #{a.id} — {a.client_name}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Body — Pricing Card */}
                        <div style={{ padding: '24px' }}>
                            {/* Session Info */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                                <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>
                                        <User size={10} style={{ marginRight: '4px' }} />Client
                                    </span>
                                    <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.85rem' }}>{selectedAlert.client_name}</span>
                                </div>
                                <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>
                                        <FileText size={10} style={{ marginRight: '4px' }} />Design
                                    </span>
                                    <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.85rem' }}>{selectedAlert.design_title || 'Untitled'}</span>
                                </div>
                                <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>
                                        <Clock size={10} style={{ marginRight: '4px' }} />Artist
                                    </span>
                                    <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.85rem' }}>{selectedAlert.artist_name || 'Unassigned'}</span>
                                </div>
                                <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>
                                        <Clock size={10} style={{ marginRight: '4px' }} />Date
                                    </span>
                                    <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.85rem' }}>
                                        {selectedAlert.appointment_date ? new Date(selectedAlert.appointment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                                    </span>
                                </div>
                            </div>

                            {/* Financial Summary */}
                            <div style={{
                                background: isUnquoted ? 'linear-gradient(135deg, #fef3c7, #fffbeb)' : 'linear-gradient(135deg, #fef2f2, #fff1f2)',
                                borderRadius: '16px', padding: '20px',
                                border: isUnquoted ? '1px solid #fcd34d' : '1px solid #fecaca'
                            }}>
                                {isUnquoted ? (
                                    <div style={{ textAlign: 'center' }}>
                                        <AlertTriangle size={32} color="#f59e0b" style={{ marginBottom: '8px' }} />
                                        <p style={{ margin: '0 0 4px', fontWeight: 700, color: '#92400e', fontSize: '1rem' }}>No Price Set</p>
                                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#a16207' }}>
                                            This session was completed without a quoted price. Set a price and collect payment to compensate the artist.
                                        </p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <p style={{ margin: '0 0 8px', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Total Quoted</p>
                                            <p style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#1e293b' }}>
                                                ₱{Number(selectedAlert.price).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <p style={{ margin: '0 0 8px', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Collected</p>
                                            <p style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#10b981' }}>
                                                ₱{Number(selectedAlert.total_paid).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <p style={{ margin: '0 0 8px', fontSize: '0.7rem', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' }}>Remaining</p>
                                            <p style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#dc2626' }}>
                                                ₱{remaining.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Warning notice */}
                            <div style={{
                                marginTop: '16px', padding: '12px 16px', background: '#fffbeb',
                                borderRadius: '10px', border: '1px solid #fcd34d',
                                display: 'flex', alignItems: 'flex-start', gap: '10px'
                            }}>
                                <AlertTriangle size={16} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
                                <p style={{ margin: 0, fontSize: '0.8rem', color: '#92400e', lineHeight: 1.5 }}>
                                    Artist compensation is pending until the full balance is settled. Please resolve this at the earliest opportunity.
                                </p>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div style={{
                            padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0',
                            display: 'flex', gap: '10px', justifyContent: 'flex-end'
                        }}>
                            <button onClick={handleDismissPopup} style={{
                                padding: '10px 20px', background: '#fff', border: '1px solid #e2e8f0',
                                borderRadius: '10px', fontWeight: 600, cursor: 'pointer', color: '#64748b',
                                fontSize: '0.85rem'
                            }}>
                                Dismiss
                            </button>
                            {!isUnquoted && (
                                <button onClick={() => setManualPaymentModal({ isOpen: true, amount: String(remaining), method: 'Cash', cashTendered: '' })} style={{
                                    padding: '10px 20px', background: 'linear-gradient(135deg, #10b981, #059669)',
                                    border: 'none', borderRadius: '10px', fontWeight: 600, cursor: 'pointer',
                                    color: '#fff', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px'
                                }}>
                                    <PhilippinePeso size={14} /> Record Payment
                                </button>
                            )}
                            <button onClick={() => handleGoToAppointment(selectedAlert)} style={{
                                padding: '10px 20px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                border: 'none', borderRadius: '10px', fontWeight: 600, cursor: 'pointer',
                                color: '#fff', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px'
                            }}>
                                Go to Appointment <ArrowRight size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== PERSISTENT TOAST ===== */}
            {!showPopup && popupDismissed && alerts.length > 0 && (
                <div style={{
                    position: 'fixed', bottom: '20px', right: '20px', zIndex: 9998,
                    background: '#dc2626', color: '#fff',
                    borderRadius: '14px', padding: '14px 20px', boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
                    display: 'flex', alignItems: 'center', gap: '12px', maxWidth: '420px',
                    animation: 'slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1)', cursor: 'pointer'
                }} onClick={() => { setShowPopup(true); }}>
                    <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '10px', padding: '8px', display: 'flex', flexShrink: 0 }}>
                        <AlertTriangle size={18} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem' }}>
                            {alerts.length} session{alerts.length > 1 ? 's' : ''} pending payment
                        </p>
                        <p style={{ margin: '2px 0 0', fontSize: '0.75rem', opacity: 0.85 }}>
                            Click to review and resolve
                        </p>
                    </div>
                    <ArrowRight size={16} style={{ opacity: 0.7 }} />
                </div>
            )}

            {/* ===== MANUAL PAYMENT MODAL (with Cash Tendering) ===== */}
            {manualPaymentModal.isOpen && selectedAlert && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', zIndex: 10000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }} onClick={() => { if (!isProcessing) setManualPaymentModal({ isOpen: false, amount: '', method: 'Cash', cashTendered: '' }); }}>
                    <div onClick={e => e.stopPropagation()} style={{
                        background: '#fff', borderRadius: '16px', width: '90%', maxWidth: '480px',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.25)', overflow: 'hidden'
                    }}>
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
                            <h3 style={{ margin: 0, fontSize: '1rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <PhilippinePeso size={18} /> Record Manual Payment
                            </h3>
                            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                                Session #{selectedAlert.id} — {selectedAlert.client_name}
                            </p>
                        </div>
                        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {/* Payment Amount */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                                    Amount (₱)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={manualPaymentModal.amount}
                                    onChange={e => setManualPaymentModal(prev => ({ ...prev, amount: filterMoney(e.target.value) }))}
                                    style={{
                                        width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0',
                                        borderRadius: '10px', fontSize: '1.1rem', fontWeight: 700,
                                        outline: 'none', boxSizing: 'border-box'
                                    }}
                                    autoFocus
                                    disabled={isProcessing}
                                />
                                <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                                    Remaining balance: ₱{remaining.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>

                            {/* Payment Method */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                                    Payment Method
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                                    {[
                                        { key: 'Cash', icon: <Banknote size={18} />, color: '#10b981' },
                                        { key: 'GCash', icon: <Wallet size={18} />, color: '#3b82f6' },
                                        { key: 'Bank Transfer', icon: <CreditCard size={18} />, color: '#6366f1' }
                                    ].map(m => (
                                        <div
                                            key={m.key}
                                            onClick={() => { if (!isProcessing) setManualPaymentModal(prev => ({ ...prev, method: m.key, cashTendered: m.key !== 'Cash' ? '' : prev.cashTendered })); }}
                                            style={{
                                                padding: '12px 8px', borderRadius: '10px', cursor: isProcessing ? 'not-allowed' : 'pointer',
                                                textAlign: 'center', transition: 'all 0.2s',
                                                border: manualPaymentModal.method === m.key ? `2px solid ${m.color}` : '2px solid #e2e8f0',
                                                background: manualPaymentModal.method === m.key ? `${m.color}10` : 'white',
                                                color: manualPaymentModal.method === m.key ? m.color : '#64748b'
                                            }}
                                        >
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                                {m.icon}
                                                <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{m.key}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Cash Tendered Input — only when Cash is selected */}
                            {manualPaymentModal.method === 'Cash' && (
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                                        Cash Tendered (₱)
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: '#64748b', fontSize: '1.1rem' }}>₱</span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            placeholder="0.00"
                                            value={manualPaymentModal.cashTendered}
                                            onChange={e => setManualPaymentModal(prev => ({ ...prev, cashTendered: filterMoney(e.target.value) }))}
                                            style={{
                                                width: '100%', padding: '12px 14px 12px 32px', borderRadius: '10px',
                                                border: '1px solid #cbd5e1', fontSize: '1.1rem', fontWeight: 700,
                                                outline: 'none', boxSizing: 'border-box'
                                            }}
                                            disabled={isProcessing}
                                        />
                                    </div>
                                    {manualPaymentModal.cashTendered && (
                                        <div style={{
                                            marginTop: '8px', padding: '10px 14px', borderRadius: '10px',
                                            background: isCashSufficient ? '#f0fdf4' : '#fef2f2',
                                            border: `1px solid ${isCashSufficient ? '#bbf7d0' : '#fecaca'}`,
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                        }}>
                                            <span style={{ fontWeight: 600, fontSize: '0.85rem', color: isCashSufficient ? '#166534' : '#991b1b' }}>
                                                {isCashSufficient ? 'Change Due' : 'Insufficient Amount'}
                                            </span>
                                            <span style={{ fontWeight: 800, fontSize: '1rem', color: isCashSufficient ? '#16a34a' : '#ef4444' }}>
                                                ₱{cashChange.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Spam advisory */}
                            <p style={{ margin: 0, fontSize: '0.72rem', color: '#94a3b8', textAlign: 'center', fontStyle: 'italic' }}>
                                The customer will receive an email receipt. Please remind them to also check their Spam/Junk folder.
                            </p>
                        </div>
                        <div style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setManualPaymentModal({ isOpen: false, amount: '', method: 'Cash', cashTendered: '' })}
                                disabled={isProcessing}
                                style={{ padding: '10px 20px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', fontWeight: 600, cursor: 'pointer', color: '#64748b', fontSize: '0.85rem' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRecordPayment}
                                disabled={isProcessing || !manualPaymentModal.amount || Number(manualPaymentModal.amount) <= 0 || !isCashSufficient}
                                style={{
                                    padding: '10px 24px',
                                    background: isProcessing || !manualPaymentModal.amount || Number(manualPaymentModal.amount) <= 0 || !isCashSufficient ? '#94a3b8' : 'linear-gradient(135deg, #10b981, #059669)',
                                    border: 'none', borderRadius: '10px', fontWeight: 600,
                                    cursor: isProcessing || !isCashSufficient ? 'not-allowed' : 'pointer',
                                    color: '#fff', fontSize: '0.85rem'
                                }}
                            >
                                {isProcessing ? 'Processing...' : 'Confirm Payment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== RECEIPT / INVOICE MODAL ===== */}
            {receiptData && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
                    zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    animation: 'fadeIn 0.3s ease'
                }} onClick={() => setReceiptData(null)}>
                    <div onClick={e => e.stopPropagation()} ref={receiptRef} style={{
                        background: '#fff', borderRadius: '20px', width: '95%', maxWidth: '560px',
                        boxShadow: '0 25px 60px rgba(0,0,0,0.3)', overflow: 'hidden',
                        animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}>
                        {/* Receipt Header */}
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '40px', height: '40px', background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <CheckCircle size={22} color="#10b981" />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>Payment Recorded</h3>
                                    <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748b' }}>Invoice {receiptData.invoiceNumber}</p>
                                </div>
                            </div>
                            <button onClick={() => setReceiptData(null)} style={{
                                background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '36px', height: '36px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b'
                            }}>
                                <X size={18} />
                            </button>
                        </div>

                        {/* Receipt Body */}
                        <div style={{ padding: '20px 24px', maxHeight: '60vh', overflowY: 'auto' }}>
                            <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                {/* Invoice Header */}
                                <div style={{ padding: '20px', borderBottom: '1px dashed #e2e8f0', textAlign: 'center' }}>
                                    <h2 style={{ margin: '0 0 4px 0', fontSize: '1.3rem', fontWeight: 800, color: '#1e293b', letterSpacing: '-0.02em' }}>InkVictus Tattoo Studio</h2>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>Official Payment Receipt</p>
                                </div>

                                {/* Invoice Meta */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #f1f5f9', fontSize: '0.85rem' }}>
                                    <div>
                                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>Billed To</div>
                                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{receiptData.clientName}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>Date & Time</div>
                                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{new Date(receiptData.date).toLocaleString('en-PH')}</div>
                                    </div>
                                </div>

                                {/* Invoice Details */}
                                <div style={{ padding: '0' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 20px', background: '#f8fafc', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                                        <span>Description</span>
                                        <span style={{ minWidth: '80px', textAlign: 'right' }}>Amount</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid #f1f5f9', fontSize: '0.9rem' }}>
                                        <span style={{ fontWeight: 500, color: '#1e293b' }}>{receiptData.designTitle}</span>
                                        <span style={{ minWidth: '80px', textAlign: 'right', fontWeight: 600, color: '#1e293b' }}>
                                            ₱{Number(receiptData.amountPaid).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>

                                {/* Totals */}
                                <div style={{ padding: '14px 20px', borderTop: '1px dashed #e2e8f0', background: '#fafbfc' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#64748b', marginBottom: '4px' }}>
                                        <span>Total Quoted</span>
                                        <span>₱{Number(receiptData.totalQuoted).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#64748b', marginBottom: '4px' }}>
                                        <span>Previously Paid</span>
                                        <span>₱{Number((receiptData.totalPaid || 0) - (receiptData.amountPaid || 0)).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.15rem', fontWeight: 800, color: '#1e293b', paddingTop: '8px', borderTop: '1px solid #e2e8f0', marginTop: '4px' }}>
                                        <span>This Payment</span>
                                        <span style={{ color: '#10b981' }}>₱{Number(receiptData.amountPaid).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                </div>

                                {/* Payment Details */}
                                <div style={{ padding: '14px 20px', borderTop: '1px dashed #e2e8f0', background: '#f0fdf4' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#475569', marginBottom: '4px' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            {receiptData.paymentMethod === 'Cash' ? <Banknote size={14} /> : receiptData.paymentMethod === 'GCash' ? <Wallet size={14} /> : <CreditCard size={14} />}
                                            Payment Method
                                        </span>
                                        <span style={{ fontWeight: 700 }}>{receiptData.paymentMethod}</span>
                                    </div>
                                    {receiptData.paymentMethod === 'Cash' && (
                                        <>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#475569', marginBottom: '4px' }}>
                                                <span>Amount Tendered</span>
                                                <span style={{ fontWeight: 600 }}>₱{Number(receiptData.cashTendered).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: 800, color: '#16a34a', paddingTop: '6px', borderTop: '1px solid #bbf7d0', marginTop: '4px' }}>
                                                <span>Change Given</span>
                                                <span>₱{Number(receiptData.changeGiven).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </div>
                                        </>
                                    )}
                                    {receiptData.remainingBalance > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#ef4444', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #fecaca' }}>
                                            <span style={{ fontWeight: 600 }}>Remaining Balance</span>
                                            <span style={{ fontWeight: 700 }}>₱{Number(receiptData.remainingBalance).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Receipt Footer with Print & Download */}
                        <div style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={handlePrintReceipt} style={{
                                    padding: '10px 16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px',
                                    fontWeight: 600, cursor: 'pointer', color: '#475569', fontSize: '0.85rem',
                                    display: 'flex', alignItems: 'center', gap: '6px'
                                }}>
                                    <Printer size={14} /> Print
                                </button>
                                <button onClick={handleDownloadReceipt} style={{
                                    padding: '10px 16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px',
                                    fontWeight: 600, cursor: 'pointer', color: '#475569', fontSize: '0.85rem',
                                    display: 'flex', alignItems: 'center', gap: '6px'
                                }}>
                                    <Download size={14} /> Download
                                </button>
                                <button 
                                    onClick={handleSendReceipt} 
                                    disabled={isSendingReceipt}
                                    style={{
                                        padding: '10px 16px', background: isSendingReceipt ? '#94a3b8' : '#fff', 
                                        border: '1px solid #e2e8f0', borderRadius: '10px',
                                        fontWeight: 600, cursor: isSendingReceipt ? 'not-allowed' : 'pointer', 
                                        color: isSendingReceipt ? '#fff' : '#6366f1', fontSize: '0.85rem',
                                        display: 'flex', alignItems: 'center', gap: '6px'
                                    }}
                                >
                                    <Send size={14} /> {isSendingReceipt ? 'Sending...' : 'Send to Customer'}
                                </button>
                            </div>
                            <button onClick={() => setReceiptData(null)} style={{
                                padding: '10px 24px', background: 'linear-gradient(135deg, #10b981, #059669)',
                                border: 'none', borderRadius: '10px', fontWeight: 600, cursor: 'pointer',
                                color: '#fff', fontSize: '0.85rem'
                            }}>
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                onConfirm={confirmModal.onConfirm}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                type={confirmModal.type}
                isAlert={confirmModal.isAlert}
            />

            {/* Inline animations */}
            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(30px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
                @keyframes slideInRight { from { opacity: 0; transform: translateX(100px); } to { opacity: 1; transform: translateX(0); } }
            `}</style>
        </>
    );
}

export default PaymentAlertOverlay;
