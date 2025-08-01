
import React, { useEffect, useState } from 'react';

const CheckoutPage = () => {
  const [cart, setCart] = useState([]);
  useEffect(() => {
    try {
      const data = JSON.parse(localStorage.getItem('merkato-cart'));
      setCart(Array.isArray(data) ? data : []);
    } catch {
      setCart([]);
    }
  }, []);
  if (!cart.length) {
    return <div>Your cart is empty</div>;
  }
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  return (
    <div>
      <ul>
        {cart.map(item => (
          <li key={item._id}>
            <span>{item.name}</span>
            <span>{item.quantity}</span>
            <span>${item.price}</span>
          </li>
        ))}
      </ul>
      <div>Total: ${total}</div>
    </div>
  );
};

export default CheckoutPage;
