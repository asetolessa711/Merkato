import React, { useState } from 'react';
import axios from 'axios';

function FeedbackPopup({ visible, onClose, lang }) {
  const [form, setForm] = useState({
    category: 'ux',
    rating: '',
    message: ''
  });
  const [msg, setMsg] = useState('');
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const translations = {
    en: {
      title: 'Submit Feedback',
      category: 'Category',
      rating: 'Rating (1–5)',
      message: 'Message',
      submit: 'Submit',
      thankYou: 'Thank you for your feedback!',
      fail: 'Submission failed. Please try again.',
      notLoggedIn: 'Please log in to submit feedback.',
      categories: {
        ux: 'User Experience',
        feature: 'Feature Request',
        complaint: 'Complaint',
        other: 'Other'
      }
    },
    am: {
      title: 'አስተያየት ያቅርቡ',
      category: 'ምድብ',
      rating: 'ደረጃ (1–5)',
      message: 'መልእክት',
      submit: 'አቅርብ',
      thankYou: 'አስተያየትዎን አመሰግናለሁ!',
      fail: 'መላክ አልተሳካም። እባኮትን ደግመው ይሞክሩ።',
      notLoggedIn: 'እባኮትን እርስዎን ያስገቡ ከመላክ በፊት።',
      categories: {
        ux: 'የተጠቃሚ ልምድ',
        feature: 'ባለባበል መከላከያ',
        complaint: 'ቅሬታ',
        other: 'ሌላ'
      }
    },
    or: {
      title: 'Yaada Keessan Ergaa',
      category: 'Kutaa',
      rating: 'Sadarkaa (1–5)',
      message: 'Ergaa',
      submit: 'Ergi',
      thankYou: 'Galatoomaa!',
      fail: 'Ergaa erguu dadhabe. Itti fufaa.',
      notLoggedIn: 'Ergaa erguu dura seena.',
      categories: {
        ux: 'Tajaajilaa fayyadamtootaa',
        feature: 'Gaaffii Amaloota Haaraa',
        complaint: 'Komii',
        other: 'Kan biraa'
      }
    }
  };

  const t = translations[lang] || translations.en;

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) return setMsg(t.notLoggedIn);

    try {
      await axios.post('/api/feedback', form, { headers });
      setMsg(t.thankYou);
      setForm({ category: 'ux', rating: '', message: '' });
    } catch {
      setMsg(t.fail);
    }
  };

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 90,
      right: 30,
      zIndex: 1000,
      background: '#fff',
      border: '1px solid #ccc',
      borderRadius: 10,
      padding: 20,
      width: 300,
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
    }}>
      <h4>{t.title}</h4>
      <form onSubmit={handleSubmit}>
        <label>{t.category}</label>
        <select name="category" value={form.category} onChange={handleChange}>
          <option value="ux">{t.categories.ux}</option>
          <option value="feature">{t.categories.feature}</option>
          <option value="complaint">{t.categories.complaint}</option>
          <option value="other">{t.categories.other}</option>
        </select>

        <label>{t.rating}</label>
        <input
          name="rating"
          type="number"
          min="1"
          max="5"
          value={form.rating}
          onChange={handleChange}
        />

        <label>{t.message}</label>
        <textarea
          name="message"
          rows="3"
          value={form.message}
          onChange={handleChange}
        />

        <button type="submit" style={{ marginTop: 10 }}>{t.submit}</button>
        {msg && <p style={{ marginTop: 10 }}>{msg}</p>}
        <button onClick={onClose} style={{ marginTop: 5, backgroundColor: '#ccc' }}>Close</button>
      </form>
    </div>
  );
}

export default FeedbackPopup;
