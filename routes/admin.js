// routes/admin.js
import express from 'express';
import pool from '../db.js';
import multer from 'multer';
import bcrypt from 'bcrypt';

import { createNotification } from '../utils/notifications.js';
import { sendApprovalNotification } from './pending_approval.js';




const router = express.Router();

// Configure Multer to store files in memory as a Buffer for ALL routes
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Middleware to check if user is authenticated (logged in)
function isAuthenticated(req, res, next) {
    if (!req.session?.user) { // Use optional chaining for safety
        return res.status(401).json({ success: false, message: 'Not authenticated.' });
    }
    next();
}

// Middleware to check if user has 'admin' or 'superadmin' role
function isAdminOrSuperadmin(req, res, next) {
    const userRole = req.session?.user?.role;
    if (userRole === 'admin' || userRole === 'superadmin') {
        next(); // User has sufficient privileges
    } else {
        res.status(403).json({ success: false, message: 'Access denied: Admin privileges required.' });
    }
}

function isSuperadmin(req, res, next) {
    if (req.user && req.user.role === 'superadmin') {
        return next();
    }
    return res.status(403).json({
        success: false,
        message: 'Access denied. Only superadmins can perform this action.'
    });
}


// --- GET /admin/view-interns - Fetch paginated intern data ---
router.get('/view-interns', isAuthenticated, isAdminOrSuperadmin, async (req, res) => {
    let client;
    try {
        client = await pool.connect();
        
        // 1. Get pagination parameters from the URL query string
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        // 2. Fetch the paginated data
        const result = await client.query(
            `SELECT
                user_id,
                first_name,
                middle_name,
                last_name,
                matric_number,
                institution,
                phone_number,
                email,
                encode(user_image_data, 'base64') AS user_image_data,
                user_image_mime_type,
                encode(acceptance_letter_data, 'base64') AS acceptance_letter_data,
                acceptance_letter_mime_type
            FROM users
            WHERE role = $1
            ORDER BY user_id
            LIMIT $2 OFFSET $3;`, // Added LIMIT and OFFSET clauses
            ['intern', limit, offset]
        );

        // 3. Get the total count of interns for pagination metadata
        const totalInternsResult = await client.query(
            'SELECT COUNT(*) AS total_count FROM users WHERE role = $1;', 
            ['intern']
        );
        const totalCount = parseInt(totalInternsResult.rows[0].total_count);

        const interns = result.rows.map(intern => {
            const user_image_url = intern.user_image_data && intern.user_image_mime_type
                ? `data:${intern.user_image_mime_type};base64,${intern.user_image_data}`
                : null;
            const acceptance_letter_url = intern.acceptance_letter_data && intern.acceptance_letter_mime_type
                ? `data:${intern.acceptance_letter_mime_type};base64,${intern.acceptance_letter_data}`
                : null;

            return {
                user_id: intern.user_id,
                first_name: intern.first_name,
                middle_name: intern.middle_name,
                last_name: intern.last_name,
                matric_number: intern.matric_number,
                institution: intern.institution,
                phone_number: intern.phone_number,
                email: intern.email,
                user_image_url: user_image_url,
                acceptance_letter_url: acceptance_letter_url,
            };
        });

        // 4. Send the paginated data along with metadata
        res.status(200).json({
            success: true,
            interns: interns,
            total_count: totalCount,
            current_page: page,
            total_pages: Math.ceil(totalCount / limit)
        });

    } catch (err) {
        console.error('[GET /interns ERROR]', err);
        res.status(500).json({ message: 'Internal server error fetching interns.' });
    } finally {
        if (client) client.release();
    }
});



/**
 * @route GET /admin/interns/:id
 * @description Fetches a single intern's details by their user_id from PostgreSQL.
 * @access Admin
 */
