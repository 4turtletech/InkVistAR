const bcrypt = require('bcryptjs');
const {
  BOOTSTRAP_ADMIN_ENABLED,
  DEMO_ACCOUNTS_ENABLED,
} = require('../config/runtime');

async function ensureBootstrapColumns(database) {
  const [superAdminColumns] = await database.query("SHOW COLUMNS FROM users LIKE 'is_superadmin'");
  if (superAdminColumns.length === 0) {
    await database.query('ALTER TABLE users ADD COLUMN is_superadmin TINYINT(1) DEFAULT 0');
  }

  const [passwordChangeColumns] = await database.query("SHOW COLUMNS FROM users LIKE 'must_change_password'");
  if (passwordChangeColumns.length === 0) {
    await database.query('ALTER TABLE users ADD COLUMN must_change_password TINYINT(1) DEFAULT 0');
  }
}

async function bootstrapInitialAdmin(database) {
  if (!BOOTSTRAP_ADMIN_ENABLED) return;

  const [existingAdmins] = await database.query(
    "SELECT id FROM users WHERE user_type = 'admin' LIMIT 1"
  );

  if (existingAdmins.length > 0) {
    console.log('[BOOTSTRAP] An administrator already exists; bootstrap skipped. Turn BOOTSTRAP_ADMIN off.');
    return;
  }

  const name = String(process.env.BOOTSTRAP_ADMIN_NAME).trim();
  const email = String(process.env.BOOTSTRAP_ADMIN_EMAIL).trim().toLowerCase();
  const passwordHash = await bcrypt.hash(String(process.env.BOOTSTRAP_ADMIN_PASSWORD), 12);

  await database.query(
    `INSERT INTO users
      (name, email, password_hash, user_type, is_verified, is_deleted, is_superadmin, must_change_password)
     VALUES (?, ?, ?, 'admin', 1, 0, 1, 1)`,
    [name, email, passwordHash]
  );

  console.log('[BOOTSTRAP] Initial administrator created successfully. Turn BOOTSTRAP_ADMIN off and remove its password variable.');
}

async function seedDemoAccounts(database) {
  if (!DEMO_ACCOUNTS_ENABLED) return;

  const passwordHash = await bcrypt.hash(String(process.env.DEMO_ACCOUNT_PASSWORD), 10);
  const demoAccounts = [
    { name: 'Demo Administrator', email: 'admin.demo@example.test', role: 'admin', superAdmin: 1 },
    { name: 'Demo Manager', email: 'manager.demo@example.test', role: 'manager', superAdmin: 0 },
    { name: 'Demo Artist', email: 'artist.demo@example.test', role: 'artist', superAdmin: 0 },
    { name: 'Demo Customer', email: 'customer.demo@example.test', role: 'customer', superAdmin: 0 },
  ];

  for (const account of demoAccounts) {
    const [existing] = await database.query('SELECT id FROM users WHERE email = ? LIMIT 1', [account.email]);
    let userId = existing[0]?.id;

    if (!userId) {
      const [result] = await database.query(
        `INSERT INTO users
          (name, email, password_hash, user_type, is_verified, is_deleted, is_superadmin, must_change_password)
         VALUES (?, ?, ?, ?, 1, 0, ?, 0)`,
        [account.name, account.email, passwordHash, account.role, account.superAdmin]
      );
      userId = result.insertId;
    }

    if (account.role === 'artist') {
      await database.query(
        `INSERT IGNORE INTO artists
          (user_id, studio_name, experience_years, specialization, hourly_rate, commission_rate)
         VALUES (?, 'InkVistAR Demo Studio', 1, 'Demo Artist', 150.00, 0.30)`,
        [userId]
      );
    }

    if (account.role === 'customer') {
      await database.query(
        "INSERT IGNORE INTO customers (user_id, notes) VALUES (?, 'Development or staging demonstration account')",
        [userId]
      );
    }
  }

  console.log('[SEED] Development/staging demonstration accounts are ready.');
}

async function initializeControlledAccounts(pool) {
  const database = pool.promise();
  await ensureBootstrapColumns(database);
  await bootstrapInitialAdmin(database);
  await seedDemoAccounts(database);
}

module.exports = { initializeControlledAccounts };
