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
  const disabled = isBulkLimitExceeded || selectedOrders.length === 0 || !canBulkAction;
  return (
    <div style={{ marginBottom: 16, background: '#f5f5f5', padding: 10, borderRadius: 6, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      {selectedOrders.length === 0 && (
        <span>No selection</span>
      )}
      <span>{selectedOrders.length} selected</span>
      {isBulkLimitExceeded && (
        <span style={{ color: 'red', fontWeight: 'bold', marginLeft: 10 }}>
          ⚠️ Bulk actions limited to {BULK_ACTION_LIMIT} orders. Please reduce your selection.
        </span>
      )}
      <button onClick={selectAllOnPage} style={{ marginLeft: 10 }} disabled={isBulkLimitExceeded}>Select All on Page</button>
      <button onClick={selectAllMatching} style={{ marginLeft: 10 }} disabled={isBulkLimitExceeded}>Select All Matching</button>
      <button onClick={deselectAll} style={{ marginLeft: 10 }}>Deselect All</button>
      <button data-testid="bulk-action-mark-shipped" onClick={() => handleBulkPreview('shipped')} style={{ marginLeft: 10 }} disabled={disabled}>Mark as Shipped</button>
      <button onClick={() => handleBulkPreview('cancelled')} style={{ marginLeft: 10 }} disabled={disabled}>Cancel Orders</button>
      <button onClick={() => handleBulkPreview('export')} style={{ marginLeft: 10 }} disabled={disabled}>Export Selected</button>
      <button onClick={() => handleBulkPreview('resend')} style={{ marginLeft: 10 }} disabled={disabled}>Resend Emails</button>
      {/* Schedule bulk actions */}
      <button onClick={() => handleScheduleBulkAction('shipped')} style={{ marginLeft: 10, background: '#e6f7ff' }} disabled={disabled}>Schedule Mark as Shipped</button>
      <button onClick={() => handleScheduleBulkAction('cancelled')} style={{ marginLeft: 10, background: '#e6f7ff' }} disabled={disabled}>Schedule Cancel Orders</button>
      <button onClick={() => handleScheduleBulkAction('export')} style={{ marginLeft: 10, background: '#e6f7ff' }} disabled={disabled}>Schedule Export</button>
      <button onClick={() => handleScheduleBulkAction('resend')} style={{ marginLeft: 10, background: '#e6f7ff' }} disabled={disabled}>Schedule Resend Emails</button>
      {undoBulk && (
        <button onClick={handleUndoBulk} data-testid="undo-bulk-action" style={{ marginLeft: 10, background: '#ffe0e0' }}>Undo</button>
      )}
    </div>
  );
};

export default BulkActionsToolbar;
