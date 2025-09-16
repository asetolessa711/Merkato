import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

export default function AdminVendorLeads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [admins, setAdmins] = useState([]);
  const [notesDraft, setNotesDraft] = useState({});
  const token = localStorage.getItem('token');

  const headers = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : {}), [token]);

  const load = async () => {
    setLoading(true);
    try {
      const url = statusFilter ? `/api/admin/vendors/leads?status=${encodeURIComponent(statusFilter)}` : '/api/admin/vendors/leads';
      const res = await axios.get(url, { headers });
      setLeads(res.data || []);
    } catch (e) {
      setError('Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  const loadAdmins = async () => {
    try {
      const res = await axios.get('/api/admin/users', { headers });
      const filtered = (res.data || []).filter(u => ['admin', 'global_admin', 'staff'].includes(u.role) || (Array.isArray(u.roles) && u.roles.some(r => ['admin','global_admin','staff'].includes(r))));
      setAdmins(filtered);
    } catch {
      // ignore silently for now
    }
  };

  useEffect(() => { loadAdmins(); }, []);
  useEffect(() => { load(); // reload when filter changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const invite = async (id) => {
    try {
      const res = await axios.post(`/api/admin/vendors/invite/${id}`, {}, { headers });
      alert(`Invite URL: ${res.data.inviteUrl}`);
      load();
    } catch (e) {
      alert('Failed to create invite');
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await axios.put(`/api/admin/vendors/leads/${id}`, { status }, { headers });
      load();
    } catch {
      alert('Failed to update status');
    }
  };

  const assignAgent = async (id, userId) => {
    try {
      await axios.put(`/api/admin/vendors/leads/${id}`, { assigned_to: userId || null }, { headers });
      load();
    } catch {
      alert('Failed to assign agent');
    }
  };

  const updateNotes = async (id) => {
    try {
      const note = notesDraft[id] || '';
      await axios.put(`/api/admin/vendors/leads/${id}`, { notes: note }, { headers });
      load();
    } catch {
      alert('Failed to save notes');
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Vendor Leads</h2>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <label>
          Status:
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ marginLeft: 8 }}>
            <option value="">All</option>
            <option value="new">New</option>
            <option value="reviewed">Reviewed</option>
            <option value="invited">Invited</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>
        <button onClick={load} disabled={loading}>Refresh</button>
      </div>
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th align="left">Business</th>
            <th align="left">Contact</th>
            <th align="left">Region</th>
            <th align="left">Category</th>
            <th align="left">Status</th>
            <th align="left">Assigned</th>
            <th align="left">Notes</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((l) => (
            <tr key={l._id}>
              <td>{l.business_name}</td>
              <td>{l.contact_person}<br/>{l.email}<br/>{l.phone}</td>
              <td>{l.region}/{l.city}</td>
              <td>{l.product_category}</td>
              <td>{l.status}</td>
              <td>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <select
                    value={typeof l.assigned_to === 'object' && l.assigned_to ? l.assigned_to._id : (l.assigned_to || '')}
                    onChange={(e) => assignAgent(l._id, e.target.value || null)}
                  >
                    <option value="">Unassigned</option>
                    {admins.map(a => (
                      <option key={a._id} value={a._id}>{a.name || a.email}</option>
                    ))}
                  </select>
                  {l.assigned_to && typeof l.assigned_to === 'object' && (
                    <span style={{ fontSize: 12, color: '#555' }}>
                      {(l.assigned_to.name || l.assigned_to.email)}
                    </span>
                  )}
                </div>
              </td>
              <td>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type="text"
                    placeholder="Add note..."
                    value={notesDraft[l._id] ?? (l.notes || '')}
                    onChange={(e) => setNotesDraft(prev => ({ ...prev, [l._id]: e.target.value }))}
                    style={{ width: 220 }}
                  />
                  <button onClick={() => updateNotes(l._id)}>Save</button>
                </div>
              </td>
              <td>
                <button onClick={() => invite(l._id)} disabled={l.status === 'invited'}>Invite</button>
                <button onClick={() => updateStatus(l._id, 'reviewed')}>Mark Reviewed</button>
                <button onClick={() => updateStatus(l._id, 'rejected')}>Reject</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
