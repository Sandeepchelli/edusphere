const express = require('express');
const router = express.Router();
const { get, all, run } = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET /api/fees
// Cashier and Admin see all; Students and Parents see their own
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { student_id, search, status } = req.query;
    let sql = `
      SELECT f.*, 
             s.student_id as student_reg_id, s.class_year, s.section, s.department,
             u.name as student_name, u.phone as student_phone,
             (SELECT MAX(payment_date) FROM payments WHERE fee_id = f.id) as last_payment_date
      FROM fees f
      JOIN students s ON f.student_id = s.id
      JOIN users u ON s.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role === 'student') {
      const student = await get('SELECT id FROM students WHERE user_id = ?', [req.user.id]);
      if (!student) return res.json([]);
      sql += ' AND f.student_id = ?';
      params.push(student.id);
    } else if (req.user.role === 'parent') {
      const parent = await get('SELECT id FROM parents WHERE user_id = ?', [req.user.id]);
      if (!parent) return res.json([]);
      const children = await all('SELECT id FROM students WHERE parent_id = ?', [parent.id]);
      const childIds = children.map(c => c.id);
      if (childIds.length === 0) return res.json([]);
      sql += ` AND f.student_id IN (${childIds.map(() => '?').join(',')})`;
      params.push(...childIds);
    } else if (student_id) {
      sql += ' AND f.student_id = ?';
      params.push(student_id);
    }

    if (status) {
      sql += ' AND f.status = ?';
      params.push(status);
    }
    if (search) {
      sql += ' AND (u.name LIKE ? OR s.student_id LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY f.id DESC';
    const feeRecords = await all(sql, params);
    res.json(feeRecords);
  } catch (err) {
    console.error('Error fetching fees:', err);
    res.status(500).json({ error: 'Failed to fetch fee records.' });
  }
});

// POST /api/fees/assign (Admin & Cashier only)
// Assign or update fee structure for a student
router.post('/assign', authenticateToken, requireRole(['admin', 'cashier']), async (req, res) => {
  try {
    const { student_id, academic_year, total_fee, due_date } = req.body;
    if (!student_id || !total_fee) {
      return res.status(400).json({ error: 'Student and total fee amount are required.' });
    }

    const total = parseFloat(total_fee);
    const existing = await get('SELECT * FROM fees WHERE student_id = ?', [student_id]);

    if (existing) {
      const pending = Math.max(0, total - existing.amount_paid);
      const status = pending === 0 ? 'Paid' : (existing.amount_paid > 0 ? 'Partial' : 'Pending');
      await run(`
        UPDATE fees
        SET total_fee = ?, amount_pending = ?, due_date = COALESCE(?, due_date), status = ?
        WHERE id = ?
      `, [total, pending, due_date, status, existing.id]);
      res.json({ message: 'Fee updated successfully', id: existing.id });
    } else {
      const result = await run(`
        INSERT INTO fees (student_id, academic_year, total_fee, amount_paid, amount_pending, due_date, status)
        VALUES (?, ?, ?, 0, ?, ?, 'Pending')
      `, [student_id, academic_year || '2026-2027', total, total, due_date || null]);
      res.status(201).json({ message: 'Fee assigned successfully', id: result.id });
    }
  } catch (err) {
    console.error('Error assigning fee:', err);
    res.status(500).json({ error: 'Failed to assign fee.' });
  }
});

// GET /api/fees/payments
// List payments (optionally by fee_id or student_id)
router.get('/payments', authenticateToken, async (req, res) => {
  try {
    const { fee_id, student_id } = req.query;
    let sql = `
      SELECT p.*, s.student_id as student_reg_id, u.name as student_name, recorder.name as recorded_by_name
      FROM payments p
      JOIN students s ON p.student_id = s.id
      JOIN users u ON s.user_id = u.id
      LEFT JOIN users recorder ON p.recorded_by = recorder.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role === 'student') {
      const student = await get('SELECT id FROM students WHERE user_id = ?', [req.user.id]);
      if (!student) return res.json([]);
      sql += ' AND p.student_id = ?';
      params.push(student.id);
    } else if (req.user.role === 'parent') {
      const parent = await get('SELECT id FROM parents WHERE user_id = ?', [req.user.id]);
      if (!parent) return res.json([]);
      const children = await all('SELECT id FROM students WHERE parent_id = ?', [parent.id]);
      const childIds = children.map(c => c.id);
      if (childIds.length === 0) return res.json([]);
      sql += ` AND p.student_id IN (${childIds.map(() => '?').join(',')})`;
      params.push(...childIds);
    } else {
      if (fee_id) {
        sql += ' AND p.fee_id = ?';
        params.push(fee_id);
      }
      if (student_id) {
        sql += ' AND p.student_id = ?';
        params.push(student_id);
      }
    }

    sql += ' ORDER BY p.id DESC';
    const payments = await all(sql, params);
    res.json(payments);
  } catch (err) {
    console.error('Error fetching payments:', err);
    res.status(500).json({ error: 'Failed to fetch payments.' });
  }
});

