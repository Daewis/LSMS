// routes/superadmin.js
import express from 'express';
import bcrypt from 'bcrypt';
import pool from '../db.js';

const router = express.Router();

// Middleware to check if the current user is a Superadmin
function isSuperadmin(req, res, next) {
    if (req.session?.user?.role === 'superadmin') {
        next(); // User is a superadmin, proceed
    } else {
        res.status(403).json({ success: false, message: 'Access denied: Superadmin privileges required.' });
    }
}

// Superadmin registers a new Admin
router.post('/register-admin', isSuperadmin, async (req, res) => {
    const { email, password, first_name, last_name, role = 'admin' } = req.body; // Default role to 'admin'

    // Basic validation
    if (!email || !password || !first_name || !last_name) {
        return res.status(400).json({ success: false, message: 'Email, password, first name, and last name are required.' });
    }
    // Optional: Validate 'role' if superadmin can register other superadmins
    if (!['admin', 'superadmin'].includes(role)) {
         return res.status(400).json({ success: false, message: 'Invalid role specified for new admin.' });
    }


    let client;
    try {
        client = await pool.connect();

        // Check for existing admin email
        const existingAdmin = await client.query('SELECT * FROM admins WHERE email = $1', [email]);
        if (existingAdmin.rows.length > 0) {
            return res.status(409).json({ success: false, message: 'Admin with this email already exists.' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new admin into the 'admins' table
        await client.query(
            'INSERT INTO admins (email, password_hash, first_name, last_name, role) VALUES ($1, $2, $3, $4, $5)',
            [email, hashedPassword, first_name, last_name, role]
        );

        res.status(201).json({ success: true, message: 'Admin registered successfully.' });

    } catch (err) {
        console.error('Error registering admin:', err);
        res.status(500).json({ success: false, message: 'Internal server error during admin registration.' });
    } finally {
        if (client) {
            client.release();
        }
    }
});


// Superadmin can view all admins (optional)
router.get('/list-admins', isSuperadmin, async (req, res) => {
    let client;
    try {
        client = await pool.connect();
        const result = await client.query('SELECT admin_id, email, first_name, last_name, role, created_at FROM admins ORDER BY created_at DESC');
        res.json({ success: true, admins: result.rows });
    } catch (err) {
        console.error('Error fetching admins list:', err);
        res.status(500).json({ success: false, message: 'Internal server error fetching admin list.' });
    } finally {
        if (client) {
            client.release();
        }
    }
});


export default router;