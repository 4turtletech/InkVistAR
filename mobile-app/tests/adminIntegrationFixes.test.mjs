import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { adminUserErrors, invoiceFormErrors, payoutFormErrors, sanitizeCurrencyInput, sessionTimeSelection } from '../src/utils/adminFormValidation.js';
import { inventoryAlerts, normalizeInventoryItem } from '../src/utils/inventoryState.js';

test('empty user form reports all required fields together', () => {
  assert.deepEqual(Object.keys(adminUserErrors({})).sort(), ['name', 'email', 'phone', 'password', 'confirmPassword'].sort());
});
const valid = { name: 'Integration Test', email: 'test@example.com', phone: '9123456789', password: 'Valid123!', confirmPassword: 'Valid123!' };
test('user input requires valid email and a complete PH phone number', () => {
  assert.deepEqual(adminUserErrors(valid), {});
  for (const phone of ['9123', '8123456789', '91234567890']) assert.ok(adminUserErrors({ ...valid, phone }).phone);
  for (const phone of ['+639123456789', '09123456789', '9123456789']) assert.equal(adminUserErrors({ ...valid, phone }).phone, undefined);
  assert.ok(adminUserErrors({ ...valid, email: 'bad@' }).email);
});
test('confirmation errors clear when passwords match, distinguish empty confirmation', () => {
  assert.equal(adminUserErrors({ ...valid, confirmPassword: '' }).confirmPassword, 'Please confirm password');
  assert.equal(adminUserErrors({ ...valid, password: 'Other123!' }).confirmPassword, 'Passwords do not match');
  assert.deepEqual(adminUserErrors({ ...valid, password: 'Other123!', confirmPassword: 'Other123!' }), {});
  assert.deepEqual(adminUserErrors({ ...valid, password: '', confirmPassword: '' }, true), {});
});
test('invoice validates both required fields and rejects partial/nonfinite amounts', () => {
  assert.deepEqual(Object.keys(invoiceFormErrors({})), ['clientName', 'amount']);
  for (const amount of ['', ' ', '0', '-1', 'Infinity', '2abc']) assert.ok(invoiceFormErrors({ clientName: 'Integration Test', amount }).amount);
  assert.deepEqual(invoiceFormErrors({ clientName: 'Integration Test', amount: '12.50' }), {});
});
test('payout validation enforces balance, currency precision, method, and transfer references', () => {
  const validPayout = { artistId: '73', amount: '125.50', method: 'Cash', reference: '' };
  assert.deepEqual(payoutFormErrors(validPayout, 200), {});
  assert.ok(payoutFormErrors({ ...validPayout, amount: '200.001' }, 500).amount);
  assert.ok(payoutFormErrors({ ...validPayout, amount: '250' }, 200).amount);
  assert.ok(payoutFormErrors({ ...validPayout, method: 'GCash' }, 200).reference);
  assert.ok(payoutFormErrors({ ...validPayout, method: 'Crypto' }, 200).method);
  assert.equal(sanitizeCurrencyInput('P12,345.678'), '12345.67');
});
test('mobile billing creates an auditable draft without native success alerts', () => {
  const billing = readFileSync(new URL('../screens/AdminBilling.jsx', import.meta.url), 'utf8');
  assert.match(billing, /client: clientName\.trim\(\)/);
  assert.match(billing, /type: serviceType/);
  assert.match(billing, /status: 'Pending'/);
  assert.match(billing, />Create Draft Invoice<|>Save Draft Invoice</);
  assert.doesNotMatch(billing, /Alert\.alert\('Success', 'Invoice created successfully\.'/);
});
test('session time selection normalizes SQL seconds without changing hours/minutes', () => {
  assert.equal(sessionTimeSelection('20:00:00'), '20:00');
  assert.equal(sessionTimeSelection('09:30'), '09:30');
  assert.equal(sessionTimeSelection(null), '');
  assert.equal(sessionTimeSelection('25:90:00'), '');
});
test('stock alerts use canonical fields, honor zero minimum and exclude archived items', () => {
  const result = inventoryAlerts([
    { id: 1, current_stock: 10, min_stock: 5 },
    { id: 2, current_stock: '0', quantity: 20, min_stock: 5 },
    { id: 3, current_stock: '2', min_stock: '2' },
    { id: 4, current_stock: 1, min_stock: 0 },
    { id: 5, current_stock: 0, is_deleted: '1' },
  ]);
  assert.deepEqual(result.outOfStock.map(i => i.id), [2]);
  assert.deepEqual(result.lowStock.map(i => i.id), [3]);
  assert.equal(normalizeInventoryItem({ currentStock: '4', minStock: '2' }).current_stock, 4);
});
test('mobile source uses safe area views and removes Inventory Print without removing CSV', () => {
  for (const page of ['AdminAppointmentManagement', 'AdminUserManagement', 'CustomerBooking']) {
    const source = readFileSync(new URL(`../screens/${page}.jsx`, import.meta.url), 'utf8');
    assert.match(source, /import \{[^}]*SafeAreaView[^}]*\} from 'react-native-safe-area-context'/);
  }
  const inventory = readFileSync(new URL('../screens/AdminInventory.jsx', import.meta.url), 'utf8');
  assert.doesNotMatch(inventory, /handlePrint|<Printer/);
  assert.match(inventory, /onPress=\{handleExportCSV\}/);
});

test('stock transactions require notes, send the audit reason and avoid success alerts', () => {
  const inventory = readFileSync(new URL('../screens/AdminInventory.jsx', import.meta.url), 'utf8');
  assert.match(inventory, />Reason \/ Notes \*<\/Text>/);
  assert.match(inventory, /nextErrors\.notes = 'Reason\/Notes is required\.'/);
  assert.match(inventory, /body: JSON\.stringify\(\{[\s\S]*?quantity: sQty,[\s\S]*?reason,/);
  assert.match(inventory, /setInventoryFeedback\(\{[\s\S]*?type: 'success'/);
  assert.doesNotMatch(inventory, /Alert\.alert\('Success', `Stock/);
  assert.match(inventory, /if \(txSaving\) return/);
  assert.match(inventory, /disabled=\{txSaving\}/);
});
