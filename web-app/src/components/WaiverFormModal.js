import React, { useState, useEffect } from 'react';
import { X, FileWarning, Asterisk, Shield, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../config';
import './WaiverFormModal.css';

/**
 * WaiverFormModal — Official Service Waiver & Release of Liability
 */
export default function WaiverFormModal({ isOpen, onClose, onAccept, clientName, defaultPhotoConsent = false }) {
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

    const sections = [
        {
            title: 'Voluntary Consent',
            text: 'I voluntarily consent to the tattoo and/or piercing procedure(s) discussed during my consultation. I understand that these procedures involve permanent or semi-permanent modification to my body and that I am proceeding of my own free will.'
        },
        {
            title: 'Assumption of Risk',
            text: 'I acknowledge that tattoo and piercing procedures carry inherent risks including but not limited to: infection, scarring, keloid formation, allergic reactions to ink or metals, nerve damage, prolonged healing, and unsatisfactory aesthetic results. I assume full responsibility for these risks.'
        },
        {
            title: 'Release of Liability',
            text: 'I hereby release, waive, and discharge Inkvictus Tattoo & Piercing Studio, its owners, artists, employees, and agents from any and all liability, claims, demands, or causes of action that may arise from or relate to any complications, adverse reactions, or issues occurring during or after the procedure.',
            highlight: 'The studio shall not be held liable for any issues, complications, or adverse outcomes arising during or as a result of the procedure.'
        },
        {
            title: 'Age Verification',
            text: 'I confirm that I am at least 18 years of age, or I have obtained the written consent of my parent or legal guardian who is present at the time of the procedure.'
        },
        {
            title: 'Health Declaration',
            text: 'I confirm that I am in good health, I am not under the influence of alcohol or drugs, and I do not have any medical conditions (including but not limited to blood disorders, heart conditions, diabetes, skin conditions, or immunodeficiency) that have not been disclosed to the studio. I understand it is my responsibility to disclose all relevant health information.'
        },
        {
            title: 'Allergies & Materials',
            text: 'I acknowledge that Inkvictus uses professional-grade materials but cannot guarantee against allergic reactions to inks, pigments, metals, or cleaning solutions. I agree that the studio cannot be held responsible for allergic reactions that were not previously known or disclosed.'
        },
        {
            title: 'Aftercare Responsibility',
            text: 'I understand that proper aftercare is essential for healing and final results. I agree to follow all aftercare instructions provided by the studio. I acknowledge that failure to follow aftercare instructions may result in infection, poor healing, or unsatisfactory results, for which the studio shall not be liable.'
        },
        {
            title: 'No Refund Policy',
            text: 'I acknowledge that Inkvictus does not offer refunds for completed services. I understand that the required sessions may vary, and any additional sessions beyond the agreed number will incur a fee for set up. Once a tattoo session has started, the total payment for that session becomes due in full.'
        },
        {
            title: 'Indemnification',
            text: 'I agree to indemnify and hold harmless Inkvictus Tattoo & Piercing Studio, its owners, artists, employees, and agents against any and all claims, expenses, damages, and liabilities arising from or related to the services provided to me.'
        },
        {
            title: 'Accuracy of Information',
            text: 'I confirm that all information provided in this waiver and during my consultation is accurate and truthful. I understand that providing false or misleading information may affect my safety and the outcome of the procedure.'
        }
    ];

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
            waiverVersion: '1.0',
            waiverText: sections.map(s => s.title + ': ' + s.text).join('\n')
        });
    };

    return (
        <div className="waiver-modal-overlay" onClick={onClose}>
            <div className="waiver-modal-container" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="waiver-modal-header">
                    <div className="waiver-header-brand">
                        <FileWarning size={24} />
                        <div>
                            <h2>Service Waiver & Release of Liability</h2>
                            <p>Inkvictus Tattoo & Piercing</p>
                        </div>
                    </div>
                    <button className="waiver-close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Scrollable Body */}
                <div className="waiver-modal-body">
                    {/* Document Title */}
                    <div className="waiver-doc-title">
                        <h3>Waiver and Release of Liability</h3>
                        <p>Inkvictus Tattoo & Piercing Studio — BGC, Philippines</p>
                    </div>

                    {/* Preamble */}
                    <div className="waiver-preamble">
                        <p>
                            <strong>IMPORTANT — Please read this waiver carefully before proceeding.</strong><br /><br />
                            By agreeing to this waiver, I, <strong>{clientName || 'the undersigned client'}</strong>, hereby acknowledge and agree to the
                            following terms in connection with the tattoo and/or piercing services to be performed
                            at <strong>Inkvictus Tattoo and Piercing Studio</strong>.
                        </p>
                    </div>

                    {/* Numbered Sections */}
                    <div className="waiver-sections">
                        {sections.map((section, index) => (
                            <React.Fragment key={index}>
                                <div>
                                    <h4 className="waiver-section-title">
                                        <span className="waiver-section-number">{index + 1}</span>
                                        {section.title}
                                    </h4>
                                    <p className="waiver-section-text">{section.text}</p>
                                    {section.highlight && (
                                        <div className="waiver-liability-highlight">
                                            <p>IMPORTANT: {section.highlight}</p>
                                        </div>
                                    )}
                                </div>
                            </React.Fragment>
                        ))}
                    </div>

                    {/* Consents Area */}
                    <div className="waiver-consents-area" style={{ marginTop: '24px', borderTop: '2px solid #e2e8f0', paddingTop: '20px' }}>
                        <h4 style={{ marginBottom: '16px', color: '#1e293b' }}>Required Consents</h4>
                        
                        <label className="waiver-consent-label" style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '12px' }}>
                            <input type="checkbox" checked={procedureConsent} onChange={(e) => setProcedureConsent(e.target.checked)} style={{ marginTop: '4px', width: '18px', height: '18px', accentColor: '#be9055' }} />
                            <span><strong>Procedure Consent:</strong> I voluntarily consent to the procedure and assume all inherent risks.</span>
                        </label>
                        
                        <label className="waiver-consent-label" style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '12px' }}>
                            <input type="checkbox" checked={paymentConsent} onChange={(e) => setPaymentConsent(e.target.checked)} style={{ marginTop: '4px', width: '18px', height: '18px', accentColor: '#be9055' }} />
                            <span><strong>Payment Consent:</strong> I agree to the No Refund Policy and understand that once a session starts, payment is due in full.</span>
                        </label>
                        
                        <label className="waiver-consent-label" style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '24px' }}>
                            <input type="checkbox" checked={healthDataConsent} onChange={(e) => setHealthDataConsent(e.target.checked)} style={{ marginTop: '4px', width: '18px', height: '18px', accentColor: '#be9055' }} />
                            <span><strong>Health Data Consent:</strong> I confirm my health declaration is accurate and consent to the studio storing this information for my safety.</span>
                        </label>

                        <h4 style={{ marginBottom: '16px', color: '#1e293b' }}>Optional Consents</h4>
                        
                        <label className="waiver-consent-label" style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '12px' }}>
                            <input type="checkbox" checked={photoConsent} onChange={(e) => setPhotoConsent(e.target.checked)} style={{ marginTop: '4px', width: '18px', height: '18px', accentColor: '#be9055' }} />
                            <span><strong>Photo & Media Consent:</strong> I consent to having photographs/videos taken and authorize their use in the studio's portfolio and marketing materials.</span>
                        </label>

                        <label className="waiver-consent-label" style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '24px' }}>
                            <input type="checkbox" checked={marketingConsent} onChange={(e) => setMarketingConsent(e.target.checked)} style={{ marginTop: '4px', width: '18px', height: '18px', accentColor: '#be9055' }} />
                            <span><strong>Marketing Consent:</strong> I would like to receive promotional emails and updates from Inkvictus.</span>
                        </label>
                    </div>

                    {/* Electronic Acceptance Notice */}
                    <div className="waiver-acceptance-box" style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <p style={{ marginBottom: '16px' }}>
                            <strong>Electronic Acceptance</strong><br />
                            By typing your name below, you acknowledge that you have read, understood, and agree to all terms
                            of this Waiver and Release of Liability. This electronic acceptance shall have the same legal force and effect as a handwritten signature.
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
                <div className="waiver-modal-footer" style={{ padding: '20px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: '#f8fafc', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}>
                    <button className="waiver-btn-decline" onClick={onClose} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                    <button 
                        className="waiver-btn-accept" 
                        onClick={handleSubmit}
                        disabled={!canSubmit}
                        style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: canSubmit ? '#be9055' : '#cbd5e1', color: 'white', cursor: canSubmit ? 'pointer' : 'not-allowed', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <Shield size={18} />
                        I Accept the Waiver
                    </button>
                </div>
            </div>
        </div>
    );
}
