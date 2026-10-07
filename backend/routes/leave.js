const express = require('express');
const router = express.Router();
const { get, all, run } = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET /api/leave-requests
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, type } = req.query;
    let sql = `
      SELECT lr.*, 
             s.student_id as student_reg_id, s.class_year, s.section, s.department,
             u.name as student_name, u.phone as student_phone,
             reviewer.name as reviewer_name
      FROM leave_requests lr
      JOIN students s ON lr.student_id = s.id
      JOIN users u ON s.user_id = u.id
      LEFT JOIN users reviewer ON lr.reviewed_by = reviewer.id
      WHERE 1=1
    `;
    const params = [];

    // Role restrictions
    if (req.user.role === 'student') {
      const student = await get('SELECT id FROM students WHERE user_id = ?', [req.user.id]);
      if (!student) return res.json([]);
      sql += ' AND lr.student_id = ?';
      params.push(student.id);
    } else if (req.user.role === 'parent') {
      const parent = await get('SELECT id FROM parents WHERE user_id = ?', [req.user.id]);
      if (!parent) return res.json([]);
      const children = await all('SELECT id FROM students WHERE parent_id = ?', [parent.id]);
      const childIds = children.map(c => c.id);
      if (childIds.length === 0) return res.json([]);
      sql += ` AND lr.student_id IN (${childIds.map(() => '?').join(',')})`;
      params.push(...childIds);
    }

    if (status) {
      sql += ' AND lr.status = ?';
      params.push(status);
    }
    if (type) {
      sql += ' AND lr.type = ?';
      params.push(type);
    }

    sql += ' ORDER BY lr.id DESC';
    const requests = await all(sql, params);
    res.json(requests);
  } catch (err) {
    console.error('Error fetching leave requests:', err);
    res.status(500).json({ error: 'Failed to fetch leave/outing requests.' });
  }
});

// POST /api/leave-requests (Student only)
router.post('/', authenticateToken, requireRole(['student']), async (req, res) => {
  try {
    const student = await get('SELECT id FROM students WHERE user_id = ?', [req.user.id]);
    if (!student) {
      return res.status(404).json({ error: 'Student profile not found.' });
    }

    const { type, date, from_time, to_time, reason, description } = req.body;
    if (!type || !date || !reason) {
      return res.status(400).json({ error: 'Type (Leave/Outing), date, and reason are required.' });
    }

    const result = await run(`
      INSERT INTO leave_requests (student_id, type, date, from_time, to_time, reason, description, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')
    `, [student.id, type, date, from_time || null, to_time || null, reason.trim(), description || null]);

    // Notify admins and teachers
    const admins = await all("SELECT id FROM users WHERE role = 'admin'");
    for (const admin of admins) {
      await run(`
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (?, 'New ${type} Request', ?, 'leave')
      `, [admin.id, `Student submitted a new ${type} request for ${date}. Reason: ${reason}`]);
    }

    res.status(201).json({
      message: `${type} request submitted successfully. Waiting for teacher/admin approval.`,
      id: result.id
    });
  } catch (err) {
    console.error('Error submitting leave request:', err);
    res.status(500).json({ error: 'Failed to submit request.' });
  }
});

// PUT /api/leave-requests/:id/review (Teacher & Admin only)
router.put('/:id/review', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { status, review_notes } = req.body;
    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be either Approved or Rejected.' });
    }

    const request = await get('SELECT * FROM leave_requests WHERE id = ?', [req.params.id]);
    if (!request) {
      return res.status(404).json({ error: 'Request not found.' });
    }

    await run(`
      UPDATE leave_requests
      SET status = ?, reviewed_by = ?, review_notes = ?
      WHERE id = ?
    `, [status, req.user.id, review_notes || null, req.params.id]);

    // Notify student and parent
    const studentInfo = await get(`
      SELECT s.user_id as student_user_id, p.user_id as parent_user_id, u.name as student_name
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN parents p ON s.parent_id = p.id
      WHERE s.id = ?
    `, [request.student_id]);

    if (studentInfo) {
      const statusText = status === 'Approved' ? 'Permission Granted' : 'Request Rejected';
      const notifMsg = `Your ${request.type} request for ${request.date} has been ${status.toUpperCase()} (${statusText}). ${review_notes ? 'Notes: ' + review_notes : ''}`;

      await run(`
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (?, '${request.type} Status: ${statusText}', ?, 'leave')
      `, [studentInfo.student_user_id, notifMsg]);

      if (studentInfo.parent_user_id) {
        await run(`
          INSERT INTO notifications (user_id, title, message, type)
          VALUES (?, 'Child ${request.type} Update: ${statusText}', ?, 'leave')
        `, [studentInfo.parent_user_id, `${studentInfo.student_name}: ` + notifMsg]);
      }
    }

    res.json({ message: `Request has been ${status.toLowerCase()} successfully.` });
  } catch (err) {
    console.error('Error reviewing leave request:', err);
    res.status(500).json({ error: 'Failed to review request.' });
  }
});

module.exports = router;
