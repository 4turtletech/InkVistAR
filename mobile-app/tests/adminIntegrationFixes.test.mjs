import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { adminAccountStatus, adminAccountStatusRank, adminAppointmentSessionErrors, adminUserErrors, invoiceFormErrors, payoutFormErrors, sanitizeCurrencyInput, sessionTimeSelection } from '../src/utils/adminFormValidation.js';
import { inventoryAlerts, inventoryItemErrors, normalizeInventoryItem } from '../src/utils/inventoryState.js';

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
test('mobile user management uses the canonical account status', () => {
  assert.equal(adminAccountStatus({ account_status: 'active' }), 'active');
  assert.equal(adminAccountStatus({ account_status: 'deactivated' }), 'deactivated');
  assert.equal(adminAccountStatus({ account_status: 'banned' }), 'banned');
  assert.equal(adminAccountStatus({ account_status: 'unknown' }), 'active');
  assert.equal(adminAccountStatus({ account_status: 'active', is_deleted: 1 }), 'deactivated');
  assert.ok(adminAccountStatusRank({ account_status: 'active' }) < adminAccountStatusRank({ account_status: 'banned' }));

  const source = readFileSync(new URL('../screens/AdminUserManagement.jsx', import.meta.url), 'utf8');
  assert.match(source, /active: \{ icon: ShieldCheck/);
  assert.match(source, /deactivated: \{ icon: ShieldOff/);
  assert.match(source, /banned: \{ icon: Ban/);
  assert.doesNotMatch(source, /\['all', 'active', 'suspended'\]/);
});
test('account status changes use inline validation and a themed result modal', () => {
  const source = readFileSync(new URL('../screens/AdminUserManagement.jsx', import.meta.url), 'utf8');
  const start = source.indexOf('const handleStatusUpdate = async () => {');
  const end = source.indexOf('// Filter + Sort', start);
  const statusFlow = source.slice(start, end);

  assert.match(statusFlow, /setStatusError\('Please explain/);
  assert.match(statusFlow, /setStatusSuccess\(\{ userName: user\.name, status: selectedStatus \}\)/);
  assert.doesNotMatch(statusFlow, /Alert\.alert/);
  assert.match(source, /statusErrorBox.*accessibilityRole="alert"/s);
  assert.match(source, />Status Updated</);
});
test('admin new-user creation uses structured legal-name fields and preserves canonical name', () => {
  const source = readFileSync(new URL('../screens/AdminUserManagement.jsx', import.meta.url), 'utf8');
  assert.match(source, /First Name, required/);
  assert.match(source, /Middle Name, optional/);
  assert.match(source, /Last Name, required/);
  assert.match(source, /Suffix, optional/);
  assert.match(source, /composeCustomerName\(nameParts\)/);
  assert.match(source, /payload\.middleName = nameParts\.middle_name \|\| null/);
  assert.match(source, /payload\.lastName = nameParts\.last_name/);
});
test('admin new-user modal caps phone input, signals overflow content and avoids native result alerts', () => {
  const source = readFileSync(new URL('../screens/AdminUserManagement.jsx', import.meta.url), 'utf8');
  assert.match(source, /nationalPHPhone\(t\)\.slice\(0, 10\)/);
  assert.match(source, /maxLength=\{10\}/);
  assert.match(source, />Scroll for more</);
  assert.match(source, /setUserSaveResult\(\{ action: editingUser \? 'updated' : 'created'/);
  const start = source.indexOf('const handleSaveUser = async () => {');
  const end = source.indexOf('const confirmDelete', start);
  assert.doesNotMatch(source.slice(start, end), /Alert\.alert/);
});
test('mobile user search suggestion autofills before input blur can unmount it', () => {
  const source = readFileSync(new URL('../screens/AdminUserManagement.jsx', import.meta.url), 'utf8');
  assert.match(source, /const handleSuggestionSelect = \(user\) => \{/);
  assert.match(source, /setSearch\(selectedValue\)/);
  assert.match(source, /onPressIn=\{\(\) => handleSuggestionSelect\(s\)\}/);
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
  assert.match(billing, /customerId: invoiceForm\.customerId \|\| null/);
  assert.match(billing, /client: clientName\.trim\(\)/);
  assert.match(billing, /type: serviceType/);
  assert.match(billing, /status: 'Pending'/);
  assert.match(billing, />Create Draft Invoice<|>Save Draft Invoice</);
  assert.doesNotMatch(billing, /Alert\.alert\('Success', 'Invoice created successfully\.'/);
});
test('draft invoice client waterfall suggests active customers and preserves walk-in entry', () => {
  const billing = readFileSync(new URL('../screens/AdminBilling.jsx', import.meta.url), 'utf8');

  assert.match(billing, /const \[customers, setCustomers\] = useState\(\[\]\)/);
  assert.match(billing, /String\(u\.account_status \|\| 'active'\)\.toLowerCase\(\) === 'active'/);
  assert.match(billing, /const invoiceClientSuggestions = invoiceClientFocused/);
  assert.match(billing, /onPressIn=\{\(\) => selectInvoiceCustomer\(customer\)\}/);
  assert.match(billing, /customerId: String\(customer\.id\), clientName: customer\.name/);
  assert.match(billing, /field === 'clientName' \? \{ customerId: '' \} : \{\}/);
  assert.match(billing, /styles\.clientSuggestionList/);
});
test('session time selection normalizes SQL seconds without changing hours/minutes', () => {
  assert.equal(sessionTimeSelection('20:00:00'), '20:00');
  assert.equal(sessionTimeSelection('09:30'), '09:30');
  assert.equal(sessionTimeSelection(null), '');
  assert.equal(sessionTimeSelection('25:90:00'), '');
});

test('admin appointment creation supports structured walk-in contact details without native result alerts', () => {
  const source = readFileSync(new URL('../screens/AdminAppointmentManagement.jsx', import.meta.url), 'utf8');
  const saveStart = source.indexOf('const handleSave = async () => {');
  const saveEnd = source.indexOf('const handleDelete = async () => {', saveStart);
  const saveFlow = source.slice(saveStart, saveEnd);

  assert.match(source, /\['walkin', 'Walk-In Client'\]/);
  assert.match(source, /walkInFirstName/);
  assert.match(source, /walkInLastName/);
  assert.match(source, /guestPhone: normalizePhilippineMobileNumber\(walkInPhone\)/);
  assert.match(source, /maxLength=\{10\}/);
  assert.match(saveFlow, /customerId: 'admin'/);
  assert.match(saveFlow, /showToast\('Appointment created successfully\.'/);
  assert.match(saveFlow, /showToast\('Appointment updated successfully\.'/);
  assert.doesNotMatch(saveFlow, /Alert\.alert\('Success', 'Appointment created'/);
  assert.doesNotMatch(saveFlow, /Alert\.alert\('Success', 'Appointment updated'/);
});

test('mobile appointment sessions require both an artist and valid price while consultations remain quotable', () => {
  assert.deepEqual(adminAppointmentSessionErrors({
    isCreate: true, serviceType: 'Tattoo Session', designTitle: 'Floral Sleeve', price: '', artistId: '', status: 'confirmed', sessionNumber: 1,
  }), {
    artistId: 'Please assign an artist to this session.',
    price: 'Price is required for tattoo and piercing sessions.',
  });
  assert.match(adminAppointmentSessionErrors({
    isCreate: true, serviceType: 'Piercing', designTitle: 'Ear Piercing', price: '4999', artistId: 4, status: 'pending', sessionNumber: 1,
  }).price, /5,000/);
  assert.deepEqual(adminAppointmentSessionErrors({
    isCreate: true, serviceType: 'Consultation', designTitle: 'Cover-up Consultation', price: '', artistId: 4, status: 'pending', sessionNumber: 1,
  }), {});
  assert.equal(adminAppointmentSessionErrors({
    isCreate: true, serviceType: 'Consultation', designTitle: 'Cover-up Consultation', price: '', artistId: '', status: 'pending', sessionNumber: 1,
  }).artistId, 'Please assign an artist to this session.');
  assert.deepEqual(adminAppointmentSessionErrors({
    isCreate: true, serviceType: 'Tattoo Session', designTitle: 'Floral Sleeve', price: '', artistId: 4, status: 'confirmed', sessionNumber: 2,
  }), {});
});

test('mobile appointments require a bounded design title unless closing a legacy record', () => {
  const validAppointment = {
    isCreate: true,
    serviceType: 'Tattoo Session',
    price: '5000',
    artistId: 4,
    status: 'confirmed',
    sessionNumber: 1,
  };

  assert.equal(
    adminAppointmentSessionErrors({ ...validAppointment, designTitle: '   ' }).designTitle,
    'Design title is required.',
  );
  assert.equal(
    adminAppointmentSessionErrors({ ...validAppointment, designTitle: 'A'.repeat(256) }).designTitle,
    'Design title cannot exceed 255 characters.',
  );
  assert.equal(
    adminAppointmentSessionErrors({ ...validAppointment, status: 'cancelled', designTitle: '' }).designTitle,
    undefined,
  );
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
test('mobile dashboard stock alerts open inventory with the matching filter', () => {
  const dashboard = readFileSync(new URL('../screens/AdminDashboard.jsx', import.meta.url), 'utf8');
  const inventory = readFileSync(new URL('../screens/AdminInventory.jsx', import.meta.url), 'utf8');

  assert.match(dashboard, /navigate\?\.\('admin-inventory', \{ stockFilter: 'out' \}\)/);
  assert.match(dashboard, /navigate\?\.\('admin-inventory', \{ stockFilter: 'low' \}\)/);
  assert.match(inventory, /const requestedFilter = route\?\.params\?\.stockFilter/);
  assert.match(inventory, /setShowArchived\(false\)/);
  assert.match(inventory, /setStockStatusFilter\(requestedFilter\)/);
});
test('all mobile notification portals provide safe title and message search', () => {
  const admin = readFileSync(new URL('../screens/AdminNotifications.jsx', import.meta.url), 'utf8');
  const artist = readFileSync(new URL('../screens/ArtistNotifications.jsx', import.meta.url), 'utf8');
  const customer = readFileSync(new URL('../screens/CustomerNotifications.jsx', import.meta.url), 'utf8');
  const api = readFileSync(new URL('../src/utils/api.js', import.meta.url), 'utf8');

  for (const source of [admin, artist, customer]) {
    assert.match(source, /placeholder="Search notifications\.\.\."/);
    assert.match(source, /onChangeText=\{setSearch\}/);
  }
  assert.match(admin, /String\(n\.title \|\| ''\)/);
  assert.match(admin, /String\(n\.message \|\| ''\)/);
  for (const source of [artist, customer]) {
    assert.match(source, /setTimeout\(\(\) => setDebouncedSearch\(search\.trim\(\)\), 300\)/);
    assert.match(source, /if \(debouncedSearch\) opts\.search = debouncedSearch/);
  }
  assert.match(api, /params\.append\('search', search\.trim\(\)\)/);
});
test('mobile inventory item form requires explicit safe values and prevents duplicate names', () => {
  assert.deepEqual(Object.keys(inventoryItemErrors({})).sort(), [
    'category', 'cost_per_unit', 'current_stock', 'min_stock', 'name', 'unit',
  ].sort());

  const validItem = {
    name: 'Black Gloves',
    category: 'supplies',
    unit: 'box',
    current_stock: '0',
    min_stock: '0',
    cost_per_unit: '0.00',
  };
  assert.deepEqual(inventoryItemErrors(validItem), {});
  assert.ok(inventoryItemErrors({ ...validItem, current_stock: '1.5' }).current_stock);
  assert.ok(inventoryItemErrors({ ...validItem, cost_per_unit: '12.345' }).cost_per_unit);
  assert.ok(inventoryItemErrors(validItem, [{ id: 4, name: ' black gloves ', is_deleted: 0 }]).name);
  assert.deepEqual(inventoryItemErrors(validItem, [{ id: 4, name: 'Black Gloves', is_deleted: 0 }], 4), {});
});
test('mobile Add Inventory Item uses inline errors, a save lock, and an auto-dismiss success popup', () => {
  const source = readFileSync(new URL('../screens/AdminInventory.jsx', import.meta.url), 'utf8');
  const saveStart = source.indexOf('const handleSave = async () => {');
  const saveEnd = source.indexOf('const handleDelete = async () => {', saveStart);
  const saveFlow = source.slice(saveStart, saveEnd);

  assert.match(saveFlow, /inventoryItemErrors\(form, items, editingItem\?\.id\)/);
  assert.match(saveFlow, /setFormErrors\(nextErrors\)/);
  assert.match(saveFlow, /setItemSaveSuccess\(success\)/);
  assert.doesNotMatch(saveFlow, /Alert\.alert/);
  assert.doesNotMatch(saveFlow, /showToast\(/);
  assert.match(source, /formErrors\.name && styles\.inputError/);
  assert.match(source, /formErrors\.category && styles\.typeBtnError/);
  assert.match(source, /formErrors\.submission/);
  assert.match(source, /disabled=\{itemSaving\}/);
  assert.match(source, /setTimeout\(\(\) => setItemSaveSuccess\(null\), 2200\)/);
  assert.match(source, /styles\.successPopupCard/);
  assert.match(source, /<CheckCircle2 size=\{48\}/);
});
test('mobile Create Kit sequences native modals instead of stacking frozen overlays', () => {
  const source = readFileSync(new URL('../screens/AdminInventory.jsx', import.meta.url), 'utf8');
  const openStart = source.indexOf('const openKitEditor =');
  const openEnd = source.indexOf('const toggleKitMaterial', openStart);
  const modalFlow = source.slice(openStart, openEnd);

  assert.match(modalFlow, /setKitsModal\(false\)/);
  assert.match(modalFlow, /setTimeout\(\(\) => setKitEditorVisible\(true\), 220\)/);
  assert.match(modalFlow, /const closeKitEditor =/);
  assert.match(modalFlow, /setKitEditorVisible\(false\)/);
  assert.match(modalFlow, /setTimeout\(\(\) => setKitsModal\(true\), 220\)/);
  assert.match(source, /onRequestClose=\{closeKitEditor\}/);
  assert.match(source, /onPress=\{closeKitEditor\}/);
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
