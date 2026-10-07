const express = require('express');
const router = express.Router();
const { get, all, run } = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET /api/parents
router.get('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const parents = await all(`
      SELECT p.*, u.username, u.name as account_name, u.status as account_status,
             (SELECT COUNT(*) FROM students WHERE parent_id = p.id) as children_count
      FROM parents p
      JOIN users u ON p.user_id = u.id
      ORDER BY p.id DESC
    `);
    res.json(parents);
  } catch (err) {
    console.error('Error fetching parents:', err);
    res.status(500).json({ error: 'Failed to fetch parents.' });
  }
});

// GET /api/parents/child-details
// Parent accesses their linked child info
router.get('/child-details', authenticateToken, requireRole(['parent']), async (req, res) => {
  try {
    const parent = await get('SELECT * FROM parents WHERE user_id = ?', [req.user.id]);
    if (!parent) {
      return res.status(404).json({ error: 'Parent record not found.' });
    }

    const children = await all(`
      SELECT s.*, u.name as student_name, u.email, u.phone, u.profile_photo,
             f.total_fee, f.amount_paid, f.amount_pending, f.status as fee_status
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN fees f ON f.student_id = s.id
      WHERE s.parent_id = ?
    `, [parent.id]);

    res.json({
      parent,
      children
    });
  } catch (err) {
    console.error('Error fetching child details for parent:', err);
    res.status(500).json({ error: 'Failed to fetch child details.' });
  }
});

module.exports = router;
