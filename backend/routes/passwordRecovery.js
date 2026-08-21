const express = require('express');
const { PasswordRecoveryError, RECOVERY_TTL_MINUTES } = require('../services/passwordRecoveryService');

const GENERIC_REQUEST_MESSAGE = 'If an active account exists for that email, a password recovery code has been sent.';

function createPasswordRecoveryRouter({ passwordRecoveryService, sendRecoveryEmail, logPasswordReset }) {
  const router = express.Router();

  router.post('/request', async (req, res) => {
    try {
      const result = await passwordRecoveryService.requestRecovery(req.body?.email, {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
      if (result.delivery) {
        // Deliver after the generic response so email-provider latency cannot reveal
        // whether the submitted address belongs to an account.
        Promise.resolve().then(() => sendRecoveryEmail(result.delivery)).catch(async (deliveryError) => {
          console.error('[AUTH] Password recovery email delivery failed:', deliveryError.message);
          await passwordRecoveryService.revokeRecoveryToken(result.delivery.token).catch(() => {});
        });
      }
      return res.status(202).json({
        success: true,
        message: GENERIC_REQUEST_MESSAGE,
        expiresInMinutes: RECOVERY_TTL_MINUTES,
      });
    } catch (error) {
      const expected = error instanceof PasswordRecoveryError;
      if (!expected) console.error('[AUTH] Password recovery request failed:', error.message);
      return res.status(expected ? error.status : 503).json({
        success: false,
        message: expected ? error.message : 'Password recovery is temporarily unavailable. Please try again later.',
        code: expected ? error.code : 'password_recovery_unavailable',
      });
    }
  });

  router.post('/confirm', async (req, res) => {
    try {
      const result = await passwordRecoveryService.confirmRecovery({
        email: req.body?.email,
        token: req.body?.token,
        newPassword: req.body?.newPassword,
      }, { ip: req.ip, userAgent: req.headers['user-agent'] });
      if (logPasswordReset) logPasswordReset(result.userId, req.ip);
      return res.json({ success: true, message: 'Password updated. Please sign in again on every device.' });
    } catch (error) {
      const expected = error instanceof PasswordRecoveryError;
      if (!expected) console.error('[AUTH] Password recovery confirmation failed:', error.message);
      return res.status(expected ? error.status : 500).json({
        success: false,
        message: expected ? error.message : 'Unable to update the password.',
        code: expected ? error.code : 'password_recovery_failed',
      });
    }
  });

  return router;
}

module.exports = {
  GENERIC_REQUEST_MESSAGE,
  createPasswordRecoveryRouter,
};
