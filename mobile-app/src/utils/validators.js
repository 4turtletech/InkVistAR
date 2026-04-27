/**
 * validators.js
 * Centralized sanitization and validation utility functions.
 * Ensures all human-entered data is safe before hitting the backend.
 */

export const sanitizeText = (text) => {
  if (!text) return '';
  // Convert to string and trim
  let sanitized = String(text).trim();
  // Basic XSS prevention: remove <script> tags or html characters if strict
  // For standard text inputs, stripping <> is usually safe.
  sanitized = sanitized.replace(/[<>]/g, '');
  return sanitized;
};

export const sanitizeEmail = (email) => {
  if (!email) return '';
  return String(email).trim().toLowerCase();
};

export const isValidEmail = (email) => {
  const sanitized = sanitizeEmail(email);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(sanitized);
};

export const sanitizePhone = (phone) => {
  if (!phone) return '';
  // Remove anything that isn't a digit, plus, or space
  return String(phone).replace(/[^\d+\s-]/g, '').trim();
};

export const isValidPhone = (phone) => {
  const sanitized = sanitizePhone(phone);
  // Phone should be between 7 and 15 digits
  const digitCount = sanitized.replace(/\D/g, '').length;
  return digitCount >= 7 && digitCount <= 15;
};

export const sanitizeNumeric = (val, allowDecimal = false) => {
  if (val === null || val === undefined || val === '') return '';
  let str = String(val).trim();
  if (allowDecimal) {
    str = str.replace(/[^\d.]/g, ''); // Keep only digits and decimal
    // Ensure only one decimal point
    const parts = str.split('.');
    if (parts.length > 2) {
      str = parts[0] + '.' + parts.slice(1).join('');
    }
    return str;
  } else {
    return str.replace(/[^\d]/g, ''); // Keep only digits
  }
};
