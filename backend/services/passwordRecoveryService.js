const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { isStrongPassword, PASSWORD_POLICY_MESSAGE } = require('./passwordPolicy');

const RECOVERY_TOKEN_BYTES = 16;
const RECOVERY_TOKEN_HEX_LENGTH = RECOVERY_TOKEN_BYTES * 2;
const RECOVERY_TTL_MINUTES = 30;
const TOKEN_MAX_ATTEMPTS = 5;
const REQUEST_LIMIT_15_MINUTES = 3;
const REQUEST_LIMIT_24_HOURS = 10;
const CONFIRM_LIMIT_15_MINUTES = 10;
const CONFIRM_LIMIT_24_HOURS = 30;

class PasswordRecoveryError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = 'PasswordRecoveryError';
    this.code = code;
    this.status = status;
  }
}

const normalizeEmail = (value) => String(value || '').trim().toLowerCase().slice(0, 254);
const normalizeIp = (value) => String(value || '').split(',')[0].trim().slice(0, 45) || 'unknown';
const normalizeUserAgent = (value) => String(value || '').slice(0, 255) || null;
const hashValue = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');
const hashRecoveryToken = (token) => hashValue(String(token || '').trim().toLowerCase());
const createRecoveryToken = () => crypto.randomBytes(RECOVERY_TOKEN_BYTES).toString('hex');
const isRecoveryTokenFormat = (value) => new RegExp(`^[a-fA-F0-9]{${RECOVERY_TOKEN_HEX_LENGTH}}$`).test(String(value || '').trim());

