import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { analyticsPeriodLabel, buildAnalyticsExportReport } from '../src/utils/analyticsExport.js';

test('analytics period labels include applied custom dates', () => {
  assert.equal(analyticsPeriodLabel('monthly'), 'This Month');
  assert.equal(analyticsPeriodLabel('custom', '2026-09-01', '2026-09-13'), '2026-09-01 to 2026-09-13');
});

test('analytics exports contain summaries and every displayed breakdown', () => {
  const report = buildAnalyticsExportReport({
    revenue: { total: 12500, breakdown: [{ name: 'Appointments', value: 10000 }], chart: [{ month: 'Sep', appointments: 3, value: 12500 }] },
    expenses: { total: 2500, breakdown: [{ name: 'Payouts', value: 2500 }] },
    overhead: { total: 1000, breakdown: [{ category: 'Rent', total_amount: 1000 }] },
    appointments: { total: 4, completed: 3, scheduled: 1, cancelled: 0, completionRate: 100, avgDuration: 5400 },
    users: { total: 12 },
    artists: [{ name: 'Artist One', appointments: 3, revenue: 10000 }],
    styles: [{ name: 'Realism', count: 2 }],
    inventory: [{ name: 'Black Ink', used: 4, unit: 'bottles' }],
  }, 'This Month');

  assert.equal(report.metrics.find(item => item.label === 'Total Revenue').value, 'PHP 12,500.00');
  assert.equal(report.metrics.find(item => item.label === 'Average Session Duration').value, '1h 30m');
  assert.deepEqual(report.tables.map(table => table.title), [
    'Appointment Status', 'Revenue Sources', 'Revenue Trend', 'Artist Performance',
    'Popular Styles', 'Consumed Inventory', 'Operating Expenses', 'Studio Overhead',
  ]);
  assert.match(report.text, /InkVistAR Analytics Report/);
  assert.match(report.text, /Artist One/);
  assert.ok(report.csvRows.some(row => row.section === 'Consumed Inventory' && row.item === 'Black Ink'));
});

test('mobile analytics exposes CSV, PDF and text sharing from a custom modal', () => {
  const source = readFileSync(new URL('../screens/AdminAnalytics.jsx', import.meta.url), 'utf8');
  assert.match(source, /title="Export analytics report"/);
  assert.match(source, /label: 'CSV File'/);
  assert.match(source, /label: 'PDF Report'/);
  assert.match(source, /label: 'Share as Text'/);
  assert.match(source, /await exportCSV\(csv, filename\)/);
  assert.match(source, /await sharePDF\(html, filename\)/);
  assert.match(source, /await Share\.share/);
});
