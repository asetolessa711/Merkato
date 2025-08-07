import React from 'react';

/**
 * BulkSummaryDialog
 * Shows a summary of bulk actions performed (export, email, etc.)
 * Props:
 *   summary: { success: [], failed: [], actionType: string }
 *   onClose: function
 *   onRetryStatus: function (optional)
 *   onRetryEmail: function (optional)
 */
function BulkSummaryDialog({ summary, onClose, onRetryStatus, onRetryEmail }) {
  if (!summary) return null;
  return (
    <div
      style={{
        position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)', background: '#fff', borderRadius: 10, boxShadow: '0 2px 16px rgba(0,0,0,0.15)', padding: 32, zIndex: 9999, minWidth: 400
      }}
      data-testid="bulk-export-header"
    >
      <h2 data-testid="bulk-summary-header">Bulk Action Summary</h2>
      <div style={{ marginBottom: 16 }}>
        <strong>Action:</strong> {summary.actionType || 'Bulk'}
      </div>
      <div style={{ marginBottom: 16 }}>
        <strong>Success:</strong> {summary.success?.length || 0}
        {summary.success?.length > 0 && (
          <ul style={{ color: 'green' }}>
            {summary.success.map((id, i) => (
              <li key={i}>Order ID: {id}</li>
            ))}
          </ul>
        )}
      </div>
      <div style={{ marginBottom: 16 }}>
        <strong>Failed:</strong> {summary.failed?.length || 0}
        {summary.failed?.length > 0 && (
          <ul style={{ color: 'red' }}>
            {summary.failed.map((id, i) => (
              <li key={i}>Order ID: {id}</li>
            ))}
          </ul>
        )}
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
        {onRetryStatus && summary.failed?.length > 0 && (
          <button onClick={() => onRetryStatus(summary)} style={{ background: '#007bff', color: '#fff', borderRadius: 6, padding: '8px 16px' }}>
            Retry Status
          </button>
        )}
        {onRetryEmail && summary.failed?.length > 0 && (
          <button onClick={() => onRetryEmail(summary)} style={{ background: '#28a745', color: '#fff', borderRadius: 6, padding: '8px 16px' }}>
            Retry Email
          </button>
        )}
        <button onClick={onClose} style={{ background: '#ccc', color: '#333', borderRadius: 6, padding: '8px 16px' }}>
          Close
        </button>
      </div>
    </div>
  );
}

export default BulkSummaryDialog;
