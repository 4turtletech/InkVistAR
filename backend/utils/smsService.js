// backend/utils/smsService.js
// Semaphore SMS Gateway integration
// Toggle: set SEMAPHORE_ENABLED=true in Railway env to start sending

const fetch = global.fetch || require('node-fetch');

const SEMAPHORE_ENABLED = process.env.SEMAPHORE_ENABLED === 'true';
const SEMAPHORE_API_KEY = process.env.SEMAPHORE_API_KEY || '';
const SEMAPHORE_SENDER_NAME = process.env.SEMAPHORE_SENDER_NAME || 'INKVISTAR';
const SEMAPHORE_API_URL = 'https://api.semaphore.co/api/v4/messages';

/**
 * Send an SMS via Semaphore.
 * @param {string} phone - Philippine mobile number (e.g. 09171234567 or +639171234567)
 * @param {string} message - SMS body (max 160 chars for 1 credit)
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function sendSMS(phone, message) {
  if (!SEMAPHORE_ENABLED) {
    console.log(`[SMS] ⏭️  Skipped (SEMAPHORE_ENABLED=false) → ${phone}: ${message.substring(0, 50)}...`);
    return { success: true, message: 'SMS skipped (disabled)' };
  }

  if (!SEMAPHORE_API_KEY) {
    console.warn('[SMS] ⚠️  SEMAPHORE_API_KEY is not set. SMS not sent.');
    return { success: false, message: 'SMS API key missing' };
  }

  // Normalize Philippine numbers
  let normalized = phone.replace(/\s+/g, '').replace(/-/g, '');
  if (normalized.startsWith('0')) normalized = '+63' + normalized.slice(1);
  if (!normalized.startsWith('+')) normalized = '+63' + normalized;

  try {
    const response = await fetch(SEMAPHORE_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apikey: SEMAPHORE_API_KEY,
        number: normalized,
        message,
        sendername: SEMAPHORE_SENDER_NAME,
      }),
    });

    const data = await response.json();

    if (response.ok && data) {
      console.log(`[SMS] ✅ Sent to ${normalized}`);
      return { success: true, message: 'SMS sent' };
    } else {
      console.error('[SMS] ❌ Semaphore error:', data);
      return { success: false, message: JSON.stringify(data) };
    }
  } catch (err) {
    console.error('[SMS] ❌ Network error:', err.message);
    return { success: false, message: err.message };
  }
}

// --- Pre-built message templates ---

function otpMessage(code) {
  return `Your InkVistAR verification code is: ${code}. Valid for 5 minutes. Do not share this with anyone.`;
}

function appointmentRequestedAdminSMS(clientName, date) {
  return `InkVistAR: New appointment request from ${clientName} on ${date}. Login to review.`;
}

function appointmentConfirmedSMS(artistName, date) {
  return `InkVistAR: Your appointment with ${artistName} on ${date} has been CONFIRMED. See you then! 🎨`;
}

function appointmentCancelledSMS(date, reason) {
  return `InkVistAR: Your appointment on ${date} has been CANCELLED. ${reason ? 'Reason: ' + reason : ''} Please rebook at inkvictusstudio.com.`;
}

module.exports = {
  sendSMS,
  otpMessage,
  appointmentRequestedAdminSMS,
  appointmentConfirmedSMS,
  appointmentCancelledSMS,
};
