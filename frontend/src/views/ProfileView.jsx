import React, { useState } from 'react';
import { api, setAuth } from '../services/api';
import {
  User,
  Lock,
  CheckCircle,
  AlertCircle,
  Mail,
  Phone,
  Shield,
  Save,
  Key,
  Award,
  GraduationCap
} from 'lucide-react';

export default function ProfileView({ user, onProfileUpdated }) {
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    profile_photo: user?.profile_photo || '',
  });

  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [profileError, setProfileError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileError('');
    setProfileMsg('');

    try {
      const res = await api.updateProfile(profileForm);
      setProfileMsg('Profile updated successfully.');
      onProfileUpdated(res.user);
      setTimeout(() => setProfileMsg(''), 4000);
    } catch (err) {
      setProfileError(err.message || 'Failed to update profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordSaving(true);
    setPasswordError('');
    setPasswordMsg('');

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError('New password and confirmation do not match.');
      setPasswordSaving(false);
      return;
    }

    try {
      await api.changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      setPasswordMsg('Password changed successfully.');
      setPasswordForm({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
      setTimeout(() => setPasswordMsg(''), 4000);
    } catch (err) {
      setPasswordError(err.message || 'Failed to update password.');
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
      {/* Profile Information Card */}
      <div className="content-card">
        <div className="card-header">
          <div className="card-title-group">
            <h3>My User Profile</h3>
            <p>Update personal contact details and avatar</p>
          </div>
        </div>

        <div style={{ padding: '24px' }}>
          {profileMsg && (
            <div className="alert alert-success">
              <CheckCircle size={16} />
              <span>{profileMsg}</span>
            </div>
          )}
          {profileError && (
            <div className="alert alert-danger">
              <AlertCircle size={16} />
              <span>{profileError}</span>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '18px', marginBottom: '24px' }}>
            <div 
              className="user-avatar" 
              style={{ width: '72px', height: '72px', fontSize: '1.75rem' }}
            >
              {profileForm.profile_photo ? (
                <img src={profileForm.profile_photo} alt={user?.name} />
              ) : (
                user?.name ? user.name.charAt(0).toUpperCase() : 'U'
              )}
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{user?.name}</h3>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                @{user?.username} &bull; Role: <strong style={{ textTransform: 'capitalize', color: 'var(--primary)' }}>{user?.role?.replace('_', ' ')}</strong>
              </div>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile}>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-control"
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-control"
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label">Contact Phone</label>
              <input
                type="text"
                className="form-control"
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label className="form-label">Profile Avatar URL</label>
              <input
                type="url"
                className="form-control"
                placeholder="https://..."
                value={profileForm.profile_photo}
                onChange={(e) => setProfileForm({ ...profileForm, profile_photo: e.target.value })}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={profileSaving}
            >
              <Save size={16} />
              <span>{profileSaving ? 'Saving...' : 'Update Details'}</span>
            </button>
          </form>
        </div>
      </div>

      {/* Security & Password Card */}
      <div className="content-card">
        <div className="card-header">
          <div className="card-title-group">
            <h3>Account Security</h3>
            <p>Update password and authenticate session</p>
          </div>
        </div>

        <div style={{ padding: '24px' }}>
          {passwordMsg && (
            <div className="alert alert-success">
              <CheckCircle size={16} />
              <span>{passwordMsg}</span>
            </div>
          )}
          {passwordError && (
            <div className="alert alert-danger">
              <AlertCircle size={16} />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword}>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label">Current Password <span className="required">*</span></label>
              <input
                type="password"
                className="form-control"
                placeholder="Verify existing password"
                value={passwordForm.current_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label">New Password <span className="required">*</span></label>
              <input
                type="password"
                className="form-control"
                placeholder="Minimum 6 characters"
                value={passwordForm.new_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label className="form-label">Confirm New Password <span className="required">*</span></label>
              <input
                type="password"
                className="form-control"
                placeholder="Re-type new password"
                value={passwordForm.confirm_password}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={passwordSaving}
            >
              <Key size={16} />
              <span>{passwordSaving ? 'Updating...' : 'Change Password'}</span>
            </button>
          </form>
        </div>
      </div>

      {/* Student Academic Credentials Card */}
      {user?.role === 'student' && (
        <div className="content-card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-header">
            <div className="card-title-group">
              <h3>Student Academic Profile</h3>
              <p>Official registration credentials, department affiliation, and cumulative academic rating</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge badge-purple" style={{ fontSize: '0.9rem', padding: '6px 12px' }}>
                Verified Student
              </span>
            </div>
          </div>

          <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
            <div style={{ background: 'var(--bg-main)', padding: '16px 20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Overall CGPA
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#4f46e5', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={24} color="#4f46e5" />
                <span>{user?.cgpa !== undefined ? Number(user.cgpa).toFixed(2) : '0.00'}</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Cumulative Grade Point Average
              </div>
            </div>

            <div style={{ background: 'var(--bg-main)', padding: '16px 20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Student ID / Registration
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '6px' }}>
                {user?.student_reg_id || user?.roleDetails?.student_id || 'N/A'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Roll: {user?.roleDetails?.roll_number || 'Enrolled'}
              </div>
            </div>

            <div style={{ background: 'var(--bg-main)', padding: '16px 20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Department
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '6px' }}>
                {user?.department || user?.roleDetails?.department || 'General'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Academic Program
              </div>
            </div>

            <div style={{ background: 'var(--bg-main)', padding: '16px 20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Class Year & Section
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '6px' }}>
                {user?.class_year || user?.roleDetails?.class_year || '1st Year'} {user?.section || user?.roleDetails?.section ? `(Sec ${user?.section || user?.roleDetails?.section})` : ''}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Current Semester Group
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
