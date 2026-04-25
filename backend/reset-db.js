const mysql = require('mysql2');
require('dotenv').config();

// MySQL Connection Configuration (mirrored from server.js)
const dbConfig = {
  host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
  user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
  password: process.env.MYSQLPASSWORD || process.env.DB_PASS || 'banana',
  database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'inkvistar',
  port: process.env.MYSQLPORT ? Number(process.env.MYSQLPORT) : (process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306),
  connectionLimit: 1, // Only need one connection for this script
  waitForConnections: true,
  queueLimit: 0
};

console.log('--- DATABASE RESET UTILITY ---');
console.log(`Target Database: ${dbConfig.database} at ${dbConfig.host}`);
console.log('-------------------------------\n');

const connection = mysql.createConnection({
  host: dbConfig.host,
  user: dbConfig.user,
  password: dbConfig.password,
  database: dbConfig.database,
  port: dbConfig.port
});

connection.connect((err) => {
  if (err) {
    console.error('[ERROR] Failed to connect to database:', err.message);
    process.exit(1);
  }
  
  console.log('[OK] Connected to MySQL.');
  
  // 1. Disable Foreign Key Checks
  console.log('[STEP] Disabling foreign key checks...');
  connection.query('SET FOREIGN_KEY_CHECKS = 0;', (err) => {
    if (err) {
      console.error('[ERROR] Error disabling constraints:', err.message);
      connection.end();
      process.exit(1);
    }
    
    // 2. Fetch all table names
    console.log('[STEP] Fetching all tables...');
    connection.query('SHOW TABLES', (err, results) => {
      if (err) {
        console.error('[ERROR] Error fetching tables:', err.message);
        connection.end();
        process.exit(1);
      }
      
      const tables = results.map(row => Object.values(row)[0]);
      console.log(`[INFO] Found ${tables.length} tables to clear.`);
      
      if (tables.length === 0) {
        console.log('[INFO] No tables found! Database is already empty.');
        finish();
        return;
      }
      
      // 3. Truncate each table
      let completed = 0;
      tables.forEach(table => {
        console.log(`[CLEAR] Clearing table: ${table}...`);
        connection.query(`TRUNCATE TABLE \`${table}\``, (err) => {
          if (err) {
            console.error(`[ERROR] Failed to clear table ${table}:`, err.message);
          }
          
          completed++;
          if (completed === tables.length) {
            console.log('\n[OK] All tables cleared successfully.');
            finish();
          }
        });
      });
    });
  });
});

function finish() {
  // 4. Re-enable Foreign Key Checks
  console.log('[STEP] Re-enabling foreign key checks...');
  connection.query('SET FOREIGN_KEY_CHECKS = 1;', (err) => {
    if (err) {
      console.error('[ERROR] Error re-enabling constraints:', err.message);
    } else {
      console.log('[OK] Constraints re-enabled.');
    }
    
    console.log('\n[DONE] Database reset complete!');
    console.log('[INFO] Restart your backend server to recreate default users.');
    connection.end();
  });
}
