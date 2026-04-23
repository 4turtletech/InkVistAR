import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, X, ArrowRight, FileText, Clock } from 'lucide-react';
import PhilippinePeso from './PhilippinePeso';

/**
 * Global Customer Payment Alert Overlay
 * Shows a popup modal when a customer has an unpaid balance.
 * If dismissed, it minimizes to a persistent toast on the bottom right.
 */
function CustomerPaymentAlertOverlay() {
    const navigate = useNavigate();
    const [alerts, setAlerts] = useState([]);
    const [showPopup, setShowPopup] = useState(false);
    const [popupDismissed, setPopupDismissed] = useState(false);
    const [selectedAlert, setSelectedAlert] = useState(null);
    const hasShownOnLoginRef = useRef(false);

    useEffect(() => {
        const handleCustomerPaymentAlert = (e) => {
            const { alerts: newAlerts } = e.detail;
            if (newAlerts && newAlerts.length > 0) {
                setAlerts(newAlerts);
                setSelectedAlert(prev => {
                    if (!prev) return newAlerts[0];
                    const stillExists = newAlerts.find(a => a.id === prev.id);
                    return stillExists || newAlerts[0];
                });
                const alreadyShownThisSession = sessionStorage.getItem('customerPaymentAlertShown');
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
                sessionStorage.removeItem('customerPaymentAlertShown');
            }
        };

        window.addEventListener('customer-payment-alert', handleCustomerPaymentAlert);
        return () => window.removeEventListener('customer-payment-alert', handleCustomerPaymentAlert);
    }, []);

    const handleDismissPopup = () => {
        setShowPopup(false);
        setPopupDismissed(true);
        sessionStorage.setItem('customerPaymentAlertShown', 'true');
    };

    const handleGoToAppointment = (alertItem) => {
        setShowPopup(false);
        navigate(`/customer/bookings?editId=${alertItem.id}`);
    };

    if (alerts.length === 0) return null;

    const remaining = selectedAlert ? Math.max(0, Number(selectedAlert.price || 0) - Number(selectedAlert.total_paid || 0)) : 0;

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
                            background: '#f59e0b', padding: '20px 24px',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '12px', padding: '10px', display: 'flex' }}>
                                    <AlertTriangle size={24} color="#fff" />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem', fontWeight: 700 }}>Unpaid Balance Notice</h3>
                                    <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.9)', fontSize: '0.8rem' }}>
                                        You have {alerts.length} session{alerts.length > 1 ? 's' : ''} pending payment
                                    </p>
                                </div>
                            </div>
                            <button onClick={handleDismissPopup} style={{
                                background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '8px',
                                padding: '8px', cursor: 'pointer', color: '#fff', display: 'flex',
                                transition: 'background 0.2s'
                            }} title="Dismiss">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Alert selector (if multiple) */}
                        {alerts.length > 1 && (
                            <div style={{ padding: '12px 24px', background: '#fffbeb', borderBottom: '1px solid #fde68a', display: 'flex', gap: '8px', overflowX: 'auto' }}>
                                {alerts.map(a => (
                                    <button key={a.id} onClick={() => setSelectedAlert(a)} style={{
                                        padding: '6px 14px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600,
                                        border: selectedAlert?.id === a.id ? '2px solid #f59e0b' : '1px solid #fde68a',
                                        background: selectedAlert?.id === a.id ? '#fff' : 'transparent',
                                        color: selectedAlert?.id === a.id ? '#d97706' : '#b45309',
                                        cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s'
                                    }}>
                                        Session #{a.id}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Body */}
                        <div style={{ padding: '24px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                                <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>
                                        <FileText size={10} style={{ marginRight: '4px' }} />Design
                                    </span>
                                    <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.85rem' }}>{selectedAlert.design_title || 'Untitled'}</span>
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

                            <div style={{
                                background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
                                borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <p style={{ margin: '0 0 8px', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Total Price</p>
                                        <p style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#1e293b' }}>
                                            ₱{Number(selectedAlert.price).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <p style={{ margin: '0 0 8px', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Paid</p>
                                        <p style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#10b981' }}>
                                            ₱{Number(selectedAlert.total_paid).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <p style={{ margin: '0 0 8px', fontSize: '0.7rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase' }}>Remaining</p>
                                        <p style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#f59e0b' }}>
                                            ₱{remaining.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                </div>
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
                            <button onClick={() => handleGoToAppointment(selectedAlert)} style={{
                                padding: '10px 20px', background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                border: 'none', borderRadius: '10px', fontWeight: 600, cursor: 'pointer',
                                color: '#fff', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px'
                            }}>
                                <PhilippinePeso size={14} /> Pay Online <ArrowRight size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== PERSISTENT TOAST ===== */}
            {!showPopup && popupDismissed && alerts.length > 0 && (
                <div style={{
                    position: 'fixed', bottom: '20px', right: '20px', zIndex: 9998,
                    background: '#f59e0b', color: '#fff',
                    borderRadius: '14px', padding: '14px 20px', boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
                    display: 'flex', alignItems: 'center', gap: '12px', maxWidth: '420px',
                    animation: 'slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1)', cursor: 'pointer'
                }} onClick={() => { setShowPopup(true); }}>
                    <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '10px', padding: '8px', display: 'flex', flexShrink: 0 }}>
                        <AlertTriangle size={18} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem' }}>
                            {alerts.length} session{alerts.length > 1 ? 's' : ''} pending payment
                        </p>
                        <p style={{ margin: '2px 0 0', fontSize: '0.75rem', opacity: 0.9 }}>
                            Click to review and pay online
                        </p>
                    </div>
                    <ArrowRight size={16} style={{ opacity: 0.8 }} />
                </div>
            )}
            
            {/* Inline animations */}
            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(30px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
                @keyframes slideInRight { from { opacity: 0; transform: translateX(100px); } to { opacity: 1; transform: translateX(0); } }
            `}</style>
        </>
    );
}

export default CustomerPaymentAlertOverlay;
