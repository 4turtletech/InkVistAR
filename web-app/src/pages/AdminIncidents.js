import React, { useState, useEffect } from 'react';
import Axios from 'axios';
import { API_URL } from '../config';
import AdminSideNav from '../components/AdminSideNav';
import { AlertTriangle, ShieldAlert, MessageSquare, Send, CheckCircle, RefreshCw, Phone, Mail, FileText } from 'lucide-react';
import './PortalStyles.css';

export default function AdminIncidents() {
    const [incidents, setIncidents] = useState([]);
    const [selectedIncident, setSelectedIncident] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);

    // Response form states
    const [staffResponse, setStaffResponse] = useState('');
    const [incidentStatus, setIncidentStatus] = useState('open');
    const [incidentSeverity, setIncidentSeverity] = useState('medium');
    const [medicalReferral, setMedicalReferral] = useState(false);
    const [emergencyEscalation, setEmergencyEscalation] = useState(false);
    const [resolutionNotes, setResolutionNotes] = useState('');

    const fetchIncidents = async () => {
        setLoading(true);
        try {
            const res = await Axios.get(`${API_URL}/api/incidents/admin`);
            if (res.data.success) {
                setIncidents(res.data.incidents || []);
                if (res.data.incidents.length > 0 && !selectedIncident) {
                    loadIncidentDetails(res.data.incidents[0].id);
                }
            }
        } catch (e) {
            console.error('Failed to load incidents:', e);
        } finally {
            setLoading(false);
        }
    };

    const loadIncidentDetails = async (id) => {
        try {
            const res = await Axios.get(`${API_URL}/api/incidents/${id}`);
            if (res.data.success) {
                const inc = res.data.incident;
                setSelectedIncident(inc);
                setMessages(inc.messages || []);
                setStaffResponse(inc.staff_response || '');
                setIncidentStatus(inc.status || 'open');
                setIncidentSeverity(inc.severity || 'medium');
                setMedicalReferral(Boolean(inc.medical_referral_required));
                setEmergencyEscalation(Boolean(inc.emergency_escalation));
                setResolutionNotes(inc.resolution_notes || '');
            }
        } catch (e) {
            console.error('Failed to load incident details:', e);
        }
    };

    useEffect(() => {
        fetchIncidents();
    }, []);

    const handleUpdateResponse = async (e) => {
        e.preventDefault();
        if (!selectedIncident) return;
        try {
            await Axios.put(`${API_URL}/api/incidents/${selectedIncident.id}/respond`, {
                staffResponse,
                status: incidentStatus,
                severity: incidentSeverity,
                medicalReferralRequired: medicalReferral,
                emergencyEscalation: emergencyEscalation,
                resolutionNotes
            });
            alert('Incident status & response updated');
            loadIncidentDetails(selectedIncident.id);
            fetchIncidents();
        } catch (e) {
            alert('Failed to update incident response');
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!selectedIncident || !newMessage.trim()) return;
        try {
            await Axios.post(`${API_URL}/api/incidents/${selectedIncident.id}/messages`, {
                senderId: 1,
                senderRole: 'staff',
                senderName: 'Studio Operations Manager',
                message: newMessage.trim()
            });
            setNewMessage('');
            loadIncidentDetails(selectedIncident.id);
        } catch (e) {
            alert('Failed to send message');
        }
    };

    return (
        <div className="admin-portal-container">
            <AdminSideNav activeTab="incidents" />
            <main className="admin-main-content" style={{ padding: '32px', background: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div>
                        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <ShieldAlert size={28} color="#dc2626" /> Incident &amp; Aftercare Management
                        </h1>
                        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.9rem' }}>
                            Triage customer health reports, infections, allergic reactions, medical referrals &amp; emergency escalation
                        </p>
                    </div>
                    <button onClick={fetchIncidents} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer', fontWeight: 600 }}>
                        <RefreshCw size={16} /> Refresh Queue
                    </button>
                </div>

                {/* Emergency Escalation Alert Header if any critical incidents exist */}
                {incidents.some(i => i.emergency_escalation && i.status !== 'resolved' && i.status !== 'closed') && (
                    <div style={{ background: '#fef2f2', border: '2px solid #ef4444', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <AlertTriangle size={24} color="#dc2626" />
                        <div>
                            <strong style={{ color: '#991b1b', fontSize: '1rem' }}>⚠️ CRITICAL INCIDENT ESCALATION REQUIRED</strong>
                            <p style={{ margin: '2px 0 0', fontSize: '0.88rem', color: '#b91c1c' }}>
                                One or more high-severity health incidents are active and require immediate medical referral or studio management response.
                            </p>
                        </div>
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '24px' }}>
                    {/* Left: Incident Queue */}
                    <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '16px', height: 'calc(100vh - 200px)', overflowY: 'auto' }}>
                        <h3 style={{ margin: '0 0 14px', fontSize: '1.05rem', color: '#1e293b' }}>
                            Reported Incidents ({incidents.length})
                        </h3>

                        {incidents.map(inc => {
                            const isSelected = selectedIncident?.id === inc.id;
                            const isCritical = inc.severity === 'high' || inc.severity === 'critical';

                            return (
                                <div
                                    key={inc.id}
                                    onClick={() => loadIncidentDetails(inc.id)}
                                    style={{
                                        padding: '14px', borderRadius: '10px', marginBottom: '10px', cursor: 'pointer',
                                        border: isSelected ? '2px solid #be9055' : '1px solid #e2e8f0',
                                        background: isSelected ? '#fffdfa' : isCritical ? '#fff5f5' : '#ffffff',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                        <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.82rem', color: '#be9055' }}>
                                            {inc.incident_code}
                                        </span>
                                        <span style={{
                                            padding: '2px 8px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: 700,
                                            background: isCritical ? '#fee2e2' : '#fef3c7',
                                            color: isCritical ? '#991b1b' : '#92400e'
                                        }}>
                                            {inc.severity?.toUpperCase()}
                                        </span>
                                    </div>
                                    <strong style={{ display: 'block', fontSize: '0.92rem', color: '#0f172a', marginBottom: '4px' }}>
                                        {inc.customer_name}
                                    </strong>
                                    <p style={{ margin: '0 0 8px', fontSize: '0.8rem', color: '#475569', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                        {inc.description}
                                    </p>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8' }}>
                                        <span>Status: {inc.status?.toUpperCase()}</span>
                                        <span>{new Date(inc.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Right: Selected Incident Detail & Triage */}
                    {selectedIncident ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* Card 1: Customer & Incident Summary */}
                            <div style={{ background: 'white', padding: '24px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                    <div>
                                        <h2 style={{ margin: 0, fontSize: '1.3rem', color: '#0f172a' }}>
                                            Incident {selectedIncident.incident_code}
                                        </h2>
                                        <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                            Reported on {new Date(selectedIncident.created_at).toLocaleString()} by {selectedIncident.reported_by}
                                        </span>
                                    </div>
                                    <span style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 700, background: selectedIncident.status === 'resolved' ? '#dcfce7' : '#fee2e2', color: selectedIncident.status === 'resolved' ? '#166534' : '#991b1b' }}>
                                        {selectedIncident.status?.toUpperCase()}
                                    </span>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#f8fafc', padding: '14px', borderRadius: '10px', fontSize: '0.88rem', marginBottom: '16px' }}>
                                    <div><strong>Customer:</strong> {selectedIncident.customer_name}</div>
                                    <div><strong>Phone:</strong> {selectedIncident.customer_phone || 'N/A'}</div>
                                    <div><strong>Booking Code:</strong> {selectedIncident.booking_code || 'N/A'}</div>
                                    <div><strong>Assigned Artist:</strong> {selectedIncident.artist_name || 'N/A'}</div>
                                </div>

                                <div style={{ marginBottom: '16px' }}>
                                    <strong style={{ fontSize: '0.88rem', color: '#334155', display: 'block', marginBottom: '6px' }}>Issue Description:</strong>
                                    <p style={{ margin: 0, padding: '12px', background: '#fff1f2', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '0.9rem', color: '#881337', lineHeight: 1.6 }}>
                                        {selectedIncident.description}
                                    </p>
                                </div>
                            </div>

                            {/* Card 2: Staff Response & Medical Escalation Controls */}
                            <div style={{ background: 'white', padding: '24px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                                <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', color: '#0f172a' }}>Staff Response &amp; Medical Triage</h3>
                                <form onSubmit={handleUpdateResponse}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Incident Status</label>
                                            <select value={incidentStatus} onChange={e => setIncidentStatus(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                                                <option value="open">Open</option>
                                                <option value="under_investigation">Under Investigation</option>
                                                <option value="medical_referral">Medical Referral Issued</option>
                                                <option value="resolved">Resolved</option>
                                                <option value="closed">Closed</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Severity Level</label>
                                            <select value={incidentSeverity} onChange={e => setIncidentSeverity(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                                                <option value="low">Low (Minor redness/flaking)</option>
                                                <option value="medium">Medium (Allergic reaction / localized pain)</option>
                                                <option value="high">High (Severe infection sign)</option>
                                                <option value="critical">Critical (Medical emergency)</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '20px', marginBottom: '16px', background: '#f1f5f9', padding: '12px 16px', borderRadius: '8px' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', cursor: 'pointer', fontWeight: 600 }}>
                                            <input type="checkbox" checked={medicalReferral} onChange={e => setMedicalReferral(e.target.checked)} />
                                            Require Medical Referral
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', cursor: 'pointer', fontWeight: 600, color: '#dc2626' }}>
                                            <input type="checkbox" checked={emergencyEscalation} onChange={e => setEmergencyEscalation(e.target.checked)} />
                                            Flag Emergency Escalation
                                        </label>
                                    </div>

                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Staff Response / Advice to Customer</label>
                                        <textarea rows={3} value={staffResponse} onChange={e => setStaffResponse(e.target.value)} placeholder="Provide clinical or studio aftercare guidance..." style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                        <button type="submit" style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: '#be9055', color: 'white', fontWeight: 700, cursor: 'pointer' }}>
                                            Save Response &amp; Triage
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* Card 3: Interactive Follow-up Messaging Thread */}
                            <div style={{ background: 'white', padding: '24px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                                <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <MessageSquare size={18} /> Follow-Up Messages Thread
                                </h3>

                                <div style={{ maxHeight: '240px', overflowY: 'auto', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '10px', background: '#f8fafc', padding: '14px', borderRadius: '10px' }}>
                                    {messages.length === 0 ? (
                                        <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center' }}>No messages exchanged yet.</p>
                                    ) : (
                                        messages.map(m => (
                                            <div key={m.id} style={{ alignSelf: m.sender_role === 'staff' ? 'flex-end' : 'flex-start', maxWidth: '80%', background: m.sender_role === 'staff' ? '#be9055' : '#ffffff', color: m.sender_role === 'staff' ? 'white' : '#1e293b', padding: '10px 14px', borderRadius: '12px', border: m.sender_role === 'staff' ? 'none' : '1px solid #e2e8f0', fontSize: '0.88rem' }}>
                                                <strong>{m.sender_name}:</strong> {m.message}
                                                <div style={{ fontSize: '0.7rem', opacity: 0.8, marginTop: '4px', textAlign: 'right' }}>
                                                    {new Date(m.created_at).toLocaleTimeString()}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '10px' }}>
                                    <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Type follow-up advice to customer..." style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                                    <button type="submit" style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#1e293b', color: 'white', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Send size={16} /> Send
                                    </button>
                                </form>
                            </div>
                        </div>
                    ) : (
                        <div style={{ background: 'white', padding: '48px', borderRadius: '14px', textAlign: 'center', color: '#64748b' }}>
                            Select an incident from the queue to view details and triage.
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
