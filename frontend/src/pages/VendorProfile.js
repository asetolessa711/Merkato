// src/pages/VendorProfile.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import VendorCard from '../components/VendorCard';
import styles from '../layouts/VendorLayout.module.css';

function VendorProfile() {
  const [vendor, setVendor] = useState(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    logo: '',
    storeDescription: '',
    bio: '',
    country: ''
  });
  const [msg, setMsg] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get('/api/vendor/profile/me', { headers });
        const data = res.data;
        setVendor(data);
        setForm({
          name: data.name || '',
          email: data.email || '',
          logo: data.logo || '',
          storeDescription: data.storeDescription || '',
          bio: data.bio || '',
          country: data.country || ''
        });
      } catch (err) {
        setMsg('Could not load profile.');
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAvatarFile = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setForm({ ...form, logo: URL.createObjectURL(file) });
    }
  };

  const handleUploadAvatar = async () => {
    if (!avatarFile) return;

    const formData = new FormData();
    formData.append('file', avatarFile);
    formData.append('upload_preset', 'your_upload_preset');
    try {
      const uploadRes = await axios.post(
        'https://api.cloudinary.com/v1_1/your_cloud_name/image/upload',
        formData
      );
      const imageUrl = uploadRes.data.secure_url;
      setForm({ ...form, logo: imageUrl });
      setMsg('Avatar uploaded successfully.');
    } catch (err) {
      console.error(err);
      setMsg('Upload failed.');
    }
  };

  const handleSave = async () => {
    try {
      await axios.put('/api/vendor/profile', form, { headers });
      setMsg('Profile updated successfully.');
    } catch (err) {
      setMsg('Failed to update profile.');
    }
  };

  return (
    <div className={styles.contentArea}>
      <h2>🧑‍💼 Vendor Profile Editor</h2>
      {msg && <p style={{ color: '#0984e3', fontWeight: 'bold' }}>{msg}</p>}

      <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
        {/* === Live Preview Card === */}
        <VendorCard vendor={form} size="md" theme="mint" />

        {/* === Profile Edit Form === */}
        <div style={{ flex: 1, minWidth: '300px' }}>
          <label>Store Name</label>
          <input name="name" value={form.name} onChange={handleChange} />

          <label>Email</label>
          <input name="email" value={form.email} onChange={handleChange} />

          <label>Store Description</label>
          <textarea name="storeDescription" value={form.storeDescription} onChange={handleChange} />

          <label>Bio</label>
          <textarea name="bio" value={form.bio} onChange={handleChange} />

          <label>Country</label>
          <input name="country" value={form.country} onChange={handleChange} />

          <label>Logo Upload</label>
          <input type="file" accept="image/*" onChange={handleAvatarFile} />
          <button onClick={handleUploadAvatar} className="btn-secondary" style={{ marginTop: '10px' }}>
            Upload Avatar
          </button>

          <br />
          <button onClick={handleSave} className="btn-primary" style={{ marginTop: '20px' }}>
            Save Profile
          </button>
        </div>
      </div>
    </div>
  );
}

export default VendorProfile;
