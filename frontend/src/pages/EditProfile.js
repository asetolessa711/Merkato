// File: src/pages/EditProfile.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';

function EditProfile() {
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    country: '',
    bio: '',
    storeName: '',
    storeDescription: ''
  });
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    axios.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        const data = res.data.user || res.data;
        setUser(data);
        setForm({
          name: data.name || '',
          email: data.email || '',
          country: data.country || '',
          bio: data.bio || '',
          storeName: data.storeName || '',
          storeDescription: data.storeDescription || ''
        });
      })
      .catch(() => {
        setMsg('Failed to load user info.');
      });
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    try {
      if (user.roles.includes('vendor')) {
        await axios.put('/api/vendor/profile', form, { headers });
      } else {
        await axios.put('/api/customer/profile', form, { headers });
      }
      setMsg('Profile updated successfully!');
    } catch (err) {
      setMsg('Update failed. Please try again.');
    }
  };

  if (!user) return <p style={{ textAlign: 'center', marginTop: '60px' }}>Loading profile...</p>;

  return (
    <div style={{ maxWidth: 500, margin: '60px auto', padding: 24, border: '1px solid #ccc', borderRadius: 8 }}>
      <h2>Edit Your Profile</h2>
      {msg && <p style={{ color: msg.includes('success') ? 'green' : 'red' }}>{msg}</p>}
      <form onSubmit={handleUpdate}>
        <label>Name</label>
        <input name="name" value={form.name} onChange={handleChange} required style={{ width: '100%', marginBottom: 12 }} />

        <label>Email</label>
        <input name="email" value={form.email} onChange={handleChange} required style={{ width: '100%', marginBottom: 12 }} />

        <label>Country</label>
        <input name="country" value={form.country} onChange={handleChange} style={{ width: '100%', marginBottom: 12 }} />

        <label>Bio</label>
        <textarea name="bio" value={form.bio} onChange={handleChange} rows="3" style={{ width: '100%', marginBottom: 12 }} />

        {user.roles.includes('vendor') && (
          <>
            <label>Store Name</label>
            <input name="storeName" value={form.storeName} onChange={handleChange} style={{ width: '100%', marginBottom: 12 }} />

            <label>Store Description</label>
            <textarea name="storeDescription" value={form.storeDescription} onChange={handleChange} rows="3" style={{ width: '100%', marginBottom: 12 }} />
          </>
        )}

        <button type="submit" style={{ width: '100%', backgroundColor: '#00B894', color: 'white', padding: '12px 0', border: 'none', borderRadius: 6 }}>
          Save Changes
        </button>
      </form>
    </div>
  );
}

export default EditProfile;
