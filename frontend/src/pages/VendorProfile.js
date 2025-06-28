import React, { useEffect, useState } from 'react';
import axios from 'axios';

function VendorProfile() {
  const [vendor, setVendor] = useState(null);
  const [avatar, setAvatar] = useState('');
  const [preview, setPreview] = useState('');
  const [msg, setMsg] = useState('');
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    const fetchVendor = async () => {
      try {
        const res = await axios.get('/api/auth/me', { headers });
        setVendor(res.data.user || res.data);
        setAvatar(res.data.user?.avatar || '');
        setPreview(res.data.user?.avatar || '');
      } catch (err) {
        setMsg('Could not load your profile.');
      }
    };
    fetchVendor();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setAvatar(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    if (!avatar) return;

    const formData = new FormData();
    formData.append('file', avatar);
    formData.append('upload_preset', 'your_upload_preset'); // replace with Cloudinary preset

    try {
      const cloudinaryRes = await axios.post(
        'https://api.cloudinary.com/v1_1/your_cloud_name/image/upload',
        formData
      );

      const imageUrl = cloudinaryRes.data.secure_url;

      // Save avatar to backend
      await axios.put('/api/vendor/profile', { avatar: imageUrl }, { headers });
      setMsg('Avatar uploaded and profile updated!');
    } catch (err) {
      console.error(err);
      setMsg('Failed to upload avatar.');
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Vendor Profile</h2>
      {msg && <p>{msg}</p>}

      {vendor && (
        <>
          <p><strong>Name:</strong> {vendor.name}</p>
          <p><strong>Email:</strong> {vendor.email}</p>

          <div style={{ marginTop: 20 }}>
            <label><strong>Upload Avatar:</strong></label><br />
            <input type="file" accept="image/*" onChange={handleFileChange} />
            {preview && (
              <img
                src={preview}
                alt="Avatar Preview"
                style={{ width: 100, height: 100, borderRadius: '50%', marginTop: 10 }}
              />
            )}
            <br />
            <button onClick={handleUpload} style={{ marginTop: 10, padding: '8px 16px', backgroundColor: '#00B894', color: 'white', border: 'none', borderRadius: 5 }}>
              Upload Avatar
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default VendorProfile;
