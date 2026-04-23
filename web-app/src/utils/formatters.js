/**
 * Shared formatting utilities for the InkVistAR platform.
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
  return `[!] UNLINKED-${seqNum}`;
};
