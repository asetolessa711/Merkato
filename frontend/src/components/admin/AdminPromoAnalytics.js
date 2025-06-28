import React, { useEffect, useState } from 'react';
import axios from 'axios';

function AdminPromoAnalytics() {
  const [codes, setCodes] = useState([]);
  const [msg, setMsg] = useState('');
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchCodes = async () => {
      try {
        const res = await axios.get('/api/admin/promo-codes', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCodes(res.data);
      } catch (err) {
        setMsg('Failed to load promo codes');
      }
    };
    fetchCodes();
  }, []);

  return (
    <div style={{ padding: 10 }}>
      <h3 style={{ marginBottom: 10 }}>📊 Promo Code Usage</h3>
      {msg && <p>{msg}</p>}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#f1f1f1' }}>
            <th style={th}>Code</th>
            <th style={th}>Type</th>
            <th style={th}>Value</th>
            <th style={th}>Used</th>
            <th style={th}>Usage Limit</th>
            <th style={th}>Active</th>
            <th style={th}>Expires</th>
          </tr>
        </thead>
        <tbody>
          {codes.map(code => (
            <tr key={code._id}>
              <td style={td}>{code.code}</td>
              <td style={td}>{code.type}</td>
              <td style={td}>{code.value}</td>
              <td style={td}>{code.usedCount}</td>
              <td style={td}>{code.usageLimit || '∞'}</td>
              <td style={td}>{code.isActive ? 'Yes' : 'No'}</td>
              <td style={td}>{code.expiresAt ? new Date(code.expiresAt).toLocaleDateString() : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const th = { padding: '8px', borderBottom: '1px solid #ccc', textAlign: 'left' };
const td = { padding: '8px', borderBottom: '1px solid #eee' };

export default AdminPromoAnalytics;
