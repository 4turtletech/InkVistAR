const assert = require('node:assert/strict');
const test = require('node:test');
const {
  isPaidPayout,
  normalizePayoutInput,
  summarizeArtistPayout,
} = require('../services/payoutService');

const artist = { id: 73, name: 'Test Artist' };
const completedPaidSession = {
  id: 1,
  artist_id: 73,
  secondary_artist_id: null,
  price: 1000,
  discount_amount: 0,
  payment_status: 'paid',
  total_paid: 1000,
  status: 'completed',
  is_deleted: 0,
};

test('only actual paid payout records reduce the artist balance', () => {
  const result = summarizeArtistPayout(artist, [completedPaidSession], [
    { artist_id: 73, amount: 600, status: 'Pending' },
    { artist_id: 73, amount: 100, status: 'Voided' },
    { artist_id: 73, amount: 200, status: 'Paid' },
  ]);
  assert.equal(result.totalEarned, 600);
  assert.equal(result.totalPaidOut, 200);
  assert.equal(result.availableBalance, 400);
});

test('unpaid and unfinished sessions are not available for payout', () => {
  const result = summarizeArtistPayout(artist, [
    { ...completedPaidSession, payment_status: 'unpaid', total_paid: 200 },
    { ...completedPaidSession, id: 2, status: 'confirmed' },
  ], []);
  assert.equal(result.totalEarned, 0);
  assert.equal(result.awaitingCustomerPayment, 600);
  assert.equal(result.availableBalance, 0);
});

test('a full manual or gateway payment makes completed commission payable', () => {
  for (const session of [
    { ...completedPaidSession, payment_status: 'unpaid', total_paid: 1000 },
    { ...completedPaidSession, payment_status: 'paid', total_paid: 0 },
  ]) {
    assert.equal(summarizeArtistPayout(artist, [session], []).availableBalance, 600);
  }
});

test('mobile legacy field names normalize without losing method or reference', () => {
  assert.deepEqual(normalizePayoutInput({
    artistId: '73', amount: '125.50', paymentMethod: 'GCash', referenceNumber: 'GC-123',
  }), { artistId: 73, amount: 125.5, method: 'GCash', reference: 'GC-123' });
});

test('payout input rejects invalid artists, amounts, and methods', () => {
  assert.throws(() => normalizePayoutInput({ artistId: '', amount: 100, method: 'Cash' }));
  assert.throws(() => normalizePayoutInput({ artistId: 73, amount: 0, method: 'Cash' }));
  assert.throws(() => normalizePayoutInput({ artistId: 73, amount: 100, method: 'Crypto' }));
});

test('paid payout statuses are explicit', () => {
  assert.equal(isPaidPayout({ status: 'Paid' }), true);
  assert.equal(isPaidPayout({ status: 'completed' }), true);
  assert.equal(isPaidPayout({ status: 'Pending' }), false);
  assert.equal(isPaidPayout({ status: 'Voided' }), false);
});
