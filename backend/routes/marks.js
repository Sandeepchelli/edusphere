const express = require('express');
const router = express.Router();
const { get, all, run } = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');

// 10-point Choice Based Credit System (CBCS) grading scale
function calculateGradeAndPoint(percentage) {
  if (percentage >= 90) return { grade: 'O', gradePoint: 10 };
  if (percentage >= 80) return { grade: 'A+', gradePoint: 9 };
  if (percentage >= 70) return { grade: 'A', gradePoint: 8 };
  if (percentage >= 60) return { grade: 'B+', gradePoint: 7 };
  if (percentage >= 50) return { grade: 'B', gradePoint: 6 };
  if (percentage >= 40) return { grade: 'C', gradePoint: 5 };
  return { grade: 'F', gradePoint: 0 };
}

// Function to calculate and persist SGPA for all semesters and overall CGPA for a student
async function recalculateStudentCGPA(studentId) {
  try {
    const records = await all(`
      SELECT m.*, sub.credits as sub_credits, sub.semester as sub_semester, sub.name as sub_name
      FROM marks m
      JOIN subjects sub ON m.subject_id = sub.id
      WHERE m.student_id = ?
      ORDER BY m.semester ASC, m.id ASC
    `, [studentId]);

    if (!records || records.length === 0) {
      await run(`UPDATE students SET cgpa = 0.0 WHERE id = ?`, [studentId]);
      await run(`DELETE FROM semester_results WHERE student_id = ?`, [studentId]);
      return { overallCgpa: 0.0, semesterResults: [] };
    }

    // Group records by semester
    const semesterMap = {};
    for (const r of records) {
      const sem = (r.semester && r.semester.trim()) || (r.sub_semester && r.sub_semester.trim()) || 'Semester 1';
      if (!semesterMap[sem]) {
        semesterMap[sem] = [];
      }
      semesterMap[sem].push(r);
    }

    const semNames = Object.keys(semesterMap).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.replace(/\D/g, '')) || 0;
      return numA - numB;
    });

    let cumulativeTotalCredits = 0;
    let cumulativeWeightedPoints = 0;
    const semesterResults = [];

    for (const sem of semNames) {
      const semMarks = semesterMap[sem];
      const subjectMap = {};

      for (const m of semMarks) {
        const credits = (m.credits !== null && m.credits !== undefined && m.credits > 0)
          ? parseFloat(m.credits)
          : ((m.sub_credits && m.sub_credits > 0) ? parseFloat(m.sub_credits) : 3);

        let gradePoint = m.grade_point;
        if (gradePoint === null || gradePoint === undefined || isNaN(gradePoint) || gradePoint === '') {
          const pct = (m.marks_obtained / m.max_marks) * 100;
          gradePoint = calculateGradeAndPoint(pct).gradePoint;
        } else {
          gradePoint = parseFloat(gradePoint);
        }

        // If multiple assessments exist for the same subject in this semester,
        // prioritize 'Semester Exam' or the latest record
        if (!subjectMap[m.subject_id] || m.exam_type === 'Semester Exam' || m.id > subjectMap[m.subject_id].id) {
          subjectMap[m.subject_id] = {
            id: m.id,
            subject_id: m.subject_id,
            credits,
            gradePoint,
            grade: m.grade || calculateGradeAndPoint((m.marks_obtained / m.max_marks) * 100).grade
          };
        }
      }

      let semCredits = 0;
      let semEarnedCredits = 0;
      let semWeightedPoints = 0;

      for (const subId in subjectMap) {
        const item = subjectMap[subId];
        semCredits += item.credits;
        if (item.gradePoint > 0) {
          semEarnedCredits += item.credits;
        }
        semWeightedPoints += (item.credits * item.gradePoint);
      }

      const sgpa = semCredits > 0 ? parseFloat((semWeightedPoints / semCredits).toFixed(2)) : 0.0;
      cumulativeTotalCredits += semCredits;
      cumulativeWeightedPoints += semWeightedPoints;
      const cumulativeCgpa = cumulativeTotalCredits > 0 ? parseFloat((cumulativeWeightedPoints / cumulativeTotalCredits).toFixed(2)) : 0.0;

      // Upsert into semester_results
      await run(`
        INSERT INTO semester_results (student_id, semester, total_credits, earned_credits, total_grade_points, sgpa, cgpa, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(student_id, semester) DO UPDATE SET
          total_credits = excluded.total_credits,
          earned_credits = excluded.earned_credits,
          total_grade_points = excluded.total_grade_points,
          sgpa = excluded.sgpa,
          cgpa = excluded.cgpa,
          updated_at = CURRENT_TIMESTAMP
      `, [studentId, sem, semCredits, semEarnedCredits, semWeightedPoints, sgpa, cumulativeCgpa]);

      semesterResults.push({
        semester: sem,
        sgpa,
        cgpa: cumulativeCgpa,
        total_credits: semCredits,
        earned_credits: semEarnedCredits,
        total_grade_points: semWeightedPoints
      });
    }

    const overallCgpa = cumulativeTotalCredits > 0 ? parseFloat((cumulativeWeightedPoints / cumulativeTotalCredits).toFixed(2)) : 0.0;

    // Update students table
    await run(`UPDATE students SET cgpa = ? WHERE id = ?`, [overallCgpa, studentId]);

    return { overallCgpa, semesterResults };
  } catch (err) {
    console.error('Error recalculating CGPA for student:', studentId, err);
    return { overallCgpa: 0.0, semesterResults: [] };
  }
}

