// File: components/admin/ReviewModeration.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function ReviewModeration() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const res = await axios.get('/api/admin/reviews', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setReviews(res.data);
      } catch (err) {
        setMessage('failed to fetch');
        setMessageType('error');
      } finally {
        setLoading(false);
      }
    };
    fetchReviews();
  }, [token]);

  const handleAction = async (id, action) => {
    try {
      let res;
      let successMsg = '';
      if (action === 'delete') {
        res = await axios.delete(`/api/admin/reviews/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        successMsg = 'review deleted';
      } else if (action === 'hide') {
        res = await axios.patch(`/api/admin/reviews/${id}/hide`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        successMsg = 'review hidden';
      } else if (action === 'unhide') {
        res = await axios.patch(`/api/admin/reviews/${id}/unhide`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        successMsg = 'review unhidden';
      } else if (action === 'approve') {
        res = await axios.patch(`/api/admin/reviews/${id}/approve`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        successMsg = 'review approved';
      }
      setMessage(successMsg);
      setMessageType('success');
      // Update review in list or remove if deleted
      if (action === 'delete') {
        setReviews(reviews.filter(r => r._id !== id));
      } else {
        setReviews(reviews.map(r => r._id === id ? { ...r, hidden: action === 'hide' ? true : action === 'unhide' ? false : r.hidden } : r));
      }
      // Do not clear the message on a timer; keep it until next action
    } catch (err) {
      let errorMsg = '';
      if (err.response && err.response.data && err.response.data.message) {
        errorMsg = err.response.data.message;
      } else {
        if (action === 'hide') errorMsg = 'failed to hide review';
        else if (action === 'unhide') errorMsg = 'failed to unhide review';
        else if (action === 'delete') errorMsg = 'failed to delete review';
        else errorMsg = `failed to ${action} review`;
      }
      setMessage(errorMsg);
      setMessageType('error');
    }
  };

  if (loading) return <div className="p-4">Loading reviews...</div>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">🛡️ Review Moderation Panel</h2>
      {/* <ToastContainer position="bottom-right" autoClose={3000} /> */}
      {message && (
        <div style={{ color: messageType === 'error' ? 'red' : 'green', marginBottom: 12 }}>{message}</div>
      )}
      {reviews.length === 0 ? (
        <p>No flagged or hidden reviews.</p>
      ) : (
        <table className="w-full border">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2">Product</th>
              <th className="p-2">Comment</th>
              <th className="p-2">Rating</th>
              <th className="p-2">Status</th>
              <th className="p-2">By</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map(review => (
              <tr key={review._id} className="border-t">
                <td className="p-2">{review.product?.name || 'Product'}</td>
                <td className="p-2">{review.comment}</td>
                <td className="p-2">{review.rating}⭐</td>
                <td className="p-2">{review.status}</td>
                <td className="p-2">{review.user?.name || 'User'}</td>
                <td className="p-2 space-x-2">
                  <button onClick={() => handleAction(review._id, 'approve')} className="bg-green-500 text-white px-3 py-1 rounded">Approve</button>
                  {review.hidden ? (
                    <button onClick={() => handleAction(review._id, 'unhide')} className="bg-yellow-500 text-white px-3 py-1 rounded">Unhide</button>
                  ) : (
                    <button onClick={() => handleAction(review._id, 'hide')} className="bg-yellow-500 text-white px-3 py-1 rounded">Hide</button>
                  )}
                  <button onClick={() => handleAction(review._id, 'delete')} className="bg-red-600 text-white px-3 py-1 rounded">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default ReviewModeration;
