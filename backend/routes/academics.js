const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { get, all, run } = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Multer storage for study materials and docs
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// =======================
// SUBJECTS
// =======================
router.get('/subjects', authenticateToken, async (req, res) => {
  try {
    const { department, class_year, teacher_id } = req.query;
    let sql = `
      SELECT sub.*, t.teacher_id as teacher_reg_id, u.name as teacher_name
      FROM subjects sub
      LEFT JOIN teachers t ON sub.teacher_id = t.id
      LEFT JOIN users u ON t.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (department) {
      sql += ' AND sub.department = ?';
      params.push(department);
    }
    if (class_year) {
      sql += ' AND sub.class_year = ?';
      params.push(class_year);
    }
    if (teacher_id) {
      sql += ' AND sub.teacher_id = ?';
      params.push(teacher_id);
    }

    sql += ' ORDER BY sub.class_year, sub.name';
    const subjects = await all(sql, params);
    res.json(subjects);
  } catch (err) {
    console.error('Error fetching subjects:', err);
    res.status(500).json({ error: 'Failed to fetch subjects.' });
  }
});

router.post('/subjects', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { code, name, department, class_year, semester, teacher_id } = req.body;
    if (!code || !name || !department || !class_year) {
      return res.status(400).json({ error: 'Code, name, department, and class year are required.' });
    }

    const result = await run(`
      INSERT INTO subjects (code, name, department, class_year, semester, teacher_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [code.trim(), name.trim(), department.trim(), class_year, semester || null, teacher_id || null]);

    res.status(201).json({ message: 'Subject created successfully', id: result.id });
  } catch (err) {
    console.error('Error creating subject:', err);
    res.status(500).json({ error: 'Failed to create subject.' });
  }
});

router.put('/subjects/:id', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { code, name, department, class_year, semester, teacher_id } = req.body;
    await run(`
      UPDATE subjects
      SET code = COALESCE(?, code),
          name = COALESCE(?, name),
          department = COALESCE(?, department),
          class_year = COALESCE(?, class_year),
          semester = COALESCE(?, semester),
          teacher_id = COALESCE(?, teacher_id)
      WHERE id = ?
    `, [code, name, department, class_year, semester, teacher_id, req.params.id]);

    res.json({ message: 'Subject updated successfully.' });
  } catch (err) {
    console.error('Error updating subject:', err);
    res.status(500).json({ error: 'Failed to update subject.' });
  }
});

router.delete('/subjects/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    await run('DELETE FROM subjects WHERE id = ?', [req.params.id]);
    res.json({ message: 'Subject deleted successfully.' });
  } catch (err) {
    console.error('Error deleting subject:', err);
    res.status(500).json({ error: 'Failed to delete subject.' });
  }
});

// =======================
// STUDY MATERIALS
// =======================
router.get('/study-materials', authenticateToken, async (req, res) => {
  try {
    const { subject_id, department, class_year } = req.query;
    let sql = `
      SELECT sm.*, sub.name as subject_name, sub.code as subject_code, sub.department, sub.class_year,
             u.name as teacher_name
      FROM study_materials sm
      JOIN subjects sub ON sm.subject_id = sub.id
      JOIN teachers t ON sm.teacher_id = t.id
      JOIN users u ON t.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (subject_id) {
      sql += ' AND sm.subject_id = ?';
      params.push(subject_id);
    }
    if (department) {
      sql += ' AND sub.department = ?';
      params.push(department);
    }
    if (class_year) {
      sql += ' AND sub.class_year = ?';
      params.push(class_year);
    }

    sql += ' ORDER BY sm.id DESC';
    const materials = await all(sql, params);
    res.json(materials);
  } catch (err) {
    console.error('Error fetching materials:', err);
    res.status(500).json({ error: 'Failed to fetch study materials.' });
  }
});

router.post('/study-materials', authenticateToken, requireRole(['admin', 'teacher']), upload.single('file'), async (req, res) => {
  try {
    const { subject_id, title, description, external_link } = req.body;
    if (!subject_id || !title) {
      return res.status(400).json({ error: 'Subject and title are required.' });
    }

    // Identify teacher_id
    let teacherId = null;
    if (req.user.role === 'teacher') {
      const teacher = await get('SELECT id FROM teachers WHERE user_id = ?', [req.user.id]);
      if (teacher) teacherId = teacher.id;
    } else {
      // If admin, find the teacher linked to this subject or any teacher
      const sub = await get('SELECT teacher_id FROM subjects WHERE id = ?', [subject_id]);
      if (sub && sub.teacher_id) {
        teacherId = sub.teacher_id;
      } else {
        const anyTeacher = await get('SELECT id FROM teachers LIMIT 1');
        teacherId = anyTeacher ? anyTeacher.id : null;
      }
    }

    if (!teacherId) {
      return res.status(400).json({ error: 'Please assign a teacher to this subject before adding materials.' });
    }

    let fileUrl = external_link || null;
    let fileName = null;

    if (req.file) {
      fileUrl = `/uploads/${req.file.filename}`;
      fileName = req.file.originalname;
    }

    const today = new Date().toISOString().split('T')[0];
    const result = await run(`
      INSERT INTO study_materials (subject_id, teacher_id, title, description, file_url, file_name, date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [subject_id, teacherId, title.trim(), description || null, fileUrl, fileName, today]);

    res.status(201).json({ message: 'Study material uploaded successfully', id: result.id });
  } catch (err) {
    console.error('Error adding study material:', err);
    res.status(500).json({ error: 'Failed to add study material.' });
  }
});

