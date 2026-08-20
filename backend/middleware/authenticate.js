function createAuthenticate({ tokenService, pool }) {
  const database = pool.promise();

  return async function authenticate(req, res, next) {
    const authorization = String(req.headers.authorization || '');
    const [scheme, token] = authorization.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    let claims;
    try {
      claims = tokenService.verifyAccessToken(token);
    } catch (error) {
      const expired = error?.name === 'TokenExpiredError';
      return res.status(401).json({
        success: false,
        message: expired ? 'Access token expired.' : 'Invalid access token.',
        code: expired ? 'access_token_expired' : 'access_token_invalid',
      });
    }

    const userId = Number(claims.sub);
    if (!Number.isInteger(userId) || userId < 1) {
      return res.status(401).json({ success: false, message: 'Invalid access token.', code: 'access_token_invalid' });
    }

    try {
      const [rows] = await database.query(
        `SELECT id, name, email, user_type, is_verified, is_deleted, account_status,
                is_superadmin, must_change_password
         FROM users WHERE id = ? LIMIT 1`,
        [userId]
      );
      const user = rows[0];
      if (!user || user.is_deleted || user.is_verified === 0 || ['banned', 'deactivated'].includes(user.account_status)) {
        return res.status(401).json({ success: false, message: 'Authentication is no longer valid.' });
      }
      if (claims.role !== user.user_type) {
        return res.status(401).json({ success: false, message: 'Authentication is no longer valid.' });
      }

      req.auth = {
        userId: user.id,
        role: user.user_type,
        isSuperAdmin: user.is_superadmin === 1,
        user,
      };
      next();
    } catch (error) {
      console.error('[AUTH] Account validation failed:', error.message);
      return res.status(503).json({ success: false, message: 'Authentication service is temporarily unavailable.' });
    }
  };
}

module.exports = { createAuthenticate };
