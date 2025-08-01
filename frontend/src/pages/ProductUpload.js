import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { uploadProductImage } from '../utils/uploadImage';

function ProductUpload() {
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    category: '',
    gender: '',
    ageGroup: '',
    currency: 'USD',
    language: 'en',
    promotion: {
      isPromoted: false,
      badgeText: ''
    }
  });

  const [imageFile, setImageFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [msg, setMsg] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const navigate = useNavigate();

  const token = localStorage.getItem('merkato-token'); // ✅ fixed

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === 'isPromoted' || name === 'badgeText') {
      setForm({
        ...form,
        promotion: {
          ...form.promotion,
          [name]: type === 'checkbox' ? checked : value
        }
      });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  // ✅ Authenticated Image Upload Handler
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const response = await uploadProductImage(file, token);
      setImageUrl(response.imageUrl || response);
      setPreviewImage(URL.createObjectURL(file));
    } catch (err) {
      console.error('Image upload failed:', err.response?.data?.message || err.message);
      setMsg('Image upload failed');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg('');

    if (!imageUrl) {
      setMsg('Please upload an image first.');
      return;
    }

    try {
      const res = await axios.post(
        '/api/products',
        { ...form, image: imageUrl },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setMsg(`✅ Product "${res.data.name}" uploaded successfully!`);
      setForm({
        name: '', description: '', price: '', stock: '', category: '',
        gender: '', ageGroup: '', currency: 'USD', language: 'en',
        promotion: { isPromoted: false, badgeText: '' }
      });
      setImageFile(null);
      setPreviewImage(null);
      setImageUrl('');

      setTimeout(() => navigate('/vendor'), 1000);
    } catch (err) {
      const error = err.response?.data?.message || 'Upload failed. Please try again.';
      console.error('Product upload failed:', error);
      setMsg(error);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '700px', margin: '0 auto', fontFamily: 'Poppins, sans-serif', color: '#333' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '20px', color: '#00B894' }}>
        Upload a New Product 🚀
      </h1>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <input name="name" placeholder="Product Name" value={form.name} onChange={handleChange} required />
        <textarea name="description" placeholder="Short Description" value={form.description} onChange={handleChange} rows={3} />
        <input name="price" type="number" placeholder="Price" value={form.price} onChange={handleChange} required />
        <input name="stock" type="number" placeholder="Stock Quantity" value={form.stock} onChange={handleChange} required />

        <select name="currency" value={form.currency} onChange={handleChange}>
          <option value="USD">USD</option>
          <option value="ETB">ETB</option>
          <option value="EUR">EUR</option>
        </select>

        <input name="category" placeholder="Category (e.g. Fashion, Tech)" value={form.category} onChange={handleChange} />

        <select name="gender" value={form.gender} onChange={handleChange}>
          <option value="">Select Gender</option>
          <option value="Men">Men</option>
          <option value="Women">Women</option>
          <option value="Unisex">Unisex</option>
        </select>

        <select name="ageGroup" value={form.ageGroup} onChange={handleChange}>
          <option value="">Select Age Group</option>
          <option value="Kids">Kids</option>
          <option value="Teens">Teens</option>
          <option value="Adults">Adults</option>
        </select>

        <select name="language" value={form.language} onChange={handleChange}>
          <option value="en">English</option>
          <option value="am">Amharic</option>
          <option value="or">Oromiffa</option>
        </select>

        {/* ✅ Promotion Controls */}
        <label>
          <input type="checkbox" name="isPromoted" checked={form.promotion.isPromoted} onChange={handleChange} />
          Promote this product
        </label>
        {form.promotion.isPromoted && (
          <input
            name="badgeText"
            placeholder="Badge text (e.g. 🔥 Best Deal)"
            value={form.promotion.badgeText}
            onChange={handleChange}
          />
        )}

        <label htmlFor="product-image">Product Image:</label>
        <input
          id="product-image"
          data-testid="product-image-input"
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
        />

        {previewImage && (
          <img
            data-testid="image-preview"
            src={previewImage}
            alt="Preview"
            style={{ marginTop: '10px', width: '100%', borderRadius: '6px', objectFit: 'cover' }}
          />
        )}

        <button type="submit" style={{
          marginTop: '20px',
          backgroundColor: '#0984e3',
          color: 'white',
          padding: '12px 20px',
          border: 'none',
          borderRadius: '8px',
          fontWeight: 'bold'
        }}>
          Upload Product
        </button>
      </form>

      {msg && (
        <p
          data-testid="upload-msg"
          role={msg.includes('✅') ? 'status' : 'alert'}
          aria-live="polite"
          style={{ marginTop: '20px', color: msg.includes('✅') ? 'green' : 'red' }}
        >
          {msg}
        </p>
      )}
    </div>
  );
}

export default ProductUpload;
