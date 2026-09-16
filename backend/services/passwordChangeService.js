const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { isStrongPassword, PASSWORD_POLICY_MESSAGE } = require('./passwordPolicy');

function createPasswordChangeService(pool, tokenService) {
  return async (userId, currentPassword, newPassword, metadata) => {
    const fail = (message, code) => Object.assign(new Error(message), { status: 400, code });
    if (typeof currentPassword !== 'string' || !currentPassword || currentPassword.length > 128) throw fail('Enter your current password.', 'current_password_invalid');
    if (!isStrongPassword(newPassword)) throw fail(PASSWORD_POLICY_MESSAGE, 'password_policy_failed');
    await tokenService.initialize();
    const connection = await pool.promise().getConnection();
    let finished = false;
    try {
      await connection.beginTransaction();
      const [rows] = await connection.query('SELECT * FROM users WHERE id = ? FOR UPDATE', [userId]);
      const user = rows[0];
      if (!user || user.is_deleted || (user.account_status && user.account_status !== 'active')) throw fail('This account is unavailable.', 'account_unavailable');
      const identity = crypto.createHash('sha256').update(`password-change:${userId}`).digest('hex');
      const [attempts] = await connection.query("SELECT COUNT(*) AS count FROM password_recovery_events WHERE email_hash = ? AND event_type = 'change' AND created_at >= DATE_SUB(NOW(), INTERVAL 15 MINUTE)", [identity]);
      if (Number(attempts[0]?.count) >= 5) throw Object.assign(fail('Too many password change attempts. Please try again in 15 minutes.', 'password_change_rate_limited'), { status: 429 });
      await connection.query("INSERT INTO password_recovery_events (email_hash, ip_hash, event_type, success) VALUES (?, ?, 'change', 0)", [identity, crypto.createHash('sha256').update(String(metadata?.ip || '')).digest('hex')]);
      if (!(await bcrypt.compare(currentPassword, user.password_hash))) {
        await connection.commit();
        finished = true;
        throw fail('Current password is incorrect.', 'current_password_invalid');
      }
      if (await bcrypt.compare(newPassword, user.password_hash)) throw fail('New password cannot be the same as the old password.', 'password_reused');
      const password_hash = await bcrypt.hash(newPassword, 12);
      await connection.query('UPDATE users SET password_hash = ?, must_change_password = 0, otp_code = NULL, otp_expires = NULL WHERE id = ?', [password_hash, userId]);
      await connection.query('UPDATE refresh_tokens SET revoked_at = COALESCE(revoked_at, NOW()) WHERE user_id = ?', [userId]);
      await connection.query('UPDATE password_recovery_tokens SET revoked_at = COALESCE(revoked_at, NOW()) WHERE user_id = ? AND used_at IS NULL', [userId]);
      const session = await tokenService.issueSession({ ...user, password_hash, must_change_password: 0 }, metadata, connection);
      await connection.commit();
      finished = true;
      return { ...session, email: user.email };
    } catch (error) {
      if (!finished) await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  };
}
module.exports = { createPasswordChangeService };
