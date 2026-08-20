const APP_ENV = String(process.env.APP_ENV || process.env.NODE_ENV || 'development').toLowerCase();
const IS_PRODUCTION = APP_ENV === 'production';

const envFlag = (name) => String(process.env[name] || '').toLowerCase() === 'true';

const BOOTSTRAP_ADMIN_ENABLED = envFlag('BOOTSTRAP_ADMIN');
const DEMO_ACCOUNTS_ENABLED = envFlag('SEED_DEMO_ACCOUNTS');
const DEBUG_ROUTES_ENABLED = !IS_PRODUCTION && envFlag('ENABLE_DEBUG_ROUTES');
const CAPTCHA_BYPASS_ENABLED = !IS_PRODUCTION && envFlag('CAPTCHA_BYPASS');

const databaseConfig = {
  host: process.env.MYSQLHOST || process.env.DB_HOST || (IS_PRODUCTION ? '' : 'localhost'),
  user: process.env.MYSQLUSER || process.env.DB_USER || (IS_PRODUCTION ? '' : 'root'),
  password: process.env.MYSQLPASSWORD || process.env.DB_PASS || '',
  database: process.env.MYSQLDATABASE || process.env.DB_NAME || (IS_PRODUCTION ? '' : 'inkvistar'),
  port: Number(process.env.MYSQLPORT || process.env.DB_PORT || 3306),
};

function validateRuntimeConfiguration() {
  if (IS_PRODUCTION) {
    const missingDatabaseValues = Object.entries({
      host: databaseConfig.host,
      user: databaseConfig.user,
      password: databaseConfig.password,
      database: databaseConfig.database,
    })
      .filter(([, value]) => !value)
      .map(([key]) => key);

    if (missingDatabaseValues.length > 0) {
      throw new Error(`Missing required production database configuration: ${missingDatabaseValues.join(', ')}`);
    }

    if (!process.env.RECAPTCHA_SECRET_KEY) {
      throw new Error('RECAPTCHA_SECRET_KEY is required in production.');
    }

    if (process.env.PAYMONGO_SECRET_KEY && !process.env.PAYMONGO_WEBHOOK_SECRET) {
      throw new Error('PAYMONGO_WEBHOOK_SECRET is required in production when PayMongo is enabled.');
    }
  }

  if (!Number.isInteger(databaseConfig.port) || databaseConfig.port < 1 || databaseConfig.port > 65535) {
    throw new Error('Database port must be a valid integer between 1 and 65535.');
  }

  if (DEMO_ACCOUNTS_ENABLED && !['development', 'staging', 'test'].includes(APP_ENV)) {
    throw new Error('SEED_DEMO_ACCOUNTS may only be enabled in development, staging, or test.');
  }

  if (DEMO_ACCOUNTS_ENABLED && !process.env.DEMO_ACCOUNT_PASSWORD) {
    throw new Error('DEMO_ACCOUNT_PASSWORD is required when SEED_DEMO_ACCOUNTS is enabled.');
  }

  if (BOOTSTRAP_ADMIN_ENABLED) {
    const requiredBootstrapValues = [
      'BOOTSTRAP_ADMIN_NAME',
      'BOOTSTRAP_ADMIN_EMAIL',
      'BOOTSTRAP_ADMIN_PASSWORD',
    ];
    const missingBootstrapValues = requiredBootstrapValues.filter((name) => !process.env[name]);

    if (missingBootstrapValues.length > 0) {
      throw new Error(`BOOTSTRAP_ADMIN is enabled but these variables are missing: ${missingBootstrapValues.join(', ')}`);
    }

    const email = String(process.env.BOOTSTRAP_ADMIN_EMAIL).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('BOOTSTRAP_ADMIN_EMAIL must be a valid email address.');
    }

    const password = String(process.env.BOOTSTRAP_ADMIN_PASSWORD);
    if (password.length < 12) {
      throw new Error('BOOTSTRAP_ADMIN_PASSWORD must contain at least 12 characters.');
    }
  }
}

validateRuntimeConfiguration();

module.exports = {
  APP_ENV,
  IS_PRODUCTION,
  BOOTSTRAP_ADMIN_ENABLED,
  DEMO_ACCOUNTS_ENABLED,
  DEBUG_ROUTES_ENABLED,
  CAPTCHA_BYPASS_ENABLED,
  databaseConfig,
};
