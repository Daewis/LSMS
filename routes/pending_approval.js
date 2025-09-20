import express from 'express';
import pool from '../db.js'; // Ensure db.js exports pool using ES Module syntax (e.g., export default pool;)
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';
import 'dotenv/config';

const router = express.Router();
// Reuse your existing transporter configuration
const transporter = nodemailer.createTransport({
    secure: true,
    host: 'smtp.gmail.com',
    port: 465,
    auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS, 
    },
});

// Email service function for user approval notifications
async function sendApprovalNotification(userEmail, userName, approved, rejectionReason = null) {
    try {
        let subject, htmlMessage;
        
        if (approved) {
            subject = 'Account Approved - Welcome!';
            htmlMessage = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background-color: #10B981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                        <h1 style="margin: 0; font-size: 24px;">Account Approved!</h1>
                    </div>
                    <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
                        <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Hello ${userName},</p>
                        
                        <p style="font-size: 16px; color: #333; line-height: 1.6;">
                            Great news! Your account has been approved and you can now access the system.
                        </p>
                        
                        <div style="background-color: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #10B981;">
                            <p style="margin: 0; color: #333;">
                                <strong>What's next?</strong><br>
                                You can now log in using your registered email and password to access all features.
                            </p>
                        </div>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${process.env.FRONTEND_URL || 'http://localhost:4000'}/sign_in.html" 
                               style="background-color: #10B981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                                Log In Now
                            </a>
                        </div>
                        
                        <p style="font-size: 14px; color: #666; margin-top: 30px;">
                            Best regards,<br>
                            <strong>The Admin Team</strong>
                        </p>
                    </div>
                </div>
            `;
        } else {
            subject = 'Account Registration Update';
            htmlMessage = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background-color: #EF4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                        <h1 style="margin: 0; font-size: 24px;">Registration Update</h1>
                    </div>
                    <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
                        <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Hello ${userName},</p>
                        
                        <p style="font-size: 16px; color: #333; line-height: 1.6;">
                            We regret to inform you that your account registration could not be approved at this time.
                        </p>
                        
                        ${rejectionReason ? `
                            <div style="background-color: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #EF4444;">
                                <p style="margin: 0; color: #333;">
                                    <strong>Reason:</strong><br>
                                    ${rejectionReason}
                                </p>
                            </div>
                        ` : ''}
                        
                        <div style="background-color: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #F59E0B;">
                            <p style="margin: 0; color: #333;">
                                <strong>Need help?</strong><br>
                                If you believe this is an error or have questions, please contact our support team.
                            </p>
                        </div>
                        
                        <p style="font-size: 14px; color: #666; margin-top: 30px;">
                            Best regards,<br>
                            <strong>The Admin Team</strong>
                        </p>
                    </div>
                </div>
            `;
        }

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: userEmail,
            subject: subject,
            html: htmlMessage,
        });

        console.log(`${approved ? 'Approval' : 'Rejection'} email sent successfully to ${userEmail}`);
        return { success: true };
        
    } catch (error) {
        console.error('Error sending approval notification email:', error);
        throw new Error('Failed to send notification email.');
    }
}

// Function to send admin notification about new registration
async function sendNewRegistrationNotification(adminEmails, userData) {
    try {
        const subject = 'New User Registration Pending Approval';
        const htmlMessage = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background-color: #3B82F6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                    <h1 style="margin: 0; font-size: 24px;">New Registration Alert</h1>
                </div>
                <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
                    <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Hello Admin,</p>
                    
                    <p style="font-size: 16px; color: #333; line-height: 1.6;">
                        A new user has registered and is waiting for approval.
                    </p>
                    
                    <div style="background-color: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #3B82F6;">
                        <p style="margin: 0; color: #333;">
                            <strong>User Details:</strong><br>
                            Name: ${userData.name}<br>
                            Email: ${userData.email}<br>
                            Registration Date: ${new Date().toLocaleString()}
                        </p>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:4000'}/admin_dashboard.html" 
                           style="background-color: #3B82F6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                            Review Registration
                        </a>
                    </div>
                    
                    <p style="font-size: 14px; color: #666; margin-top: 30px;">
                        Please log in to your admin dashboard to approve or reject this registration.
                    </p>
                </div>
            </div>
        `;

        // Send to all admin emails with error handling
        let emailsSent = 0;
        let emailErrors = [];

        for (const adminEmail of adminEmails) {
            try {
                await transporter.sendMail({
                    from: process.env.EMAIL_USER,
                    to: adminEmail,
                    subject: subject,
                    html: htmlMessage,
                });
                emailsSent++;
            } catch (emailError) {
                console.error(`Failed to send email to ${adminEmail}:`, emailError.message);
                emailErrors.push({ email: adminEmail, error: emailError.message });
            }
        }
if (emailsSent > 0) {
            console.log(`New registration notification sent to ${emailsSent}/${adminEmails.length} admin(s)`);
        }
        
        if (emailErrors.length > 0) {
            console.warn(`Failed to send emails to ${emailErrors.length} recipients:`, emailErrors);
        }

        // Return success even if some emails failed, but log the issues
        return { 
            success: true, 
            emailsSent, 
            emailsFailed: emailErrors.length,
            errors: emailErrors 
        };  } catch (error) {
        console.error('Error in sendNewRegistrationNotification:', error);
        // Don't throw error - just log and return failure info
        return { 
            success: false, 
            error: error.message,
            emailsSent: 0,
            emailsFailed: adminEmails.length 
        };
    }
}

export { sendApprovalNotification, sendNewRegistrationNotification };
export default router;