// ProductReviews.js – Customer Interaction > Product Reviews
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const ProductReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [msg, setMsg] = useState('');
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const res = await axios.get('/api/vendor/reviews', { headers });
        setReviews(res.data);
      } catch (err) {
        setMsg('Failed to load reviews');
      }
    };
    fetchReviews();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'Poppins, sans-serif' }}>
      <h2 style={{ color: '#00B894' }}>💬 Product Reviews</h2>
      {msg && <p style={{ color: 'red' }}>{msg}</p>}
      {reviews.length === 0 ? (
        <p>No reviews found for your products.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {reviews.map((r, i) => (
            <li key={i} style={{
              background: '#f9f9f9',
              padding: '16px',
              marginBottom: '10px',
              borderRadius: '6px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
            }}>
              <p><strong>{r.product?.name || 'Product'}:</strong> {r.rating} ★</p>
              <p>{r.comment}</p>
              <p style={{ fontSize: '0.9rem', color: '#777' }}>by {r.user?.name || 'Anonymous'} on {new Date(r.createdAt).toLocaleDateString()}</p>
            </li>
          ))}
        </ul>
      )}

      {/* Navigation Buttons */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '30px' }}>
        <Link to="/vendor/customers/questions" style={{ color: '#0984e3', fontWeight: 'bold' }}>Next → Customer Questions</Link>
      </div>
    </div>
  );
};

export default ProductReviews;
