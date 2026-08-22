import React, { useState, useEffect } from 'react';
import { X, Shield, User, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../config';
import './TermsOfServiceModal.css';

export default function PaymentConfirmationModal({ isOpen, onClose, onAccept, amount, paymentType, defaultPhotoConsent = false }) {
    const [staffList, setStaffList] = useState([]);
    const [agePolicy, setAgePolicy] = useState({ allow_minors: true, min_age_without_guardian: 18, min_age_with_guardian: 16 });
    
    // Consent states
    const [procedureConsent, setProcedureConsent] = useState(false);
    const [paymentConsent, setPaymentConsent] = useState(false);
    const [healthDataConsent, setHealthDataConsent] = useState(false);
    const [marketingConsent, setMarketingConsent] = useState(false);
    const [photoConsent, setPhotoConsent] = useState(defaultPhotoConsent);
    
    // Age & Identification States
    const [dateOfBirth, setDateOfBirth] = useState('');
    const [calculatedAge, setCalculatedAge] = useState(null);
    const [idType, setIdType] = useState('');
    const [idLastFour, setIdLastFour] = useState('');
    
    // Guardian States (for minors)
    const [guardianName, setGuardianName] = useState('');
    const [guardianRelationship, setGuardianRelationship] = useState('Parent');
    const [guardianIdInfo, setGuardianIdInfo] = useState('');
    const [guardianSignature, setGuardianSignature] = useState('');
    const [guardianPresent, setGuardianPresent] = useState(false);

    const [signature, setSignature] = useState('');
    const [witnessId, setWitnessId] = useState('');

    useEffect(() => {
        if (isOpen) {
            axios.get(`${API_URL}/api/public/staff`)
                .then(res => { if (res.data.success) setStaffList(res.data.staff); })
                .catch(err => console.error('Failed to fetch staff:', err));

            axios.get(`${API_URL}/api/studio/age-policy`)
                .then(res => { if (res.data.success && res.data.policy) setAgePolicy(res.data.policy); })
                .catch(err => console.error('Failed to fetch age policy:', err));
        }
    }, [isOpen]);

    // Compute age when DOB changes
    useEffect(() => {
        if (!dateOfBirth) {
            setCalculatedAge(null);
            return;
        }
        const dob = new Date(dateOfBirth);
        if (isNaN(dob.getTime())) {
            setCalculatedAge(null);
            return;
        }
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
            age--;
        }
        setCalculatedAge(age);
    }, [dateOfBirth]);

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

    const isMinor = calculatedAge !== null && calculatedAge < 18;
    const isProhibitedMinor = calculatedAge !== null && (
        (!agePolicy.allow_minors && calculatedAge < 18) ||
        (calculatedAge < (agePolicy.min_age_with_guardian || 16))
    );

    const isGuardianValid = !isMinor || (
        guardianName.trim().length > 2 &&
        guardianIdInfo.trim().length > 2 &&
        guardianSignature.trim().length > 2 &&
        guardianPresent
    );

    const canSubmit = procedureConsent && paymentConsent && healthDataConsent && 
                      dateOfBirth && calculatedAge !== null && !isProhibitedMinor &&
                      signature.trim().length > 2 && isGuardianValid;

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
            dateOfBirth,
            calculatedAge,
            idType: idType || 'Not Provided Online',
            idLastFour: idLastFour || 'N/A',
            idVerificationStatus: 'unverified',
            guardianName: isMinor ? guardianName.trim() : null,
            guardianRelationship: isMinor ? guardianRelationship : null,
            guardianIdInfo: isMinor ? guardianIdInfo.trim() : null,
            guardianSignature: isMinor ? guardianSignature.trim() : null,
            guardianPresent: isMinor ? guardianPresent : false,
            waiverVersion: '1.2-payment',
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

                    {/* Customer Identification & Age Verification */}
                    <div style={{ marginTop: '24px', borderTop: '2px solid #e2e8f0', paddingTop: '20px' }}>
                        <h4 style={{ marginBottom: '16px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <User size={18} color="#be9055" /> Customer Date of Birth & Identification
                        </h4>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', color: '#475569', marginBottom: '6px' }}>
                                    Date of Birth <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input 
                                    type="date"
                                    value={dateOfBirth}
                                    onChange={(e) => setDateOfBirth(e.target.value)}
                                    style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '0.95rem' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', color: '#475569', marginBottom: '6px' }}>
                                    Calculated Age
                                </label>
                                <div style={{ padding: '10px 12px', borderRadius: '8px', background: '#f1f5f9', border: '1px solid #cbd5e1', fontWeight: 700, color: isMinor ? '#eab308' : '#1e293b' }}>
                                    {calculatedAge !== null ? `${calculatedAge} years old` : 'Enter Date of Birth'}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                            <div>
                                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', color: '#475569', marginBottom: '6px' }}>
                                    ID Type (Government Issued)
                                </label>
                                <select
                                    value={idType}
                                    onChange={(e) => setIdType(e.target.value)}
                                    style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '0.95rem', background: 'white' }}
                                >
                                    <option value="">Select ID Type</option>
                                    <option value="Passport">Passport</option>
                                    <option value="Driver License">Driver's License</option>
                                    <option value="National ID">National ID (PhilSys)</option>
                                    <option value="UMID / SSS / GSIS">UMID / SSS / GSIS</option>
                                    <option value="Postal ID / Student ID">Postal ID / Student ID</option>
                                    <option value="Other">Other Government ID</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', color: '#475569', marginBottom: '6px' }}>
                                    Last 4 Digits of ID Number
                                </label>
                                <input 
                                    type="text"
                                    maxLength={4}
                                    value={idLastFour}
                                    onChange={(e) => setIdLastFour(e.target.value.replace(/\D/g, ''))}
                                    placeholder="E.g. 5678"
                                    style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontSize: '0.95rem' }}
                                />
                            </div>
                        </div>

                        {/* Prohibited Minor Notice */}
                        {isProhibitedMinor && (
                            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '14px', marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <AlertTriangle color="#ef4444" size={24} style={{ flexShrink: 0 }} />
                                <div style={{ fontSize: '0.88rem', color: '#991b1b' }}>
                                    <strong>Age Requirement Restriction:</strong><br />
                                    Studio policy does not permit procedure for clients under {agePolicy.min_age_with_guardian || 16} years old.
                                </div>
                            </div>
                        )}

                        {/* Guardian Verification Section (when client is a minor) */}
                        {isMinor && !isProhibitedMinor && (
                            <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
                                <h4 style={{ margin: '0 0 12px', color: '#92400e', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Shield size={18} /> Parental / Legal Guardian Verification (Required for Minors)
                                </h4>
                                <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: '#78350f' }}>
                                    Because the client is under 18 years old, a parent or legal guardian must give written consent and be present during the procedure.
                                </p>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontWeight: 600, fontSize: '0.82rem', color: '#78350f', marginBottom: '4px' }}>
                                            Guardian Full Name <span style={{ color: '#ef4444' }}>*</span>
                                        </label>
                                        <input 
                                            type="text"
                                            value={guardianName}
                                            onChange={(e) => setGuardianName(e.target.value)}
                                            placeholder="Guardian Full Name"
                                            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #fcd34d', width: '100%' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontWeight: 600, fontSize: '0.82rem', color: '#78350f', marginBottom: '4px' }}>
                                            Relationship <span style={{ color: '#ef4444' }}>*</span>
                                        </label>
                                        <select
                                            value={guardianRelationship}
                                            onChange={(e) => setGuardianRelationship(e.target.value)}
                                            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #fcd34d', width: '100%', background: 'white' }}
                                        >
                                            <option value="Parent">Parent</option>
                                            <option value="Legal Guardian">Legal Guardian</option>
                                            <option value="Relative / Representative">Authorized Relative</option>
                                        </select>
                                    </div>
                                </div>

                                <div style={{ marginBottom: '12px' }}>
                                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.82rem', color: '#78350f', marginBottom: '4px' }}>
                                        Guardian ID Details (Type & Number) <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <input 
                                        type="text"
                                        value={guardianIdInfo}
                                        onChange={(e) => setGuardianIdInfo(e.target.value)}
                                        placeholder="E.g. Driver's License N01-23-456789"
                                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #fcd34d', width: '100%' }}
                                    />
                                </div>

                                <div style={{ marginBottom: '12px' }}>
                                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.82rem', color: '#78350f', marginBottom: '4px' }}>
                                        Guardian Electronic Signature (Type Full Name) <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <input 
                                        type="text"
                                        value={guardianSignature}
                                        onChange={(e) => setGuardianSignature(e.target.value)}
                                        placeholder="Type Guardian Full Name"
                                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #fcd34d', width: '100%' }}
                                    />
                                </div>

                                <label style={{ display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer', marginTop: '12px' }}>
                                    <input 
                                        type="checkbox"
                                        checked={guardianPresent}
                                        onChange={(e) => setGuardianPresent(e.target.checked)}
                                        style={{ width: '16px', height: '16px', accentColor: '#be9055' }}
                                    />
                                    <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#78350f' }}>
                                        I confirm that the guardian will be present in-person at the studio during the procedure. <span style={{ color: '#ef4444' }}>*</span>
                                    </span>
                                </label>
                            </div>
                        )}
                    </div>

                    {/* Consents Area */}
                    <div style={{ marginTop: '12px', borderTop: '2px solid #e2e8f0', paddingTop: '20px' }}>
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
