import React from 'react';

const BulkActionPermissionInfo = ({ show }) => {
  if (!show) return null;
  return (
    <div style={{ marginBottom: 16, background: '#fffbe0', padding: 10, borderRadius: 6, color: '#b8860b' }} data-testid="bulk-action-unauthorized-info">
      <span>Bulk actions are restricted to admin or superadmin roles.</span>
    </div>
  );
};

export default BulkActionPermissionInfo;
