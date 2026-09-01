import { getAppointmentStatusDialog } from './appointmentStatusDialog';

test('uses clear confirmation wording for approving an appointment', () => {
    expect(getAppointmentStatusDialog('confirmed')).toEqual(expect.objectContaining({
        title: 'Confirm Appointment',
        actionVerb: 'confirm',
        confirmText: 'Confirm',
        type: 'success',
    }));
});

test('uses an explicit destructive action for rejecting an appointment', () => {
    expect(getAppointmentStatusDialog('rejected')).toEqual(expect.objectContaining({
        title: 'Reject Appointment',
        actionVerb: 'reject',
        confirmText: 'Reject',
        type: 'reject',
    }));
});
