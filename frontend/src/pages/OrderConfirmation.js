import React from 'react';
import { useLocation, Navigate } from 'react-router-dom';

const OrderConfirmation = () => {
  const location = useLocation();
  const order = location.state?.order;
  if (!order) return <Navigate to="/" replace />;
  return (
  <div style={{ maxWidth: 700, margin: '40px auto', background: '#fff', borderRadius: 10, boxShadow: '0 2px 10px rgba(0,0,0,0.08)', padding: 32, fontFamily: 'Poppins, sans-serif' }}>
    <div style={{ textAlign: 'center', marginBottom: 16 }}>
      <h2 style={{ color: '#00B894', marginBottom: 8 }}>Order Confirmation</h2>
      <div style={{ fontSize: 22, fontWeight: 600, color: '#00B894', marginBottom: 4 }}>Thank you!</div>
      <div style={{ fontSize: 16, color: '#555' }}>Your order has been placed successfully.</div>
    </div>
    <div style={{ marginBottom: 16, color: '#555' }}>
      <strong>Order Number:</strong> {order.orderNumber}<br />
      <strong>Invoice Number:</strong> {order.invoiceNumber}<br />
      <strong>Date:</strong> {order.date}
    </div>
    <div style={{ display: 'flex', gap: 32, marginBottom: 24 }}>
      <div style={{ flex: 1 }}>
        <h4 style={{ marginBottom: 4 }}>Buyer Info ({order.buyer.type}):</h4>
        <div>{order.buyer.name}</div>
        <div>{order.buyer.email}</div>
        <div>{order.buyer.phone}</div>
        <div>{order.buyer.address}</div>
        {order.buyer.taxId && <div>Tax ID: {order.buyer.taxId}</div>}
        {order.buyer.company && <div>Company: {order.buyer.company}</div>}
      </div>
      <div style={{ flex: 1 }}>
        <h4 style={{ marginBottom: 4 }}>Company Info:</h4>
        <div>{order.company.name}</div>
        <div>{order.company.address}</div>
        <div>{order.company.email}</div>
        <div>{order.company.phone}</div>
        <div>Tax ID: {order.company.taxId}</div>
      </div>
    </div>
    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
      <thead>
        <tr style={{ background: '#f4f4f4' }}>
          <th style={{ textAlign: 'left', padding: 8 }}>Item</th>
          <th style={{ textAlign: 'center', padding: 8 }}>Qty</th>
          <th style={{ textAlign: 'right', padding: 8 }}>Price</th>
          <th style={{ textAlign: 'right', padding: 8 }}>Total</th>
        </tr>
      </thead>
      <tbody>
        {order.items.map((item, idx) => (
          <tr key={idx}>
            <td style={{ padding: 8 }}>{item.name}</td>
            <td style={{ textAlign: 'center', padding: 8 }}>{item.quantity}</td>
            <td style={{ textAlign: 'right', padding: 8 }}>{order.currency} {item.price.toFixed(2)}</td>
            <td style={{ textAlign: 'right', padding: 8 }}>{order.currency} {(item.price * item.quantity).toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
    <div style={{ textAlign: 'right', marginBottom: 8 }}>
      <div>Subtotal: {order.currency} {order.subtotal.toFixed(2)}</div>
      <div>Tax: {order.currency} {order.tax.toFixed(2)}</div>
      <div style={{ fontWeight: 'bold', fontSize: 18 }}>Total: {order.currency} {order.total.toFixed(2)}</div>
    </div>
    <div style={{ textAlign: 'center', marginTop: 32 }}>
      <button onClick={() => window.print()} style={{ background: '#00B894', color: '#fff', padding: '10px 24px', border: 'none', borderRadius: 6, fontSize: 16, cursor: 'pointer', marginBottom: 16 }}>🖨️ Print Invoice</button>
      <br />
      <a href="/" style={{ display: 'inline-block', marginTop: 12, background: '#0984e3', color: '#fff', padding: '10px 24px', border: 'none', borderRadius: 6, fontSize: 16, textDecoration: 'none', cursor: 'pointer' }} role="button" aria-label="Return to Home">🏠 Return to Home</a>
    </div>
  </div>
  );
};

export default OrderConfirmation;
