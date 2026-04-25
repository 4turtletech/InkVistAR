const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || 'banana',
  database: process.env.DB_NAME || 'inkvistar',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306
});

db.connect(async (err) => {
  if (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  }
  console.log('[OK] Connected to the database...');

  // 1. Setup Password
  const defaultPassword = 'password123';
  const passwordHash = bcrypt.hashSync(defaultPassword, 10);

  // 2. Insert Managers and Artists
  const managers = ['AD', 'Jesa'];
  const artists = ['Troy', 'Lloyd', 'Ken', 'Mar', 'Brian', 'JeaR', 'Lem', 'Renz', 'Carl'];

  let completedUsers = 0;
  const totalUsers = managers.length + artists.length;

  const insertUser = (name, type) => {
    const email = `${name.toLowerCase()}@inkvistar.com`;
    const query = `
      INSERT INTO users (name, email, password_hash, user_type, is_verified) 
      SELECT ?, ?, ?, ?, 1 
      WHERE NOT EXISTS (SELECT 1 FROM users WHERE name = ?)
    `;
    db.query(query, [name, email, passwordHash, type, name], (err) => {
      if (err) console.error(`Error inserting user ${name}:`, err);
      completedUsers++;
      if (completedUsers === totalUsers) {
        console.log(`[OK] ${totalUsers} Users successfully scanned/seeded.`);
        seedInventory();
      }
    });
  };

  managers.forEach(mgr => insertUser(mgr, 'admin'));
  artists.forEach(art => insertUser(art, 'artist'));

  // 3. Create & Seed Inventory System
  function seedInventory() {
    console.log('[STEP] Building Inventory Schema...');
    db.query(`
      CREATE TABLE IF NOT EXISTS inventory_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        quantity INT DEFAULT 0,
        unit VARCHAR(50) DEFAULT 'pcs',
        minimum_stock INT DEFAULT 10,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('Error creating inventory table:', err);
        db.end();
        return;
      }

      const mockItems = [
        // Standard Shop Supplies
        ['Dental Bibs', 'Hygiene & Prep', 500, 'pcs', 100],
        ['Paper Towels', 'Hygiene & Prep', 50, 'rolls', 10],
        ['Green Soap', 'Hygiene & Prep', 5, 'gallons', 2],
        ['Cling Wrap', 'Hygiene & Prep', 20, 'rolls', 5],
        ['Ink Caps (Small)', 'Tattoo Supplies', 1000, 'pcs', 200],
        ['Ink Caps (Medium)', 'Tattoo Supplies', 1000, 'pcs', 200],
        ['Stencil Paper', 'Tattoo Supplies', 500, 'sheets', 50],
        ['A&D Ointment', 'Aftercare', 100, 'sachets', 20],
        ['Nitrile Gloves (S)', 'Hygiene & Prep', 20, 'boxes', 5],
        ['Nitrile Gloves (M)', 'Hygiene & Prep', 30, 'boxes', 10],
        ['Nitrile Gloves (L)', 'Hygiene & Prep', 30, 'boxes', 10],
        
        // Liners & Shaders
        ['5RS Round Shader', 'Needles', 100, 'pcs', 20],
        ['9RS Round Shader', 'Needles', 100, 'pcs', 20],
        ['14RS Round Shader', 'Needles', 100, 'pcs', 20],
        ['3RL Round Liner', 'Needles', 150, 'pcs', 30],
        ['7RL Round Liner', 'Needles', 150, 'pcs', 30],
        ['11RL Round Liner', 'Needles', 100, 'pcs', 20],
        
        // Magnums
        ['7M1 Magnum', 'Needles', 100, 'pcs', 20],
        ['13M1 Magnum', 'Needles', 100, 'pcs', 20],
        ['15M1 Magnum', 'Needles', 100, 'pcs', 20],
        ['7RM Curved Magnum', 'Needles', 100, 'pcs', 20],
        ['9RM Curved Magnum', 'Needles', 100, 'pcs', 20],
        ['15RM Curved Magnum', 'Needles', 100, 'pcs', 20],
        ['27RM Curved Magnum', 'Needles', 50, 'pcs', 10]
      ];

      let completedItems = 0;
      mockItems.forEach(item => {
        db.query(
          `INSERT INTO inventory_items (name, category, quantity, unit, minimum_stock) 
           SELECT ?, ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM inventory_items WHERE name = ?)`,
          [...item, item[0]], 
          (err) => {
            if (err) console.error(`Error inserting item ${item[0]}:`, err);
            completedItems++;
            if (completedItems === mockItems.length) {
              console.log('[OK] Inventory Supplies successfully seeded!');
              console.log('[DONE] Setup Process Complete!');
              process.exit(0);
            }
          }
        );
      });
    });
  }
});
