import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const { Pool } = pg;


const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, 
});

//Testing Connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Database connected successfully (from db.js):', res.rows[0].now);
  }
});


export default pool; 



