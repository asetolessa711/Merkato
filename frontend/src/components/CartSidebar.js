

import React from 'react';

const CartSidebar = ({ isOpen, items = [], onClose, onRemove }) => {
  if (!isOpen) return null;

  const total = items.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);

  return (
    <aside data-testid="cart-sidebar" style={{
      position: 'fixed',
      top: 0,
      right: 0,
      width: 320,
      height: '100vh',
      background: '#fff',
      borderLeft: '1px solid #ddd',
      boxShadow: '-2px 0 8px rgba(0,0,0,0.08)',
      padding: 16,
      zIndex: 1000,
      overflowY: 'auto'
    }}>
      <div style={{ position: 'sticky', top: 0, background: '#fff', paddingBottom: 8, zIndex: 5 }}>
        <button data-testid="cart-close" onClick={onClose} aria-label="close" style={{ float: 'right' }}>Close ✖</button>
        <h3 style={{ marginTop: 0 }}>Your Cart</h3>
      </div>

      {!items.length ? (
        <div data-testid="cart-empty">Your cart is empty</div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {items.map(item => {
            const key = item._id || item.id;
            return (
            <li key={key} data-testid="cart-item" style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              padding: '8px 0',
              borderBottom: '1px solid #eee'
            }}>
              <span style={{ flex: 2 }} data-testid="item-name">{item.name}</span>
              <span style={{ flex: 1, textAlign: 'center' }}>x{item.quantity || 1}</span>
              <span style={{ flex: 1, textAlign: 'right' }} data-testid="item-price">${item.price}</span>
              {onRemove && (
                <button onClick={() => onRemove(key)} aria-label={`remove ${item.name}`}>Remove</button>
              )}
            </li>
            );
          })}
        </ul>
      )}

      <div style={{ marginTop: 12, fontWeight: 'bold' }}>Total: ${total}</div>
  <button
        data-testid="checkout-btn"
        style={{ marginTop: 12, width: '100%' }}
        disabled={!items.length}
        onClick={() => { window.location.href = '/checkout'; }}
      >
        Checkout
      </button>
    </aside>
  );
};

export default CartSidebar;
