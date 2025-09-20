import express from 'express';
import pool from '../db.js';
import bcrypt from 'bcrypt';
import multer from 'multer';
import { sendNewRegistrationNotification } from './pending_approval.js';


const router = express.Router();

// --- Multer Configuration for File Uploads ---
// Change storage to memoryStorage to get file buffer directly
const upload = multer({ storage: multer.memoryStorage() });



// Update the notifyAdminsOfNewRegistration function in your auth.js
async function notifyAdminsOfNewRegistration(userData, client) {
    try {
        // Get all admin email addresses
        const admins = await client.query("SELECT email FROM admins WHERE role IN ('admin', 'superadmin')");
        const adminEmails = admins.rows.map(admin => admin.email);
        
        if (adminEmails.length > 0) {
            // Send email notifications to all admins
            await sendNewRegistrationNotification(adminEmails, userData);
        }
        
        console.log(`[REGISTRATION] Notified ${adminEmails.length} admins of new user: ${userData.name}`);
    } catch (error) {
        console.error('Error sending admin notifications:', error);
    }
}



// Helper function to send in-app notifications to admins
async function notifyAdminsOfNewRegistrationInApp(userData, client) {
    try {
        // Fetch admin user IDs
        const admins = await client.query("SELECT admin_id FROM admins WHERE role IN ('admin', 'superadmin')");
        const notificationPromises = admins.rows.map(admin => {
            return client.query(
   `INSERT INTO notifications (recipient_id, recipient_role, sender_id, message, link, is_read, created_at)
   VALUES ($1, $2, $3, $4, $5, FALSE, NOW())`,
  [
    admin.admin_id,      // recipient_id for admin
    'admin',             // recipient_role
    userData.user_id,    // sender is new user
    `New user registered: ${userData.name}`,
    `/admin_dashboard.html#user-details?id=${userData.user_id}`
  ]
);

        });
        await Promise.all(notificationPromises);
        console.log(`[REGISTRATION] In-app notification created for ${admins.rows.length} admins for new user: ${userData.name}`);
    } catch (error) {
        console.error('Error sending registration in-app notifications to admins:', error);
    }
}


/*
await client.query("SELECT admin_id FROM admins WHERE role IN ('admin', 'superadmin')");
        const notificationPromises = admins.rows.map(admin => {
            return client.query(
    `INSERT INTO notifications (user_id, admin_id, sender_id, message, link, is_read, created_at) 
     VALUES ($1, $2, $3, $4, $5, FALSE, NOW())`,
    [
        admin.admin_id,       // user_id column should get admin's ID (you referenced admin_id)
        admin.admin_id,       // admin_id column (if needed)
        userData.user_id,     // sender_id is new user's id
        `New user registered: ${userData.name}`,
        `/admin_dashboard.html#user-details?id=${userData.user_id}`
    ]
);
**/

// POST route for user registration with multiple file uploads.
// `upload.fields` is used to handle multiple file fields from the form.
// UPDATED: POST route for user registration with approval system
router.post('/register', upload.fields([
    { name: 'user_image', maxCount: 1 },
    { name: 'acceptance_letter', maxCount: 1 }
]), async (req, res) => {
    // Destructure all fields from the request body.
    const {
        first_name, middle_name, last_name, matric_number, institution,
        phone_number, email_address, password, confirm_password
    } = req.body;

    // Get the file objects from the multer-processed request object.
    const userImageFile = req.files && req.files['user_image'] ? req.files['user_image'][0] : null;
    const acceptanceLetterFile = req.files && req.files['acceptance_letter'] ? req.files['acceptance_letter'][0] : null;

    // Initialize variables for binary data and mime types
    let userImageData = null;
    let userImageMimeType = null;
    let acceptanceLetterData = null;
    let acceptanceLetterMimeType = null;

    // Process user image if uploaded
    if (userImageFile) {
        userImageData = userImageFile.buffer;
        userImageMimeType = userImageFile.mimetype;
    }

    // Process acceptance letter if uploaded
    if (acceptanceLetterFile) {
        acceptanceLetterData = acceptanceLetterFile.buffer;
        acceptanceLetterMimeType = acceptanceLetterFile.mimetype;
    }
    
    // --- Server-side Validation ---
    if (!first_name || !last_name || !matric_number || !institution || !phone_number || !email_address || !password || !confirm_password) {
        return res.status(400).json({ success: false, message: 'All required fields must be filled.' });
    }
    if (password !== confirm_password) {
        return res.status(400).json({ success: false, message: 'Passwords do not match!' });
    }
    if (password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password should be at least 6 characters.' });
    }

    let client;
    try {
        // Hash the password for security.
        const hashedPassword = await bcrypt.hash(password, 10);
        client = await pool.connect();
        await client.query('BEGIN'); // Start a transaction for atomicity.

        // Check if a user with the same email or matric number already exists.
        const existingUser = await client.query(
            'SELECT matric_number FROM users WHERE email = $1 OR matric_number = $2',
            [email_address, matric_number]
        );

        if (existingUser.rows.length > 0) {
            await client.query('ROLLBACK'); // Rollback the transaction if the user exists.
            return res.status(409).json({ success: false, message: 'Email or Matric Number already registered.' });
        }

        // UPDATED: SQL query to insert a new user with approval fields
        const result = await client.query(
            `INSERT INTO users (
                first_name, middle_name, last_name, matric_number, institution,
                phone_number, email, password,
                user_image_data, user_image_mime_type,
                acceptance_letter_data, acceptance_letter_mime_type,
                is_approved, approval_status, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, FALSE, 'pending', NOW())
            RETURNING user_id`,
            [
                first_name,
                middle_name,
                last_name,
                matric_number,
                institution,
                phone_number,
                email_address,
                hashedPassword,
                userImageData,        // Storing the binary data (Buffer)
                userImageMimeType,    // Storing the MIME type
                acceptanceLetterData, // Storing the binary data (Buffer)
                acceptanceLetterMimeType // Storing the MIME type
            ]
        );

        const newUserId = result.rows[0].user_id;

        // Send notification to admins about new registration
        await notifyAdminsOfNewRegistration({
            user_id: newUserId,
            name: `${first_name} ${last_name}`,
            email: email_address
        }, client);

        // Send in-app notification to admins about new registration
        
        await notifyAdminsOfNewRegistrationInApp({
            user_id: newUserId,
            name: `${first_name} ${last_name}`
        }, client);

        await client.query('COMMIT'); // Commit the transaction on success.
        console.log(`[REGISTRATION] New user registered successfully: ${email_address} (Pending Approval)`);
        
        // UPDATED: New success message indicating approval requirement
        res.status(201).json({ 
            success: true, 
            message: 'Registration successful! Your account is pending admin approval. You will be notified via email once approved.' 
        });

    } catch (error) {
        if (client) { await client.query('ROLLBACK'); } // Rollback on any error.
        console.error('Registration error:', error);
        res.status(500).json({ success: false, message: 'Internal server error during registration.' });
    } finally {
        if (client) { client.release(); } // Always release the client connection.
    }
});


