const express = require('express');
const router = express.Router();
const { get, all, run } = require('../database');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET /api/library/stats
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const totalBooksRow = await get('SELECT SUM(total_copies) as total FROM books');
    const availableBooksRow = await get('SELECT SUM(available_copies) as available FROM books');
    const borrowedRow = await get("SELECT COUNT(*) as borrowed FROM library_transactions WHERE status = 'Issued'");
    const membersRow = await get("SELECT COUNT(*) as members FROM users WHERE role IN ('student', 'teacher')");

    res.json({
      total_books: totalBooksRow.total || 0,
      available_books: availableBooksRow.available || 0,
      borrowed_books: borrowedRow.borrowed || 0,
      total_members: membersRow.members || 0
    });
  } catch (err) {
    console.error('Error fetching library stats:', err);
    res.status(500).json({ error: 'Failed to fetch library stats.' });
  }
});

// GET /api/library/books
router.get('/books', authenticateToken, async (req, res) => {
  try {
    const { category, search } = req.query;
    let sql = 'SELECT * FROM books WHERE 1=1';
    const params = [];

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    if (search) {
      sql += ' AND (title LIKE ? OR author LIKE ? OR isbn LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY id DESC';
    const books = await all(sql, params);
    res.json(books);
  } catch (err) {
    console.error('Error fetching books:', err);
    res.status(500).json({ error: 'Failed to fetch books.' });
  }
});

// POST /api/library/books (Library Staff & Admin)
router.post('/books', authenticateToken, requireRole(['admin', 'library_staff']), async (req, res) => {
  try {
    const { isbn, title, author, category, total_copies } = req.body;
    if (!title || !author) {
      return res.status(400).json({ error: 'Title and author are required.' });
    }

    const copies = total_copies ? parseInt(total_copies, 10) : 1;
    const result = await run(`
      INSERT INTO books (isbn, title, author, category, total_copies, available_copies)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [isbn || null, title.trim(), author.trim(), category || 'General', copies, copies]);

    res.status(201).json({ message: 'Book added to library successfully', id: result.id });
  } catch (err) {
    console.error('Error adding book:', err);
    res.status(500).json({ error: 'Failed to add book.' });
  }
});

// PUT /api/library/books/:id
router.put('/books/:id', authenticateToken, requireRole(['admin', 'library_staff']), async (req, res) => {
  try {
    const { isbn, title, author, category, total_copies, available_copies } = req.body;
    await run(`
      UPDATE books
      SET isbn = COALESCE(?, isbn),
          title = COALESCE(?, title),
          author = COALESCE(?, author),
          category = COALESCE(?, category),
          total_copies = COALESCE(?, total_copies),
          available_copies = COALESCE(?, available_copies)
      WHERE id = ?
    `, [isbn, title, author, category, total_copies, available_copies, req.params.id]);

    res.json({ message: 'Book updated successfully.' });
  } catch (err) {
    console.error('Error updating book:', err);
    res.status(500).json({ error: 'Failed to update book.' });
  }
});

// DELETE /api/library/books/:id
router.delete('/books/:id', authenticateToken, requireRole(['admin', 'library_staff']), async (req, res) => {
  try {
    await run('DELETE FROM books WHERE id = ?', [req.params.id]);
    res.json({ message: 'Book removed from library.' });
  } catch (err) {
    console.error('Error deleting book:', err);
    res.status(500).json({ error: 'Failed to remove book.' });
  }
});

// GET /api/library/transactions
router.get('/transactions', authenticateToken, async (req, res) => {
  try {
    const { status, user_id } = req.query;
    let sql = `
      SELECT lt.*, b.title as book_title, b.author as book_author, b.isbn,
             u.name as borrower_name, u.role as borrower_role, u.username as borrower_username
      FROM library_transactions lt
      JOIN books b ON lt.book_id = b.id
      JOIN users u ON lt.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    // If regular student or teacher, only view own
    if (['student', 'teacher', 'parent'].includes(req.user.role)) {
      sql += ' AND lt.user_id = ?';
      params.push(req.user.id);
    } else if (user_id) {
      sql += ' AND lt.user_id = ?';
      params.push(user_id);
    }

    if (status) {
      sql += ' AND lt.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY lt.id DESC';
    const txs = await all(sql, params);
    res.json(txs);
  } catch (err) {
    console.error('Error fetching transactions:', err);
    res.status(500).json({ error: 'Failed to fetch library transactions.' });
  }
});

// POST /api/library/issue (Issue a book)
router.post('/issue', authenticateToken, requireRole(['admin', 'library_staff']), async (req, res) => {
  try {
    const { book_id, user_id, due_date } = req.body;
    if (!book_id || !user_id) {
      return res.status(400).json({ error: 'Book and borrower are required.' });
    }

    const book = await get('SELECT * FROM books WHERE id = ?', [book_id]);
    if (!book) {
      return res.status(404).json({ error: 'Book not found.' });
    }

    if (book.available_copies <= 0) {
      return res.status(400).json({ error: 'No copies available currently.' });
    }

    const issueDate = new Date().toISOString().split('T')[0];
    const defaultDueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const result = await run(`
      INSERT INTO library_transactions (book_id, user_id, issue_date, due_date, status)
      VALUES (?, ?, ?, ?, 'Issued')
    `, [book_id, user_id, issueDate, due_date || defaultDueDate]);

    await run('UPDATE books SET available_copies = available_copies - 1 WHERE id = ?', [book_id]);

    // Send notification to borrower
    await run(`
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (?, 'Library Book Issued', ?, 'general')
    `, [user_id, `You borrowed '${book.title}'. Please return it by ${due_date || defaultDueDate}.`]);

    res.status(201).json({ message: 'Book issued successfully', transaction_id: result.id });
  } catch (err) {
    console.error('Error issuing book:', err);
    res.status(500).json({ error: 'Failed to issue book.' });
  }
});

// POST /api/library/return/:id (Return a book)
router.post('/return/:id', authenticateToken, requireRole(['admin', 'library_staff']), async (req, res) => {
  try {
    const tx = await get('SELECT * FROM library_transactions WHERE id = ?', [req.params.id]);
    if (!tx) {
      return res.status(404).json({ error: 'Transaction not found.' });
    }

    if (tx.status === 'Returned') {
      return res.status(400).json({ error: 'Book has already been returned.' });
    }

    const returnDate = new Date().toISOString().split('T')[0];
    const fine = req.body.fine_amount ? parseFloat(req.body.fine_amount) : 0;

    await run(`
      UPDATE library_transactions
      SET status = 'Returned', return_date = ?, fine_amount = ?
      WHERE id = ?
    `, [returnDate, fine, req.params.id]);

    await run('UPDATE books SET available_copies = available_copies + 1 WHERE id = ?', [tx.book_id]);

    res.json({ message: 'Book returned successfully.' });
  } catch (err) {
    console.error('Error returning book:', err);
    res.status(500).json({ error: 'Failed to return book.' });
  }
});

module.exports = router;
