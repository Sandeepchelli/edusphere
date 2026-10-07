import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import Modal from '../components/Modal';
import {
  GraduationCap,
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  CheckCircle,
  AlertCircle,
  Filter,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  UserX,
  ShieldOff
} from 'lucide-react';

export default function StudentsView({ currentUser }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filter state
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    type: null, // 'remove' | 'disable'
    student: null,
    submitting: false
  });

  // Form state
  const initialFormState = {
    name: '',
    student_id: '',
    username: '',
    password: '',
    roll_number: '',
    class_year: '1st Year',
    department: 'Computer Science',
    section: 'A',
    phone: '',
    email: '',
    address: '',
    dob: '',
    profile_photo: '',
    parent_name: '',
    parent_phone: '',
    parent_email: '',
    parent_username: '',
    parent_password: '',
    total_fee: '45000'
  };
  const [formData, setFormData] = useState(initialFormState);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const loadStudents = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (filterClass) params.class_year = filterClass;
      if (filterDept) params.department = filterDept;
      if (filterStatus) params.status = filterStatus;

      const data = await api.getStudents(params);
      setStudents(data);
    } catch (err) {
      setError(err.message || 'Failed to load students.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, [filterClass, filterDept, filterStatus]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadStudents();
  };

  const handleOpenAddModal = () => {
    setFormData(initialFormState);
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (student) => {
    setSelectedStudent(student);
    setFormData({
      name: student.student_name || '',
      student_id: student.student_id || '',
      roll_number: student.roll_number || '',
      class_year: student.class_year || '1st Year',
      department: student.department || 'Computer Science',
      section: student.section || 'A',
      phone: student.phone || '',
      email: student.email || '',
      address: student.address || '',
      dob: student.dob || '',
      profile_photo: student.profile_photo || '',
      account_status: student.account_status || 'active',
      new_password: '',
      parent_name: student.parent_name || '',
      parent_phone: student.parent_phone || '',
      parent_email: student.parent_email || ''
    });
    setFormError('');
    setIsEditModalOpen(true);
  };

  const handleOpenViewModal = (student) => {
    setSelectedStudent(student);
    setIsViewModalOpen(true);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError('');

    try {
      await api.createStudent(formData);
      setSuccessMsg(`Student ${formData.name} added successfully!`);
      setIsAddModalOpen(false);
      loadStudents();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setFormError(err.message || 'Failed to add student.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError('');

    try {
      await api.updateStudent(selectedStudent.id, formData);
      setSuccessMsg(`Student ${formData.name} updated successfully!`);
      setIsEditModalOpen(false);
      loadStudents();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setFormError(err.message || 'Failed to update student.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Open the Remove Student confirmation modal
  const handleOpenRemoveConfirm = (student) => {
    setConfirmModal({ open: true, type: 'remove', student, submitting: false });
  };

  // Open the Disable Account confirmation modal
  const handleOpenDisableConfirm = (student) => {
    setConfirmModal({ open: true, type: 'disable', student, submitting: false });
  };

  const handleCloseConfirm = () => {
    if (confirmModal.submitting) return;
    setConfirmModal({ open: false, type: null, student: null, submitting: false });
  };

  // Execute confirmed remove
  const handleConfirmRemove = async () => {
    setConfirmModal(prev => ({ ...prev, submitting: true }));
    try {
      await api.deleteStudent(confirmModal.student.id);
      setSuccessMsg(`Student "${confirmModal.student.student_name}" has been removed. Historical records preserved.`);
      setConfirmModal({ open: false, type: null, student: null, submitting: false });
      loadStudents();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setError(err.message || 'Failed to remove student.');
      setConfirmModal({ open: false, type: null, student: null, submitting: false });
    }
  };

  // Execute confirmed disable
  const handleConfirmDisable = async () => {
    setConfirmModal(prev => ({ ...prev, submitting: true }));
    try {
      await api.disableStudent(confirmModal.student.id);
      setSuccessMsg(`Student "${confirmModal.student.student_name}" account disabled. Login access revoked.`);
      setConfirmModal({ open: false, type: null, student: null, submitting: false });
      loadStudents();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setError(err.message || 'Failed to disable student account.');
      setConfirmModal({ open: false, type: null, student: null, submitting: false });
    }
  };

  const canAdd = currentUser?.role === 'admin' || (currentUser?.role === 'teacher' && currentUser?.can_add_students);
  const isAdmin = currentUser?.role === 'admin';

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
          <button
            type="button"
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
            onClick={() => setError('')}
          >✕</button>
        </div>
      )}

      {/* Main Table Card */}
      <div className="content-card">
        <div className="card-header">
          <div className="card-title-group">
            <h3>Student Directory</h3>
            <p>Manage college enrolled students, credentials, and parent accounts</p>
          </div>

          <div className="card-actions">
            {/* Filter Bar */}
            <form onSubmit={handleSearchSubmit} className="filter-bar">
              <div className="search-input-wrapper">
                <Search size={16} />
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search student or roll no..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <select
                className="select-filter"
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
              >
                <option value="">All Years</option>
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
              </select>

              <select
                className="select-filter"
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
              >
                <option value="">All Departments</option>
                <option value="Computer Science">Computer Science</option>
                <option value="Information Technology">Information Technology</option>
                <option value="Electronics &amp; Comm">Electronics &amp; Comm</option>
                <option value="Mechanical Eng">Mechanical Eng</option>
                <option value="Civil Engineering">Civil Engineering</option>
              </select>

              <select
                className="select-filter"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
              </select>

              <button type="submit" className="btn btn-secondary btn-sm">
                <Filter size={14} /> Filter
              </button>
            </form>

            {canAdd && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleOpenAddModal}
              >
                <Plus size={18} />
                <span>Add New Student</span>
              </button>
            )}
          </div>
        </div>

        {/* Students Table */}
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Student ID</th>
                <th>Roll No</th>
                <th>Class &amp; Dept</th>
                <th>Section</th>
                <th>Contact</th>
                <th>Linked Parent</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    Loading students...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No students found. {canAdd ? 'Click "Add New Student" to enroll your first student.' : ''}
                  </td>
                </tr>
              ) : (
                students.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          className="user-avatar"
                          style={{ width: '36px', height: '36px', fontSize: '0.85rem' }}
                        >
                          {s.profile_photo ? (
                            <img src={s.profile_photo} alt={s.student_name} />
                          ) : (
                            s.student_name?.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{s.student_name}</div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>@{s.username}</div>
                        </div>
                      </div>
                    </td>
                    <td><span style={{ fontWeight: 600, color: 'var(--primary)' }}>{s.student_id}</span></td>
                    <td>{s.roll_number || '—'}</td>
                    <td>
                      <div>{s.class_year}</div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{s.department}</div>
                    </td>
                    <td>
                      <span className="badge badge-neutral">Sec {s.section}</span>
                    </td>
                    <td>{s.phone || s.email || '—'}</td>
                    <td>
                      {s.parent_name ? (
                        <div>
                          <div style={{ fontWeight: 500 }}>{s.parent_name}</div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{s.parent_phone || 'No phone'}</div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-light)', fontStyle: 'italic' }}>Not Linked</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${s.account_status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                        {s.account_status === 'active' ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                        {/* View */}
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          title="View Profile"
                          onClick={() => handleOpenViewModal(s)}
                        >
                          <Eye size={13} />
                        </button>

                        {isAdmin && (
                          <>
                            {/* Edit */}
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              title="Edit Student"
                              onClick={() => handleOpenEditModal(s)}
                            >
                              <Edit2 size={13} />
                            </button>

                            {/* Disable Account — only if currently active */}
                            {s.account_status === 'active' && (
                              <button
                                type="button"
                                className="btn btn-sm"
                                title="Disable Account"
                                style={{ background: 'var(--warning, #f59e0b)', color: '#fff', border: 'none', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                                onClick={() => handleOpenDisableConfirm(s)}
                              >
                                <ShieldOff size={13} />
                              </button>
                            )}

                            {/* Remove Student */}
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              title="Remove Student"
                              onClick={() => handleOpenRemoveConfirm(s)}
                            >
                              <UserX size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── CONFIRMATION MODALS ─── */}

      {/* Remove Student Confirmation */}
      <Modal
        isOpen={confirmModal.open && confirmModal.type === 'remove'}
        onClose={handleCloseConfirm}
        title="Remove Student?"
        maxWidth="460px"
      >
        {confirmModal.student && (
          <div>
            <div style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: '10px',
              padding: '16px 18px',
              marginBottom: '20px',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start'
            }}>
              <AlertCircle size={20} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontWeight: 700, color: '#ef4444', marginBottom: '6px' }}>
                  Remove Student Account
                </div>
                <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                  Are you sure you want to remove <strong>{confirmModal.student.student_name}</strong> ({confirmModal.student.student_id})?
                  <br /><br />
                  This action will:
                  <ul style={{ margin: '6px 0 0 16px', padding: 0 }}>
                    <li>Remove the student's login access permanently</li>
                    <li>Remove student from active student lists</li>
                    <li>Remove student from attendance and class lists</li>
                  </ul>
                  <br />
                  <span style={{ color: '#10b981', fontWeight: 600 }}>✓ Historical records (attendance, marks, fees, CGPA) will be safely preserved.</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCloseConfirm}
                disabled={confirmModal.submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmRemove}
                disabled={confirmModal.submitting}
              >
                {confirmModal.submitting ? 'Removing...' : '🗑 Remove Student'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Disable Account Confirmation */}
      <Modal
        isOpen={confirmModal.open && confirmModal.type === 'disable'}
        onClose={handleCloseConfirm}
        title="Disable Student Account?"
        maxWidth="440px"
      >
        {confirmModal.student && (
          <div>
            <div style={{
              background: 'rgba(245,158,11,0.08)',
              border: '1px solid rgba(245,158,11,0.3)',
              borderRadius: '10px',
              padding: '16px 18px',
              marginBottom: '20px',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start'
            }}>
              <ShieldOff size={20} style={{ color: '#f59e0b', flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                Disable login access for <strong>{confirmModal.student.student_name}</strong>?
                <br /><br />
                The student will not be able to log in. All data is preserved. You can re-enable the account from Edit.
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCloseConfirm}
                disabled={confirmModal.submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-sm"
                style={{ background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 18px', fontWeight: 600, cursor: 'pointer' }}
                onClick={handleConfirmDisable}
                disabled={confirmModal.submitting}
              >
                {confirmModal.submitting ? 'Disabling...' : 'Disable Account'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ADD STUDENT MODAL */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Student &amp; Linked Parent"
        maxWidth="750px"
      >
        {formError && (
          <div className="alert alert-danger">
            <AlertCircle size={16} />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleAddSubmit}>
          <div style={{ marginBottom: '16px', fontWeight: 700, color: 'var(--primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
            1. Student Account Information
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Student Full Name <span className="required">*</span></label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Rahul Sharma"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Student ID (College Reg ID) <span className="required">*</span></label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. STU-2026-001"
                value={formData.student_id}
                onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Login Username / User ID <span className="required">*</span></label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. rahul2026"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password <span className="required">*</span></label>
              <input
                type="password"
                className="form-control"
                placeholder="Initial student password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Roll Number</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. 26CS042"
                value={formData.roll_number}
                onChange={(e) => setFormData({ ...formData, roll_number: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Class / Year <span className="required">*</span></label>
              <select
                className="form-control"
                value={formData.class_year}
                onChange={(e) => setFormData({ ...formData, class_year: e.target.value })}
                required
              >
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Department <span className="required">*</span></label>
              <select
                className="form-control"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                required
              >
                <option value="Computer Science">Computer Science</option>
                <option value="Information Technology">Information Technology</option>
                <option value="Electronics &amp; Comm">Electronics &amp; Comm</option>
                <option value="Mechanical Eng">Mechanical Eng</option>
                <option value="Civil Engineering">Civil Engineering</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Section <span className="required">*</span></label>
              <select
                className="form-control"
                value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                required
              >
                <option value="A">Section A</option>
                <option value="B">Section B</option>
                <option value="C">Section C</option>
                <option value="D">Section D</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Student Phone</label>
              <input
                type="text"
                className="form-control"
                placeholder="+91 98765 43210"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Student Email</label>
              <input
                type="email"
                className="form-control"
                placeholder="student@college.edu"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Date of Birth</label>
              <input
                type="date"
                className="form-control"
                value={formData.dob}
                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Total Annual Fee (₹)</label>
              <input
                type="number"
                className="form-control"
                placeholder="45000"
                value={formData.total_fee}
                onChange={(e) => setFormData({ ...formData, total_fee: e.target.value })}
              />
            </div>

            <div className="form-group full-width">
              <label className="form-label">Residential Address</label>
              <textarea
                className="form-control"
                placeholder="Full residential address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
          </div>

          <div style={{ margin: '24px 0 16px', fontWeight: 700, color: 'var(--primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
            2. Linked Parent Account Information
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Parent Full Name</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Suresh Sharma"
                value={formData.parent_name}
                onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Parent Phone (for Absent Alerts)</label>
              <input
                type="text"
                className="form-control"
                placeholder="+91 98765 43211"
                value={formData.parent_phone}
                onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Parent Email</label>
              <input
                type="email"
                className="form-control"
                placeholder="parent@example.com"
                value={formData.parent_email}
                onChange={(e) => setFormData({ ...formData, parent_email: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Parent Username (Optional)</label>
              <input
                type="text"
                className="form-control"
                placeholder="Leave blank for auto (p_username)"
                value={formData.parent_username}
                onChange={(e) => setFormData({ ...formData, parent_username: e.target.value })}
              />
            </div>
          </div>

          <div style={{ marginTop: '28px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={formSubmitting}
            >
              {formSubmitting ? 'Registering...' : 'Save & Register Student'}
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT STUDENT MODAL */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Student: ${selectedStudent?.student_name}`}
        maxWidth="750px"
      >
        {formError && (
          <div className="alert alert-danger">
            <AlertCircle size={16} />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleEditSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-control"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Roll Number</label>
              <input
                type="text"
                className="form-control"
                value={formData.roll_number}
                onChange={(e) => setFormData({ ...formData, roll_number: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Class / Year</label>
              <select
                className="form-control"
                value={formData.class_year}
                onChange={(e) => setFormData({ ...formData, class_year: e.target.value })}
              >
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Department</label>
              <select
                className="form-control"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              >
                <option value="Computer Science">Computer Science</option>
                <option value="Information Technology">Information Technology</option>
                <option value="Electronics &amp; Comm">Electronics &amp; Comm</option>
                <option value="Mechanical Eng">Mechanical Eng</option>
                <option value="Civil Engineering">Civil Engineering</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Section</label>
              <select
                className="form-control"
                value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value })}
              >
                <option value="A">Section A</option>
                <option value="B">Section B</option>
                <option value="C">Section C</option>
                <option value="D">Section D</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Account Status</label>
              <select
                className="form-control"
                value={formData.account_status}
                onChange={(e) => setFormData({ ...formData, account_status: e.target.value })}
              >
                <option value="active">Active (Access Allowed)</option>
                <option value="disabled">Disabled (Deactivated)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Change Password (leave blank to keep current)</label>
              <input
                type="password"
                className="form-control"
                placeholder="New password (min 6 chars)"
                value={formData.new_password || ''}
                onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phone</label>
              <input
                type="text"
                className="form-control"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-control"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Linked Parent Name</label>
              <input
                type="text"
                className="form-control"
                value={formData.parent_name}
                onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Parent Phone</label>
              <input
                type="text"
                className="form-control"
                value={formData.parent_phone}
                onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })}
              />
            </div>

            <div className="form-group full-width">
              <label className="form-label">Residential Address</label>
              <textarea
                className="form-control"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
          </div>

          <div style={{ marginTop: '28px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={formSubmitting}
            >
              {formSubmitting ? 'Saving Changes...' : 'Update Student'}
            </button>
          </div>
        </form>
      </Modal>

      {/* VIEW STUDENT PROFILE MODAL */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Student Profile & Parent Information"
        maxWidth="600px"
      >
        {selectedStudent && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              <div
                className="user-avatar"
                style={{ width: '60px', height: '60px', fontSize: '1.4rem' }}
              >
                {selectedStudent.student_name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>{selectedStudent.student_name}</h3>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Student ID: <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{selectedStudent.student_id}</span> &bull; Roll: {selectedStudent.roll_number || 'N/A'}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', fontSize: '0.86rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Class &amp; Dept:</span>
                <div style={{ fontWeight: 600 }}>{selectedStudent.class_year} - {selectedStudent.department}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Section:</span>
                <div style={{ fontWeight: 600 }}>Section {selectedStudent.section}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Username:</span>
                <div style={{ fontWeight: 600 }}>@{selectedStudent.username}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Account Access:</span>
                <div>
                  <span className={`badge ${selectedStudent.account_status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                    {selectedStudent.account_status}
                  </span>
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Phone:</span>
                <div style={{ fontWeight: 600 }}>{selectedStudent.phone || 'None provided'}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Email:</span>
                <div style={{ fontWeight: 600 }}>{selectedStudent.email || 'None provided'}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Date of Birth:</span>
                <div style={{ fontWeight: 600 }}>{selectedStudent.dob || 'N/A'}</div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <span style={{ color: 'var(--text-muted)' }}>Address:</span>
                <div style={{ fontWeight: 600 }}>{selectedStudent.address || 'None provided'}</div>
              </div>
            </div>

            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '12px' }}>
                Linked Parent Details
              </h4>
              {selectedStudent.parent_name ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', fontSize: '0.86rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Parent Name:</span>
                    <div style={{ fontWeight: 600 }}>{selectedStudent.parent_name}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Parent Username:</span>
                    <div style={{ fontWeight: 600 }}>@{selectedStudent.parent_username || 'p_' + selectedStudent.username}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Parent Phone (Alerts):</span>
                    <div style={{ fontWeight: 600 }}>{selectedStudent.parent_phone || 'None'}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Parent Email:</span>
                    <div style={{ fontWeight: 600 }}>{selectedStudent.parent_email || 'None'}</div>
                  </div>
                </div>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.85rem' }}>
                  No parent account linked yet.
                </div>
              )}
            </div>

            {/* Quick Admin Actions from view modal */}
            {isAdmin && (
              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => { setIsViewModalOpen(false); handleOpenEditModal(selectedStudent); }}
                >
                  <Edit2 size={14} /> Edit Student
                </button>
                {selectedStudent.account_status === 'active' && (
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{ background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '7px', padding: '6px 12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                    onClick={() => { setIsViewModalOpen(false); handleOpenDisableConfirm(selectedStudent); }}
                  >
                    <ShieldOff size={14} /> Disable Account
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => { setIsViewModalOpen(false); handleOpenRemoveConfirm(selectedStudent); }}
                >
                  <UserX size={14} /> Remove Student
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
