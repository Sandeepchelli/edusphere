import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import Modal from '../components/Modal';
import {
  DollarSign,
  Plus,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Search,
  Receipt,
  FileText,
  Calendar
} from 'lucide-react';

export default function FeesView({ currentUser }) {
  const [activeTab, setActiveTab] = useState('fees'); // 'fees' | 'payments'
  const [fees, setFees] = useState([]);
  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Modals
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedFee, setSelectedFee] = useState(null);

  const [assignForm, setAssignForm] = useState({
    student_id: '',
    academic_year: '2026-2027',
    total_fee: '4500',
    due_date: '2026-12-31',
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_method: 'Cash',
    receipt_no: '',
    payment_date: new Date().toISOString().split('T')[0],
  });

  const [submitting, setSubmitting] = useState(false);

  const isCashierOrAdmin = currentUser?.role === 'admin' || currentUser?.role === 'cashier';

  const loadData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (filterStatus) params.status = filterStatus;

      const [feeList, payList] = await Promise.all([
        api.getFees(params),
        api.getPayments(),
      ]);

      setFees(feeList);
      setPayments(payList);

      if (isCashierOrAdmin) {
        const sList = await api.getStudents();
        setStudents(sList);
        if (sList.length > 0 && !assignForm.student_id) {
          setAssignForm((prev) => ({ ...prev, student_id: sList[0].id }));
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load fee information.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, filterStatus]);

  const handleAssignFee = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await api.assignFee(assignForm);
      setSuccessMsg('Fee structure assigned successfully.');
      setIsAssignModalOpen(false);
      loadData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to assign fee.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenPayment = (fee) => {
    setSelectedFee(fee);
    setPaymentForm({
      amount: fee.amount_pending > 0 ? String(fee.amount_pending) : '500',
      payment_method: 'Cash',
      receipt_no: `REC-${Date.now().toString().slice(-6)}`,
      payment_date: new Date().toISOString().split('T')[0],
    });
    setIsPaymentModalOpen(true);
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await api.recordPayment({
        fee_id: selectedFee.id,
        student_id: selectedFee.student_id,
        amount: paymentForm.amount,
        payment_method: paymentForm.payment_method,
        receipt_no: paymentForm.receipt_no,
        payment_date: paymentForm.payment_date,
      });

      setSuccessMsg(`Payment recorded successfully! Receipt: ${paymentForm.receipt_no}`);
      setIsPaymentModalOpen(false);
      loadData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to record payment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Switcher */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button
          type="button"
          className={`btn ${activeTab === 'fees' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('fees')}
        >
          <DollarSign size={16} />
          <span>Student Fee Accounts</span>
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'payments' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('payments')}
        >
          <Receipt size={16} />
          <span>Payment Receipts History</span>
        </button>
      </div>

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

      {/* TAB 1: FEES */}
      {activeTab === 'fees' && (
        <div className="content-card">
          <div className="card-header">
            <div className="card-title-group">
              <h3>College Student Fee Management</h3>
              <p>Tuition fees, payment tracking, balance dues, and cashier receipt logging</p>
            </div>

            <div className="card-actions">
              <div className="search-input-wrapper">
                <Search size={16} />
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search student or ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <select
                className="select-filter"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="Paid">Paid in Full</option>
                <option value="Partial">Partial Payment</option>
                <option value="Pending">Payment Pending</option>
              </select>

              {isCashierOrAdmin && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setIsAssignModalOpen(true)}
                >
                  <Plus size={16} />
                  <span>Assign Student Fee</span>
                </button>
              )}
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Class & Section</th>
                  <th>Total Fee</th>
                  <th>Amount Paid</th>
                  <th>Pending Due</th>
                  <th>Last Payment</th>
                  <th>Status</th>
                  {isCashierOrAdmin && <th>Cashier Action</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                      Loading fee records...
                    </td>
                  </tr>
                ) : fees.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      No student fee accounts found.
                    </td>
                  </tr>
                ) : (
                  fees.map((f) => (
                    <tr key={f.id}>
                      <td>
                        <strong>{f.student_name}</strong>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          ID: {f.student_reg_id}
                        </div>
                      </td>
                      <td>{f.class_year} - Sec {f.section}</td>
                      <td><strong>${f.total_fee}</strong></td>
                      <td style={{ color: '#059669', fontWeight: 600 }}>${f.amount_paid}</td>
                      <td style={{ color: f.amount_pending > 0 ? '#dc2626' : '#059669', fontWeight: 700 }}>
                        ${f.amount_pending}
                      </td>
                      <td>{f.last_payment_date || 'None'}</td>
                      <td>
                        <span
                          className={`badge ${
                            f.status === 'Paid'
                              ? 'badge-success'
                              : f.status === 'Partial'
                              ? 'badge-warning'
                              : 'badge-danger'
                          }`}
                        >
                          {f.status}
                        </span>
                      </td>
                      {isCashierOrAdmin && (
                        <td>
                          {f.amount_pending > 0 ? (
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => handleOpenPayment(f)}
                            >
                              <CreditCard size={14} />
                              <span>Record Payment</span>
                            </button>
                          ) : (
                            <span className="badge badge-success">Cleared</span>
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

      {/* TAB 2: PAYMENTS */}
      {activeTab === 'payments' && (
        <div className="content-card">
          <div className="card-header">
            <div className="card-title-group">
              <h3>Cashier Payment Receipts</h3>
              <p>Official ledger of payments received by college accounts</p>
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Receipt Number</th>
                  <th>Student Name</th>
                  <th>Student ID</th>
                  <th>Amount Paid</th>
                  <th>Payment Date</th>
                  <th>Payment Mode</th>
                  <th>Cashier / Collector</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                      No payment transactions recorded yet.
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <span style={{ fontWeight: 700, color: 'var(--primary)', fontFamily: 'monospace' }}>
                          {p.receipt_no}
                        </span>
                      </td>
                      <td><strong>{p.student_name}</strong></td>
                      <td>{p.student_reg_id}</td>
                      <td style={{ fontWeight: 800, color: '#059669', fontSize: '0.95rem' }}>
                        ${p.amount}
                      </td>
                      <td>{p.payment_date}</td>
                      <td>
                        <span className="badge badge-purple">{p.payment_method}</span>
                      </td>
                      <td>{p.recorded_by_name || 'Cashier Desk'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: ASSIGN FEE STRUCTURE */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Assign Student Annual Fee"
        maxWidth="550px"
      >
        <form onSubmit={handleAssignFee}>
          <div className="form-grid">
            <div className="form-group full-width">
              <label className="form-label">Student <span className="required">*</span></label>
              <select
                className="form-control"
                value={assignForm.student_id}
                onChange={(e) => setAssignForm({ ...assignForm, student_id: e.target.value })}
                required
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.student_name} ({s.student_id} - {s.class_year})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Academic Year</label>
              <input
                type="text"
                className="form-control"
                value={assignForm.academic_year}
                onChange={(e) => setAssignForm({ ...assignForm, academic_year: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Total Fee Amount ($) <span className="required">*</span></label>
              <input
                type="number"
                className="form-control"
                placeholder="4500"
                value={assignForm.total_fee}
                onChange={(e) => setAssignForm({ ...assignForm, total_fee: e.target.value })}
                required
              />
            </div>

            <div className="form-group full-width">
              <label className="form-label">Due Date</label>
              <input
                type="date"
                className="form-control"
                value={assignForm.due_date}
                onChange={(e) => setAssignForm({ ...assignForm, due_date: e.target.value })}
              />
            </div>
          </div>

          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsAssignModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Assigning...' : 'Assign Fee'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: RECORD PAYMENT */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title={`Record Payment for: ${selectedFee?.student_name}`}
        maxWidth="550px"
      >
        <form onSubmit={handleRecordPayment}>
          <div style={{ marginBottom: '16px', fontSize: '0.86rem', background: 'var(--bg-card-subtle)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
            <div>Student: <strong>{selectedFee?.student_name}</strong> ({selectedFee?.student_reg_id})</div>
            <div>Total Fee: <strong>${selectedFee?.total_fee}</strong></div>
            <div>Pending Due: <strong style={{ color: '#dc2626' }}>${selectedFee?.amount_pending}</strong></div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Payment Amount ($) <span className="required">*</span></label>
              <input
                type="number"
                step="0.01"
                className="form-control"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Payment Method <span className="required">*</span></label>
              <select
                className="form-control"
                value={paymentForm.payment_method}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                required
              >
                <option value="Cash">Cash at Counter</option>
                <option value="Online / UPI">Online / UPI</option>
                <option value="Card">Credit / Debit Card</option>
                <option value="Bank Transfer">Bank Transfer / NEFT</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Receipt Number <span className="required">*</span></label>
              <input
                type="text"
                className="form-control"
                value={paymentForm.receipt_no}
                onChange={(e) => setPaymentForm({ ...paymentForm, receipt_no: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Payment Date</label>
              <input
                type="date"
                className="form-control"
                value={paymentForm.payment_date}
                onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
              />
            </div>
          </div>

          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsPaymentModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Recording...' : 'Generate Receipt & Save'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