// POST /api/fees/payments (Cashier & Admin only)
// Record a fee payment
router.post('/payments', authenticateToken, requireRole(['admin', 'cashier']), async (req, res) => {
  try {
    const { fee_id, student_id, amount, payment_method, receipt_no, payment_date } = req.body;
    if (!fee_id || !student_id || !amount) {
      return res.status(400).json({ error: 'Fee record, student, and payment amount are required.' });
    }

    const payAmount = parseFloat(amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      return res.status(400).json({ error: 'Payment amount must be greater than zero.' });
    }

    const fee = await get('SELECT * FROM fees WHERE id = ?', [fee_id]);
    if (!fee) {
      return res.status(404).json({ error: 'Fee record not found.' });
    }

    const recNo = receipt_no ? receipt_no.trim() : `REC-${Date.now().toString().slice(-6)}`;
    const pDate = payment_date || new Date().toISOString().split('T')[0];
    const pMethod = payment_method || 'Cash';

    // Insert payment
    const paymentRes = await run(`
      INSERT INTO payments (fee_id, student_id, amount, payment_date, payment_method, receipt_no, recorded_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [fee_id, student_id, payAmount, pDate, pMethod, recNo, req.user.id]);

    // Recalculate fee totals
    const newPaid = fee.amount_paid + payAmount;
    const newPending = Math.max(0, fee.total_fee - newPaid);
    const newStatus = newPending <= 0 ? 'Paid' : 'Partial';

    await run(`
      UPDATE fees
      SET amount_paid = ?, amount_pending = ?, status = ?
      WHERE id = ?
    `, [newPaid, newPending, newStatus, fee_id]);

    // Notify student and parent
    const studentInfo = await get(`
      SELECT s.user_id as student_user_id, p.user_id as parent_user_id, u.name as student_name
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN parents p ON s.parent_id = p.id
      WHERE s.id = ?
    `, [student_id]);

    if (studentInfo) {
      const msg = `Payment of $${payAmount} received on ${pDate} via ${pMethod} (Receipt: ${recNo}). Remaining balance: $${newPending}.`;
      await run(`
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (?, 'Fee Payment Receipt', ?, 'fee')
      `, [studentInfo.student_user_id, msg]);

      if (studentInfo.parent_user_id) {
        await run(`
          INSERT INTO notifications (user_id, title, message, type)
          VALUES (?, 'Fee Payment Received', ?, 'fee')
        `, [studentInfo.parent_user_id, `Payment for ${studentInfo.student_name}: ` + msg]);
      }
    }

    res.status(201).json({
      message: 'Payment recorded successfully',
      payment_id: paymentRes.id,
      receipt_no: recNo,
      amount_paid: newPaid,
      amount_pending: newPending,
      status: newStatus
    });
  } catch (err) {
    console.error('Error recording payment:', err);
    res.status(500).json({ error: 'Failed to record payment.' });
  }
});

module.exports = router;
