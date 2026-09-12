import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const billing = readFileSync(new URL('../screens/AdminBilling.jsx', import.meta.url), 'utf8');
const dashboard = readFileSync(new URL('../screens/AdminDashboard.jsx', import.meta.url), 'utf8');

test('mobile payout form sends the backend method and reference fields', () => {
  assert.match(billing, /artistId: payoutForm\.artistId,[\s\S]*amount: parsedAmount,[\s\S]*method: payoutForm\.method,[\s\S]*reference: payoutForm\.reference/);
  assert.doesNotMatch(billing, /paymentMethod: payoutForm\.method|referenceNumber: payoutForm\.reference/);
});

test('mobile payout flow shows balances and validates overpayment inline', () => {
  assert.match(billing, /fetchAPI\('\/admin\/payout-balances'\)/);
  assert.match(billing, />Artists to Pay<\/Text>/);
  assert.match(billing, /payoutFormErrors\(payoutForm, available\)/);
  assert.match(billing, /setPayoutFeedback\(\{ type: 'error'/);
  assert.match(billing, /payoutBalanceError/);
  assert.match(billing, />Retry<\/Text>/);
  assert.doesNotMatch(billing, /payout-balances'\)\.catch\(\(\) => \(\{ success: false, data: \[\] \}\)\)/);
  assert.doesNotMatch(billing, /Alert\.alert\('Success', 'Payout recorded successfully\.'/);
});

test('dashboard payout reminder opens Billing on the payouts tab', () => {
  assert.match(dashboard, /navigate\?\.\('admin-billing', \{ tab: 'payouts' \}\)/);
});
