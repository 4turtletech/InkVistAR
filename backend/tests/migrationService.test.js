const assert = require('node:assert/strict');
const test = require('node:test');
const { ensureTableColumns } = require('../services/migrationService');

test('portable column migration checks existing columns before altering a table', async () => {
  const queries = [];
  const pool = {
    promise: () => ({
      async query(sql) {
        queries.push(sql);
        if (sql.startsWith('SHOW COLUMNS')) return [[{ Field: 'existing_column' }]];
        return [{ affectedRows: 1 }];
      },
    }),
  };

  await ensureTableColumns(pool, 'inventory', {
    existing_column: 'VARCHAR(50) NULL',
    new_column: 'INT DEFAULT 0',
  });

  assert.equal(queries.filter((sql) => sql.startsWith('ALTER TABLE')).length, 1);
  assert.ok(queries[1].includes('ADD COLUMN `new_column` INT DEFAULT 0'));
  assert.equal(queries.some((sql) => sql.includes('IF NOT EXISTS')), false);
});

test('portable column migration rejects unsafe identifiers', async () => {
  await assert.rejects(
    ensureTableColumns({ promise: () => ({}) }, 'inventory; DROP TABLE users', {}),
    /Invalid migration table name/
  );
});
