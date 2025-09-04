import React from 'react';

const BulkPreviewDialog = ({
  show,
  action = '',
  orders = [],
  onConfirm,
  onCancel
}) => {
  if (!show) return null;
  const actionLabel =
    action === 'shipped' ? 'Mark as Shipped' :
    action === 'cancelled' ? 'Cancel Orders' :
    action === 'export' ? 'Export Selected' :
    'Resend Emails';
  return (
    <div role="dialog" aria-modal="true" data-testid="bulk-preview-dialog" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 10, padding: 30, minWidth: 320, maxWidth: 500 }}>
        <h3 data-testid="bulk-preview-header">Bulk Preview</h3>
        <p>Action: <strong>{actionLabel}</strong></p>
        <p>Affected Orders:</p>
        <ul style={{ maxHeight: 200, overflowY: 'auto' }}>
          {orders.map(order => (
            <li key={order._id}>{order._id} - {order.buyer?.name} ({order.status})</li>
          ))}
        </ul>
        <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
          <button data-testid="bulk-preview-confirm" onClick={onConfirm} style={{ background: '#007bff', color: '#fff', padding: '6px 16px', borderRadius: 6 }}>Confirm</button>
          <button onClick={onCancel} style={{ background: '#eee', color: '#333', padding: '6px 16px', borderRadius: 6 }}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default BulkPreviewDialog;
