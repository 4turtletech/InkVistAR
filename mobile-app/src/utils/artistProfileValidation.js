export const nationalPHPhone = (value = '') => {
  const digits = String(value).replace(/\D/g, '');
  if (digits.startsWith('63') && digits.length >= 12) return digits.slice(2);
  if (digits.startsWith('0')) return digits.slice(1);
  return digits;
};

export const artistPhoneError = (value) => !value || /^9\d{9}$/.test(nationalPHPhone(value))
  ? '' : 'Enter a valid PH mobile number: 10 digits starting with 9.';

export const artistPhonePayload = value => value ? `+63${nationalPHPhone(value)}` : '';

export const artistPasswordRules = (value = '') => [
  { label: 'At least 8 characters', met: value.length >= 8 },
  { label: 'One uppercase letter', met: /[A-Z]/.test(value) },
  { label: 'One lowercase letter', met: /[a-z]/.test(value) },
  { label: 'One number', met: /\d/.test(value) },
  { label: 'One special character', met: /[^a-zA-Z0-9]/.test(value) },
];

export const artistPasswordErrors = ({ current, new: password, confirm }) => {
  const errors = {};
  if (!current) errors.current = 'Current password is required';
  if (!password) errors.new = 'New password is required';
  else if (artistPasswordRules(password).some(rule => !rule.met)) errors.new = 'Meet all password requirements below.';
  if (!confirm) errors.confirm = 'Please confirm your new password';
  else if (password !== confirm) errors.confirm = 'New passwords do not match';
  return errors;
};
