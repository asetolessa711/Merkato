import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Modal from 'react-modal';

Modal.setAppElement('#root');

function MyAddresses() {
  const [addresses, setAddresses] = useState([]);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    label: '', fullName: '', phone: '', street: '', city: '', postalCode: '', country: '', isDefault: false
  });
  const [editingId, setEditingId] = useState(null);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

    useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    const res = await axios.get('/api/customer/addresses', { headers });
    setAddresses(res.data);
  };

  const openModal = (address = null) => {
    setEditingId(address?._id || null);
    setFormData(address || {
      label: '', fullName: '', phone: '', street: '', city: '', postalCode: '', country: '', isDefault: false
    });
    setModalIsOpen(true);
  };

  const closeModal = () => {
    setModalIsOpen(false);
    setFormData({ label: '', fullName: '', phone: '', street: '', city: '', postalCode: '', country: '', isDefault: false });
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingId) {
      await axios.put(`/api/customer/addresses/${editingId}`, formData, { headers });
    } else {
      await axios.post('/api/customer/addresses', formData, { headers });
    }
    fetchAddresses();
    closeModal();
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this address?')) {
      await axios.delete(`/api/customer/addresses/${id}`, { headers });
      fetchAddresses();
    }
  };

  const setDefault = async (id) => {
    await axios.put(`/api/customer/addresses/default/${id}`, {}, { headers });
    fetchAddresses();
  };

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: '0 auto' }}>
      <h2>My Addresses</h2>
      <button onClick={() => openModal()} style={{ marginBottom: 20 }}>➕ Add New Address</button>

      {addresses.length === 0 ? (
        <p>No saved addresses yet.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {addresses.map(addr => (
            <li key={addr._id} style={{
              border: '1px solid #ccc', borderRadius: 8, padding: 16, marginBottom: 10,
              backgroundColor: addr.isDefault ? '#e0f7fa' : 'white'
            }}>
              <strong>{addr.label}</strong>
              <p>{addr.fullName}, {addr.phone}</p>
              <p>{addr.street}, {addr.city}, {addr.postalCode}, {addr.country}</p>
              {addr.isDefault && <p><strong>✅ Default Address</strong></p>}
              <div style={{ display: 'flex', gap: 10 }}>
                {!addr.isDefault && <button onClick={() => setDefault(addr._id)}>Set as Default</button>}
                <button onClick={() => openModal(addr)}>Edit</button>
                <button onClick={() => handleDelete(addr._id)} style={{ color: 'red' }}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal isOpen={modalIsOpen} onRequestClose={closeModal} contentLabel="Address Modal" style={{ content: { maxWidth: 500, margin: 'auto' } }}>
        <h3>{editingId ? 'Edit Address' : 'Add Address'}</h3>
        <form onSubmit={handleSubmit}>
          {['label', 'fullName', 'phone', 'street', 'city', 'postalCode', 'country'].map(field => (
            <div key={field} style={{ marginBottom: 10 }}>
              <label>{field}:</label><br />
              <input
                type="text"
                value={formData[field]}
                onChange={e => setFormData({ ...formData, [field]: e.target.value })}
                required
              />
            </div>
          ))}
          <label>
            <input
              type="checkbox"
              checked={formData.isDefault}
              onChange={e => setFormData({ ...formData, isDefault: e.target.checked })}
            /> Set as default
          </label>
          <br /><br />
          <button type="submit">Save</button>
          <button onClick={closeModal} style={{ marginLeft: 10 }} type="button">Cancel</button>
        </form>
      </Modal>
    </div>
  );
}

export default MyAddresses;
