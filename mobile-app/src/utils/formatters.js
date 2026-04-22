/**
 * Shared formatting utilities for the InkVistAR mobile platform.
 * Direct port from web-app/src/utils/formatters.js
 * Centralizes display logic so all portals show consistent data.
 */

/**
 * Returns a booking code for user-facing display.
 *
 * The database now stores clean, standardized codes (e.g. "O-C-0012")
 * so this function simply returns the code as-is with a fallback
 * for legacy or missing codes.
 *
 * @param {string|null|undefined} bookingCode - The booking_code from the database.
 * @param {number|string} id - The appointment's primary-key id (used as fallback only).
 * @returns {string} The display code.
 */
export const getDisplayCode = (bookingCode, id) => {
  if (bookingCode && typeof bookingCode === 'string' && bookingCode.trim()) {
    return bookingCode;
  }

  // Fallback for legacy appointments without a booking_code
  const numericId = parseInt(id, 10);
  const seqNum = String((isNaN(numericId) ? 0 : numericId) % 10000).padStart(4, '0');
  return `UNLINKED-${seqNum}`;
};

/**
 * Format currency for Philippine Peso display.
 * @param {number} amount
 * @returns {string} e.g. "12,500.00"
 */
export const formatCurrency = (amount) => {
  const num = Number(amount) || 0;
  return num.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/**
 * Format a date string to a readable local format.
 * @param {string} dateStr - ISO date string or "YYYY-MM-DD"
 * @returns {string} e.g. "Apr 21, 2026"
 */
export const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

/**
 * Format a time string for display.
 * @param {string} timeStr - "HH:MM:SS" or "HH:MM"
 * @returns {string} e.g. "2:30 PM"
 */
export const formatTime = (timeStr) => {
  if (!timeStr) return 'N/A';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
};

/**
 * Get initials from a name string.
 * @param {string} name
 * @returns {string} e.g. "JD" for "John Doe"
 */
export const getInitials = (name) => {
  if (!name) return '?';
  return name
    .split(' ')
    .map(w => w.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
};
