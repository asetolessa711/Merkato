import React, { useEffect, useState } from 'react';
import axios from 'axios';

const EMPTY_FORM = {
  name: '',
  country: '',
  bio: '',
  avatar: '',
  storeName: '',
  storeDescription: '',
  businessRegistryId: '',
  taxId: ''
};

export default function VendorAccountPage() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get('/api/vendor/profile/me', { headers });
        const data = res.data;
        setProfile(data);
        setForm({
          name: data.name || '',
          country: data.country || '',
          bio: data.bio || '',
          avatar: data.avatar || '',
          storeName: data.storeName || '',
          storeDescription: data.storeDescription || '',
          businessRegistryId: data.businessRegistryId || '',
          taxId: data.taxId || ''
        });
      } catch (err) {
        setMessage('Failed to load vendor profile.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const res = await axios.put('/api/vendor/profile', form, { headers });
      const updated = res.data?.vendor;
      if (updated) {
        setProfile(updated);
        const existingUser = JSON.parse(localStorage.getItem('user') || 'null');
        if (existingUser) {
          localStorage.setItem('user', JSON.stringify({ ...existingUser, ...updated }));
        }
      }
      setMessage('Vendor account saved.');
    } catch (err) {
      setMessage('Failed to save vendor account.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 24 }}>Loading vendor account...</div>;
  }

  const status = profile?.vendorStatus || 'new';
  const approved = profile?.vendorApproved ? 'Approved' : 'Pending review';

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      <h1 style={{ marginBottom: 12 }}>Vendor Account</h1>
      <p style={{ marginBottom: 16 }}>
        Status: <strong>{status}</strong> | Approval: <strong>{approved}</strong>
      </p>

      {message && <p>{message}</p>}

      <form onSubmit={handleSave}>
        <label>Name</label>
        <input name="name" value={form.name} onChange={handleChange} style={{ display: 'block', width: '100%', marginBottom: 10 }} />

        <label>Country</label>
        <input name="country" value={form.country} onChange={handleChange} style={{ display: 'block', width: '100%', marginBottom: 10 }} />

        <label>Store Name</label>
        <input name="storeName" value={form.storeName} onChange={handleChange} style={{ display: 'block', width: '100%', marginBottom: 10 }} />

        <label>Store Description</label>
        <textarea name="storeDescription" value={form.storeDescription} onChange={handleChange} rows="3" style={{ display: 'block', width: '100%', marginBottom: 10 }} />

        <label>Bio</label>
        <textarea name="bio" value={form.bio} onChange={handleChange} rows="3" style={{ display: 'block', width: '100%', marginBottom: 10 }} />

        <label>Avatar URL</label>
        <input name="avatar" value={form.avatar} onChange={handleChange} style={{ display: 'block', width: '100%', marginBottom: 10 }} />

        <label>Business Registry ID</label>
        <input name="businessRegistryId" value={form.businessRegistryId} onChange={handleChange} style={{ display: 'block', width: '100%', marginBottom: 10 }} />

        <label>Tax ID</label>
        <input name="taxId" value={form.taxId} onChange={handleChange} style={{ display: 'block', width: '100%', marginBottom: 16 }} />

        <button type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save Vendor Account'}
        </button>
      </form>
    </div>
  );
}
