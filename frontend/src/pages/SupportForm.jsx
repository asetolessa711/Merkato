import React, { useState } from 'react';
import axios from 'axios';

function SupportForm() {
  const [form, setForm] = useState({
    category: 'ux',
    message: ''
  });
  const [msg, setMsg] = useState('');
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) return setMsg('Please log in to send a message.');

    try {
      await axios.post('/api/support', form, { headers });
      setMsg('Support request submitted!');
      setForm({ category: 'ux', message: '' });
    } catch (err) {
      setMsg('Submission failed. Please try again.');
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: '0 auto' }}>
      <h2>Contact Support</h2>

      <form onSubmit={handleSubmit}>
        <label>Category</label>
        <select name="category" value={form.category} onChange={handleChange}>
          <option value="ux">User Experience</option>
          <option value="feature">Feature Request</option>
          <option value="complaint">Complaint</option>
          <option value="other">Other</option>
        </select>

        <label>Message</label>
        <textarea
          name="message"
          rows={5}
          value={form.message}
          onChange={handleChange}
          required
        />

        <button type="submit" style={{ marginTop: 10 }}>Submit</button>
      </form>

      {msg && <p style={{ marginTop: 15 }}>{msg}</p>}
    </div>
  );
}

export default SupportForm;
