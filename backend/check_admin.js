require('dotenv').config();
const mysql = require('mysql2');
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT),
  ssl: { rejectUnauthorized: false }
});

// Check ALL recent notifications
db.query('SELECT id, user_id, title, message, type, related_id, created_at FROM notifications ORDER BY created_at DESC LIMIT 30', (e, r) => {
  if (e) { console.log('Error:', e.message); return; }
  console.log('Last 30 notifications:');
  r.forEach(n => console.log(`  ID:${n.id} UserID:${n.user_id} Title:"${n.title}" RelID:${n.related_id} Type:${n.type} At:${n.created_at}`));
  
  // Check which user_id got payment notifications
  db.query('SELECT id, user_id, title, message, type, related_id FROM notifications WHERE title LIKE ? OR title LIKE ? ORDER BY created_at DESC LIMIT 20', ['%Payment%', '%Appointment Scheduled%'], (e2, r2) => {
    if (e2) { console.log('Error:', e2.message); return; }
    console.log('\nPayment/Scheduled notifications:');
    if (!r2 || r2.length === 0) console.log('  NONE FOUND!');
    else r2.forEach(n => console.log(`  ID:${n.id} UserID:${n.user_id} Title:"${n.title}" Msg:"${n.message.substring(0,60)}..." RelID:${n.related_id}`));
    process.exit(0);
  });
});
