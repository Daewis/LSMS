// db.js
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const { Pool } = pg;


const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT, 10),
});

// Optional: Test the connection on file load.
// This is good for debugging but won't block the app from starting.
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Database connected successfully (from db.js):', res.rows[0].now);
  }
});

// CORRECTED EXPORT: Export the 'pool' variable directly as the default.
export default pool; // <--- THIS IS THE ONLY CHANGE NEEDED HERE