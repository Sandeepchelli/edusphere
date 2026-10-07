import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import Modal from '../components/Modal';
import {
  FileCheck,
  Plus,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  ShieldCheck,
  Calendar,
  User,
  Filter
} from 'lucide-react';

export default function LeaveView({ currentUser }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');

  // Modals
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState(null);

  const initialForm = {
    type: 'Leave',
    date: new Date().toISOString().split('T')[0],
    from_time: '09:00 AM',
    to_time: '05:00 PM',
    reason: '',
    description: '',
  };
  const [form, setForm] = useState(initialForm);

  const [reviewForm, setReviewForm] = useState({
    status: 'Approved',
    review_notes: '',
  });

  const [submitting, setSubmitting] = useState(false);

  const isStudent = currentUser?.role === 'student';
  const isTeacherOrAdmin = currentUser?.role === 'admin' || currentUser?.role === 'teacher';

  const loadRequests = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (filterType) params.type = filterType;

      const data = await api.getLeaveRequests(params);
      setRequests(data);
    } catch (err) {
      setError(err.message || 'Failed to load requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [filterStatus, filterType]);

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!form.reason.trim()) {
      setError('Please provide a reason for the request.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await api.submitLeaveRequest(form);
      setSuccessMsg(`${form.type} request submitted successfully.`);
      setIsSubmitModalOpen(false);
      setForm(initialForm);
      loadRequests();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenReview = (req) => {
    setSelectedReq(req);
    setReviewForm({
      status: 'Approved',
      review_notes: '',
    });
    setIsReviewModalOpen(true);
  };

  const handleSaveReview = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await api.reviewLeaveRequest(selectedReq.id, reviewForm);
      setSuccessMsg(`Request marked as ${reviewForm.status}. Notification sent to student and parent.`);
      setIsReviewModalOpen(false);
      loadRequests();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to review request.');
    } finally {
      setSubmitting(false);
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

      {/* Main Table Card */}
      <div className="content-card">
        <div className="card-header">
          <div className="card-title-group">
            <h3>Leave & Campus Outing Gate Pass Management</h3>
            <p>Digital application, faculty verification, and "Permission Granted" status</p>
          </div>

          <div className="card-actions">
            <select
              className="select-filter"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="">All Types</option>
              <option value="Leave">Full Day Leave</option>
              <option value="Outing">Campus Outing</option>
            </select>

            <select
              className="select-filter"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending Review</option>
              <option value="Approved">Permission Granted</option>
              <option value="Rejected">Rejected</option>
            </select>

            {isStudent && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setIsSubmitModalOpen(true)}
              >
                <Plus size={16} />
                <span>Submit New Request</span>
              </button>
            )}
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Request Type</th>
                <th>Requested Date</th>
                <th>Time Window</th>
                <th>Reason & Notes</th>
                <th>Status</th>
                <th>Reviewed By</th>
                {isTeacherOrAdmin && <th>Review Action</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    Loading leave and outing requests...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No leave or outing requests found.
                  </td>
                </tr>
              ) : (
                requests.map((r) => {
                  const isApproved = r.status === 'Approved';
                  const isRejected = r.status === 'Rejected';

                  return (
                    <tr key={r.id}>
                      <td>
                        <strong>{r.student_name}</strong>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          {r.class_year} - Sec {r.section} ({r.student_reg_id})
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${r.type === 'Leave' ? 'badge-purple' : 'badge-info'}`}>
                          {r.type}
                        </span>
                      </td>
                      <td><strong>{r.date}</strong></td>
                      <td>
                        {r.from_time && r.to_time ? `${r.from_time} to ${r.to_time}` : 'Full Day'}
                      </td>
                      <td>
                        <div><strong>{r.reason}</strong></div>
                        {r.description && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '240px' }}>
                            {r.description}
                          </div>
                        )}
                      </td>
                      <td>
                        {isApproved ? (
                          <span className="permission-granted-badge">
                            <ShieldCheck size={14} />
                            <span>Permission Granted</span>
                          </span>
                        ) : isRejected ? (
                          <span className="badge badge-danger">Rejected</span>
                        ) : (
                          <span className="badge badge-warning">Pending Review</span>
                        )}
                      </td>
                      <td>
                        {r.reviewer_name ? (
                          <div>
                            <div style={{ fontWeight: 500 }}>{r.reviewer_name}</div>
                            {r.review_notes && (
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                "{r.review_notes}"
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-light)', fontStyle: 'italic' }}>Pending</span>
                        )}
                      </td>
                      {isTeacherOrAdmin && (
                        <td>
                          {r.status === 'Pending' ? (
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => handleOpenReview(r)}
                            >
                              Review & Permit
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleOpenReview(r)}
                            >
                              Modify Status
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: SUBMIT LEAVE / OUTING (STUDENT) */}
      <Modal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        title="Submit Leave / Outing Request"
        maxWidth="600px"
      >
        <form onSubmit={handleSubmitRequest}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Request Type <span className="required">*</span></label>
              <select
                className="form-control"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                required
              >
                <option value="Leave">Full Day Leave</option>
                <option value="Outing">Campus Outing / Short Gate Pass</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Date <span className="required">*</span></label>
              <input
                type="date"
                className="form-control"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">From Time</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. 10:00 AM"
                value={form.from_time}
                onChange={(e) => setForm({ ...form, from_time: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">To Time</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. 04:00 PM"
                value={form.to_time}
                onChange={(e) => setForm({ ...form, to_time: e.target.value })}
              />
            </div>

            <div className="form-group full-width">
              <label className="form-label">Primary Reason <span className="required">*</span></label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Medical Consultation / Family Occasion"
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                required
              />
            </div>

            <div className="form-group full-width">
              <label className="form-label">Detailed Explanation</label>
              <textarea
                className="form-control"
                placeholder="Provide any additional details or emergency contact"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>

          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsSubmitModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit to Faculty'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: REVIEW LEAVE REQUEST (TEACHER / ADMIN) */}
      <Modal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        title={`Review Request: ${selectedReq?.student_name}`}
        maxWidth="550px"
      >
        <form onSubmit={handleSaveReview}>
          <div style={{ marginBottom: '16px', fontSize: '0.86rem', background: 'var(--bg-card-subtle)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
            <div>Student: <strong>{selectedReq?.student_name}</strong> ({selectedReq?.student_reg_id})</div>
            <div>Type: <strong>{selectedReq?.type}</strong> on <strong>{selectedReq?.date}</strong></div>
            <div>Reason: <strong>{selectedReq?.reason}</strong></div>
          </div>

          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label">Decision <span className="required">*</span></label>
            <select
              className="form-control"
              value={reviewForm.status}
              onChange={(e) => setReviewForm({ ...reviewForm, status: e.target.value })}
              required
            >
              <option value="Approved">Approve (Grant Permission)</option>
              <option value="Rejected">Reject Request</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label">Faculty Notes / Instructions</label>
            <textarea
              className="form-control"
              placeholder="e.g. Approved. Please report back before 5 PM."
              value={reviewForm.review_notes}
              onChange={(e) => setReviewForm({ ...reviewForm, review_notes: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsReviewModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`btn ${reviewForm.status === 'Approved' ? 'btn-success' : 'btn-danger'}`}
              disabled={submitting}
            >
              {submitting ? 'Processing...' : (reviewForm.status === 'Approved' ? 'Grant Permission' : 'Reject Request')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
