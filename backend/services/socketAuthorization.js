const ACTIVE_ROLES = new Set(['admin', 'manager', 'artist', 'customer']);
const STAFF_ROLES = new Set(['admin', 'manager']);

const positiveInteger = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

function createSocketAuthorizer({ tokenService, pool }) {
  const database = pool.promise();

  const attachAuthentication = async (socket) => {
    const token = socket.handshake?.auth?.token;
    if (!token) {
      socket.auth = null;
      return;
    }

    const claims = tokenService.verifyAccessToken(token);
    const userId = positiveInteger(claims.sub);
    if (!userId) throw new Error('Invalid socket access token.');

    const [rows] = await database.query(
      `SELECT id, name, user_type, is_verified, is_deleted, account_status
       FROM users WHERE id = ? LIMIT 1`,
      [userId]
    );
    const user = rows[0];
    if (!user || user.is_deleted || user.is_verified === 0
      || ['banned', 'deactivated'].includes(user.account_status)
      || claims.role !== user.user_type || !ACTIVE_ROLES.has(user.user_type)) {
      throw new Error('Socket authentication is no longer valid.');
    }

    socket.auth = { userId: user.id, role: user.user_type, user };
  };

  const authorizeSupportRoom = (socket, rawRoom) => {
    const room = String(rawRoom || '').trim();
    if (!/^(?:customer_\d+|guest_[A-Za-z0-9_-]{6,64})$/.test(room)) return false;
    if (socket.auth && STAFF_ROLES.has(socket.auth.role)) return true;
    if (socket.auth?.role === 'customer') return room === `customer_${socket.auth.userId}`;

    if (!socket.auth && room.startsWith('guest_')) {
      if (!socket.guestSupportRoom) socket.guestSupportRoom = room;
      return socket.guestSupportRoom === room;
    }
    return false;
  };

  const authorizeAppointment = async (socket, appointmentId) => {
    const id = positiveInteger(appointmentId);
    if (!id || !socket.auth) return false;
    if (STAFF_ROLES.has(socket.auth.role)) return true;
    if (socket.auth.role !== 'artist') return false;

    const [rows] = await database.query(
      `SELECT id FROM appointments
       WHERE id = ? AND (artist_id = ? OR secondary_artist_id = ?) AND is_deleted = 0 LIMIT 1`,
      [id, socket.auth.userId, socket.auth.userId]
    );
    return Boolean(rows[0]);
  };

  const canTrackSupport = (socket) => Boolean(socket.auth && STAFF_ROLES.has(socket.auth.role));
  const displayName = (socket) => {
    if (!socket.auth) return 'Guest Visitor';
    if (STAFF_ROLES.has(socket.auth.role)) return 'Studio Support';
    return String(socket.auth.user?.name || 'Customer').slice(0, 100);
  };

  return {
    attachAuthentication,
    authorizeAppointment,
    authorizeSupportRoom,
    canTrackSupport,
    displayName,
  };
}

module.exports = { createSocketAuthorizer };
