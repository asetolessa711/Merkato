import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useBulkOrderActions } from '../hooks/useBulkOrderActions';
import BulkEmailPreviewDialog from '../components/BulkEmailPreviewDialog';
import BulkSummaryDialog from '../components/BulkSummaryDialog';
import BulkActionStatus from '../components/BulkActionStatus';
import BulkActionHistory from '../components/BulkActionHistory';
import BulkActionsToolbar from '../components/BulkActionsToolbar';
import BulkActionPermissionInfo from '../components/BulkActionPermissionInfo';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

function AdminOrders() {
  // Example: wire up admin action messages to UI buttons (add these to your UI as needed)
  // <button onClick={() => handleModerationAction('approve')}>Approve Review</button>
  // <button onClick={() => handleModerationAction('remove')}>Remove Review</button>
  // <button onClick={handleReportGeneration}>Generate Report</button>
  // <button onClick={() => handleUserManagementAction('update')}>Update User</button>
  // <button onClick={() => handleUserManagementAction('remove')}>Remove User</button>
  // Example admin action message functions
  const [orders, setOrders] = useState([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [msg, setMsg] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const handleModerationAction = (actionType) => {
    if (actionType === 'approve') setMsg('Review approved.');
    else if (actionType === 'remove') setMsg('Review removed.');
  };

  const handleReportGeneration = () => {
    setMsg('Report generated.');
  };

  const handleUserManagementAction = (actionType) => {
    if (actionType === 'update') setMsg('User updated.');
    else if (actionType === 'remove') setMsg('User removed.');
  };
  // Bulk order actions hook
  const emailTemplate = 'Dear {{buyer}},\nYour order {{orderId}} is now {{status}}.';
  const BULK_ACTION_LIMIT = 100;
  const bulkOrderActions = useBulkOrderActions({ orders, emailTemplate, headers, BULK_ACTION_LIMIT });
  const {
    emailPreviewOrderIds,
    emailPreviewContent,
    activeDialog,
    bulkProgress,
    bulkErrors,
    bulkSummary,
    showBulkSummary,
    showEmailPreview,
    toastMsg,
    showToast,
    bulkActionHistory,
    handleBulkResendEmails,
    confirmBulkResendEmails,
    handleConfirmResendEmails,
    retryBulkStatusChange,
    retryBulkResendEmails,
    cancelBulkResendEmails
  } = bulkOrderActions;
  // Example bulk message usage (can be customized as needed)
  // To trigger bulk email preview for selected orders:
  // handleBulkResendEmails(selectedOrderIds);

  const countryFlags = {
    Ethiopia: '🇪🇹', Kenya: '🇰🇪', Nigeria: '🇳🇬', Italy: '🇮🇹', USA: '🇺🇸',
    China: '🇨🇳', India: '🇮🇳', Bangladesh: '🇧🇩', Vietnam: '🇻🇳', Indonesia: '🇮🇩',
    Turkey: '🇹🇷', Pakistan: '🇵🇰', UAE: '🇦🇪', Germany: '🇩🇪', SouthKorea: '🇰🇷',
    Japan: '🇯🇵', Thailand: '🇹🇭', UK: '🇬🇧', France: '🇫🇷', Brazil: '🇧🇷', Egypt: '🇪🇬'
  };

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await axios.get('/api/orders', { headers });
        setOrders(res.data.orders || res.data);
      } catch (err) {
        setMsg('Failed to load orders');
      }
    };
    fetchOrders();
  }, [token]);

  const updateStatus = async (orderId, status) => {
    try {
      await axios.put(`/api/orders/${orderId}`, { status }, { headers });
      setMsg('Order updated');
      const res = await axios.get('/api/orders', { headers });
      setOrders(res.data);
    } catch (err) {
      setMsg('Failed to update order');
    }
  };

  const handleExport = () => {
    const params = new URLSearchParams();
    if (startDate) params.append('start', startDate.toISOString());
    if (endDate) params.append('end', endDate.toISOString());
    window.open(`/api/orders/export?${params.toString()}`, '_blank');
  };

  const handleResendInvoice = async (orderId) => {
    try {
      await axios.post(`/api/orders/${orderId}/email-invoice`, {}, { headers });
      alert('Invoice resent successfully.');
    } catch (err) {
      alert('Failed to resend invoice.');
    }
  };

  const ordersArray = Array.isArray(orders) ? orders : [];
  const uniqueCountries = Array.from(new Set(ordersArray.map(order => order.shippingAddress?.country).filter(Boolean)));
  const filteredOrders = selectedCountry
    ? ordersArray.filter(order => order.shippingAddress?.country === selectedCountry)
    : ordersArray;

  const countryStats = uniqueCountries.map(country => ({
    country,
    count: ordersArray.filter(order => order.shippingAddress?.country === country).length
  }));

  return (
    <div style={{ padding: 20 }}>
      {/* Bulk action status and toast message */}
      <BulkActionStatus progress={bulkProgress} errors={bulkErrors} />
      <BulkActionHistory history={bulkActionHistory} />
      <BulkActionsToolbar
        selectedOrders={ordersArray.filter(order => selectedOrderIds.includes(order._id))}
        canBulkAction={selectedOrderIds.length > 0}
        isBulkLimitExceeded={selectedOrderIds.length > BULK_ACTION_LIMIT}
        selectAllOnPage={() => setSelectedOrderIds(ordersArray.map(order => order._id))}
        selectAllMatching={() => setSelectedOrderIds(ordersArray.map(order => order._id))}
        deselectAll={() => setSelectedOrderIds([])}
        handleBulkPreview={() => {}}
        handleScheduleBulkAction={() => {}}
        undoBulk={() => {}}
        handleUndoBulk={() => {}}
        BULK_ACTION_LIMIT={BULK_ACTION_LIMIT}
        handleBulkResendEmails={() => handleBulkResendEmails(selectedOrderIds)}
      />
      <BulkActionPermissionInfo show={false} />
      {/* Bulk action status and toast message */}
      {showToast && (
        <div role="status" aria-live="polite" style={{ position: 'fixed', top: 20, right: 20, background: '#333', color: '#fff', padding: '10px 20px', borderRadius: 8, zIndex: 9999 }}>
          {toastMsg}
        </div>
      )}
      {bulkProgress && (
        <div style={{ marginBottom: 10, color: '#007bff' }}>{bulkProgress}</div>
      )}
      {bulkErrors.length > 0 && (
        <div style={{ marginBottom: 10, color: 'red' }}>Failed to update: {bulkErrors.join(', ')}</div>
      )}
      {/* Bulk email preview dialog */}
      <BulkEmailPreviewDialog
        show={activeDialog === 'emailPreview'}
        orderIds={emailPreviewOrderIds}
        emailContent={emailPreviewContent}
        onConfirm={handleConfirmResendEmails}
        onCancel={cancelBulkResendEmails}
      />
      {/* Bulk summary dialog */}
      {activeDialog === 'bulkSummary' && (
        <BulkSummaryDialog
          summary={bulkSummary}
          onClose={() => bulkOrderActions.setActiveDialog(null)}
          onRetryStatus={() => retryBulkStatusChange(bulkSummary)}
          onRetryEmail={() => retryBulkResendEmails(bulkSummary)}
        />
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20, marginBottom: 20 }}>
        <h2>All Orders</h2>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <DatePicker selected={startDate} onChange={date => setStartDate(date)} placeholderText="Start Date" />
          <DatePicker selected={endDate} onChange={date => setEndDate(date)} placeholderText="End Date" />
          <button onClick={handleExport} style={{ padding: '6px 12px' }}>
            Export CSV
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <label><strong>Filter by Country: </strong></label>{' '}
        <select value={selectedCountry} onChange={e => setSelectedCountry(e.target.value)}>
          <option value="">All Countries</option>
          {uniqueCountries.map((c, i) => (
            <option key={i} value={c}>{countryFlags[c] || '🏳️'} {c}</option>
          ))}
        </select>
      </div>

      {countryStats.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <strong>📊 Country Analytics:</strong>
          <ul>
            {countryStats.map((stat, idx) => (
              <li key={idx}>{countryFlags[stat.country] || '🏳️'} {stat.country}: {stat.count} order(s)</li>
            ))}
          </ul>
        </div>
      )}

      {msg && <p>{msg}</p>}

      {filteredOrders.length === 0 ? (
        <p>No orders yet.</p>
      ) : (
        filteredOrders.map(order => (
          <div key={order._id} style={{
            border: '1px solid #ccc',
            borderRadius: 8,
            padding: 16,
            marginBottom: 20,
            background: '#f8f8f8',
            display: 'flex',
            alignItems: 'center'
          }}>
            <input
              type="checkbox"
              checked={selectedOrderIds.includes(order._id)}
              onChange={e => {
                if (e.target.checked) {
                  setSelectedOrderIds([...selectedOrderIds, order._id]);
                } else {
                  setSelectedOrderIds(selectedOrderIds.filter(id => id !== order._id));
                }
              }}
              style={{ marginRight: 16 }}
              data-testid={`order-checkbox-${order._id}`}
            />
            <div style={{ flex: 1 }}>
              <p><strong>Order ID:</strong> {order._id}</p>
              <p><strong>Buyer:</strong> {order.buyer?.name} ({order.buyer?.email})</p>
              <p><strong>Status:</strong> {order.status}</p>
              <p><strong>Total:</strong> {order.currency} {order.total.toFixed(2)}</p>

              {order.promoCode && (
                <div style={{ marginTop: 8, marginBottom: 8, padding: 10, backgroundColor: '#eaf8e6', borderRadius: 6 }}>
                  <p><strong>🎁 Promo Code:</strong> {order.promoCode.code}</p>
                  <p><strong>Discount:</strong> -{order.currency} {order.discount?.toFixed(2)}</p>
                  <p><strong>Total After Discount:</strong> {order.currency} {order.totalAfterDiscount?.toFixed(2)}</p>
                </div>
              )}

              <p><strong>Payment:</strong> {order.paymentMethod}</p>
              <p><strong>Shipping:</strong> {order.shippingAddress?.fullName || 'N/A'}, {order.shippingAddress?.city}, {order.shippingAddress?.country}</p>
              {order.shippingAddress?.country && (
                <p><strong>🌍 Country:</strong> {countryFlags[order.shippingAddress.country] || '🏳️'} {order.shippingAddress.country}</p>
              )}
              <p><strong>Updated By:</strong> {order.updatedBy?.name || '—'} on {new Date(order.updatedAt).toLocaleString()}</p>
              <hr />
              <p><strong>Items:</strong></p>
              <ul>
                {order.products.map((p, i) => (
                  <li key={i}>
                    {p.product?.name} × {p.quantity}
                  </li>
                ))}
              </ul>
              <div>
                <label>Change Status: </label>
                <select
                  value={order.status}
                  onChange={(e) => updateStatus(order._id, e.target.value)}
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div style={{ marginTop: 10 }}>
                <strong>Email Status:</strong>{' '}
                {order.emailLog?.status === 'sent' && <span style={{ color: 'green' }}>✅ Sent</span>}
                {order.emailLog?.status === 'failed' && <span style={{ color: 'red' }}>❌ Failed</span>}
                {!order.emailLog?.status && <span style={{ color: 'gray' }}>⏳ Not Sent</span>}
                <br />
                {order.emailLog?.to && <small>📧 {order.emailLog.to}</small>}
                <br />
                {order.emailLog?.sentAt && <small>🕒 {new Date(order.emailLog.sentAt).toLocaleString()}</small>}
                {order.emailLog?.status === 'failed' && (
                  <>
                    <br /><small style={{ color: 'darkred' }}>⚠ {order.emailLog.error}</small>
                    <br /><button onClick={() => handleResendInvoice(order._id)}>🔁 Resend Invoice</button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default AdminOrders;
