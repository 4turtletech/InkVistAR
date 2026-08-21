const crypto = require('crypto');

const SIGNATURE_TOLERANCE_MS = 5 * 60 * 1000;

function parseSignatureHeader(value) {
  return String(value || '').split(',').reduce((parts, item) => {
    const separator = item.indexOf('=');
    if (separator > 0) {
      parts[item.slice(0, separator).trim()] = item.slice(separator + 1).trim();
    }
    return parts;
  }, {});
}

function createPaymongoWebhookVerifier({ secret, mode = 'test', now = () => Date.now() }) {
  return function verifyPaymongoWebhook(req, res, next) {
    if (!secret) {
      console.error('[PAYMENT] PAYMONGO_WEBHOOK_SECRET is not configured; webhook rejected.');
      return res.status(503).json({ success: false, message: 'Webhook verification is not configured.' });
    }

    const signatureHeader = req.headers?.['paymongo-signature'];
    if (!signatureHeader) {
      return res.status(400).json({ success: false, message: 'Missing Paymongo-Signature header' });
    }

    const parts = parseSignatureHeader(signatureHeader);
    const timestamp = parts.t;
    const signature = mode === 'live' ? parts.li : parts.te;
    if (!timestamp || !signature) {
      return res.status(400).json({ success: false, message: 'Invalid signature header' });
    }

    const timestampMs = Number(timestamp) * 1000;
    if (!Number.isFinite(timestampMs) || Math.abs(now() - timestampMs) > SIGNATURE_TOLERANCE_MS) {
      return res.status(400).json({ success: false, message: 'Webhook signature timestamp is outside the allowed window.' });
    }

    if (!Buffer.isBuffer(req.rawBody)) {
      return res.status(400).json({ success: false, message: 'Raw webhook payload is unavailable.' });
    }
    const rawBody = req.rawBody;
    const expected = crypto.createHmac('sha256', secret)
      .update(Buffer.concat([Buffer.from(`${timestamp}.`), rawBody]))
      .digest('hex');
    const expectedBuffer = Buffer.from(expected, 'utf8');
    const suppliedBuffer = Buffer.from(signature, 'utf8');
    if (expectedBuffer.length !== suppliedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, suppliedBuffer)) {
      return res.status(400).json({ success: false, message: 'Signature mismatch' });
    }

    return next();
  };
}

module.exports = {
  SIGNATURE_TOLERANCE_MS,
  createPaymongoWebhookVerifier,
  parseSignatureHeader,
};
