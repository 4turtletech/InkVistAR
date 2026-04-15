import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Axios from 'axios';
import { Check, X, Calendar, List, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import ArtistSideNav from '../components/ArtistSideNav';
import ConfirmModal from '../components/ConfirmModal';
import Pagination from '../components/Pagination';
import './PortalStyles.css';
import './ArtistStyles.css';
import { API_URL } from '../config';

function ArtistAppointments(){
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('upcoming');
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
    const [currentDate, setCurrentDate] = useState(new Date());
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [confirmModal, setConfirmModal] = useState({ visible: false, title: '', message: '', onConfirm: null });
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    
    
    const [user] = useState(() => {
        const saved = localStorage.getItem('user');
        return saved ? JSON.parse(saved) : null;
    });
    const artistId = user ? user.id : 1;

    useEffect(() => {
        fetch();
    }, [artistId]);

    const fetch = async () => {
        try {
            setLoading(true);
            const res = await Axios.get(`${API_URL}/api/artist/${artistId}/appointments`);
            if (res.data.success) setAppointments(res.data.appointments || []);
            setLoading(false);
        } catch (e) {
            console.error(e);
            setLoading(false);
        }
    };

    const filteredAppointments = appointments.filter(apt => {
        if (activeTab === 'pending') return apt.status === 'pending';
        if (activeTab === 'upcoming') return ['confirmed', 'scheduled'].includes(apt.status);
        if (activeTab === 'history') return ['completed', 'cancelled', 'incomplete'].includes(apt.status);
        return true;
    });

    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab]);

    // Deep-link: auto-open appointment from notification
    const location = useLocation();
    useEffect(() => {
        if (location.state?.openAppointmentId && appointments.length > 0) {
            const targetId = parseInt(location.state.openAppointmentId);
            const target = appointments.find(a => a.id === targetId);
            if (target) {
                setSelectedAppointment(target);
                // Switch to the correct tab
                if (target.status === 'pending') setActiveTab('pending');
                else if (['completed', 'cancelled', 'incomplete'].includes(target.status)) setActiveTab('history');
                else setActiveTab('upcoming');
            }
            // Clear state to prevent re-opening on re-render
            window.history.replaceState({}, '', location.pathname);
        }
    }, [appointments, location.state]);

    const escapeCsv = (str) => {
        if (str === null || str === undefined) return '""';
        const stringified = String(str);
        if (stringified.includes('"') || stringified.includes(',')) {
            return `"${stringified.replace(/"/g, '""')}"`;
        }
        return `"${stringified}"`;
    };

    const handleExport = () => {
        const headers = ['Client', 'Service', 'Date', 'Time', 'Status'];
        const csvContent = [
            headers.join(','),
            ...filteredAppointments.map(a => 
                `${escapeCsv(a.client_name)},${escapeCsv(a.design_title)},${escapeCsv(new Date(a.appointment_date).toLocaleDateString())},${escapeCsv(a.start_time)},${escapeCsv(a.status)}`
            )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `artist_appointments_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        const printData = filteredAppointments.map(a => 
            `<tr>
                <td>${a.client_name || 'N/A'}</td>
                <td>${a.design_title || 'N/A'}</td>
                <td>${a.appointment_date ? new Date(a.appointment_date).toLocaleDateString() : 'N/A'}</td>
                <td>${a.start_time || 'N/A'}</td>
                <td>${(a.status || '').toUpperCase()}</td>
            </tr>`
        ).join('');

        printWindow.document.write(`
            <html>
                <head>
                    <title>Print Appointments - Artist</title>
                    <style>
                        body { font-family: sans-serif; padding: 20px; color: #333; }
                        h1 { color: #1e293b; text-align: center; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 14px; }
                        th { background-color: #f1f5f9; color: #475569; }
                    </style>
                </head>
                <body>
                    <h1>Artist Schedule: ${activeTab.toUpperCase()}</h1>
                    <p style="text-align:center;">Generated on ${new Date().toLocaleString()}</p>
                    <table>
                        <thead>
                            <tr>
                                <th>Client Name</th>
                                <th>Service/Project</th>
                                <th>Date</th>
                                <th>Time</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${printData}
                        </tbody>
                    </table>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);
    };

    const handleAccept = async (id) => {
        try {
            const res = await Axios.put(`${API_URL}/api/artist/appointments/${id}/accept`);
            if (res.data.success) {
                fetch();
                alert('Appointment accepted successfully!');
            }
        } catch (e) { console.error(e); }
    };

    const handleReject = async (id) => {
        try {
            const res = await Axios.put(`${API_URL}/api/artist/appointments/${id}/reject`);
            if (res.data.success) {
                fetch();
                alert('Appointment rejected. It has been reverted back to the Admin.');
            }
        } catch (e) { console.error(e); }
    };

    const compressImage = (file, maxWidth = 1200, quality = 0.7) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const reader = new FileReader();
            reader.onload = (e) => {
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', quality));
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const handleUploadDraft = async (e, id) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const compressedBase64 = await compressImage(file);
            const res = await Axios.put(`${API_URL}/api/artist/appointments/${id}/draft`, { draft_image: compressedBase64 });
            if (res.data.success) {
                setSelectedAppointment(prev => ({ ...prev, draft_image: compressedBase64 }));
                fetch(); // update list implicitly
                alert('Draft image successfully attached to this session!');
            }
        } catch (err) {
            console.error('Draft upload error:', err);
            const msg = err.response?.data?.message || err.message || 'Unknown error';
            alert(`Error uploading draft: ${msg}`);
        }
    };

    const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);
    const currentItems = filteredAppointments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Calendar Helpers
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

    const changeMonth = (offset) => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
    };

    const getAppointmentsForDate = (day) => {
        return appointments.filter(a => {
            const apptDate = new Date(a.appointment_date);
            return apptDate.getDate() === day &&
                   apptDate.getMonth() === currentDate.getMonth() &&
                   apptDate.getFullYear() === currentDate.getFullYear() &&
                   a.status !== 'cancelled';
        });
    };

    return (
        <div className="portal-layout">
            <ArtistSideNav />
            <div className="portal-container artist-portal">
                <header className="portal-header">
                    <h1>Schedule Management</h1>
                    <button className="btn btn-secondary" onClick={() => alert("Block date feature coming soon")}>
                        Block Date
                    </button>
                    <button className="btn btn-secondary" onClick={handleExport}>
                        Export CSV
                    </button>
                    <button className="btn btn-secondary" onClick={handlePrint}>
                        Print
                    </button>
                    <div className="view-toggle" style={{ display: 'flex', gap: '10px' }}>
                        <button 
                            className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setViewMode('list')}
                            style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '0.5rem 1rem' }}
                        >
                            <List size={16} /> List
                        </button>
                        <button 
                            className={`btn ${viewMode === 'calendar' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setViewMode('calendar')}
                            style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '0.5rem 1rem' }}
                        >
                            <Calendar size={16} /> Calendar
                        </button>
                    </div>
                </header>
                
                <div className="portal-content">
                    {loading ? <div className="no-data">Loading...</div> : (
                        <>
                            {viewMode === 'calendar' ? (
                                <div className="data-card">
                                    <div className="artist-calendar-header">
                                        <div className="artist-calendar-nav">
                                            <button onClick={() => changeMonth(-1)} className="artist-calendar-nav-btn"><ChevronLeft size={20}/></button>
                                            <button onClick={() => setCurrentDate(new Date())} className="artist-calendar-nav-btn">Today</button>
                                            <button onClick={() => changeMonth(1)} className="artist-calendar-nav-btn"><ChevronRight size={20}/></button>
                                        </div>
                                        <h2 style={{margin:0, border: 'none'}}>{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
                                        <div style={{ width: '150px' }}></div>
                                    </div>
                                    <div className="artist-calendar-grid">
                                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                                            <div key={d} className="artist-calendar-day-header">{d}</div>
                                        ))}
                                        {[...Array(firstDayOfMonth)].map((_, i) => <div key={`empty-${i}`} className="artist-calendar-cell-empty"></div>)}
                                        {[...Array(daysInMonth)].map((_, i) => {
                                            const day = i + 1;
                                            const dayAppts = getAppointmentsForDate(day);
                                            const isToday = new Date().getDate() === day && new Date().getMonth() === currentDate.getMonth() && new Date().getFullYear() === currentDate.getFullYear();
                                            
                                            return (
                                                <div key={day} className={`artist-calendar-cell ${isToday ? 'today' : ''}`}>
                                                    <div className="artist-calendar-date-number">{day}</div>
                                                    {dayAppts.map(apt => (
                                                        <div key={apt.id} 
                                                             className={`artist-calendar-event ${apt.status === 'confirmed' ? 'confirmed' : (apt.status === 'pending' ? 'pending' : 'other')}`}
                                                             title={`${apt.start_time || 'N/A'} - ${apt.client_name}`}
                                                             onClick={() => setSelectedAppointment(apt)}
                                                        >
                                                            {(apt.start_time || '').slice(0,5)} {apt.client_name}
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="settings-tabs" style={{ marginBottom: '20px' }}>
                                        <button className={`tab-button ${activeTab === 'upcoming' ? 'active' : ''}`} onClick={() => setActiveTab('upcoming')}>Upcoming</button>
                                        <button className={`tab-button ${activeTab === 'pending' ? 'active' : ''}`} onClick={() => setActiveTab('pending')}>Pending Requests</button>
                                        <button className={`tab-button ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>History</button>
                                    </div>

                                    <div className="table-card-container" style={{ minHeight: '600px' }}>
                                        {currentItems.length ? (
                                            <>
                                                <div className="table-responsive">
                                                    <table className="portal-table">
                                                        <thead><tr><th>Client</th><th>Service</th><th>Date</th><th>Time</th><th>Price</th><th>Status</th><th>Payment</th>{activeTab === 'pending' && <th>Actions</th>}</tr></thead>
                                                        <tbody>{currentItems.map(a => (
                                                            <tr key={a.id} onClick={() => setSelectedAppointment(a)} style={{ cursor: 'pointer' }} className="clickable-row hover-bg">
                                                                <td style={{ fontWeight: '600' }}>{a.client_name}</td>
                                                                <td>{a.design_title}</td>
                                                                <td>{new Date(a.appointment_date).toLocaleDateString()}</td>
                                                                <td>{a.start_time || 'N/A'}</td>
                                                                <td style={{ fontWeight: 'bold' }}>₱{parseFloat(a.price || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                                <td><span className={`status-badge ${a.status}`}>{a.status}</span></td>
                                                                <td>
                                                                    <span className={`status-badge ${a.payment_status === 'paid' ? 'completed' : a.payment_status === 'pending' ? 'pending' : 'cancelled'}`} style={{ backgroundColor: a.payment_status === 'paid' ? '#dcfce7' : a.payment_status === 'pending' ? '#fef3c7' : '#f3f4f6', color: a.payment_status === 'paid' ? '#16a34a' : a.payment_status === 'pending' ? '#b45309' : '#64748b' }}>
                                                                        {a.payment_status ? a.payment_status.charAt(0).toUpperCase() + a.payment_status.slice(1) : 'Unpaid'}
                                                                    </span>
                                                                </td>
                                                                {activeTab === 'pending' && (
                                                                    <td>
                                                                        <div className="artist-action-group">
                                                                            <button onClick={(e) => { e.stopPropagation(); setConfirmModal({ visible: true, title: 'Confirm Availability', message: 'Ready to take on this assignment? Confirming will notify the manager to generate a quote for the client.', onConfirm: () => handleAccept(a.id) }); }} className="artist-btn-accept">Confirm</button>
                                                                            <button onClick={(e) => { e.stopPropagation(); setConfirmModal({ visible: true, title: 'Decline Assignment', message: 'Are you sure you want to decline this assignment? It will be reverted back to the Admin for reassignment.', onConfirm: () => handleReject(a.id) }); }} className="artist-btn-decline">Decline</button>
                                                                        </div>
                                                                    </td>
                                                                )}
                                                            </tr>
                                                        ))}</tbody>
                                                    </table>
                                                </div>
                                                <Pagination 
                                                    currentPage={currentPage}
                                                    totalPages={totalPages}
                                                    onPageChange={setCurrentPage}
                                                    itemsPerPage={itemsPerPage}
                                                    onItemsPerPageChange={setItemsPerPage}
                                                    totalItems={filteredAppointments.length}
                                                    unit="appointments"
                                                />
                                            </>
                                        ) : (
                                            <div className="no-data-container">
                                                <Inbox size={48} className="no-data-icon" />
                                                <p className="no-data-text">No appointments in this category</p>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <ConfirmModal 
                                        isOpen={confirmModal.visible}
                                        title={confirmModal.title}
                                        message={confirmModal.message}
                                        onConfirm={() => { confirmModal.onConfirm(); setConfirmModal({ ...confirmModal, visible: false }); }}
                                        onClose={() => setConfirmModal({ ...confirmModal, visible: false })}
                                    />
                                    
                                    {selectedAppointment && (
                                        <div className="modal-overlay" onClick={() => setSelectedAppointment(null)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' }}>
                                            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '90%', maxWidth: '600px', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
                                                <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <h3 style={{ margin: 0, color: '#1e293b' }}>Appointment Details</h3>
                                                    <button onClick={() => setSelectedAppointment(null)} className="close-btn" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
                                                </div>
                                                <div className="artist-modal-body-scroll" style={{ padding: '20px', maxHeight: '70vh', overflowY: 'auto' }}>
                                                    <div className="artist-flex-between" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                                                        <div>
                                                            <p style={{ margin: '0 0 5px 0', fontSize: '0.85rem', color: '#64748b' }}>Client</p>
                                                            <p style={{ margin: 0, fontWeight: '600', fontSize: '1.1rem', color: '#0f172a' }}>{selectedAppointment.client_name}</p>
                                                        </div>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <p style={{ margin: '0 0 5px 0', fontSize: '0.85rem', color: '#64748b' }}>Date & Time</p>
                                                            <p style={{ margin: 0, fontWeight: '600', color: '#0f172a' }}>{new Date(selectedAppointment.appointment_date).toLocaleDateString()} at {selectedAppointment.start_time || 'N/A'}</p>
                                                        </div>
                                                    </div>
                                                    
                                                    <div style={{ margin: '20px 0', padding: '15px', background: '#f8fafc', borderRadius: '12px' }}>
                                                        <p style={{ margin: '0 0 5px 0', fontSize: '0.85rem', color: '#64748b' }}>Service Requested</p>
                                                        <p style={{ margin: 0, fontWeight: '600', color: '#0f172a' }}>{selectedAppointment.design_title || 'Tattoo Session'}</p>
                                                        
                                                        <div style={{ display: 'flex', gap: '30px', marginTop: '15px' }}>
                                                            <div>
                                                                <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>Status</span>
                                                                <span className={`status-badge ${selectedAppointment.status}`}>{selectedAppointment.status}</span>
                                                            </div>
                                                            <div>
                                                                <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>Price</span>
                                                                <span style={{ fontWeight: 'bold', color: '#0f172a' }}>₱{parseFloat(selectedAppointment.price || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                            </div>
                                                            <div>
                                                                <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>Payment</span>
                                                                <span className={`status-badge ${selectedAppointment.payment_status === 'paid' ? 'completed' : selectedAppointment.payment_status === 'pending' ? 'pending' : 'cancelled'}`} style={{ backgroundColor: selectedAppointment.payment_status === 'paid' ? '#dcfce7' : selectedAppointment.payment_status === 'pending' ? '#fef3c7' : '#f3f4f6', color: selectedAppointment.payment_status === 'paid' ? '#16a34a' : selectedAppointment.payment_status === 'pending' ? '#b45309' : '#64748b' }}>
                                                                    {selectedAppointment.payment_status ? selectedAppointment.payment_status.charAt(0).toUpperCase() + selectedAppointment.payment_status.slice(1) : 'Unpaid'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {selectedAppointment.notes && (
                                                        <div style={{ marginBottom: '20px' }}>
                                                            <p style={{ margin: '0 0 5px 0', fontSize: '0.85rem', color: '#64748b' }}>Notes & Description</p>
                                                            <div style={{ background: '#f1f5f9', padding: '12px', borderRadius: '8px', fontSize: '0.95rem', lineHeight: '1.5', color: '#334155' }}>
                                                                {selectedAppointment.notes}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {selectedAppointment.reference_image && (
                                                        <div style={{ marginBottom: '20px' }}>
                                                            <p style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#64748b' }}>Reference Image</p>
                                                            <img 
                                                                src={selectedAppointment.reference_image.startsWith('data:') ? selectedAppointment.reference_image : selectedAppointment.reference_image.startsWith('http') ? selectedAppointment.reference_image : `${API_URL}${selectedAppointment.reference_image}`} 
                                                                alt="Reference" 
                                                                style={{ width: '100%', maxHeight: '300px', objectFit: 'contain', borderRadius: '8px', background: '#f1f5f9', border: '1px solid #e2e8f0' }} 
                                                            />
                                                        </div>
                                                    )}

                                                    {/* Draft Design Section */}
                                                    <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 'bold' }}>Artist Draft Design</p>
                                                            <label className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem', cursor: 'pointer', borderRadius: '6px', margin: 0 }}>
                                                                {selectedAppointment.draft_image ? 'Update Draft' : 'Upload Draft'}
                                                                <input 
                                                                    type="file" 
                                                                    accept="image/*" 
                                                                    style={{ display: 'none' }} 
                                                                    onChange={(e) => handleUploadDraft(e, selectedAppointment.id)} 
                                                                />
                                                            </label>
                                                        </div>
                                                        {selectedAppointment.draft_image ? (
                                                            <img 
                                                                src={selectedAppointment.draft_image} 
                                                                alt="Draft Design" 
                                                                style={{ width: '100%', maxHeight: '300px', objectFit: 'contain', borderRadius: '8px', border: '1px dashed #cbd5e1', background: '#fff' }} 
                                                            />
                                                        ) : (
                                                            <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '0.9rem', border: '1px dashed #cbd5e1', borderRadius: '8px', background: '#fff' }}>
                                                                No draft uploaded yet. Attach your design mockups here.
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div style={{ padding: '15px 20px', borderTop: '1px solid #e2e8f0', textAlign: 'right', background: '#f8fafc', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                                    {selectedAppointment.status === 'pending' && (
                                                        <>
                                                            <button onClick={() => { setConfirmModal({ visible: true, title: 'Decline Assignment', message: 'Are you sure you want to decline this assignment? It will be reverted back to the Admin for reassignment.', onConfirm: () => { handleReject(selectedAppointment.id); setSelectedAppointment(null); } }); }} className="btn btn-secondary" style={{ padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', color: '#ef4444', border: '1px solid #ef4444', backgroundColor: '#fef2f2' }}>Decline</button>
                                                            <button onClick={() => { setConfirmModal({ visible: true, title: 'Confirm Availability', message: 'Ready to take on this assignment? Confirming will notify the manager to generate a quote for the client.', onConfirm: () => { handleAccept(selectedAppointment.id); setSelectedAppointment(null); } }); }} className="btn btn-primary" style={{ padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', backgroundColor: '#10b981', color: 'white', border: 'none' }}>Confirm Availability</button>
                                                        </>
                                                    )}
                                                    <button onClick={() => setSelectedAppointment(null)} className="btn btn-secondary" style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontWeight: '500', color: '#334155' }}>Close</button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ArtistAppointments;
