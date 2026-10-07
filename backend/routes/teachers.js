const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { get, all, run } = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET /api/teachers
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { department, search, status } = req.query;
    let sql = `
      SELECT t.*, u.username, u.name as teacher_name, u.email, u.phone, u.profile_photo, u.status as account_status
      FROM teachers t
      JOIN users u ON t.user_id = u.id
      WHERE u.status != 'removed'
    `;
    const params = [];

    if (status && status !== 'all') {
      sql += ' AND u.status = ?';
      params.push(status);
    }
    if (department) {
      sql += ' AND t.department = ?';
      params.push(department);
    }
    if (search) {
      sql += ' AND (u.name LIKE ? OR t.teacher_id LIKE ? OR t.subject LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY t.id DESC';
    const teachers = await all(sql, params);
    res.json(teachers);
  } catch (err) {
    console.error('Error fetching teachers:', err);
    res.status(500).json({ error: 'Failed to fetch teachers.' });
  }
});


// GET /api/teachers/:id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const teacher = await get(`
      SELECT t.*, u.username, u.name as teacher_name, u.email, u.phone, u.profile_photo, u.status as account_status
      FROM teachers t
      JOIN users u ON t.user_id = u.id
      WHERE t.id = ?
    `, [req.params.id]);

    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found.' });
    }
    res.json(teacher);
  } catch (err) {
    console.error('Error fetching teacher:', err);
    res.status(500).json({ error: 'Failed to fetch teacher.' });
  }
});

// POST /api/teachers (Admin only)
router.post('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const {
      name, teacher_id, username, password, phone, email,
      department, subject, designation, profile_photo, salary, joining_date, can_add_students
    } = req.body;

    if (!name || !teacher_id || !username || !password || !department) {
      return res.status(400).json({ error: 'Name, Teacher ID, username, password, and department are required.' });
    }

    const existingUser = await get('SELECT id FROM users WHERE username = ? COLLATE NOCASE', [username.trim()]);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already in use.' });
    }
    const existingTeacherId = await get('SELECT id FROM teachers WHERE teacher_id = ?', [teacher_id.trim()]);
    if (existingTeacherId) {
      return res.status(400).json({ error: 'Teacher ID already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPw = await bcrypt.hash(password, salt);

    const userRes = await run(`
      INSERT INTO users (username, password, role, name, email, phone, profile_photo)
      VALUES (?, ?, 'teacher', ?, ?, ?, ?)
    `, [username.trim(), hashedPw, name.trim(), email || null, phone || null, profile_photo || null]);

    const teacherRes = await run(`
      INSERT INTO teachers (user_id, teacher_id, department, subject, designation, salary, joining_date, can_add_students)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      userRes.id,
      teacher_id.trim(),
      department.trim(),
      subject || null,
      designation || 'Lecturer',
      salary ? parseFloat(salary) : 0,
      joining_date || new Date().toISOString().split('T')[0],
      can_add_students === undefined || can_add_students === true || can_add_students === 1 ? 1 : 0
    ]);

    res.status(201).json({
      message: 'Teacher added successfully',
      id: teacherRes.id
    });
  } catch (err) {
    console.error('Error adding teacher:', err);
    res.status(500).json({ error: 'Failed to add teacher.' });
  }
});

// PUT /api/teachers/:id (Admin only)
router.put('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const {
      name, phone, email, department, subject, designation,
      profile_photo, salary, joining_date, can_add_students,
      account_status, new_password
    } = req.body;

    const teacher = await get('SELECT * FROM teachers WHERE id = ?', [req.params.id]);
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found.' });
    }

    // Update user table
    await run(`
      UPDATE users
      SET name = COALESCE(?, name),
          email = COALESCE(?, email),
          phone = COALESCE(?, phone),
          profile_photo = COALESCE(?, profile_photo),
          status = COALESCE(?, status)
      WHERE id = ?
    `, [name, email, phone, profile_photo, account_status, teacher.user_id]);

    if (new_password && new_password.trim().length >= 6) {
      const salt = await bcrypt.genSalt(10);
      const hashed = await bcrypt.hash(new_password.trim(), salt);
      await run('UPDATE users SET password = ? WHERE id = ?', [hashed, teacher.user_id]);
    }

    // Update teachers table
    await run(`
      UPDATE teachers
      SET department = COALESCE(?, department),
          subject = COALESCE(?, subject),
          designation = COALESCE(?, designation),
          salary = COALESCE(?, salary),
          joining_date = COALESCE(?, joining_date),
          can_add_students = COALESCE(?, can_add_students)
      WHERE id = ?
    `, [
      department,
      subject,
      designation,
      salary !== undefined ? parseFloat(salary) : null,
      joining_date,
      can_add_students !== undefined ? (can_add_students ? 1 : 0) : null,
      req.params.id
    ]);

    res.json({ message: 'Teacher updated successfully.' });
  } catch (err) {
    console.error('Error updating teacher:', err);
    res.status(500).json({ error: 'Failed to update teacher.' });
  }
});

// PATCH /api/teachers/:id/disable - Disable teacher account without removing records
router.patch('/:id/disable', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const teacher = await get('SELECT * FROM teachers WHERE id = ?', [req.params.id]);
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found.' });
    }
    await run('UPDATE users SET status = ? WHERE id = ?', ['disabled', teacher.user_id]);
    res.json({ message: 'Teacher account disabled. Login access revoked.' });
  } catch (err) {
    console.error('Disable teacher error:', err);
    res.status(500).json({ error: 'Failed to disable teacher account.' });
  }
});

// DELETE /api/teachers/:id - Soft-remove: disables login, preserves historical records
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const teacher = await get(
      'SELECT t.*, u.username FROM teachers t JOIN users u ON t.user_id = u.id WHERE t.id = ?',
      [req.params.id]
    );
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found.' });
    }

    // Soft-remove: mark as removed, scramble credentials so login is impossible
    const removedUsername = `__removed_${Date.now()}_${teacher.username}`;
    const dummyHash = await require('bcryptjs').hash(require('crypto').randomBytes(32).toString('hex'), 10);
    await run(
      `UPDATE users SET status = 'removed', username = ?, password = ? WHERE id = ?`,
      [removedUsername, dummyHash, teacher.user_id]
    );

    // Also revoke student-add permission for the removed teacher
    await run('UPDATE teachers SET can_add_students = 0 WHERE id = ?', [req.params.id]);

    // Historical attendance, marks, salary records are preserved.
    res.json({ message: 'Teacher removed successfully. Historical records preserved.' });
  } catch (err) {
    console.error('Remove teacher error:', err);
    res.status(500).json({ error: 'Failed to remove teacher.' });
  }
});

module.exports = router;
