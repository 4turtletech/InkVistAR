import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { nationalPHPhone, artistPhoneError, artistPhonePayload, artistPasswordRules, artistPasswordErrors } from '../src/utils/artistProfileValidation.js';
import { calendarCells, shiftCalendarMonth, changeBookingServices, toggleBookingPlacement, bookingPlacementErrors } from '../src/utils/bookingValidation.js';
import { artistProfileErrors, composeCustomerName, customerProfileErrors, normalizeProfileName, normalizeProfileText, suggestCustomerNameParts } from '../src/utils/profileValidation.js';
import { formatTime } from '../src/utils/formatters.js';

test('customer Studio Ticket displays booking time using a 12-hour clock', () => {
  const bookingSource = readFileSync(new URL('../screens/CustomerBooking.jsx', import.meta.url), 'utf8');
  assert.equal(formatTime('13:00'), '1:00 PM');
  assert.equal(formatTime('09:30:00'), '9:30 AM');
  assert.match(bookingSource, /formData\.time \? `at \$\{formatTime\(formData\.time\)\}`/);
});

test('artist profile rejects incomplete identity and invalid professional details', () => {
  assert.deepEqual(artistProfileErrors({
    name: 'Juan Dela Cruz', phone: '9171234567', experience_years: '5', specialization: 'Realism'
  }), {});
  const errors = artistProfileErrors({ name: ' ', phone: '8171234567', experience_years: '2.5', specialization: '' });
  assert.ok(errors.name);
  assert.ok(errors.phone);
  assert.ok(errors.experience_years);
  assert.ok(errors.specialization);
});

test('artist structured names compose safely and require first and last names', () => {
  const structured = { first_name: 'Juan', middle_name: 'Santos', last_name: 'Dela Cruz', suffix: 'Jr.' };
  assert.equal(composeCustomerName(structured), 'Juan Santos Dela Cruz Jr.');
  assert.deepEqual(artistProfileErrors({ ...structured, phone: '9171234567', experience_years: '5', specialization: 'Realism' }), {});
  assert.ok(artistProfileErrors({ ...structured, first_name: '', phone: '', experience_years: '5', specialization: 'Realism' }).first_name);
  assert.ok(artistProfileErrors({ ...structured, last_name: '', phone: '', experience_years: '5', specialization: 'Realism' }).last_name);

  const source = readFileSync(new URL('../screens/ArtistProfile.jsx', import.meta.url), 'utf8');
  assert.match(source, /label: 'First Name \*'/);
  assert.match(source, /label: 'Middle Name \(Optional\)'/);
  assert.match(source, /label: 'Last Name \*'/);
  assert.match(source, /label: 'Suffix \(Optional\)'/);
  assert.match(source, /name: composeCustomerName\(editForm\)/);
});

test('artist password change is a separate profile action and modal', () => {
  const source = readFileSync(new URL('../screens/ArtistProfile.jsx', import.meta.url), 'utf8');
  const editModalStart = source.indexOf('{/* Edit Profile Modal */}');
  const passwordModalStart = source.indexOf('{/* Change Password Modal */}');
  const profileSaveStart = source.indexOf('const handleSave = async');
  const passwordSaveStart = source.indexOf('const handlePasswordSave = async');

  assert.ok(editModalStart >= 0 && passwordModalStart > editModalStart);
  assert.match(source, /style=\{styles\.row\} onPress=\{handlePasswordOpen\}/);
  assert.match(source, /visible=\{passwordModalVisible\}/);
  assert.doesNotMatch(source.slice(editModalStart, passwordModalStart), /pwdForm|Current Password|New Password/);
  assert.doesNotMatch(source.slice(profileSaveStart, passwordSaveStart), /changeArtistPassword/);
  assert.match(source.slice(passwordSaveStart), /changeArtistPassword\(userId, pwdForm\.current, pwdForm\.new\)/);
});

test('customer profile validates every editable field and normalizes safe text', () => {
  assert.deepEqual(customerProfileErrors({ name: 'Maria Santos', phone: '9171234567', location: 'Pasay City' }), {});
  assert.ok(customerProfileErrors({ name: 'M', phone: '123', location: 'x'.repeat(201) }).name);
  assert.ok(customerProfileErrors({ name: 'M', phone: '123', location: 'x'.repeat(201) }).phone);
  assert.ok(customerProfileErrors({ name: 'M', phone: '123', location: 'x'.repeat(201) }).location);
  assert.equal(normalizeProfileName('  Maria   Santos\n'), 'Maria Santos');
  assert.equal(normalizeProfileText('  Pasay <City>  '), 'Pasay City');
});

test('customer structured names preserve the legacy display name and support existing accounts', () => {
  const structured = { first_name: 'María', middle_name: 'Lourdes', last_name: 'de la Cruz', suffix: 'Jr.' };
  assert.equal(composeCustomerName(structured), 'María Lourdes de la Cruz Jr.');
  assert.deepEqual(customerProfileErrors({ ...structured, phone: '9171234567', location: '' }), {});
  assert.ok(customerProfileErrors({ ...structured, last_name: '', phone: '9171234567' }).last_name);
  assert.deepEqual(suggestCustomerNameParts({ name: 'Angela Bautista', name_needs_review: true }), {
    first_name: 'Angela', middle_name: '', last_name: 'Bautista', suffix: '', name_needs_review: true,
  });
});