// GET /api/marks
// Students only view their own; Parents only view their child's; Admin/Teachers can filter
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { student_id, subject_id, exam_type, semester, class_year, section } = req.query;
    let sql = `
      SELECT m.*, 
             s.student_id as student_reg_id, s.roll_number, s.class_year, s.section, s.department as student_dept, s.cgpa as student_cgpa,
             u.name as student_name,
             sub.name as subject_name, sub.code as subject_code, sub.credits as subject_credits, sub.semester as subject_semester,
             tu.name as teacher_name
      FROM marks m
      JOIN students s ON m.student_id = s.id
      JOIN users u ON s.user_id = u.id
      JOIN subjects sub ON m.subject_id = sub.id
      LEFT JOIN teachers t ON m.teacher_id = t.id
      LEFT JOIN users tu ON t.user_id = tu.id
      WHERE 1=1
    `;
    const params = [];

    // Security check: if student, lock to their student_id
    if (req.user.role === 'student') {
      const student = await get('SELECT id FROM students WHERE user_id = ?', [req.user.id]);
      if (!student) return res.json([]);
      sql += ' AND m.student_id = ?';
      params.push(student.id);
    } else if (req.user.role === 'parent') {
      const parent = await get('SELECT id FROM parents WHERE user_id = ?', [req.user.id]);
      if (!parent) return res.json([]);
      const children = await all('SELECT id FROM students WHERE parent_id = ?', [parent.id]);
      const childIds = children.map(c => c.id);
      if (childIds.length === 0) return res.json([]);
      sql += ` AND m.student_id IN (${childIds.map(() => '?').join(',')})`;
      params.push(...childIds);
    } else {
      if (student_id) {
        sql += ' AND m.student_id = ?';
        params.push(student_id);
      }
    }

    if (subject_id) {
      sql += ' AND m.subject_id = ?';
      params.push(subject_id);
    }
    if (exam_type) {
      sql += ' AND m.exam_type = ?';
      params.push(exam_type);
    }
    if (semester) {
      sql += ' AND m.semester = ?';
      params.push(semester);
    }
    if (class_year) {
      sql += ' AND s.class_year = ?';
      params.push(class_year);
    }
    if (section) {
      sql += ' AND s.section = ?';
      params.push(section);
    }

    sql += ' ORDER BY m.id DESC';
    const marks = await all(sql, params);
    res.json(marks);
  } catch (err) {
    console.error('Error fetching marks:', err);
    res.status(500).json({ error: 'Failed to fetch marks.' });
  }
});

