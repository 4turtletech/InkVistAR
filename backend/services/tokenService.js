const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const {
  JWT_ACCESS_SECRET,
  JWT_ACCESS_TTL,
  REFRESH_TOKEN_TTL_DAYS,
} = require('../config/runtime');

const JWT_ISSUER = 'inkvistar-api';
const JWT_AUDIENCE = 'inkvistar-clients';

class AuthTokenError extends Error {
  constructor(code, message, status = 401) {
    super(message);
    this.name = 'AuthTokenError';
    this.code = code;
    this.status = status;
  }
}

const hashRefreshToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');
const createRefreshToken = () => crypto.randomBytes(48).toString('base64url');
const normalizeClientType = (value) => value === 'mobile' ? 'mobile' : 'web';
const normalizeIp = (value) => String(value || '').split(',')[0].trim().slice(0, 45) || null;
const normalizeUserAgent = (value) => String(value || '').slice(0, 255) || null;

function createTokenService(pool) {
  const database = pool.promise();
  let initializationPromise;

  const initialize = () => {
    if (!initializationPromise) {
      const migrationPath = path.join(__dirname, '..', 'migrations', '001_create_refresh_tokens.sql');
      const migrationSql = fs.readFileSync(migrationPath, 'utf8');
      initializationPromise = database.query(migrationSql).catch((error) => {
        initializationPromise = null;
        throw error;
      });
    }
    return initializationPromise;
  };

  const signAccessToken = (user) => jwt.sign(
    { role: user.user_type },
    JWT_ACCESS_SECRET,
    {
      algorithm: 'HS256',
      audience: JWT_AUDIENCE,
      issuer: JWT_ISSUER,
      subject: String(user.id),
      expiresIn: JWT_ACCESS_TTL,
      jwtid: crypto.randomUUID(),
    }
  );

  const verifyAccessToken = (token) => jwt.verify(token, JWT_ACCESS_SECRET, {
    algorithms: ['HS256'],
    audience: JWT_AUDIENCE,
    issuer: JWT_ISSUER,
  });

  const insertRefreshToken = async (connection, userId, familyId, rawToken, metadata) => {
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
    const [result] = await connection.query(
      `INSERT INTO refresh_tokens
        (user_id, token_hash, family_id, client_type, expires_at, created_by_ip, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        hashRefreshToken(rawToken),
        familyId,
        normalizeClientType(metadata.clientType),
        expiresAt,
        normalizeIp(metadata.ip),
        normalizeUserAgent(metadata.userAgent),
      ]
    );
    return { id: result.insertId, expiresAt };
  };

  const issueSession = async (user, metadata = {}) => {
    await initialize();
    const rawRefreshToken = createRefreshToken();
    await insertRefreshToken(database, user.id, crypto.randomUUID(), rawRefreshToken, metadata);
    return {
      accessToken: signAccessToken(user),
      refreshToken: rawRefreshToken,
      accessTokenExpiresIn: JWT_ACCESS_TTL,
    };
  };

  const rotateRefreshToken = async (rawToken, metadata = {}) => {
    if (!rawToken) throw new AuthTokenError('refresh_token_missing', 'Refresh token is required.');
    if (typeof rawToken !== 'string' || rawToken.length !== 64) {
      throw new AuthTokenError('refresh_token_invalid', 'Refresh token is invalid.');
    }
    await initialize();

    const connection = await database.getConnection();
    let transactionFinished = false;
    try {
      await connection.beginTransaction();
      const [rows] = await connection.query(
        `SELECT rt.*, u.name, u.email, u.user_type, u.is_verified, u.is_deleted,
                u.account_status, u.is_superadmin, u.must_change_password
         FROM refresh_tokens rt
         JOIN users u ON u.id = rt.user_id
         WHERE rt.token_hash = ?
         LIMIT 1 FOR UPDATE`,
        [hashRefreshToken(rawToken)]
      );

      if (rows.length === 0) {
        throw new AuthTokenError('refresh_token_invalid', 'Refresh token is invalid.');
      }

      const record = rows[0];
      if (record.revoked_at) {
        await connection.query(
          'UPDATE refresh_tokens SET revoked_at = COALESCE(revoked_at, NOW()) WHERE family_id = ?',
          [record.family_id]
        );
        await connection.commit();
        transactionFinished = true;
        throw new AuthTokenError('refresh_token_reused', 'Refresh token reuse was detected. Please sign in again.');
      }

      if (new Date(record.expires_at).getTime() <= Date.now()) {
        await connection.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = ?', [record.id]);
        await connection.commit();
        transactionFinished = true;
        throw new AuthTokenError('refresh_token_expired', 'Refresh token has expired. Please sign in again.');
      }

      if (record.is_deleted || record.is_verified === 0 || ['banned', 'deactivated'].includes(record.account_status)) {
        await connection.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL', [record.user_id]);
        await connection.commit();
        transactionFinished = true;
        throw new AuthTokenError('account_unavailable', 'This account is not available.', 403);
      }

      const nextRawToken = createRefreshToken();
      const nextToken = await insertRefreshToken(connection, record.user_id, record.family_id, nextRawToken, {
        ...metadata,
        clientType: record.client_type,
      });
      await connection.query(
        'UPDATE refresh_tokens SET revoked_at = NOW(), last_used_at = NOW(), replaced_by_token_id = ? WHERE id = ?',
        [nextToken.id, record.id]
      );
      await connection.commit();
      transactionFinished = true;

      const user = {
        id: record.user_id,
        name: record.name,
        email: record.email,
        user_type: record.user_type,
        is_superadmin: record.is_superadmin,
        must_change_password: record.must_change_password,
      };
      return {
        accessToken: signAccessToken(user),
        refreshToken: nextRawToken,
        accessTokenExpiresIn: JWT_ACCESS_TTL,
        user,
      };
    } catch (error) {
      if (!transactionFinished) await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  };

  const revokeAllForUser = async (userId) => {
    await initialize();
    await database.query(
      'UPDATE refresh_tokens SET revoked_at = COALESCE(revoked_at, NOW()) WHERE user_id = ?',
      [userId]
    );
  };

  const revokeAllForRefreshToken = async (rawToken) => {
    if (!rawToken || typeof rawToken !== 'string' || rawToken.length !== 64) return;
    await initialize();
    const [rows] = await database.query('SELECT user_id FROM refresh_tokens WHERE token_hash = ? LIMIT 1', [hashRefreshToken(rawToken)]);
    if (rows.length > 0) await revokeAllForUser(rows[0].user_id);
  };

  return {
    initialize,
    issueSession,
    rotateRefreshToken,
    revokeAllForUser,
    revokeAllForRefreshToken,
    signAccessToken,
    verifyAccessToken,
  };
}

module.exports = {
  AuthTokenError,
  createTokenService,
  hashRefreshToken,
};