router.get('/interns/:id', isAuthenticated, isAdminOrSuperadmin, async (req, res) => {
    const internId = req.params.id;

    try {
        const result = await pool.query(
            `SELECT
                user_id,
                first_name,
                middle_name,
                last_name,
                matric_number,
                institution,
                phone_number,
                email,
                encode(user_image_data, 'base64') AS user_image_data,
                user_image_mime_type,
                encode(acceptance_letter_data, 'base64') AS acceptance_letter_data,
                acceptance_letter_mime_type
            FROM users
            WHERE user_id = $1`,
            [internId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Intern not found.' });
        }

        const intern = result.rows[0];

        const user_image_url = intern.user_image_data && intern.user_image_mime_type
            ? `data:${intern.user_image_mime_type};base64,${intern.user_image_data}`
            : null;
        const acceptance_letter_url = intern.acceptance_letter_data && intern.acceptance_letter_mime_type
            ? `data:${intern.acceptance_letter_mime_type};base64,${intern.acceptance_letter_data}`
            : null;

        const responseIntern = {
            user_id: intern.user_id,
            first_name: intern.first_name,
            middle_name: intern.middle_name,
            last_name: intern.last_name,
            matric_number: intern.matric_number,
            institution: intern.institution,
            phone_number: intern.phone_number,
            email: intern.email,
            user_image_url: user_image_url,
            acceptance_letter_url: acceptance_letter_url,
        };

        res.status(200).json(responseIntern);
    } catch (error) {
        console.error(`Error fetching intern ${internId}:`, error.stack);
        res.status(500).json({ message: 'Error fetching intern details.' });
    }
});


router.put(
  '/interns/:id',
  isAuthenticated,
  isAdminOrSuperadmin,
  upload.fields([
    { name: 'profile_image', maxCount: 1 },
    { name: 'acceptance_letter', maxCount: 1 }
  ]),
  async (req, res) => {
    const internId = req.params.id;
    let {
      first_name, middle_name, last_name, matric_number, institution, phone_number, email,
      new_password, confirm_new_password
    } = req.body;  // Read new password fields from body
    const files = req.files;

    try {
      const existingInternResult = await pool.query('SELECT user_id FROM users WHERE user_id = $1', [internId]);

      if (existingInternResult.rows.length === 0) {
        return res.status(404).json({ message: 'Intern not found.' });
      }

      // Validate passwords if supplied
      if (new_password || confirm_new_password) {
        if (!new_password || !confirm_new_password) {
          return res.status(400).json({ message: 'Both new password fields are required.' });
        }
        if (new_password !== confirm_new_password) {
          return res.status(400).json({ message: 'New passwords do not match.' });
        }
        if (new_password.length < 6) {
          return res.status(400).json({ message: 'New password must be at least 6 characters.' });
        }
      }

      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;

      if (first_name !== undefined) { updateFields.push(`first_name = $${paramIndex++}`); updateValues.push(first_name); }
      if (middle_name !== undefined) { updateFields.push(`middle_name = $${paramIndex++}`); updateValues.push(middle_name); }
      if (last_name !== undefined) { updateFields.push(`last_name = $${paramIndex++}`); updateValues.push(last_name); }
      if (matric_number !== undefined) { updateFields.push(`matric_number = $${paramIndex++}`); updateValues.push(matric_number); }
      if (institution !== undefined) { updateFields.push(`institution = $${paramIndex++}`); updateValues.push(institution); }
      if (phone_number !== undefined) { updateFields.push(`phone_number = $${paramIndex++}`); updateValues.push(phone_number); }
      if (email !== undefined) { updateFields.push(`email = $${paramIndex++}`); updateValues.push(email); }

      // Handle user image data
      if (files && files.profile_image && files.profile_image.length > 0) {
        const imageFile = files.profile_image[0];
        updateFields.push(`user_image_data = $${paramIndex++}`);
        updateValues.push(imageFile.buffer);
        updateFields.push(`user_image_mime_type = $${paramIndex++}`);
        updateValues.push(imageFile.mimetype);
      }

      // Handle acceptance letter data
      if (files && files.acceptance_letter && files.acceptance_letter.length > 0) {
        const letterFile = files.acceptance_letter[0];
        updateFields.push(`acceptance_letter_data = $${paramIndex++}`);
        updateValues.push(letterFile.buffer);
        updateFields.push(`acceptance_letter_mime_type = $${paramIndex++}`);
        updateValues.push(letterFile.mimetype);
      }

      // Handle password hashing if new password provided
      if (new_password) {
        const hashedPassword = await bcrypt.hash(new_password, 10);
        updateFields.push(`password = $${paramIndex++}`);
        updateValues.push(hashedPassword);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({ message: 'No fields provided for update.' });
      }

      updateValues.push(internId);
      const queryText = `UPDATE users SET ${updateFields.join(', ')} WHERE user_id = $${paramIndex} RETURNING user_id`;
      const result = await pool.query(queryText, updateValues);

      res.status(200).json({ message: 'Intern details updated successfully!', updated_user_id: result.rows[0].user_id });

    } catch (error) {
      console.error(`Error updating intern ${internId}:`, error.stack);

      if (error.code === '23505') {
        return res.status(409).json({ message: 'Email address or matriculation number already exists.' });
      }

      res.status(500).json({ message: 'Error updating intern details.', error: error.message });
    }
  }
);



// --- Multer-specific Error Handling Middleware ---
router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ message: `File upload error: ${err.message}` });
    } else if (err) {
        return res.status(400).json({ message: `Error processing files: ${err.message}` });
    }
    next();
});



// Route to get a specific user's image or acceptance letter (from previous turns)
router.get('/images/:matricNumber/:imageType', isAuthenticated, isAdminOrSuperadmin, async (req, res) => {
    const { matricNumber, imageType } = req.params;

    // Validate imageType to prevent SQL injection and ensure it's a valid column
    if (imageType !== 'user_image' && imageType !== 'acceptance_letter') {
        return res.status(400).json({ success: false, message: 'Invalid image type specified.' });
    }

    let client;
    try {
        client = await pool.connect();
        // Query the database for the image data from the 'users' table
        const result = await client.query(
            `SELECT ${imageType} FROM users WHERE matric_number = $1`,
            [matricNumber]
        );

        const imageData = result.rows[0]?.[imageType];

        if (!imageData) {
            return res.status(404).json({ success: false, message: 'Image not found.' });
        }

        // IMPORTANT: Set the Content-Type header
        if (imageType === 'user_image') {
            res.setHeader('Content-Type', 'image/jpeg'); // Adjust if you store PNGs
        } else if (imageType === 'acceptance_letter') {
             res.setHeader('Content-Type', 'application/pdf'); // Or 'image/jpeg' if stored as image
        } else {
             res.setHeader('Content-Type', 'application/octet-stream'); // Generic fallback
        }

        res.send(imageData); // Send the binary data

    } catch (error) {
        console.error(`Error serving ${imageType} for ${matricNumber}:`, error);
        res.status(500).json({ success: false, message: 'Internal server error while retrieving image.' });
    } finally {
        if (client) {
            client.release();
        }
    }
});


