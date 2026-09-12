// Reusable input validation and formatting utilities for InkVistAR

/**
 * Strips all numbers and special characters EXCEPT spaces, hyphens, and apostrophes.
 * Useful for names (e.g. "O'Connor", "Jean-Luc", "De La Cruz").
 */
export const filterName = (val) => {
    if (!val) return '';
    return val.replace(/[^\p{L}\p{M}\s.'-]/gu, '');
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

export const normalizeProfileText = (value = '') => String(value)
    .replace(/[<>\r\n]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

export const profileNameError = (value) => {
    const name = normalizeProfileText(value);
    if (!name) return 'Full name is required.';
    if (name.length < 2) return 'Full name must be at least 2 characters.';
    if (name.length > 100) return 'Full name cannot exceed 100 characters.';
    return '';
};

export const composeCustomerName = (profile = {}) => [
    profile.first_name,
    profile.middle_name,
    profile.last_name,
    profile.suffix,
].map(normalizeProfileText).filter(Boolean).join(' ');

export const suggestCustomerNameParts = (profile = {}) => {
    if (profile.first_name || profile.last_name) {
        return {
            first_name: normalizeProfileText(profile.first_name),
            middle_name: normalizeProfileText(profile.middle_name),
            last_name: normalizeProfileText(profile.last_name),
            suffix: normalizeProfileText(profile.suffix),
            name_needs_review: Boolean(profile.name_needs_review),
        };
    }

    const [first_name = '', ...remaining] = normalizeProfileText(profile.name).split(' ').filter(Boolean);
    return {
        first_name,
        middle_name: '',
        last_name: remaining.join(' '),
        suffix: '',
        name_needs_review: Boolean(profile.name),
    };
};

const profileNamePartError = (value, label, { required = false, maxLength = 50 } = {}) => {
    const part = normalizeProfileText(value);
    if (!part) return required ? `${label} is required.` : '';
    if (part.length > maxLength) return `${label} cannot exceed ${maxLength} characters.`;
    if (!/^[\p{L}\p{M} .'-]+$/u.test(part)) return `${label} contains unsupported characters.`;
    return '';
};

export const artistProfileErrors = (profile = {}) => {
    const errors = {};
    const experienceText = String(profile.experience_years ?? '').trim();
    const experience = Number(experienceText);
    const specialization = normalizeProfileText(profile.specialization);
    const phoneValue = String(profile.phone || '').trim();
    const phoneDigits = phoneValue.replace(/\D/g, '');
    const nameError = profileNameError(profile.name);

    if (nameError) errors.name = nameError;
    if (phoneValue && (!/^\+?[\d\s()-]+$/.test(phoneValue) || phoneDigits.length < 7 || phoneDigits.length > 15)) {
        errors.phone = 'Enter a valid phone number with 7 to 15 digits.';
    }
    if (!experienceText || !Number.isInteger(experience) || experience < 0 || experience > 50) {
        errors.experience_years = 'Experience must be a whole number from 0 to 50.';
    }
    if (!specialization) errors.specialization = 'Select at least one specialization.';
    else if (specialization.length > 255) errors.specialization = 'Specialization cannot exceed 255 characters.';
    if (String(profile.bio || '').length > 1000) errors.bio = 'Bio cannot exceed 1000 characters.';

    return errors;
};

export const customerProfileErrors = (profile = {}) => {
    const errors = {};
    const usesStructuredName = ['first_name', 'middle_name', 'last_name', 'suffix']
        .some(key => Object.prototype.hasOwnProperty.call(profile, key));
    if (usesStructuredName) {
        const firstNameError = profileNamePartError(profile.first_name, 'First name', { required: true });
        const middleNameError = profileNamePartError(profile.middle_name, 'Middle name');
        const lastNameError = profileNamePartError(profile.last_name, 'Last name', { required: true });
        const suffixError = profileNamePartError(profile.suffix, 'Suffix', { maxLength: 10 });
        if (firstNameError) errors.first_name = firstNameError;
        if (middleNameError) errors.middle_name = middleNameError;
        if (lastNameError) errors.last_name = lastNameError;
        if (suffixError) errors.suffix = suffixError;
        if (composeCustomerName(profile).length > 100) errors.first_name = 'Complete legal name cannot exceed 100 characters.';
    } else {
        const nameError = profileNameError(profile.name);
        if (nameError) errors.name = nameError;
    }
    if (!normalizePhilippineMobileNumber(profile.phone)) {
        errors.phone = 'Enter a valid PH mobile number, such as 9171234567.';
    }
    if (normalizeProfileText(profile.location).length > 200) errors.location = 'Location cannot exceed 200 characters.';
    if (String(profile.preferences || '').trim().length > 500) errors.preferences = 'Preferences cannot exceed 500 characters.';
    return errors;
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
