import './CustomerStyles.css';
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Axios from 'axios';
import { Search, ChevronLeft, ChevronRight, Filter, CreditCard, Eye, CheckCircle, Info, X, Calendar, Inbox, Plus, Upload, Camera, Image as ImageIcon, User, Scissors, Heart, Sparkles, Check, ArrowRight, ArrowLeft, MapPin } from 'lucide-react';
import './PortalStyles.css';
import { API_URL } from '../config';
import CustomerSideNav from '../components/CustomerSideNav';
import Pagination from '../components/Pagination';
import ConfirmModal from '../components/ConfirmModal';

function CustomerBookings(){
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
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
    const [bookedDates, setBookedDates] = useState({});
    const serviceOptions = ['Tattoo Session', 'Consultation', 'Piercing', 'Follow-up', 'Touch-up'];
    
    const [bookingData, setBookingData] = useState({
        artistId: null, // Artist selection is now optional for the customer
        serviceType: '',
        date: '',
        startTime: '',
        designTitle: '',
        placement: '',
        notes: '',
        referenceImage: null,
    });

    const [isModalOpen, setIsModalOpen] = useState(false);
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

    useEffect(() => {
        const fetchArtists = async () => {
            try {
                const res = await Axios.get(`${API_URL}/api/customer/artists`);
                if (res.data.success) setArtists(res.data.artists);
            } catch (e) { console.error("Error fetching artists:", e); }
        };
        const fetchAvailability = async () => {
            try {
                const response = await Axios.get(`${API_URL}/api/artist/1/availability`);
                if (response.data.success) {
                    const bookings = {};
                    response.data.bookings.forEach(b => {
                        const dateStr = typeof b.appointment_date === 'string' 
                            ? b.appointment_date.substring(0, 10) 
                            : new Date(b.appointment_date).toISOString().split('T')[0];
                        if (!bookings[dateStr]) bookings[dateStr] = { count: 0, times: [] };
                        bookings[dateStr].count += 1;
                        if (b.start_time) bookings[dateStr].times.push(b.start_time.substring(0, 5));
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
        const matchesSearch = (apt.artist_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                              (apt.design_title || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || apt.status.toLowerCase() === statusFilter.toLowerCase();
        return matchesSearch && matchesStatus;
    });

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
                serviceType: appointment.service_type || 'Tattoo Session'
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

        for (let i = 0; i < firstDayOfMonth; i++) days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
        
        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const dateObj = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i);
            const isSelected = bookingData.date === dateStr;
            const isPast = dateObj <= today;
            const isTooFar = dateObj > maxDate;

            const dateData = bookedDates[dateStr] || { count: 0, times: [] };
            const isFull = dateData.count >= 7; // Up to 7 time blocks maximum
            const isBusy = dateData.count >= 4;

            let statusColor = '#10b981'; 
            if (isFull) statusColor = '#ef4444';
            else if (isBusy) statusColor = '#f59e0b';

            days.push(
                <div className={`${`calendar-day ${isPast || isTooFar ? 'disabled' : ''} customer-st-cdfe5ca9`} key={i} ${isSelected ? 'selected' : ''}`} onClick={() => { if (isPast || isTooFar) return; if (isFull) { showAlert("Fully Booked", "This date is fully booked. Please choose another date.", "warning"); return; } setBookingData({...bookingData, date: dateStr}); }} >
                    <span className="customer-st-b4dfcc0b" >{i}</span>
                    {!isPast && !isTooFar && (
                        <div style={{ width: '4px', height: '4px', borderRadius: '2px', backgroundColor: statusColor, marginTop: '2px' }} />
                    )}
                </div>
            );
        }
        return days;
    };

    const handleSubmitBooking = async (e) => {
        e.preventDefault();
        if (!bookingData.date || !bookingData.startTime || !bookingData.serviceType || !bookingData.placement) {
            showAlert("Missing Info", "Please select a service, placement, date, and time.", "warning");
            return;
        }

        if (bookingData.serviceType !== 'Consultation' && !bookingData.artistId) {
            showAlert("Artist Required", "Please select an artist for Tattoo or Piercing services.", "warning");
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await Axios.post(`${API_URL}/api/customer/appointments`, {
                customerId,
                artistId: bookingData.artistId,
                date: bookingData.date,
                startTime: bookingData.startTime,
                serviceType: bookingData.serviceType,
                designTitle: bookingData.designTitle,
                notes: `Placement: ${bookingData.placement}\n\nDetails: ${bookingData.notes}`,
                referenceImage: bookingData.referenceImage
            });

            if (res.data.success) {
                showAlert("Booking Requested", "Your session request has been sent! A confirmation notification with details has been added to your account.", "success");
                setIsBookingModalOpen(false);
                setBookingData({ artistId: '', serviceType: '', date: '', startTime: '', designTitle: '', placement: '', notes: '', referenceImage: null });
                // Refresh list
                const fetchRes = await Axios.get(`${API_URL}/api/customer/${customerId}/appointments`);
                if (fetchRes.data.success) setAppointments(fetchRes.data.appointments);
            }
        } catch (err) {
            showAlert("Booking Error", err.response?.data?.message || "Failed to submit request.", "danger");
        } finally {
            setIsSubmitting(false);
        }
    };

    const bodyParts = [
        "Forearm", "Upper Arm", "Shoulder", "Chest", "Back", "Ribs", "Thigh", "Calf", "Hand", "Neck", "Wrist", "Ankle"
    ];

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
                                            <option value="all">All Status</option>
                                            <option value="confirmed">Confirmed</option>
                                            <option value="pending">Pending</option>
                                            <option value="completed">Completed</option>
                                            <option value="cancelled">Cancelled</option>
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
                                            <thead><tr><th>ID</th><th>Staff</th><th>Service</th><th>Date</th><th>Time</th><th>Status</th><th>Price</th><th>Action</th></tr></thead>
                                            <tbody>{displayedAppointments.map(a=> (
                                                <tr key={a.id}>
                                                    <td className="customer-st-968fd1b5" >#{a.id}</td>
                                                    <td className="customer-st-8515177a" >{a.artist_name}</td>
                                                    <td>{a.service_type || 'Tattoo'}</td>
                                                    <td>{new Date(a.appointment_date).toLocaleDateString()}</td>
                                                    <td>{a.start_time}</td>
                                                    <td><span className={`status-badge ${a.status.toLowerCase()}`}>{a.status}</span></td>
                                                    <td>
                                                        {a.price > 0 ? (
                                                            <div className="customer-st-52ddb992" >₱{Number(a.price).toLocaleString()}</div>
                                                        ) : (
                                                            <span className="customer-st-b8eb7d87" >Pending Quote</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <div className="customer-st-929a545b" >
                                                            {a.status === 'pending' && a.price > 0 && a.payment_status === 'unpaid' ? (
                                                                <button className="btn btn-primary customer-st-f3c9d3c3" onClick={() => handlePay(a)} >
                                                                    <CreditCard size={14}/> Pay Deposit
                                                                </button>
                                                            ) : a.payment_status === 'paid' ? (
                                                                <span className="status-badge-v2 confirmed customer-st-abded735" >
                                                                    <CheckCircle size={12}/> Fully Paid
                                                                </span>
                                                            ) : a.payment_status === 'downpayment_paid' ? (
                                                                <button 
                                                                    className="btn btn-primary" 
                                                                    style={{padding: '6px 14px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white', border: 'none', boxShadow: '0 4px 10px rgba(245, 158, 11, 0.3)'}}
                                                                    onClick={() => handlePay(a, 'balance')}
                                                                >
                                                                    <CreditCard size={14}/> Pay Balance
                                                                </button>
                                                            ) : a.status === 'completed' ? (
                                                                <button className="btn btn-primary customer-st-6c6e14b5" onClick={() => { setSelectedApt(a); setShowAftercare(true); }} >
                                                                    <Heart size={14}/> Aftercare
                                                                </button>
                                                            ) : (
                                                                <span className="customer-st-48e66a80" >-</span>
                                                            )}

                                                            <button className="billing-details-btn customer-st-3047a29f" onClick={() => handleViewDetails(a)} >
                                                                <Info size={14} /> Details
                                                            </button>
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
                            <h3>Appointment Details</h3>
                            <button className="close-btn" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="customer-st-5c49f804" >
                                <div className="customer-st-e8eceac8" >
                                    <label className="customer-st-3c5cf8dd" >Staff Assigned</label>
                                    <p className="customer-st-5d13f831" >{selectedApt.artist_name || 'TBD'}</p>
                                </div>
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
                                    <span className="customer-st-c6cdc897" >₱{selectedApt.price.toLocaleString()}</span>
                                </div>
                                <div className="customer-st-56da6dbd" >
                                    <span className="customer-st-504f25fa" >Amount Paid:</span>
                                    <span className="customer-st-49af0fbb" >
                                        ₱{Number(selectedApt.total_paid || 0).toLocaleString()}
                                    </span>
                                </div>
                                <hr className="customer-st-b45fb1af" />
                                <div className="customer-st-4110ceca" >
                                    <span className="customer-st-e7b1617c" >Remaining Balance:</span>
                                    <span className="customer-st-58e71408" >
                                        ₱{Math.max(0, selectedApt.price - (selectedApt.total_paid || 0)).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer customer-st-14ad7875" >
                            <button className="btn btn-secondary customer-st-282aded5" onClick={() => setIsModalOpen(false)}>Close</button>
                            
                            {(['pending', 'confirmed', 'scheduled'].includes(selectedApt.status.toLowerCase())) && selectedApt.price > 0 && selectedApt.payment_status === 'unpaid' && (
                                <button className="btn btn-primary customer-st-9fb0229b" onClick={() => handlePay(selectedApt)} >
                                    <CreditCard size={18}/> Pay Deposit (₱{Math.round(selectedApt.price * 0.2).toLocaleString()})
                                </button>
                            )}
                            
                            {selectedApt.payment_status === 'downpayment_paid' && (
                                <button 
                                    className="btn btn-primary" 
                                    style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'linear-gradient(135deg, #f59e0b, #d97706)', border: 'none' }}
                                    onClick={() => handlePay(selectedApt, 'balance')}
                                >
                                    <CreditCard size={18}/> Pay Remaining Balance
                                </button>
                            )}
                            
                            {selectedApt.payment_status === 'paid' && (
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
            
            {/* Custom New Booking Modal */}
            {isBookingModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content large">
                        <div className="modal-header">
                            <h2 className="customer-st-da70abb8" ><Sparkles size={24} color="#daa520" /> New Booking Request</h2>
                            <button className="close-btn" onClick={() => setIsBookingModalOpen(false)}><X size={24} /></button>
                        </div>
                        <div className="modal-body customer-st-f182ff49" >
                            <div className="customer-st-befb1147" >
                                <div className="customer-st-f93c6e1f" >
                                    {[1, 2, 3, 4].map(step => (
                                        <div key={step} style={{ 
                                            height: '4px', flex: 1, borderRadius: '2px',
                                            background: bookingStep >= step ? '#daa520' : '#e2e8f0',
                                            transition: 'all 0.4s ease'
                                        }} />
                                    ))}
                                </div>
                            </div>
                        </div>
                        
                        <form onSubmit={handleSubmitBooking}>
                            <div className="modal-body customer-st-4a472601" >
                                
                                {bookingStep === 1 && (
                                    <div className="fade-in">
                                        <h3 className="customer-st-69ffca42" >1. Service Type</h3>
                                        <div className="form-group">
                                            <label className="customer-st-36716a21" >What type of service are you looking for?</label>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                                                {serviceOptions.map(type => (
                                                    <div 
                                                        key={type}
                                                        onClick={() => setBookingData({...bookingData, serviceType: type})}
                                                        style={{
                                                            padding: '16px', borderRadius: '12px', border: `2px solid ${bookingData.serviceType === type ? '#daa520' : '#e2e8f0'}`,
                                                            background: bookingData.serviceType === type ? '#fffdf5' : 'white', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s'
                                                        }}
                                                    >
                                                        <span className="customer-st-043152e7" >{type}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="customer-st-59166514" >
                                            <p className="customer-st-7b7d7267" >
                                                <Info className="customer-st-ff2b4fb6" size={14} />
                                                <strong>Artist Assignment:</strong> Our studio management will review your design and assign the best-suited resident artist for your specific style and complexity.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {bookingStep === 2 && (
                                    <div className="fade-in">
                                        <h3 className="customer-st-69ffca42" >2. Design Details</h3>
                                        <div className="form-group">
                                            <label className="customer-st-67198c20" >Tattoo Idea / Title</label>
                                            <input 
                                                type="text" className="form-input" placeholder="e.g. Traditional Dagger with Flowers" 
                                                value={bookingData.designTitle} onChange={e => setBookingData({...bookingData, designTitle: e.target.value})}
                                                minLength={3} maxLength={100}
                                            />
                                        </div>
                                        <div className="form-group customer-st-5d155c93" >
                                            <label className="customer-st-67198c20" >Tell us your story (Optional)</label>
                                            <textarea 
                                                className="form-input" rows="4" placeholder="Describe the size, color preferences, and any meaningful details..."
                                                value={bookingData.notes} onChange={e => setBookingData({...bookingData, notes: e.target.value})}
                                            />
                                        </div>
                                        <div className="form-group customer-st-5d155c93" >
                                            <label className="customer-st-67198c20" >Reference Image</label>
                                            <div 
                                                onClick={() => document.getElementById('modal-ref-img').click()}
                                                style={{ 
                                                    height: '120px', border: '2px dashed #e2e8f0', borderRadius: '12px', 
                                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
                                                    cursor: 'pointer', background: bookingData.referenceImage ? '#f8fafc' : 'transparent', overflow: 'hidden'
                                                }}
                                            >
                                                {bookingData.referenceImage ? (
                                                    <img className="customer-st-2fbefd4f" src={bookingData.referenceImage} alt="Ref" />
                                                ) : (
                                                    <>
                                                        <ImageIcon size={24} color="#94a3b8" />
                                                        <span className="customer-st-4b235664" >Upload a photo or sketch</span>
                                                    </>
                                                )}
                                                <input type="file" id="modal-ref-img" hidden accept="image/*" onChange={handleImageUpload} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {bookingStep === 3 && (
                                    <div className="fade-in">
                                        <h3 className="customer-st-69ffca42" >3. Placement</h3>
                                        <p className="customer-st-b943a453" >Where would you like your {bookingData.serviceType === 'Piercing' ? 'piercing' : 'tattoo'}?</p>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                                            {(bookingData.serviceType === 'Piercing' 
                                                ? ["Ear Lobe", "Helix", "Tragus", "Conch", "Industrial", "Nostril", "Septum", "Eyebrow", "Lip/Oral", "Navel", "Nipple", "Other"]
                                                : ["Forearm", "Upper Arm", "Shoulder", "Chest", "Back", "Ribs", "Thigh", "Calf", "Neck", "Wrist", "Hand", "Ankle"]
                                            ).map(part => (
                                                <button
                                                    key={part} type="button"
                                                    onClick={() => setBookingData({...bookingData, placement: part})}
                                                    style={{
                                                        padding: '12px', borderRadius: '10px', border: `1px solid ${bookingData.placement === part ? '#daa520' : '#e2e8f0'}`,
                                                        background: bookingData.placement === part ? '#daa520' : 'white',
                                                        color: bookingData.placement === part ? 'white' : '#1e293b',
                                                        fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s'
                                                    }}
                                                >
                                                    {part}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="form-group customer-st-842c3fb4" >
                                            <label className="customer-st-fc6d29da" >Specific location notes</label>
                                            <input 
                                                type="text" className="form-input" placeholder="e.g. Left inner forearm, near elbow" 
                                                value={bookingData.placementNotes} onChange={e => setBookingData({...bookingData, placementNotes: e.target.value})} 
                                            />
                                        </div>
                                    </div>
                                )}

                                {bookingStep === 4 && (
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
                                            <div className="time-slots">
                                                <label className="customer-st-36716a21" >Preferred Time Slot</label>
                                                <div className="customer-st-caa523c7" >
                                                    {['13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'].map(t => {
                                                        let isDisabled = false;
                                                        if (bookingData.date) {
                                                            const checkDate = new Date(`${bookingData.date}T${t}:00`);
                                                            if (checkDate <= new Date()) isDisabled = true;
                                                            if (bookedDates[bookingData.date] && bookedDates[bookingData.date].times.includes(t)) isDisabled = true;
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
                                                                padding: '12px', borderRadius: '8px', border: `1px solid ${bookingData.startTime === t ? '#daa520' : '#e2e8f0'}`,
                                                                background: bookingData.startTime === t ? '#daa520' : (isDisabled ? '#f8fafc' : 'white'),
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
                                )}
                            </div>

                            <div className="modal-footer customer-st-a2acee48" >
                                <button className="btn btn-secondary customer-st-929a545b" type="button" onClick={() => bookingStep === 1 ? setIsBookingModalOpen(false) : setBookingStep(bookingStep - 1)} >
                                    {bookingStep === 1 ? 'Cancel' : <><ArrowLeft size={16}/> Previous</>}
                                </button>
                                
                                {bookingStep < 4 ? (
                                    <button className="btn btn-primary customer-st-a412cd6b" type="button" onClick={() => setBookingStep(bookingStep + 1)} disabled={(bookingStep === 1 && !bookingData.serviceType) || (bookingStep === 2 && !bookingData.designTitle)} >
                                        Next Step <ArrowRight size={16}/>
                                    </button>
                                ) : (
                                    <button className="btn btn-primary customer-st-a1410f35" type="submit" disabled={isSubmitting || !bookingData.date || !bookingData.startTime} >
                                        {isSubmitting ? 'Submitting...' : 'Request Session'}
                                    </button>
                                )}
                            </div>
                        </form>
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
                }
                .calendar-day:hover:not(.disabled) { background: #f1f5f9; }
                .calendar-day.selected { background: #daa520 !important; color: white !important; font-weight: bold; }
                .calendar-day.disabled { opacity: 0.2; cursor: not-allowed; }
                .fade-in { animation: fadeIn 0.3s ease-in-out; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>

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
        </div>
    );
}

export default CustomerBookings;
