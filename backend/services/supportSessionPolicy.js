const crypto = require('crypto');

const createSupportSessionId = () => crypto.randomBytes(16).toString('hex');

const buildActiveSupportHistoryQuery = (room, activeSession) => {
  const normalizedRoom = String(room || '').trim();
  const sessionId = String(activeSession?.sessionId || '').trim();

  if (!normalizedRoom || !sessionId) return null;

  return {
    sql: `SELECT id, sender, message as text, created_at as timestamp
          FROM support_messages
          WHERE room_id = ? AND session_id = ?
          ORDER BY created_at ASC, id ASC`,
    params: [normalizedRoom, sessionId],
    sessionId,
  };
};

module.exports = {
  createSupportSessionId,
  buildActiveSupportHistoryQuery,
};
