import React, { useEffect, useState } from 'react';
import { Shield, X } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../config';
import './TermsOfServiceModal.css';

const WAIVER_CLAUSES = [
    'I confirm that I am at least 18 years old.',
    'I understand that this procedure is a permanent change to my skin and body.',
    'I acknowledge that Inkvictus does not offer refund.',
    'I do not have any medical or skin conditions that might agitate the process of tattoo.',
    'I agree that Inkvictus does not have a way of identifying if I am allergic to the elements or ingredients that will be used for my tattoo.',
    'I understand that the required sessions may vary, and any additional sessions beyond the agreed number will incur fee for set up.',
    'I understand that I need to take good care of the tattoo or piercing by following instructions given to me by Inkvictus.',
    "I understand that I might get an infection if I don't follow the instructions given to me by Inkvictus.",
    'I indemnify and hold harmless Inkvictus against any claims, expenses, damages and liabilities.',
    'I confirm that the information I provided in this document is accurate and true.',
    'I understand and agree that once my tattoo session has started, the total payment for that session becomes due in full.',
];

const checkboxStyle = { marginTop: '4px', width: '18px', height: '18px', accentColor: '#be9055' };
const labelStyle = { display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '12px', cursor: 'pointer' };

export default function PaymentConfirmationModal({ isOpen, onClose, onAccept, amount, paymentType }) {
    const [staffList, setStaffList] = useState([]);
    const [ageConfirmed, setAgeConfirmed] = useState(false);
    const [procedureConsent, setProcedureConsent] = useState(false);
    const [paymentConsent, setPaymentConsent] = useState(false);
    const [healthDataConsent, setHealthDataConsent] = useState(false);
    const [marketingConsent, setMarketingConsent] = useState(false);
    const [photoConsent, setPhotoConsent] = useState(false);
    const [signature, setSignature] = useState('');
    const [witnessId, setWitnessId] = useState('');

    useEffect(() => {
        if (!isOpen) return;
        setAgeConfirmed(false);
        setProcedureConsent(false);
        setPaymentConsent(false);
        setHealthDataConsent(false);
        setMarketingConsent(false);
        setPhotoConsent(false);
        setSignature('');
        setWitnessId('');
        axios.get(`${API_URL}/api/public/staff`)
            .then((res) => { if (res.data.success) setStaffList(res.data.staff); })
            .catch((error) => console.error('Failed to fetch staff:', error));
    }, [isOpen]);

    if (!isOpen) return null;

    const canSubmit = ageConfirmed && procedureConsent && paymentConsent
        && healthDataConsent && signature.trim().length > 2;
    const displayAmount = `₱${(amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const handleSubmit = () => {
        if (!canSubmit) return;
        const witness = staffList.find((staff) => String(staff.id) === String(witnessId));
        onAccept({
            ageConfirmed,
            procedureConsent,
            paymentConsent,
            healthDataConsent,
            marketingConsent,
            photoConsent,
            signatureEvidence: signature.trim(),
            witnessName: witness?.name || null,
            witnessUserId: witness?.id || null,
            waiverVersion: '1.3-adult-confirmation-payment',
            waiverText: WAIVER_CLAUSES.join('\n'),
        });
    };

    return (
        <div className="tos-modal-overlay" onClick={onClose}>
            <div className="tos-modal-container" onClick={(event) => event.stopPropagation()}>
                <div className="tos-modal-header">
                    <div className="tos-header-brand">
                        <Shield size={24} />
                        <div><h2>Payment Confirmation &amp; Waiver</h2><p>Inkvictus Tattoo &amp; Piercing</p></div>
                    </div>
                    <button className="tos-close-btn" onClick={onClose}><X size={20} /></button>
                </div>

                <div className="tos-modal-body">
                    <div className="tos-preamble" style={{ background: 'rgba(190, 144, 85, 0.08)', border: '1px solid rgba(190, 144, 85, 0.3)', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
                        <p style={{ margin: 0, fontWeight: 600, color: '#1e293b' }}>You are about to make a {paymentType} of <span style={{ color: '#be9055', fontSize: '1.1em' }}>{displayAmount}</span>.</p>
                        <p style={{ margin: '8px 0 0', fontSize: '0.9em', color: '#475569' }}>Review and accept the standard service waiver before proceeding to the payment gateway.</p>
                    </div>
                    <div className="tos-clauses-list">
                        <ul>{WAIVER_CLAUSES.map((clause) => <li className="tos-clause-item" key={clause}><span>{clause}</span></li>)}</ul>
                    </div>

                    <div style={{ marginTop: '24px', borderTop: '2px solid #e2e8f0', paddingTop: '20px' }}>
                        <h4 style={{ marginBottom: '16px', color: '#1e293b' }}>Required Confirmations</h4>
                        <label style={labelStyle}>
                            <input type="checkbox" checked={ageConfirmed} onChange={(event) => setAgeConfirmed(event.target.checked)} style={checkboxStyle} />
                            <span><strong>Age Confirmation:</strong> I confirm that I am 18 years old or older.</span>
                        </label>
                        <label style={labelStyle}>
                            <input type="checkbox" checked={procedureConsent} onChange={(event) => setProcedureConsent(event.target.checked)} style={checkboxStyle} />
                            <span><strong>Procedure Consent:</strong> I voluntarily consent to the procedure and assume its inherent risks.</span>
                        </label>
                        <label style={labelStyle}>
                            <input type="checkbox" checked={paymentConsent} onChange={(event) => setPaymentConsent(event.target.checked)} style={checkboxStyle} />
                            <span><strong>Payment Consent:</strong> I agree to the no-refund policy and understand when payment becomes due.</span>
                        </label>
                        <label style={{ ...labelStyle, marginBottom: '24px' }}>
                            <input type="checkbox" checked={healthDataConsent} onChange={(event) => setHealthDataConsent(event.target.checked)} style={checkboxStyle} />
                            <span><strong>Health Data Consent:</strong> I confirm my health information is accurate and consent to its storage for my safety.</span>
                        </label>

                        <h4 style={{ marginBottom: '16px', color: '#1e293b' }}>Optional Consents</h4>
                        <label style={labelStyle}>
                            <input type="checkbox" checked={photoConsent} onChange={(event) => setPhotoConsent(event.target.checked)} style={checkboxStyle} />
                            <span><strong>Photo &amp; Media Consent:</strong> I authorize photos or videos for the studio portfolio and marketing.</span>
                        </label>
                        <label style={{ ...labelStyle, marginBottom: '24px' }}>
                            <input type="checkbox" checked={marketingConsent} onChange={(event) => setMarketingConsent(event.target.checked)} style={checkboxStyle} />
                            <span><strong>Marketing Consent:</strong> I would like to receive promotional messages and updates.</span>
                        </label>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                            <label style={{ fontWeight: 600, fontSize: '0.9rem', color: '#475569' }}>Electronic Signature (Type your full name) *</label>
                            <input type="text" value={signature} onChange={(event) => setSignature(event.target.value)} placeholder="E.g. Juan Dela Cruz" style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', width: '100%', boxSizing: 'border-box' }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontWeight: 600, fontSize: '0.9rem', color: '#475569' }}>Artist / Staff Witness (Optional)</label>
                            <select value={witnessId} onChange={(event) => setWitnessId(event.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', width: '100%', boxSizing: 'border-box', background: 'white' }}>
                                <option value="">Select Witness (if assisted in-studio)</option>
                                {staffList.map((staff) => <option key={staff.id} value={staff.id}>{staff.name} ({staff.user_type})</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="tos-modal-footer" style={{ display: 'flex', gap: '12px', width: '100%', justifyContent: 'flex-end', background: '#f8fafc', padding: '16px 24px', borderTop: '1px solid #e2e8f0', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}>
                    <button className="tos-btn-decline" onClick={onClose}>Cancel</button>
                    <button className="tos-btn-accept" onClick={handleSubmit} disabled={!canSubmit} style={{ background: canSubmit ? '#be9055' : '#cbd5e1', cursor: canSubmit ? 'pointer' : 'not-allowed' }}>
                        <Shield size={16} /> Proceed to Payment
                    </button>
                </div>
            </div>
        </div>
    );
}
