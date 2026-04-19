import React, { useState, useEffect } from 'react';
import Axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sun, Droplets, Shield, AlertTriangle, CheckCircle, Clock, Heart, Sparkles } from 'lucide-react';
import CustomerSideNav from '../components/CustomerSideNav';
import './PortalStyles.css';
import './CustomerStyles.css';
import { API_URL } from '../config';

const PHASE_CONFIG = {
  initial: { label: 'Initial Healing', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', icon: AlertTriangle },
  peeling: { label: 'Peeling & Itching', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', icon: Droplets },
  healing: { label: 'Final Healing', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', icon: Heart }
};

function CustomerAftercare() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const customerId = user?.id;

  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(false);
  const [aftercare, setAftercare] = useState(null);
  const [templates, setTemplates] = useState([]);

  useEffect(() => {
    if (customerId) fetchAftercare();
  }, [customerId]);

  const fetchAftercare = async () => {
    try {
      setLoading(true);
      const res = await Axios.get(`${API_URL}/api/customer/aftercare/${customerId}`);
      if (res.data.success) {
        setActive(res.data.active);
        setAftercare(res.data.aftercare);
        setTemplates(res.data.templates || []);
      }
    } catch (error) {
      console.error('Error fetching aftercare:', error);
    } finally {
      setLoading(false);
    }
  };

  const progressPercent = aftercare ? Math.min(100, (aftercare.currentDay / aftercare.totalDays) * 100) : 0;
  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  const getPhaseForDay = (day) => {
    if (day <= 3) return 'initial';
    if (day <= 14) return 'peeling';
    return 'healing';
  };

  return (
    <div className="portal-layout">
      <CustomerSideNav />
      <div className="portal-container customer-portal">
        <header className="portal-header">
          <div className="header-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={() => navigate('/customer')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '50%', display: 'flex', color: '#64748b', transition: 'all 0.2s' }}>
              <ArrowLeft size={22} />
            </button>
            <h1>Tattoo Aftercare Guide</h1>
          </div>
        </header>
        <p className="header-subtitle" style={{ color: '#64748b', marginTop: '-8px' }}>Your personalized healing journey</p>

        <div className="portal-content" style={{ paddingBottom: '40px' }}>
          {loading ? (
            <div className="dashboard-loader-container"><div className="premium-loader"></div><p>Loading aftercare data...</p></div>
          ) : !active || !aftercare ? (
            /* No active aftercare */
            <div style={{ textAlign: 'center', padding: '80px 20px' }}>
              <div style={{ width: '80px', height: '80px', background: 'rgba(190, 144, 85, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <Heart size={36} color="#be9055" />
              </div>
              <h2 style={{ margin: '0 0 10px', color: '#1e293b', fontSize: '1.5rem' }}>No Active Aftercare</h2>
              <p style={{ color: '#64748b', maxWidth: '400px', margin: '0 auto 24px', lineHeight: '1.6' }}>
                You don't have a recently completed tattoo session. Your personalized aftercare guide will appear here once a tattoo session is marked as complete.
              </p>
              <button onClick={() => navigate('/customer/bookings')} style={{ background: '#be9055', color: '#fff', border: 'none', padding: '12px 28px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem' }}>
                Book a Session
              </button>
            </div>
          ) : (
            <>
              {/* Hero Widget */}
              <div style={{ background: '#0f172a', borderRadius: '20px', padding: '28px', marginBottom: '28px', color: '#fff', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(190,144,85,0.15) 0%, transparent 70%)', borderRadius: '50%' }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
                  {/* Progress Ring */}
                  <div style={{ position: 'relative', width: '120px', height: '120px', flexShrink: 0 }}>
                    <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
                      <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
                      <circle cx="60" cy="60" r="54" fill="none" stroke="#be9055" strokeWidth="8"
                        strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                        style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '2rem', fontWeight: 800, color: '#be9055', lineHeight: 1 }}>{aftercare.currentDay}</span>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>of {aftercare.totalDays}</span>
                    </div>
                  </div>

                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      {(() => {
                        const PhaseIcon = PHASE_CONFIG[aftercare.phase]?.icon || Heart;
                        return <PhaseIcon size={18} color={PHASE_CONFIG[aftercare.phase]?.color} />;
                      })()}
                      <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, background: PHASE_CONFIG[aftercare.phase]?.bg, color: PHASE_CONFIG[aftercare.phase]?.color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {PHASE_CONFIG[aftercare.phase]?.label}
                      </span>
                    </div>
                    <h2 style={{ margin: '0 0 6px', fontSize: '1.3rem', fontWeight: 700, fontFamily: "'Playfair Display', serif" }}>
                      {aftercare.designTitle}
                    </h2>
                    <p style={{ margin: '0 0 12px', color: '#94a3b8', fontSize: '0.85rem' }}>
                      Artist: {aftercare.artistName} • Completed: {new Date(aftercare.completedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>

                    {/* Today's Tip */}
                    <div style={{ background: 'rgba(190, 144, 85, 0.1)', borderRadius: '12px', padding: '14px 16px', border: '1px solid rgba(190, 144, 85, 0.2)' }}>
                      <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '0.85rem', color: '#be9055' }}>
                        <Sparkles size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                        Today's Focus
                      </p>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#e2e8f0', lineHeight: '1.5' }}>
                        {templates.find(t => t.day_number === aftercare.currentDay)?.message || 'Continue your daily aftercare routine.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* General Rules Card */}
              <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', marginBottom: '28px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Shield size={20} color="#be9055" /> General Aftercare Rules
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  {[
                    { icon: <Droplets size={16} />, text: 'Wash hands before touching your tattoo' },
                    { icon: <Sun size={16} />, text: 'Avoid direct sunlight — use SPF 30+ once healed' },
                    { icon: <AlertTriangle size={16} />, text: 'No swimming, baths, or hot tubs for 3-4 weeks' },
                    { icon: <Heart size={16} />, text: 'Wear loose, breathable clothing' },
                    { icon: <Shield size={16} />, text: 'Never scratch, pick, or peel flaking skin' },
                    { icon: <Clock size={16} />, text: 'Use fragrance-free soap and lotion only' }
                  ].map((rule, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                      <span style={{ color: '#be9055', flexShrink: 0, marginTop: '2px' }}>{rule.icon}</span>
                      <span style={{ fontSize: '0.85rem', color: '#475569', lineHeight: '1.4' }}>{rule.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 30-Day Timeline */}
              <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <h3 style={{ margin: '0 0 20px', fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Clock size={20} color="#be9055" /> 30-Day Healing Timeline
                </h3>

                {/* Phase Groups */}
                {[
                  { phase: 'initial', label: 'Phase 1: Initial Healing', days: 'Days 1-3', desc: 'Red, swollen, tender skin. Focus on cleaning' },
                  { phase: 'peeling', label: 'Phase 2: Peeling & Itching', days: 'Days 4-14', desc: 'Flaking and itching. Do NOT pick' },
                  { phase: 'healing', label: 'Phase 3: Final Healing', days: 'Days 15-30', desc: 'Skin regeneration and settling' }
                ].map(phaseGroup => {
                  const config = PHASE_CONFIG[phaseGroup.phase];
                  const phaseDays = templates.filter(t => t.phase === phaseGroup.phase);

                  return (
                    <div key={phaseGroup.phase} style={{ marginBottom: '24px' }}>
                      {/* Phase Header */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', padding: '12px 16px', background: config.bg, borderRadius: '12px', border: `1px solid ${config.color}25` }}>
                        <config.icon size={18} color={config.color} />
                        <div>
                          <span style={{ fontWeight: 700, color: config.color, fontSize: '0.9rem' }}>{phaseGroup.label}</span>
                          <span style={{ marginLeft: '10px', fontSize: '0.8rem', color: '#64748b' }}>{phaseGroup.days} — {phaseGroup.desc}</span>
                        </div>
                      </div>

                      {/* Day Cards */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '20px', borderLeft: `3px solid ${config.color}30` }}>
                        {phaseDays.map(tpl => {
                          const isCurrent = tpl.day_number === aftercare.currentDay;
                          const isPast = tpl.day_number < aftercare.currentDay;
                          const isFuture = tpl.day_number > aftercare.currentDay;

                          return (
                            <div key={tpl.day_number} style={{
                              display: 'flex', gap: '14px', padding: '14px 16px',
                              background: isCurrent ? 'rgba(190, 144, 85, 0.08)' : isPast ? '#fafbfc' : '#fff',
                              borderRadius: '12px',
                              border: isCurrent ? '2px solid #be9055' : '1px solid #f1f5f9',
                              opacity: isFuture ? 0.6 : 1,
                              transition: 'all 0.2s'
                            }}>
                              {/* Day Indicator */}
                              <div style={{
                                width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: isPast ? '#10b981' : isCurrent ? '#be9055' : '#e2e8f0',
                                color: (isPast || isCurrent) ? '#fff' : '#94a3b8',
                                fontWeight: 700, fontSize: '0.8rem'
                              }}>
                                {isPast ? <CheckCircle size={18} /> : tpl.day_number}
                              </div>

                              {/* Content */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: isCurrent ? '#be9055' : '#1e293b' }}>
                                    {tpl.title}
                                  </span>
                                  {isCurrent && (
                                    <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '0.65rem', fontWeight: 700, background: '#be9055', color: '#fff', textTransform: 'uppercase' }}>
                                      Today
                                    </span>
                                  )}
                                </div>
                                <p style={{ margin: '0 0 4px', fontSize: '0.8rem', color: '#64748b', lineHeight: '1.5' }}>
                                  {tpl.message}
                                </p>
                                {tpl.tips && (
                                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', lineHeight: '1.4' }}>
                                    💡 {tpl.tips}
                                  </p>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default CustomerAftercare;
