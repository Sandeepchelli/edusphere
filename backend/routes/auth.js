const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { get, run } = require('../database');
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const user = await get('SELECT * FROM users WHERE username = ? COLLATE NOCASE', [username.trim()]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    if (user.status === 'disabled') {
      return res.status(403).json({ error: 'Your account has been deactivated. Please contact the administrator.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    // Role-specific extra information
    let roleData = {};
    if (user.role === 'student') {
      const student = await get('SELECT * FROM students WHERE user_id = ?', [user.id]);
      if (student) {
        roleData = { 
          student_id: student.id, 
          student_reg_id: student.student_id, 
          class_year: student.class_year, 
          department: student.department, 
          section: student.section, 
          parent_id: student.parent_id,
          cgpa: student.cgpa || 0 
        };
      }
    } else if (user.role === 'teacher') {
      const teacher = await get('SELECT * FROM teachers WHERE user_id = ?', [user.id]);
      if (teacher) {
        roleData = { teacher_id: teacher.id, teacher_reg_id: teacher.teacher_id, department: teacher.department, subject: teacher.subject, can_add_students: teacher.can_add_students };
      }
    } else if (user.role === 'parent') {
      const parent = await get('SELECT * FROM parents WHERE user_id = ?', [user.id]);
      if (parent) {
        roleData = { parent_id: parent.id, parent_name: parent.parent_name };
      }
    } else if (['cashier', 'driver', 'library_staff', 'watchman', 'attender', 'lab_technician'].includes(user.role)) {
      const staff = await get('SELECT * FROM staff WHERE user_id = ?', [user.id]);
      if (staff) {
        roleData = { staff_id: staff.id, staff_reg_id: staff.staff_id, department: staff.department };
      }
    }

    const tokenPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      email: user.email,
      ...roleData
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
        email: user.email,
        phone: user.phone,
        profile_photo: user.profile_photo,
        ...roleData
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during authentication.' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await get('SELECT id, username, role, name, email, phone, profile_photo, status, created_at FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    let roleData = {};
    if (user.role === 'student') {
      const student = await get(`
        SELECT s.*, p.parent_name, p.parent_phone, p.parent_email
        FROM students s
        LEFT JOIN parents p ON s.parent_id = p.id
        WHERE s.user_id = ?
      `, [user.id]);
      roleData = student || {};
    } else if (user.role === 'teacher') {
      const teacher = await get('SELECT * FROM teachers WHERE user_id = ?', [user.id]);
      roleData = teacher || {};
    } else if (user.role === 'parent') {
      const parent = await get('SELECT * FROM parents WHERE user_id = ?', [user.id]);
      if (parent) {
        const children = await get('SELECT s.*, u.name as student_name FROM students s JOIN users u ON s.user_id = u.id WHERE s.parent_id = ?', [parent.id]);
        roleData = { ...parent, children };
      }
    } else if (['cashier', 'driver', 'library_staff', 'watchman', 'attender', 'lab_technician'].includes(user.role)) {
      const staff = await get('SELECT * FROM staff WHERE user_id = ?', [user.id]);
      roleData = staff || {};
    }

    res.json({ user: { ...user, roleDetails: roleData } });
  } catch (err) {
    console.error('Me endpoint error:', err);
    res.status(500).json({ error: 'Failed to fetch user details.' });
  }
});

// PUT /api/auth/profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, email, phone, profile_photo } = req.body;
    await run(`
      UPDATE users
      SET name = COALESCE(?, name),
          email = COALESCE(?, email),
          phone = COALESCE(?, phone),
          profile_photo = COALESCE(?, profile_photo)
      WHERE id = ?
    `, [name, email, phone, profile_photo, req.user.id]);

    const updatedUser = await get('SELECT id, username, role, name, email, phone, profile_photo FROM users WHERE id = ?', [req.user.id]);
    res.json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// PUT /api/auth/change-password
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Current password and new password are required.' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }

    const user = await get('SELECT password FROM users WHERE id = ?', [req.user.id]);
    const isMatch = await bcrypt.compare(current_password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(new_password, salt);
    await run('UPDATE users SET password = ? WHERE id = ?', [hashed, req.user.id]);

    res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Failed to update password.' });
  }
});

module.exports = router;
