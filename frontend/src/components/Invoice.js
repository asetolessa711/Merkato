import React from 'react';
import './Invoice.css';

function Invoice({ order }) {
  if (!order) return null;

  const {
    _id,
    createdAt,
    shippingAddress = {},
    paymentMethod,
    vendors = [],
    total = 0,
    discount = 0,
    totalAfterDiscount,
    promoCode,
    currency = 'USD',
    deliveryOption
  } = order;

  return (
    <div className="invoice-container">
      <div className="invoice-header">
        <div className="title">Invoice</div>
        <div className="order-info">
          <p><strong>Order ID:</strong> {_id}</p>
          <p><strong>Date:</strong> {new Date(createdAt).toLocaleString()}</p>
        </div>
      </div>

      <div className="invoice-section">
        <h4>Shipping Address</h4>
        <p>{shippingAddress.fullName}</p>
        <p>{shippingAddress.street}, {shippingAddress.city}, {shippingAddress.postalCode}</p>
        <p>{shippingAddress.country}</p>
      </div>

      <div className="invoice-section">
        <h4>Payment Details</h4>
        <p><strong>Method:</strong> {paymentMethod?.toUpperCase() || 'N/A'}</p>
        <p><strong>Delivery:</strong> {deliveryOption?.name} ({deliveryOption?.days} days)</p>
      </div>

      {vendors.map((vendor, vendorIndex) => (
        <div key={vendorIndex} className="vendor-section">
          <h4>Vendor: {vendor.vendorName}</h4>
          <table className="invoice-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Tax</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {vendor.products.map((item, index) => (
                <tr key={index}>
                  <td>{item.name || (item.product && item.product.name) || 'Product'}</td>
                  <td>{item.quantity}</td>
                  <td>{currency} {(item.price ?? item.product?.price ?? 0).toFixed(2)}</td>
                  <td>{currency} {(item.tax ?? 0).toFixed(2)}</td>
                  <td>{currency} {(item.subtotal ?? (item.product?.price || 0) * item.quantity).toFixed(2)}</td>
                </tr>
              ))}
              <tr className="vendor-summary">
                <td colSpan="3"></td>
                <td><strong>Subtotal:</strong></td>
                <td>{currency} {vendor.subtotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td colSpan="3"></td>
                <td><strong>Tax:</strong></td>
                <td>{currency} {vendor.tax.toFixed(2)}</td>
              </tr>
              <tr>
                <td colSpan="3"></td>
                <td><strong>Shipping:</strong></td>
                <td>{currency} {vendor.shipping.toFixed(2)}</td>
              </tr>
              <tr>
                <td colSpan="3"></td>
                <td><strong>Vendor Total:</strong></td>
                <td>{currency} {vendor.total.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      ))}

      <div className="invoice-summary">
        <h4>Order Summary</h4>
        <p><strong>Subtotal:</strong> {currency} {vendors.reduce((sum, v) => sum + v.subtotal, 0).toFixed(2)}</p>
        <p><strong>Total Tax:</strong> {currency} {vendors.reduce((sum, v) => sum + v.tax, 0).toFixed(2)}</p>
        <p><strong>Total Shipping:</strong> {currency} {vendors.reduce((sum, v) => sum + v.shipping, 0).toFixed(2)}</p>
        {promoCode && (
          <>
            <p><strong>Promo Code:</strong> {promoCode.code}</p>
            <p><strong>Discount:</strong> -{currency} {discount.toFixed(2)}</p>
          </>
        )}
        <p className="grand-total"><strong>Grand Total:</strong> {currency} {(totalAfterDiscount || total).toFixed(2)}</p>
      </div>

      <div className="invoice-footer">
        <p>Thank you for shopping with Merkato</p>
        <small>This is a computer generated invoice</small>
      </div>
    </div>
  );
}

export default Invoice;
