function buildAdminAppointmentConflictCheck({ date, startTime, artistId, customerId, isWalkIn }) {
  const baseQuery = `
    SELECT id FROM appointments
    WHERE appointment_date = ? AND start_time = ?
      AND status NOT IN ('cancelled', 'rejected') AND is_deleted = 0
  `;

  if (isWalkIn) {
    return {
      query: `${baseQuery} AND artist_id = ? FOR UPDATE`,
      params: [date, startTime, artistId],
    };
  }

  return {
    query: `${baseQuery} AND (artist_id = ? OR customer_id = ?) FOR UPDATE`,
    params: [date, startTime, artistId, customerId],
  };
}

module.exports = { buildAdminAppointmentConflictCheck };