// Example: Get attendance records for a specific date (renamed route)
router.get('/attendance-records/:date', isAuthenticated, isAdminOrSuperadmin, async (req, res) => {
    const { date } = req.params; // Expects date in YYYY-MM-DD format

    let client;
    try {
        client = await pool.connect();
        // Assuming 'attendance' and 'users' tables
        const result = await client.query(
            `SELECT a.attendance_id, u.first_name, u.last_name, u.matric_number, a.check_in_time, a.check_out_time
             FROM attendance a
             JOIN users u ON a.user_id = u.id -- Adjust 'user_id' and 'id' as per your schema
             WHERE DATE(a.check_in_time) = $1`, // Assuming check_in_time stores date
            [date]
        );
        res.json({ success: true, attendance: result.rows });
    } catch (err) {
        console.error('Error fetching attendance:', err);
        res.status(500).json({ success: false, message: 'Internal server error fetching attendance.' });
    } finally {
        if (client) {
            client.release();
        }
    }
});



// --- New Route 1: GET /api/admin/interns/:userId/logbooks ---
// Fetches paginated logbook reports for a specific intern, accessible by admin/superadmin
router.get('/interns/:userId/logbooks', isAuthenticated, isAdminOrSuperadmin, async (req, res) => {
    const { userId } = req.params;
    
    // Get page and limit from query parameters, with default values
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const offset = (page - 1) * limit;

    let client;
    try {
        client = await pool.connect();
        
        // Query to get the total count of logbook reports for the intern
        const totalCountResult = await client.query(
            `SELECT COUNT(*) AS total_count FROM logbook_reports WHERE user_id = $1;`,
            [userId]
        );
        const totalCount = parseInt(totalCountResult.rows[0].total_count);

        // Query to fetch paginated logbook reports
        const paginatedResult = await client.query(
            `SELECT
                lr.logbook_id,
                lr.user_id,
                lr.week_date,
                lr.week_range,
                lr.reports,
                lr.file_attachment_original_name AS file_name,
                lr.grade,
                lr.submitted_at,
                u.first_name,
                u.last_name
            FROM logbook_reports lr
            JOIN users u ON lr.user_id = u.user_id
            WHERE lr.user_id = $1
            ORDER BY lr.week_date ASC
            LIMIT $2 OFFSET $3;`,
            [userId, limit, offset]
        );

        // Send back paginated data along with total count and pages
        res.status(200).json({
            success: true,
            logbooks: paginatedResult.rows,
            total_count: totalCount,
            current_page: page,
            total_pages: Math.ceil(totalCount / limit)
        });

    } catch (error) {
        console.error('Error fetching paginated logbook reports:', error);
        res.status(500).json({ success: false, message: 'Server error while fetching logbook reports.' });
    } finally {
        if (client) client.release();
    }
});



// --- Updated Route: PATCH /api/admin/logbooks/:logbookId/grade ---
// Updates the grade for a specific logbook report and sends a notification to the user.

router.patch(
  '/logbooks/:logbookId/grade',
  isAuthenticated,
  isAdminOrSuperadmin,
  async (req, res) => {
    const { logbookId } = req.params;
    const { grade } = req.body; // Expects { "grade": "A+" }
    let client;

    try {
      client = await pool.connect();

      // 1. Validate grade
      if (!grade || typeof grade !== 'string' || grade.trim().length === 0) {
        return res
          .status(400)
          .json({ message: 'Grade is required and must be a non-empty string.' });
      }

      // 2. Fetch logbook details before updating
      const logbookDetailsResult = await client.query(
        `SELECT user_id, submitted_at 
         FROM logbook_reports 
         WHERE logbook_id = $1;`,
        [logbookId]
      );

      if (logbookDetailsResult.rows.length === 0) {
        return res.status(404).json({ message: 'Logbook report not found.' });
      }

      const { user_id: studentUserId, submitted_at } =
        logbookDetailsResult.rows[0];
      const adminId = req.session.user?.user_id; // admin who graded

      // 3. Update logbook with grade
      const updateResult = await client.query(
        `UPDATE logbook_reports
         SET grade = $1, graded_by = $2, graded_at = CURRENT_TIMESTAMP, status = 'graded'
         WHERE logbook_id = $3
         RETURNING logbook_id, grade, graded_at, status;`,
        [grade, adminId, logbookId]
      );

      if (updateResult.rows.length === 0) {
        return res
          .status(404)
          .json({ message: 'Logbook report not found after update attempt.' });
      }

      const updatedReport = updateResult.rows[0];

      // 4. Format notification message
      const formattedSubmittedDate = submitted_at
        ? new Date(submitted_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          })
        : 'an unspecified date';

      const formattedGradeTime = updatedReport.graded_at
        ? new Date(updatedReport.graded_at).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          })
        : '';

      // 5. Send notification to the student
      await createNotification({
        recipientId: studentUserId,
        recipientRole: 'user',
        senderId: adminId,
        message: `Your report from ${formattedSubmittedDate} received a Grade: ${grade}. Time - ${formattedGradeTime}.`,
        section: 'logbook',
        entityId: logbookId
      });

      res.status(200).json({
        message: 'Logbook grade updated and student notified successfully.',
        updatedGrade: updatedReport
      });
    } catch (error) {
      console.error('Error updating logbook grade:', error);
      res
        .status(500)
        .json({ message: 'Server error while updating logbook grade.' });
    } finally {
      if (client) client.release();
    }
  }
);


