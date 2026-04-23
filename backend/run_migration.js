require('dotenv').config();
const mysql = require('mysql2');
const db = mysql.createPool({
  host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
  user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
  password: process.env.MYSQLPASSWORD || process.env.DB_PASS || 'banana',
  database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'inkvistar',
  port: process.env.MYSQLPORT ? Number(process.env.MYSQLPORT) : (process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306),
});
db.query("ALTER TABLE users ADD COLUMN account_status ENUM('active', 'deactivated', 'banned') DEFAULT 'active', ADD COLUMN status_reason TEXT NULL, ADD COLUMN appeal_status ENUM('none', 'pending', 'accepted', 'denied') DEFAULT 'none', ADD COLUMN appeal_message TEXT NULL", (err) => {
  if(err && err.code !== 'ER_DUP_FIELDNAME') console.error(err);
  else {
    db.query("UPDATE users SET account_status = 'deactivated' WHERE is_deleted = 1", (err2) => {
      if(err2) console.error(err2);
      else console.log('Migration successful');
      process.exit();
    });
  }
});
