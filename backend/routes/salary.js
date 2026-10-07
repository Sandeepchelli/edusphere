const express = require('express');
const router = express.Router();
const { get, all, run } = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET /api/salaries
// Admin sees all; Teachers & Staff can view their own
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { month_year, status } = req.query;
    let sql = `
      SELECT sal.*, u.name as employee_name, u.role as employee_role, u.email, u.phone,
             COALESCE(t.department, st.department) as department
      FROM salaries sal
      JOIN users u ON sal.user_id = u.id
      LEFT JOIN teachers t ON t.user_id = u.id
      LEFT JOIN staff st ON st.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    // If not admin, restrict to logged-in user's own salaries
    if (req.user.role !== 'admin') {
      sql += ' AND sal.user_id = ?';
      params.push(req.user.id);
    }

    if (month_year) {
      sql += ' AND sal.month_year = ?';
      params.push(month_year);
    }
    if (status) {
      sql += ' AND sal.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY sal.id DESC';
    const records = await all(sql, params);
    res.json(records);
  } catch (err) {
    console.error('Error fetching salaries:', err);
    res.status(500).json({ error: 'Failed to fetch salary records.' });
  }
});

// POST /api/salaries (Admin only)
// Record or issue salary
router.post('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { user_id, month_year, base_salary, amount_paid, payment_date, payment_method } = req.body;
    if (!user_id || !month_year || base_salary === undefined) {
      return res.status(400).json({ error: 'User, month/year, and base salary are required.' });
    }

    const base = parseFloat(base_salary);
    const paid = amount_paid !== undefined ? parseFloat(amount_paid) : base;
    const pending = Math.max(0, base - paid);
    const status = pending === 0 ? 'Paid' : (paid > 0 ? 'Partial' : 'Pending');
    const pDate = payment_date || new Date().toISOString().split('T')[0];
    const pMethod = payment_method || 'Bank Transfer';

    const result = await run(`
      INSERT INTO salaries (user_id, month_year, base_salary, amount_paid, amount_pending, payment_date, status, payment_method)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [user_id, month_year, base, paid, pending, pDate, status, pMethod]);

    // Send notification to employee
    await run(`
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (?, 'Salary Processed', ?, 'salary')
    `, [user_id, `Your salary for ${month_year} has been processed ($${paid} paid, status: ${status}).`]);

    res.status(201).json({ message: 'Salary recorded successfully', id: result.id });
  } catch (err) {
    console.error('Error saving salary record:', err);
    res.status(500).json({ error: 'Failed to record salary.' });
  }
});

// PUT /api/salaries/:id (Admin only)
router.put('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { amount_paid, payment_date, payment_method } = req.body;
    const sal = await get('SELECT * FROM salaries WHERE id = ?', [req.params.id]);
    if (!sal) {
      return res.status(404).json({ error: 'Salary record not found.' });
    }

    const paid = amount_paid !== undefined ? parseFloat(amount_paid) : sal.amount_paid;
    const pending = Math.max(0, sal.base_salary - paid);
    const status = pending === 0 ? 'Paid' : (paid > 0 ? 'Partial' : 'Pending');

    await run(`
      UPDATE salaries
      SET amount_paid = ?, amount_pending = ?, payment_date = COALESCE(?, payment_date),
          payment_method = COALESCE(?, payment_method), status = ?
      WHERE id = ?
    `, [paid, pending, payment_date, payment_method, status, req.params.id]);

    res.json({ message: 'Salary record updated successfully.' });
  } catch (err) {
    console.error('Error updating salary:', err);
    res.status(500).json({ error: 'Failed to update salary.' });
  }
});

module.exports = router;