// GET /api/marks/my-results (Dedicated endpoint for student or parent's child)
router.get('/my-results', authenticateToken, async (req, res) => {
  try {
    let studentId = null;
    if (req.user.role === 'student') {
      const s = await get('SELECT id FROM students WHERE user_id = ?', [req.user.id]);
      if (s) studentId = s.id;
    } else if (req.user.role === 'parent') {
      const p = await get('SELECT id FROM parents WHERE user_id = ?', [req.user.id]);
      if (p) {
        const c = await get('SELECT id FROM students WHERE parent_id = ? LIMIT 1', [p.id]);
        if (c) studentId = c.id;
      }
    }

    if (!studentId) {
      return res.status(404).json({ error: 'Student record not found for this account.' });
    }

    const report = await generateStudentReport(studentId);
    res.json(report);
  } catch (err) {
    console.error('Error fetching my results:', err);
    res.status(500).json({ error: 'Failed to fetch academic results.' });
  }
});

// GET /api/marks/student-report/:id
router.get('/student-report/:id', authenticateToken, async (req, res) => {
  try {
    const studentId = req.params.id;

    // Security check: students cannot view other students' report
    if (req.user.role === 'student') {
      const myStudent = await get('SELECT id FROM students WHERE user_id = ?', [req.user.id]);
      if (!myStudent || myStudent.id != studentId) {
        return res.status(403).json({ error: 'Access denied: You can only view your own academic report.' });
      }
    } else if (req.user.role === 'parent') {
      const parent = await get('SELECT id FROM parents WHERE user_id = ?', [req.user.id]);
      if (!parent) return res.status(403).json({ error: 'Parent account not found.' });
      const child = await get('SELECT id FROM students WHERE id = ? AND parent_id = ?', [studentId, parent.id]);
      if (!child) {
        return res.status(403).json({ error: 'Access denied: You can only view your linked child.' });
      }
    }

    const report = await generateStudentReport(studentId);
    res.json(report);
  } catch (err) {
    console.error('Error generating student report:', err);
    res.status(500).json({ error: 'Failed to generate report.' });
  }
});

// Helper to generate full student academic report
async function generateStudentReport(studentId) {
  const student = await get(`
    SELECT s.*, u.name as student_name, u.email, u.phone
    FROM students s
    JOIN users u ON s.user_id = u.id
    WHERE s.id = ?
  `, [studentId]);

  if (!student) {
    throw new Error('Student not found');
  }

  // Ensure latest CGPA is calculated
  const { overallCgpa, semesterResults } = await recalculateStudentCGPA(studentId);

  const marksList = await all(`
    SELECT m.*, sub.name as subject_name, sub.code as subject_code, sub.credits as subject_credits
    FROM marks m
    JOIN subjects sub ON m.subject_id = sub.id
    WHERE m.student_id = ?
    ORDER BY m.semester ASC, sub.name ASC, m.exam_type ASC
  `, [studentId]);

  let totalObtained = 0;
  let totalMax = 0;
  marksList.forEach(m => {
    totalObtained += m.marks_obtained;
    totalMax += m.max_marks;
  });

  const overallPercentage = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(2) : '0.00';
  const overallGrade = calculateGradeAndPoint(parseFloat(overallPercentage)).grade;

  return {
    student,
    overallCgpa: overallCgpa || 0.0,
    semesterResults: semesterResults || [],
    marks: marksList,
    summary: {
      totalObtained,
      totalMax,
      overallPercentage,
      overallGrade,
      overallCgpa: overallCgpa || 0.0
    }
  };
}

