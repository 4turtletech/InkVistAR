const fs = require('fs');
const path = require('path');
const mysql = require('mysql2');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = mysql.createPool({
  host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
  user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
  password: process.env.MYSQLPASSWORD || process.env.DB_PASS,
  database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'inkvistar',
  port: process.env.MYSQLPORT ? Number(process.env.MYSQLPORT) : (process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306),
  multipleStatements: true
});

const db = pool.promise();

async function runMigrations() {
  console.log('[MIGRATION] Starting migration runner...');
  try {
    // 1. Ensure schema_migrations table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename VARCHAR(255) PRIMARY KEY,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Fetch executed migrations
    const [rows] = await db.query('SELECT filename FROM schema_migrations');
    const executed = new Set(rows.map(r => r.filename));

    // 3. Read migration directory
    const files = fs.readdirSync(__dirname)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      if (!executed.has(file)) {
        console.log(`[MIGRATION] Executing migration: ${file}`);
        const sqlPath = path.join(__dirname, file);
        const sql = fs.readFileSync(sqlPath, 'utf8');

        if (sql.trim().length > 0) {
          await db.query(sql);
        }
        await db.query('INSERT INTO schema_migrations (filename) VALUES (?)', [file]);
        console.log(`[OK] Migration completed: ${file}`);
      }
    }
    console.log('[MIGRATION] All migrations are up to date.');
  } catch (err) {
    console.error('[ERROR] Migration failed:', err.message);
    process.exit(1);
  } finally {
    pool.end();
  }
}

if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };
