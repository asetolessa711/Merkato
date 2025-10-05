import React, { useEffect, useState } from 'react';
import axios from 'axios';

function AdminPromoCodes() {
  const [codes, setCodes] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState('info');
  const [newCode, setNewCode] = useState({
    code: '',
    type: 'percentage',
    value: '',
    minOrderValue: '',
    usageLimit: '',
    expiresAt: '',
    appliesToFirstTimeUsersOnly: false,
    campaign: ''
  });
  const [filterCampaign, setFilterCampaign] = useState('');
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchCodes();
    fetchCampaigns();
  }, []);

  const fetchCodes = async () => {
    try {
      const res = await axios.get('/api/admin/promo-codes', { headers });
      setCodes(res.data);
    } catch {
      showMessage('Failed to fetch promo codes.', 'error');
    }
  };

  const fetchCampaigns = async () => {
    try {
      const res = await axios.get('/api/admin/promo-campaigns', { headers });
      setCampaigns(res.data);
    } catch {
      console.error('Failed to fetch campaigns');
    }
  };

  const showMessage = (text, type = 'info') => {
    setMsg(text);
    setMsgType(type);
    setTimeout(() => setMsg(''), 4000);
  };

  const createPromo = async () => {
    if (!newCode.code || !newCode.value || !newCode.type) {
      showMessage('Code, Value, and Type are required.', 'error');
      return;
    }

    try {
      await axios.post('/api/admin/promo-codes', {
        ...newCode,
        campaign: newCode.campaign || null
      }, { headers });
      setNewCode({
        code: '', type: 'percentage', value: '', minOrderValue: '', usageLimit: '', expiresAt: '', appliesToFirstTimeUsersOnly: false, campaign: ''
      });
      fetchCodes();
      showMessage('Promo code created.', 'success');
    } catch {
      showMessage('Failed to create promo code', 'error');
    }
  };
  const updateCode = async (id, updates) => {
    try {
      await axios.put(`/api/admin/promo-codes/${id}`, updates, { headers });
      fetchCodes();
      showMessage('Promo code updated.', 'success');
    } catch {
      showMessage('Failed to update promo code.', 'error');
    }
  };

  const toggleActive = (code) => {
    updateCode(code._id, { isActive: !code.isActive });
  };

  const handleInputChange = (e, id, key) => {
    const newCodes = codes.map(code => {
      if (code._id === id) {
        return { ...code, [key]: key === 'appliesToFirstTimeUsersOnly' ? e.target.checked : e.target.value };
      }
      return code;
    });
    setCodes(newCodes);
  };

  const handleNewChange = (e, key) => {
    setNewCode({
      ...newCode,
      [key]: key === 'appliesToFirstTimeUsersOnly' ? e.target.checked : e.target.value
    });
  };

  const saveChanges = (code) => {
    if (!code.code || !code.value || !code.type) {
      showMessage('Code, Value, and Type are required.', 'error');
      return;
    }
    updateCode(code._id, {
      code: code.code,
      value: parseFloat(code.value),
      type: code.type,
      minOrderValue: parseFloat(code.minOrderValue) || 0,
      usageLimit: parseInt(code.usageLimit, 10) || null,
      expiresAt: code.expiresAt || null,
      appliesToFirstTimeUsersOnly: code.appliesToFirstTimeUsersOnly || false,
      campaign: code.campaign?._id || null
    });
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Promo Codes</h2>

      {msg && (
        <div style={{
          marginBottom: 15,
          padding: '10px 16px',
          backgroundColor: msgType === 'success' ? '#d4edda' : msgType === 'error' ? '#f8d7da' : '#fff3cd',
          color: msgType === 'success' ? '#155724' : msgType === 'error' ? '#721c24' : '#856404',
          border: '1px solid',
          borderColor: msgType === 'success' ? '#c3e6cb' : msgType === 'error' ? '#f5c6cb' : '#ffeeba',
          borderRadius: 6
        }}>{msg}</div>
      )}
<div style={{ marginBottom: 20 }}>
  <label><strong>Filter by Campaign:</strong></label>{' '}
  <select value={filterCampaign} onChange={(e) => setFilterCampaign(e.target.value)}>
    <option value="">All Campaigns</option>
    {campaigns.map(c => (
      <option key={c._id} value={c._id}>{c.name}</option>
    ))}
  </select>
</div>

      <div style={{ marginBottom: 30, background: '#eef5ee', padding: 16, borderRadius: 8 }}>
        <h4>Create New Promo Code</h4>
        <input placeholder="Code" value={newCode.code} onChange={e => handleNewChange(e, 'code')} />
        <select value={newCode.type} onChange={e => handleNewChange(e, 'type')}>
          <option value="percentage">Percentage</option>
          <option value="fixed">Fixed</option>
        </select>
        <input type="number" placeholder="Value" value={newCode.value} onChange={e => handleNewChange(e, 'value')} />
        <input type="number" placeholder="Min Order Value" value={newCode.minOrderValue} onChange={e => handleNewChange(e, 'minOrderValue')} />
        <input type="number" placeholder="Usage Limit" value={newCode.usageLimit} onChange={e => handleNewChange(e, 'usageLimit')} />
        <input type="date" value={newCode.expiresAt} onChange={e => handleNewChange(e, 'expiresAt')} />
        <label>
          <input type="checkbox" checked={newCode.appliesToFirstTimeUsersOnly} onChange={e => handleNewChange(e, 'appliesToFirstTimeUsersOnly')} /> First-Time Users Only
        </label>
        <select value={newCode.campaign} onChange={e => handleNewChange(e, 'campaign')}>
          <option value="">-- Select Campaign (optional) --</option>
          {campaigns.map(c => (
            <option key={c._id} value={c._id}>{c.name}</option>
          ))}
        </select>
        <button onClick={createPromo} style={{ marginLeft: 10 }}>➕ Create</button>
      </div>

     {/* ✅ Campaign Filter Dropdown */}
<div style={{ marginBottom: 20 }}>
  <label><strong>Filter by Campaign:</strong></label>{' '}
  <select value={filterCampaign} onChange={(e) => setFilterCampaign(e.target.value)}>
    <option value="">All Campaigns</option>
    {campaigns.map(c => (
      <option key={c._id} value={c._id}>{c.name}</option>
    ))}
  </select>
</div>

{/* ✅ Filtered Promo Code Cards */}
{codes
  .filter(code => !filterCampaign || code.campaign?._id === filterCampaign)
  .map(code => (
    <div key={code._id} style={{
      background: '#f9f9f9',
      padding: 16,
      marginBottom: 16,
      borderRadius: 8,
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <div><label><strong>Code:</strong></label> <input type="text" value={code.code} onChange={e => handleInputChange(e, code._id, 'code')} /></div>
      <div><label><strong>Value:</strong></label> <input type="number" value={code.value} onChange={e => handleInputChange(e, code._id, 'value')} /></div>
      <div><label><strong>Type:</strong></label>
        <select value={code.type} onChange={e => handleInputChange(e, code._id, 'type')}>
          <option value="percentage">Percentage</option>
          <option value="fixed">Fixed</option>
        </select>
      </div>
      <div><label><strong>Min Order Value:</strong></label> <input type="number" value={code.minOrderValue || ''} onChange={e => handleInputChange(e, code._id, 'minOrderValue')} /></div>
      <div><label><strong>Usage Limit:</strong></label> <input type="number" value={code.usageLimit || ''} onChange={e => handleInputChange(e, code._id, 'usageLimit')} /></div>
      <div><label><strong>Expires At:</strong></label> <input type="date" value={code.expiresAt ? code.expiresAt.slice(0, 10) : ''} onChange={e => handleInputChange(e, code._id, 'expiresAt')} /></div>
      <div><label><input type="checkbox" checked={code.appliesToFirstTimeUsersOnly || false} onChange={e => handleInputChange(e, code._id, 'appliesToFirstTimeUsersOnly')} /> First-Time Users Only</label></div>
      {code.campaign && (
        <div><strong>🎯 Campaign:</strong> {code.campaign.name || 'Linked'}</div>
      )}
      <div style={{ marginTop: 10 }}>
        <button onClick={() => saveChanges(code)} style={{ marginRight: 10 }}>💾 Save</button>
        <button onClick={() => toggleActive(code)}>{code.isActive ? '🛑 Deactivate' : '✅ Activate'}</button>
      </div>
    </div>
      ))}
      </div>
    );
  }

export default AdminPromoCodes;
