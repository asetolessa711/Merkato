import React, { useState } from 'react';
import Modal from 'react-modal';

Modal.setAppElement('#root');

const InvoicePreviewModal = ({ isOpen, onClose, orderData, onConfirm }) => {
  if (!orderData) return null;

  const {
    cartItems = [],
    shippingAddress = {},
    deliveryOption = {},
    paymentMethod = '',
    finalTotal = '0.00',
    currency = '$'
  } = orderData;

  const [recurrence, setRecurrence] = useState('None');
  const [exchangeRate, setExchangeRate] = useState(137);

  const handleConfirm = () => {
    onConfirm({ ...orderData, recurrence });
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      contentLabel="Invoice Preview"
      style={{ content: { maxWidth: 600, margin: 'auto' } }}
    >
      <h3 className="text-xl font-bold mb-4">📄 Order Summary</h3>

      <div className="mb-3">
        <h4 className="font-semibold">📍 Shipping Address:</h4>
        <p>{shippingAddress.fullName}</p>
        <p>{shippingAddress.street}, {shippingAddress.city}</p>
        <p>{shippingAddress.postalCode}, {shippingAddress.country}</p>
        <p>{shippingAddress.phone}</p>
      </div>

      <div className="mb-3">
        <h4 className="font-semibold">🚚 Delivery Option:</h4>
        <p>{deliveryOption.name} - {deliveryOption.days}</p>
        <p>Cost: {currency} {deliveryOption.cost?.toFixed(2)}</p>
      </div>

      <div className="mb-3">
        <h4 className="font-semibold">💳 Payment Method:</h4>
        <p>{paymentMethod.toUpperCase()}</p>
      </div>

      <div className="mb-4">
        <h4 className="font-semibold">🛍️ Items:</h4>
        <ul>
          {cartItems.map(item => (
            <li key={item._id} className="flex justify-between">
              <span>{item.name} × {item.quantity}</span>
              <span>{currency}{(item.price * item.quantity).toFixed(2)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mb-4">
        <label className="font-semibold">🔁 Recurring Invoice?</label>
        <select
          value={recurrence}
          onChange={(e) => setRecurrence(e.target.value)}
          className="block w-full mt-1 p-2 border rounded"
        >
          <option value="None">None</option>
          <option value="Weekly">Weekly</option>
          <option value="Monthly">Monthly</option>
        </select>
      </div>
<h4 className="text-xl font-bold">
  Total: USD {finalTotal}
  <span className="block text-sm text-gray-600">
    (≈ ETB {(parseFloat(finalTotal) * 137).toFixed(2)} at rate 137)
  </span>
</h4>


      <div className="flex justify-end mt-4 gap-4">
        <button onClick={handleConfirm} className="bg-green-600 text-white px-4 py-2 rounded">✅ Confirm & Pay</button>
        <button onClick={onClose} className="bg-gray-300 px-4 py-2 rounded">Cancel</button>
      </div>
    </Modal>
  );
};

export default InvoicePreviewModal;
