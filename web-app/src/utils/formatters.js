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

/**
 * Formats a 24-hour time string (e.g. "14:30" or "14:30:00") into a 12-hour format with AM/PM (e.g. "02:30 PM").
 */
export const formatTime12Hour = (timeStr) => {
    if (!timeStr) return 'N/A';
    // If it's already a full Date string, fallback to standard parsing
    if (timeStr.includes('T') || timeStr.includes(' ')) {
        try {
            return new Date(timeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch(e) {
            return timeStr;
        }
    }
    const parts = timeStr.split(':');
    if (parts.length < 2) return timeStr; 
    let hour = parseInt(parts[0], 10);
    const minute = parts[1];
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12; // Convert 0 or 12 to 12
    return `${String(hour).padStart(2, '0')}:${minute} ${ampm}`;
};

/**
 * Formats a database status string (e.g. "in_progress") into a human-readable capitalized string ("In Progress").
 */
export const formatStatus = (statusStr) => {
    if (!statusStr) return 'Unknown';
    return statusStr
        .toString()
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
};

/**
 * Returns a CSS class modifier string for standard status colors.
 */
export const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
        case 'scheduled': return 'scheduled';
        case 'confirmed': return 'confirmed';
        case 'completed': return 'completed';
        case 'pending': return 'pending';
        case 'cancelled': return 'cancelled';
        case 'rejected': return 'cancelled';
        case 'in_progress': return 'in-progress';
        case 'incomplete': return 'incomplete';
        default: return 'scheduled';
    }
};
