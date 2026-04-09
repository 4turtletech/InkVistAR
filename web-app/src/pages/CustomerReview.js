import './CustomerStyles.css';
import React, { useState, useEffect } from 'react';
import Axios from 'axios';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Star, ArrowLeft } from 'lucide-react';
import CustomerSideNav from '../components/CustomerSideNav';
import './PortalStyles.css';
import { API_URL } from '../config';

function CustomerReview() {
    const [searchParams] = useSearchParams();
    const appointmentId = searchParams.get('appointment');
    const navigate = useNavigate();

    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [appointment, setAppointment] = useState(null);

    const [user] = useState(() => {
        const saved = localStorage.getItem('user');
        return saved ? JSON.parse(saved) : null;
    });

    useEffect(() => {
        if (appointmentId && user) {
            fetchAppointmentDetails();
        }
    }, [appointmentId, user]);

    const fetchAppointmentDetails = async () => {
        try {
            const res = await Axios.get(`${API_URL}/api/customer/${user.id}/appointments`);
            if (res.data.success) {
                const appt = res.data.appointments.find(a => a.id === parseInt(appointmentId));
                if (appt) {
                    setAppointment(appt);
                } else {
                    setErrorMsg("Appointment not found or you don't have permission.");
                }
            }
        } catch(e) {
            console.error(e);
            setErrorMsg("Failed to verify appointment.");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!appointment) return;
        setLoading(true);
        setErrorMsg('');
        
        try {
            const res = await Axios.post(`${API_URL}/api/reviews`, {
                customer_id: user.id,
                artist_id: appointment.artist_id,
                appointment_id: appointment.id,
                rating,
                comment
            });
            
            if (res.data.success) {
                setSuccess(true);
            } else {
                setErrorMsg(res.data.message);
            }
        } catch (error) {
            setErrorMsg(error.response?.data?.message || 'Error submitting review.');
        }
        setLoading(false);
    };

    if (!user) return <div className="portal-layout"><CustomerSideNav /><div className="portal-container">Please login.</div></div>;

    return (
        <div className="portal-layout">
            <CustomerSideNav />
            <div className="portal-container customer-portal">
                <header className="portal-header">
                    <div className="customer-st-c060295c" >
                        <button className="action-btn customer-st-12556b4b" onClick={() => navigate(-1)} >
                            <ArrowLeft className="customer-st-92b47de2" size={16} /> Back
                        </button>
                        <h1 className="customer-st-03930596" >Review Your Session</h1>
                    </div>
                </header>

                <div className="portal-content">
                    {success ? (
                        <div className="data-card customer-st-108e349d" >
                            <Star className="customer-st-8afcd01b" size={48} color="#f59e0b" fill="#f59e0b" />
                            <h2>Thank You!</h2>
                            <p>Your review has been submitted and is pending moderation.</p>
                            <button className="premium-btn primary customer-st-842c3fb4" onClick={() => navigate('/customer')} >Return to Portal</button>
                        </div>
                    ) : (
                        <div className="data-card customer-st-afdbb800" >
                            {errorMsg && <div className="alert alert-error customer-st-c763b02a" >{errorMsg}</div>}
                            
                            {!appointment ? (
                                <p>Loading session details...</p>
                            ) : (
                                <form onSubmit={handleSubmit}>
                                    <div className="customer-st-e71e5ab0" >
                                        <h3 className="customer-st-299a8c77" >Session: {appointment.design_title}</h3>
                                        <p className="customer-st-504f25fa" >Rate your experience with your artist</p>
                                    </div>
                                    
                                    <div className="customer-st-6ef1d3d0" >
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <Star className="customer-st-5b46469c" key={star} size={40} color={rating >= star ? '#f59e0b' : '#cbd5e1'} fill={rating >= star ? '#f59e0b' : 'transparent'} onClick={() => setRating(star)} />
                                        ))}
                                    </div>
                                    
                                    <div className="form-group customer-st-cdb6f6cb" >
                                        <label>Comment (Optional)</label>
                                        <textarea className="customer-st-b5d17ae6" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Tell us about your tattoo and the artist's service..." rows={5} ></textarea>
                                    </div>
                                    
                                    <button className="premium-btn primary customer-st-1daa6293" type="submit" disabled={loading} >
                                        {loading ? 'Submitting...' : 'Submit Review'}
                                    </button>
                                </form>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default CustomerReview;
