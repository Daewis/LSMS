
// This is a corrected example of a user registration route using ESM syntax.
// It assumes you have already imported express, a PostgreSQL pool, and other necessary libraries.
import express from 'express';
import pool from '../db.js';
import multer from 'multer';
import bcrypt from 'bcrypt';           
import { getWeekNumber } from '../dateUtils.js'; // Assuming this utility is available
import { createNotification } from '../utils/notifications.js';


const router = express.Router();


// Configure Multer to store files in memory as a Buffer for ALL routes
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

/**
 * Middleware to check if the user is authenticated.
 * It checks for a 'user' object in the session.
 * If a user is not found, it sends a 401 Unauthorized response.
 */
const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) { // Check req.session exists and contains user data
        next();
    } else {
        res.status(401).json({ message: 'Unauthorized. Please log in.' });
    }
};



async function sendNotificationToAdmin(action, userId, data) {
  try {
    // Get all admins/superadmins
    const adminResult = await pool.query(
      `SELECT admin_id FROM admins WHERE role IN ('admin', 'superadmin')`
    );
    if (adminResult.rows.length === 0) {
      console.warn('No admin users found to notify');
      return;
    }

    // Get the user (sender)
    const userResult = await pool.query(
      `SELECT first_name, last_name FROM users WHERE user_id = $1`,
      [userId]
    );
    if (userResult.rows.length === 0) return;

    const user = userResult.rows[0];
    const userName = `${user.first_name} ${user.last_name}`;

    // Build message/section/entityId
    let message = '';
    let section = '';
    let entityId = null;

    switch (action) {
      case 'complaint_submitted':
        message = `${userName} submitted a new complaint: "${data.subject}"`;
        section = 'complaints';
        entityId = data.complaintId || null;
        break;
      case 'leave_request_submitted':
        message = `${userName} submitted a leave request for ${data.leaveType}`;
        section = 'leave-requests';
        entityId = data.leaveId || null;
        break;
      case 'project_uploaded':
        message = `${userName} uploaded a new project: "${data.projectName}"`;
        section = 'projects';
        entityId = data.projectId || null;
        break;
      case 'logbook_submitted':
        message = `${userName} submitted a logbook report (${data.weekRange})`;
        section = 'logbook';
        entityId = data.reportId || null;
        break;
      default:
        message = `${userName} performed an action requiring attention`;
        section = 'dashboard';
    }

    // Loop through all admins and notify each
    for (const admin of adminResult.rows) {
    await createNotification({
      recipientId: admin.admin_id,
      recipientRole: 'admin',
      senderId: userId,
      message,
      section,
      entityId,
      link: `/Admin_dashboard.html#${section}?id=${entityId || ''}`
    });
    }

    console.log(`✅ Notification sent to ${adminResult.rows.length} admin(s)`);
  } catch (error) {
    console.error('Error sending notification to admin:', error);
  }
}





