import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import AddressModal from '../components/AddressModal';
import InvoicePreviewModal from '../components/InvoicePreviewModal';

const CheckoutPage = () => {
  const [cartItems, setCartItems] = useState([]);
  const [cartTotal, setCartTotal] = useState(0);
  const [finalTotal, setFinalTotal] = useState(0);
  const [firstTimeDiscountActive, setFirstTimeDiscountActive] = useState(false);
  const [firstTimeDiscountPercentage, setFirstTimeDiscountPercentage] = useState(10);
  const [isFirstTimeBuyer, setIsFirstTimeBuyer] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [modalOpen, setModalOpen] = useState(false);
  const [deliveryOptions, setDeliveryOptions] = useState([]);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);

  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [cartRes, discountRes, addressRes, deliveryRes] = await Promise.all([
          axios.get('/api/cart', { headers }),
          axios.get('/api/admin/first-time-discount', { headers }),
          axios.get('/api/customer/addresses', { headers }),
          axios.get('/api/admin/delivery-options', { headers })
        ]);

        setCartItems(cartRes.data.items || []);
        setCartTotal(cartRes.data.total || 0);
        setAddresses(addressRes.data);
        setDeliveryOptions(deliveryRes.data.filter(opt => opt.isActive));

        const defaultAddr = addressRes.data.find(a => a.isDefault);
        if (defaultAddr) setSelectedAddress(defaultAddr);

        setFirstTimeDiscountActive(discountRes.data.active);
        setFirstTimeDiscountPercentage(discountRes.data.percentage || 10);

        const storedUser = JSON.parse(localStorage.getItem('user'));
        const accountCreatedAt = new Date(storedUser?.createdAt);
        const now = new Date();
        const newBuyer = (now - accountCreatedAt) < (24 * 60 * 60 * 1000);
        setIsFirstTimeBuyer(newBuyer);
      } catch (err) {
        console.error('Failed to fetch checkout data:', err);
      }
    };

    fetchInitialData();
  }, []);

  useEffect(() => {
    let total = cartTotal;
    if (isFirstTimeBuyer && firstTimeDiscountActive) {
      total = total * ((100 - firstTimeDiscountPercentage) / 100);
    }
    if (selectedDelivery?.cost) {
      total = parseFloat(total) + selectedDelivery.cost;
    }
    setFinalTotal(total.toFixed(2));
  }, [cartTotal, isFirstTimeBuyer, firstTimeDiscountActive, firstTimeDiscountPercentage, selectedDelivery]);

  const handleConfirmOrder = async () => {
    if (!selectedAddress || !selectedDelivery) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const formattedItems = cartItems.map(item => ({
        product: item._id,
        quantity: item.quantity,
        price: item.price
      }));
      await axios.post('/api/orders', {
        products: formattedItems,
        total: finalTotal,
        shippingAddress: selectedAddress,
        paymentMethod,
        deliveryOption: selectedDelivery
      }, { headers });
      alert('Order placed successfully!');
      navigate('/account/orders');
    } catch (err) {
      console.error('Checkout failed', err);
      alert('Checkout failed. Please try again.');
    }
  };

  const handleAddAddress = async (newAddress) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post('/api/customer/addresses', newAddress, { headers });
      const updated = await axios.get('/api/customer/addresses', { headers });
      setAddresses(updated.data);
      const latest = updated.data.find(a => a.isDefault) || updated.data.at(-1);
      if (latest) setSelectedAddress(latest);
    } catch (err) {
      console.error('Failed to add address:', err);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">🛒 Checkout</h2>

      {cartItems.length === 0 ? (
        <p>Your cart is empty.</p>
      ) : (
        <>
          <div className="mb-6">
            {cartItems.map((item) => (
              <div key={item._id} className="flex justify-between mb-2">
                <span>{item.name}</span>
                <span>${item.price}</span>
              </div>
            ))}
          </div>

          {addresses.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold">Shipping Address</h3>
              <ul>
                {addresses.map(addr => (
                  <li
                    key={addr._id}
                    className={`p-4 border rounded mb-2 cursor-pointer ${selectedAddress?._id === addr._id ? 'border-green-600' : 'border-gray-300'}`}
                    onClick={() => setSelectedAddress(addr)}
                  >
                    <p><strong>{addr.label}</strong> {addr.isDefault && <span className="text-green-500">(Default)</span>}</p>
                    <p>{addr.fullName}, {addr.street}, {addr.city}, {addr.postalCode}, {addr.country}</p>
                    <p>{addr.phone}</p>
                  </li>
                ))}
              </ul>
              <button onClick={() => setModalOpen(true)} className="mt-2 text-blue-600 underline">
                ➕ Add New Address
              </button>
            </div>
          )}

          <div className="mb-6">
            <h3 className="text-lg font-semibold">Delivery Option</h3>
            <select
              value={selectedDelivery?._id || ''}
              onChange={e => setSelectedDelivery(deliveryOptions.find(o => o._id === e.target.value))}
              className="border rounded p-2 w-full"
            >
              <option value="">Select Delivery Option</option>
              {deliveryOptions.map(opt => (
                <option key={opt._id} value={opt._id}>
                  {opt.name} - {opt.days} - ${opt.cost.toFixed(2)}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold">Payment Method</h3>
            <select
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value)}
              className="border rounded p-2 w-full"
            >
              <option value="cod">Cash on Delivery</option>
              <option value="telebirr">Telebirr</option>
              <option value="stripe">Stripe</option>
            </select>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold">Order Summary:</h3>
            <p>Items Total: ${cartTotal.toFixed(2)}</p>
            {selectedDelivery && (
              <p>Delivery: ${selectedDelivery.cost.toFixed(2)}</p>
            )}
            {isFirstTimeBuyer && firstTimeDiscountActive && (
              <div className="text-green-600 font-bold my-2">
                🎁 {firstTimeDiscountPercentage}% First-Time Buyer Discount Applied!
              </div>
            )}
            <p className="text-xl font-bold mt-2">Final Total: ${finalTotal}</p>
          </div>

          <button
            onClick={() => setShowInvoicePreview(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded font-bold"
          >
            Review Order
          </button>
        </>
      )}

      <AddressModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleAddAddress}
      />

      <InvoicePreviewModal
        isOpen={showInvoicePreview}
        onClose={() => setShowInvoicePreview(false)}
        onConfirm={handleConfirmOrder}
        orderData={{
          cartItems,
          shippingAddress: selectedAddress,
          deliveryOption: selectedDelivery,
          paymentMethod,
          finalTotal
        }}
      />
    </div>
  );
};

export default CheckoutPage;
