/**
 * Session Payment Validation Utility
 * Determines whether a session can be started based on service type and payment status.
 *
 * Rules:
 *   - Consultation: always free, no payment required
 *   - Tattoo Session (first/new): downpayment required (downpayment_paid or paid)
 *   - Tattoo Session (follow-up): must be fully paid
 *   - Piercing (first/new): downpayment required (standard ₱500, downpayment_paid or paid)
 *   - Piercing (follow-up): must be fully paid
 *   - Tattoo + Piercing bundle: same rules as tattoo (downpayment for first, full for follow-up)
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
 * Determines whether a session can be started and the reason if not.
 *
 * @param {Object} session - The appointment/session object from the API
 * @param {string} session.service_type - e.g. 'Tattoo Session', 'Piercing', 'Consultation'
 * @param {string} session.payment_status - e.g. 'unpaid', 'pending', 'downpayment_paid', 'paid'
 * @param {string} session.notes - appointment notes (used to detect follow-ups)
 * @returns {{ canStart: boolean, reason: string, category: string, isFollowUp: boolean }}
 */
export const getSessionPaymentStatus = (session) => {
    const category = getServiceCategory(session.service_type);
    const isFollowUp = isFollowUpSession(session);
    const paymentStatus = (session.payment_status || '').toLowerCase();

    // Consultations are always free
    if (category === 'consultation') {
        return { canStart: true, reason: '', category, isFollowUp: false };
    }

    // Follow-up sessions (tattoo, piercing, or bundle) must be fully paid
    if (isFollowUp) {
        const isPaid = paymentStatus === 'paid';
        return {
            canStart: isPaid,
            reason: isPaid ? '' : 'Full payment is required before starting a follow-up session. Please ensure the balance has been settled.',
            category,
            isFollowUp: true
        };
    }

    // First/new sessions: require at least a downpayment
    const hasDownpayment = paymentStatus === 'downpayment_paid' || paymentStatus === 'paid';
    const serviceLabel = category === 'piercing' ? 'piercing' : category === 'bundle' ? 'tattoo & piercing' : 'tattoo';
    return {
        canStart: hasDownpayment,
        reason: hasDownpayment ? '' : `A downpayment is required before starting this ${serviceLabel} session. The client's payment must be verified first.`,
        category,
        isFollowUp: false
    };
};

/**
 * Checks if a session should appear in the artist's daily queue.
 * Uses the same logic as getSessionPaymentStatus but intended for filtering.
 */
export const shouldShowInQueue = (session) => {
    const category = getServiceCategory(session.service_type);

    // Consultations always show in queue
    if (category === 'consultation') return true;

    const paymentStatus = (session.payment_status || '').toLowerCase();
    const isFollowUp = isFollowUpSession(session);

    if (isFollowUp) {
        // Follow-ups only show if fully paid
        return paymentStatus === 'paid';
    }

    // First/new sessions show if at least downpayment received
    return paymentStatus === 'downpayment_paid' || paymentStatus === 'paid';
};