// POST /api/marks (Teacher & Admin only)
router.post('/', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const {
      student_id,
      subject_id,
      semester,
      exam_type,
      marks_obtained,
      max_marks,
      credits,
      grade,
      grade_point,
      remarks
    } = req.body;

    if (!student_id || !subject_id || !exam_type || marks_obtained === undefined || !max_marks) {
      return res.status(400).json({ error: 'Student, subject, exam type, obtained marks, and maximum marks are required.' });
    }

    const obtained = parseFloat(marks_obtained);
    const max = parseFloat(max_marks);
    if (isNaN(obtained) || isNaN(max) || max <= 0 || obtained < 0 || obtained > max) {
      return res.status(400).json({ error: 'Please enter valid mark values (0 <= obtained <= max).' });
    }

    // Teacher department permission check
    if (req.user.role === 'teacher') {
      const teacher = await get('SELECT * FROM teachers WHERE user_id = ?', [req.user.id]);
      const student = await get('SELECT * FROM students WHERE id = ?', [student_id]);
      const subject = await get('SELECT * FROM subjects WHERE id = ?', [subject_id]);

      if (teacher && teacher.department) {
        if ((student && student.department && student.department !== teacher.department) ||
            (subject && subject.department && subject.department !== teacher.department)) {
          return res.status(403).json({
            error: `Access denied: You are only authorized to enter marks for your department (${teacher.department}).`
          });
        }
      }
    }

    // Determine subject and semester defaults
    const subject = await get('SELECT * FROM subjects WHERE id = ?', [subject_id]);
    const targetSemester = (semester && semester.trim()) || (subject && subject.semester) || 'Semester 1';
    const targetCredits = (credits !== undefined && credits !== '' && !isNaN(parseFloat(credits)))
      ? parseFloat(credits)
      : (subject && subject.credits ? parseFloat(subject.credits) : 3.0);

    const percentage = (obtained / max) * 100;
    const computed = calculateGradeAndPoint(percentage);
    const finalGrade = (grade && grade.trim()) || computed.grade;
    const finalGradePoint = (grade_point !== undefined && grade_point !== '' && !isNaN(parseFloat(grade_point)))
      ? parseFloat(grade_point)
      : computed.gradePoint;

    let teacherId = null;
    if (req.user.role === 'teacher') {
      const teacher = await get('SELECT id FROM teachers WHERE user_id = ?', [req.user.id]);
      if (teacher) teacherId = teacher.id;
    }

    const result = await run(`
      INSERT INTO marks (student_id, subject_id, semester, exam_type, marks_obtained, max_marks, credits, grade, grade_point, remarks, teacher_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [student_id, subject_id, targetSemester, exam_type, obtained, max, targetCredits, finalGrade, finalGradePoint, remarks || null, teacherId]);

    // Recalculate SGPA and CGPA
    const { overallCgpa, semesterResults } = await recalculateStudentCGPA(student_id);

    // Send notifications
    const studentInfo = await get(`
      SELECT s.user_id as student_user_id, p.user_id as parent_user_id, sub.name as subject_name, u.name as student_name
      FROM students s
      JOIN users u ON s.user_id = u.id
      JOIN subjects sub ON sub.id = ?
      LEFT JOIN parents p ON s.parent_id = p.id
      WHERE s.id = ?
    `, [subject_id, student_id]);

    if (studentInfo) {
      const notifMsg = `${exam_type} marks announced for ${studentInfo.subject_name} (${targetSemester}): ${obtained}/${max} (Grade: ${finalGrade}, Grade Point: ${finalGradePoint}). Updated CGPA: ${overallCgpa}.`;
      await run(`
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (?, 'New Marks & CGPA Updated', ?, 'marks')
      `, [studentInfo.student_user_id, notifMsg]);

      if (studentInfo.parent_user_id) {
        await run(`
          INSERT INTO notifications (user_id, title, message, type)
          VALUES (?, 'Child Academic Update', ?, 'marks')
        `, [studentInfo.parent_user_id, `Marks for ${studentInfo.student_name}: ` + notifMsg]);
      }
    }

    res.status(201).json({
      message: 'Marks recorded and CGPA recalculated successfully',
      id: result.id,
      grade: finalGrade,
      gradePoint: finalGradePoint,
      cgpa: overallCgpa,
      semesterResults
    });
  } catch (err) {
    console.error('Error saving marks:', err);
    res.status(500).json({ error: 'Failed to record marks.' });
  }
});

// PUT /api/marks/:id (Teacher & Admin only)
router.put('/:id', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const {
      marks_obtained,
      max_marks,
      semester,
      credits,
      grade,
      grade_point,
      remarks
    } = req.body;

    const existing = await get(`
      SELECT m.*, s.department as student_dept, sub.department as subject_dept
      FROM marks m
      JOIN students s ON m.student_id = s.id
      JOIN subjects sub ON m.subject_id = sub.id
      WHERE m.id = ?
    `, [req.params.id]);

    if (!existing) {
      return res.status(404).json({ error: 'Marks record not found.' });
    }

    // Teacher department permission check
    if (req.user.role === 'teacher') {
      const teacher = await get('SELECT * FROM teachers WHERE user_id = ?', [req.user.id]);
      if (teacher && teacher.department) {
        if ((existing.student_dept && existing.student_dept !== teacher.department) ||
            (existing.subject_dept && existing.subject_dept !== teacher.department)) {
          return res.status(403).json({
            error: `Access denied: You can only edit marks for your department (${teacher.department}).`
          });
        }
      }
    }

    const obtained = marks_obtained !== undefined ? parseFloat(marks_obtained) : existing.marks_obtained;
    const max = max_marks !== undefined ? parseFloat(max_marks) : existing.max_marks;
    const targetSemester = semester !== undefined ? semester : existing.semester;
    const targetCredits = credits !== undefined ? parseFloat(credits) : (existing.credits || 3);

    const percentage = (obtained / max) * 100;
    const computed = calculateGradeAndPoint(percentage);
    const finalGrade = (grade && grade.trim()) || computed.grade;
    const finalGradePoint = (grade_point !== undefined && grade_point !== '' && !isNaN(parseFloat(grade_point)))
      ? parseFloat(grade_point)
      : computed.gradePoint;

    await run(`
      UPDATE marks
      SET marks_obtained = ?,
          max_marks = ?,
          semester = ?,
          credits = ?,
          grade = ?,
          grade_point = ?,
          remarks = COALESCE(?, remarks)
      WHERE id = ?
    `, [obtained, max, targetSemester, targetCredits, finalGrade, finalGradePoint, remarks, req.params.id]);

    // Recalculate SGPA and CGPA
    const { overallCgpa, semesterResults } = await recalculateStudentCGPA(existing.student_id);

    res.json({
      message: 'Marks updated and CGPA recalculated successfully',
      grade: finalGrade,
      gradePoint: finalGradePoint,
      cgpa: overallCgpa,
      semesterResults
    });
  } catch (err) {
    console.error('Error updating marks:', err);
    res.status(500).json({ error: 'Failed to update marks.' });
  }
});

// DELETE /api/marks/:id
router.delete('/:id', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const existing = await get(`
      SELECT m.*, s.department as student_dept, sub.department as subject_dept
      FROM marks m
      JOIN students s ON m.student_id = s.id
      JOIN subjects sub ON m.subject_id = sub.id
      WHERE m.id = ?
    `, [req.params.id]);

    if (!existing) {
      return res.status(404).json({ error: 'Marks record not found.' });
    }

    // Teacher department permission check
    if (req.user.role === 'teacher') {
      const teacher = await get('SELECT * FROM teachers WHERE user_id = ?', [req.user.id]);
      if (teacher && teacher.department) {
        if ((existing.student_dept && existing.student_dept !== teacher.department) ||
            (existing.subject_dept && existing.subject_dept !== teacher.department)) {
          return res.status(403).json({
            error: `Access denied: You can only delete marks for your department (${teacher.department}).`
          });
        }
      }
    }

    await run('DELETE FROM marks WHERE id = ?', [req.params.id]);

    // Recalculate CGPA
    const { overallCgpa } = await recalculateStudentCGPA(existing.student_id);

    res.json({ message: 'Marks record deleted and CGPA updated.', cgpa: overallCgpa });
  } catch (err) {
    console.error('Error deleting marks:', err);
    res.status(500).json({ error: 'Failed to delete marks record.' });
  }
});

module.exports = router;
module.exports.recalculateStudentCGPA = recalculateStudentCGPA;
