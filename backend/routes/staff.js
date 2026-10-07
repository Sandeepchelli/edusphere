const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { get, all, run } = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET /api/staff
// Admin can view all; removed staff are excluded from active lists
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { role, search, status } = req.query;
    let sql = `
      SELECT s.*, u.username, u.name as staff_name, u.email, u.phone, u.profile_photo, u.status as account_status
      FROM staff s
      JOIN users u ON s.user_id = u.id
      WHERE u.status != 'removed'
    `;
    const params = [];

    if (status && status !== 'all') {
      sql += ' AND u.status = ?';
      params.push(status);
    }
    if (role) {
      sql += ' AND s.role = ?';
      params.push(role);
    }
    if (search) {
      sql += ' AND (u.name LIKE ? OR s.staff_id LIKE ? OR s.role LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY s.id DESC';
    const staffList = await all(sql, params);
    res.json(staffList);
  } catch (err) {
    console.error('Error fetching staff:', err);
    res.status(500).json({ error: 'Failed to fetch staff members.' });
  }
});

// GET /api/staff/:id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const staff = await get(`
      SELECT s.*, u.username, u.name as staff_name, u.email, u.phone, u.profile_photo, u.status as account_status
      FROM staff s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ?
    `, [req.params.id]);

    if (!staff) {
      return res.status(404).json({ error: 'Staff member not found.' });
    }
    res.json(staff);
  } catch (err) {
    console.error('Error fetching staff member:', err);
    res.status(500).json({ error: 'Failed to fetch staff member details.' });
  }
});

// POST /api/staff (Admin only)
router.post('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const {
      name, staff_id, username, password, phone, email,
      role, department, profile_photo, salary, joining_date,
      vehicle_number, route, bus_stops
    } = req.body;

    const validRoles = ['library_staff', 'cashier', 'driver', 'watchman', 'attender', 'lab_technician'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid staff role provided.' });
    }

    if (!name || !staff_id || !username || !password || !role) {
      return res.status(400).json({ error: 'Name, Staff ID, username, password, and role are required.' });
    }

    const existingUser = await get('SELECT id FROM users WHERE username = ? COLLATE NOCASE', [username.trim()]);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already in use.' });
    }

    const existingStaffId = await get('SELECT id FROM staff WHERE staff_id = ?', [staff_id.trim()]);
    if (existingStaffId) {
      return res.status(400).json({ error: 'Staff ID already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPw = await bcrypt.hash(password, salt);

    const userRes = await run(`
      INSERT INTO users (username, password, role, name, email, phone, profile_photo)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [username.trim(), hashedPw, role, name.trim(), email || null, phone || null, profile_photo || null]);

    const staffRes = await run(`
      INSERT INTO staff (user_id, staff_id, role, department, salary, joining_date, vehicle_number, route, bus_stops)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      userRes.id,
      staff_id.trim(),
      role,
      department || null,
      salary ? parseFloat(salary) : 0,
      joining_date || new Date().toISOString().split('T')[0],
      vehicle_number || null,
      route || null,
      bus_stops || null
    ]);

    res.status(201).json({
      message: 'Staff member added successfully',
      id: staffRes.id
    });
  } catch (err) {
    console.error('Error creating staff:', err);
    res.status(500).json({ error: 'Failed to create staff member.' });
  }
});

// PUT /api/staff/:id (Admin only)
router.put('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const {
      name, phone, email, role, department, profile_photo, salary, joining_date,
      vehicle_number, route, bus_stops, account_status, new_password
    } = req.body;

    const staff = await get('SELECT * FROM staff WHERE id = ?', [req.params.id]);
    if (!staff) {
      return res.status(404).json({ error: 'Staff member not found.' });
    }

    // Update user info
    await run(`
      UPDATE users
      SET name = COALESCE(?, name),
          email = COALESCE(?, email),
          phone = COALESCE(?, phone),
          profile_photo = COALESCE(?, profile_photo),
          status = COALESCE(?, status),
          role = COALESCE(?, role)
      WHERE id = ?
    `, [name, email, phone, profile_photo, account_status, role, staff.user_id]);

    if (new_password && new_password.trim().length >= 6) {
      const salt = await bcrypt.genSalt(10);
      const hashed = await bcrypt.hash(new_password.trim(), salt);
      await run('UPDATE users SET password = ? WHERE id = ?', [hashed, staff.user_id]);
    }

    // Update staff table
    await run(`
      UPDATE staff
      SET role = COALESCE(?, role),
          department = COALESCE(?, department),
          salary = COALESCE(?, salary),
          joining_date = COALESCE(?, joining_date),
          vehicle_number = COALESCE(?, vehicle_number),
          route = COALESCE(?, route),
          bus_stops = COALESCE(?, bus_stops)
      WHERE id = ?
    `, [
      role,
      department,
      salary !== undefined ? parseFloat(salary) : null,
      joining_date,
      vehicle_number,
      route,
      bus_stops,
      req.params.id
    ]);

    res.json({ message: 'Staff member updated successfully.' });
  } catch (err) {
    console.error('Error updating staff:', err);
    res.status(500).json({ error: 'Failed to update staff member.' });
  }
});

// PATCH /api/staff/:id/disable - Disable staff login without removing records
router.patch('/:id/disable', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const staff = await get('SELECT * FROM staff WHERE id = ?', [req.params.id]);
    if (!staff) {
      return res.status(404).json({ error: 'Staff member not found.' });
    }
    await run('UPDATE users SET status = ? WHERE id = ?', ['disabled', staff.user_id]);
    res.json({ message: 'Staff account disabled. Login access revoked.' });
  } catch (err) {
    console.error('Disable staff error:', err);
    res.status(500).json({ error: 'Failed to disable staff account.' });
  }
});

// DELETE /api/staff/:id - Soft-remove: disables login, preserves historical records
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const staff = await get(
      'SELECT s.*, u.username FROM staff s JOIN users u ON s.user_id = u.id WHERE s.id = ?',
      [req.params.id]
    );
    if (!staff) {
      return res.status(404).json({ error: 'Staff member not found.' });
    }

    // Soft-remove: scramble credentials so login is impossible, mark as removed
    const removedUsername = `__removed_${Date.now()}_${staff.username}`;
    const dummyHash = await require('bcryptjs').hash(require('crypto').randomBytes(32).toString('hex'), 10);
    await run(
      `UPDATE users SET status = 'removed', username = ?, password = ? WHERE id = ?`,
      [removedUsername, dummyHash, staff.user_id]
    );

    // Historical salary, attendance records are preserved.
    res.json({ message: 'Staff member removed successfully. Historical records preserved.' });
  } catch (err) {
    console.error('Remove staff error:', err);
    res.status(500).json({ error: 'Failed to remove staff member.' });
  }
});

module.exports = router;
