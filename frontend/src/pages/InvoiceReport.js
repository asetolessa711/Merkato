import React, { useEffect, useState } from 'react';
import axios from 'axios';

function InvoiceReport() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/api/invoices/report', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setReport(res.data);
      } catch (err) {
        console.error('Failed to fetch invoice report:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, []);

  const exportToCSV = () => {
    if (!report?.invoices) return;

    const headers = ['Invoice ID', 'Date', 'Customer', 'Total (USD)', 'Payment', 'Status'];
    const rows = report.invoices.map(inv => [
      inv._id,
      new Date(inv.createdAt).toLocaleString(),
      inv.buyer?.name || 'N/A',
      inv.total.toFixed(2),
      inv.paymentMethod,
      inv.status
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'invoice_report.csv';
    link.click();
  };

  if (loading) return <p>Loading...</p>;
  if (!report) return <p>No report available.</p>;

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-2">📊 Invoice Report</h2>
      <p>Total Invoices: <strong>{report.totalInvoices}</strong></p>
      <p>Total Revenue (USD): <strong>${report.totalRevenue}</strong></p>

      <button
        onClick={exportToCSV}
        className="bg-green-600 text-white px-4 py-2 rounded my-4"
      >
        ⬇️ Export CSV
      </button>

      <table className="min-w-full table-auto border border-collapse border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 border">Invoice ID</th>
            <th className="p-2 border">Date</th>
            <th className="p-2 border">Customer</th>
            <th className="p-2 border">Total</th>
            <th className="p-2 border">Payment</th>
            <th className="p-2 border">Status</th>
          </tr>
        </thead>
        <tbody>
          {report.invoices.map(inv => (
            <tr key={inv._id}>
              <td className="p-2 border">{inv._id}</td>
              <td className="p-2 border">{new Date(inv.createdAt).toLocaleString()}</td>
              <td className="p-2 border">{inv.buyer?.name || 'N/A'}</td>
              <td className="p-2 border">${inv.total.toFixed(2)}</td>
              <td className="p-2 border">{inv.paymentMethod}</td>
              <td className="p-2 border">{inv.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default InvoiceReport;
