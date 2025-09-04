import React from 'react';

const BulkActionsToolbar = ({
  selectedOrders = [],
  canBulkAction,
  isBulkLimitExceeded,
  selectAllOnPage,
  selectAllMatching,
  deselectAll,
  handleBulkPreview,
  handleScheduleBulkAction,
  undoBulk,
  handleUndoBulk,
  BULK_ACTION_LIMIT
}) => {
  if (selectedOrders.length === 0 || !canBulkAction) return null;
  return (
    <div style={{ marginBottom: 16, background: '#f5f5f5', padding: 10, borderRadius: 6, display: 'flex', gap: 10, alignItems: 'center' }}>
      <span>{selectedOrders.length} selected</span>
      {isBulkLimitExceeded && (
        <span style={{ color: 'red', fontWeight: 'bold', marginLeft: 10 }}>
          ⚠️ Bulk actions limited to {BULK_ACTION_LIMIT} orders. Please reduce your selection.
        </span>
      )}
      <button onClick={selectAllOnPage} style={{ marginLeft: 10 }} disabled={isBulkLimitExceeded}>Select All on Page</button>
      <button onClick={selectAllMatching} style={{ marginLeft: 10 }} disabled={isBulkLimitExceeded}>Select All Matching</button>
      <button onClick={deselectAll} style={{ marginLeft: 10 }}>Deselect All</button>
      <button onClick={() => handleBulkPreview('shipped')} style={{ marginLeft: 10 }} disabled={isBulkLimitExceeded}>Mark as Shipped</button>
      <button onClick={() => handleBulkPreview('cancelled')} style={{ marginLeft: 10 }} disabled={isBulkLimitExceeded}>Cancel Orders</button>
      <button onClick={() => handleBulkPreview('export')} style={{ marginLeft: 10 }} disabled={isBulkLimitExceeded}>Export Selected</button>
      <button onClick={() => handleBulkPreview('resend')} style={{ marginLeft: 10 }} disabled={isBulkLimitExceeded}>Resend Emails</button>
      {/* Schedule bulk actions */}
      <button onClick={() => handleScheduleBulkAction('shipped')} style={{ marginLeft: 10, background: '#e6f7ff' }} disabled={isBulkLimitExceeded}>Schedule Mark as Shipped</button>
      <button onClick={() => handleScheduleBulkAction('cancelled')} style={{ marginLeft: 10, background: '#e6f7ff' }} disabled={isBulkLimitExceeded}>Schedule Cancel Orders</button>
      <button onClick={() => handleScheduleBulkAction('export')} style={{ marginLeft: 10, background: '#e6f7ff' }} disabled={isBulkLimitExceeded}>Schedule Export</button>
      <button onClick={() => handleScheduleBulkAction('resend')} style={{ marginLeft: 10, background: '#e6f7ff' }} disabled={isBulkLimitExceeded}>Schedule Resend Emails</button>
      {undoBulk && (
        <button onClick={handleUndoBulk} data-testid="undo-bulk-action" style={{ marginLeft: 10, background: '#ffe0e0' }}>Undo</button>
      )}
    </div>
  );
};

export default BulkActionsToolbar;