router.delete('/study-materials/:id', authenticateToken, requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const item = await get('SELECT * FROM study_materials WHERE id = ?', [req.params.id]);
    if (!item) {
      return res.status(404).json({ error: 'Material not found.' });
    }

    // If teacher, verify ownership
    if (req.user.role === 'teacher') {
      const teacher = await get('SELECT id FROM teachers WHERE user_id = ?', [req.user.id]);
      if (!teacher || teacher.id !== item.teacher_id) {
        return res.status(403).json({ error: 'You are only permitted to delete your own materials.' });
      }
    }

    await run('DELETE FROM study_materials WHERE id = ?', [req.params.id]);
    res.json({ message: 'Study material removed successfully.' });
  } catch (err) {
    console.error('Error deleting study material:', err);
    res.status(500).json({ error: 'Failed to delete study material.' });
  }
});

// =======================
// TIMETABLE
// =======================
router.get('/timetable', authenticateToken, async (req, res) => {
  try {
    const { class_year, section, teacher_id, day } = req.query;
    let sql = `
      SELECT tt.*, sub.name as subject_name, sub.code as subject_code,
             u.name as teacher_name
      FROM timetable tt
      LEFT JOIN subjects sub ON tt.subject_id = sub.id
      LEFT JOIN teachers t ON tt.teacher_id = t.id
      LEFT JOIN users u ON t.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (class_year) {
      sql += ' AND tt.class_year = ?';
      params.push(class_year);
    }
    if (section) {
      sql += ' AND tt.section = ?';
      params.push(section);
    }
    if (teacher_id) {
      sql += ' AND tt.teacher_id = ?';
      params.push(teacher_id);
    }
    if (day) {
      sql += ' AND tt.day = ?';
      params.push(day);
    }

    sql += ' ORDER BY CASE tt.day WHEN "Monday" THEN 1 WHEN "Tuesday" THEN 2 WHEN "Wednesday" THEN 3 WHEN "Thursday" THEN 4 WHEN "Friday" THEN 5 WHEN "Saturday" THEN 6 ELSE 7 END, tt.period ASC';
    const schedule = await all(sql, params);
    res.json(schedule);
  } catch (err) {
    console.error('Error fetching timetable:', err);
    res.status(500).json({ error: 'Failed to fetch timetable.' });
  }
});

router.post('/timetable', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { day, period, time, subject_id, teacher_id, class_year, section, room } = req.body;
    if (!day || !period || !time || !class_year || !section) {
      return res.status(400).json({ error: 'Day, period, time, class, and section are required.' });
    }

    const result = await run(`
      INSERT INTO timetable (day, period, time, subject_id, teacher_id, class_year, section, room)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [day, period, time, subject_id || null, teacher_id || null, class_year, section, room || null]);

    res.status(201).json({ message: 'Timetable entry added successfully', id: result.id });
  } catch (err) {
    console.error('Error adding timetable entry:', err);
    res.status(500).json({ error: 'Failed to add timetable entry.' });
  }
});

router.delete('/timetable/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    await run('DELETE FROM timetable WHERE id = ?', [req.params.id]);
    res.json({ message: 'Timetable entry deleted successfully.' });
  } catch (err) {
    console.error('Error deleting timetable entry:', err);
    res.status(500).json({ error: 'Failed to delete timetable entry.' });
  }
});

module.exports = router;
