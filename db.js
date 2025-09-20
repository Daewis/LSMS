// db.js
import pg from 'pg';
const { Pool } = pg;


const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'LASUED SIWES MANAGEMENT SYSTEM', // Double-check this exact name matches your PostgreSQL DB
    password: 'Abokunwa20',
    port: 5432,
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