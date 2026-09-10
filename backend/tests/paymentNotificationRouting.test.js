const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const serverSource = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');

test('customer payment notifications consistently link to appointment ledger entries', () => {
  const manualStart = serverSource.indexOf("app.post('/api/admin/appointments/:id/manual-payment'");
  const billingStart = serverSource.indexOf("app.post('/api/admin/billing/record-payment'");
  const resendStart = serverSource.indexOf("app.post('/api/admin/invoices/:id/resend'");
  const manualRoute = serverSource.slice(manualStart, billingStart);
  const billingRoute = serverSource.slice(billingStart, resendStart);

  assert.match(manualRoute, /createNotification\(apptData\.customer_id, 'Payment Received', customerMsg, 'payment_success', id\)/);
  assert.match(billingRoute, /createNotification\(customerId, 'Payment Received', customerMsg, 'payment_success', appointmentId\)/);
  assert.doesNotMatch(manualRoute, /'payment_success', invInsertRes/);
  assert.doesNotMatch(billingRoute, /'payment_success', invInsertRes/);
});
