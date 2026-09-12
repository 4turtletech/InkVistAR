const assert = require('node:assert/strict');
const test = require('node:test');
const { normalizeArtistProfileInput, normalizeCustomerProfileInput, normalizeStructuredNameInput } = require('../services/profileValidation');

test('artist profile validation rejects inputs that previously reached MySQL', () => {
  assert.throws(() => normalizeArtistProfileInput({ name: '', phone: '+639171234567', experience_years: 0 }), /Full name is required/);
  assert.throws(() => normalizeArtistProfileInput({ name: 'Artist', phone: '123', experience_years: 0 }), /7 to 15 digits/);
  assert.throws(() => normalizeArtistProfileInput({ name: 'Artist', phone: '', experience_years: '2.5' }), /whole number/);
  assert.throws(() => normalizeArtistProfileInput({ name: 'Artist', phone: '', experience_years: 101 }), /whole number/);
});

test('artist profile validation normalizes safe values without changing fields', () => {
  assert.deepEqual(normalizeArtistProfileInput({
    name: '  Juan   Dela Cruz ', phone: '+639171234567', experience_years: '5',
    specialization: ' Realism ', studio_name: ' Inkvictus ', bio: ' About me ', profileImage: 'data:image/png;base64,x'
  }), {
    structuredNameProvided: false, name: 'Juan Dela Cruz',
    first_name: undefined, middle_name: undefined, last_name: undefined, suffix: undefined,
    phone: '+639171234567', experience_years: 5,
    specialization: 'Realism', studio_name: 'Inkvictus', bio: 'About me', profileImage: 'data:image/png;base64,x'
  });
});

test('artist profile accepts structured names while preserving the combined display name', () => {
  assert.deepEqual(normalizeArtistProfileInput({
    first_name: ' Juan ', middle_name: ' Santos ', last_name: ' Dela Cruz ', suffix: ' Jr. ',
    phone: '+639171234567', experience_years: 5, specialization: 'Realism',
  }), {
    structuredNameProvided: true,
    name: 'Juan Santos Dela Cruz Jr.',
    first_name: 'Juan', middle_name: 'Santos', last_name: 'Dela Cruz', suffix: 'Jr.',
    phone: '+639171234567', experience_years: 5,
    specialization: 'Realism', studio_name: undefined, bio: undefined, profileImage: undefined,
  });
});

test('customer profile validation enforces existing field and list limits', () => {
  assert.throws(() => normalizeCustomerProfileInput({ name: ' ', phone: '9171234567' }), /Full name is required/);
  assert.throws(() => normalizeCustomerProfileInput({ name: 'Maria', phone: '123' }), /valid PH mobile/);
  assert.throws(() => normalizeCustomerProfileInput({ location: 'x'.repeat(201) }), /Location cannot exceed/);
  assert.throws(() => normalizeCustomerProfileInput({ notes: 'x'.repeat(501) }), /Preferences cannot exceed/);
  assert.throws(() => normalizeCustomerProfileInput({ health_conditions: 'None' }), /must be a list/);
});

test('customer partial updates remain supported for profile photos and health data', () => {
  assert.deepEqual(normalizeCustomerProfileInput({ profileImage: 'data:image/png;base64,x' }), {
    structuredNameProvided: false, name: undefined,
    first_name: undefined, middle_name: undefined, last_name: undefined, suffix: undefined,
    email: undefined, phone: undefined, location: undefined, notes: undefined,
    profileImage: 'data:image/png;base64,x', health_conditions: undefined, allergens: undefined,
  });
  assert.deepEqual(normalizeCustomerProfileInput({ name: ' Maria  Santos ', phone: '09171234567', location: ' Pasay ', notes: ' Blackwork ' }), {
    structuredNameProvided: false, name: 'Maria Santos',
    first_name: undefined, middle_name: undefined, last_name: undefined, suffix: undefined,
    email: undefined, phone: '+639171234567', location: 'Pasay', notes: 'Blackwork',
    profileImage: undefined, health_conditions: undefined, allergens: undefined,
  });
});

test('structured customer names compose the legacy display name without guessing', () => {
  assert.deepEqual(normalizeStructuredNameInput({
    firstName: ' María ', middleName: ' Lourdes ', lastName: ' de la Cruz ', suffix: ' Jr. ',
  }, { required: true }), {
    structuredNameProvided: true,
    first_name: 'María',
    middle_name: 'Lourdes',
    last_name: 'de la Cruz',
    suffix: 'Jr.',
    name: 'María Lourdes de la Cruz Jr.',
  });
  assert.throws(() => normalizeStructuredNameInput({ first_name: 'Maria', last_name: '' }), /Last name is required/);
  assert.throws(() => normalizeStructuredNameInput({ first_name: 'Maria2', last_name: 'Santos' }), /unsupported|only letters/);
});
