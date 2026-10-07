import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import Modal from '../components/Modal';
import {
  CreditCard,
  Plus,
  CheckCircle,
  AlertCircle,
  Search,
  DollarSign,
  Calendar,
  UserCheck
} from 'lucide-react';

export default function SalaryView({ currentUser }) {
  const [salaries, setSalaries] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [filterMonth, setFilterMonth] = useState('October 2026');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [form, setForm] = useState({
    user_id: '',
    month_year: 'October 2026',
    base_salary: '5500',
    amount_paid: '5500',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'Direct Bank Transfer',
  });

  const [submitting, setSubmitting] = useState(false);

  const isAdmin = currentUser?.role === 'admin';

  const loadData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterMonth) params.month_year = filterMonth;

      const salList = await api.getSalaries(params);
      setSalaries(salList);

      if (isAdmin) {
        // Fetch teachers and staff to populate employee selector
        const [tchs, stfs] = await Promise.all([
          api.getTeachers(),
          api.getStaff(),
        ]);

        const combined = [
          ...tchs.map((t) => ({ user_id: t.user_id, name: `${t.teacher_name} (Faculty - ${t.department})`, salary: t.salary })),
          ...stfs.map((s) => ({ user_id: s.user_id, name: `${s.staff_name} (${s.role.replace('_', ' ')})`, salary: s.salary })),
        ];
        setEmployees(combined);
        if (combined.length > 0 && !form.user_id) {
          setForm((prev) => ({
            ...prev,
            user_id: combined[0].user_id,
            base_salary: combined[0].salary || '5000',
            amount_paid: combined[0].salary || '5000',
          }));
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load salaries.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterMonth]);

  const handleEmployeeChange = (userId) => {
    const emp = employees.find((e) => e.user_id == userId);
    setForm({
      ...form,
      user_id: userId,
      base_salary: emp ? String(emp.salary) : form.base_salary,
      amount_paid: emp ? String(emp.salary) : form.amount_paid,
    });
  };

  const handleSaveSalary = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await api.recordSalary(form);
      setSuccessMsg('Salary processed and employee notified successfully.');
      setIsAddModalOpen(false);
      loadData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to process salary.');
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

      <div className="content-card">
        <div className="card-header">
          <div className="card-title-group">
            <h3>Payroll & Salary Disbursals</h3>
            <p>Monthly compensation ledger for professors, lecturers, and management staff</p>
          </div>

          <div className="card-actions">
            <select
              className="select-filter"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
            >
              <option value="">All Months</option>
              <option value="October 2026">October 2026</option>
              <option value="September 2026">September 2026</option>
              <option value="August 2026">August 2026</option>
            </select>

            {isAdmin && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setIsAddModalOpen(true)}
              >
                <Plus size={16} />
                <span>Issue Staff Salary</span>
              </button>
            )}
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee Name</th>
                <th>Role & Dept</th>
                <th>Pay Period</th>
                <th>Base Salary</th>
                <th>Amount Paid</th>
                <th>Pending</th>
                <th>Disbursal Date</th>
                <th>Payment Mode</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    Loading salary records...
                  </td>
                </tr>
              ) : salaries.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No salary records logged for this month.
                  </td>
                </tr>
              ) : (
                salaries.map((s) => (
                  <tr key={s.id}>
                    <td><strong>{s.employee_name}</strong></td>
                    <td>
                      <span className="badge badge-purple" style={{ textTransform: 'capitalize' }}>
                        {s.employee_role?.replace('_', ' ')}
                      </span>
                      {s.department && (
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {s.department}
                        </div>
                      )}
                    </td>
                    <td>{s.month_year}</td>
                    <td>${s.base_salary}</td>
                    <td style={{ color: '#059669', fontWeight: 700 }}>${s.amount_paid}</td>
                    <td style={{ color: s.amount_pending > 0 ? '#dc2626' : '#059669' }}>
                      ${s.amount_pending}
                    </td>
                    <td>{s.payment_date || 'Processing'}</td>
                    <td>{s.payment_method || 'Bank Transfer'}</td>
                    <td>
                      <span className={`badge ${s.status === 'Paid' ? 'badge-success' : 'badge-warning'}`}>
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: ISSUE SALARY */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Issue Employee Monthly Salary"
        maxWidth="600px"
      >
        <form onSubmit={handleSaveSalary}>
          <div className="form-grid">
            <div className="form-group full-width">
              <label className="form-label">Employee (Faculty / Staff) <span className="required">*</span></label>
              <select
                className="form-control"
                value={form.user_id}
                onChange={(e) => handleEmployeeChange(e.target.value)}
                required
              >
                {employees.map((e) => (
                  <option key={e.user_id} value={e.user_id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Pay Period (Month & Year) <span className="required">*</span></label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. October 2026"
                value={form.month_year}
                onChange={(e) => setForm({ ...form, month_year: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Base Salary ($) <span className="required">*</span></label>
              <input
                type="number"
                className="form-control"
                value={form.base_salary}
                onChange={(e) => setForm({ ...form, base_salary: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Amount Paid ($) <span className="required">*</span></label>
              <input
                type="number"
                className="form-control"
                value={form.amount_paid}
                onChange={(e) => setForm({ ...form, amount_paid: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Disbursal Date</label>
              <input
                type="date"
                className="form-control"
                value={form.payment_date}
                onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
              />
            </div>

            <div className="form-group full-width">
              <label className="form-label">Disbursal Mode</label>
              <select
                className="form-control"
                value={form.payment_method}
                onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
              >
                <option value="Direct Bank Transfer">Direct Bank Transfer</option>
                <option value="Company Cheque">Company Cheque</option>
                <option value="Cash Disbursement">Cash Disbursement</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
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
              disabled={submitting}
            >
              {submitting ? 'Processing...' : 'Disburse Salary'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
