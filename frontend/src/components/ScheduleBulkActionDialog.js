import React from 'react';

const ScheduleBulkActionDialog = ({
  show,
  actionType = '',
  orderCount = 0,
  scheduleDate = '',
  onDateChange,
  onConfirm,
  onCancel
}) => {
  if (!show) return null;
  return (
    <div role="dialog" aria-modal="true" data-testid="schedule-bulk-action-dialog" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 10, padding: 30, minWidth: 320, maxWidth: 500 }}>
        <h3 data-testid="schedule-bulk-action-header">Schedule Bulk Action</h3>
        <p>Action: <strong>{actionType}</strong></p>
        <p>Affected Orders: {orderCount}</p>
        <label htmlFor="schedule-date">Schedule for:</label>
        <input
          id="schedule-date"
          type="datetime-local"
          value={scheduleDate || ''}
          onChange={onDateChange}
          style={{ margin: '10px 0', padding: '6px', borderRadius: 4, border: '1px solid #ccc' }}
          data-testid="schedule-date-input"
        />
        <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
          <button onClick={onConfirm} data-testid="confirm-schedule-bulk-action" style={{ background: '#007bff', color: '#fff', padding: '6px 16px', borderRadius: 6 }}>Confirm</button>
          <button onClick={onCancel} data-testid="cancel-schedule-bulk-action" style={{ background: '#eee', color: '#333', padding: '6px 16px', borderRadius: 6 }}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default ScheduleBulkActionDialog;
