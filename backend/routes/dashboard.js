const express = require('express');
const router = express.Router();
const { get, all } = require('../database');
const { authenticateToken } = require('../middleware/auth');

// GET /api/dashboard/stats
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const role = req.user.role;
    const today = new Date().toISOString().split('T')[0];

    if (role === 'admin') {
      const studentCount = (await get('SELECT COUNT(*) as count FROM students')).count;
      const teacherCount = (await get('SELECT COUNT(*) as count FROM teachers')).count;
      const staffCount = (await get('SELECT COUNT(*) as count FROM staff')).count;
      const parentCount = (await get('SELECT COUNT(*) as count FROM parents')).count;

      const feeStats = await get(`
        SELECT COALESCE(SUM(total_fee), 0) as total,
               COALESCE(SUM(amount_paid), 0) as paid,
               COALESCE(SUM(amount_pending), 0) as pending
        FROM fees
      `);

      const todayAttendance = await get(`
        SELECT COUNT(*) as total,
               SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present
        FROM attendance
        WHERE date = ?
      `, [today]);

      const pendingLeaves = (await get("SELECT COUNT(*) as count FROM leave_requests WHERE status = 'Pending'")).count;
      const totalBooks = (await get("SELECT COALESCE(SUM(total_copies), 0) as count FROM books")).count;
      const borrowedBooks = (await get("SELECT COUNT(*) as count FROM library_transactions WHERE status = 'Issued'")).count;

      return res.json({
        role: 'admin',
        studentCount,
        teacherCount,
        staffCount,
        parentCount,
        fees: feeStats,
        todayAttendance: {
          total: todayAttendance.total || 0,
          present: todayAttendance.present || 0,
          rate: todayAttendance.total > 0 ? ((todayAttendance.present / todayAttendance.total) * 100).toFixed(1) : 0
        },
        pendingLeaves,
        library: { totalBooks, borrowedBooks }
      });
    }

    if (role === 'teacher') {
      const teacher = await get('SELECT * FROM teachers WHERE user_id = ?', [req.user.id]);
      if (!teacher) return res.status(404).json({ error: 'Teacher profile not found' });

      const subjects = await all('SELECT * FROM subjects WHERE teacher_id = ?', [teacher.id]);
      const pendingLeaves = (await get("SELECT COUNT(*) as count FROM leave_requests WHERE status = 'Pending'")).count;
      const myMaterialsCount = (await get('SELECT COUNT(*) as count FROM study_materials WHERE teacher_id = ?', [teacher.id])).count;
      
      const todayClasses = await all(`
        SELECT tt.*, sub.name as subject_name
        FROM timetable tt
        LEFT JOIN subjects sub ON tt.subject_id = sub.id
        WHERE tt.teacher_id = ?
      `, [teacher.id]);

      return res.json({
        role: 'teacher',
        teacher,
        subjectsCount: subjects.length,
        subjects,
        pendingLeaves,
        materialsCount: myMaterialsCount,
        todayClasses
      });
    }

    if (role === 'student') {
      const student = await get(`
        SELECT s.*, u.name, u.email, u.phone
        FROM students s
        JOIN users u ON s.user_id = u.id
        WHERE s.user_id = ?
      `, [req.user.id]);
      if (!student) return res.status(404).json({ error: 'Student profile not found' });

      const attRecords = await all('SELECT status FROM attendance WHERE student_id = ?', [student.id]);
      const totalAtt = attRecords.length;
      const presentAtt = attRecords.filter(a => a.status === 'present').length;
      const attRate = totalAtt > 0 ? ((presentAtt / totalAtt) * 100).toFixed(1) : 0;

      const fee = await get('SELECT * FROM fees WHERE student_id = ?', [student.id]);
      const pendingLeaves = (await get('SELECT COUNT(*) as count FROM leave_requests WHERE student_id = ? AND status = "Pending"', [student.id])).count;
      const borrowedBooks = (await get('SELECT COUNT(*) as count FROM library_transactions WHERE user_id = ? AND status = "Issued"', [req.user.id])).count;
      const subjectsCount = (await get('SELECT COUNT(*) as count FROM subjects WHERE class_year = ?', [student.class_year])).count;

      const semesterResults = await all(`
        SELECT * FROM semester_results 
        WHERE student_id = ? 
        ORDER BY semester ASC
      `, [student.id]);
      const latestSemester = semesterResults.length > 0 ? semesterResults[semesterResults.length - 1] : null;

      return res.json({
        role: 'student',
        student,
        cgpa: student.cgpa || (latestSemester ? latestSemester.cgpa : 0.0),
        latestSgpa: latestSemester ? latestSemester.sgpa : null,
        latestSemester: latestSemester ? latestSemester.semester : null,
        semesterResults,
        attendanceRate: attRate,
        totalAttendanceClasses: totalAtt,
        fee: fee || { total_fee: 0, amount_paid: 0, amount_pending: 0, status: 'N/A' },
        pendingLeaves,
        borrowedBooks,
        subjectsCount
      });
    }

    if (role === 'parent') {
      const parent = await get('SELECT * FROM parents WHERE user_id = ?', [req.user.id]);
      if (!parent) return res.status(404).json({ error: 'Parent record not found' });

      const children = await all(`
        SELECT s.*, u.name as student_name, u.phone as student_phone,
               f.total_fee, f.amount_paid, f.amount_pending, f.status as fee_status
        FROM students s
        JOIN users u ON s.user_id = u.id
        LEFT JOIN fees f ON f.student_id = s.id
        WHERE s.parent_id = ?
      `, [parent.id]);

      // For first child, calculate attendance and fetch semester results
      let firstChildAttRate = 0;
      let firstChildCgpa = 0.0;
      if (children.length > 0) {
        const attRecords = await all('SELECT status FROM attendance WHERE student_id = ?', [children[0].id]);
        const totalAtt = attRecords.length;
        const presentAtt = attRecords.filter(a => a.status === 'present').length;
        firstChildAttRate = totalAtt > 0 ? ((presentAtt / totalAtt) * 100).toFixed(1) : 0;
        firstChildCgpa = children[0].cgpa || 0.0;
      }

      return res.json({
        role: 'parent',
        parent,
        children,
        firstChildAttRate,
        firstChildCgpa
      });
    }

    // Staff roles
    const staff = await get('SELECT * FROM staff WHERE user_id = ?', [req.user.id]);
    return res.json({
      role,
      staff: staff || {}
    });
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics.' });
  }
});

module.exports = router;
