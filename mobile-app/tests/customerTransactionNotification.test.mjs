import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appSource = readFileSync(new URL('../App.js', import.meta.url), 'utf8');
const notificationSource = readFileSync(new URL('../screens/CustomerNotifications.jsx', import.meta.url), 'utf8');
const ledgerSource = readFileSync(new URL('../screens/CustomerTransactions.jsx', import.meta.url), 'utf8');

test('customer transaction ledger loads with the authenticated customer instead of an obsolete storage key', () => {
  assert.match(appSource, /<CustomerTransactions \{\.\.\.props\} customerId=\{user\.id\} \/>/);
  assert.match(ledgerSource, /getCustomerTransactions\(customerId\)/);
  assert.doesNotMatch(ledgerSource, /user_data|AsyncStorage/);
  assert.match(ledgerSource, /setLoadError\(res\.message/);
});

test('payment notifications target and expand the newest receipt for their appointment', () => {
  assert.match(notificationSource, /customer-transactions', \{ openAppointmentId: item\.related_id \}/);
  assert.match(ledgerSource, /transactions\.find\(item => hasMatchingId\(item\.appointment_id, appointmentId\)\)/);
  assert.match(ledgerSource, /initiallyExpanded=\{item\.ledger_id === targetedLedgerId\}/);
  assert.match(ledgerSource, /scrollToIndex\(\{ index: targetIndex/);
});
