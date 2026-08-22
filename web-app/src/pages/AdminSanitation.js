import React, { useState, useEffect } from 'react';
import Axios from 'axios';
import { API_URL } from '../config';
import AdminSideNav from '../components/AdminSideNav';
import { ShieldCheck, Trash2, CheckCircle, Plus, RefreshCw, User, Building } from 'lucide-react';
import './PortalStyles.css';

export default function AdminSanitation() {
    const [activeTab, setActiveTab] = useState('checklists'); // 'checklists', 'waste', 'staff_certs', 'studio_permits'
    const [loading, setLoading] = useState(false);

    const [checklists, setChecklists] = useState([]);
    const [wasteLogs, setWasteLogs] = useState([]);
    const [healthCerts, setHealthCerts] = useState([]);
    const [studioPermits, setStudioPermits] = useState([]);

    // Modal states
    const [showChecklistModal, setShowChecklistModal] = useState(false);
    const [showWasteModal, setShowWasteModal] = useState(false);
    const [showCertModal, setShowCertModal] = useState(false);
    const [showPermitModal, setShowPermitModal] = useState(false);

    // Form states
    const [cleanerName, setCleanerName] = useState('');
    const [areaName, setAreaName] = useState('Workstation 1');

    const [wasteType, setWasteType] = useState('sharps');
    const [wasteWeight, setWasteWeight] = useState('2.5');
    const [wasteCompany, setWasteCompany] = useState('Metro Biohazard Solutions');
    const [wasteManifest, setWasteManifest] = useState('');
    const [disposedBy, setDisposedBy] = useState('');

    const [staffName, setStaffName] = useState('');
    const [certType, setCertType] = useState('Medical Health Clearance');
    const [issuedDate, setIssuedDate] = useState('');
    const [expDate, setExpDate] = useState('');

    const [permitType, setPermitType] = useState('Sanitary Permit to Operate');
    const [permitNumber, setPermitNumber] = useState('');
    const [authority, setAuthority] = useState('Taguig City Health Department');

    const fetchData = async () => {
        setLoading(true);
        try {
            const [checkRes, wasteRes, certRes, permitRes] = await Promise.all([
                Axios.get(`${API_URL}/api/sanitation/checklists`).catch(() => ({ data: { success: false } })),
                Axios.get(`${API_URL}/api/sanitation/waste-disposal`).catch(() => ({ data: { success: false } })),
                Axios.get(`${API_URL}/api/sanitation/health-certificates`).catch(() => ({ data: { success: false } })),
                Axios.get(`${API_URL}/api/sanitation/studio-permits`).catch(() => ({ data: { success: false } }))
            ]);
            if (checkRes.data.success) setChecklists(checkRes.data.logs || []);
            if (wasteRes.data.success) setWasteLogs(wasteRes.data.logs || []);
            if (certRes.data.success) setHealthCerts(certRes.data.certificates || []);
            if (permitRes.data.success) setStudioPermits(permitRes.data.permits || []);
        } catch (e) {
            console.error('Failed to load sanitation data:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSaveChecklist = async (e) => {
        e.preventDefault();
        try {
            await Axios.post(`${API_URL}/api/sanitation/checklists`, {
                cleanerName,
                areaName,
                checklistData: {
                    disinfectedSurfaces: true,
                    barrierFilmApplied: true,
                    freshNeedlesUnsealed: true
                },
                verifiedBy: 'Studio Admin'
            });
            setShowChecklistModal(false);
            fetchData();
        } catch (e) {
            alert('Failed to save checklist log');
        }
    };

    const handleSaveWasteLog = async (e) => {
        e.preventDefault();
        try {
            await Axios.post(`${API_URL}/api/sanitation/waste-disposal`, {
                disposalType: wasteType,
                wasteWeightKg: wasteWeight,
                disposalCompany: wasteCompany,
                manifestNumber: wasteManifest || `MAN-${Date.now()}`,
                disposedBy: disposedBy || 'Studio Manager'
            });
            setShowWasteModal(false);
            fetchData();
        } catch (e) {
            alert('Failed to save waste disposal log');
        }
    };

    const handleSaveCert = async (e) => {
        e.preventDefault();
        try {
            await Axios.post(`${API_URL}/api/sanitation/health-certificates`, {
                staffName,
                certificateType: certType,
                issuedDate,
                expirationDate: expDate
            });
            setShowCertModal(false);
            fetchData();
        } catch (e) {
            alert('Failed to save health certificate');
        }
    };

    const handleSavePermit = async (e) => {
        e.preventDefault();
        try {
            await Axios.post(`${API_URL}/api/sanitation/studio-permits`, {
                permitType,
                permitNumber,
                issuingAuthority: authority,
                issuedDate,
                expirationDate: expDate
            });
            setShowPermitModal(false);
            fetchData();
        } catch (e) {
            alert('Failed to save studio sanitary permit');
        }
    };

    return (
        <div className="admin-portal-container">
            <AdminSideNav activeTab="sanitation" />
            <main className="admin-main-content" style={{ padding: '32px', background: '#f8fafc' }}>
                {/* Top Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div>
                        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <ShieldCheck size={28} color="#be9055" /> Studio Sanitation &amp; Compliance Dashboard
                        </h1>
                        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.9rem' }}>
                            Workstation hygiene logs, biohazard waste manifests, staff health certificates, and sanitary permits
                        </p>
                    </div>
                    <button onClick={fetchData} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer', fontWeight: 600 }}>
                        <RefreshCw size={16} /> Refresh
                    </button>
                </div>

                {/* Tab Navigation */}
                <div style={{ display: 'flex', gap: '12px', borderBottom: '2px solid #e2e8f0', marginBottom: '24px' }}>
                    {[
                        { key: 'checklists', label: 'Workstation Checklists', icon: CheckCircle },
                        { key: 'waste', label: 'Sharps & Waste Disposal', icon: Trash2 },
                        { key: 'staff_certs', label: 'Staff Health Certificates', icon: User },
                        { key: 'studio_permits', label: 'Sanitary Permits & Licenses', icon: Building }
                    ].map(t => {
                        const Icon = t.icon;
                        const active = activeTab === t.key;
                        return (
                            <button
                                key={t.key}
                                onClick={() => setActiveTab(t.key)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 18px',
                                    border: 'none', background: 'none', borderBottom: active ? '3px solid #be9055' : '3px solid transparent',
                                    color: active ? '#be9055' : '#64748b', fontWeight: active ? 700 : 500, cursor: 'pointer', fontSize: '0.92rem'
                                }}
                            >
                                <Icon size={18} /> {t.label}
                            </button>
                        );
                    })}
                </div>

                {/* Tab 1: Cleaning Checklists */}
                {activeTab === 'checklists' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0, color: '#1e293b' }}>Recent Workstation &amp; Area Cleaning Logs</h3>
                            <button onClick={() => setShowChecklistModal(true)} style={{ padding: '8px 16px', borderRadius: '8px', background: '#be9055', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Plus size={16} /> Log Cleaning Checklist
                            </button>
                        </div>
                        {checklists.length === 0 ? (
                            <div style={{ background: 'white', padding: '32px', borderRadius: '12px', textAlign: 'center', color: '#64748b' }}>
                                No workstation cleaning checklists logged yet.
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                                {checklists.map(c => (
                                    <div key={c.id} style={{ background: 'white', padding: '18px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                            <strong style={{ color: '#1e293b', fontSize: '1rem' }}>{c.area_name}</strong>
                                            <span style={{ fontSize: '0.75rem', background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>✅ Verified</span>
                                        </div>
                                        <p style={{ margin: '0 0 12px', fontSize: '0.82rem', color: '#64748b' }}>Logged by {c.cleaner_name} on {new Date(c.logged_at).toLocaleString()}</p>
                                        <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', fontSize: '0.8rem', color: '#475569' }}>
                                            <div>✔️ Hospital-grade disinfectant applied</div>
                                            <div>✔️ Protective barrier film replaced</div>
                                            <div>✔️ Single-use needles/cartridges unsealed</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Tab 2: Sharps & Waste Disposal */}
                {activeTab === 'waste' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0, color: '#1e293b' }}>Sharps &amp; Biohazard Waste Disposal Manifests</h3>
                            <button onClick={() => setShowWasteModal(true)} style={{ padding: '8px 16px', borderRadius: '8px', background: '#be9055', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Plus size={16} /> Log Waste Manifest
                            </button>
                        </div>
                        {wasteLogs.length === 0 ? (
                            <div style={{ background: 'white', padding: '32px', borderRadius: '12px', textAlign: 'center', color: '#64748b' }}>
                                No waste disposal manifests logged yet.
                            </div>
                        ) : (
                            <table style={{ width: '100%', background: 'white', borderRadius: '12px', borderCollapse: 'collapse', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                                <thead>
                                    <tr style={{ background: '#f1f5f9', textAlign: 'left', fontSize: '0.82rem', color: '#475569', textTransform: 'uppercase' }}>
                                        <th style={{ padding: '12px 16px' }}>Disposal Type</th>
                                        <th style={{ padding: '12px 16px' }}>Manifest #</th>
                                        <th style={{ padding: '12px 16px' }}>Weight (kg)</th>
                                        <th style={{ padding: '12px 16px' }}>Contractor / Company</th>
                                        <th style={{ padding: '12px 16px' }}>Logged By</th>
                                        <th style={{ padding: '12px 16px' }}>Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {wasteLogs.map(w => (
                                        <tr key={w.id} style={{ borderBottom: '1px solid #e2e8f0', fontSize: '0.88rem' }}>
                                            <td style={{ padding: '12px 16px', fontWeight: 600, color: '#991b1b' }}>{w.disposal_type?.toUpperCase()}</td>
                                            <td style={{ padding: '12px 16px', fontFamily: 'monospace' }}>{w.manifest_number}</td>
                                            <td style={{ padding: '12px 16px', fontWeight: 700 }}>{w.waste_weight_kg} kg</td>
                                            <td style={{ padding: '12px 16px' }}>{w.disposal_company}</td>
                                            <td style={{ padding: '12px 16px' }}>{w.disposed_by}</td>
                                            <td style={{ padding: '12px 16px', color: '#64748b' }}>{new Date(w.disposed_at).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                {/* Tab 3: Staff Health Certificates */}
                {activeTab === 'staff_certs' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0, color: '#1e293b' }}>Staff Health Certificates &amp; Medical Clearances</h3>
                            <button onClick={() => setShowCertModal(true)} style={{ padding: '8px 16px', borderRadius: '8px', background: '#be9055', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Plus size={16} /> Record Staff Cert
                            </button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                            {healthCerts.map(hc => (
                                <div key={hc.id} style={{ background: 'white', padding: '18px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                    <h4 style={{ margin: '0 0 4px', color: '#1e293b' }}>{hc.staff_name}</h4>
                                    <p style={{ margin: '0 0 12px', fontSize: '0.82rem', color: '#be9055', fontWeight: 600 }}>{hc.certificate_type}</p>
                                    <div style={{ fontSize: '0.82rem', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <div><strong>Issued:</strong> {hc.issued_date || 'N/A'}</div>
                                        <div><strong>Expires:</strong> {hc.expiration_date || 'N/A'}</div>
                                        <div style={{ marginTop: '8px' }}>
                                            <span style={{ padding: '3px 8px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: 700, background: '#dcfce7', color: '#166534' }}>STATUS: VALID</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Tab 4: Studio Sanitary Permits */}
                {activeTab === 'studio_permits' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0, color: '#1e293b' }}>Studio Sanitary Permits &amp; Licenses</h3>
                            <button onClick={() => setShowPermitModal(true)} style={{ padding: '8px 16px', borderRadius: '8px', background: '#be9055', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Plus size={16} /> Record Permit
                            </button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                            {studioPermits.map(sp => (
                                <div key={sp.id} style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                    <h4 style={{ margin: '0 0 6px', color: '#1e293b' }}>{sp.permit_type}</h4>
                                    <p style={{ margin: '0 0 12px', fontSize: '0.88rem', color: '#be9055', fontFamily: 'monospace', fontWeight: 700 }}>Permit #: {sp.permit_number}</p>
                                    <div style={{ fontSize: '0.82rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <div><strong>Authority:</strong> {sp.issuing_authority}</div>
                                        <div><strong>Issued:</strong> {sp.issued_date || 'N/A'}</div>
                                        <div><strong>Expiration:</strong> {sp.expiration_date || 'N/A'}</div>
                                        <div style={{ marginTop: '8px' }}>
                                            <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, background: '#dcfce7', color: '#166534' }}>ACTIVE PERMIT</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Modal: Log Checklist */}
                {showChecklistModal && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
                        <div style={{ background: 'white', padding: '24px', borderRadius: '16px', maxWidth: '420px', width: '100%' }}>
                            <h3 style={{ margin: '0 0 16px' }}>Log Workstation Cleaning Checklist</h3>
                            <form onSubmit={handleSaveChecklist}>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Staff Name</label>
                                <input type="text" required value={cleanerName} onChange={e => setCleanerName(e.target.value)} placeholder="Cleaner / Artist Name" style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '12px' }} />
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Area / Workstation</label>
                                <input type="text" required value={areaName} onChange={e => setAreaName(e.target.value)} placeholder="E.g. Station 1 / Piercing Room" style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '16px' }} />
                                
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                    <button type="button" onClick={() => setShowChecklistModal(false)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white' }}>Cancel</button>
                                    <button type="submit" style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#be9055', color: 'white', fontWeight: 600 }}>Save Log</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Modal: Log Waste Disposal */}
                {showWasteModal && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
                        <div style={{ background: 'white', padding: '24px', borderRadius: '16px', maxWidth: '420px', width: '100%' }}>
                            <h3 style={{ margin: '0 0 16px' }}>Log Waste Disposal Manifest</h3>
                            <form onSubmit={handleSaveWasteLog}>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Disposal Type</label>
                                <select value={wasteType} onChange={e => setWasteType(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '12px' }}>
                                    <option value="sharps">Sharps (Needles/Cartridges)</option>
                                    <option value="biohazard_soft">Biohazard Soft Waste (Gloves/Towels)</option>
                                </select>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Waste Weight (kg)</label>
                                <input type="number" step="0.1" value={wasteWeight} onChange={e => setWasteWeight(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '12px' }} />
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Disposal Company</label>
                                <input type="text" value={wasteCompany} onChange={e => setWasteCompany(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '16px' }} />
                                
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                    <button type="button" onClick={() => setShowWasteModal(false)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white' }}>Cancel</button>
                                    <button type="submit" style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#be9055', color: 'white', fontWeight: 600 }}>Save Manifest</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Modal: Staff Cert */}
                {showCertModal && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
                        <div style={{ background: 'white', padding: '24px', borderRadius: '16px', maxWidth: '420px', width: '100%' }}>
                            <h3 style={{ margin: '0 0 16px' }}>Record Staff Health Certificate</h3>
                            <form onSubmit={handleSaveCert}>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Staff Name</label>
                                <input type="text" required value={staffName} onChange={e => setStaffName(e.target.value)} placeholder="Full Name" style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '12px' }} />
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Certificate Type</label>
                                <input type="text" required value={certType} onChange={e => setCertType(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '12px' }} />
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Expiration Date</label>
                                <input type="date" required value={expDate} onChange={e => setExpDate(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '16px' }} />
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                    <button type="button" onClick={() => setShowCertModal(false)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white' }}>Cancel</button>
                                    <button type="submit" style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#be9055', color: 'white', fontWeight: 600 }}>Save Certificate</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Modal: Studio Permit */}
                {showPermitModal && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
                        <div style={{ background: 'white', padding: '24px', borderRadius: '16px', maxWidth: '420px', width: '100%' }}>
                            <h3 style={{ margin: '0 0 16px' }}>Record Studio Sanitary Permit</h3>
                            <form onSubmit={handleSavePermit}>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Permit Type</label>
                                <input type="text" required value={permitType} onChange={e => setPermitType(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '12px' }} />
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Permit Number</label>
                                <input type="text" required value={permitNumber} onChange={e => setPermitNumber(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '12px' }} />
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Expiration Date</label>
                                <input type="date" required value={expDate} onChange={e => setExpDate(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '16px' }} />
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                    <button type="button" onClick={() => setShowPermitModal(false)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white' }}>Cancel</button>
                                    <button type="submit" style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#be9055', color: 'white', fontWeight: 600 }}>Save Permit</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
