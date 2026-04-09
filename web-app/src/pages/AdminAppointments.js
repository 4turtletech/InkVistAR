import React, { useState, useEffect } from 'react';
import Axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { Calendar, List, ChevronLeft, ChevronRight, Search, Filter, SlidersHorizontal, Plus, Check, X, User, Palette, Clock, CreditCard, DollarSign, Info, FileText, Image } from 'lucide-react';
import AdminSideNav from '../components/AdminSideNav';
import Pagination from '../components/Pagination';
import ConfirmModal from '../components/ConfirmModal';
import './AdminAppointments.css';
import './PortalStyles.css';
import './AdminStyles.css';
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
        referenceImage: null,
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
                        referenceImage: apt.reference_image,
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
                (apt.id || '').toString().includes(searchTerm) ||
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
        const apt = appointments.find(a => a.id === id);

        if (status === 'confirmed' && apt && apt.serviceType !== 'Consultation') {
            const hasNoPrice = (!apt.price || apt.price <= 0);
            const hasNoArtist = (!apt.artist_id && !apt.artistId);

            if (hasNoPrice || hasNoArtist) {
                showConfirm(
                    'Incomplete Session Details',
                    `This physical session is missing ${hasNoArtist ? 'an Assigned Artist' : ''}${hasNoArtist && hasNoPrice ? ' and ' : ''}${hasNoPrice ? 'a finalized Service Price' : ''}. Would you like to review and supply these parameters for ${clientName}'s session now?`,
                    () => handleEdit(apt)
                );
                return;
            }
        }

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
            paymentStatus: (!appointment.price || appointment.price <= 0) ? 'unpaid' : (appointment.paymentStatus || appointment.payment_status || 'unpaid'),
            notes: appointment.notes,
            price: appointment.price,
            beforePhoto: appointment.beforePhoto,
            referenceImage: appointment.referenceImage,
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
            referenceImage: null,
            manualPaidAmount: 0,
            manualPaymentMethod: 'Cash'
        });
        setClientSearch('');
        openModal();
    };

    const handleRebookNextSession = (appointment) => {
        setSelectedAppointment(null);
        setModalTab('details');
        setFormData({
            clientId: appointment.clientId || appointment.customer_id,
            artistId: appointment.artistId || appointment.artist_id,
            secondaryArtistId: appointment.secondary_artist_id || '',
            commissionSplit: appointment.commission_split || 50,
            serviceType: appointment.serviceType || appointment.service_type,
            designTitle: appointment.designTitle || appointment.design_title,
            date: new Date().toISOString().split('T')[0],
            time: '13:00',
            status: 'pending',
            paymentStatus: 'unpaid',
            notes: `Continuation of project: ${appointment.designTitle || appointment.design_title}`,
            price: appointment.price || 0,
            beforePhoto: null,
            referenceImage: appointment.referenceImage || '',
            manualPaidAmount: 0,
            manualPaymentMethod: 'Cash'
        });
        setClientSearch(appointment.clientName);

        showConfirm(`Are you sure you want to Rebook a next session for this project?`, () => {
            openModal();
        });
    };

    const handleSave = async () => {
        const isConsultation = formData.serviceType === 'Consultation';
        const isArtistRequired = !isConsultation;

        const hasNoArtist = !formData.artistId || String(formData.artistId) === 'null' || String(formData.artistId) === 'undefined' || String(formData.artistId) === '0' || String(formData.artistId).trim() === '';

        // Re-aligned time validation to only map to explicit Consultations per the new Day-Lock studio capacity strategy
        if (!formData.clientId || (isArtistRequired && hasNoArtist) || !formData.date || (isConsultation && !formData.time)) {
            setModalTab('details');
            showAlert('Missing Required Information', `Please fill in all required fields (Client, ${isArtistRequired ? 'Artist, ' : ''}Date${isConsultation ? ', Time' : ''}).`, 'warning');
            return;
        }

        let priceInput = formData.price ? String(formData.price).replace(/[^0-9.]/g, '') : '0';
        let priceValue = parseFloat(priceInput);
        const finalPrice = (!priceValue || priceValue < 0) ? 0 : priceValue;

        if (formData.status === 'confirmed' && !isConsultation) {
            if (finalPrice <= 0) {
                setModalTab('pricing');
                showAlert('Pricing Required', 'Please set the finalized Service Price in the Pricing tab before confirming this physical session.', 'warning');
                return;
            }
            if (hasNoArtist) {
                setModalTab('details');
                showAlert('Artist Required', 'A Resident Artist MUST be assigned before upgrading a physical session to Confirmed status.', 'warning');
                return;
            }
        }

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

    const escapeCsv = (str) => {
        if (str === null || str === undefined) return '""';
        const stringified = String(str);
        if (stringified.includes('"') || stringified.includes(',')) {
            return `"${stringified.replace(/"/g, '""')}"`;
        }
        return `"${stringified}"`;
    };

    const handleExport = () => {
        const headers = ['Appointment ID', 'Client Name', 'Artist', 'Service Type', 'Date', 'Time', 'Status', 'Price'];
        const csvContent = [
            headers.join(','),
            ...filteredAppointments.map(a =>
                `${a.id},${escapeCsv(a.clientName)},${escapeCsv(a.artistName)},${escapeCsv(a.serviceType)},${escapeCsv(a.date)},${escapeCsv(a.time)},${escapeCsv(a.status)},${a.price || 0}`
            )
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `appointments_export_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        const printData = filteredAppointments.map(a =>
            `<tr>
                <td>${a.clientName || 'N/A'}</td>
                <td>${a.artistName || 'N/A'}</td>
                <td>${a.serviceType || 'N/A'}</td>
                <td>${a.date || 'N/A'}</td>
                <td>${a.time || 'N/A'}</td>
                <td>${(a.status || '').toUpperCase()}</td>
                <td>₱${parseFloat(a.price || 0).toLocaleString()}</td>
            </tr>`
        ).join('');

        printWindow.document.write(`
            <html>
                <head>
                    <title>Print Appointments</title>
                    <style>
                        body { font-family: sans-serif; padding: 20px; color: #333; }
                        h1 { color: #1e293b; text-align: center; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 14px; }
                        th { background-color: #f1f5f9; color: #475569; }
                    </style>
                </head>
                <body>
                    <h1>Appointments Schedule</h1>
                    <p style="text-align:center;">Generated on ${new Date().toLocaleString()}</p>
                    <table>
                        <thead>
                            <tr>
                                <th>Client Name</th>
                                <th>Artist</th>
                                <th>Service Type</th>
                                <th>Date</th>
                                <th>Time</th>
                                <th>Status</th>
                                <th>Price</th>
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
        // Slight delay to ensure rendering before printing
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);
    };

    const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);
    const currentItems = filteredAppointments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Compute autocomplete suggestions dynamically from the dataset
    const searchSuggestions = Array.from(new Set([
        ...appointments.map(a => (a.id || '').toString()),
        ...appointments.map(a => (a.clientName || '').trim()),
        ...appointments.map(a => (a.artistName || '').trim())
    ])).filter(Boolean);

    return (
        <div className="admin-page-with-sidenav">
            <AdminSideNav />
            <div className="admin-page page-container-enter">
                {/* Print Only Header */}
                <div className="print-only-header">
                    <div className="admin-st-c6657cae">
                        <div>
                            <h1 className="admin-st-b43c9608">InkVistAR Studio</h1>
                            <p className="admin-m-0">Appointments & Schedule Report</p>
                        </div>
                        <div className="admin-st-7851dbc0">
                            <p className="admin-m-0">Date: {new Date().toLocaleDateString()}</p>
                            <p className="admin-m-0">View: {viewMode.charAt(0).toUpperCase() + viewMode.slice(1)}</p>
                        </div>
                    </div>
                </div>
                <header className="admin-header admin-st-c23ff2ab">
                    <h1>Appointment Management</h1>
                    <div className="admin-st-bb81d8eb">
                        <div className="view-toggle admin-flex-center admin-gap-10">
                            <button
                                className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-secondary'} admin-st-1b9ed2b3`}
                                onClick={() => setViewMode('list')}
                            >
                                <List size={16} /> List
                            </button>
                            <button
                                className={`btn ${viewMode === 'calendar' ? 'btn-primary' : 'btn-secondary'} admin-st-1b9ed2b3`}
                                onClick={() => setViewMode('calendar')}
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
                    <div className="data-card admin-st-96be3bbd">
                        <div className="calendar-header admin-st-07952507">
                            <div className="admin-st-f21b09cf">
                                <button onClick={() => changeMonth(-1)} className="action-btn admin-m-0"><ChevronLeft size={20} /></button>
                                <button onClick={() => setCurrentDate(new Date())} className="action-btn admin-st-505e88db">Today</button>
                                <button onClick={() => changeMonth(1)} className="action-btn admin-m-0"><ChevronRight size={20} /></button>
                            </div>
                            <h2 className="admin-st-dcacbd6e">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
                            <div className="admin-st-c25159cb"></div>
                        </div>
                        <div className="calendar-grid admin-st-3d636867">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                                <div key={d} className="admin-st-24b38fb3">{d}</div>
                            ))}
                            {[...Array(firstDayOfMonth)].map((_, i) => <div key={`empty-${i}`} className="admin-st-e2f83dcd"></div>)}
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
                                            <Plus size={12} className="admin-st-0dbc0f09" />
                                        </div>
                                        <div className="admin-st-5e598434">
                                            {dayAppts.length > 0 && (
                                                <div className="admin-st-50ce32ce">
                                                    {dayAppts.length} {dayAppts.length === 1 ? 'Booking' : 'Bookings'}
                                                </div>
                                            )}
                                            {dayAppts.length > 0 && (
                                                <div className="admin-st-3c36f78c">
                                                    {dayAppts.slice(0, 5).map(apt => (
                                                        <div key={apt.id} style={{
                                                            width: '8px',
                                                            height: '8px',
                                                            borderRadius: '50%',
                                                            backgroundColor: apt.status === 'confirmed' ? '#10b981' : (apt.status === 'pending' ? '#f59e0b' : (apt.status === 'cancelled' || apt.status === 'rejected' ? '#94a3b8' : '#6366f1'))
                                                        }} title={apt.status} />
                                                    ))}
                                                    {dayAppts.length > 5 && <span className="admin-st-ba210a9a">+</span>}
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
                        <div className="premium-filter-bar admin-st-a0e60838">
                            <div className="admin-st-c67f566c">
                                <div className="premium-search-box admin-st-8c2b2854">
                                    <Search size={18} className="text-muted" />
                                    <input
                                        type="text"
                                        list="search-suggestions-appointments"
                                        placeholder="Search appointments..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                    <datalist id="search-suggestions-appointments">
                                        {searchSuggestions.map(suggestion => (
                                            <option key={suggestion} value={suggestion} />
                                        ))}
                                    </datalist>
                                </div>

                                <div className="quick-filters admin-st-70e52978">
                                    {[
                                        { id: 'all', label: 'All', icon: <Filter size={14} /> },
                                        { id: 'upcoming', label: 'Upcoming', icon: <Plus size={14} /> },
                                        { id: 'latest', label: 'Latest Added', icon: <Plus size={14} className="admin-st-554a34d7" /> }
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
                                            className="badge admin-st-8dd03aaa"
                                        >
                                            <X size={14} />
                                            Clear Filters
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="premium-filters-group admin-st-d6f83f6a">
                                <div className="admin-st-fa9239cc">
                                    <Filter size={16} />
                                    <span>Refine:</span>
                                </div>

                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="premium-select-v2 admin-st-8a8a8b6a"
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
                                    className="premium-select-v2 admin-st-8b224a6c"
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
                                    className="premium-select-v2 admin-st-b63c52d4"
                                />

                                <div className="admin-st-a8cc8c61">
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
                                            <tr><td colSpan="10" className="no-data admin-st-3927920f">Loading appointments...</td></tr>
                                        ) : currentItems.length > 0 ? (
                                            currentItems.map((appointment) => (
                                                <tr key={appointment.id}>
                                                    <td>#{appointment.id}</td>
                                                    <td>{appointment.clientName}</td>
                                                    <td>{appointment.artistName}</td>
                                                    <td className="admin-st-775cebbf" title={appointment.serviceType}>{appointment.serviceType}</td>
                                                    <td>{appointment.date}</td>
                                                    <td>{appointment.time}</td>
                                                    <td>
                                                        <span className={`badge status-${getStatusColor(appointment.status || 'pending')}`}>
                                                            {appointment.status}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        {appointment.paymentStatus === 'paid' ? (
                                                            <span className="badge status-confirmed admin-st-4c344c9a">Fully Paid</span>
                                                        ) : appointment.paymentStatus === 'downpayment_paid' ? (
                                                            <span className="badge admin-st-4a6cc9f0">Downpayment</span>
                                                        ) : appointment.price > 0 ? (
                                                            appointment.totalPaid >= appointment.price ? (
                                                                <span className="badge status-confirmed admin-st-4c344c9a">Fully Paid</span>
                                                            ) : appointment.totalPaid > 0 ? (
                                                                <span className="badge admin-st-4a6cc9f0">Balance: ₱{(appointment.price - appointment.totalPaid).toLocaleString()}</span>
                                                            ) : (
                                                                <span className="badge admin-st-07684bc7">Unpaid</span>
                                                            )
                                                        ) : (
                                                            <span className="badge admin-st-2d1fd819">No Charge</span>
                                                        )}
                                                    </td>
                                                    <td>₱{Number(appointment.price).toLocaleString()}</td>
                                                    <td className="actions-cell">
                                                        {appointment.status === 'pending' && (
                                                            <>
                                                                <button className="action-btn view-btn admin-st-bb9a2c41" onClick={() => handleStatusUpdate(appointment.id, 'confirmed', appointment.clientName)} title="Approve">
                                                                    <Check size={14} className="admin-st-da4d9cdd" />
                                                                </button>
                                                                <button className="action-btn delete-btn admin-st-02e8d890" onClick={() => handleStatusUpdate(appointment.id, 'cancelled', appointment.clientName)} title="Reject">
                                                                    <X size={14} className="admin-st-234e64b8" />
                                                                </button>
                                                            </>
                                                        )}
                                                        {appointment.status?.toLowerCase() === 'confirmed' && (
                                                            <button
                                                                className="action-btn view-btn admin-st-5d943a90"
                                                                onClick={() => handleStatusUpdate(appointment.id, 'completed', appointment.clientName)}
                                                                title="Mark as Done"
                                                            >
                                                                <Check size={14} className="admin-st-da4d9cdd" />
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
                                <div className="admin-st-15246701">
                                    <div className="admin-st-18a02d52">
                                        <h2 className="admin-m-0">{selectedAppointment ? `Edit Appointment #${selectedAppointment.id}` : 'New Appointment'}</h2>
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
                                    <div className="admin-st-f21b09cf">
                                        <span className={`badge status-${getStatusColor(formData.status)}`}>{formData.status}</span>
                                        {selectedAppointment && selectedAppointment.price > 0 && (
                                            <div className="badge admin-st-d2713882">
                                                <span>Paid: ₱{selectedAppointment.totalPaid.toLocaleString()} / ₱{formData.price.toLocaleString()}</span>
                                                {selectedAppointment.totalPaid < formData.price && (
                                                    <span className="admin-st-14a76a5d">(Bal: ₱{(formData.price - selectedAppointment.totalPaid).toLocaleString()})</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <button className="close-btn" onClick={closeModal}><X size={24} /></button>
                            </div>
                            <div className="modal-body">
                                {modalTab === 'details' && (
                                    <div className="admin-st-b97f1a79">
                                        {/* Left Column: People & Service */}
                                        <div className="admin-st-d295c8d6">
                                            <div>
                                                <label className="premium-input-label">Client Information</label>
                                                {formData.clientId ? (
                                                    <div className="admin-st-013bb379">
                                                        <div className="admin-st-b0dbc89c">
                                                            <div className="admin-st-589acf0b">
                                                                <User size={18} color="#10b981" />
                                                            </div>
                                                            <span className="admin-st-0e40c814">{clients.find(c => c.id == formData.clientId)?.name || clientSearch}</span>
                                                        </div>
                                                        <button type="button" onClick={() => { setFormData(prev => ({ ...prev, clientId: null })); setClientSearch(''); }} className="admin-st-f32d59a5">
                                                            <X size={20} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="admin-st-d85c4e64">
                                                        <div className="premium-search-box admin-st-c7f79b45">
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
                                                            <div className="glass-card admin-st-83ac1cb2">
                                                                {clients.filter(c => c.name && c.name.toLowerCase().includes(clientSearch.toLowerCase())).map(c => (
                                                                    <div key={c.id} className="admin-st-824731e9" onClick={() => { setFormData({ ...formData, clientId: c.id }); setClientSearch(c.name); }}>
                                                                        <User size={16} color="#C19A6B" />
                                                                        <span className="admin-st-9d3db44b">{c.name}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            <div>
                                                <label className="premium-input-label">Staff Assignment</label>
                                                <div className="admin-st-efc8b70e">
                                                    <div className="admin-st-fefecdf0">
                                                        <div className="premium-input-group">
                                                            <label className="admin-st-b8618eb2">Primary Artist *</label>
                                                            <select value={formData.artistId} onChange={(e) => setFormData({ ...formData, artistId: e.target.value })} className="premium-select-v2">
                                                                <option value="">Select Artist</option>
                                                                {artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                                            </select>
                                                        </div>
                                                        <div className="premium-input-group">
                                                            <label className="admin-st-b8618eb2">Secondary Artist</label>
                                                            <select value={formData.secondaryArtistId || ''} onChange={(e) => setFormData({ ...formData, secondaryArtistId: e.target.value })} className="premium-select-v2">
                                                                <option value="">None (Solo)</option>
                                                                {artists.filter(a => a.id != formData.artistId).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                                            </select>
                                                        </div>
                                                    </div>
                                                    {formData.secondaryArtistId && (
                                                        <div className="admin-st-953ba7ac">
                                                            <label className="admin-st-15b3be7e">Split % (Pri/Sec):</label>
                                                            <input type="number" min="1" max="99" value={formData.commissionSplit} onChange={(e) => setFormData({ ...formData, commissionSplit: parseInt(e.target.value) })} className="premium-input-v2 admin-st-e070afd8" />
                                                            <span className="admin-st-7206c648">/ {100 - (formData.commissionSplit || 0)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div>
                                                <label className="premium-input-label">Service Details</label>
                                                <div className="admin-st-efc8b70e">
                                                    <div className="admin-st-fefecdf0">
                                                        <div className="premium-input-group">
                                                            <label className="admin-st-b8618eb2">Service Type *</label>
                                                            <select value={formData.serviceType} onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })} className="premium-select-v2">
                                                                <option value="Tattoo Session">Tattoo Session</option>
                                                                <option value="Consultation">Consultation</option>
                                                                <option value="Piercing">Piercing</option>
                                                                <option value="Touch-up">Touch-up</option>
                                                            </select>
                                                        </div>
                                                        <div className="premium-input-group">
                                                            <label className="admin-st-b8618eb2">Design / Idea</label>
                                                            <input type="text" value={formData.designTitle} onChange={(e) => setFormData({ ...formData, designTitle: e.target.value })} className="premium-input-v2" placeholder="e.g. Neo-Trad" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right Column: Schedule & Status */}
                                        <div className="admin-st-d295c8d6">
                                            <div>
                                                <label className="premium-input-label">Schedule & Status</label>
                                                <div className="admin-st-efc8b70e">
                                                    <div className="admin-st-fefecdf0">
                                                        <div className="premium-input-group">
                                                            <label className="admin-st-b8618eb2">Date *</label>
                                                            <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="premium-input-v2" />
                                                        </div>
                                                        {formData.serviceType === 'Consultation' && (
                                                            <div className="premium-input-group">
                                                                <label className="admin-st-b8618eb2">Time *</label>
                                                                <input type="time" value={formData.time} onChange={(e) => setFormData({ ...formData, time: e.target.value })} className="premium-input-v2" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="premium-input-group">
                                                        <label className="admin-st-b8618eb2">Booking Status</label>
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

                                        {/* Project Session History Panel */}
                                        {selectedAppointment && formData.designTitle && (
                                            <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e2e8f0', gridColumn: '1 / -1' }}>
                                                <h4 style={{ margin: 0, marginBottom: '12px', fontSize: '0.95rem', color: '#334155' }}>
                                                    Project Session History: <span style={{ color: '#4338ca' }}>{formData.designTitle}</span>
                                                </h4>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    {appointments.filter(a => a.customer_id === selectedAppointment.customer_id && a.design_title === formData.designTitle)
                                                        .sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date))
                                                        .map((session, idx) => (
                                                            <div key={session.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', borderRadius: '6px', background: session.id === selectedAppointment.id ? '#e0e7ff' : '#f8fafc', border: `1px solid ${session.id === selectedAppointment.id ? '#c7d2fe' : '#e2e8f0'}` }}>
                                                                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                                                    <span style={{ fontWeight: session.id === selectedAppointment.id ? '700' : '600', color: session.id === selectedAppointment.id ? '#4338ca' : '#475569' }}>Session {idx + 1}</span>
                                                                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                                                        {new Date(session.appointment_date).toLocaleDateString()} at {session.start_time}
                                                                    </span>
                                                                </div>
                                                                <span className={`badge status-${session.status.toLowerCase() === 'completed' ? 'active' : session.status.toLowerCase() === 'pending' ? 'pending' : 'expired'}`} style={{ scale: '0.85', transformOrigin: 'right' }}>
                                                                    {session.status}
                                                                </span>
                                                            </div>
                                                        ))}
                                                </div>
                                            </div>
                                        )}

                                    </div>
                                )}
                                {modalTab === 'pricing' && (
                                    /* Pricing Tab View */
                                    <div className="fade-in admin-st-9628d1ce">
                                        <div className="admin-st-dd4f6313">
                                            <div className="admin-st-e5b0a825">
                                                <div className="form-group">
                                                    <label className="admin-st-6ad161f7">Total Quote (₱) *</label>
                                                    <input type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })} className="premium-input-v2 admin-st-1a49bbe7" />
                                                </div>
                                                <div className="form-group">
                                                    <label className="admin-st-6ad161f7">Payment Strategy</label>
                                                    <select value={formData.paymentStatus} onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })} className="premium-select-v2 admin-st-c8e7c63b">
                                                        <option value="unpaid">Draft (Unquoted)</option>
                                                        <option value="downpayment_paid">Downpayment Collected</option>
                                                        <option value="paid">Fully Paid</option>
                                                    </select>
                                                </div>
                                            </div>

                                            {selectedAppointment && (
                                                <div className="admin-st-4344b743">
                                                    <div className="admin-st-7c85a4a1">
                                                        <span className="admin-st-9e124000">Total Collected:</span>
                                                        <span className="admin-st-3947f0f7">₱{selectedAppointment.totalPaid.toLocaleString()}</span>
                                                    </div>
                                                    <div className="admin-st-ddde571d">
                                                        <span className="admin-st-9e124000">Remaining Balance:</span>
                                                        <span className="admin-st-da5d65cf">₱{Math.max(0, formData.price - selectedAppointment.totalPaid).toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="admin-st-422e3858">
                                                <button className="btn admin-st-c52b9668" onClick={() => setModalTab('details')}>Back to Details</button>

                                                {formData.price > 0 && formData.paymentStatus === 'unpaid' && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-primary admin-st-2b208132"
                                                        onClick={() => {
                                                            showAlert('Payment Link Sent', `A digital payment checkout link for ₱${formData.price.toLocaleString()} has been routed to the client.`, 'success');
                                                        }}
                                                    >
                                                        <CreditCard size={20} /> Request Digital Payment
                                                    </button>
                                                )}

                                                {selectedAppointment && (
                                                    <button className="btn btn-primary admin-st-f9f5beee" onClick={() => setManualPaymentModal({ isOpen: true, amount: Math.max(0, formData.price - selectedAppointment.totalPaid), method: 'Cash' })}>
                                                        <DollarSign size={20} /> Record Manual Payment
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {modalTab === 'notes' && (
                                    /* Notes Tab View */
                                    <div className="admin-st-b97f1a79">
                                        {/* Left Column: Session Summary & Notes */}
                                        <div className="admin-st-d295c8d6">
                                            <div>
                                                <label className="admin-st-739a1b05">Session Details Summary</label>
                                                <div className="admin-st-ae64ad42">
                                                    <div className="admin-flex-between">
                                                        <span className="admin-st-26b52dcd">Service Type:</span>
                                                        <span className="admin-st-0e40c814">{formData.serviceType}</span>
                                                    </div>
                                                    <div className="admin-flex-between">
                                                        <span className="admin-st-26b52dcd">Design Idea:</span>
                                                        <span className="admin-st-0e40c814">{formData.designTitle || 'N/A'}</span>
                                                    </div>
                                                    <div className="admin-flex-between">
                                                        <span className="admin-st-26b52dcd">Scheduled For:</span>
                                                        <span className="admin-st-afc165d9">{formData.date} at {formData.time}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="admin-st-739a1b05">Internal Session Notes</label>
                                                <textarea
                                                    value={formData.notes}
                                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                                    className="premium-select-v2 admin-st-ef6586d6"
                                                    placeholder="Add detailed internal notes, placement instructions, or specific client requests..."
                                                />
                                            </div>
                                        </div>

                                        {/* Right Column: Reference Assets */}
                                        <div className="admin-st-d295c8d6">
                                            <div>
                                                <label className="admin-st-739a1b05">Reference Assets</label>
                                                <div className="admin-st-699063a3">
                                                    {/* Reference Image (Booking Data) */}
                                                    {(formData.referenceImage || selectedAppointment?.referenceImage) ? (
                                                        <div className="admin-w-full">
                                                            <label className="admin-st-e7eee706">Reference from Booking</label>
                                                            <img
                                                                src={formData.referenceImage || selectedAppointment?.referenceImage}
                                                                alt="Reference"
                                                                className="admin-st-ab1ba3de"
                                                            />
                                                        </div>
                                                    ) : null}

                                                    {/* Before Photo (Studio Log) */}
                                                    {(formData.beforePhoto || selectedAppointment?.beforePhoto) ? (
                                                        <div style={{ width: '100%', borderTop: (formData.referenceImage || selectedAppointment?.referenceImage) ? '1px dashed #e2e8f0' : 'none', paddingTop: (formData.referenceImage || selectedAppointment?.referenceImage) ? '20px' : '0' }}>
                                                            <label className="admin-st-e7eee706">Stage Photo (Before)</label>
                                                            <img
                                                                src={formData.beforePhoto || selectedAppointment?.beforePhoto}
                                                                alt="Before"
                                                                className="admin-st-ab1ba3de"
                                                            />
                                                        </div>
                                                    ) : null}

                                                    {!(formData.referenceImage || selectedAppointment?.referenceImage || formData.beforePhoto || selectedAppointment?.beforePhoto) && (
                                                        <div className="admin-st-28e6a799">
                                                            <Image size={48} className="admin-st-04217666" />
                                                            <p>No reference image uploaded</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer admin-st-ac2eb647">
                                <div className="admin-st-f232bb1d">
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        {selectedAppointment && (
                                            <>
                                                <button
                                                    className="btn btn-danger admin-st-ce9b8932"
                                                    onClick={() => {
                                                        handleDelete(selectedAppointment.id);
                                                        closeModal();
                                                    }}
                                                    onMouseEnter={(e) => e.target.style.backgroundColor = '#dc2626'}
                                                    onMouseLeave={(e) => e.target.style.backgroundColor = '#ef4444'}
                                                >
                                                    <X size={16} /> Delete Appointment
                                                </button>

                                                <button
                                                    type="button"
                                                    className="btn btn-secondary"
                                                    onClick={() => {
                                                        closeModal();
                                                        setTimeout(() => handleRebookNextSession(selectedAppointment), 200);
                                                    }}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#e0e7ff', color: '#4338ca', borderColor: '#c7d2fe' }}
                                                >
                                                    <Plus size={16} /> Rebook Next Session
                                                </button>
                                            </>
                                        )}
                                    </div>
                                    <button className="btn btn-primary admin-st-a3930dd9" onClick={handleSave} >
                                        {selectedAppointment ? 'Update Appointment' : 'Create Appointment'}
                                    </button>
                                </div>
                                <button className="btn btn-secondary admin-st-2b5b349d" onClick={closeModal} onMouseEnter={(e) => e.target.style.backgroundColor = '#e2e8f0'}
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
                    <div className="modal-overlay admin-st-b92d1844">
                        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2>Record Payment</h2>
                                <button className="close-btn" onClick={() => setManualPaymentModal({ ...manualPaymentModal, isOpen: false })}><X size={24} /></button>
                            </div>
                            <div className="modal-body">
                                <div className="form-group admin-mb-20">
                                    <label className="admin-st-80a8a11c">Payment Amount (₱)</label>
                                    <input
                                        type="number"
                                        className="form-input admin-st-22430afb"
                                        value={manualPaymentModal.amount}
                                        onChange={(e) => setManualPaymentModal({ ...manualPaymentModal, amount: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="admin-st-80a8a11c">Payment Method</label>
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
                    <div className="modal-overlay admin-st-032d51d4" onClick={() => setDayViewModal({ ...dayViewModal, isOpen: false })}>
                        <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2>{dayViewModal.date}</h2>
                                <button className="close-btn" onClick={() => setDayViewModal({ ...dayViewModal, isOpen: false })}><X size={24} /></button>
                            </div>
                            <div className="modal-body">
                                <h4 className="admin-st-48229229">Appointments for this day:</h4>
                                <div className="admin-st-b8aaf979">
                                    {dayViewModal.appointments.map(apt => (
                                        <div
                                            key={apt.id}
                                            className="glass-card admin-st-9880e94d"
                                            onClick={() => {
                                                setDayViewModal({ ...dayViewModal, isOpen: false });
                                                handleEdit(apt);
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.borderColor = '#6366f1'}
                                            onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                                        >
                                            <div className="admin-st-a5c3808d">
                                                <div className="admin-st-351e3911">{apt.start_time}</div>
                                                <div>
                                                    <div className="admin-st-6ad161f7">{apt.clientName}</div>
                                                    <div className="admin-st-3bf8f64b">{apt.service_type || 'Tattoo Session'}</div>
                                                </div>
                                            </div>
                                            <div className="admin-st-7851dbc0">
                                                <span className={`${`badge status-${getStatusColor(apt.status)} admin-st-af89d6d6`} `} >{apt.status}</span>
                                                <div className="admin-st-16d46816">Artist: {apt.artist_name}</div>
                                            </div>
                                        </div>
                                    ))}
                                    {dayViewModal.appointments.length === 0 && (
                                        <div className="admin-st-555dbe34">No appointments scheduled for this day.</div>
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
