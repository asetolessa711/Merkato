import React, { useState } from 'react';
import Modal from 'react-modal';

Modal.setAppElement('#root');

const AddressModal = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    label: '',
    fullName: '',
    phone: '',
    street: '',
    city: '',
    postalCode: '',
    country: '',
    isDefault: false
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    setFormData({
      label: '', fullName: '', phone: '', street: '', city: '', postalCode: '', country: '', isDefault: false
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onRequestClose={onClose} contentLabel="Add Address" style={{ content: { maxWidth: 500, margin: 'auto' } }}>
      <h3>Add New Address</h3>
      <form onSubmit={handleSubmit}>
        {['label', 'fullName', 'phone', 'street', 'city', 'postalCode', 'country'].map(field => (
          <div key={field} style={{ marginBottom: 10 }}>
            <label>{field}:</label><br />
            <input
              type="text"
              name={field}
              value={formData[field]}
              onChange={handleChange}
              required
            />
          </div>
        ))}
        <label>
          <input
            type="checkbox"
            name="isDefault"
            checked={formData.isDefault}
            onChange={handleChange}
          /> Set as default
        </label>
        <br /><br />
        <button type="submit">Save</button>
        <button onClick={onClose} type="button" style={{ marginLeft: 10 }}>Cancel</button>
      </form>
    </Modal>
  );
};

export default AddressModal;
