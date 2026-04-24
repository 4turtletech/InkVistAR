import React from 'react';
import { X, FileWarning, Asterisk } from 'lucide-react';
import './WaiverFormModal.css';

/**
 * WaiverFormModal — Official Service Waiver & Release of Liability
 * Mirrors the TermsOfServiceModal pattern but styled as a formal legal document.
 *
 * Props:
 *  - isOpen: boolean
 *  - onClose: () => void
 *  - onAccept: () => void
 *  - clientName: string (auto-filled from booking form)
 *  - photoConsent: boolean
 *  - onPhotoConsentChange: (checked: boolean) => void
 */
export default function WaiverFormModal({ isOpen, onClose, onAccept, clientName, photoConsent, onPhotoConsentChange }) {
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

    // Photo consent is inserted between section 9 (Indemnification) and 10 (Accuracy)
    const photoConsentAfterIndex = 8; // After section 9 (0-indexed = 8)

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

                                {/* Photo consent checkbox after Indemnification */}
                                {index === photoConsentAfterIndex && (
                                    <div>
                                        <h4 className="waiver-section-title">
                                            <span className="waiver-section-number" style={{ background: '#64748b', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Asterisk size={14} /></span>
                                            Photo & Media Consent
                                        </h4>
                                        <div className="waiver-consent-toggle">
                                            <label className="waiver-consent-label">
                                                <input
                                                    type="checkbox"
                                                    checked={photoConsent}
                                                    onChange={(e) => onPhotoConsentChange(e.target.checked)}
                                                    className="waiver-consent-checkbox"
                                                />
                                                <span className="waiver-consent-text">
                                                    I consent to having photographs and/or videos taken during my session by Inkvictus and authorize their use in the studio's portfolio, website, and marketing materials.
                                                </span>
                                            </label>
                                        </div>
                                    </div>
                                )}
                            </React.Fragment>
                        ))}
                    </div>

                    {/* Electronic Acceptance Notice */}
                    <div className="waiver-acceptance-box">
                        <p>
                            <strong>Electronic Acceptance</strong><br />
                            By clicking "I Accept" and submitting this booking request, I acknowledge that I have read, understood, and agree to all terms
                            of this Waiver and Release of Liability. This electronic acceptance shall have the same legal force and effect as a handwritten signature.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="waiver-modal-footer">
                    <button className="waiver-btn-decline" onClick={onClose}>Cancel</button>
                    <button className="waiver-btn-accept" onClick={onAccept}>
                        <FileWarning size={16} />
                        I Accept the Waiver
                    </button>
                </div>
            </div>
        </div>
    );
}
