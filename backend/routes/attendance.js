const express = require('express');
const router = express.Router();
const { get, all, run } = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET /api/attendance/students
// Fetch student attendance records by filters (class, section, subject, date, period, student_id)
router.get('/students', authenticateToken, async (req, res) => {
  try {
    const { class_year, section, subject_id, date, period, student_id } = req.query;

    let sql = `
      SELECT a.*, 
             s.student_id as student_reg_id, s.roll_number, s.class_year, s.section,
             u.name as student_name,
             sub.name as subject_name, sub.code as subject_code,
             marker.name as marked_by_name
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      JOIN users u ON s.user_id = u.id
      LEFT JOIN subjects sub ON a.subject_id = sub.id
      LEFT JOIN users marker ON a.marked_by = marker.id
      WHERE 1=1
    `;
    const params = [];

    if (student_id) {
      sql += ' AND a.student_id = ?';
      params.push(student_id);
    }
    if (class_year) {
      sql += ' AND a.class_year = ?';
      params.push(class_year);
    }
    if (section) {
      sql += ' AND a.section = ?';
      params.push(section);
    }
    if (subject_id) {
      sql += ' AND a.subject_id = ?';
      params.push(subject_id);
    }
    if (date) {
      sql += ' AND a.date = ?';
      params.push(date);
    }
    if (period) {
      sql += ' AND a.period = ?';
      params.push(period);
    }

    sql += ' ORDER BY a.date DESC, a.period ASC, s.roll_number ASC';
    const records = await all(sql, params);

    // Calculate summary statistics
    const total = records.length;
    const present = records.filter(r => r.status.toLowerCase() === 'present').length;
    const absent = records.filter(r => r.status.toLowerCase() === 'absent').length;
    const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : 0;

    res.json({
      records,
      summary: { total, present, absent, percentage }
    });
  } catch (err) {
    console.error('Error fetching student attendance:', err);
    res.status(500).json({ error: 'Failed to fetch student attendance.' });
  }
});

// GET /api/attendance/my-attendance
// Students get THEIR OWN attendance history using JWT token (no student ID param needed)
router.get('/my-attendance', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Only students can access this endpoint.' });
    }

    const student = await get('SELECT * FROM students WHERE user_id = ?', [req.user.id]);
    if (!student) {
      return res.status(404).json({ error: 'Student profile not found. Contact administrator.' });
    }

    const records = await all(`
      SELECT a.*, sub.name as subject_name, sub.code as subject_code
      FROM attendance a
      LEFT JOIN subjects sub ON a.subject_id = sub.id
      WHERE a.student_id = ?
      ORDER BY a.date DESC, a.period ASC
    `, [student.id]);

    const total = records.length;
    const present = records.filter(r => r.status.toLowerCase() === 'present').length;
    const absent = records.filter(r => r.status.toLowerCase() === 'absent').length;
    const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : 0;

    // Group by subject for subject-wise breakdown
    const subjectMap = {};
    records.forEach(r => {
      const subKey = r.subject_name || 'General';
      if (!subjectMap[subKey]) {
        subjectMap[subKey] = { subject: subKey, total: 0, present: 0, absent: 0 };
      }
      subjectMap[subKey].total++;
      if (r.status.toLowerCase() === 'present') subjectMap[subKey].present++;
      else subjectMap[subKey].absent++;
    });
    const subjectBreakdown = Object.values(subjectMap).map(s => ({
      ...s,
      percentage: s.total > 0 ? ((s.present / s.total) * 100).toFixed(1) : 0
    }));

    res.json({
      student: {
        id: student.id,
        student_id: student.student_id,
        class_year: student.class_year,
        department: student.department,
        section: student.section
      },
      records,
      stats: { total, present, absent, percentage },
      subjectBreakdown
    });
  } catch (err) {
    console.error('Error fetching my attendance:', err);
    res.status(500).json({ error: 'Failed to fetch attendance records.' });
  }
});