router.get('/intern-info', isAuthenticated, async (req, res) => {
    const userId = req.session.user?.user_id;

    if (!userId) {
        return res.status(401).json({ message: 'Unauthorized. User ID not found in session.' });
    }

    let client;
    try {
        client = await pool.connect();
        const result = await client.query(
            `SELECT user_id, first_name, last_name, middle_name, email,
                    user_image_data, user_image_mime_type
             FROM users
             WHERE user_id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const userData = result.rows[0];

        // Build inline base64 Data URL if image exists
        let profileImageUrl = null;
        if (userData.user_image_data) {
            const base64 = userData.user_image_data.toString('base64');
            profileImageUrl = `data:${userData.user_image_mime_type};base64,${base64}`;
        }

        res.json({
            success: true,
            user_id: userData.user_id,
            first_name: userData.first_name,
            middle_name: userData.middle_name,
            last_name: userData.last_name,
            email: userData.email,
            profile_image_url: profileImageUrl // 👈 frontend will use this everywhere
        });

    } catch (error) {
        console.error('Error fetching intern info:', error);
        res.status(500).json({ message: 'Server error fetching intern info.' });
    } finally {
        if (client) client.release();
    }
});

// --- Endpoint to handle the weekly report submission ---

router.post('/submit-logbook-report', upload.single('fileAttachment'), async (req, res) => {
    const client = await pool.connect();
    try {
        const { weekDate, weekRange, reports } = req.body;
        const userId = req.session.user?.user_id;
        const submittedAt = new Date();

        if (!userId || !weekDate || !weekRange || !reports) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }
        
        // --- NEW: Time-based submission validation ---
        const now = new Date();
        const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
        const currentHour = now.getHours();
        
        if (dayOfWeek === 1 && currentHour >= 9) {
            return res.status(403).json({ success: false, message: 'Reports can only be submitted before 9:00 AM on Monday.' });
        }
        // --- END OF NEW VALIDATION ---
        
        // Parse reports safely (ensure it's JSON)
        let parsedReports;
        try {
            parsedReports = JSON.parse(reports);
        } catch (err) {
            return res.status(400).json({ success: false, message: 'Invalid reports JSON format' });
        }

        // Extract file info (if uploaded)
        const file = req.file;
        const fileData = file ? file.buffer : null;
        const fileName = file ? file.originalname : null;
        const fileSize = file ? file.size : null;
        const fileMime = file ? file.mimetype : null;

        // Prevent duplicate submissions for same week
        const weekNumber = new Date(weekDate).getWeek?.() || null; // fallback if needed
        const yearNumber = new Date(weekDate).getFullYear();

        const duplicateCheck = await client.query(
            `SELECT 1 
             FROM logbook_reports
             WHERE user_id = $1
             AND EXTRACT(WEEK FROM week_date) = EXTRACT(WEEK FROM $2::DATE)
             AND EXTRACT(YEAR FROM week_date) = EXTRACT(YEAR FROM $2::DATE)`,
            [userId, weekDate]
        );

        if (duplicateCheck.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'You have already submitted a report for this week.'
            });
        }

        // Insert into DB
        await client.query(
            `INSERT INTO logbook_reports 
             (user_id, week_date, week_range, reports, 
              file_attachment_data, file_attachment_original_name, 
              file_attachment_size, file_attachment_mime_type, submitted_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
                userId,
                weekDate,
                weekRange,
                parsedReports,
                fileData,
                fileName,
                fileSize,
                fileMime,
                submittedAt
            ]
        );

        res.json({ success: true, message: 'Logbook report submitted successfully' });
    } catch (error) {
        console.error('Error submitting logbook report:', error);
        res.status(500).json({ success: false, message: 'Server error. Please try again.' });
    } finally {
        client.release();
    }
});


