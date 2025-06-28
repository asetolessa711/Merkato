import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const AdminFlagManager = () => {
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token');

  const fetchFlags = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get('/api/admin/flags', { headers });
      setFlags(res.data);
    } catch (err) {
      toast.error('Failed to fetch flagged products');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, actionType) => {
    const note = prompt(`Optional: Add a review note for this ${actionType}`);
    const headers = { Authorization: `Bearer ${token}` };
    try {
      await axios.put(`/api/admin/flags/${id}/${actionType}`, { note }, { headers });
      toast.success(`Flag ${actionType}d successfully`);
      fetchFlags();
    } catch (err) {
      toast.error('Action failed');
    }
  };

  useEffect(() => {
    fetchFlags();
  }, []);

  const pendingFlags = flags.filter(f => f.status === 'pending');
  const resolvedFlags = flags.filter(f => f.status === 'approved' || f.status === 'removed');

  const oldestPending = pendingFlags.length > 0
    ? Math.round((Date.now() - new Date(Math.min(...pendingFlags.map(f => new Date(f.createdAt))))) / (1000 * 60 * 60))
    : null;

  const averageResolutionTime = resolvedFlags.length > 0
    ? Math.round(resolvedFlags.reduce((sum, f) => {
        if (f.resolvedAt) {
          return sum + (new Date(f.resolvedAt) - new Date(f.createdAt));
        }
        return sum;
      }, 0) / resolvedFlags.length / (1000 * 60 * 60))
    : null;

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Flagged Product Management</h2>
      <ToastContainer position="bottom-right" autoClose={3000} />

      <div className="mb-6">
        <h3 className="text-lg font-semibold">📊 Moderation Overview</h3>
        <ul className="list-disc pl-6 mt-2">
          <li><strong>Pending Flags:</strong> {pendingFlags.length}</li>
          <li><strong>Oldest Pending:</strong> {oldestPending !== null ? `${oldestPending} hours` : 'None'}</li>
          <li><strong>Average Resolution Time:</strong> {averageResolutionTime !== null ? `${averageResolutionTime} hours` : 'Not enough data'}</li>
        </ul>
      </div>

      {loading ? (
        <p>Loading flagged products...</p>
      ) : flags.length === 0 ? (
        <p>No flagged products pending review.</p>
      ) : (
        <table className="w-full border">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2">Product</th>
              <th className="p-2">Reason</th>
              <th className="p-2">Source</th>
              <th className="p-2">Flagged By</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {flags.map(flag => (
              <tr key={flag._id} className="border-t">
                <td className="p-2">{flag.product?.name || 'Unnamed Product'}</td>
                <td className="p-2">{flag.reason}</td>
                <td className="p-2">{flag.source}</td>
                <td className="p-2">{flag.flaggedBy ? `${flag.flaggedBy.name} (${flag.flaggedBy.email})` : 'AI'}</td>
                <td className="p-2">
                  <button onClick={() => handleAction(flag._id, 'approve')} className="bg-green-500 text-white px-3 py-1 rounded mr-2">Approve</button>
                  <button onClick={() => handleAction(flag._id, 'remove')} className="bg-red-500 text-white px-3 py-1 rounded">Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AdminFlagManager;
