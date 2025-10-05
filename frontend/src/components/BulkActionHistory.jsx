import React from 'react';

const BulkActionHistory = ({ history = [] }) => {
  if (!history.length) return null;
  return (
    <div style={{ marginBottom: 20, background: '#f9f9f9', borderRadius: 8, padding: 16 }}>
      <strong>📝 Bulk Action History</strong>
      <ul style={{ maxHeight: 180, overflowY: 'auto', marginTop: 8 }}>
        {history.slice(0, 10).map((entry, idx) => (
          <li key={idx} style={{ marginBottom: 6 }}>
            <span style={{ color: '#888' }}>{entry.timestamp}</span> — <strong>{entry.user}</strong> performed <span style={{ color: '#007bff' }}>{entry.action}</span> on <span>{entry.orderIds.length} order(s)</span>
            <details style={{ marginLeft: 10 }}>
              <summary>Order IDs</summary>
              <div style={{ fontSize: '0.95em', color: '#555' }}>{entry.orderIds.join(', ')}</div>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default BulkActionHistory;
