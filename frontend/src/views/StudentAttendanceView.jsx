import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  CalendarCheck,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  BookOpen,
  Filter
} from 'lucide-react';

export default function StudentAttendanceView({ currentUser }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    loadAttendance();
  }, []);

  const loadAttendance = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.getMyAttendance();
      setData(result);
    } catch (err) {
      setError(err.message || 'Failed to load your attendance records.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <CalendarCheck size={40} style={{ marginBottom: '12px', opacity: 0.4 }} />
        <p>Loading your attendance records...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger" style={{ margin: '24px 0' }}>
        <AlertCircle size={18} />
        <span>{error}</span>
      </div>
    );
  }

  const records = data?.records || [];
  const stats = data?.stats || { total: 0, present: 0, absent: 0, percentage: 0 };
  const subjectBreakdown = data?.subjectBreakdown || [];
  const studentInfo = data?.student || {};

  // Apply filters
  const filteredRecords = records.filter(r => {
    const subMatch = !filterSubject || (r.subject_name || 'General').toLowerCase().includes(filterSubject.toLowerCase());
    const statusMatch = !filterStatus || r.status.toLowerCase() === filterStatus.toLowerCase();
    return subMatch && statusMatch;
  });

  const attColor = parseFloat(stats.percentage) >= 75 ? '#10b981' : parseFloat(stats.percentage) >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div>
      {/* Overview Cards */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: '#eef2ff', color: '#6366f1' }}>
            <CalendarCheck size={22} />
          </div>
          <div className="stat-card-content">
            <div className="stat-card-value">{stats.total}</div>
            <div className="stat-card-label">Total Classes</div>
            <div className="stat-card-sub">{studentInfo.class_year} – {studentInfo.department} – Sec {studentInfo.section}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: '#ecfdf5', color: '#10b981' }}>
            <CheckCircle size={22} />
          </div>
          <div className="stat-card-content">
            <div className="stat-card-value" style={{ color: '#10b981' }}>{stats.present}</div>
            <div className="stat-card-label">Present</div>
            <div className="stat-card-sub">Classes attended</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: '#fef2f2', color: '#ef4444' }}>
            <XCircle size={22} />
          </div>
          <div className="stat-card-content">
            <div className="stat-card-value" style={{ color: '#ef4444' }}>{stats.absent}</div>
            <div className="stat-card-label">Absent</div>
            <div className="stat-card-sub">Classes missed</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: attColor === '#10b981' ? '#ecfdf5' : attColor === '#f59e0b' ? '#fffbeb' : '#fef2f2', color: attColor }}>
            <TrendingUp size={22} />
          </div>
          <div className="stat-card-content">
            <div className="stat-card-value" style={{ color: attColor }}>{stats.percentage}%</div>
            <div className="stat-card-label">Overall Attendance</div>
            <div className="stat-card-sub" style={{ color: parseFloat(stats.percentage) >= 75 ? '#10b981' : '#ef4444', fontWeight: 600 }}>
              {parseFloat(stats.percentage) >= 75 ? '✓ Eligible' : '⚠ Below minimum (75%)'}
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Progress Bar */}
      <div className="content-card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <div className="card-title-group">
            <h3>Attendance Progress</h3>
            <p>Your overall attendance rate for the current academic year</p>
          </div>
        </div>
        <div style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.88rem', fontWeight: 600 }}>
            <span>Attendance Rate</span>
            <span style={{ color: attColor }}>{stats.percentage}%</span>
          </div>
          <div style={{ height: '12px', background: 'var(--bg-card-subtle)', borderRadius: '99px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${Math.min(100, parseFloat(stats.percentage))}%`,
              background: `linear-gradient(90deg, ${attColor}, ${attColor}cc)`,
              borderRadius: '99px',
              transition: 'width 0.6s ease'
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.77rem', color: 'var(--text-muted)' }}>
            <span>0%</span>
            <span style={{ color: '#f59e0b', fontWeight: 600 }}>75% (minimum)</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {/* Subject-wise Breakdown */}
      {subjectBreakdown.length > 0 && (
        <div className="content-card" style={{ marginBottom: '24px' }}>
          <div className="card-header">
            <div className="card-title-group">
              <h3>Subject-wise Attendance</h3>
              <p>Attendance breakdown per subject</p>
            </div>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Total Classes</th>
                  <th>Present</th>
                  <th>Absent</th>
                  <th>Attendance %</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {subjectBreakdown.map((sub, idx) => {
                  const pct = parseFloat(sub.percentage);
                  const color = pct >= 75 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444';
                  return (
                    <tr key={idx}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <BookOpen size={16} color="var(--primary)" />
                          <strong>{sub.subject}</strong>
                        </div>
                      </td>
                      <td>{sub.total}</td>
                      <td style={{ color: '#10b981', fontWeight: 600 }}>{sub.present}</td>
                      <td style={{ color: '#ef4444', fontWeight: 600 }}>{sub.absent}</td>
                      <td>
                        <span style={{ color, fontWeight: 700 }}>{sub.percentage}%</span>
                      </td>
                      <td>
                        <span className={`badge ${pct >= 75 ? 'badge-success' : pct >= 60 ? 'badge-warning' : 'badge-danger'}`}>
                          {pct >= 75 ? 'Good' : pct >= 60 ? 'Warning' : 'Low'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detailed Records */}
      <div className="content-card">
        <div className="card-header">
          <div className="card-title-group">
            <h3>Attendance History</h3>
            <p>Complete day-by-day attendance log</p>
          </div>
          <div className="card-actions">
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <Filter size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="search-input"
                  style={{ paddingLeft: '30px', width: '160px' }}
                  placeholder="Filter subject..."
                  value={filterSubject}
                  onChange={e => setFilterSubject(e.target.value)}
                />
              </div>
              <select
                className="search-input"
                style={{ width: '130px' }}
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
              >
                <option value="">All Status</option>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
              </select>
            </div>
          </div>
        </div>

        {filteredRecords.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <CalendarCheck size={40} style={{ marginBottom: '12px', opacity: 0.3 }} />
            <p style={{ fontWeight: 600, marginBottom: '4px' }}>No attendance records found</p>
            <p style={{ fontSize: '0.85rem' }}>
              {records.length === 0
                ? 'Your teacher has not marked attendance yet. Check back later.'
                : 'No records match the current filter.'}
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Subject</th>
                  <th>Period</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{new Date(r.date).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</strong>
                    </td>
                    <td>{r.subject_name || 'General Class'}</td>
                    <td>Period {r.period || '—'}</td>
                    <td>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 10px',
                          borderRadius: '99px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          background: r.status === 'present' ? '#ecfdf5' : '#fef2f2',
                          color: r.status === 'present' ? '#10b981' : '#ef4444',
                        }}
                      >
                        {r.status === 'present' ? <CheckCircle size={13} /> : <XCircle size={13} />}
                        {r.status === 'present' ? 'Present' : 'Absent'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
