import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';

import { MessageContext } from '../context/MessageContext';

function AdminFeedbackInbox() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [roleFilter, setRoleFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const { showMessage } = useContext(MessageContext);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        const res = await axios.get('/api/feedback', { headers });
        setFeedbacks(res.data);
        setFiltered(res.data);
      } catch (err) {
        showMessage('Access denied or something went wrong.', 'error');
      }
    };
    fetchFeedback();
  }, []);

  useEffect(() => {
    let data = [...feedbacks];

    if (roleFilter) {
      data = data.filter(fb => fb.role === roleFilter);
    }

    if (categoryFilter) {
      data = data.filter(fb => fb.category === categoryFilter);
    }

    setFiltered(data);
  }, [roleFilter, categoryFilter, feedbacks]);

  const Card = ({ title, children }) => (
    <div style={{
      background: 'white',
      padding: '16px',
      borderRadius: '8px',
      marginBottom: '20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <h3>{title}</h3>
      {children}
    </div>
  );

  return (
    <div style={{ padding: 20 }}>
      <h2>Feedback Inbox</h2>
      {/* Error messages now shown globally */}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">All Roles</option>
          <option value="customer">Customer</option>
          <option value="vendor">Vendor</option>
          <option value="admin">Admin</option>
        </select>

        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">All Categories</option>
          <option value="ux">User Experience</option>
          <option value="feature">Feature Request</option>
          <option value="complaint">Complaint</option>
          <option value="other">Other</option>
        </select>

        <button onClick={() => {
          setRoleFilter('');
          setCategoryFilter('');
        }}>Reset</button>
      </div>

      {/* Feedback Cards */}
      {filtered.length === 0 ? (
        <p>No feedback found for selected filters.</p>
      ) : (
        filtered.map((fb) => (
          <Card key={fb._id} title={`${fb.user?.name || 'Anonymous'} (${fb.role || 'N/A'})`}>
            <p><strong>Email:</strong> {fb.user?.email}</p>
            <p><strong>Category:</strong> {fb.category}</p>
            {fb.rating && <p><strong>Rating:</strong> ⭐ {fb.rating}/5</p>}
            <p><strong>Message:</strong><br />{fb.message}</p>
            <p style={{ fontSize: '0.85em', color: '#888' }}>
              Submitted: {new Date(fb.createdAt).toLocaleString()}
            </p>
          </Card>
        ))
      )}
    </div>
  );
}

export default AdminFeedbackInbox;