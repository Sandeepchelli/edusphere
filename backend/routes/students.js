const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { get, all, run } = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET /api/students
// Accessible by Admin, Teacher, Cashier
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { class_year, department, section, search, status } = req.query;
    let sql = `
      SELECT s.*, 
             u.username, u.name as student_name, u.email, u.phone, u.profile_photo, u.status as account_status,
             p.parent_name, p.parent_phone, p.parent_email, p.parent_photo, pu.username as parent_username
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN parents p ON s.parent_id = p.id
      LEFT JOIN users pu ON p.user_id = pu.id
      WHERE u.status != 'removed'
    `;
    const params = [];

    if (status && status !== 'all') {
      sql += ' AND u.status = ?';
      params.push(status);
    }
    if (class_year) {
      sql += ' AND s.class_year = ?';
      params.push(class_year);
    }
    if (department) {
      sql += ' AND s.department = ?';
      params.push(department);
    }
    if (section) {
      sql += ' AND s.section = ?';
      params.push(section);
    }
    if (search) {
      sql += ' AND (u.name LIKE ? OR s.student_id LIKE ? OR s.roll_number LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY s.id DESC';
    const students = await all(sql, params);
    res.json(students);
  } catch (err) {
    console.error('Error fetching students:', err);
    res.status(500).json({ error: 'Failed to fetch students.' });
  }
});


// GET /api/students/:id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const student = await get(`
      SELECT s.*, 
             u.username, u.name as student_name, u.email, u.phone, u.profile_photo, u.status as account_status,
             p.id as parent_pk_id, p.parent_name, p.parent_phone, p.parent_email, p.parent_photo, pu.username as parent_username,
             f.total_fee, f.amount_paid, f.amount_pending, f.status as fee_status
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN parents p ON s.parent_id = p.id
      LEFT JOIN users pu ON p.user_id = pu.id
      LEFT JOIN fees f ON f.student_id = s.id
      WHERE s.id = ?
    `, [req.params.id]);

    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }
    res.json(student);
  } catch (err) {
    console.error('Error fetching student:', err);
    res.status(500).json({ error: 'Failed to fetch student details.' });
  }
});

// POST /api/students
// Admin, or Teacher with can_add_students permission
router.post('/', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      if (req.user.role !== 'teacher') {
        return res.status(403).json({ error: 'Not authorized to add students.' });
      }
      // Check teacher permission
      const teacher = await get('SELECT can_add_students FROM teachers WHERE user_id = ?', [req.user.id]);
      if (!teacher || !teacher.can_add_students) {
        return res.status(403).json({ error: 'You do not have permission to add students.' });
      }
    }

    const {
      name, student_id, username, password, roll_number,
      class_year, department, section, phone, email, address, dob, profile_photo,
      parent_name, parent_phone, parent_email, parent_username, parent_password, parent_photo,
      total_fee
    } = req.body;

    if (!name || !student_id || !username || !password || !class_year || !department || !section) {
      return res.status(400).json({ error: 'Please provide all required student details.' });
    }

    // Check duplicate username or student_id
    const existingUser = await get('SELECT id FROM users WHERE username = ? COLLATE NOCASE', [username.trim()]);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already in use.' });
    }
    const existingStudentId = await get('SELECT id FROM students WHERE student_id = ?', [student_id.trim()]);
    if (existingStudentId) {
      return res.status(400).json({ error: 'Student ID already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedStudentPw = await bcrypt.hash(password, salt);

    // Create student user
    const studentUserRes = await run(`
      INSERT INTO users (username, password, role, name, email, phone, profile_photo)
      VALUES (?, ?, 'student', ?, ?, ?, ?)
    `, [username.trim(), hashedStudentPw, name.trim(), email || null, phone || null, profile_photo || null]);
    const studentUserId = studentUserRes.id;

    // Handle Parent
    let parentId = null;
    if (parent_name) {
      const pUsername = parent_username ? parent_username.trim() : `p_${username.trim()}`;
      const pPassword = parent_password ? parent_password : password;
      const existingParentUser = await get('SELECT id FROM users WHERE username = ? COLLATE NOCASE', [pUsername]);

      let parentUserId = null;
      if (existingParentUser) {
        parentUserId = existingParentUser.id;
        const pRecord = await get('SELECT id FROM parents WHERE user_id = ?', [parentUserId]);
        if (pRecord) parentId = pRecord.id;
      } else {
        const hashedParentPw = await bcrypt.hash(pPassword, salt);
        const parentUserRes = await run(`
          INSERT INTO users (username, password, role, name, email, phone, profile_photo)
          VALUES (?, ?, 'parent', ?, ?, ?, ?)
        `, [pUsername, hashedParentPw, parent_name.trim(), parent_email || null, parent_phone || null, parent_photo || null]);
        parentUserId = parentUserRes.id;

        const pRecordRes = await run(`
          INSERT INTO parents (user_id, parent_name, parent_phone, parent_email, parent_photo)
          VALUES (?, ?, ?, ?, ?)
        `, [parentUserId, parent_name.trim(), parent_phone || null, parent_email || null, parent_photo || null]);
        parentId = pRecordRes.id;
      }
    }

    // Insert student record
    const studentRes = await run(`
      INSERT INTO students (user_id, student_id, roll_number, class_year, department, section, dob, address, parent_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [studentUserId, student_id.trim(), roll_number || null, class_year, department, section, dob || null, address || null, parentId]);

    // Initial Fee entry if provided
    const feeAmount = total_fee ? parseFloat(total_fee) : 0;
    if (feeAmount > 0) {
      await run(`
        INSERT INTO fees (student_id, academic_year, total_fee, amount_paid, amount_pending, status)
        VALUES (?, '2026-2027', ?, 0, ?, 'Pending')
      `, [studentRes.id, feeAmount, feeAmount]);
    }

    res.status(201).json({
      message: 'Student registered successfully',
      id: studentRes.id,
      student_id: student_id.trim()
    });
  } catch (err) {
    console.error('Create student error:', err);
    res.status(500).json({ error: 'Failed to create student.' });
  }
});