// --- MARK ADMIN NOTIFICATION AS READ ---
router.put('/notifications/:id/read', isAuthenticated, isAdminOrSuperadmin, async (req, res) => {
  const notificationId = req.params.id;
  const adminId = req.session.user?.user_id; // admin_id stored as user_id in session

  if (!adminId) {
    return res.status(400).json({ message: 'Admin ID not found in session.' });
  }

  let client;
  try {
    client = await pool.connect();
    const result = await client.query(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE notification_id = $1 AND recipient_id = $2 AND recipient_role = 'admin'
       RETURNING notification_id, is_read;`,
      [notificationId, adminId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Notification not found or not authorized for this admin.' });
    }

    res.status(200).json({ message: 'Notification marked as read.', notification: result.rows[0] });
  } catch (error) {
    console.error('Database error marking admin notification as read:', error);
    res.status(500).json({ message: 'Failed to mark admin notification as read.' });
  } finally {
    if (client) client.release();
  }
});

// --- FETCH ADMIN NOTIFICATIONS ---
router.get('/admin-notifications', isAuthenticated, isAdminOrSuperadmin, async (req, res) => {
  const adminId = req.session.user?.user_id;

  if (!adminId) {
    return res.status(400).json({ message: 'Admin ID not found in session.' });
  }

  try {
    const result = await pool.query(
      `SELECT n.notification_id, n.message, n.link, n.is_read, n.created_at,
              u.first_name, u.last_name, u.email
       FROM notifications n
       LEFT JOIN users u ON n.sender_id = u.user_id
       WHERE n.recipient_id = $1 AND n.recipient_role = 'admin'
       ORDER BY n.created_at DESC
       LIMIT 20`,
      [adminId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching admin notifications:', error);
    res.status(500).json({ message: 'Failed to fetch notifications.' });
  }
});


// --- UNIFIED SEND NOTIFICATION ROUTE ---
// Handles both intern → admin and admin → intern (including broadcast)
// --- BROADCAST MESSAGE TO ALL INTERNS ---
router.post('/send-notification', isAuthenticated, isAdminOrSuperadmin, upload.single('file'), async (req, res) => {
    const { action, title, body } = req.body;
    const sender = req.session.user;

    if (action !== 'broadcast_message') {
        return res.status(400).json({ success: false, message: 'Invalid action for this route.' });
    }
    if (!title || !body) {
        return res.status(400).json({ success: false, message: 'Title and body are required.' });
    }

    let client;
    try {
        client = await pool.connect();

        let fileData = null;
        let fileMimeType = null;
        if (req.file) {
            fileData = req.file.buffer;
            fileMimeType = req.file.mimetype;
        }

        // Insert into messages table
        const msgResult = await client.query(
            `INSERT INTO messages (title, body, file_data, file_mime_type, created_by, created_at)
             VALUES ($1, $2, $3, $4, $5, NOW())
             RETURNING id`,
            [title, body, fileData, fileMimeType, sender.user_id]
        );

        const messageId = msgResult.rows[0].id;

        // Fetch all interns
        const interns = await client.query(`SELECT user_id FROM users WHERE role = 'intern'`);

        // Insert notifications for each intern
        for (const intern of interns.rows) {
  await client.query(
    `INSERT INTO notifications (recipient_id, recipient_role, sender_id, message, link, is_read, created_at)
     VALUES ($1, 'user', $2, $3, $4, FALSE, NOW())`,
    [
      intern.user_id,
      sender.user_id,
      `New message: ${title}`,
      `/user_dashboard.html#messages?id=${messageId}`
    ]
  );
}


        res.json({ success: true, message: 'Broadcast message sent to all interns.' });
    } catch (error) {
        console.error('Error broadcasting message:', error);
        res.status(500).json({ success: false, message: 'Failed to send broadcast message.' });
    } finally {
        if (client) client.release();
    }
});


// --- Paginated route for complaints (with review info) ---
router.get('/complaints', isAuthenticated, isAdminOrSuperadmin, async (req, res) => {
  let client;
  try {
    client = await pool.connect();

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const offset = (page - 1) * limit;

    const complaintsResult = await client.query(
      `SELECT 
          c.complaints_id, 
          c.subject, 
          c.submitted_at, 
          c.incident_date_time, 
          c.incident_location,
          c.message,
          c.complaint_details,
          c.status,
          c.response,
          c.reviewed_at,
          c.reviewed_by,
          u.first_name, 
          u.last_name, 
          u.email
       FROM complaints_suggestions c
       JOIN users u ON c.user_id = u.user_id
       ORDER BY c.submitted_at DESC
       LIMIT $1 OFFSET $2;`,
      [limit, offset]
    );

    const totalResult = await client.query(
      'SELECT COUNT(*) AS total_count FROM complaints_suggestions;'
    );
    const totalCount = parseInt(totalResult.rows[0].total_count);

    res.status(200).json({
      complaints: complaintsResult.rows,
      total_count: totalCount,
      current_page: page,
      total_pages: Math.ceil(totalCount / limit),
    });
  } catch (err) {
    console.error('Error fetching paginated complaints:', err);
    res.status(500).json({ message: 'Internal server error fetching complaints.' });
  } finally {
    if (client) client.release();
  }
});



