import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import Modal from '../components/Modal';
import {
  Bell,
  CheckCircle,
  AlertCircle,
  Megaphone,
  Check,
  MailCheck,
  Calendar,
  AlertTriangle,
  FileCheck,
  DollarSign
} from 'lucide-react';

export default function NotificationsView({ currentUser }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Broadcast modal (Admin)
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({
    title: '',
    message: '',
    target_role: 'all',
  });
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = currentUser?.role === 'admin';

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await api.getNotifications();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch (err) {
      setError(err.message || 'Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      loadNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setSuccessMsg('All notifications marked as read.');
      loadNotifications();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to mark all as read.');
    }
  };

  const handleBroadcast = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await api.broadcastNotification(broadcastForm);
      setSuccessMsg(`Announcement broadcasted to ${res.count} recipient(s).`);
      setIsBroadcastModalOpen(false);
      setBroadcastForm({ title: '', message: '', target_role: 'all' });
      loadNotifications();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to broadcast announcement.');
    } finally {
      setSubmitting(false);
    }
  };

  const getNotifIcon = (type) => {
    switch (type) {
      case 'absent_alert':
        return <AlertTriangle size={18} color="#ef4444" />;
      case 'leave':
        return <FileCheck size={18} color="#10b981" />;
      case 'fee':
        return <DollarSign size={18} color="#f59e0b" />;
      default:
        return <Megaphone size={18} color="var(--primary)" />;
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
            <h3>Notifications & Real-Time Alerts</h3>
            <p>Absent alerts, academic announcements, permissions, and fee invoices</p>
          </div>

          <div className="card-actions">
            {unreadCount > 0 && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleMarkAllRead}
              >
                <Check size={14} />
                <span>Mark All Read</span>
              </button>
            )}

            {isAdmin && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setIsBroadcastModalOpen(true)}
              >
                <Megaphone size={16} />
                <span>Broadcast Announcement</span>
              </button>
            )}
          </div>
        </div>

        <div style={{ padding: '24px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              No notifications yet. You are all caught up!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {notifications.map((n) => (
                <div
                  key={n.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '14px',
                    padding: '16px 20px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: n.is_read ? 'var(--bg-card)' : 'var(--bg-card-subtle)',
                    border: `1px solid ${n.is_read ? 'var(--border-color)' : 'rgba(79, 70, 229, 0.25)'}`,
                    boxShadow: n.is_read ? 'none' : '0 2px 8px var(--primary-glow)',
                    transition: 'var(--transition)'
                  }}
                >
                  <div 
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      background: n.type === 'absent_alert' ? 'var(--danger-light)' : 'var(--primary-light)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    {getNotifIcon(n.type)}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <h4 style={{ fontSize: '0.96rem', fontWeight: 700 }}>
                        {n.title}
                      </h4>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        {new Date(n.created_at).toLocaleString()}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.86rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
                      {n.message}
                    </p>
                  </div>

                  {!n.is_read && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleMarkRead(n.id)}
                      title="Mark as Read"
                      style={{ flexShrink: 0 }}
                    >
                      <Check size={14} />
                      <span>Read</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAL: BROADCAST ANNOUNCEMENT */}
      <Modal
        isOpen={isBroadcastModalOpen}
        onClose={() => setIsBroadcastModalOpen(false)}
        title="Broadcast College Announcement"
        maxWidth="550px"
      >
        <form onSubmit={handleBroadcast}>
          <div className="form-grid-1" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Target Audience <span className="required">*</span></label>
              <select
                className="form-control"
                value={broadcastForm.target_role}
                onChange={(e) => setBroadcastForm({ ...broadcastForm, target_role: e.target.value })}
                required
              >
                <option value="all">Entire College Community (Everyone)</option>
                <option value="student">All Students</option>
                <option value="teacher">All Teaching Faculty</option>
                <option value="parent">All Parents</option>
                <option value="cashier">Cashier Staff</option>
                <option value="library_staff">Library Staff</option>
                <option value="driver">Drivers</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Announcement Title <span className="required">*</span></label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Mid-Term Examination Schedule Released"
                value={broadcastForm.title}
                onChange={(e) => setBroadcastForm({ ...broadcastForm, title: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Announcement Content <span className="required">*</span></label>
              <textarea
                className="form-control"
                placeholder="Enter complete message to be delivered instantly to user notifications"
                rows={4}
                value={broadcastForm.message}
                onChange={(e) => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
                required
              />
            </div>
          </div>

          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsBroadcastModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Broadcasting...' : 'Broadcast Announcement'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
