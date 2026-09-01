import { getSessionPaymentStatus, shouldShowInQueue } from './sessionPayment';

describe('artist session payment rules', () => {
    test('keeps unpaid sessions visible and allows management with a reminder', () => {
        const session = { service_type: 'Tattoo Session', payment_status: 'unpaid' };

        expect(shouldShowInQueue(session)).toBe(true);
        expect(getSessionPaymentStatus(session)).toMatchObject({ canStart: true, needsReminder: true });
    });

    test('allows a partially-paid session with a balance reminder', () => {
        const session = { service_type: 'Tattoo Session', payment_status: 'downpayment_paid' };

        expect(getSessionPaymentStatus(session)).toMatchObject({ canStart: true, needsReminder: true });
    });

    test('allows consultations without payment', () => {
        const session = { service_type: 'Consultation', payment_status: 'unpaid' };

        expect(getSessionPaymentStatus(session)).toMatchObject({ canStart: true, needsReminder: false });
    });
});
