// create-superadmin.js
import bcrypt from 'bcrypt';
import pool from './db.js'; 

const superadminEmail = 'daewis123@gmail.com'; 
const plainPassword = 'daewis123'; 

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
      [superadminEmail, hashedPassword, 'superadmin', 'Initial', 'SuperAdmin'] 
    );

    console.log('Superadmin created successfully.');
  } catch (err) {
    console.error('Error creating superadmin:', err);
  } finally {
    if (client) {
      client.release(); 
    }
  }
}

createSuperadmin();