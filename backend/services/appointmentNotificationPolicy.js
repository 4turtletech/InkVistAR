// Guest contact details are retained when a booking is claimed. They do not
// determine ownership; use the persisted placeholder flag and linked user role.
function isRegisteredAppointmentCustomer(appointment) {
  const id = Number(appointment?.customer_id);
  return Number.isInteger(id) && id > 0
    && Number(appointment.is_guest_placeholder ?? 0) === 0
    && appointment.customer_type === 'customer';
}

function normalizeScheduleDate(value) {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
  }
  const match = String(value ?? '').trim().match(/^(\d{4}-\d{2}-\d{2})(?:$|[T ])/);
  return match ? match[1] : null;
}

function normalizeScheduleTime(value) {
  const match = String(value ?? '').trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59 || Number(match[3] || 0) > 59) return null;
  return `${match[1].padStart(2, '0')}:${match[2]}:${match[3] || '00'}`;
}

function getAppointmentScheduleChange(previous, fields) {
  const oldDate = normalizeScheduleDate(previous.appointment_date);
  const oldTime = normalizeScheduleTime(previous.start_time);
  const date = fields.date === undefined ? oldDate : normalizeScheduleDate(fields.date);
  const startTime = fields.startTime === undefined ? oldTime : normalizeScheduleTime(fields.startTime);
  return {
    changed: Boolean((fields.date !== undefined && date && date !== oldDate)
      || (fields.startTime !== undefined && startTime && startTime !== oldTime)),
    date,
    startTime,
  };
}

module.exports = { isRegisteredAppointmentCustomer, getAppointmentScheduleChange };
