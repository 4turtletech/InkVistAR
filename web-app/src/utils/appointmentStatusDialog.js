const STATUS_DIALOG_CONFIG = {
    confirmed: {
        title: 'Confirm Appointment',
        actionVerb: 'confirm',
        confirmText: 'Confirm',
        type: 'success',
    },
    rejected: {
        title: 'Reject Appointment',
        actionVerb: 'reject',
        confirmText: 'Reject',
        type: 'reject',
    },
    completed: {
        title: 'Complete Appointment',
        actionVerb: 'mark as complete',
        confirmText: 'Complete',
        type: 'success',
    },
    cancelled: {
        title: 'Cancel Appointment',
        actionVerb: 'cancel',
        confirmText: 'Cancel Appointment',
        cancelText: 'Go Back',
        type: 'reject',
    },
};

export const getAppointmentStatusDialog = (status) => (
    STATUS_DIALOG_CONFIG[String(status || '').toLowerCase()] || {
        title: 'Update Appointment Status',
        actionVerb: `change the status to ${String(status || 'the selected status')}`,
        confirmText: 'Update',
        type: 'info',
    }
);
