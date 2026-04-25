import React, { useState, useEffect, useRef } from 'react';
import Axios from 'axios';
import { API_URL } from '../config';
import { Search, Filter, MessageSquare, Clock, AlertCircle, CheckCircle, XCircle, Trash2, Send, ChevronDown, Eye, Bug, Lightbulb, Layout, HelpCircle, Tag } from 'lucide-react';
import ImageLightbox from '../components/ImageLightbox';

const STATUS_CONFIG = {
  open: { label: 'Open', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' },
  investigating: { label: 'Investigating', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.3)' },
  resolved: { label: 'Resolved', color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)' },
  closed: { label: 'Closed', color: '#64748b', bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.3)' },
  junk: { label: 'Junk', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)' }
};

const TYPE_LABELS = { bug: 'Bug Report', feature: 'Feature Request', ui_ux: 'UI/UX Issue', general: 'General Feedback' };
const TYPE_ICONS = { bug: Bug, feature: Lightbulb, ui_ux: Layout, general: HelpCircle };
const CAT_LABELS = { booking: 'Booking', payment: 'Payment', artist: 'Artist', app_website: 'App/Website', ar_tryon: 'AR Try-On', other: 'Other' };
const PRIORITY_CONFIG = {
  low: { label: 'Low', color: '#64748b' }, medium: { label: 'Medium', color: '#f59e0b' },
  high: { label: 'High', color: '#f97316' }, critical: { label: 'Critical', color: '#ef4444' }
};

function AdminReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportDetail, setReportDetail] = useState(null);
  const [replies, setReplies] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const threadEndRef = useRef(null);
  const adminUser = JSON.parse(localStorage.getItem('user') || 'null');

  useEffect(() => { fetchReports(); }, [filterStatus, filterType, filterCategory]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (filterType !== 'all') params.append('report_type', filterType);
      if (filterCategory !== 'all') params.append('category', filterCategory);
      if (searchTerm) params.append('search', searchTerm);
      const res = await Axios.get(`${API_URL}/api/admin/reports?${params.toString()}`);
      if (res.data.success) setReports(res.data.reports || []);
      setLoading(false);
    } catch { setLoading(false); }
  };

  const fetchDetail = async (reportCode) => {
    try {
      const res = await Axios.get(`${API_URL}/api/reports/${reportCode}`);
      if (res.data.success) {
        setReportDetail(res.data.report);
        setReplies(res.data.replies || []);
        // Mark as read
        if (!res.data.report.is_read_by_admin) {
          Axios.put(`${API_URL}/api/admin/reports/${res.data.report.id}`, {});
        }
        setTimeout(() => threadEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    } catch { /* silent */ }
  };

  const handleSelectReport = (report) => {
    setSelectedReport(report.report_code);
    fetchDetail(report.report_code);
  };

  const handleStatusChange = async (newStatus) => {
    if (!reportDetail) return;
    try {
      await Axios.put(`${API_URL}/api/admin/reports/${reportDetail.id}`, { status: newStatus });
      fetchDetail(reportDetail.report_code);
      fetchReports();
    } catch { /* silent */ }
  };

  const handlePriorityChange = async (newPriority) => {
    if (!reportDetail) return;
    try {
      await Axios.put(`${API_URL}/api/admin/reports/${reportDetail.id}`, { priority: newPriority });
      fetchDetail(reportDetail.report_code);
      fetchReports();
    } catch { /* silent */ }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !reportDetail || !adminUser) return;
    setSending(true);
    try {
      await Axios.post(`${API_URL}/api/reports/${reportDetail.id}/reply`, {
        sender_id: adminUser.id, sender_role: 'admin', message: replyText.trim()
      });
      setReplyText('');
      fetchDetail(reportDetail.report_code);
    } catch { /* silent */ }
    setSending(false);
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

  const filteredReports = reports.filter(r =>
    !searchTerm || r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.report_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statusCounts = {};
  reports.forEach(r => { statusCounts[r.status] = (statusCounts[r.status] || 0) + 1; });

  return (
    <div style={{ display: 'flex', gap: '0', height: 'calc(100vh - 220px)', minHeight: '500px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
      {/* LEFT PANE — Report List */}
      <div style={{ width: '380px', minWidth: '320px', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', background: '#fafbfc' }}>
        {/* Search */}
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px' }}>
            <Search size={15} color="#94a3b8" />
            <input type="text" placeholder="Search reports..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); }} onKeyDown={e => e.key === 'Enter' && fetchReports()}
              style={{ border: 'none', outline: 'none', flex: 1, fontSize: '0.85rem', background: 'transparent', color: '#1e293b' }} />
          </div>
        </div>

        {/* Filter Toggles */}
        <div style={{ padding: '8px 16px', display: 'flex', gap: '6px', flexWrap: 'wrap', borderBottom: '1px solid #e2e8f0' }}>
          {['all', 'open', 'investigating', 'resolved', 'closed', 'junk'].map(s => {
            const cfg = s === 'all' ? { label: 'All', color: '#64748b', bg: 'rgba(100,116,139,0.08)' } : STATUS_CONFIG[s];
            const count = s === 'all' ? reports.length : (statusCounts[s] || 0);
            return (
              <button key={s} onClick={() => setFilterStatus(s)} style={{
                padding: '4px 10px', borderRadius: '14px', border: filterStatus === s ? `1.5px solid ${cfg.color}` : '1px solid #e2e8f0',
                background: filterStatus === s ? cfg.bg : 'transparent', color: filterStatus === s ? cfg.color : '#94a3b8',
                fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.15s'
              }}>
                {cfg.label} <span style={{ opacity: 0.7 }}>({count})</span>
              </button>
            );
          })}
        </div>

        {/* Sub-filters */}
        <div style={{ padding: '8px 16px', display: 'flex', gap: '8px', borderBottom: '1px solid #f1f5f9' }}>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="premium-select-v2" style={{ flex: 1, fontSize: '0.78rem', padding: '5px 8px' }}>
            <option value="all">All Types</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="premium-select-v2" style={{ flex: 1, fontSize: '0.78rem', padding: '5px 8px' }}>
            <option value="all">All Categories</option>
            {Object.entries(CAT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        {/* Report List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>Loading reports...</div>
          ) : filteredReports.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}>
              <MessageSquare size={32} style={{ marginBottom: '8px', opacity: 0.4 }} />
              <p style={{ fontSize: '0.85rem', margin: 0 }}>No reports found</p>
            </div>
          ) : filteredReports.map(r => {
            const sc = STATUS_CONFIG[r.status] || STATUS_CONFIG.open;
            const isSelected = selectedReport === r.report_code;
            const TypeIcon = TYPE_ICONS[r.report_type] || HelpCircle;
            return (
              <div key={r.id} onClick={() => handleSelectReport(r)} style={{
                padding: '14px 16px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9',
                background: isSelected ? 'rgba(190,144,85,0.06)' : (r.is_read_by_admin ? 'transparent' : 'rgba(59,130,246,0.03)'),
                borderLeft: isSelected ? '3px solid #be9055' : '3px solid transparent',
                transition: 'all 0.15s'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontFamily: 'monospace', fontWeight: r.is_read_by_admin ? 400 : 700 }}>{r.report_code}</span>
                  <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '10px', background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, fontWeight: 600 }}>{sc.label}</span>
                </div>
                <p style={{ margin: '0 0 4px', fontSize: '0.85rem', fontWeight: r.is_read_by_admin ? 500 : 700, color: '#1e293b', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem', color: '#94a3b8' }}>
                  <TypeIcon size={12} />
                  <span>{TYPE_LABELS[r.report_type] || r.report_type}</span>
                  <span>·</span>
                  <span>{r.customer_name}</span>
                  <span>·</span>
                  <span>{timeAgo(r.created_at)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT PANE — Report Detail */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {!reportDetail ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
            <div style={{ textAlign: 'center' }}>
              <Eye size={40} style={{ marginBottom: '12px', opacity: 0.3 }} />
              <p style={{ fontSize: '0.9rem', margin: 0 }}>Select a report to view details</p>
            </div>
          </div>
        ) : (
          <>
            {/* Detail Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', background: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace' }}>{reportDetail.report_code}</span>
                  <h3 style={{ margin: '4px 0 0', fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>{reportDetail.title}</h3>
                </div>
                <span style={{
                  padding: '4px 12px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 600,
                  background: (STATUS_CONFIG[reportDetail.status] || STATUS_CONFIG.open).bg,
                  color: (STATUS_CONFIG[reportDetail.status] || STATUS_CONFIG.open).color,
                  border: `1px solid ${(STATUS_CONFIG[reportDetail.status] || STATUS_CONFIG.open).border}`
                }}>{(STATUS_CONFIG[reportDetail.status] || STATUS_CONFIG.open).label}</span>
              </div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '0.78rem', color: '#64748b' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Tag size={12} /> {TYPE_LABELS[reportDetail.report_type] || reportDetail.report_type} · {CAT_LABELS[reportDetail.category] || reportDetail.category}
                </span>
                <span>Submitted by: <strong style={{ color: '#1e293b' }}>{reportDetail.customer_name}</strong></span>
                <span><Clock size={12} style={{ verticalAlign: '-2px' }} /> {new Date(reportDetail.created_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>

            {/* Detail Body + Thread */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
              {/* Description */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '0.82rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Description</h4>
                <p style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>{reportDetail.description}</p>
              </div>

              {/* Steps to Reproduce */}
              {reportDetail.steps_to_reproduce && (
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ fontSize: '0.82rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Steps to Reproduce</h4>
                  <pre style={{ fontSize: '0.85rem', color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-wrap', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', margin: 0 }}>{reportDetail.steps_to_reproduce}</pre>
                </div>
              )}

              {/* Attachment */}
              {reportDetail.attachment && (
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ fontSize: '0.82rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Attachment</h4>
                  <img src={reportDetail.attachment} alt="Report attachment" className="lightbox-trigger" style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    onClick={() => setLightboxSrc(reportDetail.attachment)} />
                </div>
              )}

              {/* System Info */}
              {reportDetail.system_info && (() => {
                const si = typeof reportDetail.system_info === 'string' ? JSON.parse(reportDetail.system_info) : reportDetail.system_info;
                return (
                  <div style={{ marginBottom: '24px', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>System: {si.browser} · {si.os} · {si.screen} · Page: {si.page}</span>
                  </div>
                );
              })()}

              {/* Thread */}
              {replies.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ fontSize: '0.82rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>Conversation</h4>
                  {replies.map(reply => (
                    <div key={reply.id} style={{
                      marginBottom: '12px', padding: '12px 14px', borderRadius: '10px',
                      background: reply.sender_role === 'admin' ? 'rgba(190,144,85,0.06)' : '#f8fafc',
                      border: reply.sender_role === 'admin' ? '1px solid rgba(190,144,85,0.15)' : '1px solid #e2e8f0',
                      marginLeft: reply.sender_role === 'admin' ? '0' : '24px', marginRight: reply.sender_role === 'admin' ? '24px' : '0'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: reply.sender_role === 'admin' ? '#be9055' : '#3b82f6' }}>
                          {reply.sender_role === 'admin' ? '🛡️ Admin' : '👤 Customer'} · {reply.sender_name}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{timeAgo(reply.created_at)}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{reply.message}</p>
                    </div>
                  ))}
                </div>
              )}
              <div ref={threadEndRef} />
            </div>

            {/* Admin Controls Footer */}
            <div style={{ borderTop: '1px solid #e2e8f0', padding: '16px 24px', background: '#fafbfc' }}>
              {/* Reply box */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <textarea value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Write a reply..."
                  rows={2} style={{ flex: 1, padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem', resize: 'vertical', outline: 'none', fontFamily: 'inherit', minHeight: '44px' }}
                  onFocus={e => e.target.style.borderColor = '#be9055'} onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                <button onClick={handleReply} disabled={sending || !replyText.trim()} style={{
                  padding: '10px 16px', background: sending ? '#94a3b8' : 'linear-gradient(135deg, #be9055, #a07840)',
                  color: '#fff', border: 'none', borderRadius: '8px', cursor: sending ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '0.82rem', alignSelf: 'flex-end'
                }}>
                  <Send size={14} /> Send
                </button>
              </div>

              {/* Status + Priority Controls */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Status:</span>
                  <select value={reportDetail.status} onChange={e => handleStatusChange(e.target.value)} className="premium-select-v2"
                    style={{ fontSize: '0.78rem', padding: '5px 10px', borderColor: (STATUS_CONFIG[reportDetail.status] || STATUS_CONFIG.open).border }}>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Priority:</span>
                  <select value={reportDetail.priority} onChange={e => handlePriorityChange(e.target.value)} className="premium-select-v2"
                    style={{ fontSize: '0.78rem', padding: '5px 10px' }}>
                    {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                  {reportDetail.status !== 'resolved' && (
                    <button onClick={() => handleStatusChange('resolved')} style={{
                      padding: '6px 14px', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)',
                      borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                    }}><CheckCircle size={13} /> Mark Resolved</button>
                  )}
                  {reportDetail.status !== 'junk' && (
                    <button onClick={() => handleStatusChange('junk')} style={{
                      padding: '6px 14px', background: 'rgba(239,68,68,0.06)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)',
                      borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                    }}><Trash2 size={13} /> Junk</button>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      <ImageLightbox src={lightboxSrc} alt="Report attachment" onClose={() => setLightboxSrc(null)} />
    </div>
  );
}

export default AdminReports;
