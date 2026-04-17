import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Axios from 'axios';
import { AlertTriangle, X, CreditCard, ArrowRight, DollarSign, Clock, User, FileText } from 'lucide-react';
import PhilippinePeso from './PhilippinePeso';
import ConfirmModal from './ConfirmModal';
import { API_URL } from '../config';

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
    const [manualPaymentModal, setManualPaymentModal] = useState({ isOpen: false, amount: '', method: 'Cash' });
    const [isProcessing, setIsProcessing] = useState(false);
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null, type: 'info', isAlert: false });
    const hasShownOnLoginRef = useRef(false);

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
                    // Auto-select the first alert if none selected
                    if (!prev) return newAlerts[0];
                    // Keep current selection if still valid
                    const stillExists = newAlerts.find(a => a.id === prev.id);
                    return stillExists || newAlerts[0];
                });
                // Show popup on first detection or login
                if (!hasShownOnLoginRef.current || !popupDismissed) {
                    setShowPopup(true);
                    hasShownOnLoginRef.current = true;
                }
            } else {
                // All resolved
                setAlerts([]);
                setSelectedAlert(null);
                setShowPopup(false);
                setPopupDismissed(false);
            }
        };

        window.addEventListener('payment-alert', handlePaymentAlert);
        return () => window.removeEventListener('payment-alert', handlePaymentAlert);
    }, [popupDismissed]);

    // Handle dismiss popup (secondary alert persists)
    const handleDismissPopup = () => {
        setShowPopup(false);
        setPopupDismissed(true);
    };

    // Navigate to appointment edit
    const handleGoToAppointment = (alertItem) => {
        setShowPopup(false);
        navigate(`/admin/appointments?editId=${alertItem.id}`);
    };

    // Record manual payment
    const handleRecordPayment = async () => {
        if (!selectedAlert || !manualPaymentModal.amount || Number(manualPaymentModal.amount) <= 0) {
            showAlert('Invalid Amount', 'Please enter a valid payment amount.', 'warning');
            return;
        }
        setIsProcessing(true);
        try {
            const res = await Axios.post(`${API_URL}/api/admin/appointments/${selectedAlert.id}/manual-payment`, {
                amount: Number(manualPaymentModal.amount),
                method: manualPaymentModal.method
            });
            if (res.data.success) {
                showAlert('Payment Recorded', `₱${Number(manualPaymentModal.amount).toLocaleString("en-PH", { minimumFractionDigits: 2 })} has been recorded for this session.`, 'success');
                setManualPaymentModal({ isOpen: false, amount: '', method: 'Cash' });
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

    if (alerts.length === 0) return null;

    const remaining = selectedAlert ? Math.max(0, Number(selectedAlert.price || 0) - Number(selectedAlert.total_paid || 0)) : 0;
    const isUnquoted = selectedAlert && (!selectedAlert.price || Number(selectedAlert.price) <= 0);

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
                            background: 'linear-gradient(135deg, #dc2626, #991b1b)', padding: '20px 24px',
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
                                <button onClick={() => setManualPaymentModal({ isOpen: true, amount: String(remaining), method: 'Cash' })} style={{
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

            {/* ===== PERSISTENT TOAST (when popup dismissed but alerts remain) ===== */}
            {!showPopup && popupDismissed && alerts.length > 0 && (
                <div style={{
                    position: 'fixed', bottom: '20px', right: '20px', zIndex: 9998,
                    background: 'linear-gradient(135deg, #dc2626, #991b1b)', color: '#fff',
                    borderRadius: '14px', padding: '14px 20px', boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
                    display: 'flex', alignItems: 'center', gap: '12px', maxWidth: '420px',
                    animation: 'slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1)', cursor: 'pointer'
                }} onClick={() => { setShowPopup(true); setPopupDismissed(false); }}>
                    <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '10px', padding: '8px', display: 'flex', flexShrink: 0 }}>
                        <AlertTriangle size={18} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem' }}>
                            ⚠️ {alerts.length} session{alerts.length > 1 ? 's' : ''} pending payment
                        </p>
                        <p style={{ margin: '2px 0 0', fontSize: '0.75rem', opacity: 0.85 }}>
                            Click to review and resolve
                        </p>
                    </div>
                    <ArrowRight size={16} style={{ opacity: 0.7 }} />
                </div>
            )}

            {/* ===== MANUAL PAYMENT MODAL ===== */}
            {manualPaymentModal.isOpen && selectedAlert && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', zIndex: 10000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }} onClick={() => { if (!isProcessing) setManualPaymentModal({ isOpen: false, amount: '', method: 'Cash' }); }}>
                    <div onClick={e => e.stopPropagation()} style={{
                        background: '#fff', borderRadius: '16px', width: '90%', maxWidth: '420px',
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
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                                    Amount (₱)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={manualPaymentModal.amount}
                                    onChange={e => setManualPaymentModal(prev => ({ ...prev, amount: e.target.value }))}
                                    style={{
                                        width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0',
                                        borderRadius: '10px', fontSize: '1.1rem', fontWeight: 700,
                                        outline: 'none', boxSizing: 'border-box'
                                    }}
                                    autoFocus
                                    disabled={isProcessing}
                                />
                                <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                                    Remaining balance: ₱{remaining.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                                    Payment Method
                                </label>
                                <select
                                    value={manualPaymentModal.method}
                                    onChange={e => setManualPaymentModal(prev => ({ ...prev, method: e.target.value }))}
                                    className="premium-select-v2"
                                    style={{ width: '100%' }}
                                    disabled={isProcessing}
                                >
                                    <option value="Cash">Cash</option>
                                    <option value="GCash">GCash</option>
                                    <option value="Bank Transfer">Bank Transfer</option>
                                    <option value="Credit Card (Manual)">Credit Card (Manual)</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>
                        <div style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setManualPaymentModal({ isOpen: false, amount: '', method: 'Cash' })}
                                disabled={isProcessing}
                                style={{ padding: '10px 20px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', fontWeight: 600, cursor: 'pointer', color: '#64748b', fontSize: '0.85rem' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRecordPayment}
                                disabled={isProcessing || !manualPaymentModal.amount || Number(manualPaymentModal.amount) <= 0}
                                style={{
                                    padding: '10px 24px',
                                    background: isProcessing || !manualPaymentModal.amount || Number(manualPaymentModal.amount) <= 0 ? '#94a3b8' : 'linear-gradient(135deg, #10b981, #059669)',
                                    border: 'none', borderRadius: '10px', fontWeight: 600, cursor: isProcessing ? 'not-allowed' : 'pointer',
                                    color: '#fff', fontSize: '0.85rem'
                                }}
                            >
                                {isProcessing ? 'Processing...' : 'Confirm Payment'}
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
