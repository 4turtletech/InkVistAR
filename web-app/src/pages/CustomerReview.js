import './CustomerStyles.css';
import React, { useState, useEffect } from 'react';
import Axios from 'axios';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Star, ArrowLeft, CheckCircle } from 'lucide-react';
import CustomerSideNav from '../components/CustomerSideNav';
import './PortalStyles.css';
import { API_URL } from '../config';

function CustomerReview() {
    const [searchParams] = useSearchParams();
    const appointmentId = searchParams.get('appointment');
    const navigate = useNavigate();

    const [rating, setRating] = useState(5);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [errors, setErrors] = useState({});
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
        if (errors.comment) {
            setErrorMsg('Please fix validation errors before submitting.');
            return;
        }
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
            console.error('[REVIEW] Submit error:', error.response?.data || error.message);
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
                        <div className="premium-review-container premium-success-state" >
                            <div className="success-icon-wrapper">
                                <CheckCircle size={54} color="#f59e0b" />
                            </div>
                            <h2 style={{ fontSize: '2rem', color: '#1e293b', margin: '0 0 10px 0' }}>Thank You!</h2>
                            <p style={{ color: '#64748b', fontSize: '1.1rem', marginBottom: '30px' }}>Your review has been submitted and is pending moderation.</p>
                            <button className="premium-submit-btn" onClick={() => navigate('/customer')} style={{ padding: '14px 30px', fontSize: '1.05rem', borderRadius: '12px', width: 'auto', margin: '0 auto' }}>Return to Portal</button>
                        </div>
                    ) : (
                        <div className="premium-review-container" >
                            {errorMsg && <div className="alert alert-error customer-st-c763b02a" >{errorMsg}</div>}
                            
                            {!appointment ? (
                                <div style={{ textAlign: 'center', padding: '40px' }}>
                                    <div className="premium-loader" style={{ margin: '0 auto 20px', borderTopColor: '#f59e0b', width: '30px', height: '30px', animation: 'spin 1s linear infinite' }}></div>
                                    <p style={{ color: '#64748b' }}>Loading session details...</p>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit}>
                                    <div className="premium-review-header" >
                                        <h3 className="premium-review-title" >Rate Your Session</h3>
                                        <p className="premium-review-subtitle" >How was your experience getting the "{appointment.design_title}" tattoo?</p>
                                        <div className="premium-review-artist-badge">
                                            Artist: {appointment.artist_name || 'InkVistAR Pro'}
                                        </div>
                                    </div>
                                    
                                    <div className="premium-star-container" >
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <button 
                                                type="button" 
                                                className="premium-star-btn" 
                                                key={star} 
                                                onClick={() => setRating(star)}
                                                onMouseEnter={() => setHoverRating(star)}
                                                onMouseLeave={() => setHoverRating(0)}
                                            >
                                                <Star 
                                                    size={48} 
                                                    color={((hoverRating || rating) >= star) ? '#f59e0b' : '#cbd5e1'} 
                                                    fill={((hoverRating || rating) >= star) ? '#f59e0b' : 'transparent'} 
                                                    style={{ transition: 'all 0.2s' }}
                                                />
                                            </button>
                                        ))}
                                    </div>
                                    
                                    <div className="premium-textarea-group" >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '10px' }}>
                                            <label className="premium-textarea-label" style={{ marginBottom: 0 }}>Tell us more about your experience (Optional)</label>
                                        </div>
                                        
                                        <div className="premium-chips-container">
                                            {["Great Experience", "Fast Speed of Service", "Excellent Hospitality", "Highly Professional", "Clean & Hygienic", "Loved the Result!"].map((phrase, idx) => (
                                                <button 
                                                    key={idx} 
                                                    type="button" 
                                                    className="premium-chip-btn"
                                                    onClick={() => {
                                                        let newComment = comment;
                                                        if (newComment.length > 0 && !newComment.endsWith(' ') && !newComment.endsWith('\n')) {
                                                            newComment += ' ';
                                                        }
                                                        newComment += phrase;
                                                        if (newComment.length > 1000) newComment = newComment.slice(0, 1000);
                                                        setComment(newComment);
                                                    }}
                                                >
                                                    + {phrase}
                                                </button>
                                            ))}
                                        </div>

                                        <textarea 
                                            className="premium-textarea" 
                                            value={comment} 
                                            maxLength={1000}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setComment(val);
                                                if (val.trim().length > 1000) {
                                                    setErrors(prev => ({ ...prev, comment: 'Review cannot exceed 1000 characters.' }));
                                                } else {
                                                    setErrors(prev => ({ ...prev, comment: '' }));
                                                }
                                            }} 
                                            placeholder="What did you love about your session? Was the artist professional?" 
                                            rows={4} 
                                            style={{ border: errors.comment ? '1px solid #ef4444' : undefined }}
                                        ></textarea>
                                        {errors.comment && <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '4px', display: 'block' }}>{errors.comment}</span>}
                                        
                                        <div className="premium-textarea-footer">
                                            <span className={`premium-char-counter ${comment.length >= 1000 ? 'limit-reached' : ''}`}>
                                                {comment.length} / 1000
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <button className="premium-submit-btn" type="submit" disabled={loading} >
                                        {loading ? (
                                            <>Submitting...</>
                                        ) : (
                                            <>Submit Review <Star size={18} fill="white" /></>
                                        )}
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
