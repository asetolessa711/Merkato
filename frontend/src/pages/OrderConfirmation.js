import React, { useEffect } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { useMessage } from '../context/MessageContext';

const OrderConfirmation = () => {
  const { showMessage } = useMessage();
  const location = useLocation();
  const order = location.state?.order;
  useEffect(() => {
    if (order) {
      showMessage('Order confirmed! Thank you for your purchase.', 'success');
    }
  }, [order, showMessage]);
  if (!order) return <Navigate to="/" replace />;
  // Defensive: fallback objects to avoid crashes
  const buyer = order.buyer || {};
  const company = order.company || {};
  const items = Array.isArray(order.items) ? order.items : [];
  const currency = order.currency || 'USD';
  // Helper for fallback
  const fallback = (val) => val === null || val === undefined || val === '' ? <span style={{ color: '#aaa' }}>Not provided</span> : val;
  return (
    <div style={{ maxWidth: 700, margin: '40px auto', background: '#fff', borderRadius: 10, boxShadow: '0 2px 10px rgba(0,0,0,0.08)', padding: 32, fontFamily: 'Poppins, sans-serif' }}>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <h2 style={{ color: '#00B894', marginBottom: 8 }} role="heading" aria-level="2">Order Confirmation</h2>
        <div style={{ fontSize: 22, fontWeight: 600, color: '#00B894', marginBottom: 4 }}>Thank you!</div>
        <div style={{ fontSize: 16, color: '#555' }}>Your order has been placed successfully.</div>
      </div>
      <div style={{ marginBottom: 16, color: '#555' }}>
        <strong>Order Number:</strong> {fallback(order.orderNumber)}<br />
        <strong>Invoice Number:</strong> {fallback(order.invoiceNumber)}<br />
        <strong>Date:</strong> {fallback(order.date)}
      </div>
      <div style={{ display: 'flex', gap: 32, marginBottom: 24 }}>
        <div style={{ flex: 1 }}>
          <h4 style={{ marginBottom: 4 }} role="heading" aria-level="4">Buyer Info{buyer.type ? ` (${buyer.type})` : ''}:</h4>
          <div>Name: {fallback(buyer.name)}</div>
          <div>Email: {fallback(buyer.email)}</div>
          <div>Phone: {fallback(buyer.phone)}</div>
          <div>Address: {fallback(buyer.address)}</div>
          {buyer.taxId && <div>Tax ID: {buyer.taxId}</div>}
          {buyer.company && <div>Company: {buyer.company}</div>}
        </div>
        {order.company && (
          <div style={{ flex: 1 }}>
            <h4 style={{ marginBottom: 4 }} role="heading" aria-level="4">Company Info:</h4>
            <div>Name: {fallback(company.name)}</div>
            <div>Address: {fallback(company.address)}</div>
            <div>Email: {fallback(company.email)}</div>
            <div>Phone: {fallback(company.phone)}</div>
            {company.taxId && <div>Tax ID: {company.taxId}</div>}
          </div>
        )}
      </div>
      {items.length > 0 ? (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }} aria-label="Order Items">
          <thead>
            <tr style={{ background: '#f4f4f4' }}>
              <th style={{ textAlign: 'left', padding: 8 }}>Item</th>
              <th style={{ textAlign: 'center', padding: 8 }}>Qty</th>
              <th style={{ textAlign: 'right', padding: 8 }}>Price</th>
              <th style={{ textAlign: 'right', padding: 8 }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx}>
                <td style={{ padding: 8 }}>{fallback(item.name)}</td>
                <td style={{ textAlign: 'center', padding: 8 }}>{fallback(item.quantity)}</td>
                <td style={{ textAlign: 'right', padding: 8 }}>{currency} {item.price !== undefined && item.price !== null ? Number(item.price).toFixed(2) : '0.00'}</td>
                <td style={{ textAlign: 'right', padding: 8 }}>{currency} {item.price !== undefined && item.quantity !== undefined ? (Number(item.price) * Number(item.quantity)).toFixed(2) : '0.00'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div style={{ textAlign: 'center', color: '#aaa', marginBottom: 24 }} role="status">No items in this order.</div>
      )}
      <div style={{ textAlign: 'right', marginBottom: 8 }}>
        <div>Subtotal: {currency} {order.subtotal !== undefined && order.subtotal !== null ? Number(order.subtotal).toFixed(2) : '0.00'}</div>
        <div>Tax: {currency} {order.tax !== undefined && order.tax !== null ? Number(order.tax).toFixed(2) : '0.00'}</div>
        {order.discount !== undefined && order.discount !== null && (
          <div style={{ color: '#00B894' }}>Discount: -{currency} {Number(order.discount).toFixed(2)}</div>
        )}
        {order.taxExempt && (
          <div style={{ color: '#636e72' }}>Tax Exempt</div>
        )}
        <div style={{ fontWeight: 'bold', fontSize: 18 }}>Total: {currency} {order.total !== undefined && order.total !== null ? Number(order.total).toFixed(2) : '0.00'}</div>
      </div>
      {order.notes && (
        <div style={{ marginBottom: 8, color: '#636e72' }} aria-label="Order Notes">📝 {order.notes}</div>
      )}
      {order.paymentMethod && (
        <div style={{ marginBottom: 8, color: '#636e72' }} aria-label="Payment Method">Payment Method: {order.paymentMethod}</div>
      )}
      {order.invoiceUrl && (
        <div style={{ marginBottom: 8 }}>
          <a href={order.invoiceUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#0984e3', textDecoration: 'underline', fontWeight: 500 }} role="link" aria-label="Download Invoice">📄 Download Invoice</a>
        </div>
      )}
      <div style={{ textAlign: 'center', marginTop: 32 }}>
        <button onClick={() => window.print()} style={{ background: '#00B894', color: '#fff', padding: '10px 24px', border: 'none', borderRadius: 6, fontSize: 16, cursor: 'pointer', marginBottom: 16 }} aria-label="Print Invoice">🖨️ Print Invoice</button>
        <br />
        <a href="/" style={{ display: 'inline-block', marginTop: 12, background: '#0984e3', color: '#fff', padding: '10px 24px', border: 'none', borderRadius: 6, fontSize: 16, textDecoration: 'none', cursor: 'pointer' }} role="button" aria-label="Return to Home">🏠 Return to Home</a>
      </div>
    </div>
  );
};

export default OrderConfirmation;
