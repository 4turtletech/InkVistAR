import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Axios from 'axios';
import { Printer, ArrowLeft, Download } from 'lucide-react';
import { API_URL } from '../config';
import { getDisplayCode } from '../utils/formatters';

const fmt = (v) => Number(v || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const statusLabel = (s) => {
    switch (s?.toLowerCase()) {
        case 'confirmed': return { text: 'Confirmed', color: '#16a34a', bg: '#f0fdf4' };
        case 'completed': return { text: 'Completed', color: '#6366f1', bg: '#eef2ff' };
        case 'pending': return { text: 'Pending Review', color: '#d97706', bg: '#fffbeb' };
        case 'cancelled': return { text: 'Cancelled', color: '#dc2626', bg: '#fef2f2' };
        case 'rejected': return { text: 'Rejected', color: '#dc2626', bg: '#fef2f2' };
        case 'in_progress': return { text: 'In Progress', color: '#0ea5e9', bg: '#f0f9ff' };
        default: return { text: s || 'Unknown', color: '#64748b', bg: '#f8fafc' };
    }
};

const paymentLabel = (s) => {
    switch (s?.toLowerCase()) {
        case 'paid': return { text: 'Fully Paid', color: '#16a34a' };
        case 'downpayment_paid': return { text: 'Downpayment Paid', color: '#d97706' };
        case 'unpaid': return { text: 'Unpaid', color: '#dc2626' };
        default: return { text: s || 'N/A', color: '#64748b' };
    }
};

function AppointmentPrintView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [appointment, setAppointment] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [apptRes, txnRes] = await Promise.all([
                    Axios.get(`${API_URL}/api/admin/appointments/${id}`),
                    Axios.get(`${API_URL}/api/appointments/${id}/transactions`).catch(() => ({ data: { transactions: [] } }))
                ]);
                if (apptRes.data.success && apptRes.data.appointment) {
                    setAppointment(apptRes.data.appointment);
                } else {
                    setError('Appointment not found.');
                }
                setTransactions(txnRes.data?.transactions || []);
            } catch (err) {
                console.error('Error fetching print data:', err);
                setError('Failed to load appointment data.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const handlePrint = () => window.print();

    if (loading) {
        return (
            <div style={styles.loadingContainer}>
                <div style={styles.spinner} />
                <p style={{ color: '#64748b', marginTop: '16px' }}>Loading appointment data...</p>
            </div>
        );
    }

    if (error || !appointment) {
        return (
            <div style={styles.loadingContainer}>
                <p style={{ color: '#ef4444', fontSize: '1.1rem', fontWeight: 600 }}>{error || 'Appointment not found'}</p>
                <button onClick={() => navigate(-1)} style={{ ...styles.backBtn, marginTop: '16px' }}>
                    <ArrowLeft size={16} /> Go Back
                </button>
            </div>
        );
    }

    const a = appointment;
    const bookingCode = getDisplayCode(a.booking_code, a.id);
    const status = statusLabel(a.status);
    const payment = paymentLabel(a.payment_status);
    const totalPaid = Number(a.total_paid || 0);
    const balance = Math.max(0, Number(a.price || 0) - totalPaid);
    const isDualService = a.service_type === 'Tattoo + Piercing';
    const hasSplitPricing = isDualService && (Number(a.tattoo_price) > 0 || Number(a.piercing_price) > 0);
    const printDate = new Date().toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const appointmentDate = a.appointment_date
        ? new Date(a.appointment_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
        : 'N/A';

    return (
        <div style={styles.pageWrapper}>
            {/* Action bar — hidden when printing */}
            <div className="print-action-bar" style={styles.actionBar}>
                <button onClick={() => navigate(-1)} style={styles.backBtn}>
                    <ArrowLeft size={16} /> Back to Appointments
                </button>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={handlePrint} style={styles.printBtn}>
                        <Printer size={16} /> Print Document
                    </button>
                </div>
            </div>

            {/* Printable Document */}
            <div style={styles.document}>
                {/* Header */}
                <div style={styles.docHeader}>
                    <div>
                        <h1 style={styles.studioName}>InkVistAR Studio</h1>
                        <p style={styles.docSubtitle}>Appointment Record</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={styles.bookingCodeBox}>{bookingCode}</div>
                        <p style={styles.printTimestamp}>Generated: {printDate}</p>
                    </div>
                </div>

                <div style={styles.divider} />

                {/* Status Row */}
                <div style={styles.statusRow}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ ...styles.statusBadge, color: status.color, background: status.bg, border: `1px solid ${status.color}22` }}>{status.text}</span>
                        <span style={{ ...styles.paymentBadge, color: payment.color }}>{payment.text}</span>
                    </div>
                    <span style={styles.serviceTypeBadge}>{a.service_type || 'General Session'}</span>
                </div>

                {/* Two-column layout: Client & Schedule | Financial */}
                <div style={styles.twoCol}>
                    {/* Left: Client & Schedule */}
                    <div style={styles.section}>
                        <h3 style={styles.sectionTitle}>Client & Schedule</h3>
                        <div style={styles.infoGrid}>
                            <div style={styles.infoRow}>
                                <span style={styles.infoLabel}>Client Name</span>
                                <span style={styles.infoValue}>{a.client_name || a.customer_name || 'N/A'}</span>
                            </div>
                            <div style={styles.infoRow}>
                                <span style={styles.infoLabel}>Appointment Date</span>
                                <span style={styles.infoValue}>{appointmentDate}</span>
                            </div>
                            <div style={styles.infoRow}>
                                <span style={styles.infoLabel}>Time</span>
                                <span style={styles.infoValue}>{a.start_time || 'TBD'}</span>
                            </div>
                            <div style={styles.infoRow}>
                                <span style={styles.infoLabel}>Design / Idea</span>
                                <span style={styles.infoValue}>{a.design_title || 'N/A'}</span>
                            </div>
                            {a.consultation_method && (
                                <div style={styles.infoRow}>
                                    <span style={styles.infoLabel}>Consultation Method</span>
                                    <span style={styles.infoValue}>{a.consultation_method}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Staff Assignment */}
                    <div style={styles.section}>
                        <h3 style={styles.sectionTitle}>Staff Assignment</h3>
                        <div style={styles.infoGrid}>
                            <div style={styles.infoRow}>
                                <span style={styles.infoLabel}>Primary Artist</span>
                                <span style={styles.infoValue}>{a.artist_name || 'Unassigned'}</span>
                            </div>
                            {a.secondary_artist_name && (
                                <div style={styles.infoRow}>
                                    <span style={styles.infoLabel}>Secondary Staff</span>
                                    <span style={styles.infoValue}>{a.secondary_artist_name}</span>
                                </div>
                            )}
                            {a.commission_split && a.commission_split !== 50 && (
                                <div style={styles.infoRow}>
                                    <span style={styles.infoLabel}>Commission Split</span>
                                    <span style={styles.infoValue}>{a.commission_split}% / {100 - a.commission_split}%</span>
                                </div>
                            )}
                            {a.is_referral === 1 && (
                                <div style={styles.infoRow}>
                                    <span style={styles.infoLabel}>Referral</span>
                                    <span style={{ ...styles.infoValue, color: '#d97706', fontWeight: 600 }}>Yes — Referral Booking</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div style={styles.divider} />

                {/* Financial Section */}
                <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>Financial Summary</h3>
                    <div style={styles.financialCard}>
                        {hasSplitPricing && (
                            <div style={styles.splitBreakdown}>
                                <div style={styles.splitHeader}>Service Breakdown</div>
                                <div style={styles.splitRow}>
                                    <span>💉 Tattoo Session</span>
                                    <span style={{ fontWeight: 600 }}>₱{fmt(a.tattoo_price)}</span>
                                </div>
                                <div style={styles.splitRow}>
                                    <span>🪛 Piercing Service</span>
                                    <span style={{ fontWeight: 600 }}>₱{fmt(a.piercing_price)}</span>
                                </div>
                                <div style={{ ...styles.splitRow, borderTop: '1px dashed #cbd5e1', paddingTop: '8px', marginTop: '4px' }}>
                                    <span style={{ fontWeight: 700 }}>Combined Total</span>
                                    <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>₱{fmt(a.price)}</span>
                                </div>
                            </div>
                        )}
                        <div style={styles.financialGrid}>
                            <div style={styles.financialItem}>
                                <span style={styles.financialLabel}>Total Service Price</span>
                                <span style={styles.financialAmount}>₱{fmt(a.price)}</span>
                            </div>
                            <div style={styles.financialItem}>
                                <span style={styles.financialLabel}>Amount Collected</span>
                                <span style={{ ...styles.financialAmount, color: '#16a34a' }}>₱{fmt(totalPaid)}</span>
                            </div>
                            <div style={{ ...styles.financialItem, background: balance > 0 ? '#fef2f2' : '#f0fdf4', border: `1px solid ${balance > 0 ? '#fecaca' : '#bbf7d0'}` }}>
                                <span style={{ ...styles.financialLabel, fontWeight: 700 }}>Remaining Balance</span>
                                <span style={{ ...styles.financialAmount, color: balance > 0 ? '#dc2626' : '#16a34a', fontSize: '1.15rem' }}>₱{fmt(balance)}</span>
                            </div>
                        </div>
                        {a.manual_paid_amount > 0 && (
                            <div style={{ marginTop: '10px', fontSize: '0.82rem', color: '#64748b' }}>
                                Manual payment recorded: ₱{fmt(a.manual_paid_amount)} via {a.manual_payment_method || 'Cash'}
                            </div>
                        )}
                    </div>
                </div>

                {/* Payment Transactions */}
                {transactions.length > 0 && (
                    <>
                        <div style={styles.divider} />
                        <div style={styles.section}>
                            <h3 style={styles.sectionTitle}>Payment Transactions</h3>
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        <th style={styles.th}>Date</th>
                                        <th style={styles.th}>Method</th>
                                        <th style={styles.th}>Reference</th>
                                        <th style={{ ...styles.th, textAlign: 'right' }}>Amount</th>
                                        <th style={styles.th}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.map((t, idx) => (
                                        <tr key={t.id || idx}>
                                            <td style={styles.td}>{new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                                            <td style={styles.td}>{t.payment_method || 'PayMongo'}</td>
                                            <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: '0.8rem' }}>{t.paymongo_payment_id ? t.paymongo_payment_id.substring(0, 12) + '...' : '—'}</td>
                                            <td style={{ ...styles.td, textAlign: 'right', fontWeight: 600 }}>₱{fmt(t.amount / 100)}</td>
                                            <td style={styles.td}>
                                                <span style={{ color: t.status === 'paid' ? '#16a34a' : '#d97706', fontWeight: 600, fontSize: '0.82rem' }}>{t.status?.toUpperCase()}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                <div style={styles.divider} />

                {/* Session Notes */}
                <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>Session Notes</h3>
                    <div style={styles.notesBox}>
                        {a.notes ? (
                            <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.7, color: '#334155', fontSize: '0.9rem' }}>{a.notes}</p>
                        ) : (
                            <p style={{ margin: 0, color: '#94a3b8', fontStyle: 'italic' }}>No session notes were recorded.</p>
                        )}
                    </div>
                </div>

                {/* Consultation Summary (if applicable) */}
                {a.service_type === 'Consultation' && a.consultation_notes && (
                    <div style={styles.section}>
                        <h3 style={styles.sectionTitle}>Consultation Summary</h3>
                        <div style={{ ...styles.notesBox, borderColor: 'rgba(190,144,85,0.25)' }}>
                            <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.7, color: '#334155', fontSize: '0.9rem' }}>{a.consultation_notes}</p>
                            {a.quoted_price > 0 && (
                                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed #e2e8f0' }}>
                                    <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Quoted Price: </span>
                                    <span style={{ fontWeight: 700, color: '#be9055', fontSize: '1rem' }}>₱{fmt(a.quoted_price)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Rejection Reason */}
                {a.status === 'rejected' && a.rejection_reason && (
                    <div style={styles.section}>
                        <h3 style={{ ...styles.sectionTitle, color: '#dc2626' }}>Rejection Reason</h3>
                        <div style={{ ...styles.notesBox, background: '#fef2f2', borderColor: '#fecaca' }}>
                            <p style={{ margin: 0, color: '#991b1b', lineHeight: 1.6 }}>{a.rejection_reason}</p>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div style={styles.footer}>
                    <div style={styles.footerLine} />
                    <div style={styles.footerContent}>
                        <span>InkVistAR Studio — Appointment Record</span>
                        <span>Booking Code: {bookingCode}</span>
                        <span>Page 1 of 1</span>
                    </div>
                    <p style={styles.footerDisclaimer}>
                        This document is an internal record generated by InkVistAR Studio Management System. 
                        All pricing and payment information is accurate as of the generation date shown above.
                    </p>
                </div>
            </div>

            {/* Print-specific styles */}
            <style>{`
                @media print {
                    body { background: white !important; margin: 0 !important; }
                    .print-action-bar { display: none !important; }
                    @page {
                        size: A4;
                        margin: 15mm 12mm;
                    }
                }
            `}</style>
        </div>
    );
}

const styles = {
    pageWrapper: {
        minHeight: '100vh',
        background: '#f1f5f9',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    },
    loadingContainer: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
    },
    spinner: {
        width: '40px',
        height: '40px',
        border: '3px solid #e2e8f0',
        borderTop: '3px solid #be9055',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
    },
    actionBar: {
        position: 'sticky',
        top: 0,
        zIndex: 100,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 24px',
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    },
    backBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        color: '#475569',
        fontSize: '0.88rem',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 0.15s',
    },
    printBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 20px',
        background: 'linear-gradient(135deg, #be9055, #a67c4a)',
        border: 'none',
        borderRadius: '8px',
        color: 'white',
        fontSize: '0.88rem',
        fontWeight: 600,
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(190,144,85,0.35)',
    },
    document: {
        maxWidth: '800px',
        margin: '24px auto',
        padding: '40px 48px',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        border: '1px solid #e2e8f0',
    },
    docHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '20px',
    },
    studioName: {
        margin: 0,
        fontSize: '1.6rem',
        fontWeight: 800,
        color: '#1e293b',
        letterSpacing: '-0.02em',
    },
    docSubtitle: {
        margin: '4px 0 0',
        fontSize: '0.9rem',
        color: '#64748b',
        fontWeight: 500,
    },
    bookingCodeBox: {
        display: 'inline-block',
        padding: '6px 14px',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        fontFamily: 'monospace',
        fontSize: '1rem',
        fontWeight: 700,
        color: '#1e293b',
        letterSpacing: '0.05em',
    },
    printTimestamp: {
        margin: '8px 0 0',
        fontSize: '0.78rem',
        color: '#94a3b8',
    },
    divider: {
        height: '1px',
        background: '#e2e8f0',
        margin: '20px 0',
    },
    statusRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
    },
    statusBadge: {
        display: 'inline-block',
        padding: '5px 14px',
        borderRadius: '20px',
        fontSize: '0.82rem',
        fontWeight: 700,
        textTransform: 'capitalize',
    },
    paymentBadge: {
        fontSize: '0.82rem',
        fontWeight: 600,
    },
    serviceTypeBadge: {
        display: 'inline-block',
        padding: '5px 14px',
        borderRadius: '20px',
        fontSize: '0.82rem',
        fontWeight: 600,
        background: '#f1f5f9',
        color: '#475569',
        border: '1px solid #e2e8f0',
    },
    twoCol: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '24px',
    },
    section: {
        marginBottom: '8px',
    },
    sectionTitle: {
        margin: '0 0 12px',
        fontSize: '0.95rem',
        fontWeight: 700,
        color: '#1e293b',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        borderBottom: '2px solid #be9055',
        paddingBottom: '6px',
        display: 'inline-block',
    },
    infoGrid: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    infoRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '6px 0',
        borderBottom: '1px solid #f1f5f9',
    },
    infoLabel: {
        fontSize: '0.85rem',
        color: '#64748b',
        fontWeight: 500,
    },
    infoValue: {
        fontSize: '0.88rem',
        color: '#1e293b',
        fontWeight: 600,
        textAlign: 'right',
        maxWidth: '60%',
    },
    financialCard: {
        padding: '20px',
        background: '#f8fafc',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
    },
    splitBreakdown: {
        marginBottom: '16px',
        padding: '14px 16px',
        borderRadius: '8px',
        background: 'white',
        border: '1px solid #e2e8f0',
    },
    splitHeader: {
        fontSize: '0.75rem',
        fontWeight: 700,
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: '10px',
    },
    splitRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '4px 0',
        fontSize: '0.88rem',
        color: '#334155',
    },
    financialGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '12px',
    },
    financialItem: {
        padding: '14px',
        borderRadius: '8px',
        background: 'white',
        border: '1px solid #e2e8f0',
        textAlign: 'center',
    },
    financialLabel: {
        display: 'block',
        fontSize: '0.78rem',
        color: '#64748b',
        fontWeight: 500,
        marginBottom: '6px',
    },
    financialAmount: {
        display: 'block',
        fontSize: '1.05rem',
        fontWeight: 700,
        color: '#1e293b',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '0.85rem',
    },
    th: {
        textAlign: 'left',
        padding: '10px 12px',
        background: '#f8fafc',
        borderBottom: '2px solid #e2e8f0',
        color: '#64748b',
        fontWeight: 600,
        fontSize: '0.78rem',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
    },
    td: {
        padding: '10px 12px',
        borderBottom: '1px solid #f1f5f9',
        color: '#334155',
    },
    notesBox: {
        padding: '16px 20px',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
    },
    footer: {
        marginTop: '32px',
        paddingTop: '0',
    },
    footerLine: {
        height: '2px',
        background: 'linear-gradient(90deg, #be9055, #e2e8f0)',
        marginBottom: '16px',
    },
    footerContent: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '0.78rem',
        color: '#94a3b8',
        fontWeight: 500,
    },
    footerDisclaimer: {
        marginTop: '12px',
        fontSize: '0.72rem',
        color: '#cbd5e1',
        lineHeight: 1.5,
        textAlign: 'center',
    },
};

export default AppointmentPrintView;
