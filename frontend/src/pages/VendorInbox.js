// VendorInbox.js – Chat Threads for Vendor
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const VendorInbox = () => {
  const [threads, setThreads] = useState([]);
  const [msg, setMsg] = useState('');
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    const fetchThreads = async () => {
      try {
        const res = await axios.get('/api/messages/inbox', { headers });
        setThreads(res.data || []);
      } catch (err) {
        setMsg('Failed to load message threads.');
      }
    };
    fetchThreads();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'Poppins, sans-serif' }}>
      <h2 style={{ color: '#00B894', fontWeight: 'bold' }}>📥 Customer Messages</h2>
      {msg && <p style={{ color: '#e74c3c' }}>{msg}</p>}

      {threads.length === 0 ? (
        <p>No messages yet.</p>
      ) : (
        <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
          {threads.map(user => (
            <li key={user._id} style={{ marginBottom: '16px', borderBottom: '1px solid #ccc', paddingBottom: '10px' }}>
              <Link to={`/vendor/chat/${user._id}`} style={{ textDecoration: 'none', color: '#0984e3', fontWeight: 'bold' }}>
                💬 {user.name || user.email}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default VendorInbox;
