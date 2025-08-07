import React from 'react';

function OrderDetailsModal({ showModal, modalOrder, fallback, countryFlags, handleResendInvoice, closeOrderModal }) {
  if (!showModal || !modalOrder) return null;
  return (
    <div role="dialog" aria-modal="true" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 10, padding: 30, minWidth: 320, maxWidth: 500 }}>
        <h3>Order Details</h3>
        <p><strong>Order ID:</strong> {fallback(modalOrder._id)}</p>
        <p><strong>Buyer:</strong> {fallback(modalOrder.buyer?.name)} ({fallback(modalOrder.buyer?.email)})</p>
        <p><strong>Status:</strong> {fallback(modalOrder.status)}</p>
        <p><strong>Total:</strong> {fallback(modalOrder.currency)} {modalOrder.total !== undefined && modalOrder.total !== null ? modalOrder.total.toFixed(2) : fallback(null)}</p>
        {/* Timeline visualization */}
        <div style={{ margin: '16px 0' }}>
          <strong>Order Timeline:</strong>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8 }}>
            <span style={{ color: modalOrder.status === 'pending' ? '#007bff' : '#ccc' }}>🕒 Pending</span>
            <span style={{ color: modalOrder.status === 'paid' ? '#007bff' : '#ccc' }}>💰 Paid</span>
            <span style={{ color: modalOrder.status === 'shipped' ? '#007bff' : '#ccc' }}>🚚 Shipped</span>
            <span style={{ color: modalOrder.status === 'delivered' ? '#007bff' : '#ccc' }}>📦 Delivered</span>
            <span style={{ color: modalOrder.status === 'cancelled' ? 'red' : '#ccc' }}>❌ Cancelled</span>
          </div>
        </div>
        <p><strong>Payment:</strong> {fallback(modalOrder.paymentMethod)}</p>
        <p><strong>Shipping:</strong> {fallback(modalOrder.shippingAddress?.fullName)}{modalOrder.shippingAddress?.city ? `, ${modalOrder.shippingAddress.city}` : ''}{modalOrder.shippingAddress?.country ? `, ${modalOrder.shippingAddress.country}` : ''}</p>
        {modalOrder.shippingAddress?.country && (
          <p><strong>🌍 Country:</strong> {countryFlags[modalOrder.shippingAddress.country] || '🏳️'} {modalOrder.shippingAddress.country}</p>
        )}
        <p><strong>Updated By:</strong> {fallback(modalOrder.updatedBy?.name)} on {modalOrder.updatedAt ? new Date(modalOrder.updatedAt).toLocaleString() : fallback(null)}</p>
        <hr />
        <p><strong>Items:</strong></p>
        <ul>
          {modalOrder.products.length === 0 ? <li role="status">No items found.</li> : modalOrder.products.map((p, i) => (
            <li key={i}>{fallback(p.product?.name)} × {fallback(p.quantity)}</li>
          ))}
        </ul>
        <div style={{ marginTop: 10 }}>
          <strong>Email Status:</strong>{' '}
          {modalOrder.emailLog?.status === 'sent' && <span style={{ color: 'green' }}>✅ Sent</span>}
          {modalOrder.emailLog?.status === 'failed' && <span style={{ color: 'red' }}>❌ Failed</span>}
          {!modalOrder.emailLog?.status && <span style={{ color: 'gray' }}>⏳ Not Sent</span>}
          <br />
          {modalOrder.emailLog?.to && <small>📧 {fallback(modalOrder.emailLog.to)}</small>}
          <br />
          {modalOrder.emailLog?.sentAt && <small>🕒 {new Date(modalOrder.emailLog.sentAt).toLocaleString()}</small>}
          {modalOrder.emailLog?.status === 'failed' && (
            <>
              <br /><small style={{ color: 'darkred' }}>⚠️ {fallback(modalOrder.emailLog.error)}</small>
              <br /><button onClick={() => handleResendInvoice(modalOrder._id)} aria-label="Resend Invoice">🔁 Resend Invoice</button>
            </>
          )}
        </div>
        <button onClick={closeOrderModal} style={{ marginTop: 20 }}>Close</button>
      </div>
    </div>
  );
}

export default OrderDetailsModal;
