import React, { useState, useEffect } from 'react';
import Axios from 'axios';
import { Clock, Heart, AlertTriangle, Droplets, Edit3, Check, RotateCcw } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import { API_URL } from '../config';
import './PortalStyles.css';
import './AdminStyles.css';

// Strip emoji/symbol unicode characters from DB strings
const stripEmoji = (str) => (str || '').replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu, '').trim();

const PHASE_CONFIG = {
  initial: { label: 'Phase 1: Initial Healing', days: 'Days 1-3', desc: 'Red, swollen, tender skin. Focus on cleaning', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', icon: AlertTriangle },
  peeling: { label: 'Phase 2: Peeling & Itching', days: 'Days 4-14', desc: 'Flaking and itching. Do NOT pick', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', icon: Droplets },
  healing: { label: 'Phase 3: Final Healing', days: 'Days 15-30', desc: 'Skin regeneration and settling', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', icon: Heart }
};

function AdminAftercare() {
    const [aftercareTemplates, setAftercareTemplates] = useState([]);
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [editForm, setEditForm] = useState({ title: '', message: '', tips: '' });
    const [aftercareSaving, setAftercareSaving] = useState(false);
    const [aftercareResetting, setAftercareResetting] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null, type: 'info', isAlert: false });

    useEffect(() => {
        fetchAftercareTemplates();
    }, []);

    const fetchAftercareTemplates = async () => {
        try {
            const res = await Axios.get(`${API_URL}/api/admin/aftercare-templates`);
            if (res.data.success) setAftercareTemplates(res.data.templates || []);
        } catch (error) {
            console.error('Error fetching aftercare templates:', error);
        }
    };

    const saveAftercareTemplate = async (id) => {
        setAftercareSaving(true);
        try {
            await Axios.put(`${API_URL}/api/admin/aftercare-templates/${id}`, editForm);
            setEditingTemplate(null);
            await fetchAftercareTemplates();
        } catch (error) {
            console.error('Error saving template:', error);
        }
        setAftercareSaving(false);
    };

    const resetAftercareTemplates = async () => {
        setAftercareResetting(true);
        try {
            await Axios.post(`${API_URL}/api/admin/aftercare-templates/reset`);
            await fetchAftercareTemplates();
        } catch (error) {
            console.error('Error resetting templates:', error);
        }
        setAftercareResetting(false);
    };

    return (
        <div className="portal-content" style={{ paddingTop: '24px' }}>
            <div style={{ position: 'relative', textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ display: 'inline-block', textAlign: 'center' }}>
                    <h2 style={{ margin: '0 0 6px', fontSize: '1.4rem', fontWeight: 700, color: '#1e293b' }}>Aftercare Notification Schedule</h2>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Configure the global healing notifications sent to customers after a completed tattoo session.</p>
                </div>
                <div style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)' }}>
                    <button 
                        className="btn btn-secondary" 
                        onClick={() => setConfirmDialog({ isOpen: true, title: 'Reset to Defaults?', message: 'This will replace all aftercare templates with the original defaults. Any customizations will be lost.', type: 'warning', onConfirm: () => { setConfirmDialog(prev => ({...prev, isOpen: false})); resetAftercareTemplates(); } })}
                        disabled={aftercareResetting}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
                    >
                        <RotateCcw size={14} style={aftercareResetting ? { animation: 'spin 1s linear infinite' } : {}} /> Reset Defaults
                    </button>
                </div>
            </div>

            {/* 30-Day Timeline */}
            <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', textAlign: 'left' }}>
                <h3 style={{ margin: '0 0 20px', fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Clock size={20} color="#be9055" /> 30-Day Healing Timeline
                </h3>

                {/* Phase Groups */}
                {['initial', 'peeling', 'healing'].map(phase => {
                    const config = PHASE_CONFIG[phase];
                    const phaseDays = aftercareTemplates.filter(t => t.phase === phase);

                    return (
                        <div key={phase} style={{ marginBottom: '24px' }}>
                            {/* Phase Header */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', padding: '12px 16px', background: config.color, borderRadius: '12px', border: `1px solid ${config.color}`, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                                <config.icon size={18} color="#fff" />
                                <div>
                                    <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.9rem' }}>{config.label}</span>
                                    <span style={{ marginLeft: '10px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.9)' }}>{config.days} — {config.desc}</span>
                                </div>
                            </div>

                            {/* Day Cards */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '20px', borderLeft: `3px solid ${config.color}30` }}>
                                {phaseDays.map(tpl => {
                                    const isEditing = editingTemplate === tpl.id;

                                    return (
                                        <div key={tpl.id} style={{
                                            display: 'flex', gap: '14px', padding: '14px 16px',
                                            background: isEditing ? '#f8fafc' : '#fff',
                                            borderRadius: '12px',
                                            border: '1px solid #e2e8f0',
                                            boxShadow: isEditing ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                                            transition: 'all 0.2s'
                                        }}>
                                            {/* Day Indicator */}
                                            {!isEditing && (
                                                <div style={{
                                                    width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    background: '#e2e8f0', color: '#64748b',
                                                    fontWeight: 700, fontSize: '0.8rem'
                                                }}>
                                                    {tpl.day_number}
                                                </div>
                                            )}

                                            {/* Content */}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                {isEditing ? (
                                                    /* Edit Mode */
                                                    <div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                                            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>Day {tpl.day_number}</span>
                                                            <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: 600, background: `${config.color}20`, color: config.color, textTransform: 'uppercase' }}>{phase}</span>
                                                        </div>
                                                        <div className="form-group" style={{ marginBottom: '8px' }}>
                                                            <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Title</label>
                                                            <input type="text" className="form-input" value={editForm.title} onChange={e => setEditForm(p => ({...p, title: e.target.value.substring(0, 100)}))} maxLength={100} />
                                                        </div>
                                                        <div className="form-group" style={{ marginBottom: '8px' }}>
                                                            <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Notification Message</label>
                                                            <textarea className="form-input" rows="3" value={editForm.message} onChange={e => setEditForm(p => ({...p, message: e.target.value.substring(0, 2000)}))} maxLength={2000} />
                                                        </div>
                                                        <div className="form-group" style={{ marginBottom: '12px' }}>
                                                            <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Extra Tips (optional)</label>
                                                            <textarea className="form-input" rows="2" value={editForm.tips} onChange={e => setEditForm(p => ({...p, tips: e.target.value.substring(0, 2000)}))} maxLength={2000} />
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                            <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '6px 14px' }} onClick={() => setEditingTemplate(null)}>Cancel</button>
                                                            <button className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => saveAftercareTemplate(tpl.id)} disabled={aftercareSaving}>
                                                                <Check size={14} /> Save
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    /* View Mode */
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                                                        <div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>
                                                                    {stripEmoji(tpl.title)}
                                                                </span>
                                                            </div>
                                                            <p style={{ margin: '0 0 4px', fontSize: '0.8rem', color: '#64748b', lineHeight: '1.5' }}>
                                                                {stripEmoji(tpl.message)}
                                                            </p>
                                                            {tpl.tips && (
                                                                <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', lineHeight: '1.4' }}>
                                                                    Tip: {stripEmoji(tpl.tips)}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <button 
                                                            style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', color: '#64748b', fontSize: '0.75rem', fontWeight: 600, flexShrink: 0, transition: 'all 0.2s' }}
                                                            onClick={() => { setEditingTemplate(tpl.id); setEditForm({ title: stripEmoji(tpl.title), message: stripEmoji(tpl.message), tips: stripEmoji(tpl.tips) }); }}
                                                            onMouseEnter={(e) => { e.currentTarget.style.color = '#be9055'; e.currentTarget.style.borderColor = '#be9055'; }}
                                                            onMouseLeave={(e) => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                                                        >
                                                            <Edit3 size={14} /> Edit
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
            
            <ConfirmModal {...confirmDialog} onClose={() => setConfirmDialog(prev => ({...prev, isOpen: false}))} />
        </div>
    );
}

export default AdminAftercare;
