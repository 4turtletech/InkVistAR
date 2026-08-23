const assert = require('node:assert/strict');
const test = require('node:test');
const {
  createSessionInventoryService,
  getMaterialDisposition,
} = require('../services/sessionInventoryService');

function createFakePool(overrides = {}) {
  const calls = [];
  const lifecycle = { began: 0, committed: 0, rolledBack: 0, released: 0 };
  const appointment = overrides.appointment || {
    id: 42,
    status: 'confirmed',
    service_type: 'Tattoo Session',
    is_deleted: 0,
  };
  const item = overrides.item || {
    id: 5,
    name: 'Gloves',
    current_stock: 10,
    recall_status: 'none',
    is_deleted: 0,
  };

  const connection = {
    async beginTransaction() { lifecycle.began += 1; },
    async commit() { lifecycle.committed += 1; },
    async rollback() { lifecycle.rolledBack += 1; },
    release() { lifecycle.released += 1; },
    async query(sql, params = []) {
      calls.push({ sql, params });
      const normalized = sql.replace(/\s+/g, ' ').trim();

      if (normalized.startsWith('SELECT * FROM appointments')) return [[appointment]];
      if (normalized.startsWith('SELECT * FROM inventory')) return [[item]];
      if (normalized.startsWith('SELECT id FROM inventory')) return [[{ id: item.id }]];
      if (normalized.includes('SELECT inventory_id, default_quantity FROM service_kits')) {
        return [overrides.kitItems || []];
      }
      if (normalized.includes('IFNULL(batch_number')) return [overrides.sameBatchHolds || []];
      if (normalized.startsWith('SELECT * FROM session_materials WHERE id')) {
        return [[overrides.material || { id: 9, appointment_id: 42, inventory_id: 5, quantity: 2, status: 'hold' }]];
      }
      if (normalized.startsWith('SELECT id, inventory_id, quantity FROM session_materials')) {
        return [overrides.holds || []];
      }
      if (normalized.startsWith('SELECT COUNT(*) AS count FROM session_materials')) {
        return [[{ count: overrides.referenceCount || 0 }]];
      }
      return [{ affectedRows: 1, insertId: 1 }];
    },
  };
  const pool = { promise: () => ({ getConnection: async () => connection }) };
  return { service: createSessionInventoryService(pool), calls, lifecycle };
}

test('material disposition returns unopened reservations but consumes prepared supplies', () => {
  assert.equal(getMaterialDisposition('confirmed', 'cancelled'), 'release');
  assert.equal(getMaterialDisposition('in_progress', 'cancelled'), 'consume');
  assert.equal(getMaterialDisposition('in_progress', 'incomplete'), 'consume');
  assert.equal(getMaterialDisposition('in_progress', 'completed'), 'consume');
});

test('adding material uses one dedicated transaction and rejects insufficient stock', async () => {
  const successful = createFakePool();
  await successful.service.addMaterial({ appointmentId: 42, inventoryId: 5, quantity: 2 });
  assert.deepEqual(successful.lifecycle, { began: 1, committed: 1, rolledBack: 0, released: 1 });
  assert.ok(successful.calls.some(({ sql }) => sql.includes('current_stock = current_stock -')));

  const insufficient = createFakePool({ item: { id: 5, name: 'Gloves', current_stock: 1, recall_status: 'none' } });
  await assert.rejects(
    insufficient.service.addMaterial({ appointmentId: 42, inventoryId: 5, quantity: 2 }),
    (error) => error.code === 'insufficient_stock'
  );
  assert.deepEqual(insufficient.lifecycle, { began: 1, committed: 0, rolledBack: 1, released: 1 });
});

test('completing a session consumes remaining materials atomically', async () => {
  const fake = createFakePool({
    appointment: { id: 42, status: 'in_progress', service_type: 'Tattoo Session', is_deleted: 0 },
    holds: [{ id: 1, inventory_id: 5, quantity: 3 }],
  });
  await fake.service.transitionStatus({ appointmentId: 42, status: 'completed' });
  assert.ok(fake.calls.some(({ sql }) => sql.includes("SET status = 'consumed'")));
  assert.ok(fake.calls.some(({ sql }) => sql.includes('INSERT INTO inventory_transactions')));
  assert.equal(fake.calls.some(({ sql }) => sql.includes('current_stock = current_stock +')), false);
  assert.equal(fake.lifecycle.committed, 1);
});

test('starting a session reserves the default studio kit without duplicating existing setup', async () => {
  const freshSetup = createFakePool({
    kitItems: [{ inventory_id: 5, default_quantity: 3 }],
  });
  await freshSetup.service.transitionStatus({ appointmentId: 42, status: 'in_progress' });
  assert.ok(freshSetup.calls.some(({ sql, params }) =>
    sql.includes('current_stock = current_stock -') && params[0] === 3
  ));

  const alreadyPrepared = createFakePool({
    kitItems: [{ inventory_id: 5, default_quantity: 3 }],
    sameBatchHolds: [{ id: 7, quantity: 3 }],
  });
  await alreadyPrepared.service.transitionStatus({ appointmentId: 42, status: 'in_progress' });
  assert.equal(alreadyPrepared.calls.some(({ sql }) => sql.includes('current_stock = current_stock -')), false);
});

test('cancelling after setup consumes supplies while cancelling before setup returns reservations', async () => {
  const prepared = createFakePool({
    appointment: { id: 42, status: 'in_progress', service_type: 'Tattoo Session', is_deleted: 0 },
    holds: [{ id: 1, inventory_id: 5, quantity: 3 }],
  });
  await prepared.service.transitionStatus({ appointmentId: 42, status: 'cancelled' });
  assert.ok(prepared.calls.some(({ sql }) => sql.includes("SET status = 'consumed'")));
  assert.equal(prepared.calls.some(({ sql }) => sql.includes('current_stock = current_stock +')), false);

  const unopened = createFakePool({
    appointment: { id: 42, status: 'confirmed', service_type: 'Piercing', is_deleted: 0 },
    holds: [{ id: 2, inventory_id: 5, quantity: 1 }],
  });
  await unopened.service.transitionStatus({ appointmentId: 42, status: 'cancelled' });
  assert.ok(unopened.calls.some(({ sql }) => sql.includes("SET status = 'released'")));
  assert.ok(unopened.calls.some(({ sql }) => sql.includes('current_stock = current_stock +')));
});

test('a material cannot be released twice', async () => {
  const fake = createFakePool({
    material: { id: 9, appointment_id: 42, inventory_id: 5, quantity: 2, status: 'released' },
  });
  await assert.rejects(
    fake.service.releaseMaterial({ appointmentId: 42, materialId: 9 }),
    (error) => error.code === 'material_already_resolved'
  );
  assert.deepEqual(fake.lifecycle, { began: 1, committed: 0, rolledBack: 1, released: 1 });
});

test('inventory referenced by session history cannot be permanently deleted', async () => {
  const fake = createFakePool({ referenceCount: 2 });
  await assert.rejects(
    fake.service.permanentlyDeleteInventory(5),
    (error) => error.code === 'inventory_has_history'
  );
  assert.equal(fake.calls.some(({ sql }) => sql.startsWith('DELETE FROM inventory')), false);
  assert.equal(fake.lifecycle.rolledBack, 1);
});
