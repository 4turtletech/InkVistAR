const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function run() {
    const db = await mysql.createConnection({
        host: process.env.MYSQLHOST || process.env.DB_HOST,
        user: process.env.MYSQLUSER || process.env.DB_USER,
        password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD,
        database: process.env.MYSQLDATABASE || process.env.DB_NAME,
        port: process.env.MYSQLPORT || process.env.DB_PORT || 3306,
    });

    try {
        const [rows] = await db.query("SELECT * FROM users WHERE email = 'guest@inkvistar.com'");
        if (rows.length === 0) {
            console.log("Creating System Guest user...");
            const hash = await bcrypt.hash('randomguestpass123', 10);
            const [res] = await db.query("INSERT INTO users (name, email, password_hash, user_type, is_verified, is_deleted) VALUES ('System Guest', 'guest@inkvistar.com', ?, 'customer', 1, 0)", [hash]);
            await db.query("INSERT INTO customers (user_id, notes) VALUES (?, 'System account for unauthenticated guest bookings')", [res.insertId]);
            console.log("Success! System Guest created.");
        } else {
            console.log("System Guest already exists.");
        }
    } catch (e) {
        console.error(e);
    } finally {
        await db.end();
    }
}
run();
