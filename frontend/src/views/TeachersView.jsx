import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import Modal from '../components/Modal';
import {
  UserCheck,
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  CheckCircle,
  AlertCircle,
  Phone,
  Mail,
  Calendar,
  Lock,
  UserPlus,
  UserX,
  ShieldOff,
  Filter
} from 'lucide-react';

export default function TeachersView({ currentUser }) {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    type: null, // 'remove' | 'disable'
    teacher: null,
    submitting: false
  });

  const initialFormState = {
    name: '',
    teacher_id: '',
    username: '',
    password: '',
    phone: '',
    email: '',
    department: 'Computer Science',
    subject: '',
    designation: 'Assistant Professor',
    profile_photo: '',
    salary: '35000',
    joining_date: new Date().toISOString().split('T')[0],
    can_add_students: 1
  };
  const [formData, setFormData] = useState(initialFormState);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const loadTeachers = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (filterDept) params.department = filterDept;
      if (filterStatus) params.status = filterStatus;

      const data = await api.getTeachers(params);
      setTeachers(data);
    } catch (err) {
      setError(err.message || 'Failed to load faculty records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeachers();
  }, [filterDept, filterStatus]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadTeachers();
  };

  const handleOpenAddModal = () => {
    setFormData(initialFormState);
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (teacher) => {
    setSelectedTeacher(teacher);
    setFormData({
      name: teacher.teacher_name || '',
      phone: teacher.phone || '',
      email: teacher.email || '',
      department: teacher.department || 'Computer Science',
      subject: teacher.subject || '',
      designation: teacher.designation || 'Lecturer',
      salary: teacher.salary || 0,
      joining_date: teacher.joining_date || '',
      can_add_students: teacher.can_add_students ? 1 : 0,
      account_status: teacher.account_status || 'active',
      new_password: ''
    });
    setFormError('');
    setIsEditModalOpen(true);
  };

  const handleOpenViewModal = (teacher) => {
    setSelectedTeacher(teacher);
    setIsViewModalOpen(true);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError('');

    try {
      await api.createTeacher(formData);
      setSuccessMsg(`Teacher ${formData.name} added successfully!`);
      setIsAddModalOpen(false);
      loadTeachers();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setFormError(err.message || 'Failed to add teacher.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError('');

    try {
      await api.updateTeacher(selectedTeacher.id, formData);
      setSuccessMsg(`Teacher details updated successfully.`);
      setIsEditModalOpen(false);
      loadTeachers();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setFormError(err.message || 'Failed to update teacher.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Open Remove Teacher confirmation modal
  const handleOpenRemoveConfirm = (teacher) => {
    setConfirmModal({ open: true, type: 'remove', teacher, submitting: false });
  };

  // Open Disable Account confirmation modal
  const handleOpenDisableConfirm = (teacher) => {
    setConfirmModal({ open: true, type: 'disable', teacher, submitting: false });
  };

  const handleCloseConfirm = () => {
    if (confirmModal.submitting) return;
    setConfirmModal({ open: false, type: null, teacher: null, submitting: false });
  };

  const handleConfirmRemove = async () => {
    setConfirmModal(prev => ({ ...prev, submitting: true }));
    try {
      await api.deleteTeacher(confirmModal.teacher.id);
      setSuccessMsg(`Teacher "${confirmModal.teacher.teacher_name}" removed. Historical records preserved.`);
      setConfirmModal({ open: false, type: null, teacher: null, submitting: false });
      loadTeachers();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setError(err.message || 'Failed to remove teacher.');
      setConfirmModal({ open: false, type: null, teacher: null, submitting: false });
    }
  };

  const handleConfirmDisable = async () => {
    setConfirmModal(prev => ({ ...prev, submitting: true }));
    try {
      await api.disableTeacher(confirmModal.teacher.id);
      setSuccessMsg(`Teacher "${confirmModal.teacher.teacher_name}" account disabled. Login access revoked.`);
      setConfirmModal({ open: false, type: null, teacher: null, submitting: false });
      loadTeachers();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setError(err.message || 'Failed to disable teacher account.');
      setConfirmModal({ open: false, type: null, teacher: null, submitting: false });
    }
  };

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

      {/* Teachers Card */}
      <div className="content-card">
        <div className="card-header">
          <div className="card-title-group">
            <h3>Faculty &amp; Teachers Management</h3>
            <p>Administer academic professors, lecturers, designations, salaries, and permissions</p>
          </div>

          <div className="card-actions">
            <form onSubmit={handleSearchSubmit} className="filter-bar">
              <div className="search-input-wrapper">
                <Search size={16} />
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search faculty name or ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

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
                <option value="Mathematics &amp; Sciences">Mathematics &amp; Sciences</option>
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

            {isAdmin && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleOpenAddModal}
              >
                <Plus size={18} />
                <span>Add New Teacher</span>
              </button>
            )}
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Teacher</th>
                <th>Teacher ID</th>
                <th>Department</th>
                <th>Designation</th>
                <th>Subject</th>
                <th>Monthly Salary</th>
                <th>Can Enroll</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    Loading faculty records...
                  </td>
                </tr>
              ) : teachers.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No teachers registered. {isAdmin ? 'Click "Add New Teacher" to add faculty members.' : ''}
                  </td>
                </tr>
              ) : (
                teachers.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          className="user-avatar"
                          style={{ width: '36px', height: '36px', fontSize: '0.85rem' }}
                        >
                          {t.teacher_name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{t.teacher_name}</div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>@{t.username}</div>
                        </div>
                      </div>
                    </td>
                    <td><span style={{ fontWeight: 600, color: 'var(--primary)' }}>{t.teacher_id}</span></td>
                    <td>{t.department}</td>
                    <td>{t.designation || 'Lecturer'}</td>
                    <td>{t.subject || 'General'}</td>
                    <td>
                      <span style={{ fontWeight: 600 }}>₹{(t.salary || 0).toLocaleString('en-IN')}</span>
                    </td>
                    <td>
                      <span className={`badge ${t.can_add_students ? 'badge-success' : 'badge-neutral'}`}>
                        {t.can_add_students ? 'Allowed' : 'Disabled'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${t.account_status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                        {t.account_status === 'active' ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                        {/* View */}
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          title="View Profile"
                          onClick={() => handleOpenViewModal(t)}
                        >
                          <Eye size={13} />
                        </button>

                        {isAdmin && (
                          <>
                            {/* Edit */}
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              title="Edit Teacher"
                              onClick={() => handleOpenEditModal(t)}
                            >
                              <Edit2 size={13} />
                            </button>

                            {/* Disable Account — only if active */}
                            {t.account_status === 'active' && (
                              <button
                                type="button"
                                className="btn btn-sm"
                                title="Disable Account"
                                style={{ background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                                onClick={() => handleOpenDisableConfirm(t)}
                              >
                                <ShieldOff size={13} />
                              </button>
                            )}

                            {/* Remove Teacher */}
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              title="Remove Teacher"
                              onClick={() => handleOpenRemoveConfirm(t)}
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

      {/* Remove Teacher Confirmation */}
      <Modal
        isOpen={confirmModal.open && confirmModal.type === 'remove'}
        onClose={handleCloseConfirm}
        title="Remove Teacher?"
        maxWidth="460px"
      >
        {confirmModal.teacher && (
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
                  Remove Teacher Account
                </div>
                <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                  Are you sure you want to remove <strong>{confirmModal.teacher.teacher_name}</strong> ({confirmModal.teacher.teacher_id})?
                  <br /><br />
                  The teacher will no longer be able to log in. This action will:
                  <ul style={{ margin: '6px 0 0 16px', padding: 0 }}>
                    <li>Remove teacher login access permanently</li>
                    <li>Remove teacher from active teacher lists</li>
                    <li>Revoke permission to enroll new students</li>
                  </ul>
                  <br />
                  <span style={{ color: '#10b981', fontWeight: 600 }}>✓ Historical records (attendance, marks, salary) will be safely preserved.</span>
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
                {confirmModal.submitting ? 'Removing...' : '🗑 Remove Teacher'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Disable Account Confirmation */}
      <Modal
        isOpen={confirmModal.open && confirmModal.type === 'disable'}
        onClose={handleCloseConfirm}
        title="Disable Teacher Account?"
        maxWidth="440px"
      >
        {confirmModal.teacher && (
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
                Disable login access for <strong>{confirmModal.teacher.teacher_name}</strong>?
                <br /><br />
                The teacher will not be able to log in. All records are preserved. You can re-enable from Edit.
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

      {/* ADD TEACHER MODAL */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Faculty Member / Teacher"
        maxWidth="750px"
      >
        {formError && (
          <div className="alert alert-danger">
            <AlertCircle size={16} />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleAddSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Teacher Name <span className="required">*</span></label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Prof. Ravi Kumar"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Teacher ID <span className="required">*</span></label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. TCH-CS-101"
                value={formData.teacher_id}
                onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Username / Login ID <span className="required">*</span></label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. ravikumar"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Account Password <span className="required">*</span></label>
              <input
                type="password"
                className="form-control"
                placeholder="Initial login password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
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
                <option value="Mathematics &amp; Sciences">Mathematics &amp; Sciences</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Primary Subject</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Data Structures & Algorithms"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Designation / Post</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Associate Professor"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Monthly Salary (₹)</label>
              <input
                type="number"
                className="form-control"
                placeholder="35000"
                value={formData.salary}
                onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Contact Phone</label>
              <input
                type="text"
                className="form-control"
                placeholder="+91 98765 43210"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Contact Email</label>
              <input
                type="email"
                className="form-control"
                placeholder="teacher@college.edu"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Joining Date</label>
              <input
                type="date"
                className="form-control"
                value={formData.joining_date}
                onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Permission to Enroll Students</label>
              <select
                className="form-control"
                value={formData.can_add_students}
                onChange={(e) => setFormData({ ...formData, can_add_students: parseInt(e.target.value, 10) })}
              >
                <option value={1}>Enabled (Can register new students)</option>
                <option value={0}>Disabled (Cannot add students)</option>
              </select>
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
              {formSubmitting ? 'Registering Faculty...' : 'Save & Register Teacher'}
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT TEACHER MODAL */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Faculty: ${selectedTeacher?.teacher_name}`}
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
                <option value="Mathematics &amp; Sciences">Mathematics &amp; Sciences</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Primary Subject</label>
              <input
                type="text"
                className="form-control"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Designation / Post</label>
              <input
                type="text"
                className="form-control"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Monthly Salary (₹)</label>
              <input
                type="number"
                className="form-control"
                value={formData.salary}
                onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Account Access Status</label>
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
              <label className="form-label">Reset Password (leave empty to keep current)</label>
              <input
                type="password"
                className="form-control"
                placeholder="New password (min 6 characters)"
                value={formData.new_password}
                onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Permission to Enroll Students</label>
              <select
                className="form-control"
                value={formData.can_add_students}
                onChange={(e) => setFormData({ ...formData, can_add_students: parseInt(e.target.value, 10) })}
              >
                <option value={1}>Enabled (Can register new students)</option>
                <option value={0}>Disabled (Cannot add students)</option>
              </select>
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
              {formSubmitting ? 'Saving Changes...' : 'Update Faculty Record'}
            </button>
          </div>
        </form>
      </Modal>

      {/* VIEW TEACHER MODAL */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Teacher Profile & Details"
        maxWidth="600px"
      >
        {selectedTeacher && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              <div
                className="user-avatar"
                style={{ width: '60px', height: '60px', fontSize: '1.4rem' }}
              >
                {selectedTeacher.teacher_name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>{selectedTeacher.teacher_name}</h3>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Teacher ID: <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{selectedTeacher.teacher_id}</span> &bull; {selectedTeacher.designation}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', fontSize: '0.86rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Department:</span>
                <div style={{ fontWeight: 600 }}>{selectedTeacher.department}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Subject:</span>
                <div style={{ fontWeight: 600 }}>{selectedTeacher.subject || 'General'}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Username:</span>
                <div style={{ fontWeight: 600 }}>@{selectedTeacher.username}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Account Access:</span>
                <div>
                  <span className={`badge ${selectedTeacher.account_status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                    {selectedTeacher.account_status}
                  </span>
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Monthly Salary:</span>
                <div style={{ fontWeight: 600, color: '#10b981' }}>₹{(selectedTeacher.salary || 0).toLocaleString('en-IN')} / month</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Joining Date:</span>
                <div style={{ fontWeight: 600 }}>{selectedTeacher.joining_date || 'N/A'}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Phone:</span>
                <div style={{ fontWeight: 600 }}>{selectedTeacher.phone || 'None provided'}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Email:</span>
                <div style={{ fontWeight: 600 }}>{selectedTeacher.email || 'None provided'}</div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <span style={{ color: 'var(--text-muted)' }}>Enroll Students Permission:</span>
                <div style={{ fontWeight: 600 }}>
                  {selectedTeacher.can_add_students ? 'Permitted to register students' : 'Disabled by Admin'}
                </div>
              </div>
            </div>

            {/* Quick Admin Actions from view modal */}
            {isAdmin && (
              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => { setIsViewModalOpen(false); handleOpenEditModal(selectedTeacher); }}
                >
                  <Edit2 size={14} /> Edit Teacher
                </button>
                {selectedTeacher.account_status === 'active' && (
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{ background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '7px', padding: '6px 12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                    onClick={() => { setIsViewModalOpen(false); handleOpenDisableConfirm(selectedTeacher); }}
                  >
                    <ShieldOff size={14} /> Disable Account
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => { setIsViewModalOpen(false); handleOpenRemoveConfirm(selectedTeacher); }}
                >
                  <UserX size={14} /> Remove Teacher
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
