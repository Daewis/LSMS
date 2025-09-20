import express from 'express';
import pool from '../db.js'; // Ensure db.js exports pool using ES Module syntax (e.g., export default pool;)
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid'; // Importing uuid for unique ID generation
import 'dotenv/config';

const router = express.Router();

// --- Nodemailer Transporter Setup (for real email sending) ---
// IMPORTANT: Use environment variables for sensitive data like email user and password.
// For Gmail or Google Workspace accounts with 2FA enabled, use an App Password.
const transporter = nodemailer.createTransport({
    secure: true,
    host: 'smtp.gmail.com',
    port: 465,
    auth: {
        
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS, 
    },
});

/*
function sendMail(to,sub,msg){
    transporter.sendMail({
        to: to,
        subject: sub,
        html: msg
    })
    console.log('Email sent');
};

sendMail("davidabokunwa@gmail.com", "This is subject", "This is message")
**/

// Helper function to send email
async function sendPasswordResetEmail(email, resetLink) {
    try {
        await transporter.sendMail({
            // 'from' address MUST match the 'user' in auth or be an alias configured for that account
            from: process.env.EMAIL_USER, 
            to: email,
            subject: 'Password Reset Request',
            html: `<p>Click here to reset your password: <a href="${resetLink}">${resetLink}</a></p><p>This link will expire in 1 hour.</p>`,
        });
        console.log('Password reset email sent successfully to', email);
    } catch (error) {
        console.error('Error sending password reset email:', error);
        throw new Error('Failed to send password reset email.');
    }
}


// --- API Endpoint: Request Password Reset Token ---

router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    let client;

    if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    try {
        client = await pool.connect();

        // 1. Find the user by email - Ensure 'user_id' is indeed the primary key column name in your 'users' table
        const userResult = await client.query('SELECT user_id FROM users WHERE email = $1', [email]);
        
        console.log('User lookup result:', userResult.rows);

        if (userResult.rowCount === 0 || (userResult.rows[0] && !userResult.rows[0].user_id)) {
            console.log('User not found or user_id is null for email:', email);
            return res.status(200).json({ success: true, message: 'If an account with that email exists, a password reset link has been sent.' });
        }

        const userId = userResult.rows[0].user_id; // Using user_id as per your explicit change
        console.log('User ID found:', userId);
        
        const token = uuidv4();
        const expiresAt = new Date(Date.now() + 3600 * 1000); // Token expires in 1 hour

        // 2. Invalidate any existing tokens for this user (optional, but good practice)
        await client.query('UPDATE password_reset_tokens SET used = TRUE WHERE user_id = $1 AND used = FALSE', [userId]);

        // 3. Store the new token in the database
        const insertTokenQuery = `
            INSERT INTO password_reset_tokens (user_id, token, expires_at)
            VALUES ($1, $2, $3)
            RETURNING token;
        `;
        await client.query(insertTokenQuery, [userId, token, expiresAt]);

        // 4. Construct the password reset link
        // In a real app, replace 'http://localhost:4000' with your frontend domain and port
       const resetLink = `http://localhost:4000/forgot_password.html?token=${token}`; 

        // 5. Send the password reset email
        await sendPasswordResetEmail(email, resetLink);

        res.status(200).json({ success: true, message: 'If an account with that email exists, a password reset link has been sent.' });

    } catch (error) {
        console.error('Error in forgot password process:', error);
        res.status(500).json({ success: false, message: 'An internal server error occurred.' });
    } finally {
        if (client) client.release();
    }
});

// --- API Endpoint: Reset Password ---
router.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    let client;

    if (!token || !newPassword) {
        return res.status(400).json({ success: false, message: 'Token and new password are required.' });
    }

    // Basic password strength validation (optional but recommended)
    if (newPassword.length < 8) {
        return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
    }

    try {
        client = await pool.connect();

        // 1. Find and validate the token
        const tokenResult = await client.query(
            'SELECT user_id, expires_at, used FROM password_reset_tokens WHERE token = $1',
            [token]
        );

        if (tokenResult.rowCount === 0) {
            return res.status(400).json({ success: false, message: 'Invalid or expired token.' });
        }

        const { user_id, expires_at, used } = tokenResult.rows[0];

        if (used || new Date() > expires_at) {
            return res.status(400).json({ success: false, message: 'Invalid or expired token.' });
        }

        // 2. Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10); // 10 is the salt rounds

        // 3. Update the user's password
        const updatePasswordQuery = `
            UPDATE users
            SET password = $1
            WHERE user_id = $2;
        `;
        await client.query(updatePasswordQuery, [hashedPassword, user_id]);

        // 4. Mark the token as used
        await client.query('UPDATE password_reset_tokens SET used = TRUE WHERE token = $1', [token]);

        res.status(200).json({ success: true, message: 'Password has been reset successfully!' });

    } catch (error) {
        console.error('Error in reset password process:', error);
        res.status(500).json({ success: false, message: 'An internal server error occurred.' });
    } finally {
        if (client) client.release();
    }
});


export default router;
