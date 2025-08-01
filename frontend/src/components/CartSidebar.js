

import React from 'react';

const CartSidebar = ({ isOpen, items = [], onClose, onRemove }) => {
  if (!isOpen) return null;
  if (!items.length) {
    return (
      <aside>
        <button onClick={onClose} aria-label="close">Close</button>
        <div>Your cart is empty</div>
      </aside>
    );
  }
  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  return (
    <aside>
      <button onClick={onClose} aria-label="close">Close</button>
      <ul>
        {items.map(item => (
          <li key={item.id}>
            <span>{item.name}</span>
            <span>{item.quantity}</span>
            <span>${item.price}</span>
            {onRemove && (
              <button onClick={() => onRemove(item.id)} aria-label={`remove ${item.name}`}>Remove</button>
            )}
          </li>
        ))}
      </ul>
      <div>Total: ${total}</div>
    </aside>
  );
};

export default CartSidebar;
