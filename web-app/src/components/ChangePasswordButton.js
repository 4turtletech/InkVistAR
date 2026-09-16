import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Axios from 'axios';
import { API_URL, setAccessToken } from '../config';
import './ChangePasswordButton.css';

export default function ChangePasswordButton() {
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(false);
    const [values, setValues] = useState({ currentPassword: '', newPassword: '', confirm: '' });
    const [errors, setErrors] = useState({});
    const [visible, setVisible] = useState({});
    const lock = useRef(false);
    const dialog = useRef(null);
    const trigger = useRef(null);
    useEffect(() => {
        if (!open) return;
        const previous = document.body.style.overflow;
        const triggerElement = trigger.current;
        document.body.style.overflow = 'hidden';
        dialog.current?.querySelector('input, button')?.focus();
        return () => { document.body.style.overflow = previous; triggerElement?.focus(); };
    }, [open]);
    const close = () => { if (!lock.current) setOpen(false); };
    const submit = async e => {
        e.preventDefault();
        e.stopPropagation();
        if (lock.current) return;
        const next = {};
        if (!values.currentPassword) next.currentPassword = 'Enter your current password.';
        if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,128}$/.test(values.newPassword)) next.newPassword = 'Use 8–128 characters with uppercase, lowercase, a number and a symbol.';
        if (!values.confirm || values.confirm !== values.newPassword) next.confirm = 'New passwords must match.';
        setErrors(next);
        if (Object.keys(next).length) return;
        lock.current = true; setBusy(true);
        try {
            const { data } = await Axios.post(`${API_URL}/api/auth/change-password`, values, { withCredentials: true });
            if (!data.success || !data.accessToken) throw new Error(data.message || 'Unable to update password.');
            setAccessToken(data.accessToken);
            setValues({ currentPassword: '', newPassword: '', confirm: '' });
            setDone(true);
        } catch (error) {
            const data = error.response?.data;
            const field = data?.code === 'current_password_invalid' ? 'currentPassword' : ['password_reused', 'password_policy_failed'].includes(data?.code) ? 'newPassword' : 'submit';
            setErrors({ [field]: data?.message || 'Unable to update password. Please try again.' });
        } finally { lock.current = false; setBusy(false); }
    };
    return <>
        <button ref={trigger} type="button" className="btn btn-secondary" onClick={() => {
            setValues({ currentPassword: '', newPassword: '', confirm: '' }); setErrors({}); setVisible({}); setDone(false); setOpen(true);
        }}>Change Password</button>
        {open && createPortal(<div className="password-settings-overlay">
            <section ref={dialog} className="password-settings-dialog" role="dialog" aria-modal="true" aria-labelledby="password-settings-title" onKeyDown={e => {
                if (e.key === 'Escape') close();
                if (e.key === 'Tab') {
                    const nodes = dialog.current.querySelectorAll('button:not(:disabled), input:not(:disabled)');
                    const first = nodes[0], last = nodes[nodes.length - 1];
                    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
                    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
                }
            }}>
                <h2 id="password-settings-title">{done ? 'Password updated' : 'Change Password'}</h2>
                {done ? <><p>You’re still signed in here. Other devices have been signed out.</p><button type="button" onClick={close}>Done</button></> : <form onSubmit={submit} noValidate>
                    <p>Use your current password to confirm this change. You’ll stay signed in on this device.</p>
                    {[['currentPassword', 'Current Password'], ['newPassword', 'New Password'], ['confirm', 'Confirm New Password']].map(([field, label]) => <div key={field} className="password-settings-field">
                        <label htmlFor={`password-settings-${field}`}>{label}</label>
                        <div className="password-settings-input"><input id={`password-settings-${field}`} type={visible[field] ? 'text' : 'password'} autoComplete={field === 'currentPassword' ? 'current-password' : 'new-password'} maxLength={128} value={values[field]} disabled={busy} aria-invalid={!!errors[field]} aria-describedby={errors[field] ? `password-settings-error-${field}` : undefined} onChange={e => { setValues(v => ({ ...v, [field]: e.target.value })); setErrors(v => ({ ...v, [field]: '', submit: '' })); }} />
                        <button type="button" disabled={busy} aria-label={`${visible[field] ? 'Hide' : 'Show'} ${label}`} onClick={() => setVisible(v => ({ ...v, [field]: !v[field] }))}>{visible[field] ? 'Hide' : 'Show'}</button></div>
                        {errors[field] && <small id={`password-settings-error-${field}`} role="alert">{errors[field]}</small>}
                    </div>)}
                    <p>8–128 characters, including uppercase, lowercase, a number and a symbol.</p>
                    {errors.submit && <small role="alert">{errors.submit}</small>}
                    <footer><button type="button" disabled={busy} onClick={close}>Cancel</button><button type="submit" disabled={busy}>{busy ? 'Updating…' : 'Update Password'}</button></footer>
                </form>}
            </section>
        </div>, document.body)}
    </>;
}
