// create-superadmin.js
import bcrypt from 'bcrypt';
import pool from './db.js'; // Adjust path if needed, assuming default export

const superadminEmail = 'daewis123@gmail.com'; // Use email for consistency
const plainPassword = 'daewis123'; // CHANGE THIS SECURELY BEFORE RUNNING!

async function createSuperadmin() {
  let client;
  try {
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    client = await pool.connect();

    const existing = await client.query('SELECT * FROM admins WHERE email = $1', [superadminEmail]);
    if (existing.rows.length > 0) {
      console.log('⚠️ Superadmin with this email already exists.');
      return;
    }

    await client.query(
      'INSERT INTO admins (email, password, role, first_name, last_name) VALUES ($1, $2, $3, $4, $5)',
      [superadminEmail, hashedPassword, 'superadmin', 'Initial', 'SuperAdmin'] // Add dummy names or real ones
    );

    console.log('✅ Superadmin created successfully.');
  } catch (err) {
    console.error('❌ Error creating superadmin:', err);
  } finally {
    if (client) {
      client.release(); // Release client back to pool
    }
    // pool.end(); // DO NOT call pool.end() here if other parts of your app use the pool
  }
}

createSuperadmin();