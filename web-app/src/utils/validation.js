// Reusable input validation and formatting utilities for InkVistAR

/**
 * Strips all numbers and special characters EXCEPT spaces, hyphens, and apostrophes.
 * Useful for names (e.g. "O'Connor", "Jean-Luc", "De La Cruz").
 */
export const filterName = (val) => {
    if (!val) return '';
    return val.replace(/[^a-zA-ZÀ-ÿ\s'-]/g, '');
};

/**
 * Strips everything except digits.
 * Useful for phone numbers, zip codes, etc.
 */
export const filterDigits = (val) => {
    if (!val) return '';
    return val.replace(/[^0-9]/g, '');
};

/**
 * Accepts common Philippine mobile formats and returns a consistent E.164
 * value. Examples: 09171234567, 9171234567, and +639171234567.
 */
export const normalizePhilippineMobileNumber = (value) => {
    if (value === undefined || value === null) return null;

    const input = String(value).trim();
    if (!/^\+?[\d\s()-]+$/.test(input)) return null;

    const digits = input.replace(/\D/g, '');
    let localNumber = digits;

    if (localNumber.startsWith('63')) localNumber = localNumber.slice(2);
    if (localNumber.startsWith('0')) localNumber = localNumber.slice(1);

    return /^9\d{9}$/.test(localNumber) ? `+63${localNumber}` : null;
};

/**
 * Clamps a number between a min and max value.
 */
export const clampNumber = (val, min, max) => {
    const num = Number(val);
    if (isNaN(num)) return min;
    return Math.min(max, Math.max(min, num));
};

/**
 * Formats/filters money inputs. Returns a string suitable for inputs.
 * Blocks negative numbers and limits to 2 decimal places.
 */
export const filterMoney = (val) => {
    if (val === '') return '';
    const num = parseFloat(val);
    if (isNaN(num) || num < 0) return '';
    
    // Prevent typing strings that parse as a number but contain invalid trailing chars
    // by restricting to basic decimal currency format
    const strVal = String(val);
    if (/^\d*\.?\d{0,2}$/.test(strVal)) {
        return strVal;
    }
    
    return num.toFixed(2);
};

/**
 * Safely truncates a string to a max length.
 */
export const truncate = (val, max) => {
    if (!val) return '';
    return String(val).substring(0, max);
};
