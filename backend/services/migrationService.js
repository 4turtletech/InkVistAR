const fs = require('node:fs');
const path = require('node:path');

const IDENTIFIER_PATTERN = /^[A-Za-z][A-Za-z0-9_]*$/;

async function ensureTableColumns(pool, tableName, columns) {
  if (!IDENTIFIER_PATTERN.test(tableName)) throw new Error('Invalid migration table name.');
  for (const [columnName] of Object.entries(columns)) {
    if (!IDENTIFIER_PATTERN.test(columnName)) throw new Error('Invalid migration column name.');
  }

  const database = pool.promise();
  const [rows] = await database.query(`SHOW COLUMNS FROM \`${tableName}\``);
  const existing = new Set(rows.map((row) => String(row.Field || row.field || '').toLowerCase()));

  for (const [columnName, definition] of Object.entries(columns)) {
    if (existing.has(columnName.toLowerCase())) continue;
    await database.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${definition}`);
    existing.add(columnName.toLowerCase());
  }
}

function createMigrationService(pool, migrationFiles) {
  const database = pool.promise();
  let initializationPromise;

  async function initialize() {
    if (initializationPromise) return initializationPromise;
    initializationPromise = (async () => {
      await database.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          migration_name VARCHAR(255) PRIMARY KEY,
          applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);

      for (const file of migrationFiles) {
        const [applied] = await database.query(
          'SELECT migration_name FROM schema_migrations WHERE migration_name = ? LIMIT 1',
          [file]
        );
        if (applied[0]) continue;

        const sql = fs.readFileSync(path.join(__dirname, '..', 'migrations', file), 'utf8');
        const statements = sql.split(/\s*-- migrate:split\s*/).map((value) => value.trim()).filter(Boolean);
        for (const statement of statements) await database.query(statement);
        await database.query('INSERT INTO schema_migrations (migration_name) VALUES (?)', [file]);
      }
    })().catch((error) => {
      initializationPromise = null;
      throw error;
    });
    return initializationPromise;
  }

  return { initialize };
}

module.exports = { createMigrationService, ensureTableColumns };
