const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { DEFAULT_COMMISSION_RATE, resolveCommissionRate, normalizeCommissionSplit, artistCommission } = require('../services/commissionPolicy');

const serverSource = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');

// Execute the actual route with a fake database, never importing/starting the live server.
function route(method, url, database) {
  const start = serverSource.indexOf(`app.${method}('${url}',`);
  assert.ok(start >= 0);
  const end = serverSource.indexOf('\n});', start) + 4;
  let handler;
  vm.runInNewContext(serverSource.slice(start, end), {
    app: { [method]: (_, callback) => { handler = callback; } },
    db: database, resolveCommissionRate, DEFAULT_COMMISSION_RATE, normalizeCommissionSplit, artistCommission, console,
  });
  return handler;
}

test('fixed 60% pool cannot be overridden by legacy per-artist rates', () => {
  for (const value of [0, '0.00', 0.30, '0.45', 0.60, '0.80', 1]) {
    assert.equal(resolveCommissionRate(value), 0.60);
  }
});

test('missing or invalid commission defaults to 60%, never 30%', () => {
  for (const value of [null, undefined, '', ' ', 'bad', NaN, Infinity, -0.1, 60, true, []]) {
    assert.equal(resolveCommissionRate(value), 0.60);
  }
});

test('profile update cannot overwrite commission, even when the client submits it', () => {
  for (const submittedRate of [undefined, 0.30, 0.60, 1]) {
    const calls = [];
    let response;
    const handler = route('put', '/api/artist/profile/:id', {
      query(sql, params, callback) { calls.push({ sql, params }); callback(null, { affectedRows: 1 }); },
    });
    handler({ params: { id: 73 }, body: {
      name: 'Integration Test', phone: '+639952086028', specialization: 'General Artist',
      experience_years: 0, commission_rate: submittedRate,
    } }, { json(value) { response = value; } });
    assert.equal(response.success, true);
    assert.equal(calls.length, 2);
    assert.ok(calls[0].params.includes('+639952086028'));
    assert.match(calls[1].sql, /^UPDATE artists SET specialization/);
    assert.equal(calls.some(call => /commission_rate/i.test(call.sql)), false);
  }
});

function ledger(rate, overrides = {}, id = '73') {
  const calls = [];
  let response;
  const appointment = {
    id: 1, artist_id: 73, secondary_artist_id: null, price: 1000,
    tattoo_price: null, piercing_price: null, discount_amount: 0,
    payment_status: 'paid', total_paid: 1000, ...overrides,
  };
  const handler = route('get', '/api/artist/:id/earnings-ledger', {
    query(sql, params, callback) {
      calls.push(sql);
      if (calls.length === 1) callback(null, [{ commission_rate: rate }]);
      else if (calls.length === 2) callback(null, [appointment]);
      else callback(null, [{ amount: 100 }]);
    },
  });
  handler({ params: { id } }, { json(value) { response = value; } });
  assert.equal(calls.length, 3);
  assert.ok(calls.every(sql => /^\s*SELECT\b/.test(sql)), 'ledger must remain read-only');
  return response;
}

test('ledger uses the fixed 60% pool and leaves payout history unchanged', () => {
  for (const rate of [0, 0.30, '0.45', 0.60, 0.80, null]) {
    const result = ledger(rate);
    const expected = resolveCommissionRate(rate) * 1000;
    assert.equal(result.commissionRate, resolveCommissionRate(rate));
    assert.equal(result.sessions[0].artistShare, expected);
    assert.equal(result.stats.totalEarned, expected);
    assert.equal(result.stats.totalPaidOut, 100);
    assert.equal(result.stats.balanceToPay, expected - 100);
  }
});

test('fixed pool applies to discounted and unpaid ledger entries', () => {
  const result = ledger(0.60, { discount_amount: 10, discount_type: 'percent', payment_status: 'unpaid', total_paid: 0 });
  assert.equal(result.sessions[0].artistShare, 540);
  assert.equal(result.stats.totalEarned, 0);
  assert.equal(result.stats.pendingFromUnpaid, 540);
});

test('collaborations use agreed split, including separately priced services', () => {
  assert.equal(ledger(0.60, { secondary_artist_id: 74, commission_split: 40 }).sessions[0].artistShare, 240);
  assert.equal(ledger(0.80, { secondary_artist_id: 74, commission_split: 40 }, '74').sessions[0].artistShare, 360);
  assert.equal(ledger(0.60, { secondary_artist_id: 74, tattoo_price: 700, piercing_price: 300, commission_split: 40 }).sessions[0].artistShare, 240);
  assert.equal(ledger(0.80, { secondary_artist_id: 74, tattoo_price: 700, piercing_price: 300, commission_split: 40 }, '74').sessions[0].artistShare, 360);
});

