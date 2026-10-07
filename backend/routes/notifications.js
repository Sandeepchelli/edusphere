const express = require('express');
const router = express.Router();
const { get, all, run } = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET /api/notifications
router.get('/', authenticateToken, async (req, res) => {
  try {
    const notifications = await all(`
      SELECT * FROM notifications
      WHERE user_id = ?
      ORDER BY id DESC
      LIMIT 100
    `, [req.user.id]);

    const unreadCountRow = await get(`
      SELECT COUNT(*) as count FROM notifications
      WHERE user_id = ? AND is_read = 0
    `, [req.user.id]);

    res.json({
      notifications,
      unread_count: unreadCountRow.count || 0
    });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    await run(`
      UPDATE notifications
      SET is_read = 1
      WHERE id = ? AND user_id = ?
    `, [req.params.id, req.user.id]);

    res.json({ message: 'Marked as read.' });
  } catch (err) {
    console.error('Error updating notification:', err);
    res.status(500).json({ error: 'Failed to update notification.' });
  }
});

// PUT /api/notifications/read-all
router.put('/read-all', authenticateToken, async (req, res) => {
  try {
    await run(`
      UPDATE notifications
      SET is_read = 1
      WHERE user_id = ?
    `, [req.user.id]);

    res.json({ message: 'All notifications marked as read.' });
  } catch (err) {
    console.error('Error updating all notifications:', err);
    res.status(500).json({ error: 'Failed to mark all as read.' });
  }
});

// POST /api/notifications/broadcast (Admin only)
// Send college announcement to specific role or all users
router.post('/broadcast', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { title, message, target_role } = req.body;
    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required.' });
    }

    let usersQuery = 'SELECT id FROM users WHERE status = "active"';
    const params = [];
    if (target_role && target_role !== 'all') {
      usersQuery += ' AND role = ?';
      params.push(target_role);
    }

    const targetUsers = await all(usersQuery, params);
    for (const u of targetUsers) {
      await run(`
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (?, ?, ?, 'general')
      `, [u.id, title.trim(), message.trim()]);
    }

    res.status(201).json({
      message: `Announcement sent to ${targetUsers.length} user(s).`,
      count: targetUsers.length
    });
  } catch (err) {
    console.error('Error broadcasting notification:', err);
    res.status(500).json({ error: 'Failed to broadcast announcement.' });
  }
});

module.exports = router;