router.post('/submit-complaint-suggestion', isAuthenticated, upload.none(), async (req, res) => {
    // Get all fields from the request body
    const { 
        subject, 
        message, 
        incidentDateTime, 
        incidentLocation, 
        complaintDetails 
    } = req.body;

    const participantsString = req.body.participants || null;
    const userId = req.session.user?.user_id;

    // --- REVISED BACKEND VALIDATION ---
    // The submission is valid if a userId exists AND at least one form section is filled out.
    const isSuggestionProvided = subject?.trim() !== '' && message?.trim() !== '';
    const isComplaintProvided = incidentDateTime?.trim() !== '' || incidentLocation?.trim() !== '' || complaintDetails?.trim() !== '' || participantsString !== null;

    if (!userId || (!isSuggestionProvided && !isComplaintProvided)) {
        return res.status(400).json({ message: 'Missing required information. Please provide either a suggestion or fill out the complaint details.' });
    }
    // --- END OF REVISED BACKEND VALIDATION ---

    const submittedAt = new Date();

    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN');

        const insertQuery = `
            INSERT INTO complaints_suggestions (user_id, subject, message, incident_date_time, incident_location, complaint_details, participants, submitted_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
            RETURNING *;
        `;
        const values = [
            userId,
            subject || null,
            message || null,
            incidentDateTime || null,
            incidentLocation || null,
            complaintDetails || null,
            participantsString,
            submittedAt
        ];

        const complaintResult = await client.query(insertQuery, values);
       
        await sendNotificationToAdmin('complaint_submitted', req.session.user.user_id, {
            subject: subject || 'Complaint Submitted'
        });

        await client.query('COMMIT');
        res.status(200).json({
            message: 'Complaint/Suggestion submitted successfully!',
            complaint: complaintResult.rows[0]
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Database error during complaint/suggestion submission:', error);
        res.status(500).json({ message: 'Failed to submit complaint/suggestion due to an internal server error.' });
    } finally {
        if (client) client.release();
    }
});

// --- Intern route: Get all complaints submitted by the logged-in intern ---
router.get('/complaints', isAuthenticated, async (req, res) => {
  const userId = req.session.user?.user_id;
  if (!userId) {
    return res.status(401).json({ message: 'User not authenticated.' });
  }

  try {
    const result = await pool.query(
      `SELECT 
          complaints_id,
          subject,
          message,
          complaint_details,
          incident_date_time,
          incident_location,
          participants,
          submitted_at,
          status,
          response,
          reviewed_at,
          reviewed_by
       FROM complaints_suggestions
       WHERE user_id = $1
       ORDER BY submitted_at DESC;`,
      [userId]
    );

    res.json({ complaints: result.rows });
  } catch (err) {
    console.error('Error fetching user complaints:', err);
    res.status(500).json({ message: 'Failed to fetch your complaints.' });
  }
});

/**
 * PUT /users/update-profile
 * Body: { user_id, first_name, middle_name?, last_name }
 */
router.put('/update-profile', isAuthenticated, async (req, res) => {
  const { user_id, first_name, middle_name, last_name } = req.body;

  // 1. Verify session user matches the requested user_id
  const sessionUserId = req.session.user?.user_id;
  if (!sessionUserId || sessionUserId !== user_id) {
    return res.status(401).json({ success: false, message: 'Unauthorized.' });
  }

  // 2. Validate input
  if (!first_name || !last_name) {
    return res.status(400).json({
      success: false,
      message: 'First name and last name are required.',
    });
  }

  let client;
  try {
    client = await pool.connect();

    const updateQuery = `
      UPDATE users
      SET first_name = $1,
          middle_name = $2,
          last_name = $3
      WHERE user_id = $4
      RETURNING user_id, first_name, middle_name, last_name, email;
    `;
    const values = [first_name.trim(), middle_name?.trim() || null, last_name.trim(), user_id];

    const result = await client.query(updateQuery, values);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found or no changes made.',
      });
    }

    // Update the session so UI reflects changes immediately
    req.session.user = {
      ...req.session.user,
      first_name: result.rows[0].first_name,
      middle_name: result.rows[0].middle_name,
      last_name: result.rows[0].last_name,
    };

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully!',
      user: result.rows[0],
    });
  } catch (error) {
    console.error('Database error updating profile:', error);
    res
      .status(500)
      .json({ success: false, message: 'Failed to update profile due to a server error.' });
  } finally {
    if (client) client.release();
  }
});



// --- API to update user email ---
router.put('/update-email', isAuthenticated, async (req, res) => {
    const { new_email, current_password } = req.body;
    const userId = req.session.user?.user_id;

    if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized. User ID not found in session.' });
    }
    if (!new_email || !current_password) {
        return res.status(400).json({ success: false, message: 'New email and current password are required.' });
    }
    // Basic email format validation
    if (!/\S+@\S+\.\S+/.test(new_email)) {
        return res.status(400).json({ success: false, message: 'Invalid email format.' });
    }

    let client;
    try {
        client = await pool.connect();
        
        // 1. Verify current password
        const userQuery = 'SELECT password FROM users WHERE user_id = $1;';
        const userResult = await client.query(userQuery, [userId]);

        if (userResult.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const storedHashedPassword = userResult.rows[0].password;
        const passwordMatch = await bcrypt.compare(current_password, storedHashedPassword);

        if (!passwordMatch) {
            return res.status(401).json({ success: false, message: 'Incorrect current password.' });
        }

        // 2. Check if the new email is already in use by another user
        const existingEmailQuery = 'SELECT user_id FROM users WHERE email = $1 AND user_id != $2;';
        const existingEmailResult = await client.query(existingEmailQuery, [new_email, userId]);
        if (existingEmailResult.rowCount > 0) {
            return res.status(409).json({ success: false, message: 'This email is already registered to another account.' });
        }

        // 3. Update email
        const updateQuery = `
            UPDATE users
            SET email = $1
            WHERE user_id = $2
            RETURNING user_id, first_name, middle_name, last_name, email;
        `;
        const values = [new_email, userId];
        const result = await client.query(updateQuery, values);

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'User not found or email is already the same.' });
        }

        // Update the session with the new email
        req.session.user = {
            ...req.session.user,
            email: result.rows[0].email
        };

        res.status(200).json({ success: true, message: 'Email updated successfully!', user: result.rows[0] });
    } catch (error) {
        console.error('Database error updating email:', error);
        res.status(500).json({ success: false, message: 'Failed to update email due to a server error.' });
    } finally {
        if (client) client.release();
    }
});

