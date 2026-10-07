import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import Modal from '../components/Modal';
import StatCard from '../components/StatCard';
import {
  Library,
  BookOpen,
  Plus,
  Search,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Trash2,
  Users,
  BookmarkCheck,
  Calendar
} from 'lucide-react';

export default function LibraryView({ currentUser }) {
  const [activeTab, setActiveTab] = useState('books'); // 'books' | 'transactions'
  const [stats, setStats] = useState({ total_books: 0, available_books: 0, borrowed_books: 0, total_members: 0 });
  const [books, setBooks] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [students, setStudents] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Modals
  const [isAddBookModalOpen, setIsAddBookModalOpen] = useState(false);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);

  const [bookForm, setBookForm] = useState({
    isbn: '',
    title: '',
    author: '',
    category: 'Computer Science',
    total_copies: '5',
  });

  const [issueForm, setIssueForm] = useState({
    user_id: '',
    due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  const [submitting, setSubmitting] = useState(false);

  const isLibraryStaffOrAdmin = currentUser?.role === 'admin' || currentUser?.role === 'library_staff';

  const loadData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (categoryFilter) params.category = categoryFilter;

      const [st, bList, txList] = await Promise.all([
        api.getLibraryStats(),
        api.getBooks(params),
        api.getLibraryTransactions(),
      ]);

      setStats(st);
      setBooks(bList);
      setTransactions(txList);

      if (isLibraryStaffOrAdmin) {
        const sList = await api.getStudents();
        setStudents(sList);
        if (sList.length > 0 && !issueForm.user_id) {
          setIssueForm((prev) => ({ ...prev, user_id: sList[0].user_id }));
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load library catalog.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, categoryFilter]);

  const handleAddBook = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await api.createBook(bookForm);
      setSuccessMsg(`Book "${bookForm.title}" added to library inventory.`);
      setIsAddBookModalOpen(false);
      setBookForm({
        isbn: '',
        title: '',
        author: '',
        category: 'Computer Science',
        total_copies: '5',
      });
      loadData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to add book.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenIssue = (book) => {
    setSelectedBook(book);
    setIssueForm({
      user_id: students[0]?.user_id || '',
      due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });
    setIsIssueModalOpen(true);
  };

  const handleIssueBook = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await api.issueBook({
        book_id: selectedBook.id,
        user_id: issueForm.user_id,
        due_date: issueForm.due_date,
      });

      setSuccessMsg(`Book "${selectedBook.title}" issued successfully.`);
      setIsIssueModalOpen(false);
      loadData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to issue book.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturnBook = async (txId) => {
    if (window.confirm('Confirm returning this book to shelf?')) {
      try {
        await api.returnBook(txId, { fine_amount: 0 });
        setSuccessMsg('Book returned to inventory.');
        loadData();
        setTimeout(() => setSuccessMsg(''), 4000);
      } catch (err) {
        setError(err.message || 'Failed to return book.');
      }
    }
  };

  const handleDeleteBook = async (id) => {
    if (window.confirm('Remove this book from library?')) {
      try {
        await api.deleteBook(id);
        setSuccessMsg('Book deleted.');
        loadData();
      } catch (err) {
        setError(err.message || 'Failed to delete book.');
      }
    }
  };

  return (
    <div>
      {/* Messages */}
      {successMsg && (
        <div className="alert alert-success">
          <CheckCircle size={18} />
          <span>{successMsg}</span>
        </div>
      )}
      {error && (
        <div className="alert alert-danger">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="stats-grid">
        <StatCard
          title="Total Books Catalog"
          value={stats.total_books || 0}
          subtext="Copies in library collection"
          icon={BookOpen}
          color="var(--primary)"
          bgLight="var(--primary-light)"
        />
        <StatCard
          title="Available on Shelf"
          value={stats.available_books || 0}
          subtext="Ready for issue"
          icon={BookmarkCheck}
          color="#10b981"
          bgLight="#ecfdf5"
        />
        <StatCard
          title="Currently Borrowed"
          value={stats.borrowed_books || 0}
          subtext="Active reader loans"
          icon={RotateCcw}
          color="#f59e0b"
          bgLight="#fffbeb"
        />
        <StatCard
          title="Library Members"
          value={stats.total_members || 0}
          subtext="Students & teachers eligible"
          icon={Users}
          color="#0ea5e9"
          bgLight="#e0f2fe"
        />
      </div>

      {/* Switcher */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button
          type="button"
          className={`btn ${activeTab === 'books' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('books')}
        >
          <BookOpen size={16} />
          <span>Book Inventory</span>
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'transactions' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('transactions')}
        >
          <RotateCcw size={16} />
          <span>Active Loans & Issues</span>
        </button>
      </div>

      {/* TAB 1: BOOKS */}
      {activeTab === 'books' && (
        <div className="content-card">
          <div className="card-header">
            <div className="card-title-group">
              <h3>Central Library Catalog</h3>
              <p>Textbooks, reference volumes, research papers, and copies status</p>
            </div>

            <div className="card-actions">
              <div className="search-input-wrapper">
                <Search size={16} />
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search book title, author, ISBN..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <select
                className="select-filter"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="">All Categories</option>
                <option value="Computer Science">Computer Science</option>
                <option value="Electronics">Electronics</option>
                <option value="Mechanical">Mechanical</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Physics & Chemistry">Physics & Chemistry</option>
                <option value="General Literature">General Literature</option>
              </select>

              {isLibraryStaffOrAdmin && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setIsAddBookModalOpen(true)}
                >
                  <Plus size={16} />
                  <span>Add New Book</span>
                </button>
              )}
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Book Title</th>
                  <th>Author</th>
                  <th>ISBN</th>
                  <th>Category</th>
                  <th>Total Copies</th>
                  <th>Available</th>
                  {isLibraryStaffOrAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                      Loading library catalog...
                    </td>
                  </tr>
                ) : books.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      No books found in catalog.
                    </td>
                  </tr>
                ) : (
                  books.map((b) => (
                    <tr key={b.id}>
                      <td><strong>{b.title}</strong></td>
                      <td>{b.author}</td>
                      <td><span style={{ fontFamily: 'monospace' }}>{b.isbn || 'N/A'}</span></td>
                      <td><span className="badge badge-purple">{b.category}</span></td>
                      <td>{b.total_copies}</td>
                      <td>
                        <span className={`badge ${b.available_copies > 0 ? 'badge-success' : 'badge-danger'}`}>
                          {b.available_copies} available
                        </span>
                      </td>
                      {isLibraryStaffOrAdmin && (
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            {b.available_copies > 0 && (
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() => handleOpenIssue(b)}
                              >
                                Issue Book
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDeleteBook(b.id)}
                              title="Delete Book"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: TRANSACTIONS */}
      {activeTab === 'transactions' && (
        <div className="content-card">
          <div className="card-header">
            <div className="card-title-group">
              <h3>Borrowed Books & Return Ledger</h3>
              <p>Borrower information, issue dates, due dates, and returns</p>
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Book Title</th>
                  <th>Borrower Name</th>
                  <th>Borrower Role</th>
                  <th>Issue Date</th>
                  <th>Due Date</th>
                  <th>Return Date</th>
                  <th>Status</th>
                  {isLibraryStaffOrAdmin && <th>Return Action</th>}
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                      No book loans active currently.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td><strong>{tx.book_title}</strong></td>
                      <td>{tx.borrower_name}</td>
                      <td>
                        <span className="badge badge-purple" style={{ textTransform: 'capitalize' }}>
                          {tx.borrower_role}
                        </span>
                      </td>
                      <td>{tx.issue_date}</td>
                      <td><strong>{tx.due_date}</strong></td>
                      <td>{tx.return_date || '—'}</td>
                      <td>
                        <span className={`badge ${tx.status === 'Issued' ? 'badge-warning' : 'badge-success'}`}>
                          {tx.status}
                        </span>
                      </td>
                      {isLibraryStaffOrAdmin && (
                        <td>
                          {tx.status === 'Issued' && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleReturnBook(tx.id)}
                            >
                              <RotateCcw size={14} />
                              <span>Mark Returned</span>
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: ADD BOOK */}
      <Modal
        isOpen={isAddBookModalOpen}
        onClose={() => setIsAddBookModalOpen(false)}
        title="Add Book to Library Inventory"
        maxWidth="600px"
      >
        <form onSubmit={handleAddBook}>
          <div className="form-grid">
            <div className="form-group full-width">
              <label className="form-label">Book Title <span className="required">*</span></label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Introduction to Algorithms (CLRS)"
                value={bookForm.title}
                onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Author(s) <span className="required">*</span></label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Thomas H. Cormen"
                value={bookForm.author}
                onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">ISBN / Catalog Code</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. 978-0262033848"
                value={bookForm.isbn}
                onChange={(e) => setBookForm({ ...bookForm, isbn: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                className="form-control"
                value={bookForm.category}
                onChange={(e) => setBookForm({ ...bookForm, category: e.target.value })}
              >
                <option value="Computer Science">Computer Science</option>
                <option value="Electronics">Electronics</option>
                <option value="Mechanical">Mechanical</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Physics & Chemistry">Physics & Chemistry</option>
                <option value="General Literature">General Literature</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Total Copies Acquired</label>
              <input
                type="number"
                className="form-control"
                value={bookForm.total_copies}
                onChange={(e) => setBookForm({ ...bookForm, total_copies: e.target.value })}
                required
              />
            </div>
          </div>

          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsAddBookModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Adding...' : 'Add Book'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: ISSUE BOOK */}
      <Modal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        title={`Issue Book: ${selectedBook?.title}`}
        maxWidth="550px"
      >
        <form onSubmit={handleIssueBook}>
          <div className="form-grid">
            <div className="form-group full-width">
              <label className="form-label">Select Borrower <span className="required">*</span></label>
              <select
                className="form-control"
                value={issueForm.user_id}
                onChange={(e) => setIssueForm({ ...issueForm, user_id: e.target.value })}
                required
              >
                {students.map((s) => (
                  <option key={s.user_id} value={s.user_id}>
                    {s.student_name} ({s.student_id} - {s.class_year})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group full-width">
              <label className="form-label">Due Return Date <span className="required">*</span></label>
              <input
                type="date"
                className="form-control"
                value={issueForm.due_date}
                onChange={(e) => setIssueForm({ ...issueForm, due_date: e.target.value })}
                required
              />
            </div>
          </div>

          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsIssueModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Issuing...' : 'Confirm Book Issue'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
