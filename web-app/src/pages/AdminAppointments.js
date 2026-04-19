import React, { useState, useEffect, useCallback, useRef } from 'react';
import Axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { Calendar, List, ChevronLeft, ChevronRight, Search, Filter, SlidersHorizontal, Plus, Check, X, User, CreditCard, Info, FileText, Image, Clock } from 'lucide-react';
import PhilippinePeso from '../components/PhilippinePeso';

import AdminSideNav from '../components/AdminSideNav';
import Pagination from '../components/Pagination';
import ConfirmModal from '../components/ConfirmModal';
import './AdminAppointments.css';
import './PortalStyles.css';
import './AdminStyles.css';
import { API_URL } from '../config';
import { getDisplayCode } from '../utils/formatters';
import { filterName, filterDigits, clampNumber } from '../utils/validation';

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
        manualPaymentMethod: 'Cash',
        rejectionReason: '',
        rescheduleReason: ''
    });
    const [rescheduleModal, setRescheduleModal] = useState({ isOpen: false, date: '', time: '', reason: '' });
    const [showCalendarLegend, setShowCalendarLegend] = useState(false);
    const [selectedDay, setSelectedDay] = useState(null); // tracks the keyboard-focused day
    const calendarRef = useRef(null);
    const initialFormDataRef = useRef(null);

    // Modal animation handlers
    const openModal = () => {
        setAppointmentModal({ mounted: true, visible: false });
        setTimeout(() => setAppointmentModal({ mounted: true, visible: true }), 10);
    };

    const closeModal = (skipDirtyCheck = false) => {
        if (!skipDirtyCheck && initialFormDataRef.current) {
            const hasChanges = JSON.stringify(formData) !== JSON.stringify(initialFormDataRef.current);
            if (hasChanges) {
                setConfirmDialog({
                    isOpen: true,
                    title: 'Unsaved Changes',
                    message: 'You have unsaved changes. Are you sure you want to close? All changes will be lost.',
                    type: 'warning',
                    isAlert: false,
                    onConfirm: () => {
                        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                        closeModal(true);
                    }
                });
                return;
            }
        }
        setAppointmentModal(prev => ({ ...prev, visible: false }));
        setTimeout(() => {
            setAppointmentModal({ mounted: false, visible: false });
            initialFormDataRef.current = null;
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
                        bookingCode: apt.booking_code,
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
                        manualPaymentMethod: apt.manual_payment_method || 'Cash',
                        clientAvatar: apt.client_avatar
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

    const handleDayClick = (dateString, day) => {
        setSelectedDay(day || null);
    };

    // Keep selectedDay up to date automatically based on the month being viewed
    useEffect(() => {
        if (viewMode === 'calendar') {
            const today = new Date();
            if (today.getMonth() === currentDate.getMonth() && today.getFullYear() === currentDate.getFullYear()) {
                setSelectedDay(today.getDate());
            } else {
                setSelectedDay(1);
            }
        }
    }, [currentDate, viewMode]);

    useEffect(() => {
        filterAndSortAppointments();
    }, [appointments, searchTerm, statusFilter, serviceFilter, quickFilter, dateFilter, sortBy]);

    const filterAndSortAppointments = () => {
        let filtered = appointments.filter(apt => {
            const displayCode = getDisplayCode(apt.bookingCode, apt.id);
            const matchesSearch =
                displayCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (apt.bookingCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
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
        const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1);
        const newDaysInMonth = new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0).getDate();
        // If going forward, land on day 1; if going back, land on last day
        if (selectedDay !== null) {
            setSelectedDay(offset > 0 ? 1 : newDaysInMonth);
        }
        setCurrentDate(newDate);
    };

    // Navigate the calendar day
    useEffect(() => {
        if (viewMode !== 'calendar') return;
        if (appointmentModal.mounted) return;

        const handleKeyDown = (e) => {
            // Only handle arrow keys and Enter
            if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter'].includes(e.key)) return;

            e.preventDefault();
            const maxDay = daysInMonth;

            if (selectedDay === null) {
                const today = new Date();
                if (today.getMonth() === currentDate.getMonth() && today.getFullYear() === currentDate.getFullYear()) {
                    setSelectedDay(today.getDate());
                } else {
                    setSelectedDay(1);
                }
                return;
            }

            if (e.key === 'Enter') {
                const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
                handleAddNew(dateStr);
                return;
            }

            let newDay = selectedDay;
            if (e.key === 'ArrowLeft') newDay = selectedDay - 1;
            else if (e.key === 'ArrowRight') newDay = selectedDay + 1;
            else if (e.key === 'ArrowUp') newDay = selectedDay - 7;
            else if (e.key === 'ArrowDown') newDay = selectedDay + 7;

            if (newDay < 1) {
                changeMonth(-1);
            } else if (newDay > maxDay) {
                changeMonth(1);
            } else {
                setSelectedDay(newDay);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [viewMode, selectedDay, currentDate, daysInMonth, appointmentModal.mounted]);

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
                navigate('/admin/appointments', { replace: true });
            }
        }
    }, [location.search, appointments]);

    const handleEdit = (appointment) => {
        setSelectedAppointment(appointment);
        setModalTab('details');
        
        // Check if the stored artistId is a real artist (not admin placeholder)
        const storedArtistId = appointment.artistId || appointment.artist_id;
        const isRealArtist = artists.some(a => String(a.id) === String(storedArtistId));
        
        setFormData({
            clientId: appointment.clientId || appointment.customer_id,
            artistId: isRealArtist ? storedArtistId : '',
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
            manualPaymentMethod: appointment.manualPaymentMethod || 'Cash',
            rejectionReason: appointment.rejectionReason || '',
            rescheduleReason: ''
        });
        setClientSearch(appointment.clientName);
        initialFormDataRef.current = {
            clientId: appointment.clientId || appointment.customer_id,
            artistId: isRealArtist ? storedArtistId : '',
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
            manualPaymentMethod: appointment.manualPaymentMethod || 'Cash',
            rejectionReason: appointment.rejectionReason || '',
            rescheduleReason: ''
        };
        openModal();
    };

    // handleDelete deprecated — replaced by Reschedule flow
    // eslint-disable-next-line no-unused-vars
    const _handleDeleteDeprecated = (id) => {
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
            manualPaymentMethod: 'Cash',
            rejectionReason: '',
            rescheduleReason: ''
        });
        setClientSearch('');
        initialFormDataRef.current = { ...formData, clientId: '', artistId: '', secondaryArtistId: '', commissionSplit: 50, serviceType: '', date: prefilledDate || new Date().toISOString().split('T')[0], time: '13:00', status: 'pending', paymentStatus: 'unpaid', notes: '', price: 0, beforePhoto: null, referenceImage: null, manualPaidAmount: 0, manualPaymentMethod: 'Cash', rejectionReason: '', rescheduleReason: '' };
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
            manualPaymentMethod: 'Cash',
            rejectionReason: '',
            rescheduleReason: ''
        });
        setClientSearch(appointment.clientName);

        showConfirm(`Are you sure you want to Rebook a next session for this project?`, () => {
            openModal();
        });
    };

    const handleSave = async () => {
        const isConsultation = formData.serviceType === 'Consultation';
        const isTattooSession = !isConsultation;
        const isDualService = formData.serviceType === 'Tattoo + Piercing';
        // Detect dual-topic consultation by checking notes for piercing references
        const isDualConsultation = isConsultation && (formData.notes || '').toLowerCase().includes('piercing');
        const requiresDualStaff = isDualService || isDualConsultation;

        const hasNoArtist = !formData.artistId || String(formData.artistId) === 'null' || String(formData.artistId) === 'undefined' || String(formData.artistId) === '0' || String(formData.artistId).trim() === '' || !artists.some(a => String(a.id) === String(formData.artistId));
        const hasNoSecondaryArtist = !formData.secondaryArtistId || String(formData.secondaryArtistId) === 'null' || String(formData.secondaryArtistId) === 'undefined' || String(formData.secondaryArtistId) === '0' || String(formData.secondaryArtistId).trim() === '' || !artists.some(a => String(a.id) === String(formData.secondaryArtistId));

        // Basic required fields: Client + Date (+ Time for consultations)
        if (!formData.clientId || !formData.date || (isConsultation && !formData.time)) {
            setModalTab('details');
            showAlert('Missing Required Information', `Please fill in all required fields (Client, Date${isConsultation ? ', Time' : ''}).`, 'warning');
            return;
        }

        // Tattoo Session specific validations - always enforced
        if (isTattooSession && hasNoArtist) {
            setModalTab('details');
            showAlert('Staff Required', 'This session requires a Staff member to be assigned. Please select a staff member in the Details tab.', 'warning');
            return;
        }

        // Dual-service validations - require both staff members
        if (requiresDualStaff && hasNoSecondaryArtist) {
            setModalTab('details');
            const label = isDualService ? 'Tattoo + Piercing' : 'dual-topic Consultation';
            showAlert('Piercing Staff Required', `A ${label} session requires both a Primary Staff and a Piercing Staff to be assigned. You may select the same person for both roles if they handle both services.`, 'warning');
            return;
        }

        let priceInput = formData.price ? String(formData.price).replace(/[^0-9.]/g, '') : '0';
        let priceValue = parseFloat(priceInput);
        const finalPrice = (!priceValue || priceValue < 0) ? 0 : priceValue;

        // Block completing a tattoo session without staff + price
        if (isTattooSession && formData.status === 'completed') {
            if (hasNoArtist) {
                setModalTab('details');
                showAlert('Cannot Complete', 'A staff member must be assigned before marking this session as completed.', 'warning');
                return;
            }
            if (requiresDualStaff && hasNoSecondaryArtist) {
                setModalTab('details');
                showAlert('Cannot Complete', 'Both staff members must be assigned before marking a dual-service session as completed.', 'warning');
                return;
            }
            if (finalPrice <= 0) {
                setModalTab('pricing');
                showAlert('Cannot Complete', 'A price must be set before marking this session as completed.', 'warning');
                return;
            }
        }

        if (isTattooSession && finalPrice <= 0) {
            setModalTab('pricing');
            showAlert('Pricing Required', 'A Tattoo Session requires a price to be set. Please enter the service price in the Pricing tab before saving.', 'warning');
            return;
        }

        if (isTattooSession && finalPrice > 0 && finalPrice < 5000) {
            setModalTab('pricing');
            showAlert('Minimum Price', 'The minimum quote for a Tattoo Session is ₱5,000. Please adjust the price accordingly.', 'warning');
            return;
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
                    manualPaymentMethod: formData.manualPaymentMethod,
                    rejectionReason: formData.status === 'rejected' ? formData.rejectionReason : null,
                    rescheduleReason: formData.rescheduleReason
                };

                if (selectedAppointment) {
                    await Axios.put(`${API_URL}/api/admin/appointments/${selectedAppointment.id}`, payload);
                } else {
                    await Axios.post(`${API_URL}/api/admin/appointments`, payload);
                }
                closeModal(true);
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

    const handleConfirmReschedule = async () => {
        if (!rescheduleModal.date) return showAlert('Date Required', 'Please select a new date.', 'warning');
        if (formData.serviceType === 'Consultation' && !rescheduleModal.time) return showAlert('Time Required', 'Please select a new time.', 'warning');
        
        try {
            const payload = {
                customerId: formData.clientId,
                artistId: formData.artistId,
                secondaryArtistId: formData.secondaryArtistId || null,
                commissionSplit: formData.commissionSplit || 50,
                serviceType: formData.serviceType,
                designTitle: formData.designTitle,
                date: rescheduleModal.date,
                startTime: rescheduleModal.time,
                status: formData.status,
                paymentStatus: formData.paymentStatus,
                notes: formData.notes,
                price: formData.price,
                beforePhoto: formData.beforePhoto,
                manualPaidAmount: parseFloat(formData.manualPaidAmount) || 0,
                manualPaymentMethod: formData.manualPaymentMethod,
                rescheduleReason: rescheduleModal.reason
            };
            
            await Axios.put(`${API_URL}/api/admin/appointments/${selectedAppointment.id}`, payload);
            
            setFormData(prev => ({
                ...prev,
                date: rescheduleModal.date,
                time: rescheduleModal.time,
                rescheduleReason: rescheduleModal.reason
            }));
            
            setRescheduleModal(prev => ({...prev, isOpen: false}));
            closeModal();
            fetchAppointments();
            setConfirmDialog({ 
                isOpen: true, 
                title: 'Success', 
                message: 'Appointment successfully rescheduled.', 
                type: 'info', 
                isAlert: true,
                onConfirm: () => setConfirmDialog(prev => ({ ...prev, isOpen: false })) 
            });
        } catch (err) {
            console.error('Error rescheduling appointment:', err);
            showAlert('Error', 'Failed to reschedule appointment.', 'danger');
        }
    };

    const handleApplyManualPayment = async () => {
        const remainingBalance = Math.max(0, formData.price - (selectedAppointment?.totalPaid || 0));
        const inputAmount = parseFloat(manualPaymentModal.amount);

        if (!inputAmount || inputAmount <= 0) return;

        if (inputAmount > remainingBalance) {
            showAlert('Invalid Amount', `Amount exceeds the remaining balance of ₱${remainingBalance.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'warning');
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
            case 'confirmed': return 'confirmed';
            case 'completed': return 'completed';
            case 'pending': return 'pending';
            case 'cancelled': return 'cancelled';
            case 'rejected': return 'cancelled';
            case 'in_progress': return 'in-progress';
            case 'incomplete': return 'incomplete';
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
                <td>₱${parseFloat(a.price || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
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
                <header className="admin-header">
                    <div className="header-title-area">
                        <h1>Appointment Management</h1>
                        <p>Real-time schedule monitoring and booking oversight</p>
                    </div>
                    <div className="header-actions-group">
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
                    <div className="calendar-split-view">
                    <div className="data-card admin-st-96be3bbd calendar-main-pane">
                        <div className="calendar-header admin-st-07952507">
                            <div className="admin-st-f21b09cf">
                                <button onClick={() => changeMonth(-1)} className="action-btn admin-m-0"><ChevronLeft size={20} /></button>
                                <button onClick={() => setCurrentDate(new Date())} className="action-btn admin-st-505e88db">Today</button>
                                <button onClick={() => changeMonth(1)} className="action-btn admin-m-0"><ChevronRight size={20} /></button>
                            </div>
                            <h2 className="admin-st-dcacbd6e">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
                            <div style={{ position: 'relative' }}>
                                <button
                                    onClick={() => setShowCalendarLegend(v => !v)}
                                    title="Show color legend"
                                    style={{
                                        width: '30px', height: '30px', borderRadius: '50%',
                                        border: '1.5px solid #cbd5e1',
                                        background: showCalendarLegend ? '#6366f1' : 'white',
                                        color: showCalendarLegend ? 'white' : '#64748b',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer', fontWeight: 800, fontSize: '0.85rem',
                                        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                                        transition: 'all 0.2s ease', flexShrink: 0
                                    }}
                                >
                                    i
                                </button>
                                {showCalendarLegend && (
                                    <div
                                        style={{
                                            position: 'absolute', top: '38px', right: 0,
                                            background: 'white', borderRadius: '12px',
                                            boxShadow: '0 8px 30px rgba(0,0,0,0.14)',
                                            border: '1px solid #e2e8f0',
                                            padding: '14px 18px', zIndex: 999,
                                            minWidth: '220px', cursor: 'default'
                                        }}
                                        onClick={e => e.stopPropagation()}
                                    >
                                        <p style={{ margin: '0 0 10px', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Booking Status Legend</p>
                                        {[
                                            { color: '#38bdf8', label: 'Confirmed' },
                                            { color: '#f59e0b', label: 'Pending' },
                                            { color: '#7c3aed', label: 'Scheduled' },
                                            { color: '#0284c7', label: 'In Session' },
                                            { color: '#22c55e', label: 'Completed' },
                                            { color: '#ef4444', label: 'Incomplete' },
                                            { color: '#94a3b8', label: 'Cancelled / Rejected' },
                                        ].map(({ color, label }) => (
                                            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, flexShrink: 0, boxShadow: `0 0 0 2px ${color}33` }} />
                                                <span style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 500 }}>{label}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
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
                                        border: selectedDay === day
                                            ? '2px solid #7c3aed'
                                            : isToday ? '2px solid #6366f1' : '1px solid #e2e8f0',
                                        minHeight: '100px',
                                        padding: '8px',
                                        borderRadius: '8px',
                                        backgroundColor: selectedDay === day ? '#f5f3ff' : 'white',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        position: 'relative',
                                        boxShadow: selectedDay === day ? '0 0 0 3px rgba(124,58,237,0.15)' : 'none'
                                    }}
                                        className="calendar-day-cell"
                                        onClick={() => handleDayClick(`${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`, day) }>
                                        <div style={{ fontWeight: 'bold', marginBottom: '5px', color: isToday ? '#6366f1' : '#334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span>{day}</span>
                                            <Plus size={12} className="admin-st-0dbc0f09" />
                                        </div>
                                        {/* Booking count badge — styled like the sidenav notification-badge */}
                                        {dayAppts.length > 0 && (
                                            <div style={{
                                                position: 'absolute', top: '6px', right: '6px',
                                                background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                                                color: '#fff',
                                                fontSize: '0.62rem', fontWeight: 800,
                                                minWidth: '18px', height: '18px',
                                                padding: '0 5px', borderRadius: '9px',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                boxShadow: '0 2px 6px rgba(99,102,241,0.45)',
                                                lineHeight: 1, letterSpacing: '-0.3px',
                                                pointerEvents: 'none'
                                            }}>
                                                {dayAppts.length > 99 ? '99+' : dayAppts.length}
                                            </div>
                                        )}
                                        <div className="admin-st-5e598434">
                                            {dayAppts.length > 0 && (
                                                <div className="admin-st-50ce32ce">
                                                    {dayAppts.length} {dayAppts.length === 1 ? 'Booking' : 'Bookings'}
                                                </div>
                                            )}
                                            {dayAppts.length > 0 && (
                                                <div className="admin-st-3c36f78c">
                                                    {dayAppts.slice(0, 5).map(apt => {
                                                        let dotColor = '#7c3aed'; // default: scheduled (dark purple)
                                                        if (apt.status === 'confirmed') dotColor = '#38bdf8';
                                                        else if (apt.status === 'pending') dotColor = '#f59e0b';
                                                        else if (apt.status === 'in_progress') dotColor = '#0284c7';
                                                        else if (apt.status === 'completed') dotColor = '#22c55e';
                                                        else if (apt.status === 'incomplete') dotColor = '#ef4444';
                                                        else if (apt.status === 'cancelled' || apt.status === 'rejected') dotColor = '#94a3b8';
                                                        return (
                                                            <div key={apt.id} style={{
                                                                width: '8px',
                                                                height: '8px',
                                                                borderRadius: '50%',
                                                                backgroundColor: dotColor
                                                            }} title={apt.status} />
                                                        );
                                                    })}
                                                    {dayAppts.length > 5 && <span className="admin-st-ba210a9a">+</span>}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="day-view-panel data-card">
                        <div className="day-view-header">
                            <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#1e293b' }}>
                                {new Date(
                                    currentDate.getFullYear(),
                                    currentDate.getMonth(),
                                    selectedDay || 1
                                ).toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </h3>
                            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                {getAppointmentsForDate(selectedDay || 1).length} Bookings
                            </span>
                        </div>
                        <div className="day-view-body">
                            {getAppointmentsForDate(selectedDay || 1).map(apt => (
                                <div
                                    key={apt.id}
                                    className="glass-card day-view-apt-card"
                                    onClick={() => handleEdit(apt)}
                                >
                                    <div className="admin-st-a5c3808d">
                                        <div style={{
                                            width: '40px', height: '40px', borderRadius: '50%',
                                            backgroundColor: '#f1f5f9', overflow: 'hidden',
                                            border: '2px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                        }}>
                                            {apt.clientAvatar && apt.clientAvatar.length > 10 ? (
                                                <img 
                                                    src={apt.clientAvatar} 
                                                    alt="Profile" 
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                                    onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; e.target.parentElement.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>'; }}
                                                />
                                            ) : (
                                                <User size={18} color="#94a3b8" />
                                            )}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '0.95rem' }}>{apt.clientName}</div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{apt.serviceType || 'Tattoo Session'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                                        <span className={`badge status-${getStatusColor(apt.status)}`} style={{ padding: '4px 8px', fontSize: '0.75rem' }}>
                                            {apt.status}
                                        </span>
                                        <span style={{ color: '#6366f1', fontWeight: '600', fontSize: '0.85rem' }}>{apt.start_time || apt.time}</span>
                                    </div>
                                </div>
                            ))}
                            {getAppointmentsForDate(selectedDay || 1).length === 0 && (
                                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem 1rem', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                                    <Calendar size={32} color="#cbd5e1" style={{ margin: '0 auto 10px' }} />
                                    No appointments scheduled for this date.
                                </div>
                            )}
                        </div>
                        <div className="day-view-footer">
                            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => {
                                handleAddNew(`${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDay || 1).padStart(2, '0')}`);
                            }}>
                                <Plus size={16} style={{ marginRight: '6px' }} /> Add Appointment
                            </button>
                        </div>
                    </div>
                    </div>
                ) : (
                    <>
                        <div className="premium-filter-bar premium-filter-bar--stacked" style={{ margin: '0 0 2rem 0' }}>
                            <div className="premium-search-box premium-search-box--full" style={{ position: 'relative' }}>
                                <Search size={16} className="text-muted" />
                                <input
                                    type="text"
                                    list="search-suggestions-appointments"
                                    placeholder="Search appointments by ID, client, or artist..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{ width: '100%', paddingRight: '120px' }}
                                    maxLength={100}
                                />
                                <datalist id="search-suggestions-appointments">
                                    {searchSuggestions.map(suggestion => (
                                        <option key={suggestion} value={suggestion} />
                                    ))}
                                </datalist>
                                {(searchTerm || statusFilter !== 'all' || serviceFilter !== 'all' || dateFilter) && (
                                    <button
                                        onClick={() => {
                                            setSearchTerm('');
                                            setQuickFilter('all');
                                            setStatusFilter('all');
                                            setServiceFilter('all');
                                            setDateFilter('');
                                        }}
                                        className="btn btn-secondary"
                                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', padding: '4px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                    >
                                        <X size={12} /> Clear Filters
                                    </button>
                                )}
                            </div>

                            <div className="premium-filters-row">
                                <div className="premium-filter-item">
                                    <Filter size={16} />
                                    <span>Filter:</span>
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="premium-select-v2"
                                    >
                                        <option value="all">All Status</option>
                                        <option value="confirmed">Confirmed</option>
                                        <option value="scheduled">Scheduled</option>
                                        <option value="pending">Pending</option>
                                        <option value="completed">Completed</option>
                                        <option value="cancelled">Cancelled</option>
                                        <option value="rejected">Rejected</option>
                                    </select>
                                </div>

                                <div className="premium-filter-item">
                                    <select
                                        value={serviceFilter}
                                        onChange={(e) => setServiceFilter(e.target.value)}
                                        className="premium-select-v2"
                                    >
                                        <option value="all">All Services</option>
                                        <option value="Tattoo Session">Tattoo Session</option>
                                        <option value="Consultation">Consultation</option>
                                        <option value="Piercing">Piercing</option>
                                        <option value="Follow-up">Follow-up</option>
                                        <option value="Touch-up">Touch-up</option>
                                    </select>
                                </div>

                                <div className="premium-filter-item">
                                    <Calendar size={16} />
                                    <input
                                        type="date"
                                        value={dateFilter}
                                        onChange={(e) => setDateFilter(e.target.value)}
                                        className="premium-select-v2"
                                        style={{ height: '38px', padding: '0 12px' }}
                                    />
                                </div>

                                <div className="premium-filter-item">
                                    <SlidersHorizontal size={16} />
                                    <span>Sort:</span>
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
                                                    <td>
                                                        <span style={{ fontFamily: 'monospace', fontWeight: '600', color: '#1e293b' }}>
                                                            {getDisplayCode(appointment.bookingCode, appointment.id)}
                                                        </span>
                                                    </td>
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
                                                                <span className="badge admin-st-4a6cc9f0">Balance: ₱{(appointment.price - appointment.totalPaid).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                            ) : (
                                                                <span className="badge admin-st-07684bc7">Unpaid</span>
                                                            )
                                                        ) : (
                                                            <span className="badge admin-st-2d1fd819">No Charge</span>
                                                        )}
                                                    </td>
                                                    <td>₱{Number(appointment.price).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
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
                                        <h2 className="admin-m-0">{selectedAppointment ? `Edit Appointment ${getDisplayCode(selectedAppointment.bookingCode, selectedAppointment.id)}` : 'New Appointment'}</h2>
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
                                                <PhilippinePeso size={16} /> Pricing
                                            </button>
                                            <button
                                                className={`modal-tab-btn ${modalTab === 'notes' ? 'active' : ''}`}
                                                onClick={() => setModalTab('notes')}
                                            >
                                                <FileText size={16} /> Session Log
                                            </button>
                                        </div>
                                    </div>
                                    <div className="admin-st-f21b09cf">
                                        <span className={`badge status-${getStatusColor(formData.status)}`}>{formData.status}</span>
                                        {selectedAppointment && selectedAppointment.price > 0 && (
                                            <div className="badge admin-st-d2713882">
                                                <span>Paid: ₱{Number(selectedAppointment.totalPaid).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / ₱{Number(formData.price).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                {selectedAppointment.totalPaid < formData.price && (
                                                    <span className="admin-st-14a76a5d">(Bal: ₱{(Number(formData.price) - Number(selectedAppointment.totalPaid)).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <button className="close-btn" onClick={closeModal}><X size={24} /></button>
                            </div>
                            <div className="modal-body">
                                {modalTab === 'details' && (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
                                        {/* Left Column: People & Service */}
                                        <div className="admin-st-d295c8d6">
                                            <div>
                                                <label className="premium-input-label">Client Information</label>
                                                {formData.clientId ? (
                                                    <div className="admin-st-013bb379" style={{ padding: '12px', alignItems: 'center' }}>
                                                        <div className="admin-st-b0dbc89c" style={{ gap: '16px' }}>
                                                            {selectedAppointment && selectedAppointment.clientAvatar ? (
                                                                <div style={{
                                                                    width: '64px', height: '64px', borderRadius: '50%',
                                                                    backgroundColor: '#f1f5f9', overflow: 'hidden',
                                                                    border: '3px solid white', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                                                }}>
                                                                    <img src={selectedAppointment.clientAvatar} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                </div>
                                                            ) : (
                                                                <div style={{
                                                                    width: '64px', height: '64px', borderRadius: '50%',
                                                                    backgroundColor: '#f1f5f9', overflow: 'hidden',
                                                                    border: '3px solid white', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                                                }}>
                                                                    <User size={32} color="#10b981" />
                                                                </div>
                                                            )}
                                                            <span className="admin-st-0e40c814" style={{ fontSize: '1.2rem', fontWeight: '600' }}>
                                                                {clients.find(c => c.id == formData.clientId)?.name || clientSearch}
                                                            </span>
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
                                                                maxLength={100}
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
                                                <label className="premium-input-label">Service Details</label>
                                                <div className="admin-st-efc8b70e">
                                                    <div className="admin-st-fefecdf0">
                                                        <div className="premium-input-group">
                                                            <label className="admin-st-b8618eb2">Service Type *</label>
                                                            <select value={formData.serviceType} onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })} className="premium-select-v2">
                                                                <option value="Tattoo Session">Tattoo Session</option>
                                                                <option value="Consultation">Consultation</option>
                                                                <option value="Piercing">Piercing</option>
                                                                <option value="Tattoo + Piercing">Tattoo + Piercing</option>
                                                                <option value="Touch-up">Touch-up</option>
                                                            </select>
                                                        </div>
                                                        <div className="premium-input-group">
                                                            <label className="admin-st-b8618eb2">Design / Idea</label>
                                                            <input type="text" value={formData.designTitle} onChange={(e) => setFormData({ ...formData, designTitle: filterName(e.target.value).slice(0, 50) })} maxLength={50} className="premium-input-v2" placeholder="e.g. Neo-Trad" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Column 2: Staff & Schedule */}
                                        <div className="admin-st-d295c8d6">
                                            <div>
                                                <label className="premium-input-label">Staff Assignment</label>
                                                {(() => {
                                                    const isDualService = formData.serviceType === 'Tattoo + Piercing';
                                                    const isDualConsultation = formData.serviceType === 'Consultation' && (formData.notes || '').toLowerCase().includes('piercing');
                                                    const requiresDualStaff = isDualService || isDualConsultation;
                                                    const primaryLabel = isDualService
                                                        ? <span>Tattoo Staff <span style={{ color: '#ef4444' }}>*</span></span>
                                                        : <span>Primary Staff <span style={{ color: '#ef4444' }}>*</span></span>;
                                                    const secondaryLabel = requiresDualStaff
                                                        ? <span>Secondary Staff <span style={{ color: '#ef4444' }}>*</span></span>
                                                        : 'Secondary Staff';
                                                    return (
                                                <div className="admin-st-efc8b70e">
                                                    <div className="admin-st-fefecdf0">
                                                        <div className="premium-input-group">
                                                            <label className="admin-st-b8618eb2">{primaryLabel}</label>
                                                            <select value={formData.artistId} onChange={(e) => setFormData({ ...formData, artistId: e.target.value })} className="premium-select-v2">
                                                                <option value="">Select Staff</option>
                                                                {artists.map(a => <option key={a.id} value={a.id}>{a.name}{a.specialization ? ` — ${a.specialization}` : ''}</option>)}
                                                            </select>
                                                        </div>
                                                        <div className="premium-input-group">
                                                            <label className="admin-st-b8618eb2">
                                                                {secondaryLabel}
                                                                {selectedAppointment?.status === 'completed' && <span style={{ fontSize: '0.7rem', color: '#94a3b8', marginLeft: '6px' }}>(Locked)</span>}
                                                            </label>
                                                            <select value={formData.secondaryArtistId || ''} onChange={(e) => setFormData({ ...formData, secondaryArtistId: e.target.value })} className="premium-select-v2" disabled={selectedAppointment?.status === 'completed'}
                                                                style={requiresDualStaff && !formData.secondaryArtistId ? { borderColor: '#f59e0b', boxShadow: '0 0 0 2px rgba(245,158,11,0.15)' } : {}}
                                                            >
                                                                <option value="">{requiresDualStaff ? 'Select Staff (Required)' : 'None (Solo)'}</option>
                                                                {artists.map(a => <option key={a.id} value={a.id}>{a.name}{a.specialization ? ` — ${a.specialization}` : ''}</option>)}
                                                            </select>
                                                            {requiresDualStaff && (
                                                                <span style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 600, marginTop: '4px', display: 'block' }}>
                                                                    ⚠ Dual topic selected
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {formData.secondaryArtistId && formData.serviceType !== 'Consultation' && (
                                                        <div className="admin-st-953ba7ac">
                                                            <label className="admin-st-15b3be7e">Split % (Pri/Sec):</label>
                                                            <input type="number" min="1" max="99" value={formData.commissionSplit} onChange={(e) => setFormData({ ...formData, commissionSplit: clampNumber(e.target.value, 1, 99) })} className="premium-input-v2 admin-st-e070afd8" disabled={selectedAppointment?.status === 'completed'} />
                                                            <span className="admin-st-7206c648">/ {100 - (formData.commissionSplit || 0)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                    );
                                                })()}
                                            </div>

                                            {!selectedAppointment && (
                                                <div>
                                                    <label className="premium-input-label">Booking Date & Time</label>
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
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Column 3: Status */}
                                        <div className="admin-st-d295c8d6">
                                            <div>
                                                <label className="premium-input-label">Booking Status</label>
                                                <div className="admin-st-efc8b70e">
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
                                                    {formData.status === 'rejected' && (
                                                        <div className="premium-input-group" style={{ marginTop: '12px' }}>
                                                            <label className="admin-st-b8618eb2">Rejection Reason</label>
                                                            <textarea
                                                                className="premium-input-v2"
                                                                style={{ minHeight: '80px', resize: 'vertical' }}
                                                                maxLength="500"
                                                                value={formData.rejectionReason || ''}
                                                                onChange={(e) => setFormData({ ...formData, rejectionReason: e.target.value })}
                                                                placeholder="Please provide a reason for rejecting this appointment (Sent to customer)"
                                                            />
                                                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', textAlign: 'right', marginTop: '4px' }}>
                                                                {formData.rejectionReason ? formData.rejectionReason.length : 0}/500 characters
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                )}
                                {modalTab === 'pricing' && (
                                    /* Pricing Tab View */
                                    <div className="fade-in admin-st-9628d1ce">
                                        <div className="admin-st-dd4f6313">
                                            <div className="admin-st-e5b0a825">
                                                <div className="form-group">
                                                    <label className="admin-st-6ad161f7">Total Quote (₱) *</label>
                                                    <input 
                                                        type="text" 
                                                        inputMode="numeric"
                                                        value={formData.price === 0 || formData.price === '0' ? '' : formData.price} 
                                                        onChange={(e) => {
                                                            const raw = e.target.value.replace(/[^0-9]/g, '');
                                                            setFormData({ ...formData, price: raw === '' ? 0 : Number(raw) });
                                                        }} 
                                                        placeholder="e.g. 5000"
                                                        className="premium-input-v2 admin-st-1a49bbe7" 
                                                    />
                                                    {formData.price > 0 && formData.price < 5000 && (
                                                        <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>Minimum quote for tattoo sessions is ₱5,000</span>
                                                    )}
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
                                                        <span className="admin-st-3947f0f7">₱{Number(selectedAppointment.totalPaid).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                    </div>
                                                    <div className="admin-st-ddde571d">
                                                        <span className="admin-st-9e124000">Remaining Balance:</span>
                                                        <span className="admin-st-da5d65cf">₱{Math.max(0, Number(formData.price) - Number(selectedAppointment.totalPaid)).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
                                                            showAlert('Payment Link Sent', `A digital payment checkout link for ₱${formData.price.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} has been routed to the client.`, 'success');
                                                        }}
                                                    >
                                                        <CreditCard size={20} /> Request Digital Payment
                                                    </button>
                                                )}

                                                {selectedAppointment && (
                                                    <button className="btn btn-primary admin-st-f9f5beee" onClick={() => setManualPaymentModal({ isOpen: true, amount: Math.max(0, formData.price - selectedAppointment.totalPaid), method: 'Cash' })}>
                                                        <PhilippinePeso size={20} /> Record Manual Payment
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {modalTab === 'notes' && (
                                    /* Session Log Tab View */
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
                                        {/* Left Column: Session Summary & Notes */}
                                        <div className="admin-st-d295c8d6">
                                            <div>
                                                <label className="admin-st-739a1b05">Session Details Summary</label>
                                                <div className="admin-st-ae64ad42">
                                                    <div className="admin-flex-between">
                                                        <span className="admin-st-26b52dcd">Client:</span>
                                                        <span className="admin-st-0e40c814">
                                                            {formData.clientId
                                                                ? (clients.find(c => c.id == formData.clientId)?.name || clientSearch || 'Selected')
                                                                : <span style={{ color: '#94a3b8', fontWeight: 500, fontStyle: 'italic' }}>Not assigned yet</span>
                                                            }
                                                        </span>
                                                    </div>
                                                    <div className="admin-flex-between">
                                                        <span className="admin-st-26b52dcd">Artist:</span>
                                                        <span className="admin-st-0e40c814">
                                                            {formData.artistId
                                                                ? (artists.find(a => String(a.id) === String(formData.artistId))?.name || 'Assigned')
                                                                : <span style={{ color: '#94a3b8', fontWeight: 500, fontStyle: 'italic' }}>Not assigned yet</span>
                                                            }
                                                        </span>
                                                    </div>
                                                    <div className="admin-flex-between">
                                                        <span className="admin-st-26b52dcd">Service Type:</span>
                                                        <span className="admin-st-0e40c814">{formData.serviceType || <span style={{ color: '#94a3b8', fontWeight: 500, fontStyle: 'italic' }}>Not selected</span>}</span>
                                                    </div>
                                                    <div className="admin-flex-between">
                                                        <span className="admin-st-26b52dcd">Design / Idea:</span>
                                                        <span className="admin-st-0e40c814">{formData.designTitle || <span style={{ color: '#94a3b8', fontWeight: 500, fontStyle: 'italic' }}>N/A</span>}</span>
                                                    </div>
                                                    <div className="admin-flex-between">
                                                        <span className="admin-st-26b52dcd">Scheduled For:</span>
                                                        <span className="admin-st-afc165d9">
                                                            {formData.date
                                                                ? `${formData.date}${formData.time ? ` at ${formData.time}` : ''}`
                                                                : <span style={{ color: '#94a3b8', fontWeight: 500, fontStyle: 'italic' }}>No date set</span>
                                                            }
                                                        </span>
                                                    </div>
                                                    <div className="admin-flex-between">
                                                        <span className="admin-st-26b52dcd">Status:</span>
                                                        <span className={`badge status-${getStatusColor(formData.status)}`} style={{ fontSize: '0.8rem' }}>{formData.status || 'pending'}</span>
                                                    </div>
                                                    {formData.price > 0 && (
                                                        <div className="admin-flex-between">
                                                            <span className="admin-st-26b52dcd">Price:</span>
                                                            <span className="admin-st-0e40c814">₱{Number(formData.price).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div>
                                                <label className="admin-st-739a1b05">Internal Session Notes</label>
                                                <textarea
                                                    value={formData.notes || ''}
                                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                                    className="premium-input-v2"
                                                    style={{ minHeight: '120px', resize: 'vertical' }}
                                                    maxLength={1000}
                                                    placeholder={selectedAppointment
                                                        ? "Add detailed internal notes, placement instructions, or specific client requests..."
                                                        : "Add any notes about this new appointment — placement preferences, client requests, design specifics, scheduling notes, etc."
                                                    }
                                                />
                                            </div>
                                        </div>

                                        {/* Middle Column: Project Session History */}
                                        <div className="admin-st-d295c8d6">
                                            <div className="admin-w-full">
                                                <h4 className="admin-st-739a1b05" style={{ margin: 0, marginBottom: '12px' }}>
                                                    Project Session History
                                                </h4>
                                                {(selectedAppointment && formData.designTitle) ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    {appointments.filter(a => a.customer_id === selectedAppointment.customer_id && a.design_title === formData.designTitle)
                                                        .sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date))
                                                        .map((session, idx) => (
                                                            <div key={session.id} style={{ display: 'flex', flexDirection: 'column', padding: '10px 14px', borderRadius: '8px', background: session.id === selectedAppointment.id ? '#eff6ff' : '#f8fafc', border: `1px solid ${session.id === selectedAppointment.id ? '#bfdbfe' : '#e2e8f0'}` }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                                                    <span style={{ fontWeight: session.id === selectedAppointment.id ? '700' : '600', color: session.id === selectedAppointment.id ? '#2563eb' : '#475569', fontSize: '0.95rem' }}>Session {idx + 1}</span>
                                                                    <span className={`badge status-${session.status.toLowerCase() === 'completed' ? 'active' : session.status.toLowerCase() === 'pending' ? 'pending' : 'expired'}`} style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
                                                                        {session.status}
                                                                    </span>
                                                                </div>
                                                                <div style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                    <Calendar size={12} />
                                                                    {new Date(session.appointment_date).toLocaleDateString()} at {session.start_time}
                                                                </div>
                                                            </div>
                                                        ))}
                                                </div>
                                                ) : (
                                                    <div className="admin-st-28e6a799">
                                                        <Clock size={40} className="admin-st-04217666" style={{ marginBottom: '8px', opacity: 0.5 }} />
                                                        <p style={{ margin: '0 0 4px 0', fontWeight: 600, color: '#94a3b8' }}>No session history</p>
                                                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1', textAlign: 'center' }}>
                                                            Save this appointment with a design title to track its multiphase session history here.
                                                        </p>
                                                    </div>
                                                )}
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

                                                    {/* After Photo */}
                                                    {selectedAppointment?.afterPhoto ? (
                                                        <div style={{ width: '100%', borderTop: '1px dashed #e2e8f0', paddingTop: '20px' }}>
                                                            <label className="admin-st-e7eee706">Result Photo (After)</label>
                                                            <img
                                                                src={selectedAppointment.afterPhoto}
                                                                alt="After"
                                                                className="admin-st-ab1ba3de"
                                                            />
                                                        </div>
                                                    ) : null}

                                                    {!(formData.referenceImage || selectedAppointment?.referenceImage || formData.beforePhoto || selectedAppointment?.beforePhoto || selectedAppointment?.afterPhoto) && (
                                                        <div className="admin-st-28e6a799">
                                                            <Image size={48} className="admin-st-04217666" />
                                                            <p style={{ margin: '0 0 4px 0', fontWeight: 600, color: '#94a3b8' }}>No reference images</p>
                                                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1' }}>
                                                                {selectedAppointment
                                                                    ? 'No images were attached to this appointment.'
                                                                    : 'Reference images can be attached by clients during booking or added later.'
                                                                }
                                                            </p>
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
                                                {formData.status === 'confirmed' && (
                                                <button
                                                    type="button"
                                                    className="btn"
                                                    onClick={() => {
                                                        setRescheduleModal({
                                                            isOpen: true,
                                                            date: formData.date || '',
                                                            time: formData.time || '',
                                                            reason: ''
                                                        });
                                                    }}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fef3c7', color: '#92400e', borderColor: '#fcd34d' }}
                                                >
                                                    <Calendar size={16} /> Reschedule
                                                </button>
                                                )}

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


            </div>

            
            {/* Reschedule Modal */}
            {rescheduleModal.isOpen && (
                <div className="modal-overlay admin-st-032d51d4" onClick={() => setRescheduleModal({ ...rescheduleModal, isOpen: false })}>
                    <div className="modal-content premium-modal admin-st-eabe81b2" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Reschedule Session</h3>
                            <button className="close-btn" onClick={() => setRescheduleModal({ ...rescheduleModal, isOpen: false })}><X size={20} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="premium-input-group">
                                <label className="admin-st-b8618eb2">New Date</label>
                                <input type="date" value={rescheduleModal.date} onChange={e => setRescheduleModal({ ...rescheduleModal, date: e.target.value })} className="premium-input-v2" />
                            </div>
                            <div className="premium-input-group" style={{ marginTop: '16px' }}>
                                <label className="admin-st-b8618eb2">New Time</label>
                                <input type="time" value={rescheduleModal.time} onChange={e => setRescheduleModal({ ...rescheduleModal, time: e.target.value })} className="premium-input-v2" />
                            </div>
                            <div className="premium-input-group" style={{ marginTop: '16px' }}>
                                <label className="admin-st-b8618eb2">Reason for Reschedule (Optional)</label>
                                <textarea
                                    className="premium-input-v2"
                                    value={rescheduleModal.reason}
                                    onChange={e => setRescheduleModal({ ...rescheduleModal, reason: e.target.value })}
                                    placeholder="Explain to the customer why the schedule is changed..."
                                    rows="3"
                                    maxLength={500}
                                    style={{ resize: 'vertical', minHeight: '80px' }}
                                ></textarea>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-primary" onClick={handleConfirmReschedule} style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                                <Calendar size={18} /> Confirm Reschedule
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            <ConfirmModal
                {...confirmDialog}
                onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
            />
        </div>
    );
}

export default AdminAppointments;
