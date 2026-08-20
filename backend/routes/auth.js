const express = require('express');
const { AuthTokenError } = require('../services/tokenService');
const {
  clearRefreshCookie,
  getRefreshToken,
  rotateRefreshTokenResponse,
} = require('../services/sessionTransport');

const safeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  type: user.user_type,
  is_superadmin: user.is_superadmin === 1,
  must_change_password: user.must_change_password === 1,
});

function createAuthRouter({ tokenService, authenticate }) {
  const router = express.Router();

  router.post('/refresh', async (req, res) => {
    try {
      const session = await tokenService.rotateRefreshToken(getRefreshToken(req), {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
      const transport = rotateRefreshTokenResponse(req, res, session.refreshToken);
      res.json({
        success: true,
        accessToken: session.accessToken,
        accessTokenExpiresIn: session.accessTokenExpiresIn,
        user: safeUser(session.user),
        ...transport,
      });
    } catch (error) {
      clearRefreshCookie(res);
      if (!(error instanceof AuthTokenError)) console.error('[AUTH] Refresh failed:', error.message);
      const status = error instanceof AuthTokenError ? error.status : 500;
      res.status(status).json({
        success: false,
        message: status === 500 ? 'Unable to refresh authentication.' : error.message,
        code: error.code || 'refresh_failed',
      });
    }
  });

  router.post('/logout', async (req, res) => {
    try {
      await tokenService.revokeAllForRefreshToken(getRefreshToken(req));
    } catch (error) {
      console.error('[AUTH] Logout revocation failed:', error.message);
    } finally {
      clearRefreshCookie(res);
    }
    res.json({ success: true, message: 'Logged out successfully.' });
  });

  router.get('/me', authenticate, (req, res) => {
    res.json({ success: true, user: safeUser(req.auth.user) });
  });

  return router;
}

module.exports = { createAuthRouter, safeUser };