// --- Review a complaint (resolve/dismiss + notify intern) ---
router.patch('/complaints/:id/review', isAuthenticated, isAdminOrSuperadmin, async (req, res) => {
  const { id } = req.params;
  const { status, response } = req.body; // status = 'resolved' | 'dismissed'
  const adminId = req.session.user?.user_id;

  if (!status) {
    return res.status(400).json({ success: false, message: 'Status is required.' });
  }

  let client;
  try {
    client = await pool.connect();

    // 1. Fetch complaint details
    const complaintResult = await client.query(
      `SELECT complaints_id, user_id, subject 
       FROM complaints_suggestions 
       WHERE complaints_id = $1`,
      [id]
    );

    if (complaintResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Complaint not found.' });
    }

    const complaint = complaintResult.rows[0];

    // 2. Update complaint with review info
    const updateResult = await client.query(
      `UPDATE complaints_suggestions
       SET status = $1, response = $2, reviewed_at = NOW(), reviewed_by = $3
       WHERE complaints_id = $4
       RETURNING *;`,
      [status, response || null, adminId, id]
    );

    // 3. Notify the intern
    await createNotification({
      recipientId:  complaint.user_id,
      recipientRole: 'user',
      senderId: adminId,
      message: `Your complaint "${complaint.subject}" has been ${status}.`,
      section: 'complaints',
      entityId: complaint.complaints_id,
    });

    res.json({
      success: true,
      message: `Complaint ${id} reviewed and marked as ${status}.`,
      complaint: updateResult.rows[0],
    });
  } catch (err) {
    console.error('Error reviewing complaint:', err);
    res.status(500).json({ success: false, message: 'Failed to review complaint.' });
  } finally {
    if (client) client.release();
  }
});




// --- SEND MESSAGE (with optional file) ---
router.post('/messages', isAuthenticated, isAdminOrSuperadmin, upload.single('file'), async (req, res) => {
    const { title, body } = req.body;
    const sender = req.session.user;

    if (!title || !body) {
        return res.status(400).json({ success: false, message: 'Title and body are required.' });
    }

    let client;
    try {
        client = await pool.connect();

        let fileData = null;
        let fileMimeType = null;
        if (req.file) {
            fileData = req.file.buffer;
            fileMimeType = req.file.mimetype;
        }

        await client.query(
            `INSERT INTO messages (title, body, file_data, file_mime_type, created_by, created_at)
             VALUES ($1, $2, $3, $4, $5, NOW())`,
            [title, body, fileData, fileMimeType, sender.user_id]
        );

        res.status(201).json({ success: true, message: 'Message sent successfully.' });
    } catch (err) {
        console.error('[POST /messages ERROR]', err);
        res.status(500).json({ success: false, message: 'Internal server error sending message.' });
    } finally {
        if (client) client.release();
    }
});


// --- GET MESSAGES ---
router.get('/messages', isAuthenticated, isAdminOrSuperadmin, async (req, res) => {
    let client;
    try {
        client = await pool.connect();
        const result = await client.query(
            `SELECT id, title, body, 
                    encode(file_data, 'base64') AS file_data, 
                    file_mime_type, 
                    created_at
             FROM messages
             ORDER BY created_at DESC`
        );

        const messages = result.rows.map(msg => {
            let file_url = null;
            if (msg.file_data && msg.file_mime_type) {
                file_url = `data:${msg.file_mime_type};base64,${msg.file_data}`;
            }
            return {
                id: msg.id,
                title: msg.title,
                body: msg.body,
                file_url,
                created_at: msg.created_at
            };
        });
      
        res.json({ success: true, messages });
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    } finally {
        if (client) client.release();
    }
});


