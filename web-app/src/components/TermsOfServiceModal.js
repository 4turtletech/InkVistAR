import React from 'react';
import { X, Shield, CheckCircle, AlertCircle } from 'lucide-react';
import './TermsOfServiceModal.css';

export default function TermsOfServiceModal({ isOpen, onClose, onAccept, photoConsent, onPhotoConsentChange }) {
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
        "I understand and agree that once my tattoo session has started, the total payment for that session becomes due in full. Any reservation fee or down payment made will be applied and deducted on the final session. This policy applies only to tattoos requiring multiple or series of sessions."
    ];

    return (
        <div className="tos-modal-overlay" onClick={onClose}>
            <div className="tos-modal-container" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="tos-modal-header">
                    <div className="tos-header-brand">
                        <Shield size={24} />
                        <div>
                            <h2>Acknowledgement &amp; Waiver</h2>
                            <p>Inkvictus Tattoo &amp; Piercing</p>
                        </div>
                    </div>
                    <button className="tos-close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Scrollable Body */}
                <div className="tos-modal-body">
                    <div className="tos-preamble">
                        <p>
                            I, the undersigned client, hereby give my consent for the tattoo or piercing procedure to be performed
                            at <strong>Inkvictus Tattoo and Piercing shop</strong>. By proceeding with registration, I acknowledge
                            and agree to the following terms:
                        </p>
                    </div>

                    <div className="tos-clauses-list">
                        {waiverClauses.map((clause, index) => (
                            <div key={index} className="tos-clause-item">
                                <CheckCircle size={16} className="tos-clause-check" />
                                <span>{clause}</span>
                            </div>
                        ))}
                    </div>

                    {/* Photo Marketing Consent — the ONLY optional clause */}
                    <div className="tos-optional-section">
                        <div className="tos-optional-header">
                            <AlertCircle size={16} />
                            <span>Optional Marketing Consent</span>
                        </div>
                        <label className="tos-toggle-row">
                            <input
                                type="checkbox"
                                checked={photoConsent}
                                onChange={(e) => onPhotoConsentChange(e.target.checked)}
                                className="tos-checkbox"
                            />
                            <span className="tos-toggle-label">
                                I consent to having photographs and/or videos taken by Inkvictus and be used in their portfolio and marketing materials.
                            </span>
                        </label>
                        <p className="tos-optional-note">
                            You may opt out of this at any time. Declining will not affect your appointment or services.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="tos-modal-footer">
                    <button className="tos-btn-decline" onClick={onClose}>Cancel</button>
                    <button className="tos-btn-accept" onClick={onAccept}>
                        <Shield size={16} />
                        I Accept the Terms &amp; Waiver
                    </button>
                </div>
            </div>
        </div>
    );
}
