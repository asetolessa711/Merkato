// File: AdminExpenseManager.js
import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';

import { MessageContext } from '../context/MessageContext';

function AdminExpenseManager() {
  const [expenses, setExpenses] = useState([]);
  const [form, setForm] = useState({
    title: '',
    amount: '',
    category: 'other',
    notes: ''
  });
  const { showMessage } = useContext(MessageContext);

  const token = localStorage.getItem('token');

  const headers = {
    Authorization: `Bearer ${token}`
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const res = await axios.get('/api/admin/expenses', { headers });
      setExpenses(res.data);
    } catch (err) {
      showMessage('Failed to load expenses', 'error');
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/admin/expenses', form, { headers });
      showMessage('Expense added successfully!', 'success');
      setForm({ title: '', amount: '', category: 'other', notes: '' });
      fetchExpenses();
    } catch (err) {
      showMessage('Failed to add expense', 'error');
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Manage Expenses</h2>
      <form onSubmit={handleSubmit}>
        <input
          name="title"
          placeholder="Expense Title"
          value={form.title}
          onChange={handleChange}
          required
        /><br />
        <input
          name="amount"
          type="number"
          placeholder="Amount (USD)"
          value={form.amount}
          onChange={handleChange}
          required
        /><br />
        <select name="category" value={form.category} onChange={handleChange}>
          <option value="marketing">Marketing</option>
          <option value="staff">Staff</option>
          <option value="logistics">Logistics</option>
          <option value="platform">Platform</option>
          <option value="vendor_payout">Vendor Payout</option>
          <option value="other">Other</option>
        </select><br />
        <textarea
          name="notes"
          placeholder="Optional notes"
          value={form.notes}
          onChange={handleChange}
        /><br />
        <button type="submit">Add Expense</button>
      </form>

      {/* Feedback now shown globally */}

      <h3>Recent Expenses</h3>
      <ul>
        {expenses.map((e) => (
          <li key={e._id}>
            {e.title} — ${e.amount} ({e.category}) on {new Date(e.createdAt).toLocaleDateString()}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default AdminExpenseManager;