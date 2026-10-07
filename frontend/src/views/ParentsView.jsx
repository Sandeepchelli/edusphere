import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Users, Search, Phone, Mail, GraduationCap } from 'lucide-react';

export default function ParentsView() {
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const loadParents = async () => {
    try {
      setLoading(true);
      const data = await api.getParents();
      setParents(data);
    } catch (err) {
      setError(err.message || 'Failed to load parents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadParents();
  }, []);

  const filteredParents = parents.filter(p => 
    !search || 
    p.parent_name?.toLowerCase().includes(search.toLowerCase()) || 
    p.username?.toLowerCase().includes(search.toLowerCase()) ||
    p.parent_phone?.includes(search)
  );

  return (
    <div className="content-card">
      <div className="card-header">
        <div className="card-title-group">
          <h3>Registered Parents Directory</h3>
          <p>Verified parent accounts linked with student records for absent alerts and academic tracking</p>
        </div>

        <div className="card-actions">
          <div className="search-input-wrapper">
            <Search size={16} />
            <input
              type="text"
              className="search-input"
              placeholder="Search parent name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Parent Name</th>
              <th>Login Username</th>
              <th>Contact Phone</th>
              <th>Email Address</th>
              <th>Enrolled Children</th>
              <th>Account Access</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  Loading parents...
                </td>
              </tr>
            ) : filteredParents.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No parent accounts found. Parent accounts are created when registering students.
                </td>
              </tr>
            ) : (
              filteredParents.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="user-avatar" style={{ width: '36px', height: '36px', fontSize: '0.85rem' }}>
                        {p.parent_name?.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ fontWeight: 600 }}>{p.parent_name}</div>
                    </div>
                  </td>
                  <td>@{p.username}</td>
                  <td>{p.parent_phone || '—'}</td>
                  <td>{p.parent_email || '—'}</td>
                  <td>
                    <span className="badge badge-purple" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <GraduationCap size={14} />
                      <span>{p.children_count || 1} Child(ren)</span>
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${p.account_status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                      {p.account_status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
