import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import Modal from '../components/Modal';
import {
  Bus,
  MapPin,
  Phone,
  Edit2,
  CheckCircle,
  AlertCircle,
  Search
} from 'lucide-react';

export default function TransportView({ currentUser }) {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [editForm, setEditForm] = useState({
    vehicle_number: '',
    route: '',
    bus_stops: '',
  });

  const [submitting, setSubmitting] = useState(false);

  const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'driver';

  const loadTransport = async () => {
    try {
      setLoading(true);
      const data = await api.getTransport();
      setDrivers(data);
    } catch (err) {
      setError(err.message || 'Failed to load transport details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransport();
  }, []);

  const handleOpenEdit = (d) => {
    setSelectedDriver(d);
    setEditForm({
      vehicle_number: d.vehicle_number || '',
      route: d.route || '',
      bus_stops: d.bus_stops || '',
    });
    setIsEditModalOpen(true);
  };

  const handleSaveRoute = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await api.updateTransport(selectedDriver.staff_id, editForm);
      setSuccessMsg('Transport route and vehicle details updated.');
      setIsEditModalOpen(false);
      loadTransport();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to update transport.');
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
            <h3>Campus Transport & Bus Routes</h3>
            <p>College fleet routes, stop schedules, vehicle numbers, and driver contacts</p>
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Vehicle / Bus No</th>
                <th>Driver Name</th>
                <th>Assigned Route</th>
                <th>Enroute Bus Stops</th>
                <th>Emergency Contact</th>
                {canEdit && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    Loading transport schedules...
                  </td>
                </tr>
              ) : drivers.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No transport drivers or bus routes configured yet. (Drivers are added in the College Staff section).
                  </td>
                </tr>
              ) : (
                drivers.map((d) => (
                  <tr key={d.staff_id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Bus size={18} color="var(--primary)" />
                        <strong style={{ fontSize: '0.95rem' }}>{d.vehicle_number || 'TBD'}</strong>
                      </div>
                    </td>
                    <td>
                      <strong>{d.driver_name}</strong>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>ID: {d.driver_id}</div>
                    </td>
                    <td>
                      <span className="badge badge-purple">{d.route || 'Local Route'}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', maxWidth: '320px' }}>
                        <MapPin size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span style={{ fontSize: '0.84rem' }}>{d.bus_stops || 'Stops not yet configured'}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Phone size={14} color="#059669" />
                        <span>{d.driver_phone || 'None'}</span>
                      </div>
                    </td>
                    {canEdit && (
                      <td>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenEdit(d)}
                        >
                          <Edit2 size={14} />
                          <span>Update Route</span>
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: UPDATE ROUTE */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Update Route: ${selectedDriver?.driver_name}`}
        maxWidth="550px"
      >
        <form onSubmit={handleSaveRoute}>
          <div className="form-grid-1" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Vehicle / Bus Number</label>
              <input
                type="text"
                className="form-control"
                value={editForm.vehicle_number}
                onChange={(e) => setEditForm({ ...editForm, vehicle_number: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Assigned Route Title</label>
              <input
                type="text"
                className="form-control"
                value={editForm.route}
                onChange={(e) => setEditForm({ ...editForm, route: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Bus Stops (comma-separated list)</label>
              <textarea
                className="form-control"
                value={editForm.bus_stops}
                onChange={(e) => setEditForm({ ...editForm, bus_stops: e.target.value })}
              />
            </div>
          </div>

          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
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
              disabled={submitting}
            >
              {submitting ? 'Saving...' : 'Save Transport Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