test('PH phone loading/paste/save preserves all digits across supported formats', () => {
  for (const value of ['+639952086028', '639952086028', '09952086028', '9952086028', '+63 995 208 6028']) {
    assert.equal(nationalPHPhone(value), '9952086028');
    assert.equal(artistPhoneError(value), '');
    assert.equal(artistPhonePayload(value), '+639952086028');
  }
});
test('invalid phone lengths/prefixes are rejected, never silently truncated', () => {
  for (const value of ['9952086', '8952086028', '995208602899']) assert.ok(artistPhoneError(value));
  assert.equal(nationalPHPhone('995208602899'), '995208602899');
  assert.equal(artistPhonePayload(''), '');
});
test('password reports each missing rule and distinguishes empty confirmation', () => {
  assert.deepEqual(artistPasswordRules('abc').filter(r => !r.met).map(r => r.label),
    ['At least 8 characters', 'One uppercase letter', 'One number', 'One special character']);
  const errors = artistPasswordErrors({ current: 'test', new: 'Valid123!', confirm: '' });
  assert.equal(errors.confirm, 'Please confirm your new password');
  assert.equal(errors.new, undefined);
  assert.deepEqual(artistPasswordErrors({ current: 'test', new: 'Valid123!', confirm: 'Valid123!' }), {});
});
test('each complexity rule blocks a matching but invalid new password', () => {
  for (const password of ['Aa1!', 'lower123!', 'UPPER123!', 'LettersOnly!', 'NoSymbol123']) {
    assert.ok(artistPasswordErrors({ current: 'test', new: password, confirm: password }).new);
  }
});
test('confirmation revalidation identifies a newly changed password mismatch', () => {
  assert.ok(artistPasswordErrors({ current: 'test', new: 'Changed123!', confirm: 'Valid123!' }).confirm);
});
test('September 2026 starts Tuesday, September 9 is Wednesday', () => {
  const cells = calendarCells(2026, 8);
  assert.deepEqual(cells.slice(0, 3), [null, null, 1]);
  assert.equal(cells.indexOf(9) % 7, 3);
  assert.equal(cells.filter(Boolean).length, 30);
});
test('all months align including leap February and Sunday/Saturday starts', () => {
  for (const year of [2024, 2026, 2027]) for (let month = 0; month < 12; month++) {
    const cells = calendarCells(year, month);
    for (const day of cells.filter(Boolean)) assert.equal(cells.indexOf(day) % 7, new Date(year, month, day).getDay());
  }
  assert.equal(calendarCells(2024, 1).filter(Boolean).length, 29);
});
test('month arrows neither mutate state nor skip February from January 31', () => {
  const source = new Date(2026, 0, 31);
  assert.equal(shiftCalendarMonth(source, 1).getMonth(), 1);
  assert.equal(source.getDate(), 31);
  assert.equal(shiftCalendarMonth(new Date(2026, 11, 31), 1).getFullYear(), 2027);
});
const base = { selectedServices: ['Consultation'], tattooPlacement: ['Left Forearm'], piercingPlacement: [], placement: ['Left Forearm'], placementNotes: 'old notes' };
test('switching service clears incompatible and hidden placement state', () => {
  const piercing = changeBookingServices(base, ['Piercing']);
  assert.deepEqual(piercing.placement, []);
  assert.equal(piercing.placementNotes, '');
  assert.ok(bookingPlacementErrors(piercing).piercingPlacement);
  assert.deepEqual(base.placement, ['Left Forearm']);
});
test('legacy combined placement cannot satisfy piercing validation', () => {
  assert.ok(bookingPlacementErrors({ selectedServices: ['Piercing'], placement: ['Left Forearm'] }).piercingPlacement);
  assert.ok(bookingPlacementErrors({ selectedServices: ['Piercing'], piercingPlacement: ['Left Forearm'] }).piercingPlacement);
});
test('combined services require both independent placement groups', () => {
  let form = changeBookingServices(base, ['Tattoo Session', 'Piercing']);
  assert.deepEqual(Object.keys(bookingPlacementErrors(form)).sort(), ['piercingPlacement', 'tattooPlacement']);
  form = toggleBookingPlacement(form, 'tattooPlacement', 'Left Forearm');
  assert.deepEqual(Object.keys(bookingPlacementErrors(form)), ['piercingPlacement']);
  form = toggleBookingPlacement(form, 'piercingPlacement', 'Left Ear Lobe');
  assert.deepEqual(bookingPlacementErrors(form), {});
  assert.deepEqual(form.placement, ['Left Forearm', 'Left Ear Lobe']);
  form = toggleBookingPlacement(form, 'piercingPlacement', 'Left Ear Lobe');
  assert.ok(bookingPlacementErrors(form).piercingPlacement);
});
test('Other is independent for each service; 5-150 character notes required', () => {
  let form = changeBookingServices(base, ['Tattoo Session', 'Piercing']);
  form = toggleBookingPlacement(form, 'tattooPlacement', 'Other');
  assert.ok(bookingPlacementErrors(form).piercingPlacement);
  assert.ok(bookingPlacementErrors(form).placementNotes);
  form = toggleBookingPlacement(form, 'piercingPlacement', 'Other');
  for (const notes of ['', 'abcd', 'a'.repeat(151)]) assert.ok(bookingPlacementErrors({ ...form, placementNotes: notes }).placementNotes);
  assert.deepEqual(bookingPlacementErrors({ ...form, placementNotes: 'Valid location' }), {});
});
