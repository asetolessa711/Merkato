// src/pages/VendorMarketing.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import styles from '../layouts/VendorLayout.module.css';

function VendorMarketing() {
  const [campaigns, setCampaigns] = useState([]);
  const [newCampaign, setNewCampaign] = useState({
    title: '',
    description: '',
    discount: '',
    startDate: '',
    endDate: ''
  });
  const [msg, setMsg] = useState('');
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const res = await axios.get('/api/vendor/marketing', { headers });
      setCampaigns(res.data);
    } catch (err) {
      setMsg('Failed to load campaigns.');
    }
  };

  const handleChange = (e) => {
    setNewCampaign({ ...newCampaign, [e.target.name]: e.target.value });
  };

  const handleCreate = async () => {
    try {
      await axios.post('/api/vendor/marketing', newCampaign, { headers });
      setMsg('Campaign created successfully.');
      setNewCampaign({ title: '', description: '', discount: '', startDate: '', endDate: '' });
      fetchCampaigns();
    } catch (err) {
      setMsg('Failed to create campaign.');
    }
  };

  return (
    <div className={styles.contentArea}>
      <h2 style={{ marginBottom: '20px' }}>📢 Vendor Marketing</h2>
      {msg && <p style={{ color: '#0984e3' }}>{msg}</p>}

      <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '300px' }}>
          <h3>🎯 Create New Campaign</h3>
          <input name="title" placeholder="Title" value={newCampaign.title} onChange={handleChange} />
          <textarea name="description" placeholder="Description" value={newCampaign.description} onChange={handleChange} />
          <input name="discount" placeholder="Discount %" value={newCampaign.discount} onChange={handleChange} type="number" />
          <input name="startDate" placeholder="Start Date" value={newCampaign.startDate} onChange={handleChange} type="date" />
          <input name="endDate" placeholder="End Date" value={newCampaign.endDate} onChange={handleChange} type="date" />
          <button className="btn-primary" onClick={handleCreate} style={{ marginTop: '10px' }}>Launch Campaign</button>
        </div>

        <div style={{ flex: 2 }}>
          <h3>📊 Active Campaigns</h3>
          {campaigns.length === 0 ? (
            <p>No campaigns running.</p>
          ) : (
            <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
              {campaigns.map(c => (
                <li key={c._id} style={{
                  background: '#fff',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '16px',
                  boxShadow: '0 1px 5px rgba(0,0,0,0.08)'
                }}>
                  <h4>{c.title} ({c.discount}% off)</h4>
                  <p>{c.description}</p>
                  <p><strong>📅 {c.startDate} → {c.endDate}</strong></p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default VendorMarketing;
