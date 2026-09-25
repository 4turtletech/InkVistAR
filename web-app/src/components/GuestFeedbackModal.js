import React, { useEffect, useState } from 'react';
import Axios from 'axios';
import { CheckCircle, Star, X } from 'lucide-react';
import { API_URL } from '../config';
import './GuestFeedbackModal.css';

const initialForm = {
    displayName: '',
    email: '',
    rating: 0,
    comment: '',
    website: '',
};

export default function GuestFeedbackModal({ isOpen, onClose }) {
    const [form, setForm] = useState(initialForm);
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        if (!isOpen) return undefined;
        const handleKeyDown = (event) => {
            if (event.key === 'Escape' && !isSubmitting) onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, isSubmitting, onClose]);

    if (!isOpen) return null;

    const updateField = (field, value) => {
        setForm((current) => ({ ...current, [field]: value }));
        setErrors((current) => ({ ...current, [field]: '', form: '', submit: '' }));
    };

    const validate = () => {
        const nextErrors = {};
        if (!form.rating && !form.comment.trim()) {
            nextErrors.form = 'Please select a rating or write a short comment.';
        }
        if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
            nextErrors.email = 'Enter a valid email address.';
        }
        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (isSubmitting || !validate()) return;
        setIsSubmitting(true);
        try {
            await Axios.post(`${API_URL}/api/guest-feedback`, form);
            setSubmitted(true);
            setForm(initialForm);
        } catch (error) {
            setErrors({ submit: error.response?.data?.message || 'Your feedback could not be submitted. Please try again.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const closeModal = () => {
        if (isSubmitting) return;
        setSubmitted(false);
        setErrors({});
        onClose();
    };

    return (
        <div className="guest-feedback-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeModal()}>
            <section className="guest-feedback-modal" role="dialog" aria-modal="true" aria-labelledby="guest-feedback-title">
                <header className="guest-feedback-header">
                    <div>
                        <span className="guest-feedback-eyebrow">Guest experience</span>
                        <h2 id="guest-feedback-title">Share your feedback</h2>
                    </div>
                    <button type="button" className="guest-feedback-close" onClick={closeModal} aria-label="Close feedback form">
                        <X size={20} aria-hidden="true" />
                    </button>
                </header>

                {submitted ? (
                    <div className="guest-feedback-success" aria-live="polite">
                        <CheckCircle size={42} aria-hidden="true" />
                        <h3>Thank you for sharing.</h3>
                        <p>Your feedback was sent to the studio for review.</p>
                        <button type="button" className="guest-feedback-primary" onClick={closeModal}>Done</button>
                    </div>
                ) : (
                    <form className="guest-feedback-form" onSubmit={handleSubmit} noValidate>
                        <p className="guest-feedback-intro">Rate your website or studio experience, leave a comment, or do both.</p>

                        <fieldset className="guest-rating-fieldset">
                            <legend>Rating <span>(optional if you leave a comment)</span></legend>
                            <div className="guest-rating-options" aria-label="Select a rating from one to five stars">
                                {[1, 2, 3, 4, 5].map((value) => (
                                    <button
                                        type="button"
                                        key={value}
                                        className={form.rating >= value ? 'selected' : ''}
                                        onClick={() => updateField('rating', value)}
                                        aria-label={`${value} ${value === 1 ? 'star' : 'stars'}`}
                                        aria-pressed={form.rating === value}
                                    >
                                        <Star size={26} fill={form.rating >= value ? 'currentColor' : 'none'} aria-hidden="true" />
                                    </button>
                                ))}
                            </div>
                        </fieldset>

                        <label className="guest-feedback-field">
                            <span>Feedback <small>Optional if you selected a rating</small></span>
                            <textarea
                                value={form.comment}
                                onChange={(event) => updateField('comment', event.target.value.slice(0, 2000))}
                                rows="5"
                                maxLength="2000"
                                placeholder="Tell us what worked well or what we can improve."
                            />
                            <small className="guest-feedback-counter">{form.comment.length}/2000</small>
                        </label>

                        <div className="guest-feedback-identity">
                            <label className="guest-feedback-field">
                                <span>Name <small>Optional</small></span>
                                <input
                                    type="text"
                                    value={form.displayName}
                                    onChange={(event) => updateField('displayName', event.target.value.slice(0, 100))}
                                    maxLength="100"
                                    autoComplete="name"
                                    placeholder="Guest"
                                />
                            </label>
                            <label className="guest-feedback-field">
                                <span>Email <small>Optional, not displayed</small></span>
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={(event) => updateField('email', event.target.value.slice(0, 254))}
                                    maxLength="254"
                                    autoComplete="email"
                                    placeholder="you@example.com"
                                    aria-invalid={Boolean(errors.email)}
                                />
                                {errors.email && <small className="guest-feedback-error">{errors.email}</small>}
                            </label>
                        </div>

                        <label className="guest-feedback-honeypot" aria-hidden="true">
                            Website
                            <input type="text" tabIndex="-1" autoComplete="off" value={form.website} onChange={(event) => updateField('website', event.target.value)} />
                        </label>

                        {(errors.form || errors.submit) && (
                            <p className="guest-feedback-form-error" role="alert">{errors.form || errors.submit}</p>
                        )}

                        <footer className="guest-feedback-actions">
                            <p>Submissions are reviewed before they may appear publicly.</p>
                            <button type="submit" className="guest-feedback-primary" disabled={isSubmitting}>
                                {isSubmitting ? 'Submitting…' : 'Submit feedback'}
                            </button>
                        </footer>
                    </form>
                )}
            </section>
        </div>
    );
}
