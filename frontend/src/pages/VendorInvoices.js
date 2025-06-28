import React, { useEffect, useState } from 'react';
import axios from 'axios';
import MerkatoFooter from '../components/MerkatoFooter';

const VendorInvoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const res = await axios.get('/api/invoices/report', { headers });
        setInvoices(res.data.invoices || []);
        setTotalRevenue(res.data.totalRevenue || 0);
        setLoading(false);
      } catch (err) {
        setMsg('Error loading invoices.');
        setLoading(false);
      }
    };
    fetchInvoices();
  }, []);

  const exportCSV = () => {
    const csvRows = [['Invoice ID', 'Customer', 'Total', 'Commission', 'Net Earnings', 'Status', 'Created At']];
    invoices.forEach(inv => {
      csvRows.push([
        inv._id,
        inv.customer?.name || 'Unknown',
        `$${inv.total?.toFixed(2)}`,
        `$${inv.commissionAmount?.toFixed(2)}`,
        `$${inv.netEarnings?.toFixed(2)}`,
        inv.status || 'Unpaid',
        new Date(inv.createdAt).toLocaleDateString()
      ]);
    });
    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vendor_invoices.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = (invoiceId) => {
    window.open(`/api/invoices/${invoiceId}/download`, '_blank');
  };

  const statusBadge = (status) => {
    const style = {
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '0.8rem',
      fontWeight: 'bold',
      color: 'white',
      backgroundColor:
        status === 'paid' ? '#2ecc71' :
        status === 'overdue' ? '#e74c3c' :
        '#f39c12'
    };
    return <span style={style}>{status?.toUpperCase() || 'UNPAID'}</span>;
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesStatus = !filterStatus || inv.status === filterStatus;
    const matchesSearch = !search || inv._id.includes(search);
    return matchesStatus && matchesSearch;
  });

  return (
    <div style={{ 
      padding: '20px',
      maxWidth: '1000px', 
      margin: '0 auto', 
      fontFamily: 'Poppins, sans-serif',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{ flex: 1 }}>
        <h2 style={{ color: '#00B894', fontWeight: 'bold' }}>🧾 My Invoices</h2>

        {msg && <p style={{ color: '#e74c3c' }}>{msg}</p>}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', margin: '20px 0' }}>
          <input
            type="text"
            placeholder="🔍 Search by Invoice ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            <option value="">All Statuses</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
            <option value="overdue">Overdue</option>
          </select>
          <button
            onClick={exportCSV}
            style={{
              backgroundColor: '#00B894',
              color: 'white',
              padding: '8px 12px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            ⬇️ Export CSV
          </button>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f0f0f0' }}>
                  <th style={cellStyle}>Invoice ID</th>
                  <th style={cellStyle}>Order ID</th>
                  <th style={cellStyle}>Customer</th>
                  <th style={cellStyle}>Total</th>
                  <th style={cellStyle}>Commission</th>
                  <th style={cellStyle}>Net</th>
                  <th style={cellStyle}>Status</th>
                  <th style={cellStyle}>Date</th>
                  <th style={cellStyle}>PDF</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map(inv => (
                  <tr key={inv._id}>
                    <td style={cellStyle}>{inv._id}</td>
                    <td style={cellStyle}>{inv.order || '—'}</td>
                    <td style={cellStyle}>{inv.customer?.name || 'Unknown'}</td>
                    <td style={cellStyle}>${inv.total?.toFixed(2)}</td>
                    <td style={cellStyle}>${inv.commissionAmount?.toFixed(2)}</td>
                    <td style={cellStyle}>${inv.netEarnings?.toFixed(2)}</td>
                    <td style={cellStyle}>{statusBadge(inv.status)}</td>
                    <td style={cellStyle}>{new Date(inv.createdAt).toLocaleDateString()}</td>
                    <td style={cellStyle}>
                      <button onClick={() => downloadPDF(inv._id)} style={{ fontSize: '0.8rem', background: '#0984e3', color: 'white', padding: '6px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>📥 PDF</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <MerkatoFooter />
    </div>
  );
};

const cellStyle = {
  padding: '10px',
  border: '1px solid #ccc',
  textAlign: 'left'
};

export default VendorInvoices;