// GET /api/attendance/student-stats/:id
// Get overall attendance statistics for a single student (for student/parent dashboard)
router.get('/student-stats/:id', authenticateToken, async (req, res) => {
  try {
    const studentId = req.params.id;
    const records = await all(`
      SELECT a.*, sub.name as subject_name
      FROM attendance a
      LEFT JOIN subjects sub ON a.subject_id = sub.id
      WHERE a.student_id = ?
      ORDER BY a.date DESC, a.period ASC
    `, [studentId]);

    const total = records.length;
    const present = records.filter(r => r.status.toLowerCase() === 'present').length;
    const absent = records.filter(r => r.status.toLowerCase() === 'absent').length;
    const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : 0;

    res.json({
      records,
      stats: { total, present, absent, percentage }
    });
  } catch (err) {
    console.error('Error fetching student stats:', err);
    res.status(500).json({ error: 'Failed to fetch attendance stats.' });
  }
});

// POST /api/attendance/students
// Teachers & Admin mark attendance
router.post('/students', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { class_year, section, subject_id, date, period, attendance_list } = req.body;
    // attendance_list is array of { student_id, status }

    if (!class_year || !section || !date || !period || !Array.isArray(attendance_list)) {
      return res.status(400).json({ error: 'Class, section, date, period, and attendance list are required.' });
    }

    let subjectName = 'General Class';
    if (subject_id) {
      const sub = await get('SELECT name FROM subjects WHERE id = ?', [subject_id]);
      if (sub) subjectName = sub.name;
    }

    let savedCount = 0;
    let absentAlertsSent = 0;

    for (const item of attendance_list) {
      let finalStatus = item.status.toLowerCase() === 'present' ? 'present' : 'absent';

      // Upsert attendance record
      const existing = await get(
        'SELECT id FROM attendance WHERE student_id = ? AND date = ? AND period = ?',
        [item.student_id, date, period]
      );

      if (existing) {
        await run(
          'UPDATE attendance SET status = ?, subject_id = ?, marked_by = ? WHERE id = ?',
          [finalStatus, subject_id || null, req.user.id, existing.id]
        );
      } else {
        await run(`
          INSERT INTO attendance (student_id, class_year, section, subject_id, date, period, status, marked_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [item.student_id, class_year, section, subject_id || null, date, period, finalStatus, req.user.id]);
      }

      savedCount++;

      // If absent, notify parent
      if (finalStatus === 'absent') {
        const student = await get(`
          SELECT s.parent_id, u.name as student_name 
          FROM students s
          JOIN users u ON s.user_id = u.id
          WHERE s.id = ?
        `, [item.student_id]);

        if (student && student.parent_id) {
          const parent = await get('SELECT user_id FROM parents WHERE id = ?', [student.parent_id]);
          if (parent) {
            await run(`
              INSERT INTO notifications (user_id, title, message, type)
              VALUES (?, 'Absent Alert', ?, 'absent_alert')
            `, [
              parent.user_id,
              `${student.student_name} was marked absent for ${subjectName} on ${date} (Period ${period}).`
            ]);
            absentAlertsSent++;
          }
        }
      }
    }

    res.json({
      message: 'Attendance saved successfully.',
      records_saved: savedCount,
      absent_alerts_sent: absentAlertsSent
    });
  } catch (err) {
    console.error('Error saving attendance:', err);
    res.status(500).json({ error: 'Failed to save attendance.' });
  }
});

// GET /api/attendance/teachers
router.get('/teachers', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { date, teacher_id } = req.query;
    let sql = `
      SELECT ta.*, u.name as teacher_name, t.department
      FROM teacher_attendance ta
      JOIN teachers t ON ta.teacher_id = t.id
      JOIN users u ON t.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    if (date) { sql += ' AND ta.date = ?'; params.push(date); }
    if (teacher_id) { sql += ' AND ta.teacher_id = ?'; params.push(teacher_id); }
    sql += ' ORDER BY ta.date DESC';
    const records = await all(sql, params);
    res.json(records);
  } catch (err) {
    console.error('Error fetching teacher attendance:', err);
    res.status(500).json({ error: 'Failed to fetch teacher attendance.' });
  }
});

// POST /api/attendance/teachers
router.post('/teachers', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { date, records } = req.body;
    if (!date || !Array.isArray(records)) {
      return res.status(400).json({ error: 'Date and records array required.' });
    }

    for (const item of records) {
      const existing = await get(
        'SELECT id FROM teacher_attendance WHERE teacher_id = ? AND date = ?',
        [item.teacher_id, date]
      );
      if (existing) {
        await run('UPDATE teacher_attendance SET status = ? WHERE id = ?', [item.status, existing.id]);
      } else {
        await run(
          'INSERT INTO teacher_attendance (teacher_id, date, status, marked_by) VALUES (?, ?, ?, ?)',
          [item.teacher_id, date, item.status || 'present', req.user.id]
        );
      }
    }

    res.json({ message: 'Teacher attendance saved.' });
  } catch (err) {
    console.error('Error saving teacher attendance:', err);
    res.status(500).json({ error: 'Failed to save teacher attendance.' });
  }
});