// --- API to update user password ---
router.put('/update-password', isAuthenticated, async (req, res) => {
    const { current_password, new_password, confirm_new_password } = req.body;
    const userId = req.session.user?.user_id;

    if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized. User ID not found in session.' });
    }
    if (!current_password || !new_password || !confirm_new_password) {
        return res.status(400).json({ success: false, message: 'All password fields are required.' });
    }
    if (new_password.length < 6) {
        return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
    }
    if (new_password !== confirm_new_password) {
        return res.status(400).json({ success: false, message: 'New password and confirmation do not match.' });
    }
    if (current_password === new_password) {
        return res.status(400).json({ success: false, message: 'New password cannot be the same as the current password.' });
    }

    let client;
    try {
        client = await pool.connect();
        
        // 1. Verify current password
        const userQuery = 'SELECT password FROM users WHERE user_id = $1;';
        const userResult = await client.query(userQuery, [userId]);

        if (userResult.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const storedHashedPassword = userResult.rows[0].password;
        const passwordMatch = await bcrypt.compare(current_password, storedHashedPassword);

        if (!passwordMatch) {
            return res.status(401).json({ success: false, message: 'Incorrect current password.' });
        }

        // 2. Hash the new password
        const hashedNewPassword = await bcrypt.hash(new_password, 10);

        // 3. Update password
        const updateQuery = `
            UPDATE users
            SET password = $1
            WHERE user_id = $2;
        `;
        const values = [hashedNewPassword, userId];
        const result = await client.query(updateQuery, values);

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'User not found or password is already the same.' });
        }

        res.status(200).json({ success: true, message: 'Password updated successfully!' });
    } catch (error) {
        console.error('Database error updating password:', error);
        res.status(500).json({ success: false, message: 'Failed to update password due to a server error.' });
    } finally {
        if (client) client.release();
    }
});


// --- NEW: Endpoint to receive project files ---
// This endpoint uses 'upload.single' to handle one file at a time.
// If you need to handle multiple files in a single request, consider 'upload.array' or 'upload.fields'.
router.post('/upload-project-file', isAuthenticated, upload.single('projectFile'), async (req, res) => {
    const file = req.file;
    const { projectName, description } = req.body; // Project metadata from the form
    const userId = req.session.user?.user_id;

    // 1. Validate User and File
    if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized. User ID not found in session.' });
    }
    if (!file) {
        return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }
    if (!projectName) {
        return res.status(400).json({ success: false, message: 'Project name is required.' });
    }

    // Extract file details from the in-memory buffer
    const projectFileData = file.buffer; // The actual binary data (BYTEA)
    const originalName = file.originalname;
    const fileSize = file.size; // in bytes
    const mimeType = file.mimetype;

  
    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN');
        const insertQuery = `
            INSERT INTO user_projects (user_id, project_name, description, project_file_data, original_file_name, file_size, project_file_mime_type)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, user_id, project_name, description, original_file_name, file_size, project_file_mime_type, uploaded_at;
        `;
        const values = [userId, projectName, description || null, projectFileData, originalName, fileSize, mimeType];
        
        const result = await client.query(insertQuery, values);
        
        // Add this check to prevent the TypeError
        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(500).json({ success: false, message: 'Failed to insert project into the database.' });
        }
        
       // const newProjectId = result.rows[0].id;

        // Send notification to admin
        await sendNotificationToAdmin('project_uploaded', req.session.user.user_id, {
            projectName: req.body.projectName
        });
        
        await client.query('COMMIT');
        res.status(201).json({ success: true, message: 'Project file uploaded successfully!', project: result.rows[0] });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Database error during project file upload:', error);
        res.status(500).json({ success: false, message: 'Failed to upload project file due to a server error.' });
    } finally {
        if (client) client.release();
    }
});



