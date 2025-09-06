// CustomerInbox.js – Chat Threads for Customer
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const CustomerInbox = () => {
  const [vendors, setVendors] = useState([]);
  const [msg, setMsg] = useState('');
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const res = await axios.get('/api/messages/inbox', { headers });
        setVendors(res.data || []);
      } catch (err) {
        setMsg('Failed to load vendor messages.');
      }
    };
    fetchVendors();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'Poppins, sans-serif' }}>
      <h2 style={{ color: '#0984e3', fontWeight: 'bold' }}>📥 Vendor Messages</h2>
      {msg && <p style={{ color: '#e74c3c' }}>{msg}</p>}

      {vendors.length === 0 ? (
        <p>No vendor conversations yet.</p>
      ) : (
        <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
          {vendors.map(vendor => (
            <li key={vendor._id} style={{ marginBottom: '16px', borderBottom: '1px solid #ccc', paddingBottom: '10px' }}>
              <Link to={`/account/chat/${vendor._id}`} style={{ textDecoration: 'none', color: '#0984e3', fontWeight: 'bold' }}>
                🛍️ {vendor.name || vendor.email}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CustomerInbox;
