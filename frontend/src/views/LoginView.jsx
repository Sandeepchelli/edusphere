import React, { useState } from 'react';
import { api, setAuth } from '../services/api';
import { GraduationCap, Lock, User, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function LoginView({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please provide your Username and Password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await api.login(username.trim(), password);
      setAuth(data.token, data.user);
      onLoginSuccess(data.user);
    } catch (err) {
      setError(err.message || 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen">
      {/* Left Marketing / College Banner */}
      <div className="login-left-banner">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '40px' }}>
            <div 
              style={{ 
                width: '54px', 
                height: '54px', 
                background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)', 
                borderRadius: '16px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                boxShadow: '0 8px 20px rgba(99, 102, 241, 0.4)'
              }}
            >
              <GraduationCap size={32} color="white" />
            </div>
            <div>
              <h1 style={{ color: 'white', fontSize: '1.75rem', fontWeight: 800 }}>EduSphere</h1>
              <p style={{ color: '#94a3b8', fontSize: '0.88rem' }}>Higher Education Management System</p>
            </div>
          </div>

          <h2 style={{ color: 'white', fontSize: '2.5rem', fontWeight: 800, lineHeight: 1.2, marginBottom: '24px' }}>
            Smart Campus Administration & Academic Excellence.
          </h2>

          <p style={{ color: '#cbd5e1', fontSize: '1.05rem', lineHeight: 1.6, maxWidth: '480px' }}>
            A unified, secure platform engineered for administrators, educators, students, parents, and support staff.
          </p>

          <div style={{ marginTop: '40px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#e2e8f0', fontSize: '0.92rem' }}>
              <CheckCircle2 size={20} color="#10b981" />
              <span>Real-time Student & Staff Attendance Records</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#e2e8f0', fontSize: '0.92rem' }}>
              <CheckCircle2 size={20} color="#10b981" />
              <span>Instant Parent Absent Alerts & Leave Permissions</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#e2e8f0', fontSize: '0.92rem' }}>
              <CheckCircle2 size={20} color="#10b981" />
              <span>Academics, Examination Marks, Grades, SGPA & CGPA Reports</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#e2e8f0', fontSize: '0.92rem' }}>
              <CheckCircle2 size={20} color="#10b981" />
              <span>Cashier Fees, Staff Salaries, Library & Transport Schedules</span>
            </div>
          </div>
        </div>

        <div style={{ color: '#64748b', fontSize: '0.8rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '20px' }}>
          EduSphere College Management Platform &bull; Persistent SQLite Database System
        </div>
      </div>

      {/* Right Login Box */}
      <div className="login-right-form">
        <div className="login-box">
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '8px' }}>Sign In</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Enter your college credentials. Your role is automatically determined.
            </p>
          </div>

          {error && (
            <div className="alert alert-danger" style={{ marginBottom: '20px' }}>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label" htmlFor="login-username">
                Username / User ID <span className="required">*</span>
              </label>
              <div className="search-input-wrapper">
                <User size={18} />
                <input
                  id="login-username"
                  type="text"
                  className="search-input"
                  style={{ paddingLeft: '38px' }}
                  placeholder="e.g. admin or your assigned ID"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoFocus
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label className="form-label" htmlFor="login-password">
                Password <span className="required">*</span>
              </label>
              <div className="search-input-wrapper">
                <Lock size={18} />
                <input
                  id="login-password"
                  type="password"
                  className="search-input"
                  style={{ paddingLeft: '38px' }}
                  placeholder="Enter your account password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', fontSize: '0.95rem' }}
              disabled={loading}
            >
              {loading ? 'Authenticating...' : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* <div 
            style={{ 
              marginTop: '32px', 
              padding: '16px', 
              borderRadius: 'var(--radius-md)', 
              backgroundColor: 'var(--bg-card-subtle)',
              border: '1px solid var(--border-color)',
              fontSize: '0.8rem',
              color: 'var(--text-muted)'
            }}
          > */}
            {/* <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontWeight: 700, marginBottom: '6px' }}>
              <ShieldCheck size={16} />
              <span>Initial Administrator Credentials</span>
            </div>
            <div>Username: <strong style={{ color: 'var(--text-main)' }}>admin</strong></div>
            <div>Password: <strong style={{ color: 'var(--text-main)' }}>admin123</strong></div>
            <div style={{ marginTop: '6px', fontSize: '0.74rem' }}>
              Once logged in as Principal/Admin, you can create teachers, students, parents, and staff.
            </div> */}
           {/* </div> */}
        </div>
      </div>
    </div>
  );
}
