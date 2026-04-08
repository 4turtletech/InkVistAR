import React, { useState, useEffect } from 'react';
import Axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { Calendar, List, ChevronLeft, ChevronRight, Search, Filter, SlidersHorizontal, Plus, Check, X, User, Palette, Clock, CreditCard, DollarSign, Info, FileText, Image } from 'lucide-react';
import AdminSideNav from '../components/AdminSideNav';
import Pagination from '../components/Pagination';
import ConfirmModal from '../components/ConfirmModal';
import './AdminAppointments.css';
import './PortalStyles.css';
import { API_URL } from '../config';

function AdminAppointments() {
    const navigate = useNavigate();
    const location = useLocation();
    const [appointments, setAppointments] = useState([]);
    const [artists, setArtists] = useState([]);
    const [clients, setClients] = useState([]);

    const [filteredAppointments, setFilteredAppointments] = useState(appointments);
    const [viewMode, setViewMode] = useState('calendar'); // Defaults to calendar
    const [currentDate, setCurrentDate] = useState(new Date());
    const [searchTerm, setSearchTerm] = useState('');
    const [clientSearch, setClientSearch] = useState('');
    const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState('all');
    const [serviceFilter, setServiceFilter] = useState('all');
    const [quickFilter, setQuickFilter] = useState('all'); // 'upcoming', 'latest', 'all'
    const [dateFilter, setDateFilter] = useState('');
    const [sortBy, setSortBy] = useState('date');
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [modalTab, setModalTab] = useState('details'); // 'details', 'pricing', or 'notes'
    const [appointmentModal, setAppointmentModal] = useState({ mounted: false, visible: false });
    const [manualPaymentModal, setManualPaymentModal] = useState({ isOpen: false, amount: '', method: 'Cash' });
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null, type: 'danger', isAlert: false });
    const [formData, setFormData] = useState({
        clientId: '',
        artistId: '',
        serviceType: '',
        designTitle: '',
        date: '',
        time: '',
        status: 'confirmed',
        paymentStatus: 'unpaid',
        notes: '',
        price: 0,
        beforePhoto: null,
        manualPaidAmount: 0,
        manualPaymentMethod: 'Cash'
    });
    const [dayViewModal, setDayViewModal] = useState({ isOpen: false, date: '', appointments: [] });

    // Modal animation handlers
    const openModal = () => {
        setAppointmentModal({ mounted: true, visible: false });
        setTimeout(() => setAppointmentModal({ mounted: true, visible: true }), 10);
    };

    const closeModal = () => {
        setAppointmentModal(prev => ({ ...prev, visible: false }));
        setTimeout(() => {
            setAppointmentModal({ mounted: false, visible: false });
        }, 400);
    };

    useEffect(() => {
        fetchAppointments();
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await Axios.get(`${API_URL}/api/debug/users`);
            if (response.data.success) {
                setArtists(response.data.users.filter(u => u.user_type === 'artist'));
                setClients(response.data.users.filter(u => u.user_type === 'customer'));
            }
        } catch (error) {
            console.error("Error fetching users:", error);
        }
    };

    const fetchAppointments = async () => {
        try {
            setLoading(true);
            const response = await Axios.get(`${API_URL}/api/admin/appointments`);
            if (response.data.success) {
                const mappedAppointments = response.data.data.map(apt => {
                    let finalClientName = apt.client_name;
                    if (apt.customer_id === 1 && apt.notes?.includes('CLIENT CONTEXT')) {
                        const nameMatch = apt.notes.match(/Name:\s*([^\n]+)/);
                        if (nameMatch && nameMatch[1]) {
                            finalClientName = `${nameMatch[1].trim()} (Guest)`;
                        }
                    }
                    
                    return {
                        id: apt.id,
                        clientName: finalClientName,
                        clientId: apt.customer_id,
                        artistName: apt.artist_name,
                        artistId: apt.artist_id,
                        serviceType: apt.service_type || (apt.design_title?.includes(':') ? apt.design_title.split(':')[0] : (apt.notes?.toLowerCase().includes('consultation') ? 'Consultation' : 'Tattoo Session')),
                        designTitle: apt.design_title?.includes(':') ? apt.design_title.split(':')[1]?.trim() : apt.design_title,
                        date: apt.appointment_date ? (apt.appointment_date.includes('T') ? apt.appointment_date.split('T')[0] : apt.appointment_date.substring(0, 10)) : '',
                        time: apt.start_time,
                        status: apt.status,
                        paymentStatus: apt.payment_status,
                        notes: apt.notes,
                        beforePhoto: apt.before_photo,
                        afterPhoto: apt.after_photo,
                        price: apt.price || 0,
                        totalPaid: apt.total_paid || 0,
                        manualPaidAmount: apt.manual_paid_amount || 0,
                        manualPaymentMethod: apt.manual_payment_method || 'Cash'
                    };
                });
                setAppointments(mappedAppointments);
                setFilteredAppointments(mappedAppointments);
                setLoading(false);
                return mappedAppointments;
            }
            setLoading(false);
        } catch (error) {
            console.error("Error fetching appointments:", error);
            setLoading(false);
            return []; // Return empty on error
        }
    };

    const handleDayClick = (dateString) => {
        const dayAppts = appointments.filter(apt => {
            const aptDate = apt.date ? (apt.date.includes('T') ? apt.date.split('T')[0] : apt.date.substring(0, 10)) : '';
            return aptDate === dateString;
        });
        setDayViewModal({ isOpen: true, date: dateString, appointments: dayAppts });
    };

    useEffect(() => {
        filterAndSortAppointments();
    }, [appointments, searchTerm, statusFilter, serviceFilter, quickFilter, dateFilter, sortBy]);

    const filterAndSortAppointments = () => {
        let filtered = appointments.filter(apt => {
            const matchesSearch =
                (apt.clientName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (apt.artistName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (apt.serviceType || '').toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStatus = statusFilter === 'all' || apt.status === statusFilter;
            const matchesService = serviceFilter === 'all' || apt.serviceType === serviceFilter;
            const matchesDate = !dateFilter || apt.date === dateFilter;

            let matchesQuick = true;
            if (quickFilter === 'upcoming') {
                const today = new Date().toISOString().split('T')[0];
                matchesQuick = apt.date >= today && apt.status !== 'cancelled' && apt.status !== 'completed';
            }

            return matchesSearch && matchesStatus && matchesService && matchesDate && matchesQuick;
        });

        // Reset pagination on filter change
        setCurrentPage(1);

        // Sort
        if (quickFilter === 'latest') {
            filtered.sort((a, b) => b.id - a.id);
        } else if (sortBy === 'date') {
            filtered.sort((a, b) => new Date(a.date + ' ' + a.time) - new Date(b.date + ' ' + b.time));
        } else if (sortBy === 'client') {
            filtered.sort((a, b) => a.clientName.localeCompare(b.clientName));
        } else if (sortBy === 'artist') {
            filtered.sort((a, b) => a.artistName.localeCompare(b.artistName));
        } else if (sortBy === 'status') {
            filtered.sort((a, b) => a.status.localeCompare(b.status));
        }

        setFilteredAppointments(filtered);
    };

    // Calendar Helpers
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

    const changeMonth = (offset) => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
    };

    const getAppointmentsForDate = (day) => {
        return appointments.filter(a => {
            if (!a.date) return false;
            const [y, m, d] = a.date.split('-').map(Number);
            return d === day &&
                (m - 1) === currentDate.getMonth() &&
                y === currentDate.getFullYear();
        });
    };

    const showConfirm = (titleOrMessage, messageOrOnConfirm, maybeOnConfirm) => {
        let title, message, onConfirm;

        if (typeof messageOrOnConfirm === 'function') {
            // Case: showConfirm(message, onConfirm)
            title = 'Confirm Action';
            message = titleOrMessage;
            onConfirm = messageOrOnConfirm;
        } else {
            // Case: showConfirm(title, message, onConfirm)
            title = titleOrMessage;
            message = messageOrOnConfirm;
            onConfirm = maybeOnConfirm;
        }

        const confirmHandler = onConfirm || (() => setConfirmDialog(prev => ({ ...prev, isOpen: false })));
        setConfirmDialog({ 
            isOpen: true, 
            title: title || 'Confirm Action', 
            message, 
            onConfirm: confirmHandler, 
            type: 'info', 
            isAlert: !onConfirm 
        });
    };

    const showAlert = (title, message, type = 'info') => {
        setConfirmDialog({ isOpen: true, title, message, type, isAlert: true, onConfirm: () => setConfirmDialog(prev => ({ ...prev, isOpen: false })) });
    };

    const handleStatusUpdate = async (id, status, clientName = 'this client') => {
        const actionVerb = status === 'confirmed' ? 'confirm' : status === 'completed' ? 'complete' : 'cancel';
        
        showConfirm(
            `Confirm ${status.charAt(0).toUpperCase() + status.slice(1)}`,
            `Are you sure you want to ${actionVerb} this appointment for ${clientName}? A notification will be sent to them.`,
            async () => {
                try {
                    await Axios.put(`${API_URL}/api/appointments/${id}/status`, { status });
                    fetchAppointments();
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                } catch (error) {
                    console.error('Error updating status:', error);
                }
            }
        );
    };

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const appointmentId = params.get('appointment');
        if (appointmentId && appointments.length > 0) {
            const target = appointments.find(a => a.id.toString() === appointmentId);
            if (target) {
                handleEdit(target);
                window.history.replaceState({}, '', '/admin/appointments');
            }
        }
    }, [location.search, appointments]);

    const handleEdit = (appointment) => {
        setSelectedAppointment(appointment);
        setModalTab('details');
        setFormData({
            clientId: appointment.clientId || appointment.customer_id,
            artistId: appointment.artistId || appointment.artist_id,
            secondaryArtistId: appointment.secondary_artist_id || '',
            commissionSplit: appointment.commission_split || 50,
            serviceType: appointment.serviceType || appointment.service_type,
            designTitle: appointment.designTitle || appointment.design_title,
            date: appointment.date || appointment.appointment_date,
            time: appointment.time || appointment.start_time,
            status: appointment.status,
            paymentStatus: appointment.paymentStatus || appointment.payment_status,
            notes: appointment.notes,
            price: appointment.price,
            beforePhoto: appointment.beforePhoto,
            manualPaidAmount: appointment.manualPaidAmount || 0,
            manualPaymentMethod: appointment.manualPaymentMethod || 'Cash'
        });
        setClientSearch(appointment.clientName);
        openModal();
    };

    const handleDelete = (id) => {
        showConfirm('Are you sure you want to delete this appointment? This cannot be undone.', () => {
            setAppointments(appointments.filter(a => a.id !== id));
            Axios.delete(`${API_URL}/api/admin/appointments/${id}`)
                .then(() => fetchAppointments())
                .catch(err => console.error(err))
                .finally(() => setConfirmDialog(prev => ({ ...prev, isOpen: false })));
        });
    };

    const handleAddNew = (prefilledDate = null) => {
        setSelectedAppointment(null);
        setModalTab('details');
        setFormData({
            clientId: '',
            artistId: '',
            secondaryArtistId: '',
            commissionSplit: 50,
            serviceType: '',
            date: prefilledDate || new Date().toISOString().split('T')[0],
            time: '13:00',
            status: 'pending',
            paymentStatus: 'unpaid',
            notes: '',
            price: 0,
            beforePhoto: null,
            manualPaidAmount: 0,
            manualPaymentMethod: 'Cash'
        });
        setClientSearch('');
        openModal();
    };

    const handleSave = async () => {
        if (!formData.clientId || !formData.artistId || !formData.date || !formData.time) {
            showConfirm('Please fill in all required fields (Client, Artist, Date, Time).', null);
            return;
        }

        let priceInput = formData.price ? String(formData.price).replace(/[^0-9.]/g, '') : '0';
        let priceValue = parseFloat(priceInput);
        const finalPrice = (!priceValue || priceValue < 0) ? 0 : priceValue;

        const doSave = async () => {
            try {
                const payload = {
                    customerId: formData.clientId,
                    artistId: formData.artistId,
                    secondaryArtistId: formData.secondaryArtistId || null,
                    commissionSplit: formData.commissionSplit || 50,
                    serviceType: formData.serviceType,
                    designTitle: formData.designTitle,
                    date: formData.date,
                    startTime: formData.time,
                    status: formData.status,
                    paymentStatus: formData.paymentStatus,
                    notes: formData.notes,
                    price: finalPrice,
                    beforePhoto: formData.beforePhoto,
                    manualPaidAmount: parseFloat(formData.manualPaidAmount) || 0,
                    manualPaymentMethod: formData.manualPaymentMethod
                };

                if (selectedAppointment) {
                    await Axios.put(`${API_URL}/api/admin/appointments/${selectedAppointment.id}`, payload);
                } else {
                    await Axios.post(`${API_URL}/api/admin/appointments`, payload);
                }
                closeModal();
                fetchAppointments();
            } catch (error) {
                console.error('Error saving appointment:', error);
                const msg = error.response?.data?.message || 'Failed to save appointment. Please check if your data was filled correctly.';
                showAlert('Save Failed', msg, 'danger');
            } finally {
                setConfirmDialog(prev => ({ ...prev, isOpen: false }));
            }
        };

        showConfirm(
            selectedAppointment ? 'Save changes to this appointment?' : 'Create this new appointment?',
            doSave
        );
    };

    const handleApplyManualPayment = async () => {
        const remainingBalance = Math.max(0, formData.price - (selectedAppointment?.totalPaid || 0));
        const inputAmount = parseFloat(manualPaymentModal.amount);

        if (!inputAmount || inputAmount <= 0) return;

        if (inputAmount > remainingBalance) {
            showAlert('Invalid Amount', `Amount exceeds the remaining balance of ₱${remainingBalance.toLocaleString()}`, 'warning');
            return;
        }

        try {
            const res = await Axios.post(`${API_URL}/api/admin/appointments/${selectedAppointment.id}/manual-payment`, {
                amount: manualPaymentModal.amount,
                method: manualPaymentModal.method
            });
            if (res.data.success) {
                setManualPaymentModal({ ...manualPaymentModal, isOpen: false, amount: '' });
                // Refresh the list and update the locally selected appointment to show the new balance
                const newList = await fetchAppointments();
                const freshData = newList.find(a => a.id === selectedAppointment.id);
                if (freshData) setSelectedAppointment(freshData);
            }
        } catch (error) {
            showAlert("Payment Failed", error.response?.data?.message || "Failed to record payment", "danger");
        }
    };

    const handleMultiSession = () => {
        setFormData({ ...formData, notes: formData.notes + '\n[Multi-Session: Session 1 of X]' });
    };

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'scheduled': return 'scheduled';
            case 'confirmed': return 'scheduled'; // Map confirmed to scheduled color
            case 'completed': return 'completed';
            case 'pending': return 'pending';
            case 'cancelled': return 'cancelled';
            case 'rejected': return 'cancelled';
            default: return 'scheduled';
        }
    };

    const handleExport = () => {
        const headers = ['Appointment ID', 'Client Name', 'Artist', 'Service Type', 'Date', 'Time', 'Status', 'Price'];
        const csvContent = [
            headers.join(','),
            ...filteredAppointments.map(a =>
                `${a.id},"${a.clientName}","${a.artistName}","${a.serviceType}",${a.date},${a.time},${a.status},${a.price}`
            )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `appointments_export_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    const handlePrint = () => {
        window.print();
    };

    const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);
    const currentItems = filteredAppointments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="admin-page-with-sidenav">
            <AdminSideNav />
            <div className="admin-page page-container-enter">
                {/* Print Only Header */}
                <div className="print-only-header">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #000', paddingBottom: '10px', marginBottom: '20px' }}>
                        <div>
                            <h1 style={{ margin: 0, color: '#000' }}>InkVistAR Studio</h1>
                            <p style={{ margin: 0 }}>Appointments & Schedule Report</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ margin: 0 }}>Date: {new Date().toLocaleDateString()}</p>
                            <p style={{ margin: 0 }}>View: {viewMode.charAt(0).toUpperCase() + viewMode.slice(1)}</p>
                        </div>
                    </div>
                </div>
                <header className="admin-header" style={{ background: '#ffffff', borderBottom: '1px solid #e5e7eb', boxShadow: 'none', color: '#1f2937' }}>
                    <h1>Appointment Management</h1>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
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
                        <button className="btn btn-primary" onClick={handleAddNew}>
                            + New Appointment
                        </button>
                        <button className="btn btn-secondary" onClick={handleExport}>
                            Export CSV
                        </button>
                        <button className="btn btn-secondary" onClick={handlePrint}>
                            Print
                        </button>
                    </div>
                </header>

                {viewMode === 'calendar' ? (
                    <div className="data-card" style={{ margin: '2rem' }}>
                        <div className="calendar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <button onClick={() => changeMonth(-1)} className="action-btn" style={{ margin: 0 }}><ChevronLeft size={20} /></button>
                                <button onClick={() => setCurrentDate(new Date())} className="action-btn" style={{ margin: 0, padding: '0.4rem 1rem', background: 'transparent', border: '1px solid #e2e8f0', color: '#64748b' }}>Today</button>
                                <button onClick={() => changeMonth(1)} className="action-btn" style={{ margin: 0 }}><ChevronRight size={20} /></button>
                            </div>
                            <h2 style={{ margin: 0, border: 'none' }}>{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
                            <div style={{ width: '150px' }}></div>
                        </div>
                        <div className="calendar-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px' }}>
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                                <div key={d} style={{ fontWeight: 'bold', textAlign: 'center', padding: '10px', color: '#64748b' }}>{d}</div>
                            ))}
                            {[...Array(firstDayOfMonth)].map((_, i) => <div key={`empty-${i}`} style={{ background: '#f8fafc', borderRadius: '8px' }}></div>)}
                            {[...Array(daysInMonth)].map((_, i) => {
                                const day = i + 1;
                                const dayAppts = getAppointmentsForDate(day);
                                const isToday = new Date().getDate() === day && new Date().getMonth() === currentDate.getMonth() && new Date().getFullYear() === currentDate.getFullYear();

                                return (
                                    <div key={day} style={{
                                        border: isToday ? '2px solid #6366f1' : '1px solid #e2e8f0',
                                        minHeight: '100px',
                                        padding: '8px',
                                        borderRadius: '8px',
                                        backgroundColor: 'white',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                        className="calendar-day-cell"
                                        onClick={() => handleDayClick(`${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`)}>
                                        <div style={{ fontWeight: 'bold', marginBottom: '5px', color: isToday ? '#6366f1' : '#334155', display: 'flex', justifyContent: 'space-between' }}>
                                            <span>{day}</span>
                                            <Plus size={12} style={{ opacity: 0.5 }} />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: 'auto' }}>
                                            {dayAppts.length > 0 && (
                                                <div style={{
                                                    fontSize: '0.75rem',
                                                    padding: '4px',
                                                    borderRadius: '4px',
                                                    backgroundColor: '#e0e7ff',
                                                    color: '#3730a3',
                                                    textAlign: 'center',
                                                    fontWeight: '600'
                                                }}>
                                                    {dayAppts.length} {dayAppts.length === 1 ? 'Booking' : 'Bookings'}
                                                </div>
                                            )}
                                            {dayAppts.length > 0 && (
                                                <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                                    {dayAppts.slice(0, 5).map(apt => (
                                                        <div key={apt.id} style={{
                                                            width: '8px', 
                                                            height: '8px', 
                                                            borderRadius: '50%',
                                                            backgroundColor: apt.status === 'confirmed' ? '#10b981' : (apt.status === 'pending' ? '#f59e0b' : (apt.status === 'cancelled' || apt.status === 'rejected' ? '#94a3b8' : '#6366f1'))
                                                        }} title={apt.status} />
                                                    ))}
                                                    {dayAppts.length > 5 && <span style={{ fontSize: '10px', color: '#94a3b8', lineHeight: '8px' }}>+</span>}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="premium-filter-bar" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                                <div className="premium-search-box" style={{ flex: 1, minWidth: '300px' }}>
                                    <Search size={18} className="text-muted" />
                                    <input
                                        type="text"
                                        placeholder="Search appointments..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>

                                <div className="quick-filters" style={{
                                    display: 'flex',
                                    background: 'rgba(255,255,255,0.5)',
                                    padding: '4px',
                                    borderRadius: '12px',
                                    border: '1px solid #e2e8f0',
                                    gap: '4px'
                                }}>
                                    {[
                                        { id: 'all', label: 'All', icon: <Filter size={14} /> },
                                        { id: 'upcoming', label: 'Upcoming', icon: <Plus size={14} /> },
                                        { id: 'latest', label: 'Latest Added', icon: <Plus size={14} style={{ transform: 'rotate(45deg)' }} /> }
                                    ].map(filter => (
                                        <button
                                            key={filter.id}
                                            onClick={() => setQuickFilter(filter.id)}
                                            className={`badge ${quickFilter === filter.id ? 'status-confirmed' : ''}`}
                                            style={{
                                                border: 'none',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                padding: '8px 16px',
                                                background: quickFilter === filter.id ? '' : 'transparent',
                                                color: quickFilter === filter.id ? '' : '#64748b',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {filter.icon}
                                            {filter.label}
                                        </button>
                                    ))}
                                    {(searchTerm || quickFilter !== 'all' || statusFilter !== 'all' || serviceFilter !== 'all' || dateFilter) && (
                                        <button
                                            onClick={() => {
                                                setSearchTerm('');
                                                setQuickFilter('all');
                                                setStatusFilter('all');
                                                setServiceFilter('all');
                                                setDateFilter('');
                                            }}
                                            className="badge"
                                            style={{
                                                border: 'none',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                padding: '8px 16px',
                                                background: 'transparent',
                                                color: '#ef4444',
                                                transition: 'all 0.2s',
                                                fontWeight: '600'
                                            }}
                                        >
                                            <X size={14} />
                                            Clear Filters
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="premium-filters-group" style={{ justifyContent: 'flex-start', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.85rem', fontWeight: '600', marginRight: '0.5rem' }}>
                                    <Filter size={16} />
                                    <span>Refine:</span>
                                </div>

                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="premium-select-v2"
                                    style={{ minWidth: '140px' }}
                                >
                                    <option value="all">All Status</option>
                                    <option value="confirmed">Confirmed</option>
                                    <option value="scheduled">Scheduled</option>
                                    <option value="pending">Pending</option>
                                    <option value="completed">Completed</option>
                                    <option value="cancelled">Cancelled</option>
                                    <option value="rejected">Rejected</option>
                                </select>

                                <select
                                    value={serviceFilter}
                                    onChange={(e) => setServiceFilter(e.target.value)}
                                    className="premium-select-v2"
                                    style={{ minWidth: '160px' }}
                                >
                                    <option value="all">All Services</option>
                                    <option value="Tattoo Session">Tattoo Session</option>
                                    <option value="Consultation">Consultation</option>
                                    <option value="Piercing">Piercing</option>
                                    <option value="Follow-up">Follow-up</option>
                                    <option value="Touch-up">Touch-up</option>
                                </select>

                                <input
                                    type="date"
                                    value={dateFilter}
                                    onChange={(e) => setDateFilter(e.target.value)}
                                    className="premium-select-v2"
                                    style={{ paddingRight: '1rem', backgroundImage: 'none' }}
                                />

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.85rem', fontWeight: '600', marginLeft: '0.5rem' }}>
                                    <SlidersHorizontal size={16} />
                                    <span>Sort:</span>
                                </div>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="premium-select-v2"
                                >
                                    <option value="date">Date</option>
                                    <option value="client">Client</option>
                                    <option value="artist">Artist</option>
                                    <option value="status">Status</option>
                                </select>
                            </div>
                        </div>

                        <div className="stats-row">
                            <div className="stat-item">
                                <span className="stat-label">Total Appointments</span>
                                <span className="stat-count">{appointments.length}</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Scheduled</span>
                                <span className="stat-count">{appointments.filter(a => a.status === 'scheduled').length}</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Completed</span>
                                <span className="stat-count">{appointments.filter(a => a.status === 'completed').length}</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Pending</span>
                                <span className="stat-count">{appointments.filter(a => a.status === 'pending').length}</span>
                            </div>
                        </div>

                        <div className="table-card-container">
                            <div className="table-responsive">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Appointment ID</th>
                                            <th>Client Name</th>
                                            <th>Staff</th>
                                            <th>Service</th>
                                            <th>Date</th>
                                            <th>Time</th>
                                            <th>Status</th>
                                            <th>Payment</th>
                                            <th>Price</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr><td colSpan="10" className="no-data" style={{ textAlign: 'center', padding: '2rem' }}>Loading appointments...</td></tr>
                                        ) : currentItems.length > 0 ? (
                                            currentItems.map((appointment) => (
                                                <tr key={appointment.id}>
                                                    <td>#{appointment.id}</td>
                                                    <td>{appointment.clientName}</td>
                                                    <td>{appointment.artistName}</td>
                                                    <td style={{ maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={appointment.serviceType}>{appointment.serviceType}</td>
                                                    <td>{appointment.date}</td>
                                                    <td>{appointment.time}</td>
                                                    <td>
                                                        <span className={`badge status-${getStatusColor(appointment.status || 'pending')}`}>
                                                            {appointment.status}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        {appointment.paymentStatus === 'paid' ? (
                                                            <span className="badge status-confirmed" style={{ backgroundColor: '#ecfdf5', color: '#059669', border: '1px solid #10b981' }}>Fully Paid</span>
                                                        ) : appointment.paymentStatus === 'downpayment_paid' ? (
                                                            <span className="badge" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #3b82f6' }}>Downpayment</span>
                                                        ) : appointment.price > 0 ? (
                                                            appointment.totalPaid >= appointment.price ? (
                                                                <span className="badge status-confirmed" style={{ backgroundColor: '#ecfdf5', color: '#059669', border: '1px solid #10b981' }}>Fully Paid</span>
                                                            ) : appointment.totalPaid > 0 ? (
                                                                <span className="badge" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #3b82f6' }}>Balance: ₱{(appointment.price - appointment.totalPaid).toLocaleString()}</span>
                                                            ) : (
                                                                <span className="badge" style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #ef4444' }}>Unpaid</span>
                                                            )
                                                        ) : (
                                                            <span className="badge" style={{ backgroundColor: '#f9fafb', color: '#6b7280', border: '1px solid #e5e7eb' }}>No Charge</span>
                                                        )}
                                                    </td>
                                                    <td>₱{Number(appointment.price).toLocaleString()}</td>
                                                    <td className="actions-cell">
                                                        { appointment.status === 'pending' && (
                                                            <>
                                                                <button className="action-btn view-btn" style={{ backgroundColor: '#10b981', marginRight: '5px', padding: '4px 8px' }} onClick={() => handleStatusUpdate(appointment.id, 'confirmed', appointment.clientName)} title="Approve">
                                                                    <Check size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '2px' }} />
                                                                </button>
                                                                <button className="action-btn delete-btn" style={{ marginRight: '5px', padding: '4px 8px' }} onClick={() => handleStatusUpdate(appointment.id, 'cancelled', appointment.clientName)} title="Reject">
                                                                    <X size={14} style={{ display: 'inline', verticalAlign: 'middle' }} />
                                                                </button>
                                                            </>
                                                        )}
                                                        {appointment.status?.toLowerCase() === 'confirmed' && (
                                                            <button
                                                                className="action-btn view-btn"
                                                                style={{ backgroundColor: '#8b5cf6', marginRight: '5px', padding: '4px 8px' }}
                                                                onClick={() => handleStatusUpdate(appointment.id, 'completed', appointment.clientName)}
                                                                title="Mark as Done"
                                                            >
                                                                <Check size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '2px' }} />
                                                            </button>
                                                        )}
                                                        <button className="action-btn edit-btn" onClick={() => handleEdit(appointment)}>
                                                            Edit
                                                        </button>
                                                        <button className="action-btn delete-btn" onClick={() => handleDelete(appointment.id)}>
                                                            Delete
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="10" className="no-data">No appointments found</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={setCurrentPage}
                                itemsPerPage={itemsPerPage}
                                onItemsPerPageChange={(newVal) => {
                                    setItemsPerPage(newVal);
                                    setCurrentPage(1);
                                }}
                                totalItems={filteredAppointments.length}
                                unit="appointments"
                            />
                        </div>
                    </>
                )}

                {/* Main Appointment Modal */}
                {appointmentModal.mounted && (
                    <div className={`modal-overlay ${appointmentModal.visible ? 'open' : ''}`} onClick={closeModal}>
                        <div className="modal-content xl" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingRight: '40px' }}>
                                        <h2 style={{ margin: 0 }}>{selectedAppointment ? `Edit Appointment #${selectedAppointment.id}` : 'New Appointment'}</h2>
                                        <div className="modal-tabs">
                                            <button 
                                                className={`modal-tab-btn ${modalTab === 'details' ? 'active' : ''}`} 
                                                onClick={() => setModalTab('details')}
                                            >
                                                <Info size={16} /> Details
                                            </button>
                                            <button 
                                                className={`modal-tab-btn ${modalTab === 'pricing' ? 'active' : ''}`} 
                                                onClick={() => setModalTab('pricing')}
                                            >
                                                <DollarSign size={16} /> Pricing
                                            </button>
                                            <button 
                                                className={`modal-tab-btn ${modalTab === 'notes' ? 'active' : ''}`} 
                                                onClick={() => setModalTab('notes')}
                                            >
                                                <FileText size={16} /> Notes
                                            </button>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <span className={`badge status-${getStatusColor(formData.status)}`}>{formData.status}</span>
                                        {selectedAppointment && selectedAppointment.price > 0 && (
                                            <div className="badge" style={{ backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                                <span>Paid: ₱{selectedAppointment.totalPaid.toLocaleString()} / ₱{formData.price.toLocaleString()}</span>
                                                {selectedAppointment.totalPaid < formData.price && (
                                                    <span style={{ color: '#ef4444', fontWeight: 700 }}>(Bal: ₱{(formData.price - selectedAppointment.totalPaid).toLocaleString()})</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <button className="close-btn" onClick={closeModal}><X size={24}/></button>
                            </div>
                            <div className="modal-body">
                                {modalTab === 'details' && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                                        {/* Left Column: People & Service */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                            <div>
                                                <label className="premium-input-label">Client Information</label>
                                                {formData.clientId ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                            <div style={{ background: '#d1fae5', padding: '8px', borderRadius: '50%' }}>
                                                                <User size={18} color="#10b981" />
                                                            </div>
                                                            <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '1rem' }}>{clients.find(c => c.id == formData.clientId)?.name || clientSearch}</span>
                                                        </div>
                                                        <button type="button" onClick={() => { setFormData(prev => ({...prev, clientId: null})); setClientSearch(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                                                            <X size={20} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div style={{ position: 'relative' }}>
                                                        <div className="premium-search-box" style={{ maxWidth: '100%' }}>
                                                            <Search size={18} />
                                                            <input
                                                                type="text"
                                                                placeholder="Search for a client..."
                                                                value={clientSearch}
                                                                onChange={(e) => setClientSearch(e.target.value)}
                                                                onFocus={() => setClientDropdownOpen(true)}
                                                                onBlur={() => setTimeout(() => setClientDropdownOpen(false), 200)}
                                                            />
                                                        </div>
                                                        {(clientDropdownOpen || clientSearch) && (
                                                            <div className="glass-card" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, maxHeight: '200px', overflowY: 'auto', background: 'white', border: '1px solid #e2e8f0', marginTop: '4px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                                                                {clients.filter(c => c.name && c.name.toLowerCase().includes(clientSearch.toLowerCase())).map(c => (
                                                                    <div key={c.id} style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '12px' }} onClick={() => { setFormData({ ...formData, clientId: c.id }); setClientSearch(c.name); }}>
                                                                        <User size={16} color="#C19A6B" />
                                                                        <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{c.name}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            <div>
                                                <label className="premium-input-label">Staff Assignment</label>
                                                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                    <div className="premium-input-group">
                                                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Primary Artist *</label>
                                                        <select value={formData.artistId} onChange={(e) => setFormData({ ...formData, artistId: e.target.value })} className="premium-select-v2">
                                                            <option value="">Select Artist</option>
                                                            {artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="premium-input-group">
                                                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Secondary Artist</label>
                                                        <select value={formData.secondaryArtistId || ''} onChange={(e) => setFormData({ ...formData, secondaryArtistId: e.target.value })} className="premium-select-v2">
                                                            <option value="">None (Solo)</option>
                                                            {artists.filter(a => a.id != formData.artistId).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                                        </select>
                                                    </div>
                                                    {formData.secondaryArtistId && (
                                                        <div style={{ marginTop: '4px', background: '#f5f3ff', padding: '12px', borderRadius: '8px', border: '1px solid #ddd6fe', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#5b21b6', margin: 0 }}>Split % (Pri/Sec):</label>
                                                            <input type="number" min="1" max="99" value={formData.commissionSplit} onChange={(e) => setFormData({ ...formData, commissionSplit: parseInt(e.target.value) })} className="premium-input-v2" style={{ width: '70px', padding: '8px' }} />
                                                            <span style={{ color: '#6d28d9', fontWeight: 700 }}>/ {100 - (formData.commissionSplit || 0)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div>
                                                <label className="premium-input-label">Service Details</label>
                                                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                    <div className="premium-input-group">
                                                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Service Type *</label>
                                                        <select value={formData.serviceType} onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })} className="premium-select-v2">
                                                            <option value="Tattoo Session">Tattoo Session</option>
                                                            <option value="Consultation">Consultation</option>
                                                            <option value="Piercing">Piercing</option>
                                                            <option value="Touch-up">Touch-up</option>
                                                        </select>
                                                    </div>
                                                    <div className="premium-input-group">
                                                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Design / Idea</label>
                                                        <input type="text" value={formData.designTitle} onChange={(e) => setFormData({ ...formData, designTitle: e.target.value })} className="premium-input-v2" placeholder="e.g. Neo-Trad" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right Column: Schedule & Status */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                            <div>
                                                <label className="premium-input-label">Schedule & Status</label>
                                                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                                        <div className="premium-input-group">
                                                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Date *</label>
                                                            <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="premium-input-v2" />
                                                        </div>
                                                        <div className="premium-input-group">
                                                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Time *</label>
                                                            <input type="time" value={formData.time} onChange={(e) => setFormData({ ...formData, time: e.target.value })} className="premium-input-v2" />
                                                        </div>
                                                    </div>
                                                    <div className="premium-input-group">
                                                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Booking Status</label>
                                                        <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="premium-select-v2">
                                                            <option value="pending">Pending Review</option>
                                                            <option value="confirmed">Confirmed</option>
                                                            <option value="completed">Completed</option>
                                                            <option value="cancelled">Cancelled</option>
                                                            <option value="rejected">Rejected</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                 {modalTab === 'pricing' && (
                                    /* Pricing Tab View */
                                    <div className="fade-in" style={{ padding: '0 40px' }}>
                                        <div style={{ background: '#f8fafc', borderRadius: '24px', padding: '40px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '30px', maxWidth: '700px', margin: '0 auto' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                                                <div className="form-group">
                                                    <label style={{ fontWeight: 700, color: '#1e293b' }}>Total Quote (₱) *</label>
                                                    <input type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })} className="premium-input-v2" style={{ fontSize: '1.5rem', fontWeight: 800, padding: '15px' }} />
                                                </div>
                                                <div className="form-group">
                                                    <label style={{ fontWeight: 700, color: '#1e293b' }}>Payment Strategy</label>
                                                    <select value={formData.paymentStatus} onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })} className="premium-select-v2" style={{ height: '62px' }}>
                                                        <option value="unpaid">Draft (Unquoted)</option>
                                                        <option value="downpayment_paid">Downpayment Collected</option>
                                                        <option value="paid">Fully Paid</option>
                                                    </select>
                                                </div>
                                            </div>

                                            {selectedAppointment && (
                                                <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '20px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                                                        <span style={{ color: '#64748b', fontWeight: 600 }}>Total Collected:</span>
                                                        <span style={{ fontWeight: 800, color: '#10b981', fontSize: '1.2rem' }}>₱{selectedAppointment.totalPaid.toLocaleString()}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <span style={{ color: '#64748b', fontWeight: 600 }}>Remaining Balance:</span>
                                                        <span style={{ fontWeight: 800, color: '#ef4444', fontSize: '1.2rem' }}>₱{Math.max(0, formData.price - selectedAppointment.totalPaid).toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            )}

                                            <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                                                <button className="btn" style={{ flex: 1, padding: '15px', background: '#fff', border: '2px solid #e2e8f0', borderRadius: '12px', fontWeight: 700 }} onClick={() => setModalTab('details')}>Back to Details</button>
                                                {selectedAppointment && (
                                                    <button className="btn btn-primary" style={{ flex: 1.5, padding: '15px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }} onClick={() => setManualPaymentModal({ isOpen: true, amount: Math.max(0, formData.price - selectedAppointment.totalPaid), method: 'Cash' })}>
                                                        <CreditCard size={20} /> Record Manual Payment
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {modalTab === 'notes' && (
                                    /* Notes Tab View */
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                                        {/* Left Column: Session Summary & Notes */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                            <div>
                                                <label style={{ fontWeight: 700, fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '10px', display: 'block' }}>Session Details Summary</label>
                                                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Service Type:</span>
                                                        <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '1rem' }}>{formData.serviceType}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Design Idea:</span>
                                                        <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '1rem' }}>{formData.designTitle || 'N/A'}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Scheduled For:</span>
                                                        <span style={{ fontWeight: 700, color: '#6366f1', fontSize: '1rem' }}>{formData.date} at {formData.time}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <label style={{ fontWeight: 700, fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '10px', display: 'block' }}>Internal Session Notes</label>
                                                <textarea 
                                                    value={formData.notes} 
                                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })} 
                                                    className="premium-select-v2" 
                                                    style={{ width: '100%', height: '250px', minHeight: '200px', padding: '12px 16px', fontSize: '1rem', lineHeight: '1.6', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', resize: 'vertical' }} 
                                                    placeholder="Add detailed internal notes, placement instructions, or specific client requests..." 
                                                />
                                            </div>
                                        </div>

                                        {/* Right Column: Reference Assets */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                            <div>
                                                <label style={{ fontWeight: 700, fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '10px', display: 'block' }}>Reference Assets</label>
                                                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center', minHeight: '420px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                                                    {(formData.beforePhoto || selectedAppointment?.beforePhoto) ? (
                                                        <div style={{ width: '100%' }}>
                                                            <img 
                                                                src={formData.beforePhoto || selectedAppointment?.beforePhoto} 
                                                                alt="Reference" 
                                                                style={{ maxWidth: '100%', maxHeight: '380px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} 
                                                            />
                                                            <p style={{ marginTop: '12px', color: '#64748b', fontSize: '0.85rem' }}>Reference Image provided by client</p>
                                                        </div>
                                                    ) : (
                                                        <div style={{ color: '#94a3b8' }}>
                                                            <Image size={48} style={{ marginBottom: '15px', opacity: 0.5 }} />
                                                            <p>No reference image uploaded</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer" style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '30px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                    <div>
                                        {selectedAppointment && (
                                            <button 
                                                className="btn btn-danger" 
                                                onClick={() => {
                                                    handleDelete(selectedAppointment.id);
                                                    closeModal();
                                                }} 
                                                style={{ 
                                                    padding: '12px 24px',
                                                    backgroundColor: '#ef4444',
                                                    color: 'white',
                                                    borderRadius: '8px',
                                                    border: 'none',
                                                    fontWeight: '600',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px'
                                                }}
                                                onMouseEnter={(e) => e.target.style.backgroundColor = '#dc2626'}
                                                onMouseLeave={(e) => e.target.style.backgroundColor = '#ef4444'}
                                            >
                                                <X size={16} /> Delete Appointment
                                            </button>
                                        )}
                                    </div>
                                    <button className="btn btn-primary" onClick={handleSave} style={{ padding: '12px 36px', minWidth: '160px' }}>
                                        {selectedAppointment ? 'Update Appointment' : 'Create Appointment'}
                                    </button>
                                </div>
                                <button 
                                    className="btn btn-secondary" 
                                    onClick={closeModal} 
                                    style={{ 
                                        width: '100%', 
                                        padding: '14px', 
                                        borderRadius: '12px',
                                        backgroundColor: '#f1f5f9',
                                        color: '#64748b',
                                        border: '1px solid #e2e8f0',
                                        fontWeight: '700',
                                        fontSize: '0.95rem',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = '#e2e8f0'}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = '#f1f5f9'}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Manual Payment Modal */}
                {manualPaymentModal.isOpen && (
                    <div className="modal-overlay" style={{ zIndex: 3000 }}>
                        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2>Record Payment</h2>
                                <button className="close-btn" onClick={() => setManualPaymentModal({ ...manualPaymentModal, isOpen: false })}><X size={24}/></button>
                            </div>
                            <div className="modal-body">
                                <div className="form-group" style={{ marginBottom: '20px' }}>
                                    <label style={{ fontWeight: 700, fontSize: '0.9rem', color: '#475569', marginBottom: '8px', display: 'block' }}>Payment Amount (₱)</label>
                                    <input 
                                        type="number" 
                                        className="form-input" 
                                        style={{ fontSize: '1.2rem', fontWeight: 800 }}
                                        value={manualPaymentModal.amount} 
                                        onChange={(e) => setManualPaymentModal({ ...manualPaymentModal, amount: e.target.value })} 
                                    />
                                </div>
                                <div className="form-group">
                                    <label style={{ fontWeight: 700, fontSize: '0.9rem', color: '#475569', marginBottom: '8px', display: 'block' }}>Payment Method</label>
                                    <select 
                                        className="form-input"
                                        value={manualPaymentModal.method} 
                                        onChange={(e) => setManualPaymentModal({ ...manualPaymentModal, method: e.target.value })}
                                    >
                                        <option value="Cash">Cash</option>
                                        <option value="GCash">GCash</option>
                                        <option value="Bank Transfer">Bank Transfer</option>
                                        <option value="Card">Card</option>
                                    </select>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => setManualPaymentModal({ ...manualPaymentModal, isOpen: false })}>Cancel</button>
                                <button className="btn btn-primary" onClick={handleApplyManualPayment}>Record Payment</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Day View Modal */}
                {dayViewModal.isOpen && (
                    <div className="modal-overlay" style={{ zIndex: 2000 }} onClick={() => setDayViewModal({ ...dayViewModal, isOpen: false })}>
                        <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2>{dayViewModal.date}</h2>
                                <button className="close-btn" onClick={() => setDayViewModal({ ...dayViewModal, isOpen: false })}><X size={24}/></button>
                            </div>
                            <div className="modal-body">
                                <h4 style={{ marginBottom: '20px', color: '#64748b' }}>Appointments for this day:</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {dayViewModal.appointments.map(apt => (
                                        <div 
                                            key={apt.id} 
                                            className="glass-card" 
                                            style={{ 
                                                padding: '16px', 
                                                cursor: 'pointer', 
                                                display: 'flex', 
                                                justifyContent: 'space-between', 
                                                alignItems: 'center',
                                                border: '1px solid #e2e8f0',
                                                transition: 'all 0.2s'
                                            }}
                                            onClick={() => {
                                                setDayViewModal({ ...dayViewModal, isOpen: false });
                                                handleEdit(apt);
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.borderColor = '#6366f1'}
                                            onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                                        >
                                            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                                <div style={{ padding: '8px 12px', background: '#f1f5f9', borderRadius: '8px', fontWeight: 700, color: '#6366f1', fontSize: '0.9rem' }}>{apt.start_time}</div>
                                                <div>
                                                    <div style={{ fontWeight: 700, color: '#1e293b' }}>{apt.clientName}</div>
                                                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{apt.service_type || 'Tattoo Session'}</div>
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <span className={`badge status-${getStatusColor(apt.status)}`} style={{ fontSize: '0.75rem' }}>{apt.status}</span>
                                                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>Artist: {apt.artist_name}</div>
                                            </div>
                                        </div>
                                    ))}
                                    {dayViewModal.appointments.length === 0 && (
                                        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>No appointments scheduled for this day.</div>
                                    )}
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => setDayViewModal({ ...dayViewModal, isOpen: false })}>Close</button>
                                <button className="btn btn-primary" onClick={() => {
                                    setDayViewModal({ ...dayViewModal, isOpen: false });
                                    handleAddNew();
                                    setFormData(prev => ({ ...prev, date: dayViewModal.date }));
                                }}>
                                    <Plus size={18} /> Add Appointment
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Confirmation Modal */}
            <ConfirmModal
                {...confirmDialog}
                onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
            />
        </div>
    );
}

export default AdminAppointments;