function createPasswordRecoveryService(pool) {
  const database = pool.promise();
  let initializationPromise;

  const initialize = () => {
    if (!initializationPromise) {
      initializationPromise = Promise.all([
        '002_create_password_recovery_tokens.sql',
        '003_create_password_recovery_events.sql',
      ].map((file) => {
        const migrationPath = path.join(__dirname, '..', 'migrations', file);
        return database.query(fs.readFileSync(migrationPath, 'utf8'));
      })).catch((error) => {
        initializationPromise = null;
        throw error;
      });
    }
    return initializationPromise;
  };

  const identifiers = (email, ip) => ({
    email: normalizeEmail(email),
    emailHash: hashValue(normalizeEmail(email)),
    ipHash: hashValue(normalizeIp(ip)),
  });

  const recordEvent = (connection, identity, eventType, success = false) => connection.query(
    `INSERT INTO password_recovery_events (email_hash, ip_hash, event_type, success)
     VALUES (?, ?, ?, ?)`,
    [identity.emailHash, identity.ipHash, eventType, success ? 1 : 0]
  );

  const enforceRateLimit = async (identity, eventType) => {
    const isRequest = eventType === 'request';
    const recentLimit = isRequest ? REQUEST_LIMIT_15_MINUTES : CONFIRM_LIMIT_15_MINUTES;
    const dailyLimit = isRequest ? REQUEST_LIMIT_24_HOURS : CONFIRM_LIMIT_24_HOURS;
    const [rows] = await database.query(
      `SELECT
         SUM(created_at >= DATE_SUB(NOW(), INTERVAL 15 MINUTE)) AS recent_count,
         COUNT(*) AS daily_count
       FROM password_recovery_events
       WHERE event_type = ?
         AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
         AND (email_hash = ? OR ip_hash = ?)`,
      [eventType, identity.emailHash, identity.ipHash]
    );
    if (Number(rows[0]?.recent_count || 0) >= recentLimit || Number(rows[0]?.daily_count || 0) >= dailyLimit) {
      throw new PasswordRecoveryError(
        'password_recovery_rate_limited',
        'Too many password recovery attempts. Please try again later.',
        429
      );
    }
  };

  const requestRecovery = async (email, metadata = {}) => {
    await initialize();
    const identity = identifiers(email, metadata.ip);
    if (!identity.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identity.email)) {
      throw new PasswordRecoveryError('email_invalid', 'Enter a valid email address.');
    }
    await enforceRateLimit(identity, 'request');
    await recordEvent(database, identity, 'request', false);

    const [users] = await database.query(
      `SELECT id, email
       FROM users
       WHERE email = ? AND is_deleted = 0
         AND COALESCE(account_status, 'active') = 'active'
       LIMIT 1`,
      [identity.email]
    );
    if (!users[0]) return { delivery: null };

    const token = createRecoveryToken();
    const expiresAt = new Date(Date.now() + RECOVERY_TTL_MINUTES * 60 * 1000);
    const connection = await database.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query(
        'UPDATE password_recovery_tokens SET revoked_at = COALESCE(revoked_at, NOW()) WHERE user_id = ? AND used_at IS NULL',
        [users[0].id]
      );
      await connection.query(
        `INSERT INTO password_recovery_tokens
          (user_id, token_hash, expires_at, max_attempts, requested_by_ip_hash, user_agent)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          users[0].id,
          hashRecoveryToken(token),
          expiresAt,
          TOKEN_MAX_ATTEMPTS,
          identity.ipHash,
          normalizeUserAgent(metadata.userAgent),
        ]
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return {
      delivery: {
        email: users[0].email,
        token,
        expiresAt,
      },
    };
  };

  const revokeRecoveryToken = async (rawToken) => {
    if (!isRecoveryTokenFormat(rawToken)) return;
    await initialize();
    await database.query(
      'UPDATE password_recovery_tokens SET revoked_at = COALESCE(revoked_at, NOW()) WHERE token_hash = ?',
      [hashRecoveryToken(rawToken)]
    );
  };

  const confirmRecovery = async ({ email, token, newPassword }, metadata = {}) => {
    await initialize();
    const identity = identifiers(email, metadata.ip);
    if (!identity.email || !token || !newPassword) {
      throw new PasswordRecoveryError('recovery_fields_missing', 'Email, recovery code, and new password are required.');
    }
    if (!isStrongPassword(newPassword)) {
      throw new PasswordRecoveryError('password_policy_failed', PASSWORD_POLICY_MESSAGE);
    }
    await enforceRateLimit(identity, 'confirm');

    if (!isRecoveryTokenFormat(token)) {
      await recordEvent(database, identity, 'confirm', false);
      throw new PasswordRecoveryError('recovery_token_invalid', 'The recovery code is invalid or expired.', 401);
    }

    const connection = await database.getConnection();
    let finished = false;
    try {
      await connection.beginTransaction();
      const [rows] = await connection.query(
        `SELECT pr.*, u.password_hash
         FROM password_recovery_tokens pr
         JOIN users u ON u.id = pr.user_id
         WHERE u.email = ? AND pr.used_at IS NULL AND pr.revoked_at IS NULL
         ORDER BY pr.id DESC LIMIT 1 FOR UPDATE`,
        [identity.email]
      );
      const record = rows[0];

      if (!record) {
        await recordEvent(connection, identity, 'confirm', false);
        await connection.commit();
        finished = true;
        throw new PasswordRecoveryError('recovery_token_invalid', 'The recovery code is invalid or expired.', 401);
      }

      const suppliedHash = Buffer.from(hashRecoveryToken(token), 'hex');
      const storedHash = Buffer.from(record.token_hash, 'hex');
      if (suppliedHash.length !== storedHash.length || !crypto.timingSafeEqual(suppliedHash, storedHash)) {
        const nextAttempts = Number(record.failed_attempts) + 1;
        await connection.query(
          `UPDATE password_recovery_tokens
           SET failed_attempts = ?, revoked_at = IF(? >= max_attempts, NOW(), revoked_at)
           WHERE id = ?`,
          [nextAttempts, nextAttempts, record.id]
        );
        await recordEvent(connection, identity, 'confirm', false);
        await connection.commit();
        finished = true;
        throw new PasswordRecoveryError('recovery_token_invalid', 'The recovery code is invalid or expired.', 401);
      }

      if (Number(record.failed_attempts) >= Number(record.max_attempts) || new Date(record.expires_at).getTime() <= Date.now()) {
        await connection.query('UPDATE password_recovery_tokens SET revoked_at = COALESCE(revoked_at, NOW()) WHERE id = ?', [record.id]);
        await recordEvent(connection, identity, 'confirm', false);
        await connection.commit();
        finished = true;
        throw new PasswordRecoveryError('recovery_token_invalid', 'The recovery code is invalid or expired.', 401);
      }

      if (await bcrypt.compare(newPassword, record.password_hash)) {
        await recordEvent(connection, identity, 'confirm', false);
        await connection.commit();
        finished = true;
        throw new PasswordRecoveryError('password_reused', 'New password cannot be the same as the old password.');
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);
      await connection.query(
        `UPDATE users
         SET password_hash = ?, must_change_password = 0, otp_code = NULL, otp_expires = NULL,
             failed_login_attempts = 0, lockout_until = NULL
         WHERE id = ?`,
        [passwordHash, record.user_id]
      );
      await connection.query('UPDATE password_recovery_tokens SET used_at = NOW() WHERE id = ?', [record.id]);
      await connection.query(
        'UPDATE password_recovery_tokens SET revoked_at = COALESCE(revoked_at, NOW()) WHERE user_id = ? AND id <> ? AND used_at IS NULL',
        [record.user_id, record.id]
      );
      await connection.query(
        'UPDATE refresh_tokens SET revoked_at = COALESCE(revoked_at, NOW()) WHERE user_id = ?',
        [record.user_id]
      );
      await recordEvent(connection, identity, 'confirm', true);
      await connection.commit();
      finished = true;
      return { userId: record.user_id };
    } catch (error) {
      if (!finished) await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  };

  return {
    initialize,
    requestRecovery,
    confirmRecovery,
    revokeRecoveryToken,
  };
}

module.exports = {
  PasswordRecoveryError,
  RECOVERY_TOKEN_HEX_LENGTH,
  RECOVERY_TTL_MINUTES,
  createPasswordRecoveryService,
  createRecoveryToken,
  hashRecoveryToken,
  isRecoveryTokenFormat,
};