// UPDATED: POST /login - Modified to check approval status
router.post('/login', async (req, res) => {
    const { email, passwords } = req.body;

    if (!email || !passwords) {
        return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    let client;
    try {
        client = await pool.connect();
        let authenticatedUser = null;
        let userRole = null;
        let userId = null;

        // Try to authenticate as Admin/SuperAdmin (Admins are always approved)
        const adminQuery = await client.query(
            'SELECT admin_id, email, password, role, first_name, last_name FROM admins WHERE email = $1',
            [email]
        );

        if (adminQuery.rows.length > 0) {
            const admin = adminQuery.rows[0];
            if (admin.password && admin.password.startsWith('$2b$')) {
                const match = await bcrypt.compare(passwords, admin.password);
                if (match) {
                    authenticatedUser = admin;
                    userRole = admin.role;
                    userId = admin.admin_id; // Use admin_id directly
                }
            } else {
                return res.status(403).json({ success: false, message: 'Admin password hash is invalid. Contact support.' });
            }
        }

        // Try to authenticate as Intern if not found in Admins
        if (!authenticatedUser) {
            // UPDATED: Added approval status checks to the SELECT clause
            const internQuery = await client.query(
                `SELECT user_id, matric_number, email, password, first_name, last_name, middle_name, 
                        is_approved, approval_status 
                 FROM users WHERE email = $1`,
                [email]
            );

            if (internQuery.rows.length > 0) {
                const intern = internQuery.rows[0];
                if (intern.password && intern.password.startsWith('$2b$')) {
                    const match = await bcrypt.compare(passwords, intern.password);
                    if (match) {
                        // UPDATED: Check approval status before allowing login
                        if (!intern.is_approved || intern.approval_status !== 'approved') {
                            return res.status(403).json({ 
                                success: false, 
                                message: 'Your account is pending admin approval. Please wait for approval before logging in.',
                                status: 'pending_approval'
                            });
                        }
                        
                        // User is approved, proceed with login
                        authenticatedUser = intern;
                        userRole = 'intern';
                        userId = intern.user_id; // Use user_id directly
                    }
                } else {
                    return res.status(403).json({ success: false, message: 'Intern password hash is invalid. Contact support.' });
                }
            }
        }

        if (!authenticatedUser) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        // Store session on the server-side
        req.session.user = {
            user_id: userId, // This will be admin_id for admins, user_id for interns
            email: authenticatedUser.email,
            role: userRole,
            first_name: authenticatedUser.first_name,
            last_name: authenticatedUser.last_name,
            middle_name: authenticatedUser.middle_name,
        };

        console.log(`[LOGIN] ${userRole.toUpperCase()} Email: ${email} UserID: ${userId} logged in.`);
        res.status(200).json({
            success: true,
            message: 'Login successful!',
            user_id: userId, // Include user_id in the response for frontend
            email: authenticatedUser.email,
            role: userRole,
            first_name: authenticatedUser.first_name,
            middle_name: authenticatedUser.middle_name,
            last_name: authenticatedUser.last_name
        });

    } catch (err) {
        console.error('[LOGIN ERROR]', err);
        res.status(500).json({ success: false, message: 'Internal server error during login.' });
    } finally {
        if (client) client.release();
    }
});

// POST /logout - Destroys session and clears cookie
router.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('[LOGOUT ERROR]', err);
            return res.status(500).json({ success: false, message: 'Logout failed.' });
        }
        res.clearCookie('connect.sid');
        res.json({ success: true, message: 'Logged out successfully.' });
    });
});

// GET /role - Fetch user session role info
router.get('/role', (req, res) => {
    if (req.session.user) {
        const { email, role, first_name, middle_name, last_name } = req.session.user;
        res.json({ success: true, email, role, first_name, middle_name, last_name });
    } else {
        res.status(401).json({ success: false, message: 'Not authenticated.', role: null });
    }
});

export default router;
