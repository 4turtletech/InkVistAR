const { normalizeStructuredNameInput } = require('./profileValidation');
const { normalizePhilippineMobileNumber } = require('./phoneNumber');

const validationError = (message) => Object.assign(new Error(message), { statusCode: 400 });
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeOptionalEmail(value) {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const email = String(value).trim().toLowerCase();
  if (email.length > 255 || !EMAIL_PATTERN.test(email)) {
    throw validationError('Enter a valid email address or leave it blank.');
  }
  return email;
}

function normalizeAdminWalkInIdentity(body = {}) {
  const structuredName = normalizeStructuredNameInput({
    firstName: body.guestFirstName ?? body.guest_first_name,
    middleName: body.guestMiddleName ?? body.guest_middle_name,
    lastName: body.guestLastName ?? body.guest_last_name,
    suffix: body.guestSuffix ?? body.guest_suffix,
  }, { required: true });
  const phone = normalizePhilippineMobileNumber(body.guestPhone ?? body.guest_phone);

  if (!phone) {
    throw validationError('Enter a valid Philippine mobile number (for example, 09171234567).');
  }

  return {
    guest_name: structuredName.name,
    guest_first_name: structuredName.first_name,
    guest_middle_name: structuredName.middle_name,
    guest_last_name: structuredName.last_name,
    guest_suffix: structuredName.suffix,
    guest_email: normalizeOptionalEmail(body.guestEmail ?? body.guest_email),
    guest_phone: phone,
  };
}

function storedWalkInName(row = {}) {
  const structured = [
    row.guest_first_name,
    row.guest_middle_name,
    row.guest_last_name,
    row.guest_suffix,
  ].map(value => String(value || '').trim()).filter(Boolean).join(' ');
  if (structured) return structured;

  const canonical = String(row.guest_name || '').trim();
  if (canonical) return canonical;

  const legacyNoteName = String(row.notes || '').match(/(?:^|\n)(?:Name|Client):\s*([^\r\n]+)/i)?.[1]?.trim();
  if (legacyNoteName) return legacyNoteName;

  const legacyGuestField = String(row.guest_email || '').trim();
  if (legacyGuestField && !EMAIL_PATTERN.test(legacyGuestField)) return legacyGuestField;
  return 'Guest (Unregistered)';
}

function storedWalkInEmail(row = {}) {
  const email = String(row.guest_email || '').trim().toLowerCase();
  return EMAIL_PATTERN.test(email) ? email : null;
}

module.exports = {
  normalizeAdminWalkInIdentity,
  normalizeOptionalEmail,
  storedWalkInEmail,
  storedWalkInName,
};