// GET /api/attendance/staff
router.get('/staff', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { date, staff_id } = req.query;
    let sql = `
      SELECT sa.*, u.name as staff_name, s.role as staff_role, s.department
      FROM staff_attendance sa
      JOIN staff s ON sa.staff_id = s.id
      JOIN users u ON s.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    if (date) { sql += ' AND sa.date = ?'; params.push(date); }
    if (staff_id) { sql += ' AND sa.staff_id = ?'; params.push(staff_id); }
    sql += ' ORDER BY sa.date DESC';
    const records = await all(sql, params);
    res.json(records);
  } catch (err) {
    console.error('Error fetching staff attendance:', err);
    res.status(500).json({ error: 'Failed to fetch staff attendance.' });
  }
});

// POST /api/attendance/staff
router.post('/staff', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { date, records } = req.body;
    if (!date || !Array.isArray(records)) {
      return res.status(400).json({ error: 'Date and records array required.' });
    }

    for (const item of records) {
      const existing = await get(
        'SELECT id FROM staff_attendance WHERE staff_id = ? AND date = ?',
        [item.staff_id, date]
      );
      if (existing) {
        await run('UPDATE staff_attendance SET status = ? WHERE id = ?', [item.status, existing.id]);
      } else {
        await run(
          'INSERT INTO staff_attendance (staff_id, date, status, marked_by) VALUES (?, ?, ?, ?)',
          [item.staff_id, date, item.status || 'present', req.user.id]
        );
      }
    }

    res.json({ message: 'Staff attendance saved.' });
  } catch (err) {
    console.error('Error saving staff attendance:', err);
    res.status(500).json({ error: 'Failed to save staff attendance.' });
  }
});

// GET /api/attendance/my-staff-attendance
// For logged-in staff/teacher to see their own attendance (my-attendance tab)
router.get('/my-staff-attendance', authenticateToken, async (req, res) => {
  try {
    const role = req.user.role;
    let records = [];

    if (role === 'teacher') {
      const teacher = await get('SELECT id FROM teachers WHERE user_id = ?', [req.user.id]);
      if (teacher) {
        records = await all(
          'SELECT * FROM teacher_attendance WHERE teacher_id = ? ORDER BY date DESC',
          [teacher.id]
        );
      }
    } else {
      const staff = await get('SELECT id FROM staff WHERE user_id = ?', [req.user.id]);
      if (staff) {
        records = await all(
          'SELECT * FROM staff_attendance WHERE staff_id = ? ORDER BY date DESC',
          [staff.id]
        );
      }
    }

    const total = records.length;
    const present = records.filter(r => r.status === 'present').length;
    const absent = records.filter(r => r.status === 'absent').length;
    const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : 0;

    res.json({ records, stats: { total, present, absent, percentage } });
  } catch (err) {
    console.error('Error fetching personal attendance:', err);
    res.status(500).json({ error: 'Failed to fetch attendance.' });
  }
});

module.exports = router;
