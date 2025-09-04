import React, { useEffect, useState } from 'react';
import axios from 'axios';

function AdminPromoCampaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [form, setForm] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    appliesToFirstTimeUsersOnly: false,
    minOrderValue: '',
    usageLimit: ''
  });
  const [msg, setMsg] = useState('');
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const res = await axios.get('/api/admin/promo-campaigns', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCampaigns(res.data);
    } catch {
      setMsg('Failed to load campaigns');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name || !form.startDate || !form.endDate) {
      setMsg('Campaign name and dates are required');
      return;
    }

    try {
      await axios.post('/api/admin/promo-campaigns', form, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setForm({
        name: '',
        description: '',
        startDate: '',
        endDate: '',
        appliesToFirstTimeUsersOnly: false,
        minOrderValue: '',
        usageLimit: ''
      });
      setMsg('Campaign created ✅');
      fetchCampaigns();
    } catch {
      setMsg('Failed to create campaign');
    }
  };

  return (
    <div style={{ padding: 10 }}>
      <h3 style={{ marginBottom: 10 }}>🎯 Promo Campaigns</h3>
      {msg && <p style={{ color: msg.includes('✅') ? 'green' : 'red' }}>{msg}</p>}

      <form onSubmit={handleCreate} style={{ marginBottom: 20, background: '#f9f9f9', padding: 15, borderRadius: 6 }}>
        <h4>Create New Campaign</h4>
        <input type="text" placeholder="Campaign Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required style={inputStyle} />
        <textarea placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={inputStyle} />
        <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} required style={inputStyle} />
        <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} required style={inputStyle} />
        <input type="number" placeholder="Min Order Value" value={form.minOrderValue} onChange={e => setForm({ ...form, minOrderValue: e.target.value })} style={inputStyle} />
        <input type="number" placeholder="Usage Limit" value={form.usageLimit} onChange={e => setForm({ ...form, usageLimit: e.target.value })} style={inputStyle} />
        <label>
          <input type="checkbox" checked={form.appliesToFirstTimeUsersOnly} onChange={e => setForm({ ...form, appliesToFirstTimeUsersOnly: e.target.checked })} />
          {' '}First-time users only
        </label>
        <br />
        <button type="submit" style={{ marginTop: 10, padding: '8px 14px', backgroundColor: '#00B894', color: 'white', border: 'none', borderRadius: 4 }}>Create</button>
      </form>

      <h4>Active Campaigns</h4>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f1f1f1' }}>
            <th style={th}>Name</th>
            <th style={th}>Start</th>
            <th style={th}>End</th>
            <th style={th}>Min Order</th>
            <th style={th}>Limit</th>
            <th style={th}>First-time</th>
            <th style={th}>Status</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map(c => (
            <tr key={c._id}>
              <td style={td}>{c.name}</td>
              <td style={td}>{new Date(c.startDate).toLocaleDateString()}</td>
              <td style={td}>{new Date(c.endDate).toLocaleDateString()}</td>
              <td style={td}>{c.minOrderValue || '—'}</td>
              <td style={td}>{c.usageLimit || '∞'}</td>
              <td style={td}>{c.appliesToFirstTimeUsersOnly ? 'Yes' : 'No'}</td>
              <td style={td}>{new Date() > new Date(c.endDate) ? 'Expired' : 'Active'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const inputStyle = {
  display: 'block',
  marginBottom: 10,
  padding: 8,
  width: '100%',
  borderRadius: 4,
  border: '1px solid #ccc'
};

const th = { padding: 8, borderBottom: '1px solid #ccc', textAlign: 'left' };
const td = { padding: 8, borderBottom: '1px solid #eee' };

export default AdminPromoCampaigns;

