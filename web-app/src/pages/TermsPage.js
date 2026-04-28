import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Shield, ChevronDown, ChevronUp } from 'lucide-react';

function TermsPage() {
    const [expandedSection, setExpandedSection] = useState(null);

    const waiverClauses = [
        "I am at least 18 years old or have a legal guardian consent.",
        "I understand that this procedure is a permanent change to my skin and body.",
        "I consent to having photographs and/or videos taken by Inkvictus and be used in their portfolio. (Optional — you may opt out during booking.)",
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

    const policySections = [
        {
            title: "Booking & Consultation Policy",
            content: [
                "All appointments begin with a free consultation, either in-person or online.",
                "Walk-in consultations are welcome during studio hours (1:00 PM - 10:00 PM, Mon-Sun), subject to artist availability.",
                "Confirmed bookings require a non-refundable downpayment to secure your slot.",
                "Clients are allowed a maximum of 2 pending consultation requests at a time."
            ]
        },
        {
            title: "Payment Policy",
            content: [
                "We accept online payments via PayMongo (GCash, Maya, Credit/Debit Card) and manual payments (Cash, GCash, Bank Transfer).",
                "A downpayment is required before any tattoo session can begin.",
                "For multi-session tattoos, the reservation fee is applied and deducted from the total price on the final session.",
                "Inkvictus does not offer refunds on completed services."
            ]
        },
        {
            title: "Cancellation & Rescheduling",
            content: [
                "Clients may cancel within the grace period after booking at no charge.",
                "Rescheduling requests are subject to studio approval and artist availability.",
                "Repeated no-shows may result in future bookings requiring full prepayment."
            ]
        },
        {
            title: "Health & Safety",
            content: [
                "All equipment is sterilized and single-use needles are used for every session.",
                "Clients must disclose any medical conditions, allergies, or medications before the procedure.",
                "We reserve the right to refuse service if we determine it may pose a health risk.",
                "Aftercare instructions will be provided after every session and must be followed to ensure proper healing."
            ]
        },
        {
            title: "Privacy & Data",
            content: [
                "Your personal information is stored securely and used only for booking management and communication.",
                "We do not share your data with third parties without your consent.",
                "Photo/video consent for portfolio use is optional and can be toggled during the booking process.",
                "You may request deletion of your account and data by contacting the studio."
            ]
        }
    ];

    return (
        <div style={{ backgroundColor: '#0D0D0D', minHeight: '100vh', color: '#fff' }}>
            <Navbar />

            <div style={{ maxWidth: '900px', margin: '120px auto 0', padding: '0 20px 60px' }}>
                {/* Header */}
                <header style={{ textAlign: 'center', marginBottom: '48px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '16px', background: 'linear-gradient(135deg, rgba(190, 144, 85, 0.2), rgba(190, 144, 85, 0.05))', border: '1px solid rgba(190, 144, 85, 0.3)', marginBottom: '20px' }}>
                        <Shield size={32} color="#be9055" />
                    </div>
                    <h1 style={{ color: '#be9055', fontFamily: '"Playfair Display", serif', fontSize: 'clamp(1.6rem, 4vw, 2.8rem)', margin: '0 0 12px 0', fontWeight: 700 }}>Terms & Conditions</h1>
                    <p style={{ color: '#94a3b8', fontSize: '1rem', maxWidth: '600px', margin: '0 auto', lineHeight: '1.6' }}>
                        Please review the following terms, policies, and service waiver before booking with Inkvictus Tattoo Studio.
                    </p>
                    <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '12px' }}>
                        Last updated: April 2026
                    </p>
                </header>

                {/* Service Waiver Section */}
                <section style={{ marginBottom: '40px' }}>
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(190, 144, 85, 0.2)', borderRadius: '16px', overflow: 'hidden' }}>
                        <div style={{ padding: '24px 28px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <Shield size={20} color="#be9055" />
                            <h2 style={{ margin: 0, fontFamily: '"Playfair Display", serif', fontSize: '1.4rem', fontWeight: 700, color: '#fff' }}>Service Waiver & Release of Liability</h2>
                        </div>
                        <div style={{ padding: '24px 28px' }}>
                            <p style={{ color: '#94a3b8', lineHeight: '1.7', marginBottom: '24px', fontSize: '0.9rem' }}>
                                By proceeding with any tattoo or piercing service at Inkvictus Tattoo and Piercing shop, you acknowledge and agree to the following:
                            </p>
                            <ol style={{ paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {waiverClauses.map((clause, index) => (
                                    <li key={index} style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.6', paddingLeft: '8px' }}>
                                        <span style={{ color: '#be9055', fontWeight: 700, marginRight: '8px' }}>{index + 1}.</span>
                                        {clause}
                                    </li>
                                ))}
                            </ol>
                        </div>
                    </div>
                </section>

                {/* Studio Policies Section */}
                <section style={{ marginBottom: '40px' }}>
                    <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: '1.4rem', fontWeight: 700, color: '#fff', marginBottom: '20px' }}>Studio Policies</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {policySections.map((section, index) => (
                            <div key={index} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', overflow: 'hidden', transition: 'all 0.3s ease' }}>
                                <button
                                    onClick={() => setExpandedSection(expandedSection === index ? null : index)}
                                    style={{ width: '100%', padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1rem', fontWeight: 600, textAlign: 'left' }}
                                >
                                    <span>{section.title}</span>
                                    {expandedSection === index ? <ChevronUp size={18} color="#be9055" /> : <ChevronDown size={18} color="#64748b" />}
                                </button>
                                {expandedSection === index && (
                                    <div style={{ padding: '0 24px 20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                        <ul style={{ paddingLeft: '20px', margin: '16px 0 0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            {section.content.map((item, i) => (
                                                <li key={i} style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.6' }}>{item}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </section>

                {/* Contact CTA */}
                <section style={{ textAlign: 'center', padding: '32px', background: 'rgba(190, 144, 85, 0.05)', border: '1px solid rgba(190, 144, 85, 0.15)', borderRadius: '16px' }}>
                    <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: '0 0 16px', lineHeight: '1.6' }}>
                        Have questions about our terms or policies? We are happy to clarify.
                    </p>
                    <a href="/contact" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 28px', background: 'linear-gradient(135deg, #be9055, #a07840)', color: '#fff', fontSize: '0.9rem', fontWeight: 700, textDecoration: 'none', borderRadius: '10px', transition: 'all 0.3s', boxShadow: '0 4px 14px rgba(190, 144, 85, 0.25)' }}>
                        Contact Us
                    </a>
                </section>
            </div>

            <Footer />
        </div>
    );
}

export default TermsPage;
