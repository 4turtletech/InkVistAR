import React, { useState, useEffect } from 'react';
import { X, Shield } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../config';
import './TermsOfServiceModal.css';

export default function PaymentConfirmationModal({ isOpen, onClose, onAccept, amount, paymentType, defaultPhotoConsent = false }) {
    const [staffList, setStaffList] = useState([]);
    
    // Consent states
    const [procedureConsent, setProcedureConsent] = useState(false);
    const [paymentConsent, setPaymentConsent] = useState(false);
    const [healthDataConsent, setHealthDataConsent] = useState(false);
    const [marketingConsent, setMarketingConsent] = useState(false);
    const [photoConsent, setPhotoConsent] = useState(defaultPhotoConsent);
    
    const [signature, setSignature] = useState('');
    const [witnessId, setWitnessId] = useState('');

    useEffect(() => {
        if (isOpen) {
            axios.get(`${API_URL}/api/public/staff`)
                .then(res => {
                    if (res.data.success) {
                        setStaffList(res.data.staff);
                    }
                })
                .catch(err => console.error('Failed to fetch staff:', err));
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const waiverClauses = [
        "I am at least 18 years old or have a legal guardian consent.",
        "I understand that this procedure is a permanent change to my skin and body.",
        "I acknowledge that Inkvictus does not offer refund.",
        "I do not have any medical or skin conditions that might agitate the process of tattoo.",
        "I agree that Inkvictus does not have a way of identifying if I am allergic to the elements or ingredients that will be used for my tattoo.",
        "I understand that the required sessions may vary, and any additional sessions beyond the agreed number will incur fee for set up.",
        "I understand that I need to take good care of the tattoo or piercing by following instructions given to me by Inkvictus.",
        "I understand that I might get an infection if I don't follow the instructions given to me by Inkvictus.",
        "I indemnify and hold harmless Inkvictus against any claims, expenses, damages and liabilities.",
        "I confirm that the information I provided in this document is accurate and true.",
        "I understand and agree that once my tattoo session has started, the total payment for that session becomes due in full."
    ];

    const displayAmount = `₱${(amount || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const canSubmit = procedureConsent && paymentConsent && healthDataConsent && signature.trim().length > 2;

    const handleSubmit = () => {
        if (!canSubmit) return;
        
        const witness = staffList.find(s => String(s.id) === String(witnessId));
        const witnessName = witness ? witness.name : null;
        
        onAccept({
            procedureConsent,
            paymentConsent,
            healthDataConsent,
            marketingConsent,
            photoConsent,
            signatureEvidence: signature.trim(),
            witnessName,
            waiverVersion: '1.1-payment',
            waiverText: waiverClauses.join('\n')
        });
    };

    return (
        <div className="tos-modal-overlay" onClick={onClose}>
            <div className="tos-modal-container" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="tos-modal-header">
                    <div className="tos-header-brand">
                        <Shield size={24} />
                        <div>
                            <h2>Payment Confirmation & Waiver</h2>
                            <p>Inkvictus Tattoo & Piercing</p>
                        </div>
                    </div>
                    <button className="tos-close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Scrollable Body */}
                <div className="tos-modal-body">
                    <div className="tos-preamble" style={{ background: 'rgba(190, 144, 85, 0.08)', border: '1px solid rgba(190, 144, 85, 0.3)', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
                        <p style={{ margin: 0, fontWeight: 600, color: '#1e293b' }}>
                            You are about to make a {paymentType} of <span style={{ color: '#be9055', fontSize: '1.1em' }}>{displayAmount}</span>.
                        </p>
                        <p style={{ margin: '8px 0 0 0', fontSize: '0.9em', color: '#475569' }}>
                            Before proceeding to the payment gateway, please review and agree to our standard service waiver.
                        </p>
                    </div>
                    
                    <div className="tos-preamble">
                        <p>
                            I, the undersigned client, hereby give my consent for the tattoo or piercing procedure to be performed
                            at <strong>Inkvictus Tattoo and Piercing shop</strong>. By proceeding with payment, I acknowledge
                            and agree to the following sections of the Acknowledgement and Waiver:
                        </p>
                    </div>

                    <div className="tos-clauses-list">
                        <ul>
                            {waiverClauses.map((clause, index) => (
                                <li className="tos-clause-item" key={index}>
                                    <span>{clause}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Consents Area */}
                    <div style={{ marginTop: '24px', borderTop: '2px solid #e2e8f0', paddingTop: '20px' }}>
                        <h4 style={{ marginBottom: '16px', color: '#1e293b' }}>Required Consents</h4>
                        
                        <label style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '12px', cursor: 'pointer' }}>
                            <input type="checkbox" checked={procedureConsent} onChange={(e) => setProcedureConsent(e.target.checked)} style={{ marginTop: '4px', width: '18px', height: '18px', accentColor: '#be9055' }} />
                            <span><strong>Procedure Consent:</strong> I voluntarily consent to the procedure and assume all inherent risks.</span>
                        </label>
                        
                        <label style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '12px', cursor: 'pointer' }}>
                            <input type="checkbox" checked={paymentConsent} onChange={(e) => setPaymentConsent(e.target.checked)} style={{ marginTop: '4px', width: '18px', height: '18px', accentColor: '#be9055' }} />
                            <span><strong>Payment Consent:</strong> I agree to the No Refund Policy and understand that once a session starts, payment is due in full.</span>
                        </label>
                        
                        <label style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '24px', cursor: 'pointer' }}>
                            <input type="checkbox" checked={healthDataConsent} onChange={(e) => setHealthDataConsent(e.target.checked)} style={{ marginTop: '4px', width: '18px', height: '18px', accentColor: '#be9055' }} />
                            <span><strong>Health Data Consent:</strong> I confirm my health declaration is accurate and consent to the studio storing this information.</span>
                        </label>

                        <h4 style={{ marginBottom: '16px', color: '#1e293b' }}>Optional Consents</h4>
                        
                        <label style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '12px', cursor: 'pointer' }}>
                            <input type="checkbox" checked={photoConsent} onChange={(e) => setPhotoConsent(e.target.checked)} style={{ marginTop: '4px', width: '18px', height: '18px', accentColor: '#be9055' }} />
                            <span><strong>Photo & Media Consent:</strong> I consent to having photographs/videos taken and authorize their use in the studio's portfolio.</span>
                        </label>

                        <label style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '24px', cursor: 'pointer' }}>
                            <input type="checkbox" checked={marketingConsent} onChange={(e) => setMarketingConsent(e.target.checked)} style={{ marginTop: '4px', width: '18px', height: '18px', accentColor: '#be9055' }} />
                            <span><strong>Marketing Consent:</strong> I would like to receive promotional emails and updates from Inkvictus.</span>
                        </label>
                    </div>

                    {/* Electronic Acceptance Notice */}
                    <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '16px' }}>
                        <p style={{ marginBottom: '16px', fontSize: '0.95em' }}>
                            <strong>Electronic Acceptance</strong><br />
                            By typing your name below, you acknowledge that you have read, understood, and agree to all terms
                            of this Waiver and Release of Liability.
                        </p>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                            <label style={{ fontWeight: 600, fontSize: '0.9rem', color: '#475569' }}>Electronic Signature (Type your full name)<span style={{color: '#ef4444'}}>*</span></label>
                            <input 
                                type="text" 
                                value={signature} 
                                onChange={(e) => setSignature(e.target.value)}
                                placeholder="E.g. Juan Dela Cruz"
                                style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', width: '100%', boxSizing: 'border-box' }}
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontWeight: 600, fontSize: '0.9rem', color: '#475569' }}>Artist / Staff Witness (Optional)</label>
                            <select 
                                value={witnessId}
                                onChange={(e) => setWitnessId(e.target.value)}
                                style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem', width: '100%', boxSizing: 'border-box', background: 'white' }}
                            >
                                <option value="">Select Witness (if assisted in-studio)</option>
                                {staffList.map(s => (
                                    <option key={s.id} value={s.id}>{s.name} ({s.user_type})</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="tos-modal-footer" style={{ display: 'flex', gap: '12px', width: '100%', justifyContent: 'flex-end', background: '#f8fafc', padding: '16px 24px', borderTop: '1px solid #e2e8f0', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}>
                    <button className="tos-btn-decline" onClick={onClose} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                    <button 
                        className="tos-btn-accept" 
                        onClick={handleSubmit}
                        disabled={!canSubmit}
                        style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: canSubmit ? '#be9055' : '#cbd5e1', color: 'white', cursor: canSubmit ? 'pointer' : 'not-allowed', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <Shield size={16} />
                        Proceed to Payment
                    </button>
                </div>
            </div>
        </div>
    );
}
