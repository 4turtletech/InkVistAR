const mysql = require('mysql2');
require('dotenv').config();

const {
  MYSQLHOST,
  MYSQLPORT,
  MYSQLUSER,
  MYSQLPASSWORD,
  MYSQLDATABASE,
} = process.env;

const db = mysql.createPool({
  host: MYSQLHOST,
  port: MYSQLPORT,
  user: MYSQLUSER,
  password: MYSQLPASSWORD,
  database: MYSQLDATABASE,
  connectionLimit: 5,
  waitForConnections: true,
});

const queryAsync = (sql, params = []) => new Promise((resolve, reject) => {
  db.query(sql, params, (err, results) => {
    if (err) reject(err);
    else resolve(results);
  });
});

async function verifyDefaultArtist() {
  try {
    console.log('[INFO] Connecting to database...');

    // Find the "Default Artist" account
    const [artists] = await queryAsync(
      "SELECT u.id, u.name, u.email, u.is_verified FROM users u WHERE u.name LIKE ? OR u.email LIKE ? LIMIT 1",
      ['%Default Artist%', '%default%artist%']
    );

    if (!artists || artists.length === 0) {
      console.log('[INFO] No "Default Artist" account found. Checking for demo artist...');
      
      const [demoArtists] = await queryAsync(
        "SELECT u.id, u.name, u.email, u.is_verified FROM users u WHERE u.email = ? LIMIT 1",
        ['artist.demo@example.test']
      );

      if (!demoArtists || demoArtists.length === 0) {
        console.log('[ERROR] No default or demo artist found.');
        process.exit(1);
      }

      const artist = demoArtists[0];
      console.log(`[FOUND] Demo artist: ${artist.name} (${artist.email})`);

      if (artist.is_verified) {
        console.log('[OK] Demo artist is already verified.');
        process.exit(0);
      }

      // Verify the demo artist
      const result = await queryAsync(
        "UPDATE users SET is_verified = 1, verification_token = NULL WHERE id = ?",
        [artist.id]
      );

      console.log(`[SUCCESS] Demo artist (ID: ${artist.id}) has been verified.`);
      process.exit(0);
    }

    const artist = artists[0];
    console.log(`[FOUND] Artist account: ${artist.name} (${artist.email}) - Verified: ${artist.is_verified ? 'Yes' : 'No'}`);

    if (artist.is_verified) {
      console.log('[OK] Artist is already verified.');
      process.exit(0);
    }

    // Verify the artist
    const result = await queryAsync(
      "UPDATE users SET is_verified = 1, verification_token = NULL WHERE id = ?",
      [artist.id]
    );

    console.log(`[SUCCESS] Artist (ID: ${artist.id}) "${artist.name}" has been set to verified.`);
    process.exit(0);
  } catch (error) {
    console.error('[ERROR]', error.message);
    process.exit(1);
  } finally {
    db.end();
  }
}

verifyDefaultArtist();

