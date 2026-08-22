const express = require('express');
const { authorize } = require('../middleware/authorize');
const { ConsentError } = require('../services/consentService');

function createConsentRouter({ authenticate, consentService }) {
  const router = express.Router();

  const handleError = (res, error) => {
    const expected = error instanceof ConsentError;
    if (!expected) console.error('[CONSENT] Request failed:', error.message);
    return res.status(expected ? error.status : 500).json({
      success: false,
      code: expected ? error.code : 'consent_operation_failed',
      message: expected ? error.message : 'Unable to process consent information.',
    });
  };

  router.post('/consents', authenticate, authorize('admin', 'manager', 'customer'), async (req, res) => {
    try {
      const consent = await consentService.createConsent(req.auth, req.body, { ip: req.ip, userAgent: req.headers['user-agent'] });
      return res.status(201).json({ success: true, consentId: consent.id, consent });
    } catch (error) {
      return handleError(res, error);
    }
  });

  router.get('/consents/appointment/:id', authenticate, async (req, res) => {
    try {
      return res.json({ success: true, consent: await consentService.getForAppointment(req.auth, req.params.id) });
    } catch (error) {
      return handleError(res, error);
    }
  });

  router.get('/consents/customer/:customerId', authenticate, async (req, res) => {
    try {
      return res.json({ success: true, consents: await consentService.listForCustomer(req.auth, req.params.customerId) });
    } catch (error) {
      return handleError(res, error);
    }
  });

  router.put('/consents/:id/withdraw', authenticate, authorize('customer'), async (req, res) => {
    try {
      const consent = await consentService.changeOptionalConsent(
        req.auth, req.params.id, req.body?.withdrawnConsents, req.body?.reason, { ip: req.ip }
      );
      return res.json({ success: true, consent, message: 'Optional consent preference recorded.' });
    } catch (error) {
      return handleError(res, error);
    }
  });

  return router;
}

module.exports = { createConsentRouter };
