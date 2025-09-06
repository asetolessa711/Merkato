import React from 'react';

const BulkActionStatus = ({ progress, errors }) => {
  if (!progress && (!errors || errors.length === 0)) return null;
  return (
    <>
      {progress && (
        <div style={{ marginBottom: 10, color: '#007bff' }}>{progress}</div>
      )}
      {errors && errors.length > 0 && (
        <div style={{ marginBottom: 10, color: 'red' }}>Failed to update: {errors.join(', ')}</div>
      )}
    </>
  );
};

export default BulkActionStatus;
