import React, { useEffect, useState } from 'react';
import { FileWarning, Shield, X } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../config';
import './WaiverFormModal.css';

const WAIVER_SECTIONS = [
    ['Voluntary Consent', 'I voluntarily consent to the tattoo and/or piercing procedure(s) discussed during my consultation. I understand that these procedures involve permanent or semi-permanent modification to my body and that I am proceeding of my own free will.'],
    ['Assumption of Risk', 'I acknowledge that tattoo and piercing procedures carry inherent risks including infection, scarring, keloid formation, allergic reactions to ink or metals, nerve damage, prolonged healing, and unsatisfactory aesthetic results. I assume full responsibility for these risks.'],
    ['Release of Liability', 'I hereby release, waive, and discharge Inkvictus Tattoo & Piercing Studio, its owners, artists, employees, and agents from any and all liability, claims, demands, or causes of action that may arise from or relate to any complications, adverse reactions, or issues occurring during or after the procedure.'],
    ['Age Verification', 'I confirm that I am at least 18 years of age.'],
    ['Health Declaration', 'I confirm that I am in good health, I am not under the influence of alcohol or drugs, and I do not have any medical conditions (including but not limited to blood disorders, heart conditions, diabetes, skin conditions, or immunodeficiency) that have not been disclosed to the studio. I understand it is my responsibility to disclose all relevant health information.'],
    ['Allergies & Materials', 'I acknowledge that Inkvictus uses professional-grade materials but cannot guarantee against allergic reactions to inks, pigments, metals, or cleaning solutions. I agree that the studio cannot be held responsible for allergic reactions that were not previously known or disclosed.'],
    ['Aftercare Responsibility', 'I understand that proper aftercare is essential for healing and final results. I agree to follow all aftercare instructions provided by the studio. I acknowledge that failure to follow aftercare instructions may result in infection, poor healing, or unsatisfactory results, for which the studio shall not be liable.'],
    ['No Refund Policy', 'I acknowledge that Inkvictus does not offer refunds for completed services. I understand that the required sessions may vary, and any additional sessions beyond the agreed number will incur a fee for set up. Once a tattoo session has started, the total payment for that session becomes due in full.'],
    ['Indemnification', 'I agree to indemnify and hold harmless Inkvictus Tattoo & Piercing Studio, its owners, artists, employees, and agents against any and all claims, expenses, damages, and liabilities arising from or related to the services provided to me.'],
    ['Accuracy of Information', 'I confirm that all information provided in this waiver and during my consultation is accurate and truthful. I understand that providing false or misleading information may affect my safety and the outcome of the procedure.'],
];

const checkboxStyle = { marginTop: '4px', width: '18px', height: '18px', accentColor: '#be9055' };
const labelStyle = { display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '12px', cursor: 'pointer' };

export default function WaiverFormModal({ isOpen, onClose, onAccept, clientName }) {
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
            waiverVersion: '1.3-adult-confirmation',
            waiverText: WAIVER_SECTIONS.map(([title, text]) => `${title}: ${text}`).join('\n'),
        });
    };

    return (
        <div className="waiver-modal-overlay" onClick={onClose}>
            <div className="waiver-modal-container" onClick={(event) => event.stopPropagation()}>
                <div className="waiver-modal-header">
                    <div className="waiver-header-brand">
                        <FileWarning size={24} />
                        <div><h2>Service Waiver &amp; Release of Liability</h2><p>Inkvictus Tattoo &amp; Piercing</p></div>
                    </div>
                    <button className="waiver-close-btn" onClick={onClose}><X size={20} /></button>
                </div>

                <div className="waiver-modal-body">
                    <div className="waiver-doc-title">
                        <h3>Waiver and Release of Liability</h3>
                        <p>Inkvictus Tattoo &amp; Piercing Studio — BGC, Philippines</p>
                    </div>
                    <div className="waiver-preamble">
                        <p><strong>IMPORTANT — Please read this waiver carefully before proceeding.</strong><br /><br />
                            By agreeing, I, <strong>{clientName || 'the undersigned client'}</strong>, acknowledge the following terms for services performed at <strong>Inkvictus Tattoo and Piercing Studio</strong>.
                        </p>
                    </div>
                    <div className="waiver-sections">
                        {WAIVER_SECTIONS.map(([title, text], index) => (
                            <div key={title}>
                                <h4 className="waiver-section-title"><span className="waiver-section-number">{index + 1}</span>{title}</h4>
                                <p className="waiver-section-text">{text}</p>
                            </div>
                        ))}
                    </div>

                    <div className="waiver-consents-area" style={{ marginTop: '24px', borderTop: '2px solid #e2e8f0', paddingTop: '20px' }}>
                        <h4 style={{ marginBottom: '16px', color: '#1e293b' }}>Required Confirmations</h4>
                        <label className="waiver-consent-label" style={labelStyle}>
                            <input type="checkbox" checked={ageConfirmed} onChange={(event) => setAgeConfirmed(event.target.checked)} style={checkboxStyle} />
                            <span><strong>Age Confirmation:</strong> I confirm that I am 18 years old or older.</span>
                        </label>
                        <label className="waiver-consent-label" style={labelStyle}>
                            <input type="checkbox" checked={procedureConsent} onChange={(event) => setProcedureConsent(event.target.checked)} style={checkboxStyle} />
                            <span><strong>Procedure Consent:</strong> I voluntarily consent to the procedure and assume its inherent risks.</span>
                        </label>
                        <label className="waiver-consent-label" style={labelStyle}>
                            <input type="checkbox" checked={paymentConsent} onChange={(event) => setPaymentConsent(event.target.checked)} style={checkboxStyle} />
                            <span><strong>Payment Consent:</strong> I agree to the no-refund policy and understand when payment becomes due.</span>
                        </label>
                        <label className="waiver-consent-label" style={{ ...labelStyle, marginBottom: '24px' }}>
                            <input type="checkbox" checked={healthDataConsent} onChange={(event) => setHealthDataConsent(event.target.checked)} style={checkboxStyle} />
                            <span><strong>Health Data Consent:</strong> I confirm my health declaration is accurate and consent to its storage for my safety.</span>
                        </label>

                        <h4 style={{ marginBottom: '16px', color: '#1e293b' }}>Optional Consents</h4>
                        <label className="waiver-consent-label" style={labelStyle}>
                            <input type="checkbox" checked={photoConsent} onChange={(event) => setPhotoConsent(event.target.checked)} style={checkboxStyle} />
                            <span><strong>Photo &amp; Media Consent:</strong> I authorize photos or videos for the studio portfolio and marketing.</span>
                        </label>
                        <label className="waiver-consent-label" style={{ ...labelStyle, marginBottom: '24px' }}>
                            <input type="checkbox" checked={marketingConsent} onChange={(event) => setMarketingConsent(event.target.checked)} style={checkboxStyle} />
                            <span><strong>Marketing Consent:</strong> I would like to receive promotional messages and updates.</span>
                        </label>
                    </div>

                    <div className="waiver-acceptance-box" style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <p><strong>Electronic Acceptance</strong><br />By typing my name, I acknowledge that I have read, understood, and agree to the waiver.</p>
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

                <div className="waiver-modal-footer">
                    <button className="waiver-btn-decline" onClick={onClose}>Cancel</button>
                    <button className="waiver-btn-accept" onClick={handleSubmit} disabled={!canSubmit} style={{ background: canSubmit ? '#be9055' : '#cbd5e1', cursor: canSubmit ? 'pointer' : 'not-allowed' }}>
                        <Shield size={16} /> I Agree &amp; Sign Waiver
                    </button>
                </div>
            </div>
        </div>
    );
}
