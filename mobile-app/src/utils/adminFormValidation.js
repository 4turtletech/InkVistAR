import { isValidEmail } from './validators.js';
import { nationalPHPhone, artistPasswordRules } from './artistProfileValidation.js';

export const adminUserErrors = (form, editing = false) => {
  const errors = {};
  if (!String(form.name || '').trim()) errors.name = 'Name is required';
  if (!String(form.email || '').trim()) errors.email = 'Email is required';
  else if (!isValidEmail(String(form.email).trim())) errors.email = 'Please enter a valid email address';
  if (!String(form.phone || '').trim()) errors.phone = 'Phone number is required';
  else if (!/^9\d{9}$/.test(nationalPHPhone(form.phone))) errors.phone = 'Enter a valid PH mobile number: 10 digits starting with 9';
  if (!editing) {
    if (!form.password) errors.password = 'Password is required';
    else if (!artistPasswordRules(form.password).every(rule => rule.met)) errors.password = 'Complete every password requirement below';
    if (!form.confirmPassword) errors.confirmPassword = 'Please confirm password';
    else if (form.password !== form.confirmPassword) errors.confirmPassword = 'Passwords do not match';
  }
  return errors;
};

export const invoiceFormErrors = (form) => {
  const errors = {};
  if (!String(form.clientName || '').trim()) errors.clientName = 'Client name is required';
  const amount = Number(form.amount);
  if (!String(form.amount ?? '').trim() || !Number.isFinite(amount) || amount <= 0) {
    errors.amount = 'Enter a valid amount greater than 0';
  }
  return errors;
};

export const MAX_PAYOUT_AMOUNT = 99999999.99;

export const sanitizeCurrencyInput = (value, maxWholeDigits = 8) => {
  const raw = String(value ?? '').replace(/[^\d.]/g, '');
  const [rawWhole = '', ...decimalParts] = raw.split('.');
  const whole = rawWhole.slice(0, maxWholeDigits);
  if (decimalParts.length === 0) return whole;
  return `${whole || '0'}.${decimalParts.join('').slice(0, 2)}`;
};

export const payoutFormErrors = (form, availableBalance) => {
  const errors = {};
  const artistId = Number(form.artistId);
  const amountText = String(form.amount ?? '').trim();
  const amount = Number(amountText);
  const method = String(form.method || '').trim();
  const reference = String(form.reference || '').trim();

  if (!Number.isInteger(artistId) || artistId <= 0) errors.artistId = 'Select an artist.';
  if (!/^\d+(?:\.\d{1,2})?$/.test(amountText) || !Number.isFinite(amount) || amount <= 0) {
    errors.amount = 'Enter an amount greater than zero with up to 2 decimal places.';
  } else if (amount > MAX_PAYOUT_AMOUNT) {
    errors.amount = 'Payout amount is too large.';
  } else if (Number.isFinite(Number(availableBalance)) && amount > Number(availableBalance)) {
    errors.amount = `Amount cannot exceed P${Number(availableBalance).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`;
  }
  if (!['Cash', 'GCash', 'Bank Transfer'].includes(method)) errors.method = 'Select a valid payment method.';
  if (method !== 'Cash' && !reference) errors.reference = `Reference number is required for ${method || 'electronic payouts'}.`;

  return errors;
};

export const sessionTimeSelection = (value) => {
  const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(String(value || ''));
  return match && Number(match[1]) < 24 && Number(match[2]) < 60 ? `${match[1]}:${match[2]}` : '';
};

export const adminAppointmentSessionErrors = (form = {}) => {
  const errors = {};
  const isSession = String(form.serviceType || '').trim() !== 'Consultation';
  const isCancelling = ['cancelled', 'rejected'].includes(String(form.status || '').toLowerCase());
  const isSubsequentSession = Number(form.sessionNumber || 1) > 1;
  const designTitle = String(form.designTitle || '').trim();
  const priceText = String(form.price ?? '').trim();
  const price = Number(priceText);

  if (!isCancelling && !designTitle) {
    errors.designTitle = 'Design title is required.';
  } else if (designTitle.length > 255) {
    errors.designTitle = 'Design title cannot exceed 255 characters.';
  }

  if ((isSession || form.isCreate) && !isCancelling && !String(form.artistId || '').trim()) {
    errors.artistId = 'Please assign an artist to this session.';
  }

  if (priceText && (!/^\d+(?:\.\d{0,2})?$/.test(priceText) || !Number.isFinite(price) || price < 0)) {
    errors.price = 'Enter a valid non-negative price with up to 2 decimal places.';
  } else if (isSession && !isCancelling && !isSubsequentSession && (!priceText || price <= 0)) {
    errors.price = 'Price is required for tattoo and piercing sessions.';
  } else if (isSession && !isCancelling && !isSubsequentSession && price < 5000) {
    errors.price = 'Minimum session price is ₱5,000.';
  }

  if (isSession && form.status === 'completed' && price <= 0 && !form.isAlreadyPaid) {
    errors.price = 'A price must be set before marking this session as Completed.';
  }

  return errors;
};

export const adminAccountStatus = (user = {}) => {
  if (Number(user.is_deleted) === 1) return 'deactivated';
  const status = String(user.account_status || '').trim().toLowerCase();
  return ['active', 'deactivated', 'banned'].includes(status) ? status : 'active';
};

export const adminAccountStatusRank = (user = {}) => ({
  active: 0,
  deactivated: 1,
  banned: 2,
}[adminAccountStatus(user)] ?? 0);