// --- NEW: Endpoint to fetch a list of projects/files for the authenticated user ---
router.get('/get-uploaded-projects', isAuthenticated,  async (req, res) => {
    const userId = req.session.user?.user_id;

    if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized. User ID not found in session.' });
    }

    let client;
    try {
        client = await pool.connect();
        // Select all relevant metadata, but NOT the project_file_data (BYTEA)
        const query = `
            SELECT id, project_name, description, original_file_name, file_size, project_file_mime_type, uploaded_at
            FROM user_projects
            WHERE user_id = $1
            ORDER BY uploaded_at DESC;
        `;
        const result = await client.query(query, [userId]);

        res.status(200).json({ success: true, projects: result.rows });

    } catch (error) {
        console.error('Database error fetching uploaded projects:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch uploaded projects due to a server error.' });
    } finally {
        if (client) client.release();
    }
});

// --- NEW: Endpoint to delete a specific project file ---
router.delete('/delete-project-file/:fileId', isAuthenticated, async (req, res) => {
    const fileId = req.params.fileId;
    const userId = req.session.user?.user_id;

    // 1. Validate User and Project ID
    if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized. User ID not found in session.' });
    }
    if (!fileId) {
        return res.status(400).json({ success: false, message: 'Project ID is required for deletion.' });
    }

    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN'); // Start a transaction for atomicity

        // Delete the record from the database.
        // Crucially, verify ownership (user_id) to prevent unauthorized deletions.
        const deleteDbQuery = `
            DELETE FROM user_projects
            WHERE id = $1 AND user_id = $2
            RETURNING id; -- Return the ID of the deleted row to confirm deletion
        `;
        const result = await client.query(deleteDbQuery, [fileId, userId]);

        if (result.rowCount === 0) {
            await client.query('ROLLBACK'); // No row deleted, so rollback
            return res.status(404).json({ success: false, message: 'Project not found or you do not have permission to delete it.' });
        }

        await client.query('COMMIT'); // Commit the transaction
        res.status(200).json({ success: true, message: 'Project deleted successfully!' });

    } catch (error) {
        if (client) { await client.query('ROLLBACK'); } // Rollback on any error
        console.error('Error deleting project:', error);
        res.status(500).json({ success: false, message: 'Failed to delete project due to a server error.' });
    } finally {
        if (client) client.release();
    }
});


router.post('/submit-leave-request', isAuthenticated, upload.single('attachment'), async (req, res) => {
    const userId = req.session.user?.user_id;
    const { leaveType, startDate, endDate, reason } = req.body;
    const requestedAt = new Date().toISOString();
    const file = req.file;

    // --- VALIDATIONS ---
    if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized. User ID not found in session.' });
    }
    if (!leaveType || !startDate || !endDate || !reason) {
        return res.status(400).json({ success: false, message: 'Missing required fields for leave request.' });
    }
    if (new Date(startDate) > new Date(endDate)) {
        return res.status(400).json({ success: false, message: 'Start Date cannot be after End Date.' });
    }

    let attachmentFileName = null;
    let attachmentMimeType = null;
    let attachmentSize = null;
    let attachmentData = null;

    if (file) {
        attachmentFileName = file.originalname;
        attachmentMimeType = file.mimetype;
        attachmentSize = file.size;
        attachmentData = file.buffer; // store as BYTEA
    }

    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN');

        const queryText = `
            INSERT INTO leave_requests (
                user_id, leave_type, start_date, end_date, reason, requested_at,
                attachment_file_name, attachment_mime_type, attachment_size, attachment_data
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING permission_id, user_id, leave_type, start_date, end_date, reason,
                      requested_at, attachment_file_name, attachment_mime_type, attachment_size;
        `;
        const values = [
            userId, leaveType, startDate, endDate, reason, requestedAt,
            attachmentFileName, attachmentMimeType, attachmentSize, attachmentData
        ];

        const result = await client.query(queryText, values);
        const leaveRequest = result.rows[0];

       // console.log(`Leave request ${leaveRequest.permission_id} submitted by ${userId}. Attachment: ${attachmentFileName || 'None'}`);

        await sendNotificationToAdmin('leave_request_submitted', req.session.user.user_id, {
            leaveType: req.body.leaveType
        });

        await client.query('COMMIT');
        res.status(201).json({
            success: true,
            message: 'Leave request submitted successfully!',
            leaveRequest
        });

    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error('Error submitting leave request:', error.stack);
        if (error.code === '23503') {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        res.status(500).json({ success: false, message: 'Failed to submit leave request.', error: error.message });
    } finally {
        if (client) client.release();
    }
});


