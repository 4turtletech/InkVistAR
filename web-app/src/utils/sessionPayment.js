/**
 * Session Payment Reminder Utility
 * Describes what the artist should be reminded about without blocking work.
 *
 * Rules:
 *   - Consultation: always free, no payment required
 *   - Fully paid services: no reminder
 *   - Partially paid services: remind the artist that a balance remains
 *   - Unpaid services: remind the artist that payment may be collected afterward
 */

/**
 * Checks if a session/appointment is a follow-up of a previous booking.
 * Follow-ups are identified by the notes field containing the follow-up marker
 * inserted during the booking flow.
 */
const isFollowUpSession = (session) => {
    return (session.notes || '').includes('Follow-up of Booking');
};

/**
 * Determines the service category from the service_type field.
 * @returns {'consultation' | 'tattoo' | 'piercing' | 'bundle'}
 */
const getServiceCategory = (serviceType) => {
    const st = (serviceType || '').toLowerCase();
    if (st.includes('consultation')) return 'consultation';
    if (st.includes('tattoo') && st.includes('piercing')) return 'bundle';
    if (st.includes('piercing')) return 'piercing';
    // Default: treat as tattoo (including undefined/empty for legacy appointments)
    return 'tattoo';
};

/**
 * Describes the payment reminder shown to an artist before a session.
 * Payment is intentionally not a blocker because the studio may collect it
 * after the procedure.
 *
 * @param {Object} session - The appointment/session object from the API
 * @param {string} session.service_type - e.g. 'Tattoo Session', 'Piercing', 'Consultation'
 * @param {string} session.payment_status - e.g. 'unpaid', 'pending', 'downpayment_paid', 'paid'
 * @param {string} session.notes - appointment notes (used to detect follow-ups)
 * @returns {{ canStart: boolean, needsReminder: boolean, reason: string, label: string, category: string, isFollowUp: boolean }}
 */
export const getSessionPaymentStatus = (session) => {
    const category = getServiceCategory(session.service_type);
    const isFollowUp = isFollowUpSession(session);
    const paymentStatus = (session.payment_status || '').toLowerCase();

    // Consultations are always free
    if (category === 'consultation') {
        return { canStart: true, needsReminder: false, reason: '', label: '', category, isFollowUp: false };
    }

    if (paymentStatus === 'paid') {
        return { canStart: true, needsReminder: false, reason: '', label: '', category, isFollowUp };
    }

    // Payment is a reminder only; it never prevents the artist from working.
    if (isFollowUp) {
        return {
            canStart: true,
            needsReminder: true,
            reason: 'Payment has not been completed. The customer may settle the balance after the session.',
            label: 'Payment reminder: balance not yet settled',
            category,
            isFollowUp: true
        };
    }

    const hasDownpayment = paymentStatus === 'downpayment_paid';
    return {
        canStart: true,
        needsReminder: true,
        reason: hasDownpayment
            ? 'A partial payment is recorded. The customer may settle the remaining balance after the session.'
            : 'No payment is recorded yet. The customer may pay after the session.',
        label: hasDownpayment ? 'Payment reminder: remaining balance due' : 'Payment reminder: not paid yet',
        category,
        isFollowUp: false
    };
};

/**
 * Payment must never hide an assigned session from the artist's daily queue.
 * The queue shows the appointment and the action displays a payment reminder.
 */
export const shouldShowInQueue = () => true;
