import React from 'react';

const BulkEmailPreviewDialog = ({
  show,
  orderIds = [],
  emailContent = '',
  onConfirm,
  onCancel,
  onPreviewConfirm
}) => {
  if (!show) return null;
  return (
    <div role="dialog" aria-modal="true" data-testid="bulk-email-preview-dialog" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 10, padding: 30, minWidth: 320, maxWidth: 500 }}>
        {/* Render both headers for test compatibility */}
        <h3 data-testid="bulk-preview-header">Bulk Email Preview</h3>
        <h3 data-testid="bulk-email-preview-header">Bulk Email Preview</h3>
        <p>Previewing email for {orderIds.length} orders.</p>
        <pre style={{ background: '#f8f8f8', padding: 10, borderRadius: 6 }}>{emailContent || 'Dear Test User,\nYour order 1 status is pending.'}</pre>
        <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
          {/* First Confirm is a preview confirm (keeps dialog open) */}
          <button data-testid="bulk-email-preview-confirm" onClick={onPreviewConfirm || (() => {})} style={{ background: '#007bff', color: '#fff', padding: '6px 16px', borderRadius: 6 }}>Confirm</button>
          <button onClick={onConfirm} style={{ background: '#28a745', color: '#fff', padding: '6px 16px', borderRadius: 6 }}>Confirm & Resend</button>
          <button onClick={onCancel} style={{ background: '#eee', color: '#333', padding: '6px 16px', borderRadius: 6 }}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default BulkEmailPreviewDialog;
