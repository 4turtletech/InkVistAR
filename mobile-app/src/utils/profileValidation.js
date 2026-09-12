import { artistPhoneError } from './artistProfileValidation.js';
import { normalizePhilippineMobileNumber } from './validators.js';

export const normalizeProfileName = (value = '') => String(value)
  .replace(/[<>\r\n]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

export const normalizeProfileText = (value = '') => String(value)
  .replace(/[<>\r\n]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

export const composeCustomerName = (profile = {}) => [
  profile.first_name,
  profile.middle_name,
  profile.last_name,
  profile.suffix,
].map(normalizeProfileName).filter(Boolean).join(' ');

export const suggestCustomerNameParts = (profile = {}) => {
  if (profile.first_name || profile.last_name) {
    return {
      first_name: normalizeProfileName(profile.first_name),
      middle_name: normalizeProfileName(profile.middle_name),
      last_name: normalizeProfileName(profile.last_name),
      suffix: normalizeProfileName(profile.suffix),
      name_needs_review: Boolean(profile.name_needs_review),
    };
  }

  const [first_name = '', ...remaining] = normalizeProfileName(profile.name).split(' ').filter(Boolean);
  return {
    first_name,
    middle_name: '',
    last_name: remaining.join(' '),
    suffix: '',
    name_needs_review: Boolean(profile.name),
  };
};

const namePartError = (value, label, { required = false, maxLength = 50 } = {}) => {
  const part = normalizeProfileName(value);
  if (!part) return required ? `${label} is required.` : '';
  if (part.length > maxLength) return `${label} cannot exceed ${maxLength} characters.`;
  if (!/^[\p{L}\p{M} .'-]+$/u.test(part)) return `${label} contains unsupported characters.`;
  return '';
};

const nameError = (value) => {
  const name = normalizeProfileName(value);
  if (!name) return 'Full name is required.';
  if (name.length < 2) return 'Full name must be at least 2 characters.';
  if (name.length > 100) return 'Full name cannot exceed 100 characters.';
  return '';
};

export const artistProfileErrors = (form = {}) => {
  const errors = {};
  const usesStructuredName = ['first_name', 'middle_name', 'last_name', 'suffix']
    .some(key => Object.prototype.hasOwnProperty.call(form, key));
  const phoneError = artistPhoneError(form.phone);
  const experienceText = String(form.experience_years ?? '').trim();
  const experience = Number(experienceText);
  const specialization = normalizeProfileText(form.specialization);

  if (usesStructuredName) {
    const firstNameError = namePartError(form.first_name, 'First name', { required: true });
    const middleNameError = namePartError(form.middle_name, 'Middle name');
    const lastNameError = namePartError(form.last_name, 'Last name', { required: true });
    const suffixError = namePartError(form.suffix, 'Suffix', { maxLength: 10 });
    if (firstNameError) errors.first_name = firstNameError;
    if (middleNameError) errors.middle_name = middleNameError;
    if (lastNameError) errors.last_name = lastNameError;
    if (suffixError) errors.suffix = suffixError;
    if (composeCustomerName(form).length > 100) errors.first_name = 'Complete legal name cannot exceed 100 characters.';
  } else {
    const fullNameError = nameError(form.name);
    if (fullNameError) errors.name = fullNameError;
  }
  if (phoneError) errors.phone = phoneError;
  if (!experienceText) errors.experience_years = 'Experience is required.';
  else if (!Number.isInteger(experience) || experience < 0 || experience > 50) {
    errors.experience_years = 'Experience must be a whole number from 0 to 50.';
  }
  if (!specialization) errors.specialization = 'Select at least one specialization.';
  else if (specialization.length > 255) errors.specialization = 'Specialization cannot exceed 255 characters.';

  return errors;
};

export const customerProfileErrors = (form = {}) => {
  const errors = {};
  const usesStructuredName = ['first_name', 'middle_name', 'last_name', 'suffix']
    .some(key => Object.prototype.hasOwnProperty.call(form, key));
  const location = normalizeProfileText(form.location);

  if (usesStructuredName) {
    const firstNameError = namePartError(form.first_name, 'First name', { required: true });
    const middleNameError = namePartError(form.middle_name, 'Middle name');
    const lastNameError = namePartError(form.last_name, 'Last name', { required: true });
    const suffixError = namePartError(form.suffix, 'Suffix', { maxLength: 10 });
    if (firstNameError) errors.first_name = firstNameError;
    if (middleNameError) errors.middle_name = middleNameError;
    if (lastNameError) errors.last_name = lastNameError;
    if (suffixError) errors.suffix = suffixError;
    if (composeCustomerName(form).length > 100) errors.first_name = 'Complete legal name cannot exceed 100 characters.';
  } else {
    const fullNameError = nameError(form.name);
    if (fullNameError) errors.name = fullNameError;
  }
  if (!normalizePhilippineMobileNumber(form.phone)) {
    errors.phone = 'Enter 10 digits starting with 9, for example 9171234567.';
  }
  if (location.length > 200) errors.location = 'Location cannot exceed 200 characters.';

  return errors;
};
