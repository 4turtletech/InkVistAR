import React, { useState, useEffect, useRef } from 'react';
import Axios from 'axios';
import { API_URL } from '../config';
import CustomerSideNav from '../components/CustomerSideNav';
import { MessageSquare, Plus, X, Send, ChevronDown, ChevronUp, Paperclip, Shield, UserCircle } from 'lucide-react';
import './PortalStyles.css';
import ConfirmModal from '../components/ConfirmModal';
import ImageLightbox from '../components/ImageLightbox';

const STATUS_CONFIG = {
  open: { label: 'Open', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  investigating: { label: 'Investigating', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  resolved: { label: 'Resolved', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  closed: { label: 'Closed', color: '#64748b', bg: 'rgba(100,116,139,0.1)' }
};
const TYPE_LABELS = { bug: 'Bug Report', feature: 'Feature Request', ui_ux: 'UI/UX Issue', general: 'General Feedback' };
const CAT_LABELS = { booking: 'Booking', payment: 'Payment', artist: 'Artist', app_website: 'App/Website', ar_tryon: 'AR Try-On', other: 'Other' };

function CustomerReports() {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const customerId = user?.id;

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [expandedDetail, setExpandedDetail] = useState(null);
  const [expandedReplies, setExpandedReplies] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [composeVisible, setComposeVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false });
  const [form, setForm] = useState({ report_type: 'general', category: 'other', title: '', description: '', steps_to_reproduce: '', attachment: null });
  const [lightboxSrc, setLightboxSrc] = useState(null);

  useEffect(() => { if (customerId) fetchReports(); }, [customerId]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await Axios.get(`${API_URL}/api/reports/customer/${customerId}`);
      if (res.data.success) setReports(res.data.reports || []);
    } catch { /* silent */ }
    setLoading(false);
  };

  const handleExpand = async (report) => {
    if (expandedId === report.id) { setExpandedId(null); return; }
    setExpandedId(report.id);
    try {
      const res = await Axios.get(`${API_URL}/api/reports/${report.report_code}`);
      if (res.data.success) {
        setExpandedDetail(res.data.report);
        setExpandedReplies(res.data.replies || []);
      }
    } catch { /* silent */ }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !expandedDetail) return;
    setSending(true);
    try {
      await Axios.post(`${API_URL}/api/reports/${expandedDetail.id}/reply`, {
        sender_id: customerId, sender_role: 'customer', message: replyText.trim()
      });
      setReplyText('');
      const res = await Axios.get(`${API_URL}/api/reports/${expandedDetail.report_code}`);
      if (res.data.success) setExpandedReplies(res.data.replies || []);
    } catch { /* silent */ }
    setSending(false);
  };

  const openCompose = () => {
    setForm({ report_type: 'general', category: 'other', title: '', description: '', steps_to_reproduce: '', attachment: null });
    setShowCompose(true);
    setTimeout(() => setComposeVisible(true), 10);
  };
  const closeCompose = () => {
    setComposeVisible(false);
    setTimeout(() => setShowCompose(false), 300);
  };

  const handleAttachment = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      setConfirmDialog({ isOpen: true, title: 'File Too Large', message: 'Attachment must be under 3MB.', type: 'danger', isAlert: true, onConfirm: () => setConfirmDialog({ isOpen: false }) });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setForm(prev => ({ ...prev, attachment: reader.result }));
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) return;
    setSubmitting(true);
    try {
      const systemInfo = {
        browser: navigator.userAgent.split('(')[0].trim(),
        os: navigator.platform,
        screen: `${window.screen.width}x${window.screen.height}`,
        page: window.location.pathname
      };
      const res = await Axios.post(`${API_URL}/api/reports`, {
        customer_id: customerId, ...form, system_info: systemInfo
      });
      if (res.data.success) {
        closeCompose();
        fetchReports();
        setConfirmDialog({ isOpen: true, title: 'Report Submitted', message: `Your report ${res.data.report_code} has been submitted. We'll review it shortly!`, type: 'success', isAlert: true, onConfirm: () => setConfirmDialog({ isOpen: false }) });
      }
    } catch {
      setConfirmDialog({ isOpen: true, title: 'Error', message: 'Failed to submit report. Please try again.', type: 'danger', isAlert: true, onConfirm: () => setConfirmDialog({ isOpen: false }) });
    }
    setSubmitting(false);
  };

  const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
  };

  const filtered = reports.filter(r => activeFilter === 'all' || r.status === activeFilter);
  const statusCounts = {};
  reports.forEach(r => { if (r.status !== 'junk') statusCounts[r.status] = (statusCounts[r.status] || 0) + 1; });

  return (
    <div className="admin-page-with-sidenav">
      <CustomerSideNav />
      <div className="admin-page page-container-enter">
        <header className="portal-header">
          <h1>My Reports</h1>
          <button className="btn btn-primary" onClick={openCompose} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={18} /> New Report
          </button>
        </header>

        <p className="header-subtitle" style={{ color: '#64748b', fontSize: '0.88rem', margin: '-8px 0 20px', lineHeight: 1.5 }}>
          Track your feedback and bug reports with InkVistAR Studio.
        </p>

        {/* Status Filter Tabs — horizontal scroll on mobile */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: '4px', scrollbarWidth: 'none' }}>
          {[{ key: 'all', label: 'All' }, ...Object.entries(STATUS_CONFIG).map(([k, v]) => ({ key: k, label: v.label }))].map(f => {
            const count = f.key === 'all' ? reports.filter(r => r.status !== 'junk').length : (statusCounts[f.key] || 0);
            const cfg = f.key === 'all' ? { color: '#64748b', bg: '#f1f5f9' } : STATUS_CONFIG[f.key];
            return (
              <button key={f.key} onClick={() => setActiveFilter(f.key)} style={{
                padding: '6px 14px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                border: activeFilter === f.key ? `1.5px solid ${cfg.color}` : '1px solid #e2e8f0',
                background: activeFilter === f.key ? cfg.bg : 'transparent',
                color: activeFilter === f.key ? cfg.color : '#94a3b8', transition: 'all 0.15s',
                whiteSpace: 'nowrap', flexShrink: 0
              }}>
                {f.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Reports List */}
        <div className="portal-content">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>Loading your reports...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
              <MessageSquare size={40} style={{ marginBottom: '12px', opacity: 0.3 }} />
              <p style={{ fontSize: '0.9rem' }}>No reports yet. Submit feedback to help us improve!</p>
            </div>
          ) : filtered.map(r => {
            const sc = STATUS_CONFIG[r.status] || STATUS_CONFIG.open;
            const isExpanded = expandedId === r.id;
            return (
              <div key={r.id} style={{
                marginBottom: '12px', borderRadius: '12px', border: '1px solid #e2e8f0',
                overflow: 'hidden', transition: 'all 0.2s', background: '#fff'
              }}>
                {/* Report Card Header */}
                <div onClick={() => handleExpand(r)} style={{
                  padding: '14px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                  background: isExpanded ? 'rgba(190,144,85,0.03)' : '#fff', gap: '10px'
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: '#94a3b8' }}>{r.report_code}</span>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>·</span>
                      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{TYPE_LABELS[r.report_type]}</span>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>·</span>
                      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{CAT_LABELS[r.category]}</span>
                    </div>
                    <p style={{ margin: '0 0 4px', fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', wordBreak: 'break-word' }}>{r.title}</p>
                    <span style={{ fontSize: '0.73rem', color: '#94a3b8', display: 'block' }}>
                      {new Date(r.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {r.updated_at && r.updated_at !== r.created_at && ` · ${timeAgo(r.updated_at)}`}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                    <span style={{
                      padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
                      background: sc.bg, color: sc.color
                    }}>{sc.label}</span>
                    {isExpanded ? <ChevronUp size={16} color="#94a3b8" /> : <ChevronDown size={16} color="#94a3b8" />}
                  </div>
                </div>

                {/* Expanded Detail */}
                {isExpanded && expandedDetail && (
                  <div style={{ borderTop: '1px solid #f1f5f9', padding: '16px' }}>
                    <p style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: '0 0 16px' }}>{expandedDetail.description}</p>
                    {expandedDetail.steps_to_reproduce && (
                      <div style={{ marginBottom: '16px' }}>
                        <h5 style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '6px' }}>Steps to Reproduce</h5>
                        <pre style={{ fontSize: '0.82rem', color: '#334155', whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', margin: 0, overflowX: 'auto' }}>{expandedDetail.steps_to_reproduce}</pre>
                      </div>
                    )}
                    {expandedDetail.attachment && (
                      <div style={{ marginBottom: '16px' }}>
                        <img src={expandedDetail.attachment} alt="Attachment" className="lightbox-trigger" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', border: '1px solid #e2e8f0' }} onClick={() => setLightboxSrc(expandedDetail.attachment)} />
                      </div>
                    )}

                    {/* Thread */}
                    {expandedReplies.length > 0 && (
                      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '16px', marginBottom: '16px' }}>
                        <h5 style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '12px' }}>Conversation</h5>
                        {expandedReplies.map(reply => (
                          <div key={reply.id} style={{
                            marginBottom: '10px', padding: '10px 12px', borderRadius: '10px',
                            background: reply.sender_role === 'admin' ? 'rgba(190,144,85,0.06)' : '#f8fafc',
                            border: reply.sender_role === 'admin' ? '1px solid rgba(190,144,85,0.15)' : '1px solid #e2e8f0'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: reply.sender_role === 'admin' ? '#be9055' : '#3b82f6', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                {reply.sender_role === 'admin' ? <><Shield size={13} /> InkVistAR Team</> : <><UserCircle size={13} /> You</>}
                              </span>
                              <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{timeAgo(reply.created_at)}</span>
                            </div>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{reply.message}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reply Box */}
                    {(expandedDetail.status === 'open' || expandedDetail.status === 'investigating') && (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                        <input type="text" value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Write a reply..."
                          onKeyDown={e => e.key === 'Enter' && handleReply()}
                          style={{ flex: 1, padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '16px', outline: 'none', minWidth: 0 }} />
                        <button onClick={handleReply} disabled={sending || !replyText.trim()} style={{
                          padding: '10px 14px', background: 'linear-gradient(135deg, #be9055, #a07840)', color: '#fff',
                          border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0, minWidth: '44px', minHeight: '44px'
                        }}><Send size={16} /></button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Compose Modal */}
        {showCompose && (
          <div className={`modal-overlay ${composeVisible ? 'open' : ''}`} onClick={closeCompose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px' }}>
              <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ background: 'rgba(190,144,85,0.1)', borderRadius: '50%', padding: '10px', display: 'flex' }}>
                    <MessageSquare size={20} color="#be9055" />
                  </div>
                  <div>
                    <h2 style={{ margin: 0 }}>Submit a Report</h2>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8' }}>Help us improve InkVistAR</p>
                  </div>
                </div>
                <button className="close-btn" onClick={closeCompose}><X size={24} /></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                  <div className="grid-form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                    <div className="form-group">
                      <label className="premium-label">Report Type</label>
                      <select className="premium-select-v2" value={form.report_type} onChange={e => setForm(p => ({ ...p, report_type: e.target.value }))} style={{ width: '100%' }}>
                        <option value="bug">Bug Report</option>
                        <option value="feature">Feature Request</option>
                        <option value="ui_ux">UI/UX Issue</option>
                        <option value="general">General Feedback</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="premium-label">Category</label>
                      <select className="premium-select-v2" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} style={{ width: '100%' }}>
                        {Object.entries(CAT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="form-group" style={{ marginBottom: '14px' }}>
                    <label className="premium-label">Title *</label>
                    <input type="text" className="form-input" required maxLength={255} value={form.title}
                      onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Brief summary of the issue" />
                  </div>
                  <div className="form-group" style={{ marginBottom: '14px' }}>
                    <label className="premium-label">Description *</label>
                    <textarea className="form-input" required rows={4} value={form.description}
                      onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Describe the issue or feedback in detail..." style={{ resize: 'vertical' }} />
                  </div>
                  {form.report_type === 'bug' && (
                    <div className="form-group" style={{ marginBottom: '14px' }}>
                      <label className="premium-label">Steps to Reproduce (Optional)</label>
                      <textarea className="form-input" rows={3} value={form.steps_to_reproduce}
                        onChange={e => setForm(p => ({ ...p, steps_to_reproduce: e.target.value }))} placeholder="1. Go to...\n2. Click on...\n3. Observe..." style={{ resize: 'vertical' }} />
                    </div>
                  )}
                  <div className="form-group">
                    <label className="premium-label">Attachment (Optional, max 3MB)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <label style={{
                        padding: '8px 16px', border: '1px dashed #cbd5e1', borderRadius: '8px', cursor: 'pointer',
                        fontSize: '0.82rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px'
                      }}>
                        <Paperclip size={14} /> Choose Image
                        <input type="file" accept="image/*" onChange={handleAttachment} style={{ display: 'none' }} />
                      </label>
                      {form.attachment && (
                        <div style={{ position: 'relative' }}>
                          <img src={form.attachment} alt="Preview" style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
                          <button type="button" onClick={() => setForm(p => ({ ...p, attachment: null }))}
                            style={{ position: 'absolute', top: '-6px', right: '-6px', width: '18px', height: '18px', borderRadius: '50%', background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeCompose}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={submitting} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {submitting ? 'Submitting...' : <><Send size={15} /> Submit Report</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <ConfirmModal {...confirmDialog} onClose={() => setConfirmDialog({ isOpen: false })} />
        <ImageLightbox src={lightboxSrc} alt="Report attachment" onClose={() => setLightboxSrc(null)} />
      </div>
    </div>
  );
}

export default CustomerReports;