router.get('/dashboard/summary', isAuthenticated, async (req, res) => {
  const userId = req.query.userId;
  if (!userId) {
    return res.status(400).json({ success: false, message: 'User ID is required.' });
  }

  try {
    // Run counts in parallel
    const [counts, activities] = await Promise.all([

      // Combined counts query
      pool.query(
        `
        SELECT 
          (SELECT COUNT(*) FROM logbook_reports WHERE user_id = $1) AS total_reports,
          (SELECT COUNT(*) FROM leave_requests WHERE user_id = $1 AND status = 'Pending') AS pending_leave,
          (SELECT COUNT(*) FROM user_projects WHERE user_id = $1) AS projects_uploaded;
        `,
        [userId]
      ),

      // Combined activities query (latest 5 from all 3 tables)
      pool.query(
        `
        SELECT 'report' AS type, submitted_at AS timestamp,
               'Submitted weekly report for ' || week_range AS description
        FROM logbook_reports
        WHERE user_id = $1
        
        UNION ALL
        
        SELECT 'leave' AS type, requested_at AS timestamp,
               'Your ' || leave_type || ' leave request for ' || start_date || ' - ' || end_date || ' is ' || status AS description
        FROM leave_requests
        WHERE user_id = $1
        
        UNION ALL
        
        SELECT 'project' AS type, uploaded_at AS timestamp,
               'Uploaded "' || project_name || '"' AS description
        FROM user_projects
        WHERE user_id = $1
        
        ORDER BY timestamp DESC
        LIMIT 5;
        `,
        [userId]
      )
    ]);

    // Extract counts
    const stats = counts.rows[0];

    res.json({
      success: true,
      stats: {
        total_reports: parseInt(stats.total_reports, 10),
        pending_leave: parseInt(stats.pending_leave, 10),
        projects_uploaded: parseInt(stats.projects_uploaded, 10),
      },
      activities: activities.rows
    });

  } catch (error) {
    console.error('Error fetching dashboard summary:', error.stack);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard summary.' });
  }
});

   


