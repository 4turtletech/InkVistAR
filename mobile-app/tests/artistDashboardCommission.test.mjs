import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../screens/ArtistDashboard.jsx', import.meta.url), 'utf8');

test('artist dashboard keeps the commission function separate from its display percentage', () => {
  assert.match(source, /import \{ resolveCommissionRate, artistCommission \}/);
  assert.match(source, /const artistCommissionPercent =/);
  assert.match(source, /artistCommission\(apt, userId\)\.artistShare/);
  assert.match(source, /\{artistCommissionPercent\}%/);
  assert.doesNotMatch(source, /const artistCommission =/);
});
