const { normalizePhilippineMobileNumber } = require('./phoneNumber');

const validationError = (message) => Object.assign(new Error(message), { statusCode: 400 });

const normalizeSingleLine = (value) => String(value ?? '')
  .replace(/[<>\r\n]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

function normalizeName(value, { required = true } = {}) {
  if (value === undefined && !required) return undefined;
  const name = normalizeSingleLine(value);
  if (!name) throw validationError('Full name is required.');
  if (name.length < 2) throw validationError('Full name must be at least 2 characters.');
  if (name.length > 100) throw validationError('Full name cannot exceed 100 characters.');
  return name;
}

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const STRUCTURED_NAME_KEYS = ['first_name', 'firstName', 'middle_name', 'middleName', 'last_name', 'lastName', 'suffix'];

function normalizeNamePart(value, label, { required = false, maxLength = 50 } = {}) {
  const part = normalizeSingleLine(value);
  if (!part) {
    if (required) throw validationError(`${label} is required.`);
    return null;
  }
  if (part.length > maxLength) throw validationError(`${label} cannot exceed ${maxLength} characters.`);
  if (!/^[\p{L}\p{M} .'-]+$/u.test(part)) {
    throw validationError(`${label} can contain only letters, spaces, apostrophes, hyphens, and periods.`);
  }
  return part;
}

function composeStructuredName({ first_name, middle_name, last_name, suffix }) {
  const fullName = [first_name, middle_name, last_name, suffix].filter(Boolean).join(' ');
  return normalizeName(fullName);
}

function normalizeStructuredNameInput(body = {}, { required = false } = {}) {
  const structuredNameProvided = STRUCTURED_NAME_KEYS.some((key) => hasOwn(body, key));
  if (!structuredNameProvided) {
    return {
      structuredNameProvided: false,
      name: normalizeName(body.name, { required }),
      first_name: undefined,
      middle_name: undefined,
      last_name: undefined,
      suffix: undefined,
    };
  }

  const first_name = normalizeNamePart(
    hasOwn(body, 'first_name') ? body.first_name : body.firstName,
    'First name',
    { required: true },
  );
  const middle_name = normalizeNamePart(
    hasOwn(body, 'middle_name') ? body.middle_name : body.middleName,
    'Middle name',
  );
  const last_name = normalizeNamePart(
    hasOwn(body, 'last_name') ? body.last_name : body.lastName,
    'Last name',
    { required: true },
  );
  const suffix = normalizeNamePart(body.suffix, 'Suffix', { maxLength: 10 });

  return {
    structuredNameProvided: true,
    first_name,
    middle_name,
    last_name,
    suffix,
    name: composeStructuredName({ first_name, middle_name, last_name, suffix }),
  };
}

function normalizeOptionalText(value, maxLength, label) {
  if (value === undefined) return undefined;
  const normalized = normalizeSingleLine(value);
  if (normalized.length > maxLength) throw validationError(`${label} cannot exceed ${maxLength} characters.`);
  return normalized || null;
}

function normalizeArtistPhone(value) {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const input = String(value).trim();
  if (!/^\+?[\d\s()-]+$/.test(input)) throw validationError('Enter a valid phone number.');
  const digits = input.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) throw validationError('Phone number must contain 7 to 15 digits.');
  if (input.length > 20) throw validationError('Phone number is too long.');
  return input;
}

function normalizeArtistProfileInput(body = {}) {
  const experienceText = String(body.experience_years ?? '').trim();
  const experience = Number(experienceText);
  if (!experienceText || !Number.isInteger(experience) || experience < 0 || experience > 100) {
    throw validationError('Experience must be a whole number from 0 to 100.');
  }

  const bio = body.bio === undefined ? undefined : String(body.bio || '').trim();
  if (bio !== undefined && bio.length > 1000) throw validationError('Bio cannot exceed 1000 characters.');

  const structuredName = normalizeStructuredNameInput(body, { required: true });

  return {
    ...structuredName,
    phone: normalizeArtistPhone(body.phone),
    specialization: normalizeOptionalText(body.specialization, 255, 'Specialization'),
    experience_years: experience,
    studio_name: normalizeOptionalText(body.studio_name, 100, 'Studio name'),
    bio,
    profileImage: body.profileImage,
  };
}

function normalizeStringList(value, label) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw validationError(`${label} must be a list.`);
  if (value.length > 30) throw validationError(`${label} cannot contain more than 30 entries.`);
  return value.map(item => {
    const normalized = normalizeSingleLine(item);
    if (!normalized || normalized.length > 60) throw validationError(`${label} entries must contain 1 to 60 characters.`);
    return normalized;
  });
}

function normalizeCustomerProfileInput(body = {}) {
  const email = body.email === undefined ? undefined : String(body.email).trim().toLowerCase();
  if (email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw validationError('Enter a valid email address.');
  }

  const phone = body.phone === undefined ? undefined : normalizePhilippineMobileNumber(body.phone);
  if (body.phone !== undefined && !phone) {
    throw validationError('Enter a valid PH mobile number, such as 9171234567.');
  }

  const notes = body.notes === undefined ? undefined : String(body.notes || '').trim();
  if (notes !== undefined && notes.length > 500) throw validationError('Preferences cannot exceed 500 characters.');

  const structuredName = normalizeStructuredNameInput(body);

  return {
    ...structuredName,
    email,
    phone,
    location: normalizeOptionalText(body.location, 200, 'Location'),
    notes,
    profileImage: body.profileImage,
    health_conditions: normalizeStringList(body.health_conditions, 'Health conditions'),
    allergens: normalizeStringList(body.allergens, 'Allergens'),
  };
}

module.exports = {
  composeStructuredName,
  normalizeArtistProfileInput,
  normalizeCustomerProfileInput,
  normalizeName,
  normalizeStructuredNameInput,
  normalizeSingleLine,
};
