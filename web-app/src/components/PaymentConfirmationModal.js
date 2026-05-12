import React, { useState } from 'react';
import { X, Shield } from 'lucide-react';
import './TermsOfServiceModal.css'; // Reuse the same CSS since it is visually identical

export default function PaymentConfirmationModal({ isOpen, onClose, onAccept, amount, paymentType }) {
    const [hasAgreed, setHasAgreed] = useState(false);

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

    const displayAmount = `₱${(amount || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
                </div>

                {/* Footer */}
                <div className="tos-modal-footer" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <label className="tos-toggle-row" style={{ alignSelf: 'flex-start', background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', width: '100%', border: '1px solid #e2e8f0', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={hasAgreed}
                            onChange={(e) => setHasAgreed(e.target.checked)}
                            className="tos-checkbox"
                        />
                        <span className="tos-toggle-label" style={{ fontWeight: 600, color: '#1e293b' }}>
                            I have read and accept the Acknowledgement and Waiver
                        </span>
                    </label>
                    <div style={{ display: 'flex', gap: '12px', width: '100%', justifyContent: 'flex-end' }}>
                        <button className="tos-btn-decline" onClick={onClose}>Cancel</button>
                        <button 
                            className="tos-btn-accept" 
                            onClick={() => {
                                if (hasAgreed) {
                                    onAccept();
                                }
                            }}
                            disabled={!hasAgreed}
                            style={{ opacity: hasAgreed ? 1 : 0.6, cursor: hasAgreed ? 'pointer' : 'not-allowed' }}
                        >
                            <Shield size={16} />
                            Proceed to Payment
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
