import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const screen = readFileSync(new URL('../screens/CustomerAppointments.jsx', import.meta.url), 'utf8');
const api = readFileSync(new URL('../src/utils/api.js', import.meta.url), 'utf8');

test('appointments reload whenever the customer returns to the tab', () => {
  assert.match(screen, /import \{ useFocusEffect \} from '@react-navigation\/native'/);
  assert.match(screen, /useFocusEffect\([\s\S]*?fetchAppointments\(\)/);
});

test('appointment request failures do not masquerade as an empty list', () => {
  assert.match(screen, /setAppointmentsError\(r\.message/);
  assert.match(screen, /Unable to load appointments/);
  assert.match(screen, /accessibilityRole="alert"/);
  assert.match(screen, />Try Again<\/Text>/);
});

test('customer appointment reads require a refreshable authenticated session', () => {
  assert.match(
    api,
    /getCustomerAppointments[\s\S]*?fetchAPI\(`\/customer\/\$\{customerId\}\/appointments`, \{ requireAuth: true \}\)/,
  );
});