/// Get profile picture
router.get("/profile-picture/:id", async (req, res) => {
  try {
    let userId = req.params.id;

    // If "me" is requested, use the logged-in session user
    if (userId === "me") {
      if (!req.session.user || !req.session.user.user_id) {
        return res.status(401).json({ success: false, message: "Not logged in" });
      }
      userId = req.session.user.user_id;
    }

    // Fetch image (example: from DB or file system)
    const result = await pool.query("SELECT user_image_data FROM users WHERE user_id = $1", [userId]);
    if (!result.rows.length || !result.rows[0].user_image_data) {
      return res.status(404).json({ success: false, message: "No profile picture found" });
    }

    const imageBuffer = result.rows[0].user_image_data;
    res.set("Content-Type", "image/png"); // or jpeg if you store jpg
    res.send(imageBuffer);

  } catch (err) {
    console.error("Profile picture fetch error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


// Upload profile picture
router.post("/upload-profile-picture", upload.single("profileImage"), async (req, res) => {
  try {
    if (!req.session.user || !req.session.user.user_id) {
      return res.status(401).json({ success: false, message: "Not logged in" });
    }

    const userId = req.session.user.user_id;
    await pool.query("UPDATE users SET user_image_data = $1 WHERE user_id = $2", [req.file.buffer, userId]);

    res.json({ success: true, userId });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Remove profile picture
router.delete("/remove-profile-picture", async (req, res) => {
  try {
    if (!req.session.user || !req.session.user.user_id) {
      return res.status(401).json({ success: false, message: "Not logged in" });
    }

    const userId = req.session.user.user_id;
    await pool.query("UPDATE users SET user_image_data = NULL WHERE user_id = $1", [userId]);

    res.json({ success: true, userId });
  } catch (err) {
    console.error("Remove error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});



// /users/notifications
router.get('/notifications', isAuthenticated, async (req, res) => {
  const userId = req.session.user?.user_id;
  if (!userId) {
    return res.status(400).json({ message: 'User not logged in.' });
  }

  try {
    const result = await pool.query(
      `SELECT n.notification_id,
              n.message,
              n.link,
              n.is_read,
              n.created_at,
              n.sender_id,
              n.section,
              n.entity_id,
              m.id AS message_id,
              m.title,
              m.body,
              m.file_url
       FROM notifications n
       LEFT JOIN messages m
         ON n.section = 'messages'
        AND n.entity_id = m.id
       WHERE n.recipient_id = $1
         AND n.recipient_role = 'user'
       ORDER BY n.created_at DESC
       LIMIT 20`,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching user notifications:', err);
    res.status(500).json({ message: 'Failed to fetch notifications.' });
  }
});


// MARK USER NOTIFICATION AS READ
router.put('/notifications/:id/read', isAuthenticated, async (req, res) => {
  const notificationId = req.params.id;
  const userId = req.session.user?.user_id;

  if (!userId) {
    return res.status(400).json({ message: 'User ID not found in session.' });
  }

  try {
    const result = await pool.query(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE notification_id = $1
         AND recipient_id = $2
         AND recipient_role = 'user'
       RETURNING notification_id, is_read`,
      [notificationId, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Notification not found or not authorized.' });
    }

    res.json({ message: 'Notification marked as read.', notification: result.rows[0] });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Failed to mark notification as read.' });
  }
});

// MARK ALL USER NOTIFICATIONS AS READ
router.put('/notifications/mark-all-read', isAuthenticated, async (req, res) => {
  const userId = req.session.user?.user_id;

  if (!userId) {
    return res.status(400).json({ message: 'User ID not found in session.' });
  }

  try {
    await pool.query(
      `UPDATE notifications
       SET is_read = true
       WHERE recipient_id = $1
         AND recipient_role = 'user'
         AND is_read = false`,
      [userId]
    );

    res.json({ 
      success: true, 
      message: 'All notifications marked as read successfully.' 
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Failed to mark notifications as read.' });
  }
});

// --- SEND NOTIFICATION TO ADMIN (Keep this one) ---
router.post('/send-admin-notification', isAuthenticated, async (req, res) => {
    const userId = req.session.user?.user_id;
    const { action, data } = req.body;
    
    if (!userId) {
        return res.status(400).json({ message: 'User ID not found in session.' });
    }
    
    try {
        await sendNotificationToAdmin(action, userId, data);
        res.json({ success: true, message: 'Notification sent to admin.' });
    } catch (error) {
        console.error('Error sending notification to admin:', error);
        res.status(500).json({ success: false, message: 'Failed to send notification.' });
    }
});

// --- FETCH FULL MESSAGE DETAILS ---
router.get('/messages/:id', isAuthenticated, async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            `SELECT id, title, body, file_url, created_by, created_at
             FROM messages
             WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Message not found.' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching message:', error);
        res.status(500).json({ message: 'Failed to fetch message.' });
    }
});


// --- ROUTE 2: VIEW MY LEAVE REQUESTS (FOR USERS) ---
// Allows a user to view their own submitted leave requests.
router.get('/my-leave-requests', isAuthenticated, async (req, res) => {
    const userId = req.session.user?.user_id;
    if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized. User ID not found.' });
    }

    try {
        const result = await pool.query(`
            SELECT permission_id, leave_type, start_date, end_date, reason, requested_at, status,
                   rejection_reason, reviewed_at, attachment_file_name
            FROM leave_requests
            WHERE user_id = $1
            ORDER BY requested_at DESC
        `, [userId]);

        res.json({ success: true, leaveRequests: result.rows });
    } catch (error) {
        console.error('Error fetching user leave requests:', error.stack);
        res.status(500).json({ success: false, message: 'Failed to fetch your leave requests.' });
    }
});






export default router;
