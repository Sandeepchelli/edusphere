import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import Modal from '../components/Modal';
import {
  ShieldAlert,
  Plus,
  Search,
  Edit2,
  Eye,
  CheckCircle,
  AlertCircle,
  Bus,
  Library,
  CreditCard,
  Wrench,
  ShieldCheck,
  UserX,
  ShieldOff,
  Filter
} from 'lucide-react';

const ROLE_LABELS = {
  watchman: 'Watchman',
  driver: 'Driver',
  cashier: 'Cashier',
  library_staff: 'Library Staff',
  lab_technician: 'Lab Technician',
  attender: 'Attender',
};

export default function StaffView({ currentUser }) {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);

  // Confirmation modal
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    type: null, // 'remove' | 'disable'
    staff: null,
    submitting: false,
  });

  const initialFormState = {
    name: '',
    staff_id: '',
    username: '',
    password: '',
    phone: '',
    email: '',
    role: 'watchman',
    department: 'Campus Security',
    salary: '18000',
    joining_date: new Date().toISOString().split('T')[0],
    vehicle_number: '',
    route: '',
    bus_stops: '',
  };
  const [formData, setFormData] = useState(initialFormState);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // ─── Data loading ────────────────────────────────────────────────────────────

  const loadStaff = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (filterRole) params.role = filterRole;
      if (filterStatus) params.status = filterStatus;
      const data = await api.getStaff(params);
      setStaffList(data);
    } catch (err) {
      setError(err.message || 'Failed to load staff list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, [filterRole, filterStatus]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadStaff();
  };

  // ─── Modal openers ───────────────────────────────────────────────────────────

  const handleOpenAddModal = () => {
    setFormData(initialFormState);
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (staff) => {
    setSelectedStaff(staff);
    setFormData({
      name: staff.staff_name || '',
      phone: staff.phone || '',
      email: staff.email || '',
      role: staff.role || 'watchman',
      department: staff.department || '',
      salary: staff.salary || 0,
      joining_date: staff.joining_date || '',
      vehicle_number: staff.vehicle_number || '',
      route: staff.route || '',
      bus_stops: staff.bus_stops || '',
      account_status: staff.account_status || 'active',
      new_password: '',
    });
    setFormError('');
    setIsEditModalOpen(true);
  };

  const handleOpenViewModal = (staff) => {
    setSelectedStaff(staff);
    setIsViewModalOpen(true);
  };

  const handleOpenRemoveConfirm = (staff) => {
    setConfirmModal({ open: true, type: 'remove', staff, submitting: false });
  };

  const handleOpenDisableConfirm = (staff) => {
    setConfirmModal({ open: true, type: 'disable', staff, submitting: false });
  };

  const handleCloseConfirm = () => {
    if (confirmModal.submitting) return;
    setConfirmModal({ open: false, type: null, staff: null, submitting: false });
  };

  // ─── Form submit handlers ────────────────────────────────────────────────────

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError('');
    try {
      await api.createStaff(formData);
      setSuccessMsg(`Staff member ${formData.name} added successfully!`);
      setIsAddModalOpen(false);
      loadStaff();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setFormError(err.message || 'Failed to add staff member.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError('');
    try {
      await api.updateStaff(selectedStaff.id, formData);
      setSuccessMsg('Staff member updated successfully.');
      setIsEditModalOpen(false);
      loadStaff();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setFormError(err.message || 'Failed to update staff member.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // ─── Confirmation action handlers ────────────────────────────────────────────

  const handleConfirmRemove = async () => {
    setConfirmModal((prev) => ({ ...prev, submitting: true }));
    try {
      await api.deleteStaff(confirmModal.staff.id);
      setSuccessMsg(
        `"${confirmModal.staff.staff_name}" removed. Historical salary & attendance records preserved.`
      );
      setConfirmModal({ open: false, type: null, staff: null, submitting: false });
      loadStaff();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setError(err.message || 'Failed to remove staff member.');
      setConfirmModal({ open: false, type: null, staff: null, submitting: false });
    }
  };

  const handleConfirmDisable = async () => {
    setConfirmModal((prev) => ({ ...prev, submitting: true }));
    try {
      await api.disableStaff(confirmModal.staff.id);
      setSuccessMsg(
        `"${confirmModal.staff.staff_name}" account disabled. Login access revoked.`
      );
      setConfirmModal({ open: false, type: null, staff: null, submitting: false });
      loadStaff();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setError(err.message || 'Failed to disable staff account.');
      setConfirmModal({ open: false, type: null, staff: null, submitting: false });
    }
  };

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  const getRoleIcon = (role) => {
    switch (role) {
      case 'driver': return <Bus size={15} color="#0ea5e9" />;
      case 'library_staff': return <Library size={15} color="#8b5cf6" />;
      case 'cashier': return <CreditCard size={15} color="#10b981" />;
      case 'lab_technician': return <Wrench size={15} color="#ec4899" />;
      default: return <ShieldCheck size={15} color="#6366f1" />;
    }
  };

  const isAdmin = currentUser?.role === 'admin';

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Alert messages */}
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

      {/* Main Card */}
      <div className="content-card">
        <div className="card-header">
          <div className="card-title-group">
            <h3>College Management Staff</h3>
            <p>Administer support personnel: drivers, library staff, cashiers, watchmen, attenders, and technicians</p>
          </div>

          <div className="card-actions">
            {/* Filter bar */}
            <form onSubmit={handleSearchSubmit} className="filter-bar">
              <div className="search-input-wrapper">
                <Search size={16} />
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search by name or Staff ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <select
                className="select-filter"
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
              >
                <option value="">All Roles</option>
                <option value="watchman">Watchman</option>
                <option value="driver">Driver</option>
                <option value="cashier">Cashier</option>
                <option value="library_staff">Library Staff</option>
                <option value="lab_technician">Lab Technician</option>
                <option value="attender">Attender</option>
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
              <button type="button" className="btn btn-primary" onClick={handleOpenAddModal}>
                <Plus size={18} />
                <span>Add Staff Member</span>
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Staff Member</th>
                <th>Staff ID</th>
                <th>Role</th>
                <th>Department</th>
                <th>Contact</th>
                <th>Monthly Salary</th>
                <th>Transport Info</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    Loading staff records...
                  </td>
                </tr>
              ) : staffList.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No staff members found.{isAdmin ? ' Click "Add Staff Member" to add operational staff.' : ''}
                  </td>
                </tr>
              ) : (
                staffList.map((s) => (
                  <tr key={s.id}>
                    {/* Name */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="user-avatar" style={{ width: '36px', height: '36px', fontSize: '0.85rem' }}>
                          {s.staff_name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{s.staff_name}</div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>@{s.username}</div>
                        </div>
                      </div>
                    </td>
                    {/* Staff ID */}
                    <td><span style={{ fontWeight: 600, color: 'var(--primary)' }}>{s.staff_id}</span></td>
                    {/* Role */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {getRoleIcon(s.role)}
                        <span style={{ fontWeight: 600 }}>{ROLE_LABELS[s.role] || s.role}</span>
                      </div>
                    </td>
                    {/* Department */}
                    <td>{s.department || 'Operations'}</td>
                    {/* Contact */}
                    <td>{s.phone || s.email || '—'}</td>
                    {/* Salary */}
                    <td>
                      <span style={{ fontWeight: 600 }}>₹{(s.salary || 0).toLocaleString('en-IN')}</span>
                    </td>
                    {/* Transport */}
                    <td>
                      {s.role === 'driver' ? (
                        <div>
                          <div style={{ fontWeight: 600 }}>Bus {s.vehicle_number || 'N/A'}</div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{s.route || 'No route set'}</div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-light)' }}>—</span>
                      )}
                    </td>
                    {/* Status */}
                    <td>
                      <span className={`badge ${s.account_status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                        {s.account_status === 'active' ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    {/* Actions */}
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
                              title="Edit Staff Member"
                              onClick={() => handleOpenEditModal(s)}
                            >
                              <Edit2 size={13} />
                            </button>

                            {/* Disable — only when active */}
                            {s.account_status === 'active' && (
                              <button
                                type="button"
                                className="btn btn-sm"
                                title="Disable Account"
                                style={{
                                  background: '#f59e0b', color: '#fff', border: 'none',
                                  borderRadius: '6px', padding: '4px 8px', cursor: 'pointer',
                                  display: 'flex', alignItems: 'center', gap: '3px'
                                }}
                                onClick={() => handleOpenDisableConfirm(s)}
                              >
                                <ShieldOff size={13} />
                              </button>
                            )}

                            {/* Remove */}
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              title="Remove Staff Member"
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

      {/* ─── REMOVE STAFF CONFIRMATION MODAL ──────────────────────────────────── */}
      <Modal
        isOpen={confirmModal.open && confirmModal.type === 'remove'}
        onClose={handleCloseConfirm}
        title="Remove Staff Member?"
        maxWidth="460px"
      >
        {confirmModal.staff && (
          <div>
            <div style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: '10px',
              padding: '16px 18px',
              marginBottom: '20px',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start',
            }}>
              <AlertCircle size={20} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontWeight: 700, color: '#ef4444', marginBottom: '6px' }}>
                  Remove Staff Account
                </div>
                <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  Are you sure you want to remove <strong>{confirmModal.staff.staff_name}</strong> ({confirmModal.staff.staff_id})?
                  <br /><br />
                  This will:
                  <ul style={{ margin: '6px 0 0 16px', padding: 0 }}>
                    <li>Permanently remove their login access</li>
                    <li>Remove them from active staff lists</li>
                    <li>Remove them from attendance selection</li>
                    <li>Remove them from active assignments</li>
                  </ul>
                  <br />
                  <span style={{ color: '#10b981', fontWeight: 600 }}>
                    ✓ Salary and attendance history will be safely preserved.
                  </span>
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
                {confirmModal.submitting ? 'Removing...' : '🗑 Remove Staff'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── DISABLE ACCOUNT CONFIRMATION MODAL ───────────────────────────────── */}
      <Modal
        isOpen={confirmModal.open && confirmModal.type === 'disable'}
        onClose={handleCloseConfirm}
        title="Disable Staff Account?"
        maxWidth="440px"
      >
        {confirmModal.staff && (
          <div>
            <div style={{
              background: 'rgba(245,158,11,0.08)',
              border: '1px solid rgba(245,158,11,0.3)',
              borderRadius: '10px',
              padding: '16px 18px',
              marginBottom: '20px',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start',
            }}>
              <ShieldOff size={20} style={{ color: '#f59e0b', flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Disable login for <strong>{confirmModal.staff.staff_name}</strong>?
                <br /><br />
                The staff member will not be able to log in. All records are preserved. You can re-enable the account from the Edit screen.
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
                style={{
                  background: '#f59e0b', color: '#fff', border: 'none',
                  borderRadius: '8px', padding: '8px 18px', fontWeight: 600, cursor: 'pointer',
                  opacity: confirmModal.submitting ? 0.7 : 1,
                }}
                onClick={handleConfirmDisable}
                disabled={confirmModal.submitting}
              >
                {confirmModal.submitting ? 'Disabling...' : 'Disable Account'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── ADD STAFF MODAL ──────────────────────────────────────────────────── */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add College Management Staff Member"
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
              <label className="form-label">Full Name <span className="required">*</span></label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Ravi Kumar"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Staff ID <span className="required">*</span></label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. STF-DRV-04"
                value={formData.staff_id}
                onChange={(e) => setFormData({ ...formData, staff_id: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Staff Role <span className="required">*</span></label>
              <select
                className="form-control"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                required
              >
                <option value="watchman">Watchman (Security)</option>
                <option value="driver">Driver (Transport)</option>
                <option value="cashier">Cashier (Finance / Fees)</option>
                <option value="library_staff">Library Staff</option>
                <option value="lab_technician">Lab Technician</option>
                <option value="attender">Attender</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Department / Unit</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Campus Transport / Central Library"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
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
              <label className="form-label">Password <span className="required">*</span></label>
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
              <label className="form-label">Monthly Salary (₹)</label>
              <input
                type="number"
                className="form-control"
                placeholder="18000"
                value={formData.salary}
                onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
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
              <label className="form-label">Phone</label>
              <input
                type="text"
                className="form-control"
                placeholder="+91 98765 43210"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-control"
                placeholder="staff@college.edu"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            {formData.role === 'driver' && (
              <>
                <div className="form-group">
                  <label className="form-label">Vehicle / Bus Number</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. BUS-08 (KA-01-AB-1234)"
                    value={formData.vehicle_number}
                    onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Assigned Route</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Route 4: City Centre to College"
                    value={formData.route}
                    onChange={(e) => setFormData({ ...formData, route: e.target.value })}
                  />
                </div>

                <div className="form-group full-width">
                  <label className="form-label">Bus Stops (comma-separated)</label>
                  <textarea
                    className="form-control"
                    placeholder="e.g. Central Station, Metro Plaza, Oak Ridge, College Main Gate"
                    value={formData.bus_stops}
                    onChange={(e) => setFormData({ ...formData, bus_stops: e.target.value })}
                  />
                </div>
              </>
            )}
          </div>

          <div style={{ marginTop: '28px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={formSubmitting}>
              {formSubmitting ? 'Registering...' : 'Save & Register Staff'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── EDIT STAFF MODAL ─────────────────────────────────────────────────── */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Staff Member: ${selectedStaff?.staff_name}`}
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
              <label className="form-label">Role</label>
              <select
                className="form-control"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              >
                <option value="watchman">Watchman</option>
                <option value="driver">Driver</option>
                <option value="cashier">Cashier</option>
                <option value="library_staff">Library Staff</option>
                <option value="lab_technician">Lab Technician</option>
                <option value="attender">Attender</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Department / Unit</label>
              <input
                type="text"
                className="form-control"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
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
                placeholder="New password (min 6 chars)"
                value={formData.new_password}
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

            {formData.role === 'driver' && (
              <>
                <div className="form-group">
                  <label className="form-label">Vehicle Number</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.vehicle_number}
                    onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Assigned Route</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.route}
                    onChange={(e) => setFormData({ ...formData, route: e.target.value })}
                  />
                </div>

                <div className="form-group full-width">
                  <label className="form-label">Bus Stops</label>
                  <textarea
                    className="form-control"
                    value={formData.bus_stops}
                    onChange={(e) => setFormData({ ...formData, bus_stops: e.target.value })}
                  />
                </div>
              </>
            )}
          </div>

          <div style={{ marginTop: '28px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={formSubmitting}>
              {formSubmitting ? 'Saving...' : 'Update Staff Record'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── VIEW STAFF MODAL ─────────────────────────────────────────────────── */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Staff Profile Details"
        maxWidth="600px"
      >
        {selectedStaff && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              <div className="user-avatar" style={{ width: '60px', height: '60px', fontSize: '1.4rem' }}>
                {selectedStaff.staff_name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>{selectedStaff.staff_name}</h3>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Staff ID: <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{selectedStaff.staff_id}</span>
                  {' '}&bull;{' '}
                  <span style={{ textTransform: 'capitalize' }}>
                    {ROLE_LABELS[selectedStaff.role] || selectedStaff.role}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', fontSize: '0.86rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Role:</span>
                <div style={{ fontWeight: 600 }}>{ROLE_LABELS[selectedStaff.role] || selectedStaff.role}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Department:</span>
                <div style={{ fontWeight: 600 }}>{selectedStaff.department || 'Operations'}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Username:</span>
                <div style={{ fontWeight: 600 }}>@{selectedStaff.username}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Account Access:</span>
                <div>
                  <span className={`badge ${selectedStaff.account_status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                    {selectedStaff.account_status}
                  </span>
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Monthly Salary:</span>
                <div style={{ fontWeight: 600, color: '#10b981' }}>
                  ₹{(selectedStaff.salary || 0).toLocaleString('en-IN')} / month
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Joining Date:</span>
                <div style={{ fontWeight: 600 }}>{selectedStaff.joining_date || 'N/A'}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Phone:</span>
                <div style={{ fontWeight: 600 }}>{selectedStaff.phone || 'None provided'}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Email:</span>
                <div style={{ fontWeight: 600 }}>{selectedStaff.email || 'None provided'}</div>
              </div>

              {selectedStaff.role === 'driver' && (
                <>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Vehicle Number:</span>
                    <div style={{ fontWeight: 600 }}>{selectedStaff.vehicle_number || 'N/A'}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Route:</span>
                    <div style={{ fontWeight: 600 }}>{selectedStaff.route || 'N/A'}</div>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Bus Stops:</span>
                    <div style={{ fontWeight: 600 }}>{selectedStaff.bus_stops || 'None specified'}</div>
                  </div>
                </>
              )}
            </div>

            {/* Quick Admin Actions */}
            {isAdmin && (
              <div style={{
                marginTop: '20px',
                paddingTop: '16px',
                borderTop: '1px solid var(--border-color)',
                display: 'flex',
                gap: '10px',
                flexWrap: 'wrap',
              }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => { setIsViewModalOpen(false); handleOpenEditModal(selectedStaff); }}
                >
                  <Edit2 size={14} /> Edit Staff
                </button>

                {selectedStaff.account_status === 'active' && (
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{
                      background: '#f59e0b', color: '#fff', border: 'none',
                      borderRadius: '7px', padding: '6px 12px', fontWeight: 600,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
                    }}
                    onClick={() => { setIsViewModalOpen(false); handleOpenDisableConfirm(selectedStaff); }}
                  >
                    <ShieldOff size={14} /> Disable Account
                  </button>
                )}

                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => { setIsViewModalOpen(false); handleOpenRemoveConfirm(selectedStaff); }}
                >
                  <UserX size={14} /> Remove Staff
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
