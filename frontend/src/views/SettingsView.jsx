import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Settings,
  Save,
  CheckCircle,
  AlertCircle,
  Building2,
  Mail,
  Phone,
  Calendar
} from 'lucide-react';

export default function SettingsView({ currentUser }) {
  const [settings, setSettings] = useState({
    college_name: '',
    college_code: '',
    academic_year: '2026-2027',
    contact_email: '',
    contact_phone: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    api.getSettings()
      .then((data) => {
        setSettings((prev) => ({ ...prev, ...data }));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;

    setSaving(true);
    setError('');
    setSuccessMsg('');

    try {
      await api.updateSettings(settings);
      setSuccessMsg('College settings updated successfully.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to update settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="content-card" style={{ maxWidth: '800px' }}>
      <div className="card-header">
        <div className="card-title-group">
          <h3>EduSphere Institution Settings</h3>
          <p>Global college configuration, academic term, and official contact information</p>
        </div>
      </div>

      <div style={{ padding: '24px' }}>
        {successMsg && (
          <div className="alert alert-success">
            <CheckCircle size={16} />
            <span>{successMsg}</span>
          </div>
        )}
        {error && (
          <div className="alert alert-danger">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSave}>
          <div className="form-grid">
            <div className="form-group full-width">
              <label className="form-label">College / University Name</label>
              <input
                type="text"
                className="form-control"
                value={settings.college_name}
                onChange={(e) => setSettings({ ...settings, college_name: e.target.value })}
                disabled={!isAdmin}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">College Code / Accreditation ID</label>
              <input
                type="text"
                className="form-control"
                value={settings.college_code}
                onChange={(e) => setSettings({ ...settings, college_code: e.target.value })}
                disabled={!isAdmin}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Active Academic Year</label>
              <input
                type="text"
                className="form-control"
                value={settings.academic_year}
                onChange={(e) => setSettings({ ...settings, academic_year: e.target.value })}
                disabled={!isAdmin}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Official Contact Email</label>
              <input
                type="email"
                className="form-control"
                value={settings.contact_email}
                onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })}
                disabled={!isAdmin}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Official Helpline Phone</label>
              <input
                type="text"
                className="form-control"
                value={settings.contact_phone}
                onChange={(e) => setSettings({ ...settings, contact_phone: e.target.value })}
                disabled={!isAdmin}
              />
            </div>
          </div>

          {isAdmin && (
            <div style={{ marginTop: '28px' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                <Save size={16} />
                <span>{saving ? 'Saving...' : 'Save Settings'}</span>
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
