// utils/notifications.js
import pool from '../db.js';  // adjust path if needed

// Generic function to create notification
export async function createNotification({ recipientId, recipientRole, senderId, message, section, entityId, link }) {
  const builtLink = link || `/${recipientRole}_dashboard.html#${section}${entityId ? `?id=${entityId}` : ''}`;

  const result = await pool.query(
    `INSERT INTO notifications (recipient_id, recipient_role, sender_id, message, section, entity_id, link, is_read, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE, NOW())
     RETURNING *`,
    [recipientId, recipientRole, senderId, message, section, entityId, builtLink]
  );

  return result.rows[0];
}