// --- FETCH FULL MESSAGE DETAILS ---
router.get('/messages/:id', isAuthenticated, async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            `SELECT id, title, body,
                    encode(file_data, 'base64') AS file_data,
                    file_mime_type,
                    created_by,
                    created_at
             FROM messages
             WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Message not found.' });
        }

        const msg = result.rows[0];
        const file_url = msg.file_data && msg.file_mime_type
            ? `data:${msg.file_mime_type};base64,${msg.file_data}`
            : null;

        res.json({
            id: msg.id,
            title: msg.title,
            body: msg.body,
            file_url,
            created_by: msg.created_by,
            created_at: msg.created_at
        });
    } catch (error) {
        console.error('Error fetching message:', error);
        res.status(500).json({ message: 'Failed to fetch message.' });
    }
});


// --- ROUTE: VIEW ALL LEAVE REQUESTS WITH PAGINATION (ADMIN/SUPERADMIN) ---
router.get('/leave-requests', isAuthenticated, isAdminOrSuperadmin, async (req, res) => {
    let client;
    try {
        client = await pool.connect();

        // Get page and limit from query parameters, with default values
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;
        const offset = (page - 1) * limit;

        // Fetch paginated leave requests
        const leaveRequestsResult = await client.query(`
            SELECT lr.permission_id, lr.user_id, u.first_name, u.last_name, lr.leave_type, lr.start_date, lr.end_date,
                   lr.reason, lr.requested_at, lr.status, lr.reviewed_at, lr.rejection_reason,
                   lr.attachment_file_name, lr.attachment_mime_type, lr.attachment_size
            FROM leave_requests lr
            JOIN users u ON lr.user_id = u.user_id
            ORDER BY lr.requested_at DESC
            LIMIT $1 OFFSET $2;
        `, [limit, offset]);

        // Get total count of all leave requests
        const totalResult = await client.query('SELECT COUNT(*) AS total_count FROM leave_requests;');
        const totalCount = parseInt(totalResult.rows[0].total_count);

        // Send back the paginated data and pagination info
        res.status(200).json({
            success: true,
            leaveRequests: leaveRequestsResult.rows,
            total_count: totalCount,
            current_page: page,
            total_pages: Math.ceil(totalCount / limit)
        });
    } catch (error) {
        console.error('Error fetching paginated leave requests:', error.stack);
        res.status(500).json({ success: false, message: 'Failed to fetch leave requests.' });
    } finally {
        if (client) client.release();
    }
});



// --- ROUTE: UPDATE LEAVE REQUEST STATUS (APPROVE/REJECT) ---
router.post(
  '/update-leave-request-status',
  isAuthenticated,
  isAdminOrSuperadmin,
  async (req, res) => {
    const { permissionId, status, rejectionReason } = req.body;
    const reviewerId = req.session.user?.user_id;
    const reviewedAt = new Date().toISOString();

    if (!permissionId || !status) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: permissionId and status.'
      });
    }

    let client;
    try {
      client = await pool.connect();

      // 1. Update leave request
      const queryText = `
        UPDATE leave_requests
        SET status = $1, reviewed_at = $2, rejection_reason = $3
        WHERE permission_id = $4
        RETURNING *;
      `;
      const values = [status, reviewedAt, rejectionReason || null, permissionId];
      const result = await client.query(queryText, values);

      if (result.rowCount === 0) {
        return res
          .status(404)
          .json({ success: false, message: 'Leave request not found.' });
      }

      const leaveRequest = result.rows[0];

      // 2. Send notification to the intern
      const userId = leaveRequest.user_id;
      let notificationMessage;

      if (status.toLowerCase() === 'approved') {
        notificationMessage = `Your leave request (${leaveRequest.leave_type}) from ${leaveRequest.start_date} to ${leaveRequest.end_date} has been approved.`;
      } else if (status.toLowerCase() === 'rejected') {
        notificationMessage = `Your leave request (${leaveRequest.leave_type}) from ${leaveRequest.start_date} to ${leaveRequest.end_date} was rejected. Reason: ${rejectionReason || 'No reason provided'}`;
      } else {
        notificationMessage = `Your leave request (${leaveRequest.leave_type}) has been updated to status: ${status}.`;
      }

      await createNotification({
        recipientId: userId,
        recipientRole: 'user',
        senderId: adminId,
        message: notificationMessage,
        section: 'leave-requests',
        entityId: permissionId
      });

      // 3. Respond success
      res.json({
        success: true,
        message: `Leave request ${permissionId} updated to ${status}.`
      });
    } catch (error) {
      console.error('Error updating leave request status:', error.stack);
      res.status(500).json({
        success: false,
        message: 'Failed to update leave request status.'
      });
    } finally {
      if (client) client.release();
    }
  }
);

// --- ROUTE: DOWNLOAD LEAVE REQUEST ATTACHMENT ---
router.get('/download-attachment/:permissionId', isAuthenticated, isAdminOrSuperadmin, async (req, res) => {
    const { permissionId } = req.params; // fixed typo

    try {
        const result = await pool.query(
            `SELECT attachment_file_name, attachment_mime_type, attachment_data
             FROM leave_requests WHERE permission_id = $1`,
            [permissionId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Attachment not found.' });
        }

        const { attachment_file_name, attachment_mime_type, attachment_data } = result.rows[0];

        res.setHeader('Content-Type', attachment_mime_type);
        res.setHeader('Content-Disposition', `attachment; filename="${attachment_file_name}"`);
        
        res.send(attachment_data);
    } catch (error) {
        console.error('Error downloading attachment:', error.stack);
        res.status(500).json({ success: false, message: 'Failed to download attachment.' });
    }
});


// backend
router.get("/download-project/:fileId", async (req, res) => {
    const fileId = parseInt(req.params.fileId, 10); // ensure integer

    if (isNaN(fileId)) {
        return res.status(400).json({ success: false, message: "Invalid file ID" });
    }

    const query = "SELECT original_file_name, project_file_mime_type, project_file_data FROM user_projects WHERE id = $1";
    const values = [fileId];

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: "File not found" });
    }

    const file = result.rows[0];
    res.setHeader("Content-Type", file.project_file_mime_type);
    res.setHeader("Content-Disposition", `attachment; filename="${file.original_file_name}"`);
    res.send(file.project_file_data);
    });



// This is the new route you need to add to your backend
router.get('/get-projects', isAuthenticated, isAdminOrSuperadmin, async (req, res) => {
    let client;
    try {
        client = await pool.connect();
        
        // Get page and limit from query parameters, with default values
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        // Fetch paginated projects
        const projectsQuery = `
            SELECT 
                up.id, 
                up.project_name, 
                up.description, 
                up.original_file_name, 
                up.file_size, 
                up.project_file_mime_type, 
                up.uploaded_at,
                u.first_name,
                u.last_name
            FROM user_projects up
            JOIN users u ON up.user_id = u.user_id
            ORDER BY up.uploaded_at DESC
            LIMIT $1 OFFSET $2;
        `;
        const projectsResult = await client.query(projectsQuery, [limit, offset]);
        
        // Get total count of all projects
        const totalCountQuery = 'SELECT COUNT(*) AS total_count FROM user_projects;';
        const totalCountResult = await client.query(totalCountQuery);
        const totalCount = parseInt(totalCountResult.rows[0].total_count);

        // Send back the paginated data and pagination info
        res.status(200).json({ 
            success: true, 
            projects: projectsResult.rows,
            total_count: totalCount,
            current_page: page,
            total_pages: Math.ceil(totalCount / limit)
        });
    } catch (error) {
        console.error('Database error fetching all projects for admin:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch projects due to a server error.' });
    } finally {
        if (client) client.release();
    }
});


// --- NEW: Endpoint for admin to delete any project file ---
router.delete('/delete-project/:projectId', isAuthenticated, isAdminOrSuperadmin, async (req, res) => {
    const projectId = parseInt(req.params.projectId, 10); // ensure integer

    // 1. Validate Project ID
    if (isNaN(projectId)) {
        return res.status(400).json({ success: false, message: 'Invalid project ID.' });
    }

    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN'); // Start transaction for safety

        const deleteQuery = `
            DELETE FROM user_projects
            WHERE id = $1
            RETURNING id;
        `;
        const result = await client.query(deleteQuery, [projectId]);

        if (result.rowCount === 0) {
            await client.query('ROLLBACK'); // nothing deleted → rollback
            return res.status(404).json({
                success: false,
                message: 'Project not found or already deleted.',
            });
        }

        // ✅ Success: commit transaction
        await client.query('COMMIT');
        return res.status(200).json({
            success: true,
            message: 'Project deleted successfully!',
        });

    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error('Error deleting project (admin):', error);
        res.status(500).json({ success: false, message: 'Failed to delete project due to a server error.' });
    } finally {
        if (client) client.release();
    }
});


router.get('/dashboard/summary', isAuthenticated, isAdminOrSuperadmin, async (req, res) => {
    
    try {
        // Use Promise.all to fetch all dashboard stats concurrently
        const [
            totalInternsResult,
            totalProjectsResult,
            pendingReportsResult,
            pendingPermissionsResult,
            totalComplaintsResult,
            recentActivitiesResult
        ] = await Promise.all([
            // FIX 1: Count ALL interns (assuming role='intern') - removed the WHERE clause for admin ID
            // If you don't have a 'role' column, change 'intern' to match how you identify interns.
            pool.query('SELECT COUNT(*) AS total_interns FROM users;'),

            pool.query('SELECT COUNT(*) AS total_projects FROM user_projects;'),
            pool.query('SELECT COUNT(*) AS pending_reports FROM logbook_reports WHERE status = $1;', ['Pending']),
            pool.query('SELECT COUNT(*) AS pending_permissions FROM leave_requests WHERE status = $1;', ['Pending']),
            pool.query('SELECT COUNT(*) AS total_complaints FROM complaints_suggestions;'),
            
            // FIX 2: Correct 'u.id' to 'u.user_id' in the JOIN clauses
            pool.query(`
                SELECT u.first_name, u.email, p.project_name AS project, 'Completed' AS status
                FROM logbook_reports r
                JOIN users u ON r.user_id = u.user_id -- Corrected u.id to u.user_id
                JOIN user_projects p ON p.user_id = u.user_id -- Corrected u.id to u.user_id
                ORDER BY r.submitted_at DESC
                LIMIT 5;
            `)
        ]);

        // Construct the dashboard data object (rest of the code remains the same)
        const dashboardData = {
            success: true,
            stats: {
                total_interns: parseInt(totalInternsResult.rows[0].total_interns) || 0,
                total_projects: parseInt(totalProjectsResult.rows[0].total_projects) || 0,
                pending_reports: parseInt(pendingReportsResult.rows[0].pending_reports) || 0,
                pending_permissions: parseInt(pendingPermissionsResult.rows[0].pending_permissions) || 0,
                total_complaints: parseInt(totalComplaintsResult.rows[0].total_complaints) || 0,
            },
            activities: recentActivitiesResult.rows.map(row => ({
                name: row.first_name,
                email: row.email,
                project: row.project,
                status: row.status 
            }))
        };

        res.json(dashboardData);

    } catch (error) {
        console.error('Error fetching admin dashboard summary:', error.stack);
        res.status(500).json({ success: false, message: 'Failed to fetch dashboard summary.' });
    }
});


/**
 * @route POST /api/admin/register
 * @desc Registers a new admin or superadmin.
 * @access Private (should be protected by an admin-level middleware in a real app).
 */
router.post('/register', isAuthenticated, isSuperadmin, async (req, res) => {
    // Destructure all required fields from the request body.
    const { firstName, lastName, email, password, role } = req.body;

    // --- Server-side Validation ---
    if (!firstName || !lastName || !email || !password || !role) {
        return res.status(400).json({ success: false, message: 'All required fields must be filled.' });
    }
    if (role !== 'admin' && role !== 'superadmin') {
        return res.status(400).json({ success: false, message: 'Invalid role specified.' });
    }
    if (password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password should be at least 6 characters.' });
    }

    let client;
    try {
        // Hash the password for security before storing it in the database.
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        client = await pool.connect();
        await client.query('BEGIN'); // Start a transaction for atomicity.

        // Check if an admin with the same email already exists.
        const existingAdmin = await client.query(
            'SELECT email FROM admins WHERE email = $1',
            [email]
        );

        if (existingAdmin.rows.length > 0) {
            await client.query('ROLLBACK'); // Roll back the transaction if the email exists.
            return res.status(409).json({ success: false, message: 'Email already registered as an admin.' });
        }

        // SQL query to insert a new admin.
        // Make sure your 'admins' table has columns for all the fields (e.g., first_name, last_name, email, password, role).
        await client.query(
            `INSERT INTO admins (first_name, last_name, email, password, role)
             VALUES ($1, $2, $3, $4, $5)`,
            [firstName, lastName, email, hashedPassword, role]
        );

        await client.query('COMMIT'); // Commit the transaction on success.
        console.log(`New admin registered successfully.`);
        res.status(201).json({ success: true, message: 'Admin registered successfully!' });

    } catch (error) {
        if (client) { await client.query('ROLLBACK'); } // Rollback on any error.
        console.error('Admin registration error:', error);
        res.status(500).json({ success: false, message: 'Internal server error during registration.' });
    } finally {
        if (client) { client.release(); } // Always release the client connection.
    }
});



// Get pending users for admin approval
router.get('/pending-users', isAdminOrSuperadmin, async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    let client;
    try {
        client = await pool.connect();
        
        // Get total count for pagination
        const countResult = await client.query(`
            SELECT COUNT(*) as total 
            FROM users 
            WHERE approval_status = 'pending'
        `);
        const totalCount = parseInt(countResult.rows[0].total);
        const totalPages = Math.ceil(totalCount / limit);

        // Get pending users with pagination
        const usersResult = await client.query(`
            SELECT user_id, first_name, last_name, email, created_at, approval_status 
            FROM users 
            WHERE approval_status = 'pending' 
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
        `, [limit, offset]);
        
        res.json({ 
            success: true, 
            users: usersResult.rows,
            current_page: page,
            total_pages: totalPages,
            total_count: totalCount
        });

    } catch (error) {
        console.error('Error fetching pending users:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch pending users' });
    } finally {
        if (client) client.release();
    }
});

// Approve user
router.put('/approve-user/:userId', isAdminOrSuperadmin, async (req, res) => {
    const { userId } = req.params;
    const adminId = req.session.user.user_id;

    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN');

        // Get user details before approval
        const userResult = await client.query(`
            SELECT first_name, last_name, email 
            FROM users 
            WHERE user_id = $1 AND approval_status = 'pending'
        `, [userId]);

        if (userResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ 
                success: false, 
                message: 'User not found or already processed' 
            });
        }

        const user = userResult.rows[0];
        const userName = `${user.first_name} ${user.last_name}`;

        // Update user approval status
        await client.query(`
            UPDATE users 
            SET is_approved = TRUE, 
                approval_status = 'approved', 
                approved_by = $1, 
                approved_at = NOW() 
            WHERE user_id = $2
        `, [adminId, userId]);

        await client.query('COMMIT');

        // Send approval email notification
        try {
            await sendApprovalNotification(user.email, userName, true);
        } catch (emailError) {
            console.error('Failed to send approval email:', emailError);
            // Don't fail the whole operation if email fails
        }

        console.log(`[APPROVAL] User ${userName} (${user.email}) approved by admin ${adminId}`);
        
        res.json({ 
            success: true, 
            message: `${userName} has been approved successfully!` 
        });

    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error('Error approving user:', error);
        res.status(500).json({ success: false, message: 'Failed to approve user' });
    } finally {
        if (client) client.release();
    }
});

// Reject/Delete user
router.delete('/reject-user/:userId', isAdminOrSuperadmin, async (req, res) => {
    const { userId } = req.params;
    const { reason, deleteUser } = req.body;
    const adminId = req.session.user.user_id;

    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN');

        // Get user details before rejection
        const userResult = await client.query(`
            SELECT first_name, last_name, email 
            FROM users 
            WHERE user_id = $1 AND approval_status = 'pending'
        `, [userId]);

        if (userResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ 
                success: false, 
                message: 'User not found or already processed' 
            });
        }

        const user = userResult.rows[0];
        const userName = `${user.first_name} ${user.last_name}`;

        if (deleteUser) {
            // Permanently delete the user
            await client.query('DELETE FROM users WHERE user_id = $1', [userId]);
        } else {
            // Mark as rejected but keep the record
            await client.query(`
                UPDATE users 
                SET approval_status = 'rejected',
                    rejection_reason = $1,
                    approved_by = $2,
                    approved_at = NOW()
                WHERE user_id = $3
            `, [reason, adminId, userId]);
        }

        await client.query('COMMIT');

        // Send rejection email notification
        try {
            await sendApprovalNotification(user.email, userName, false, reason);
        } catch (emailError) {
            console.error('Failed to send rejection email:', emailError);
            // Don't fail the whole operation if email fails
        }

        console.log(`[REJECTION] User ${userName} (${user.email}) ${deleteUser ? 'deleted' : 'rejected'} by admin ${adminId}`);
        
        res.json({ 
            success: true, 
            message: `${userName} has been ${deleteUser ? 'deleted' : 'rejected'} successfully!` 
        });

    } catch (error) {
        if (client) await client.query('ROLLBACK');
        console.error('Error rejecting user:', error);
        res.status(500).json({ success: false, message: 'Failed to reject user' });
    } finally {
        if (client) client.release();
    }
});



export default router;