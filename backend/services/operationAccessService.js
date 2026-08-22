const { asPositiveInteger } = require('./consentPolicyService');

const STAFF_ROLES = new Set(['admin', 'manager']);

function createOperationAccessService(pool) {
  const database = pool.promise();

  async function getAppointment(appointmentId, connection = database) {
    const id = asPositiveInteger(appointmentId);
    if (!id) return null;
    const [rows] = await connection.query(
      `SELECT a.id, a.customer_id, a.artist_id, a.secondary_artist_id, a.service_type,
              a.design_title, a.appointment_date, a.status, a.guest_email,
              COALESCE(u.name, a.guest_email, 'Guest Customer') AS customer_name
       FROM appointments a
       LEFT JOIN users u ON u.id = a.customer_id
       WHERE a.id = ? AND COALESCE(a.is_deleted, 0) = 0 LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  }

  function canAccessAppointment(auth, appointment) {
    if (!auth || !appointment) return false;
    if (STAFF_ROLES.has(auth.role)) return true;
    if (auth.role === 'customer') return Number(appointment.customer_id) === Number(auth.userId);
    if (auth.role === 'artist') {
      return Number(appointment.artist_id) === Number(auth.userId)
        || Number(appointment.secondary_artist_id) === Number(auth.userId);
    }
    return false;
  }

  function canManageProcedure(auth, appointment) {
    return Boolean(auth && appointment && (
      STAFF_ROLES.has(auth.role)
      || (auth.role === 'artist' && (
        Number(appointment.artist_id) === Number(auth.userId)
        || Number(appointment.secondary_artist_id) === Number(auth.userId)
      ))
    ));
  }

  return { canAccessAppointment, canManageProcedure, getAppointment };
}

module.exports = { STAFF_ROLES, createOperationAccessService };
