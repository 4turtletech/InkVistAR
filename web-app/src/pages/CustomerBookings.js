import './CustomerStyles.css';
import React, { useState, useEffect, lazy, Suspense, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Axios from 'axios';
import { Search, ChevronLeft, ChevronRight, Filter, CreditCard, Eye, CheckCircle, Info, X, Calendar, Inbox, Plus, Upload, Camera, Image as ImageIcon, User, Scissors, Heart, Sparkles, Check, ArrowRight, ArrowLeft, MapPin, Receipt, CalendarDays, Clock, AlertTriangle, RotateCcw, PlusCircle, History, MessageSquare, Paintbrush, Gem, Video, Users } from 'lucide-react';
import './PortalStyles.css';
import { API_URL } from '../config';
import CustomerSideNav from '../components/CustomerSideNav';
import Pagination from '../components/Pagination';
import ConfirmModal from '../components/ConfirmModal';
import { getDisplayCode } from '../utils/formatters';
const BodyModelViewer = lazy(() => import('../components/BodyModelViewer'));

function CustomerBookings(){
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('upcoming');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const navigate = useNavigate();
    const location = useLocation();
    const user = JSON.parse(localStorage.getItem('user'));
    const customerId = user ? user.id : null;

    // New Booking Form States
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const [bookingStep, setBookingStep] = useState(1);
    const [artists, setArtists] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [studioCapacity, setStudioCapacity] = useState(1);
    const [bookedDates, setBookedDates] = useState({});
    const [completedAppointments, setCompletedAppointments] = useState([]);
    const [migrationModal, setMigrationModal] = useState({ show: false, count: 0 });
    
    const placementNotesRef = useRef(null);
    const [bookingData, setBookingData] = useState({
        artistId: null,
        bookingType: '', // 'new' or 'followup'
        selectedServices: [], // e.g. ['Tattoo Session', 'Piercing']
        followupAppointmentId: null,
        date: '',
        startTime: '',
        designTitle: '',
        placement: [],
        piercingPlacement: [],
        consultationFor: [], // ['tattoo','piercing'] — only used when service is Consultation
        consultationMethod: 'Face-to-Face', // 'Face-to-Face' or 'Online'
        onlinePlatform: '', // 'Messenger' or 'Instagram'
        placementNotes: '',
        notes: '',
        referenceImage: null,
    });

    const [errors, setErrors] = useState({});

    const validateBookingField = (name, value, currentData = bookingData) => {
        let errorMsg = '';
        if (name === 'designTitle') {
            if (value.trim().length > 0 && value.trim().length < 3) errorMsg = 'Design title must be at least 3 characters.';
            else if (value.trim().length > 100) errorMsg = 'Design title cannot exceed 100 characters.';
        }
        if (name === 'notes') {
            if (value.trim().length > 2000) errorMsg = 'Notes cannot exceed 2000 characters.';
        }
        if (name === 'placementNotes') {
            const hasOtherPlacement = (currentData.placement && currentData.placement.includes('Other')) || 
                                      (currentData.piercingPlacement && currentData.piercingPlacement.includes('Other'));
            if (hasOtherPlacement && value.trim().length === 0) {
                errorMsg = 'Please specify the exact location in the notes field.';
            } else if (value.trim().length > 200) {
                errorMsg = 'Placement notes cannot exceed 200 characters.';
            }
        }

        setErrors(prev => ({ ...prev, [name]: errorMsg }));
        return !errorMsg;
    };

    const handleBookingFormChange = (e) => {
        const { name, value } = e.target;
        const newData = { ...bookingData, [name]: value };
        setBookingData(newData);
        validateBookingField(name, value, newData);
    };

    // Derive the composite serviceType string from selectedServices for backend compatibility
    const getDerivedServiceType = (services) => {
        if (!services || services.length === 0) return '';
        if (services.includes('Tattoo Session') && services.includes('Piercing')) return 'Tattoo + Piercing';
        return services[0]; // Single service
    };

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalTab, setModalTab] = useState('details');
    const [selectedApt, setSelectedApt] = useState(null);
    const [modalTransactions, setModalTransactions] = useState([]);
    const [modalLoading, setModalLoading] = useState(false);
    const [showAftercare, setShowAftercare] = useState(false);
    const [confirmModal, setConfirmModal] = useState({ 
        isOpen: false, 
        title: '', 
        message: '', 
        onConfirm: null, 
        type: 'danger',
        isAlert: false 
    });

    // Reschedule states
    const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
    const [rescheduleDate, setRescheduleDate] = useState('');
    const [rescheduleTime, setRescheduleTime] = useState('');
    const [rescheduleMonth, setRescheduleMonth] = useState(new Date());
    const [isRescheduling, setIsRescheduling] = useState(false);
    const [rescheduleReason, setRescheduleReason] = useState('');
    const [rescheduleReasonText, setRescheduleReasonText] = useState('');
    const [showRescheduleConfirm, setShowRescheduleConfirm] = useState(false);

    // Cancellation states
    const [cancelModal, setCancelModal] = useState({ isOpen: false, appointmentId: null, reason: '' });
    const [isCancelling, setIsCancelling] = useState(false);

    const showAlert = (title, message, type = 'info') => {
        setConfirmModal({
            isOpen: true,
            title,
            message,
            type,
            isAlert: true,
            onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
        });
    };

    // Check for migrated guest appointments on first load
    useEffect(() => {
        const migratedCount = localStorage.getItem('migratedAppointments');
        if (migratedCount && parseInt(migratedCount) > 0) {
            setMigrationModal({ show: true, count: parseInt(migratedCount) });
            localStorage.removeItem('migratedAppointments');
        }
    }, []);

    useEffect(() => {
        const fetchArtists = async () => {
            try {
                const res = await Axios.get(`${API_URL}/api/customer/artists`);
                if (res.data.success) setArtists(res.data.artists);
            } catch (e) { console.error("Error fetching artists:", e); }
        };
        const fetchAvailability = async () => {
            try {
                const response = await Axios.get(`${API_URL}/api/public/calendar-availability`);
                if (response.data.success) {
                    setStudioCapacity(response.data.totalArtists || 1);
                    const bookings = {};
                    response.data.bookings.forEach(b => {
                        const dateStr = typeof b.appointment_date === 'string' 
                            ? b.appointment_date.substring(0, 10) 
                            : new Date(b.appointment_date).toISOString().split('T')[0];
                        if (!bookings[dateStr]) bookings[dateStr] = { consultationTimes: [], piercingTimes: [], sessionCount: 0 };
                        const sType = (b.service_type || '').toLowerCase();
                        if (sType === 'consultation') {
                            if (b.start_time) bookings[dateStr].consultationTimes.push(b.start_time.substring(0, 5));
                        } else if (sType === 'piercing') {
                            if (b.start_time) bookings[dateStr].piercingTimes.push(b.start_time.substring(0, 5));
                        } else if (sType === 'tattoo + piercing') {
                            // Bundle: consumes from both tattoo AND piercing pools
                            bookings[dateStr].sessionCount += 1;
                            if (b.start_time) bookings[dateStr].piercingTimes.push(b.start_time.substring(0, 5));
                        } else {
                            // Tattoo Session, Follow-up, Touch-up
                            bookings[dateStr].sessionCount += 1;
                        }
                    });
                    setBookedDates(bookings);
                }
            } catch (error) {
                console.error('Error fetching availability:', error);
            }
        };

        fetchArtists();
        fetchAvailability();

        // Handle auto-open from Gallery
        if (location.state?.autoOpenBooking) {
            setBookingData(prev => ({ ...prev, designTitle: location.state.designTitle || '' }));
            setIsBookingModalOpen(true);
        }
    }, [location.state]);

    useEffect(() => {
        const fetchAppointments = async () => {
            if (!customerId) {
                setLoading(false);
                return;
            }
            setLoading(true);
            try{
                const res = await Axios.get(`${API_URL}/api/customer/${customerId}/appointments`);
                if (res.data.success) {
                    // Ensure price is parsed as a number
                    const formattedAppointments = (res.data.appointments || []).map(appt => ({
                        ...appt,
                        price: parseFloat(appt.price) || 0
                    }));
                    setAppointments(formattedAppointments);
                } else {
                    showAlert("Fetch Error", 'Could not fetch your bookings: ' + res.data.message, "danger");
                }
            } catch(e){ 
                console.error("Error fetching bookings:", e.response || e);
                showAlert("Connection Error", 'Failed to connect to the server while fetching bookings. Please try again later.', "danger");
            } finally {
                setLoading(false);
            }
        };
        fetchAppointments();
    }, [customerId]);



    // Filter Logic
    const filteredAppointments = appointments.filter(apt => {
        const displayCode = getDisplayCode(apt.booking_code, apt.id);
        const matchesSearch = displayCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              (apt.booking_code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                              (apt.design_title || '').toLowerCase().includes(searchTerm.toLowerCase());
                              
        let matchesStatus = false;
        const status = (apt.status || '').toLowerCase();
        if (statusFilter === 'all') {
            matchesStatus = true;
        } else if (statusFilter === 'upcoming') {
            matchesStatus = ['pending', 'confirmed', 'in_progress', 'scheduled'].includes(status);
        } else if (statusFilter === 'history') {
            matchesStatus = ['completed', 'finished', 'cancelled', 'rejected'].includes(status);
        } else {
            matchesStatus = status === statusFilter.toLowerCase();
        }
        
        return matchesSearch && matchesStatus;
    }).sort((a, b) => b.id - a.id); // Default to most recently added (highest ID)

    // Pagination Logic
    const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);
    const displayedAppointments = filteredAppointments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handlePay = (appointment, type = 'deposit') => {
        if (!appointment.price || appointment.price <= 0) {
            showAlert("Quotation Pending", "Price has not been set by the studio yet. Please wait for confirmation.", "info");
            return;
        }
        const remainingBalance = appointment.price - (appointment.total_paid || 0);
        navigate(`/pay-mongo?appointmentId=${appointment.id}&price=${appointment.price}`, { 
            state: { 
                appointmentId: appointment.id, 
                price: appointment.price,
                remainingBalance: remainingBalance,
                type: type,
                serviceType: appointment.service_type || 'Tattoo Session',
                bookingCode: appointment.booking_code
            } 
        });
    };

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const appointmentId = params.get('appointment');
        if (appointmentId && appointments.length > 0) {
            const target = appointments.find(a => a.id.toString() === appointmentId);
            if (target) {
                handleViewDetails(target);
                window.history.replaceState({}, '', '/customer/bookings');
            }
        }
    }, [appointments]);

    const handleViewDetails = async (appt) => {
        setSelectedApt(appt);
        setModalTab('details');
        setIsModalOpen(true);
        setModalLoading(true);
        try {
            const res = await Axios.get(`${API_URL}/api/appointments/${appt.id}/transactions`);
            if (res.data.success) {
                setModalTransactions(res.data.transactions || []);
            }
        } catch (e) {
            console.error("Error fetching transactions:", e);
        } finally {
            setModalLoading(false);
        }
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                showAlert('Validation Error', 'Only image files are allowed.', 'warning');
                return;
            }
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                showAlert('Validation Error', 'Upload failed. File size must be under 5MB.', 'warning');
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setBookingData({ ...bookingData, referenceImage: reader.result });
            };
            reader.readAsDataURL(file);
        }
    };

    // Calendar Logic
    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const renderCalendarDays = () => {
        const days = [];
        const today = new Date();
        today.setHours(0,0,0,0);

        const maxDate = new Date();
        maxDate.setMonth(today.getMonth() + 3);
        maxDate.setHours(23, 59, 59, 999);

        // Only block dates where the customer has a PENDING tattoo-type appointment.
        // Consultations & piercings use time slots, so they don't block the whole date.
        const myTattooBlockedDates = new Set();
        const tattooTypeServices = ['tattoo session', 'tattoo + piercing'];
        appointments.forEach(a => {
            if (['pending'].includes(a.status)) {
                const sType = (a.service_type || '').toLowerCase();
                if (tattooTypeServices.includes(sType)) {
                    const d = typeof a.appointment_date === 'string' 
                        ? a.appointment_date.substring(0, 10) 
                        : new Date(a.appointment_date).toISOString().split('T')[0];
                    myTattooBlockedDates.add(d);
                }
            }
        });

        for (let i = 0; i < firstDayOfMonth; i++) days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
        
        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const dateObj = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i);
            const isSelected = bookingData.date === dateStr;
            const isPast = dateObj <= today;
            const isTooFar = dateObj > maxDate;

            // For tattoo-type services, block if customer already has a pending tattoo on this date
            // For consultation/piercing, never block the whole date (time slot picker handles it)
            const selectedService = getDerivedServiceType(bookingData.selectedServices).toLowerCase();
            const isSlotBasedService = ['consultation', 'piercing'].includes(selectedService);
            const hasMySession = !isSlotBasedService && myTattooBlockedDates.has(dateStr);

            const dateData = bookedDates[dateStr] || { consultationTimes: [], piercingTimes: [], sessionCount: 0 };

            // Dynamic evaluation based on selected service type — three independent pools
            let isFull = false;
            let isBusy = false;

            if (selectedService === 'consultation') {
                // Consultation pool: 7 time slots (1PM–7PM)
                const slotsTaken = dateData.consultationTimes.length;
                isFull = slotsTaken >= 7;
                isBusy = slotsTaken >= 5;
            } else if (selectedService === 'piercing') {
                // Piercing pool: 7 time slots (1PM–7PM)
                const slotsTaken = dateData.piercingTimes.length;
                isFull = slotsTaken >= 7;
                isBusy = slotsTaken >= 1; // Show as limited if any slot is taken
            } else if (selectedService === 'tattoo + piercing') {
                // Bundle: must check BOTH tattoo pool AND piercing pool
                const tattooFull = dateData.sessionCount >= studioCapacity;
                const piercingFull = dateData.piercingTimes.length >= 7;
                isFull = tattooFull || piercingFull;
                isBusy = dateData.sessionCount >= Math.max(1, studioCapacity - 1) || dateData.piercingTimes.length >= 5;
            } else if (selectedService) {
                // Tattoo Session, Follow-up, Touch-up: artist capacity pool
                isFull = dateData.sessionCount >= studioCapacity;
                isBusy = dateData.sessionCount >= Math.max(1, studioCapacity - 1);
            }
            // If no service selected yet, show all dates as available (no blocking)

            const isDisabled = isPast || isTooFar || hasMySession || isFull;

            let bgColor = 'white';
            let textColor = '#1e293b';
            let borderColor = '#e2e8f0';

            if (isPast || isTooFar) {
                bgColor = '#f8fafc';
                textColor = '#cbd5e1';
                borderColor = 'transparent';
            } else if (hasMySession || isFull) {
                bgColor = '#fee2e2';
                textColor = '#991b1b';
                borderColor = '#fecaca';
            } else if (isBusy) {
                bgColor = '#fef9c3';
                textColor = '#854d0e';
                borderColor = '#fde68a';
            } else {
                bgColor = '#dcfce7';
                textColor = '#166534';
                borderColor = '#bbf7d0';
            }

            if (isSelected) {
                borderColor = '#be9055';
            }

            days.push(
                <div 
                    className={`calendar-day ${isDisabled ? 'disabled' : ''} ${isSelected ? 'selected' : ''}`} 
                    key={i}
                    style={{ backgroundColor: bgColor, color: textColor, border: isSelected ? '2px solid #be9055' : `1px solid ${borderColor}`, opacity: isPast || isTooFar ? 0.4 : (hasMySession || isFull ? 0.65 : 1), boxShadow: isSelected ? '0 0 0 3px rgba(193, 154, 107, 0.2)' : 'none' }}
                    onClick={() => { 
                        if (isDisabled) { 
                            if (hasMySession) {
                                showAlert("Date Unavailable", "You already have a session booked on this date. Please choose another date.", "warning"); 
                            } else if (isFull) { 
                                showAlert("Fully Booked", "This date is fully booked. Please choose another date.", "warning"); 
                            }
                            return; 
                        } 
                        setBookingData({...bookingData, date: dateStr, startTime: ''}); 
                    }} 
                >
                    <span style={{ fontWeight: isSelected ? '700' : '500' }}>{i}</span>
                </div>
            );
        }
        return days;
    };

    const closeBookingModal = () => {
        setIsBookingModalOpen(false);
        setBookingData({ artistId: null, bookingType: '', selectedServices: [], followupAppointmentId: null, date: '', startTime: '', designTitle: '', placement: [], piercingPlacement: [], consultationFor: [], placementNotes: '', notes: '', referenceImage: null });
        setErrors({});
        setBookingStep(1);
    };

    const fetchCompletedAppointments = async () => {
        try {
            const res = await Axios.get(`${API_URL}/api/customer/${customerId}/appointments`);
            if (res.data.success) {
                setCompletedAppointments(
                    (res.data.appointments || []).filter(a => ['completed', 'finished'].includes((a.status || '').toLowerCase()))
                );
            }
        } catch (e) { console.error('Error fetching completed appointments:', e); }
    };

    // Toggle a value in/out of an array field in bookingData
    const togglePlacementItem = (field, item) => {
        setBookingData(prev => {
            const arr = prev[field] || [];
            const isAdding = !arr.includes(item);
            if (isAdding && item === 'Other') {
                setTimeout(() => {
                    if (placementNotesRef.current) placementNotesRef.current.focus();
                }, 50);
            }
            const newData = { ...prev, [field]: isAdding ? [...arr, item] : arr.filter(x => x !== item) };
            if (field === 'placement' || field === 'piercingPlacement') {
                validateBookingField('placementNotes', newData.placementNotes, newData);
            }
            return newData;
        });
    };

    const handleNextStep = () => {
        if (Object.values(errors).some(e => e)) {
            return showAlert("Validation Error", "Please fix errors on this page before proceeding.", "warning");
        }
        const derivedType = getDerivedServiceType(bookingData.selectedServices);
        if (bookingStep === 1) {
            if (!bookingData.bookingType) return showAlert("Required Field", "Please select whether this is a new booking or a follow-up.", "warning");
            if (bookingData.bookingType === 'followup' && !bookingData.followupAppointmentId) return showAlert("Required Field", "Please select which previous appointment this is a follow-up for.", "warning");
            if (bookingData.selectedServices.length === 0) return showAlert("Required Field", "Please select at least one service type.", "warning");
        }
        if (bookingStep === 2 && !bookingData.designTitle && derivedType !== 'Consultation') {
            return showAlert("Required Field", "Please provide a design idea or title.", "warning");
        }
        if (bookingStep === 3 && bookingData.placement.length === 0 && derivedType !== 'Consultation') {
            return showAlert("Required Field", "Please select at least one placement area for your session.", "warning");
        }
        if (bookingStep === 3 && derivedType === 'Consultation' && bookingData.consultationFor.length === 0) {
            return showAlert("Required Field", "Please indicate what this consultation is for (Tattoo, Piercing, or both).", "warning");
        }
        if (bookingStep === 3 && derivedType === 'Consultation' && bookingData.placement.length === 0) {
            return showAlert("Required Field", "Please select at least one body area you're considering.", "warning");
        }
        if (bookingStep === 3 && derivedType === 'Tattoo + Piercing' && bookingData.piercingPlacement.length === 0) {
            return showAlert("Required Field", "Please also select the piercing location for your bundled session.", "warning");
        }
        // Validate location notes when 'Other' is selected
        if (bookingStep === 3 && (bookingData.placement.includes('Other') || bookingData.piercingPlacement.includes('Other')) && !bookingData.placementNotes.trim()) {
            return showAlert("Required Field", "You selected 'Other' — please describe the specific location in the notes field.", "warning");
        }
        setBookingStep(bookingStep + 1);
    };

    const handleSubmitBooking = async (e) => {
        if (e) e.preventDefault();
        const derivedType = getDerivedServiceType(bookingData.selectedServices);

        if (!bookingData.date || (['Consultation', 'Piercing', 'Tattoo + Piercing'].includes(derivedType) && !bookingData.startTime)) {
            return showAlert("Required Field", "Please select an available date" + (['Consultation', 'Piercing', 'Tattoo + Piercing'].includes(derivedType) ? " and time slot" : "") + " from the calendar.", "warning");
        }
        if (!bookingData.date || !derivedType || (bookingData.placement.length === 0 && derivedType !== 'Consultation')) {
            showAlert("Missing Info", "Please select a service, placement, and date.", "warning");
            return;
        }

        setIsSubmitting(true);
        try {
            const placementStr = bookingData.placement.join(', ');
            const piercingStr = bookingData.piercingPlacement.join(', ');
            let placementLine;
            if (derivedType === 'Tattoo + Piercing') {
                placementLine = `Tattoo Placement: ${placementStr}\nPiercing Location: ${piercingStr}`;
            } else if (derivedType === 'Piercing') {
                placementLine = `Piercing Location: ${placementStr}`;
            } else if (derivedType === 'Consultation') {
                const consultType = bookingData.consultationFor.join(' & ');
                const consultMethodStr = bookingData.consultationMethod === 'Online' ? `Online (${bookingData.onlinePlatform || 'TBD'})` : 'Face-to-Face';
                placementLine = `Consultation for: ${consultType}\nConsultation method: ${consultMethodStr}\nAreas of interest: ${placementStr}`;
            } else {
                placementLine = `Placement: ${placementStr}`;
            }
            if (bookingData.placementNotes) {
                placementLine += `\nSpecific notes: ${bookingData.placementNotes}`;
            }

            // Build follow-up reference if applicable
            let followupNote = '';
            if (bookingData.bookingType === 'followup' && bookingData.followupAppointmentId) {
                const refAppt = completedAppointments.find(a => a.id === bookingData.followupAppointmentId);
                const refCode = refAppt ? getDisplayCode(refAppt.booking_code, refAppt.id) : `#${bookingData.followupAppointmentId}`;
                followupNote = `\n\nFollow-up of Booking ${refCode}`;
            }

            const consultMethodPayload = derivedType === 'Consultation' ? (bookingData.consultationMethod === 'Online' ? `Online (${bookingData.onlinePlatform || 'TBD'})` : 'Face-to-Face') : null;

            const res = await Axios.post(`${API_URL}/api/customer/appointments`, {
                customerId,
                artistId: bookingData.artistId,
                date: bookingData.date,
                startTime: ['Consultation', 'Piercing', 'Tattoo + Piercing'].includes(derivedType) ? bookingData.startTime : '13:00',
                endTime: ['Consultation', 'Piercing', 'Tattoo + Piercing'].includes(derivedType) ? bookingData.startTime : '13:00',
                serviceType: derivedType,
                designTitle: bookingData.designTitle,
                notes: `${placementLine}\n\nDetails: ${bookingData.notes}${followupNote}`,
                referenceImage: bookingData.referenceImage,
                consultationMethod: consultMethodPayload
            });

            if (res.data.success) {
                showAlert("Booking Requested", "Your session request has been sent! A confirmation notification with details has been added to your account.", "success");
                setIsBookingModalOpen(false);
                setBookingData({ artistId: null, bookingType: '', selectedServices: [], followupAppointmentId: null, date: '', startTime: '', designTitle: '', placement: [], piercingPlacement: [], consultationFor: [], consultationMethod: 'Face-to-Face', onlinePlatform: '', placementNotes: '', notes: '', referenceImage: null });
                const fetchRes = await Axios.get(`${API_URL}/api/customer/${customerId}/appointments`);
                if (fetchRes.data.success) setAppointments(fetchRes.data.appointments);
            }
        } catch (err) {
            if (err.response?.status === 429) {
                showAlert("Booking Limit Reached", err.response.data.message || "You have too many pending requests. Please wait for one to be confirmed.", "warning");
            } else {
                showAlert("Booking Error", err.response?.data?.message || "Failed to submit request.", "danger");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const bodyParts = [
        "Face", "Neck", "Chest", "Back", "Left Shoulder", "Right Shoulder", "Left Upper Arm", "Right Upper Arm", "Left Forearm", "Right Forearm", "Left Wrist", "Right Wrist", "Left Hand", "Right Hand", "Left Ribs", "Right Ribs", "Left Hip", "Right Hip", "Left Thigh", "Right Thigh", "Left Calf", "Right Calf", "Left Ankle", "Right Ankle"
    ];

    const rescheduleReasonOptions = [
        'Schedule conflict',
        'Medical/Health reason',
        'Travel/Transportation issue',
        'Personal emergency',
        'Availability of companion',
        'Other'
    ];

    const handleOpenReschedule = (appt) => {
        const now = new Date();
        const apptDate = new Date(appt.appointment_date);
        const msInAWeek = 7 * 24 * 60 * 60 * 1000;

        if ((appt.reschedule_count || 0) >= 1) {
            showAlert("Reschedule Limit Reached", "You have already used your 1 allowed reschedule for this appointment. If this is an emergency, please contact the studio directly.", "warning");
            return;
        }

        if ((apptDate - now) < msInAWeek) {
            showAlert("Reschedule Not Allowed", "Rescheduling is not allowed for appointments that are less than 1 week away. If this is an emergency, please contact the studio directly.", "warning");
            return;
        }

        setRescheduleDate('');
        setRescheduleTime('');
        setRescheduleMonth(new Date());
        setRescheduleReason('');
        setRescheduleReasonText('');
        setShowRescheduleConfirm(false);
        setIsRescheduleModalOpen(true);
    };

    const handleReschedulePreSubmit = () => {
        if (!rescheduleDate) {
            showAlert("Required", "Please select a new date.", "warning");
            return;
        }
        if (!rescheduleReason) {
            showAlert("Required", "Please select a reason for rescheduling.", "warning");
            return;
        }
        if (rescheduleReason === 'Other' && !rescheduleReasonText.trim()) {
            showAlert("Required", "Please describe your reason for rescheduling.", "warning");
            return;
        }
        setShowRescheduleConfirm(true);
    };

    const handleSubmitReschedule = async () => {
        const finalReason = rescheduleReason === 'Other' ? rescheduleReasonText.trim() : rescheduleReason;
        setIsRescheduling(true);
        try {
            const res = await Axios.put(`${API_URL}/api/customer/appointments/${selectedApt.id}/reschedule`, {
                customerId,
                newDate: rescheduleDate,
                newTime: rescheduleTime || null,
                reason: finalReason
            });
            if (res.data.success) {
                showAlert("Rescheduled", res.data.message, "success");
                setIsRescheduleModalOpen(false);
                setShowRescheduleConfirm(false);
                setIsModalOpen(false);
                // Refresh appointments
                const fetchRes = await Axios.get(`${API_URL}/api/customer/${customerId}/appointments`);
                if (fetchRes.data.success) setAppointments(fetchRes.data.appointments.map(a => ({ ...a, price: parseFloat(a.price) || 0 })));
            }
        } catch (err) {
            showAlert("Reschedule Failed", err.response?.data?.message || "An error occurred while rescheduling.", "danger");
        } finally {
            setIsRescheduling(false);
            setShowRescheduleConfirm(false);
        }
    };

    // ────── Cancellation Logic ──────
    const handleCancelBooking = (appt) => {
        if (appt.status !== 'pending') {
            showAlert('Cannot Cancel', 'Only pending bookings that haven\'t been confirmed by the studio can be cancelled.', 'warning');
            return;
        }
        if (appt.payment_status && appt.payment_status !== 'unpaid') {
            showAlert('Cannot Cancel', 'You cannot cancel an appointment that has already been paid for. Please contact the studio directly.', 'warning');
            return;
        }
        // Check recent cancellations (client-side pre-check)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentCancels = appointments.filter(a => 
            a.status === 'cancelled' && new Date(a.updated_at || a.appointment_date) >= thirtyDaysAgo
        ).length;
        if (recentCancels >= 3) {
            showAlert('Cancellation Limit Reached', 'You have cancelled 3 bookings in the last 30 days. Please contact the studio directly for assistance.', 'warning');
            return;
        }
        setCancelModal({ isOpen: true, appointmentId: appt.id, reason: '' });
    };

    const submitCancellation = async () => {
        if (cancelModal.reason.trim().length < 10) {
            showAlert('Reason Required', 'Please provide at least 10 characters explaining why you are cancelling.', 'warning');
            return;
        }
        setIsCancelling(true);
        try {
            const res = await Axios.put(`${API_URL}/api/customer/appointments/${cancelModal.appointmentId}/cancel`, {
                customerId,
                reason: cancelModal.reason.trim()
            });
            if (res.data.success) {
                showAlert('Booking Cancelled', res.data.message, 'success');
                setCancelModal({ isOpen: false, appointmentId: null, reason: '' });
                setIsModalOpen(false);
                // Refresh appointments
                const fetchRes = await Axios.get(`${API_URL}/api/customer/${customerId}/appointments`);
                if (fetchRes.data.success) setAppointments(fetchRes.data.appointments.map(a => ({ ...a, price: parseFloat(a.price) || 0 })));
            }
        } catch (err) {
            showAlert('Cancellation Failed', err.response?.data?.message || 'An error occurred while cancelling.', 'danger');
        } finally {
            setIsCancelling(false);
        }
    };

    const renderRescheduleCalendar = () => {
        const days = [];
        const today = new Date();
        today.setHours(0,0,0,0);
        const oneWeekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        const maxDate = new Date();
        maxDate.setMonth(today.getMonth() + 3);

        // The current appointment date — customer can only move FORWARD from this
        const currentApptDate = selectedApt ? new Date(selectedApt.appointment_date) : null;
        if (currentApptDate) currentApptDate.setHours(0,0,0,0);

        // Collect all dates where this customer already has active appointments (excluding the one being rescheduled)
        const bookedDateSet = new Set();
        appointments.forEach(a => {
            if (a.id !== selectedApt?.id && !['completed', 'cancelled', 'rejected'].includes(a.status)) {
                const d = typeof a.appointment_date === 'string' 
                    ? a.appointment_date.substring(0, 10) 
                    : new Date(a.appointment_date).toISOString().split('T')[0];
                bookedDateSet.add(d);
            }
        });

        const daysInM = new Date(rescheduleMonth.getFullYear(), rescheduleMonth.getMonth() + 1, 0).getDate();
        const firstDay = new Date(rescheduleMonth.getFullYear(), rescheduleMonth.getMonth(), 1).getDay();

        for (let i = 0; i < firstDay; i++) days.push(<div key={`re-${i}`} className="calendar-day empty"></div>);
        for (let i = 1; i <= daysInM; i++) {
            const dateStr = `${rescheduleMonth.getFullYear()}-${String(rescheduleMonth.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const dateObj = new Date(rescheduleMonth.getFullYear(), rescheduleMonth.getMonth(), i);
            const isSelected = rescheduleDate === dateStr;
            const isPast = dateObj < oneWeekFromNow;
            const isTooFar = dateObj > maxDate;
            const isBeforeOrSameAsCurrentAppt = currentApptDate ? dateObj <= currentApptDate : false;
            const isAlreadyBooked = bookedDateSet.has(dateStr);
            
            const dateData = bookedDates[dateStr] || { consultationTimes: [], piercingTimes: [], sessionCount: 0 };
            // Evaluate based on the service type of the appointment being rescheduled
            let isFull = false;
            let isBusy = false;
            const apptService = (selectedApt?.service_type || '').toLowerCase();
            if (apptService === 'consultation') {
                isFull = dateData.consultationTimes.length >= 7;
                isBusy = dateData.consultationTimes.length >= 5;
            } else if (apptService === 'piercing') {
                isFull = dateData.piercingTimes.length >= 7;
                isBusy = dateData.piercingTimes.length >= 1; // Show as limited if any slot is taken
            } else if (apptService === 'tattoo + piercing') {
                isFull = dateData.sessionCount >= studioCapacity || dateData.piercingTimes.length >= 7;
                isBusy = dateData.sessionCount >= Math.max(1, studioCapacity - 1) || dateData.piercingTimes.length >= 5;
            } else {
                isFull = dateData.sessionCount >= studioCapacity;
                isBusy = dateData.sessionCount >= Math.max(1, studioCapacity - 1);
            }

            const isDisabled = isPast || isTooFar || isBeforeOrSameAsCurrentAppt || isAlreadyBooked || isFull;

            let bgColor = 'white';
            let textColor = '#1e293b';
            let borderColor = '#e2e8f0';

            if (isPast || isTooFar || isBeforeOrSameAsCurrentAppt) {
                bgColor = '#f8fafc';
                textColor = '#cbd5e1';
                borderColor = 'transparent';
            } else if (isAlreadyBooked || isFull) {
                bgColor = '#fee2e2';
                textColor = '#991b1b';
                borderColor = '#fecaca';
            } else if (isBusy) {
                bgColor = '#fef9c3';
                textColor = '#854d0e';
                borderColor = '#fde68a';
            } else {
                bgColor = '#dcfce7';
                textColor = '#166534';
                borderColor = '#bbf7d0';
            }

            if (isSelected) {
                borderColor = '#be9055';
            }

            days.push(
                <div key={i} className={`calendar-day ${isDisabled ? 'disabled' : ''} ${isSelected ? 'selected' : ''}`}
                    style={{ backgroundColor: bgColor, color: textColor, border: isSelected ? '2px solid #be9055' : `1px solid ${borderColor}`, opacity: isPast || isTooFar || isBeforeOrSameAsCurrentAppt ? 0.4 : (isAlreadyBooked || isFull ? 0.65 : 1), boxShadow: isSelected ? '0 0 0 3px rgba(193, 154, 107, 0.2)' : 'none' }}
                    onClick={() => { if (!isDisabled) setRescheduleDate(dateStr); }}
                    title={isAlreadyBooked ? 'You already have a session on this date' : isBeforeOrSameAsCurrentAppt ? 'You can only reschedule to a later date' : isFull ? 'This date is fully booked' : ''}
                >
                    <span style={{ fontWeight: isSelected ? '700' : '500' }}>{i}</span>
                </div>
            );
        }
        return days;
    };

    return (
        <div className="portal-layout">
            <CustomerSideNav />
            <div className="portal-container customer-portal">
            <header className="portal-header">
                <div className="header-title">
                    <h1>My Bookings</h1>
                </div>
                <div className="header-actions">
                    <button className="action-btn customer-st-98cc44d8" onClick={() => { setBookingStep(1); setIsBookingModalOpen(true); }} >
                        <Plus size={16} /> Book New Session
                    </button>
                </div>
            </header>
            <div className="portal-content">
                {loading ? <div className="no-data">Loading...</div> : (
                        <div className="table-card-container customer-st-e54796c6" >
                            <div className="card-header-v2">
                                <div className="customer-st-416869c2" >
                                    <div className="customer-st-1910a4be" >
                                        <Filter size={18} color="#64748b" />
                                        <select className="pagination-select customer-st-03930596" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }} >
                                            <option value="upcoming">Active / Upcoming</option>
                                            <option value="history">History (Done / Cancelled)</option>
                                            <option value="all">All Bookings</option>
                                            <option value="confirmed">Confirmed Only</option>
                                            <option value="pending">Pending Only</option>
                                        </select>
                                    </div>
                                    <div className="customer-st-e64759bd" >
                                        <Search className="customer-st-73ad8fa0" size={16} />
                                        <input className="pagination-select customer-st-5ce7667d" type="text" placeholder="Search bookings..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
                                    </div>
                                </div>
                                <span className="status-badge-v2 pending">{filteredAppointments.length} Bookings</span>
                            </div>

                            {displayedAppointments.length ? (
                                <>
                                    <div className="table-responsive">
                                        <table className="portal-table">
                                            <thead><tr><th>ID</th><th>Service</th><th>Date</th><th>Time</th><th>Status</th><th>Price</th><th>Payment</th></tr></thead>
                                            <tbody>{displayedAppointments.map(a=> (
                                                <tr key={a.id} onClick={() => handleViewDetails(a)} style={{ cursor: 'pointer' }} className="clickable-row hover-bg">
                                                    <td className="customer-st-968fd1b5" >
                                                        <span style={{ fontFamily: 'monospace', fontWeight: '600', color: '#1e293b' }}>
                                                            {getDisplayCode(a.booking_code, a.id)}
                                                        </span>
                                                    </td>
                                                    <td>{a.service_type || 'Tattoo'}</td>
                                                    <td>{new Date(a.appointment_date).toLocaleDateString()}</td>
                                                    <td>{a.start_time}</td>
                                                    <td><span className={`status-badge ${a.status.toLowerCase()}`}>{a.status}</span></td>
                                                    <td>
                                                        {a.price > 0 ? (
                                                            <div className="customer-st-52ddb992" >₱{Number(a.price).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                                        ) : (
                                                            <span className="customer-st-b8eb7d87" >Pending Quote</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <div className="customer-st-929a545b" >
                                                            {a.status === 'pending' && a.price > 0 && a.payment_status === 'unpaid' ? (
                                                                <button 
                                                                    className="btn btn-primary" 
                                                                    style={{padding: '6px 14px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', boxShadow: '0 4px 10px rgba(16, 185, 129, 0.3)'}}
                                                                    onClick={(e) => { e.stopPropagation(); handlePay(a); }} 
                                                                >
                                                                    <CreditCard size={14}/> Pay Deposit
                                                                </button>
                                                            ) : a.payment_status === 'paid' && a.price > 0 ? (
                                                                <span className="status-badge-v2 confirmed customer-st-abded735" >
                                                                    <CheckCircle size={12}/> Fully Paid
                                                                </span>
                                                            ) : a.payment_status === 'paid' && (!a.price || a.price <= 0) ? (
                                                                <span style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>Free</span>
                                                            ) : a.payment_status === 'downpayment_paid' ? (
                                                                <button 
                                                                    className="btn btn-primary" 
                                                                    style={{padding: '6px 14px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', background: '#be9055', color: 'white', border: 'none', boxShadow: '0 4px 10px rgba(245, 158, 11, 0.3)'}}
                                                                    onClick={(e) => { e.stopPropagation(); handlePay(a, 'balance'); }}
                                                                >
                                                                    <CreditCard size={14}/> Pay Balance
                                                                </button>
                                                            ) : a.status === 'completed' ? (
                                                                <button className="btn btn-primary customer-st-6c6e14b5" onClick={(e) => { e.stopPropagation(); setSelectedApt(a); setShowAftercare(true); }} >
                                                                    <Heart size={14}/> Aftercare
                                                                </button>
                                                            ) : (
                                                                <span className="customer-st-48e66a80" >-</span>
                                                            )}
                                                        </div>
                                                    </td>
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
                                        unit="bookings"
                                    />
                                </>
                            ) : (
                                <div className="no-data-container customer-st-282aded5" >
                                    <Inbox size={48} className="no-data-icon" />
                                    <p className="no-data-text">No bookings found matching your criteria.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Payment Details Modal */}
            {isModalOpen && selectedApt && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <div>
                                <h3 style={{ margin: 0 }}>Appointment Details</h3>
                                <div className="modal-tabs" style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                                    <button 
                                        type="button"
                                        className={`modal-tab-btn ${modalTab === 'details' ? 'active' : ''}`} 
                                        onClick={() => setModalTab('details')}
                                        style={{ background: 'none', border: 'none', borderBottom: modalTab==='details' ? '2px solid #6366f1' : 'none', padding: '8px 12px', cursor: 'pointer', fontWeight: modalTab==='details'?'bold':'normal', color: modalTab==='details'?'#6366f1':'#64748b', display: 'flex', alignItems: 'center' }}
                                    >
                                        <Info size={14} style={{ marginRight: '5px' }}/> Details
                                    </button>
                                    <button 
                                        type="button"
                                        className={`modal-tab-btn ${modalTab === 'transactions' ? 'active' : ''}`} 
                                        onClick={() => setModalTab('transactions')}
                                        style={{ background: 'none', border: 'none', borderBottom: modalTab==='transactions' ? '2px solid #6366f1' : 'none', padding: '8px 12px', cursor: 'pointer', fontWeight: modalTab==='transactions'?'bold':'normal', color: modalTab==='transactions'?'#6366f1':'#64748b', display: 'flex', alignItems: 'center' }}
                                    >
                                        <Receipt size={14} style={{ marginRight: '5px' }}/> Transactions
                                    </button>
                                </div>
                            </div>
                            <button className="close-btn" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
                        </div>
                        <div className="modal-body">
                            {modalTab === 'details' ? (
                                <>
                                    <div className="customer-st-5c49f804" >
                                        <div className="customer-st-e8eceac8" >
                                            <label className="customer-st-3c5cf8dd" >Service Type</label>
                                            <p className="customer-st-5d13f831" >{selectedApt.service_type || 'General Session'}</p>
                                        </div>
                                    </div>

                                    <div className="customer-st-654b1414" >
                                        <label className="customer-st-627edbaf" >Vision & Booking Notes</label>
                                        <div className="customer-st-6f352cca" >
                                            <h4 className="customer-st-232eb362" >{selectedApt.design_title}</h4>
                                            <p className="customer-st-590a9062" >
                                                {selectedApt.notes || 'No specific notes provided.'}
                                            </p>
                                            
                                            {selectedApt.reference_image && (
                                                <div className="customer-st-2dc9a8a0" >
                                                    <p className="customer-st-af520488" >Reference Image</p>
                                                    <div className="customer-st-e6f3b223" >
                                                        <img className="customer-st-454ebe6d" src={selectedApt.reference_image} alt="Reference" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <h4 className="customer-st-6f90639a" >Financial Summary</h4>
                                    <div className="billing-summary customer-st-aa822c5e" >
                                        <div className="customer-st-56da6dbd" >
                                            <span className="customer-st-504f25fa" >Total Service Price:</span>
                                            <span className="customer-st-c6cdc897" >₱{selectedApt.price.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="customer-st-56da6dbd" >
                                            <span className="customer-st-504f25fa" >Amount Paid:</span>
                                            <span className="customer-st-49af0fbb" >
                                                ₱{Number(selectedApt.total_paid || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                        <hr className="customer-st-b45fb1af" />
                                        <div className="customer-st-4110ceca" >
                                            <span className="customer-st-e7b1617c" >Remaining Balance:</span>
                                            <span className="customer-st-58e71408" >
                                                ₱{Math.max(0, selectedApt.price - (selectedApt.total_paid || 0)).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                        
                                        {/* Inline Payment Buttons mirroring the external list design */}
                                        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                            {(['pending', 'confirmed', 'scheduled'].includes(selectedApt.status.toLowerCase())) && selectedApt.price > 0 && selectedApt.payment_status === 'unpaid' && (
                                                <button 
                                                    className="btn btn-primary" 
                                                    style={{padding: '8px 16px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', boxShadow: '0 4px 10px rgba(16, 185, 129, 0.3)'}}
                                                    onClick={() => handlePay(selectedApt)} 
                                                >
                                                    <CreditCard size={16}/> Pay Deposit Now
                                                </button>
                                            )}
                                            
                                            {selectedApt.payment_status === 'downpayment_paid' && (
                                                <button 
                                                    className="btn btn-primary" 
                                                    style={{padding: '8px 16px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px', background: '#be9055', color: 'white', border: 'none', boxShadow: '0 4px 10px rgba(245, 158, 11, 0.3)'}}
                                                    onClick={() => handlePay(selectedApt, 'balance')}
                                                >
                                                    <CreditCard size={16}/> Pay Remaining Balance
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="customer-st-5c49f804">
                                    {modalLoading ? (
                                        <p style={{ color: '#64748b' }}>Loading transactions...</p>
                                    ) : modalTransactions.length > 0 ? (
                                        <div style={{width: '100%'}}>
                                            {modalTransactions.map(t => (
                                                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #e2e8f0' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        <span style={{ fontWeight: 600, color: '#1e293b' }}>{new Date(t.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric'})}</span>
                                                        <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            {t.payment_method || 'PayMongo'} 
                                                            {t.paymongo_payment_id && <span style={{ fontFamily: 'monospace', background: '#f1f5f9', padding: '2px 4px', borderRadius: '4px' }}>{t.paymongo_payment_id.substring(0,8)}</span>}
                                                        </span>
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                                        <span style={{ fontWeight: 700, color: t.status.toLowerCase() === 'paid' ? '#10b981' : '#f59e0b', fontSize: '1.1rem' }}>₱{(t.amount/100).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                        <span style={{ fontSize: '0.7rem', padding: '2px 8px', background: t.status.toLowerCase()==='paid'? '#ecfdf5' : '#fff7ed', color: t.status.toLowerCase()==='paid'?'#059669':'#ea580c', borderRadius: '12px', fontWeight: 600 }}>{t.status.toUpperCase()}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div style={{ textAlign: 'center', padding: '40px 10px', color: '#94a3b8' }}>
                                            <Inbox size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                                            <p style={{ fontSize: '0.95rem' }}>No payment history exists for this session yet.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="modal-footer customer-st-14ad7875" >
                            <button className="btn btn-secondary customer-st-282aded5" onClick={() => setIsModalOpen(false)}>Close</button>
                            
                            {(['pending', 'confirmed', 'scheduled'].includes(selectedApt.status.toLowerCase())) && (
                                <button 
                                    className="btn btn-secondary" 
                                    style={{ 
                                        display: 'flex', alignItems: 'center', gap: '6px', 
                                        border: `1px solid ${(selectedApt.reschedule_count || 0) >= 1 ? '#cbd5e1' : '#6366f1'}`, 
                                        color: (selectedApt.reschedule_count || 0) >= 1 ? '#94a3b8' : '#6366f1', 
                                        background: (selectedApt.reschedule_count || 0) >= 1 ? '#f1f5f9' : '#eef2ff',
                                        cursor: (selectedApt.reschedule_count || 0) >= 1 ? 'not-allowed' : 'pointer',
                                        opacity: (selectedApt.reschedule_count || 0) >= 1 ? 0.6 : 1
                                    }}
                                    onClick={() => handleOpenReschedule(selectedApt)}
                                >
                                    <CalendarDays size={16}/> Reschedule{(selectedApt.reschedule_count || 0) >= 1 ? ' (Used)' : ''}
                                </button>
                            )}
                            
                            {selectedApt.status.toLowerCase() === 'pending' && (
                                <button 
                                    className="btn btn-secondary" 
                                    style={{ display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid #ef4444', color: '#ef4444', background: '#fef2f2' }}
                                    onClick={() => handleCancelBooking(selectedApt)}
                                >
                                    <X size={16}/> Cancel Booking
                                </button>
                            )}
                            
                            {(['pending', 'confirmed', 'scheduled'].includes(selectedApt.status.toLowerCase())) && selectedApt.price > 0 && selectedApt.payment_status === 'unpaid' && (
                                <button className="btn btn-primary customer-st-9fb0229b" style={{ color: 'white' }} onClick={() => handlePay(selectedApt)} >
                                    <CreditCard size={18}/> Pay Deposit
                                </button>
                            )}
                            
                            {selectedApt.payment_status === 'downpayment_paid' && (
                                <button 
                                    className="btn btn-primary" 
                                    style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#be9055', color: 'white', border: 'none' }}
                                    onClick={() => handlePay(selectedApt, 'balance')}
                                >
                                    <CreditCard size={18}/> Pay Remaining Balance
                                </button>
                            )}
                            
                            {selectedApt.payment_status === 'paid' && selectedApt.price > 0 && (
                                <div className="status-badge-v2 confirmed customer-st-472abd65" >
                                    <CheckCircle size={18}/> Fully Paid
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}



            {showAftercare && selectedApt && (
                <div className="modal-overlay" onClick={() => setShowAftercare(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="customer-st-da70abb8" ><Heart size={24} color="#10b981" /> Aftercare Guide</h2>
                            <button className="close-btn" onClick={() => setShowAftercare(false)}><X size={24} /></button>
                        </div>
                        <div className="modal-body">
                            <p className="customer-st-5242ed5e" >Congratulations on your new tattoo! Proper aftercare is crucial for vibrant colors and smooth healing. Please follow these steps carefully:</p>
                            
                            <div className="customer-st-409d6bf5" >
                                <div className="customer-st-360705c8" >
                                    <h4 className="customer-st-e458bee7" >1. The First Hours</h4>
                                    <p className="customer-st-c9d8a99f" >
                                        Leave the bandage on for 2-4 hours. Wash gently with warm water and fragrance-free antibacterial soap. Do not scrub.
                                    </p>
                                </div>
                                
                                <div className="customer-st-360705c8" >
                                    <h4 className="customer-st-e458bee7" >2. Healing Phase (14 Days)</h4>
                                    <p className="customer-st-c9d8a99f" >
                                        Apply a thin layer of unscented lotion 2-3 times a day. Do NOT pick or scratch scabs. Avoid direct sunlight and swimming.
                                    </p>
                                </div>
                            </div>
                            
                            <div className="customer-st-040844df" >
                                <p className="customer-st-e7d774e4" >
                                    Questions? Reach out to your artist immediately if red, swollen, or hot to the touch.
                                </p>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary customer-st-1daa6293" onClick={() => setShowAftercare(false)}>Got it!</button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Reschedule Modal */}
            {isRescheduleModalOpen && selectedApt && (
                <div className="modal-overlay" onClick={() => { setIsRescheduleModalOpen(false); setShowRescheduleConfirm(false); }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
                        <div className="modal-header">
                            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}><CalendarDays size={20} color="#6366f1" /> Reschedule Appointment</h3>
                            <button className="close-btn" onClick={() => { setIsRescheduleModalOpen(false); setShowRescheduleConfirm(false); }}><X size={20} /></button>
                        </div>
                        <div className="modal-body" style={{ padding: '20px' }}>
                            {/* Confirmation overlay */}
                            {showRescheduleConfirm ? (
                                <div style={{ textAlign: 'center', padding: '20px 10px' }}>
                                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                        <AlertTriangle size={28} color="#f59e0b" />
                                    </div>
                                    <h3 style={{ margin: '0 0 8px', color: '#1e293b', fontSize: '1.15rem' }}>Are you sure you want to reschedule?</h3>
                                    <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: '1.6', margin: '0 0 8px' }}>
                                        You are only allowed to reschedule this appointment <strong style={{ color: '#dc2626' }}>once</strong>.
                                    </p>
                                    <p style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: '600', margin: '0 0 20px' }}>
                                        After this, you will not be able to reschedule again.
                                    </p>
                                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', marginBottom: '20px', textAlign: 'left' }}>
                                        <p style={{ margin: '0 0 6px', fontSize: '0.85rem', color: '#64748b' }}><strong style={{ color: '#1e293b' }}>New Date:</strong> {new Date(rescheduleDate + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
                                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}><strong style={{ color: '#1e293b' }}>Reason:</strong> {rescheduleReason === 'Other' ? rescheduleReasonText : rescheduleReason}</p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                        <button className="btn btn-secondary" onClick={() => setShowRescheduleConfirm(false)} style={{ minWidth: '100px' }}>Go Back</button>
                                        <button 
                                            className="btn btn-primary"
                                            disabled={isRescheduling}
                                            onClick={handleSubmitReschedule}
                                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', minWidth: '160px' }}
                                        >
                                            {isRescheduling ? 'Rescheduling...' : <><CalendarDays size={16}/> Yes, Reschedule</>}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '10px', padding: '12px', marginBottom: '20px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                        <AlertTriangle size={18} color="#d97706" style={{ marginTop: '2px', flexShrink: 0 }} />
                                        <div style={{ fontSize: '0.85rem', color: '#92400e', lineHeight: '1.5' }}>
                                            <strong>Reschedule Policy:</strong> You may reschedule <strong>once</strong> per appointment. Rescheduling is only allowed if the appointment is more than 1 week away. This action cannot be undone.
                                        </div>
                                    </div>

                                    <p style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '12px', fontWeight: '600' }}>Select a new date:</p>
                                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                            <button type="button" onClick={() => setRescheduleMonth(new Date(rescheduleMonth.getFullYear(), rescheduleMonth.getMonth() - 1, 1))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}><ChevronLeft size={20}/></button>
                                            <span style={{ fontWeight: '700', color: '#1e293b' }}>{monthNames[rescheduleMonth.getMonth()]} {rescheduleMonth.getFullYear()}</span>
                                            <button type="button" onClick={() => setRescheduleMonth(new Date(rescheduleMonth.getFullYear(), rescheduleMonth.getMonth() + 1, 1))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}><ChevronRight size={20}/></button>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', fontSize: '0.8rem' }}>
                                            {['S','M','T','W','T','F','S'].map((d, i) => <div key={i} style={{ fontWeight: '700', color: '#94a3b8', padding: '6px 0' }}>{d}</div>)}
                                            {renderRescheduleCalendar()}
                                        </div>
                                    </div>

                                    {rescheduleDate && (
                                        <div style={{ marginTop: '16px', padding: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <CheckCircle size={18} color="#16a34a" />
                                            <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#166534' }}>New date: {new Date(rescheduleDate + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
                                        </div>
                                    )}

                                    {/* Reschedule Reason */}
                                    <div style={{ marginTop: '20px' }}>
                                        <label style={{ fontSize: '0.9rem', color: '#475569', fontWeight: '600', display: 'block', marginBottom: '8px' }}>Reason for rescheduling <span style={{ color: '#ef4444' }}>*</span></label>
                                        <select 
                                            value={rescheduleReason} 
                                            onChange={(e) => { setRescheduleReason(e.target.value); if (e.target.value !== 'Other') setRescheduleReasonText(''); }}
                                            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.9rem', color: rescheduleReason ? '#1e293b' : '#94a3b8', background: 'white', outline: 'none', cursor: 'pointer' }}
                                        >
                                            <option value="" disabled>Select a reason...</option>
                                            {rescheduleReasonOptions.map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>

                                        {rescheduleReason === 'Other' && (
                                            <div style={{ marginTop: '10px' }}>
                                                <textarea
                                                    value={rescheduleReasonText}
                                                    onChange={(e) => { if (e.target.value.length <= 300) setRescheduleReasonText(e.target.value); }}
                                                    placeholder="Please describe your reason..."
                                                    maxLength={300}
                                                    rows={3}
                                                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.9rem', color: '#1e293b', resize: 'vertical', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                                                />
                                                <span style={{ fontSize: '0.75rem', color: rescheduleReasonText.length >= 280 ? '#ef4444' : '#94a3b8', float: 'right', marginTop: '4px' }}>
                                                    {rescheduleReasonText.length}/300
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                        {!showRescheduleConfirm && (
                            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '16px 20px', borderTop: '1px solid #e2e8f0' }}>
                                <button className="btn btn-secondary" onClick={() => setIsRescheduleModalOpen(false)}>Cancel</button>
                                <button 
                                    className="btn btn-primary"
                                    disabled={!rescheduleDate || !rescheduleReason || (rescheduleReason === 'Other' && !rescheduleReasonText.trim())}
                                    onClick={handleReschedulePreSubmit}
                                    style={{ display: 'flex', alignItems: 'center', gap: '6px', opacity: (!rescheduleDate || !rescheduleReason) ? 0.5 : 1 }}
                                >
                                    <CalendarDays size={16}/> Reschedule Session
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Custom New Booking Modal */}
            {isBookingModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content large" style={{ width: '95vw', maxWidth: '1050px', height: '92vh', maxHeight: '900px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div className="modal-header">
                            <h2 className="customer-st-da70abb8" ><Sparkles size={24} color="#be9055" /> New Booking Request</h2>
                            <button className="close-btn" onClick={closeBookingModal}><X size={24} /></button>
                        </div>
                        <div style={{ padding: '0 24px', paddingTop: '16px' }} >
                            <div className="customer-st-befb1147" >
                                <div className="customer-st-f93c6e1f" >
                                    {[1, 2, 3, 4].map(step => (
                                        <div key={step} style={{ 
                                            height: '4px', flex: 1, borderRadius: '2px',
                                            background: bookingStep >= step ? '#be9055' : '#e2e8f0',
                                            transition: 'all 0.4s ease'
                                        }} />
                                    ))}
                                </div>
                            </div>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                            <div className="modal-body customer-st-4a472601" >
                                
                                {bookingStep === 1 && (
                                    <div className="fade-in">
                                        <h3 className="customer-st-69ffca42" >1. Service Type</h3>

                                        {/* Phase A: Booking Type Toggle */}
                                        <div className="form-group">
                                            <label className="customer-st-36716a21" >Is this a new booking or a follow-up?</label>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                                                {[
                                                    { key: 'new', label: 'New Booking', icon: <PlusCircle size={22} />, desc: 'Book a brand new session' },
                                                    { key: 'followup', label: 'Follow-Up', icon: <History size={22} />, desc: 'Continue from a past booking' }
                                                ].map(opt => (
                                                    <div
                                                        key={opt.key}
                                                        onClick={() => {
                                                            setBookingData({...bookingData, bookingType: opt.key, selectedServices: [], followupAppointmentId: null});
                                                            if (opt.key === 'followup') fetchCompletedAppointments();
                                                        }}
                                                        style={{
                                                            padding: '20px', borderRadius: '14px',
                                                            border: `2px solid ${bookingData.bookingType === opt.key ? '#be9055' : '#e2e8f0'}`,
                                                            background: bookingData.bookingType === opt.key ? '#fffdf5' : 'white',
                                                            cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s',
                                                            boxShadow: bookingData.bookingType === opt.key ? '0 4px 12px rgba(218,165,32,0.15)' : 'none'
                                                        }}
                                                    >
                                                        <div style={{ color: bookingData.bookingType === opt.key ? '#be9055' : '#64748b', marginBottom: '8px' }}>{opt.icon}</div>
                                                        <span style={{ fontWeight: '700', fontSize: '1rem', color: '#1e293b', display: 'block' }}>{opt.label}</span>
                                                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{opt.desc}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Follow-Up: Past Appointment Picker */}
                                        {bookingData.bookingType === 'followup' && (
                                            <div className="form-group" style={{ marginBottom: '20px' }}>
                                                <label className="customer-st-36716a21" >Which previous appointment is this a follow-up for?</label>
                                                {completedAppointments.length === 0 ? (
                                                    <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                                        <Inbox size={28} style={{ marginBottom: '8px' }} />
                                                        <p style={{ margin: 0, fontSize: '0.9rem' }}>No completed appointments found. You don't have any past sessions to follow up on.</p>
                                                    </div>
                                                ) : (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                                                        {completedAppointments.map(apt => {
                                                            const isSelected = bookingData.followupAppointmentId === apt.id;
                                                            return (
                                                                <div
                                                                    key={apt.id}
                                                                    onClick={() => setBookingData({...bookingData, followupAppointmentId: apt.id})}
                                                                    style={{
                                                                        padding: '14px 16px', borderRadius: '10px',
                                                                        border: `2px solid ${isSelected ? '#be9055' : '#e2e8f0'}`,
                                                                        background: isSelected ? '#fffdf5' : 'white',
                                                                        cursor: 'pointer', transition: 'all 0.2s',
                                                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                                                    }}
                                                                >
                                                                    <div>
                                                                        <span style={{ fontWeight: '600', color: '#1e293b', fontSize: '0.9rem' }}>
                                                                            {getDisplayCode(apt.booking_code, apt.id)}
                                                                        </span>
                                                                        <span style={{ color: '#64748b', fontSize: '0.85rem', marginLeft: '10px' }}>
                                                                            {apt.service_type} — {new Date(apt.appointment_date).toLocaleDateString()}
                                                                        </span>
                                                                    </div>
                                                                    {isSelected && <Check size={18} color="#be9055" />}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Phase B: Service Checkboxes (shown after booking type selected) */}
                                        {bookingData.bookingType && (bookingData.bookingType === 'new' || bookingData.followupAppointmentId) && (
                                            <div className="form-group">
                                                <label className="customer-st-36716a21" >Select your services</label>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                                                    {[
                                                        { key: 'Tattoo Session', icon: <Sparkles size={20} />, color: '#be9055' },
                                                        { key: 'Consultation', icon: <MessageSquare size={20} />, color: '#3b82f6' },
                                                        { key: 'Piercing', icon: <Scissors size={20} />, color: '#8b5cf6' }
                                                    ].map(svc => {
                                                        const isChecked = bookingData.selectedServices.includes(svc.key);
                                                        // Mutual exclusion: Consultation is exclusive vs Tattoo/Piercing
                                                        const isDisabled = (
                                                            (svc.key === 'Consultation' && (bookingData.selectedServices.includes('Tattoo Session') || bookingData.selectedServices.includes('Piercing'))) ||
                                                            ((svc.key === 'Tattoo Session' || svc.key === 'Piercing') && bookingData.selectedServices.includes('Consultation'))
                                                        );
                                                        return (
                                                            <div
                                                                key={svc.key}
                                                                onClick={() => {
                                                                    if (isDisabled) return;
                                                                    const current = [...bookingData.selectedServices];
                                                                    if (isChecked) {
                                                                        setBookingData({...bookingData, selectedServices: current.filter(s => s !== svc.key)});
                                                                    } else {
                                                                        setBookingData({...bookingData, selectedServices: [...current, svc.key]});
                                                                    }
                                                                }}
                                                                style={{
                                                                    padding: '18px 12px', borderRadius: '12px',
                                                                    border: `2px solid ${isChecked ? svc.color : isDisabled ? '#f1f5f9' : '#e2e8f0'}`,
                                                                    background: isChecked ? `${svc.color}08` : isDisabled ? '#f8fafc' : 'white',
                                                                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                                                                    textAlign: 'center', transition: 'all 0.2s',
                                                                    opacity: isDisabled ? 0.45 : 1,
                                                                    position: 'relative'
                                                                }}
                                                            >
                                                                {/* Checkbox indicator */}
                                                                <div style={{
                                                                    position: 'absolute', top: '8px', right: '8px',
                                                                    width: '20px', height: '20px', borderRadius: '5px',
                                                                    border: `2px solid ${isChecked ? svc.color : '#cbd5e1'}`,
                                                                    background: isChecked ? svc.color : 'white',
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                    transition: 'all 0.2s'
                                                                }}>
                                                                    {isChecked && <Check size={14} color="white" strokeWidth={3} />}
                                                                </div>
                                                                <div style={{ color: isChecked ? svc.color : (isDisabled ? '#cbd5e1' : '#64748b'), marginBottom: '8px' }}>{svc.icon}</div>
                                                                <span style={{ fontWeight: '700', fontSize: '0.9rem', color: isDisabled ? '#cbd5e1' : '#1e293b' }}>{svc.key}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                {bookingData.selectedServices.includes('Tattoo Session') && bookingData.selectedServices.includes('Piercing') && (
                                                    <div style={{ marginTop: '12px', padding: '10px 14px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <Sparkles size={16} color="#d97706" />
                                                        <span style={{ fontSize: '0.85rem', color: '#92400e', fontWeight: '500' }}>Bundled: Tattoo + Piercing in the same session</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className="customer-st-59166514" >
                                            <p className="customer-st-7b7d7267" >
                                                <Info className="customer-st-ff2b4fb6" size={14} />
                                                <strong>Artist Assignment:</strong> Our studio management will review your design and assign the best-suited resident artist for your specific style and complexity.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {bookingStep === 2 && (() => {
                                    const derivedType = getDerivedServiceType(bookingData.selectedServices);
                                    return (
                                    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                                        <h3 className="customer-st-69ffca42" >2. Design Details</h3>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', flex: 1, minHeight: 0 }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
                                                <div className="form-group" style={{ marginBottom: 0 }}>
                                                    <label className="customer-st-67198c20" >Concept Name <span style={{ color: '#ef4444', fontWeight: '400' }}>*</span></label>
                                                    <input 
                                                        type="text" className="form-input" placeholder="e.g. Traditional Dagger with Flowers" 
                                                        name="designTitle"
                                                        value={bookingData.designTitle} onChange={handleBookingFormChange}
                                                        style={{ border: errors.designTitle ? '1px solid #ef4444' : undefined }}
                                                    />
                                                    {errors.designTitle && <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '4px', display: 'block' }}>{errors.designTitle}</span>}
                                                </div>
                                                <div className="form-group customer-st-5d155c93" style={{ marginBottom: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
                                                    <label className="customer-st-67198c20" >Tell us your story (Optional)</label>
                                                    <textarea 
                                                        className="form-input" placeholder="Describe the size, color preferences, and any meaningful details..."
                                                        name="notes"
                                                        value={bookingData.notes} onChange={handleBookingFormChange}
                                                        style={{ resize: 'none', border: errors.notes ? '1px solid #ef4444' : undefined, flex: 1 }}
                                                    />
                                                    {errors.notes && <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '4px', display: 'block' }}>{errors.notes}</span>}
                                                </div>
                                                {derivedType === 'Tattoo + Piercing' && (
                                                    <div style={{ padding: '14px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '12px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                                        <Sparkles size={18} color="#d97706" style={{ marginTop: '2px', flexShrink: 0 }} />
                                                        <div style={{ fontSize: '0.85rem', color: '#92400e', lineHeight: '1.5' }}>
                                                            <strong>Bundled Service:</strong> You are booking a tattoo session and a piercing back-to-back on the same day. Both placements will be captured in the next step.
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="form-group customer-st-5d155c93" style={{ marginBottom: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
                                                <label className="customer-st-67198c20" >Reference Image</label>
                                                <div 
                                                    onClick={() => document.getElementById('modal-ref-img').click()}
                                                    style={{ 
                                                        flex: 1, border: '2px dashed #e2e8f0', borderRadius: '12px', 
                                                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
                                                        cursor: 'pointer', background: bookingData.referenceImage ? '#f8fafc' : 'transparent', overflow: 'hidden',
                                                        minHeight: '180px'
                                                    }}
                                                >
                                                    {bookingData.referenceImage ? (
                                                        <img className="customer-st-2fbefd4f" src={bookingData.referenceImage} alt="Ref" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                                    ) : (
                                                        <>
                                                            <ImageIcon size={32} color="#94a3b8" style={{ marginBottom: '8px' }} />
                                                            <span className="customer-st-4b235664" style={{ fontSize: '0.85rem', textAlign: 'center', padding: '0 10px' }} >Upload a photo or sketch</span>
                                                        </>
                                                    )}
                                                    <input type="file" id="modal-ref-img" hidden accept="image/*" onChange={handleImageUpload} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    );
                                })()}

                                {bookingStep === 3 && (() => {
                                    const derivedType = getDerivedServiceType(bookingData.selectedServices);
                                    const tattooBodyParts = ["Face", "Neck", "Chest", "Back", "Left Shoulder", "Right Shoulder", "Left Upper Arm", "Right Upper Arm", "Left Forearm", "Right Forearm", "Left Wrist", "Right Wrist", "Left Hand", "Right Hand", "Left Ribs", "Right Ribs", "Left Hip", "Right Hip", "Left Thigh", "Right Thigh", "Left Calf", "Right Calf", "Left Ankle", "Right Ankle", "Other"];
                                    const piercingBodyParts = ["Left Ear Lobe", "Right Ear Lobe", "Left Helix", "Right Helix", "Left Tragus", "Right Tragus", "Left Conch", "Right Conch", "Left Industrial", "Right Industrial", "Left Nostril", "Right Nostril", "Septum", "Left Eyebrow", "Right Eyebrow", "Lip/Oral", "Navel", "Left Nipple", "Right Nipple", "Other"];

                                    // Decide which placement buttons to show
                                    const showTattooPlacement = bookingData.selectedServices.includes('Tattoo Session')
                                        || (derivedType === 'Consultation' && bookingData.consultationFor.includes('tattoo'));
                                    const showPiercingPlacement = bookingData.selectedServices.includes('Piercing')
                                        || (derivedType === 'Consultation' && bookingData.consultationFor.includes('piercing'));

                                    // Determine which array holds piercing selections
                                    const piercingField = (derivedType === 'Tattoo + Piercing' || (derivedType === 'Consultation' && showTattooPlacement)) ? 'piercingPlacement' : 'placement';

                                    // Handler for 3D model clicks — routes to correct array
                                    const handleModelToggle = (partName, category) => {
                                        if (category === 'tattoo') togglePlacementItem('placement', partName);
                                        else if (category === 'piercing') togglePlacementItem(piercingField, partName);
                                    };

                                    return (
                                    <div className="fade-in">
                                        <h3 className="customer-st-69ffca42" >3. Placement</h3>

                                        {/* Consultation sub-question: What is this consultation for? */}
                                        {derivedType === 'Consultation' && (
                                            <div style={{ marginBottom: '20px' }}>
                                                <p className="customer-st-b943a453" style={{ marginBottom: '10px' }}>What is this consultation for?</p>
                                                <div style={{ display: 'flex', gap: '12px' }}>
                                                    {[{ key: 'tattoo', label: 'Tattoo', icon: <Paintbrush size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />, color: '#be9055' }, { key: 'piercing', label: 'Piercing', icon: <Gem size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />, color: '#be9055' }].map(opt => {
                                                        const isActive = bookingData.consultationFor.includes(opt.key);
                                                        return (
                                                            <button
                                                                key={opt.key} type="button"
                                                                onClick={() => togglePlacementItem('consultationFor', opt.key)}
                                                                style={{
                                                                    flex: 1, padding: '14px', borderRadius: '12px',
                                                                    border: `2px solid ${isActive ? opt.color : '#e2e8f0'}`,
                                                                    background: isActive ? `${opt.color}15` : 'white',
                                                                    color: isActive ? opt.color : '#64748b',
                                                                    fontWeight: '700', fontSize: '0.95rem', cursor: 'pointer',
                                                                    transition: 'all 0.2s', position: 'relative'
                                                                }}
                                                            >
                                                                {isActive && <Check size={16} style={{ position: 'absolute', top: '6px', right: '6px' }} />}
                                                                {opt.icon}{opt.label}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '6px', textAlign: 'center' }}>You can select both if your consultation covers tattoo and piercing</p>

                                                {/* Consultation Method: Face-to-Face vs Online */}
                                                <p className="customer-st-b943a453" style={{ marginBottom: '10px', marginTop: '16px' }}>How would you like this consultation?</p>
                                                <div style={{ display: 'flex', gap: '12px' }}>
                                                    {[
                                                        { key: 'Face-to-Face', label: 'Face-to-Face', icon: <Users size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />, color: '#be9055' },
                                                        { key: 'Online', label: 'Online', icon: <Video size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />, color: '#be9055' }
                                                    ].map(opt => {
                                                        const isActive = bookingData.consultationMethod === opt.key;
                                                        return (
                                                            <button
                                                                key={opt.key} type="button"
                                                                onClick={() => setBookingData(prev => ({ ...prev, consultationMethod: opt.key, onlinePlatform: opt.key === 'Face-to-Face' ? '' : prev.onlinePlatform }))}
                                                                style={{
                                                                    flex: 1, padding: '14px', borderRadius: '12px',
                                                                    border: `2px solid ${isActive ? opt.color : '#e2e8f0'}`,
                                                                    background: isActive ? `${opt.color}15` : 'white',
                                                                    color: isActive ? opt.color : '#64748b',
                                                                    fontWeight: '700', fontSize: '0.95rem', cursor: 'pointer',
                                                                    transition: 'all 0.2s', position: 'relative'
                                                                }}
                                                            >
                                                                {isActive && <Check size={16} style={{ position: 'absolute', top: '6px', right: '6px' }} />}
                                                                {opt.icon}{opt.label}
                                                            </button>
                                                        );
                                                    })}
                                                </div>

                                                {/* Online Platform Selector */}
                                                {bookingData.consultationMethod === 'Online' && (
                                                    <div style={{ marginTop: '12px', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                                        <p style={{ fontWeight: '700', color: '#1e293b', marginBottom: '10px', fontSize: '0.88rem' }}>Which platform do you prefer?</p>
                                                        <div style={{ display: 'flex', gap: '10px' }}>
                                                            {['Messenger', 'Instagram'].map(platform => {
                                                                const isActive = bookingData.onlinePlatform === platform;
                                                                const color = '#be9055';
                                                                return (
                                                                    <button
                                                                        key={platform} type="button"
                                                                        onClick={() => setBookingData(prev => ({ ...prev, onlinePlatform: platform }))}
                                                                        style={{
                                                                            flex: 1, padding: '12px', borderRadius: '10px',
                                                                            border: `2px solid ${isActive ? color : '#e2e8f0'}`,
                                                                            background: isActive ? `${color}12` : 'white',
                                                                            color: isActive ? color : '#64748b',
                                                                            fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer',
                                                                            transition: 'all 0.2s', position: 'relative'
                                                                        }}
                                                                    >
                                                                        {isActive && <Check size={14} style={{ position: 'absolute', top: '5px', right: '5px' }} />}
                                                                        {platform}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                        {!bookingData.onlinePlatform && (
                                                            <p style={{ fontSize: '0.78rem', color: '#f59e0b', marginTop: '8px', textAlign: 'center' }}>Please select your preferred messaging platform</p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Main layout: 3D Model on left, button grids on right */}
                                        {(showTattooPlacement || showPiercingPlacement) && (
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '12px' }}>
                                                {/* 3D Body Model (shared for both tattoo + piercing) */}
                                                <Suspense fallback={<div style={{ height: '340px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', borderRadius: '16px' }}>Loading 3D Model...</div>}>
                                                    <BodyModelViewer
                                                        selectedTattoo={bookingData.placement}
                                                        selectedPiercing={bookingData[piercingField]}
                                                        onToggle={handleModelToggle}
                                                        tattooParts={showTattooPlacement ? tattooBodyParts : []}
                                                        piercingParts={showPiercingPlacement ? piercingBodyParts : []}
                                                        height={showTattooPlacement && showPiercingPlacement ? 440 : 400}
                                                    />
                                                </Suspense>

                                                {/* Button Grids (stacked) */}
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', maxHeight: showTattooPlacement && showPiercingPlacement ? '440px' : '400px', paddingRight: '4px' }}>
                                                    {showTattooPlacement && (
                                                        <>
                                                            <p style={{ fontWeight: '700', color: '#1e293b', margin: 0, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                <Paintbrush size={15} color="#be9055" /> Tattoo Placement
                                                            </p>
                                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '7px' }}>
                                                                {tattooBodyParts.map(part => {
                                                                    const isSelected = bookingData.placement.includes(part);
                                                                    return (
                                                                        <button key={part} type="button" onClick={() => togglePlacementItem('placement', part)} style={{
                                                                            padding: '9px 5px', borderRadius: '10px',
                                                                            border: `1.5px solid ${isSelected ? '#be9055' : '#e2e8f0'}`,
                                                                            background: isSelected ? '#be9055' : 'white',
                                                                            color: isSelected ? 'white' : '#1e293b',
                                                                            fontWeight: '600', fontSize: '0.78rem', cursor: 'pointer',
                                                                            transition: 'all 0.2s',
                                                                            boxShadow: isSelected ? '0 2px 8px rgba(193,154,107,0.3)' : 'none'
                                                                        }}>
                                                                            {isSelected && <Check size={11} style={{ marginRight: '3px', verticalAlign: 'middle' }} />}
                                                                            {part}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </>
                                                    )}

                                                    {showTattooPlacement && showPiercingPlacement && (
                                                        <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '4px 0' }} />
                                                    )}

                                                    {showPiercingPlacement && (
                                                        <>
                                                            <p style={{ fontWeight: '700', color: '#1e293b', margin: 0, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                <Gem size={15} color="#4FC3F7" /> Piercing Placement
                                                            </p>
                                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '7px' }}>
                                                                {piercingBodyParts.map(part => {
                                                                    const isSelected = bookingData[piercingField].includes(part);
                                                                    return (
                                                                        <button key={`p-${part}`} type="button" onClick={() => togglePlacementItem(piercingField, part)} style={{
                                                                            padding: '9px 5px', borderRadius: '10px',
                                                                            border: `1.5px solid ${isSelected ? '#be9055' : '#e2e8f0'}`,
                                                                            background: isSelected ? '#be9055' : 'white',
                                                                            color: isSelected ? 'white' : '#1e293b',
                                                                            fontWeight: '600', fontSize: '0.78rem', cursor: 'pointer',
                                                                            transition: 'all 0.2s',
                                                                            boxShadow: isSelected ? '0 2px 8px rgba(193,154,107,0.3)' : 'none'
                                                                        }}>
                                                                            {isSelected && <Check size={11} style={{ marginRight: '3px', verticalAlign: 'middle' }} />}
                                                                            {part}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        <div className="form-group customer-st-842c3fb4" >
                                            <label className="customer-st-fc6d29da" >
                                                Specific location notes
                                                {(bookingData.placement.includes('Other') || bookingData.piercingPlacement.includes('Other')) && (
                                                    <span style={{ color: '#ef4444', fontWeight: '400' }}> *</span>
                                                )}
                                            </label>
                                            <input 
                                                ref={placementNotesRef}
                                                type="text" className="form-input" placeholder={showTattooPlacement && showPiercingPlacement ? 'e.g. Left inner forearm tattoo, right ear helix piercing' : 'e.g. Left inner forearm, near elbow'}
                                                name="placementNotes"
                                                value={bookingData.placementNotes} onChange={handleBookingFormChange} 
                                                maxLength={200}
                                                style={{
                                                    borderColor: errors.placementNotes || ((bookingData.placement.includes('Other') || bookingData.piercingPlacement.includes('Other')) && !bookingData.placementNotes.trim()) ? '#ef4444' : undefined,
                                                    boxShadow: errors.placementNotes || ((bookingData.placement.includes('Other') || bookingData.piercingPlacement.includes('Other')) && !bookingData.placementNotes.trim()) ? '0 0 0 2px rgba(239,68,68,0.15)' : undefined
                                                }}
                                            />
                                            {errors.placementNotes && <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '4px', display: 'block' }}>{errors.placementNotes}</span>}
                                        </div>

                                        {/* Selection summary */}
                                        {(bookingData.placement.length > 0 || bookingData.piercingPlacement.length > 0) && (
                                            <div style={{ marginTop: '12px', padding: '12px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                {bookingData.placement.length > 0 && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#166534' }}>
                                                        <Check size={14} color="#16a34a" />
                                                        <strong>{showPiercingPlacement && showTattooPlacement ? 'Tattoo:' : 'Placement:'}</strong>
                                                        {bookingData.placement.join(', ')}
                                                    </div>
                                                )}
                                                {bookingData.piercingPlacement.length > 0 && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#166534' }}>
                                                        <Check size={14} color="#16a34a" /> <strong>Piercing:</strong> {bookingData.piercingPlacement.join(', ')}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    );
                                })()}

                                {bookingStep === 4 && (() => {
                                    const derivedType = getDerivedServiceType(bookingData.selectedServices);
                                    return (
                                    <div className="fade-in">
                                        <h3 className="customer-st-69ffca42" >4. Schedule Your Session</h3>
                                        <div className="customer-st-d1b64d7a" >
                                            <div className="calendar-container customer-st-8601e470" >
                                                <div className="customer-st-0c5ea219" >
                                                    <button className="customer-st-67331937" type="button" onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))} ><ChevronLeft size={20}/></button>
                                                    <span className="customer-st-52ddb992" >{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}</span>
                                                    <button className="customer-st-67331937" type="button" onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))} ><ChevronRight size={20}/></button>
                                                </div>
                                                <div className="calendar-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', fontSize: '0.8rem' }}>
                                                    {['S','M','T','W','T','F','S'].map(d => <div className="customer-st-1894d8a4" key={d} >{d}</div>)}
                                                    {renderCalendarDays()}
                                                </div>
                                            </div>
                                            {['Consultation', 'Piercing', 'Tattoo + Piercing'].includes(derivedType) && (
                                                <div className="time-slots">
                                                    <label className="customer-st-36716a21" >Preferred Time Slot {derivedType === 'Tattoo + Piercing' ? '(for piercing)' : ''}</label>
                                                    <div className="customer-st-caa523c7" >
                                                        {['13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'].map(t => {
                                                            let isDisabled = false;
                                                            if (bookingData.date) {
                                                                const checkDate = new Date(`${bookingData.date}T${t}:00`);
                                                                if (checkDate <= new Date()) isDisabled = true;
                                                                // Check the correct pool based on service type
                                                                const pool = derivedType === 'Consultation' ? 'consultationTimes' : 'piercingTimes';
                                                                if (bookedDates[bookingData.date] && bookedDates[bookingData.date][pool].includes(t)) isDisabled = true;
                                                            } else {
                                                                isDisabled = true; // Wait for date selection
                                                            }

                                                            return (
                                                            <div 
                                                                key={t}
                                                                onClick={() => {
                                                                    if (!isDisabled) setBookingData({...bookingData, startTime: t});
                                                                }}
                                                                style={{
                                                                    padding: '12px', borderRadius: '8px', border: `1px solid ${bookingData.startTime === t ? '#be9055' : '#e2e8f0'}`,
                                                                    background: bookingData.startTime === t ? '#be9055' : (isDisabled ? '#f8fafc' : 'white'),
                                                                    color: bookingData.startTime === t ? 'white' : (isDisabled ? '#cbd5e1' : '#1e293b'),
                                                                    textAlign: 'center', cursor: isDisabled ? 'not-allowed' : 'pointer', fontWeight: '600', fontSize: '0.9rem',
                                                                    opacity: isDisabled ? 0.6 : 1
                                                                }}
                                                            >
                                                                {parseInt(t) > 12 ? (parseInt(t)-12) + ':00 PM' : t + ':00 PM'}
                                                            </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        
                                        {bookingData.date && bookingData.startTime && (
                                            <div className="customer-st-21be8237" >
                                                <CheckCircle size={20} color="#16a34a" />
                                                <span className="customer-st-e295ad00" >
                                                    Selected: {new Date(bookingData.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })} at {bookingData.startTime}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    );
                                })()}
                            </div>

                            <div className="modal-footer" style={{ display: 'flex', flexDirection: 'row', gap: '16px', padding: '16px 24px', borderTop: '1px solid #e2e8f0' }} >
                                <button 
                                    className="btn" 
                                    type="button" 
                                    onClick={() => bookingStep === 1 ? closeBookingModal() : setBookingStep(bookingStep - 1)} 
                                    style={{ 
                                        flex: 1,
                                        background: bookingStep === 1 ? '#ef4444' : '#64748b', 
                                        color: 'white', 
                                        border: 'none', 
                                        padding: '12px', 
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        fontWeight: '600',
                                        fontSize: '0.95rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {bookingStep === 1 ? 'Cancel' : <><ArrowLeft size={16}/> Previous</>}
                                </button>
                                
                                {bookingStep < 4 ? (
                                    <button 
                                        className="btn" 
                                        type="button" 
                                        onClick={handleNextStep}
                                        style={{ 
                                            flex: 1,
                                            background: '#be9055', 
                                            color: 'white', 
                                            border: 'none', 
                                            padding: '12px', 
                                            borderRadius: '8px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            fontWeight: '600',
                                            fontSize: '0.95rem',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Next Step <ArrowRight size={16}/>
                                    </button>
                                ) : (
                                    <button 
                                        className="btn" 
                                        type="button" 
                                        onClick={handleSubmitBooking} 
                                        disabled={isSubmitting}
                                        style={{ 
                                            flex: 1,
                                            background: '#22c55e', 
                                            color: 'white', 
                                            border: 'none', 
                                            padding: '12px', 
                                            borderRadius: '8px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            fontWeight: '600',
                                            fontSize: '0.95rem',
                                            cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                            opacity: isSubmitting ? 0.7 : 1
                                        }}
                                    >
                                        {isSubmitting ? 'Submitting...' : 'Complete Booking'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .calendar-day {
                    aspect-ratio: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    border-radius: 8px;
                    transition: all 0.2s;
                    font-family: 'Inter', sans-serif;
                }
                .calendar-day:hover:not(.disabled):not(.selected) { filter: brightness(0.95); }
                .calendar-day.selected { border: 2px solid #be9055 !important; box-shadow: 0 0 0 3px rgba(193, 154, 107, 0.2) !important; font-weight: 700; }
                .calendar-day.disabled { cursor: not-allowed; pointer-events: none; }
                .fade-in { animation: fadeIn 0.3s ease-in-out; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>

            {/* Cancellation Reason Modal */}
            {cancelModal.isOpen && (
                <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => !isCancelling && setCancelModal({ isOpen: false, appointmentId: null, reason: '' })}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', color: '#dc2626' }}>
                                <AlertTriangle size={22} color="#dc2626" /> Cancel Booking
                            </h3>
                            <button className="close-btn" onClick={() => !isCancelling && setCancelModal({ isOpen: false, appointmentId: null, reason: '' })}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body" style={{ padding: '20px' }}>
                            {/* Warning Banner */}
                            <div style={{
                                background: 'linear-gradient(135deg, #fef2f2, #fff1f2)',
                                border: '1px solid #fecaca',
                                borderRadius: '12px',
                                padding: '14px 16px',
                                marginBottom: '20px',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '10px'
                            }}>
                                <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                                <div>
                                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#991b1b', fontWeight: 600 }}>This action cannot be undone</p>
                                    <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#b91c1c' }}>
                                        Once cancelled, you'll need to create a new booking. Excessive cancellations (3+ per month) may result in temporary restrictions.
                                    </p>
                                </div>
                            </div>

                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>
                                Why are you cancelling this booking?
                            </label>
                            <textarea
                                value={cancelModal.reason}
                                onChange={(e) => setCancelModal(prev => ({ ...prev, reason: e.target.value }))}
                                placeholder="Please describe your reason for cancelling (e.g., schedule conflict, change of mind, emergency)..."
                                rows={4}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '10px',
                                    border: `1px solid ${cancelModal.reason.length >= 10 ? '#a7f3d0' : cancelModal.reason.length > 0 ? '#fde68a' : '#e2e8f0'}`,
                                    fontSize: '0.9rem',
                                    resize: 'vertical',
                                    fontFamily: 'inherit',
                                    outline: 'none',
                                    transition: 'border-color 0.2s',
                                    background: '#f8fafc',
                                    boxSizing: 'border-box'
                                }}
                                maxLength={500}
                                disabled={isCancelling}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                                <span style={{ fontSize: '0.75rem', color: cancelModal.reason.length < 10 && cancelModal.reason.length > 0 ? '#f59e0b' : '#94a3b8' }}>
                                    {cancelModal.reason.length < 10 ? `${10 - cancelModal.reason.length} more characters needed` : '✓ Reason is valid'}
                                </span>
                                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                    {cancelModal.reason.length}/500
                                </span>
                            </div>
                        </div>
                        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '16px 20px', borderTop: '1px solid #e2e8f0' }}>
                            <button
                                className="btn btn-secondary"
                                onClick={() => setCancelModal({ isOpen: false, appointmentId: null, reason: '' })}
                                disabled={isCancelling}
                                style={{ padding: '8px 20px' }}
                            >
                                Back
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={submitCancellation}
                                disabled={isCancelling || cancelModal.reason.trim().length < 10}
                                style={{
                                    padding: '8px 20px',
                                    background: cancelModal.reason.trim().length >= 10 ? 'linear-gradient(135deg, #ef4444, #dc2626)' : '#cbd5e1',
                                    color: 'white',
                                    border: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    cursor: cancelModal.reason.trim().length >= 10 ? 'pointer' : 'not-allowed',
                                    opacity: isCancelling ? 0.7 : 1
                                }}
                            >
                                {isCancelling ? 'Cancelling...' : <><X size={16}/> Confirm Cancellation</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal 
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmText={confirmModal.confirmText}
                onConfirm={confirmModal.onConfirm}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                type={confirmModal.type}
                isAlert={confirmModal.isAlert}
            />

            {/* Migration Success Modal */}
            {migrationModal.show && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 9999, animation: 'fadeIn 0.3s ease'
                }}>
                    <div style={{
                        background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(255,255,255,0.5)', borderRadius: '24px',
                        padding: '40px 36px 32px', maxWidth: '420px', width: '90%', textAlign: 'center',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                        animation: 'slideUp 0.35s ease', fontFamily: "'Inter', sans-serif"
                    }}>
                        <div style={{
                            width: '72px', height: '72px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, rgba(193,154,107,0.15), rgba(193,154,107,0.05))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 20px', border: '2px solid rgba(193,154,107,0.2)'
                        }}>
                            <span style={{ fontSize: '32px', color: '#be9055', fontWeight: 700 }}>i</span>
                        </div>
                        <h2 style={{ color: '#1e293b', fontSize: '1.3rem', fontWeight: 700, margin: '0 0 8px' }}>
                            Prior Consultation Data Found!
                        </h2>
                        <p style={{ color: '#64748b', fontSize: '0.92rem', lineHeight: 1.7, margin: '0 0 20px' }}>
                            Based on your account email, we found <strong style={{ color: '#be9055' }}>{migrationModal.count} consultation request{migrationModal.count > 1 ? 's' : ''}</strong> you made before creating your account. {migrationModal.count > 1 ? 'They have' : 'It has'} been automatically migrated to this account.
                        </p>
                        <div style={{
                            padding: '14px 20px', background: 'rgba(193,154,107,0.08)',
                            border: '1px solid rgba(193,154,107,0.15)', borderRadius: '12px',
                            marginBottom: '24px'
                        }}>
                            <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', lineHeight: 1.6 }}>
                                You can now view and track {migrationModal.count > 1 ? 'these bookings' : 'this booking'} in your <strong style={{ color: '#1e293b' }}>My Bookings</strong> page. Our team will reach out to confirm details.
                            </p>
                        </div>
                        <button
                            onClick={() => setMigrationModal({ show: false, count: 0 })}
                            style={{
                                width: '100%', padding: '14px 24px',
                                background: '#be9055',
                                color: '#fff', border: 'none', borderRadius: '12px',
                                fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer',
                                transition: 'all 0.2s ease', boxShadow: '0 4px 12px rgba(193,154,107,0.3)',
                                fontFamily: "'Inter', sans-serif"
                            }}
                            onMouseEnter={e => e.target.style.transform = 'translateY(-1px)'}
                            onMouseLeave={e => e.target.style.transform = 'translateY(0)'}
                        >
                            Got It, View My Bookings
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default CustomerBookings;
