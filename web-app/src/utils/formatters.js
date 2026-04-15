/**
 * Shared formatting utilities for the InkVistAR platform.
 * Centralizes display logic so all portals show consistent data.
 */

/**
 * Formats a booking code for user-facing display.
 *
 * Given a raw booking_code (e.g. "O-T-A3K7") and the appointment's numeric id,
 * returns a deterministic display code like "O-T-0012" where the suffix is
 * derived from `id % 10000`, zero-padded to 4 digits.
 *
 * If the booking_code is missing or malformed, returns a visible sentinel
 * string so data-integrity issues are immediately obvious rather than
 * silently hidden behind a generic fallback.
 *
 * @param {string|null|undefined} bookingCode - The raw booking_code from the database.
 * @param {number|string} id - The appointment's primary-key id.
 * @returns {string} The formatted display code.
 */
export const getDisplayCode = (bookingCode, id) => {
  const numericId = parseInt(id, 10);
  const seqNum = String((isNaN(numericId) ? 0 : numericId) % 10000).padStart(4, '0');

  if (bookingCode && typeof bookingCode === 'string' && bookingCode.includes('-')) {
    const parts = bookingCode.split('-');
    if (parts.length >= 2) {
      return `${parts[0]}-${parts[1]}-${seqNum}`;
    }
  }

  // Sentinel: no valid booking code — make the gap visible
  return `⚠ UNLINKED-${seqNum}`;
};
