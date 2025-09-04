import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';

import { MessageContext } from '../context/MessageContext';

const AdminDeliveryOptions = () => {
  const [options, setOptions] = useState([]);
  const [form, setForm] = useState({ name: '', description: '', days: '', cost: 0, isActive: true });
  const [editingId, setEditingId] = useState(null);
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };
  const { showMessage } = useContext(MessageContext);

  const fetchOptions = async () => {
    try {
      const res = await axios.get('/api/admin/delivery-options', { headers });
      setOptions(res.data);
    } catch (err) {
      showMessage('Failed to fetch delivery options', 'error');
    }
  };

  useEffect(() => {
    fetchOptions();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`/api/admin/delivery-options/${editingId}`, form, { headers });
        showMessage('Delivery option updated successfully', 'success');
      } else {
        await axios.post('/api/admin/delivery-options', form, { headers });
        showMessage('Delivery option added successfully', 'success');
      }
      fetchOptions();
      setForm({ name: '', description: '', days: '', cost: 0, isActive: true });
      setEditingId(null);
    } catch (err) {
      showMessage('Failed to save delivery option', 'error');
    }
  };

  const handleEdit = (opt) => {
    setEditingId(opt._id);
    setForm({ ...opt });
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this delivery option?')) {
      try {
        await axios.delete(`/api/admin/delivery-options/${id}`, { headers });
        showMessage('Delivery option deleted', 'success');
        fetchOptions();
      } catch (err) {
        showMessage('Failed to delete delivery option', 'error');
      }
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>📦 Delivery Options</h2>

      <form onSubmit={handleSubmit} style={{ marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Name (e.g. Standard)"
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          required
        />
        <input
          type="text"
          placeholder="Description (optional)"
          value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
        />
        <input
          type="text"
          placeholder="Delivery Days (e.g. 3-5 days)"
          value={form.days}
          onChange={e => setForm({ ...form, days: e.target.value })}
          required
        />
        <input
          type="number"
          placeholder="Cost (e.g. 5.00)"
          value={form.cost}
          onChange={e => setForm({ ...form, cost: parseFloat(e.target.value) })}
        />
        <label>
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={e => setForm({ ...form, isActive: e.target.checked })}
          /> Active
        </label>
        <button type="submit">{editingId ? 'Update' : 'Add'} Delivery Option</button>
      </form>

      <table border="1" cellPadding="8" style={{ width: '100%' }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Cost</th>
            <th>Days</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {options.map(opt => (
            <tr key={opt._id}>
              <td>{opt.name}</td>
              <td>${opt.cost.toFixed(2)}</td>
              <td>{opt.days}</td>
              <td>{opt.isActive ? '✅ Active' : '⛔ Inactive'}</td>
              <td>
                <button onClick={() => handleEdit(opt)}>Edit</button>
                <button onClick={() => handleDelete(opt._id)} style={{ color: 'red' }}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminDeliveryOptions;