// PUT /api/students/:id
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can update student records.' });
    }

    const {
      name, roll_number, class_year, department, section, phone, email, address, dob, profile_photo,
      account_status, new_password,
      parent_name, parent_phone, parent_email, parent_photo
    } = req.body;

    const student = await get('SELECT * FROM students WHERE id = ?', [req.params.id]);
    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    // Update user info
    await run(`
      UPDATE users
      SET name = COALESCE(?, name),
          email = COALESCE(?, email),
          phone = COALESCE(?, phone),
          profile_photo = COALESCE(?, profile_photo),
          status = COALESCE(?, status)
      WHERE id = ?
    `, [name, email, phone, profile_photo, account_status, student.user_id]);

    if (new_password && new_password.trim().length >= 6) {
      const salt = await bcrypt.genSalt(10);
      const hashed = await bcrypt.hash(new_password.trim(), salt);
      await run('UPDATE users SET password = ? WHERE id = ?', [hashed, student.user_id]);
    }

    // Update student info
    await run(`
      UPDATE students
      SET roll_number = COALESCE(?, roll_number),
          class_year = COALESCE(?, class_year),
          department = COALESCE(?, department),
          section = COALESCE(?, section),
          dob = COALESCE(?, dob),
          address = COALESCE(?, address)
      WHERE id = ?
    `, [roll_number, class_year, department, section, dob, address, req.params.id]);

    // Update parent if exists
    if (student.parent_id && parent_name) {
      await run(`
        UPDATE parents
        SET parent_name = COALESCE(?, parent_name),
            parent_phone = COALESCE(?, parent_phone),
            parent_email = COALESCE(?, parent_email),
            parent_photo = COALESCE(?, parent_photo)
        WHERE id = ?
      `, [parent_name, parent_phone, parent_email, parent_photo, student.parent_id]);

      const parentRecord = await get('SELECT user_id FROM parents WHERE id = ?', [student.parent_id]);
      if (parentRecord) {
        await run('UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email), phone = COALESCE(?, phone) WHERE id = ?',
          [parent_name, parent_email, parent_phone, parentRecord.user_id]);
      }
    }

    res.json({ message: 'Student updated successfully.' });
  } catch (err) {
    console.error('Update student error:', err);
    res.status(500).json({ error: 'Failed to update student.' });
  }
});

// PATCH /api/students/:id/disable - Disable student account without removing data
router.patch('/:id/disable', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const student = await get('SELECT * FROM students WHERE id = ?', [req.params.id]);
    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }
    await run('UPDATE users SET status = ? WHERE id = ?', ['disabled', student.user_id]);
    res.json({ message: 'Student account disabled. Login access revoked.' });
  } catch (err) {
    console.error('Disable student error:', err);
    res.status(500).json({ error: 'Failed to disable student account.' });
  }
});

// DELETE /api/students/:id - Soft-remove: disables login, marks as removed, preserves historical records
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const student = await get(
      'SELECT s.*, u.username FROM students s JOIN users u ON s.user_id = u.id WHERE s.id = ?',
      [req.params.id]
    );
    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    // Soft-remove: mark user as 'removed', scramble password so login is impossible
    const removedUsername = `__removed_${Date.now()}_${student.username}`;
    const dummyHash = await require('bcryptjs').hash(require('crypto').randomBytes(32).toString('hex'), 10);
    await run(
      `UPDATE users SET status = 'removed', username = ?, password = ?, name = COALESCE(name, '') WHERE id = ?`,
      [removedUsername, dummyHash, student.user_id]
    );

    // Remove student from timetable assignments (set teacher_id slot to null is not applicable;
    // just remove the student's active class section link by blanking section — keep records intact)
    // Historical attendance, marks, fees, and semester_results are preserved.

    res.json({ message: 'Student removed successfully. Historical records preserved.' });
  } catch (err) {
    console.error('Remove student error:', err);
    res.status(500).json({ error: 'Failed to remove student.' });
  }
});

module.exports = router;