test('referral label never overrides the fixed 60% artist pool', () => {
  assert.equal(ledger(0.60, { is_referral: 1 }).sessions[0].artistShare, 600);
});

test('new artist creation explicitly supplies default, independent of old database defaults', () => {
  assert.match(serverSource, /INSERT INTO artists \(user_id, studio_name, profile_image, commission_rate\) VALUES \(\?, \?, \?, \?\).*DEFAULT_COMMISSION_RATE/);
  assert.match(serverSource, /commission_rate DECIMAL\(5, 2\) DEFAULT 0\.60/);
});

test('artist appointment list exposes the fixed 60% pool with correctly bound parameters', () => {
  let query, values;
  const handler = route('get', '/api/artist/:artistId/appointments', {
    query(sql, params) { query = sql; values = params; },
  });
  handler({ params: { artistId: '74' }, query: {} }, {});
  assert.match(query, /0\.60 as commission_rate/);
  assert.equal((query.match(/\?/g) || []).length, values.length);
  assert.equal(values[4], '74');
});

test('web and mobile resolve rates identically to the backend', () => {
  for (const filename of ['../../web-app/src/utils/commissionPolicy.js', '../../mobile-app/src/utils/commissionPolicy.js']) {
    const source = fs.readFileSync(path.join(__dirname, filename), 'utf8').replace(/export /g, '');
    const context = vm.createContext({});
    vm.runInContext(source, context);
    for (const value of [null, '', 0, '0.45', 0.60, 1, -1, 60]) {
      assert.equal(context.resolveCommissionRate(value), resolveCommissionRate(value));
    }
  }
});

test('agreed shares support 0/100, 50/50, 70/30 and 100/0 without exceeding the pool', () => {
  for (const price of [1000, 1234.57, 0.01]) {
    for (const split of [0, 30, 50, 70, 100]) {
      const appt = { price, artist_id: 73, secondary_artist_id: 74, commission_split: split };
      const primary = artistCommission(appt, 73);
      const secondary = artistCommission(appt, 74);
      assert.equal(Math.round((primary.artistShare + secondary.artistShare) * 100), Math.round(price * 0.60 * 100));
      assert.equal(primary.splitPercent + secondary.splitPercent, 100);
      assert.equal(primary.studioShare, secondary.studioShare);
    }
  }
  assert.equal(artistCommission({ price: 1000, artist_id: 73 }, 73).artistShare, 600);
  assert.equal(artistCommission({ price: 1000, artist_id: 73, secondary_artist_id: 73 }, 73).artistShare, 600);
  assert.equal(artistCommission({ price: 1000, artist_id: 73 }, 99).artistShare, 0);
});

test('split validation accepts endpoints and rejects invalid/unbounded inputs', () => {
  for (const value of [0, '0', 50, '100']) assert.equal(normalizeCommissionSplit(value), Number(value));
  for (const value of [undefined, null, '']) assert.equal(normalizeCommissionSplit(value), 50);
  for (const value of [-1, 101, 'bad', '40abc', 3.5, true, []]) assert.throws(() => normalizeCommissionSplit(value));
});

test('new booking saves do not replace an agreed zero share with 50', () => {
  assert.doesNotMatch(serverSource, /commissionSplit \|\| 50/);
  assert.match(serverSource, /commissionSplit = normalizeCommissionSplit\(commissionSplit\)/);
});

test('completing a session does not create a fake pending payout record', () => {
  assert.doesNotMatch(serverSource, /INSERT INTO payouts[\s\S]{0,300}System Default[\s\S]{0,100}Pending/);
  assert.match(serverSource, /Completing a session does not imply that money was received/);
  assert.doesNotMatch(serverSource, /Automatically create a manual invoice for Admin Billing/);
});

test('invalid requested agreement is rejected before creating any booking', async () => {
  const handler = route('post', '/api/admin/appointments', { query() { throw new Error('Database must not be called'); } });
  let code, result;
  await handler({ body: { commissionSplit: 101 } }, {
    status(value) { code = value; return this; }, json(value) { result = value; },
  });
  assert.equal(code, 400);
  assert.equal(result.success, false);
});

test('web/mobile share math matches backend for solo, referral and collaborations', () => {
  for (const filename of ['../../web-app/src/utils/commissionPolicy.js', '../../mobile-app/src/utils/commissionPolicy.js']) {
    const source = fs.readFileSync(path.join(__dirname, filename), 'utf8').replace(/export /g, '');
    const context = vm.createContext({});
    vm.runInContext(source, context);
    for (const split of [0, 50, 70, 100]) {
      for (const artistId of [73, 74]) {
        const appt = { price: 1000, artist_id: 73, secondary_artist_id: 74, commission_split: split, is_referral: 1 };
        assert.equal(context.artistCommission(appt, artistId).artistShare, artistCommission(appt, artistId).artistShare);
      }
    }
  }
});
