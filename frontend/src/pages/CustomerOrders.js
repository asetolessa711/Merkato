import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import Invoice from '../components/Invoice'; // adjust if needed

function CustomerOrders() {
  const [orders, setOrders] = useState([]);
  const [msg, setMsg] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const navigate = useNavigate();
  const printRefs = useRef({});

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setMsg('Please log in to view your orders.');
      setTimeout(() => navigate('/login'), 1500);
      return;
    }

    const fetchOrders = async () => {
      try {
        const res = await axios.get('/api/orders/my', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setOrders(res.data);
      } catch (err) {
        setMsg('Failed to fetch orders.');
      }
    };
    fetchOrders();
  }, [navigate]);

  const handlePrint = (orderId) => {
    const content = printRefs.current[orderId];
    if (content) {
      const printWindow = window.open('', '', 'width=800,height=600');
      printWindow.document.write('<html><head><title>Invoice</title>');
      printWindow.document.write('<style>');
      printWindow.document.write('body { font-family: sans-serif; padding: 20px; }');
      printWindow.document.write('.header { font-size: 1.5rem; font-weight: bold; margin-bottom: 20px; color: #00B894; }');
      printWindow.document.write('.order-details { margin-bottom: 15px; }');
      printWindow.document.write('.product-line { margin-bottom: 10px; }');
      printWindow.document.write('</style>');
      printWindow.document.write('</head><body>');
      printWindow.document.write(content.innerHTML);
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  };

  const handleDownload = (orderId) => {
    const content = printRefs.current[orderId];
    if (!content) return;
    import('html2pdf.js').then((html2pdf) => {
      html2pdf.default()
        .from(content)
        .set({
          margin: 0.5,
          filename: `invoice_${orderId}.pdf`,
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        })
        .save();
    });
  };

  const handleEmail = async (orderId) => {
    setSendingEmail(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`/api/orders/${orderId}/email-invoice`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('✅ Invoice sent to your email.');
    } catch (error) {
      alert('❌ Failed to send invoice.');
    } finally {
      setSendingEmail(false);
      setShowModal(null);
    }
  };

  return (
    <div style={{ padding: '30px 20px', maxWidth: 1000, margin: '0 auto', fontFamily: 'Poppins, sans-serif' }}>
      <h2 style={{ fontSize: '2rem', marginBottom: 20 }}>My Orders</h2>
      {msg && <p>{msg}</p>}

      {orders.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <label><strong>Filter by Status: </strong></label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      )}

      {orders.length === 0 && !msg ? (
        <p>You haven’t placed any orders yet.</p>
      ) : (
        orders
          .filter(order => !statusFilter || (order.status || 'pending').toLowerCase() === statusFilter)
          .map((order) => (
            <div
              key={order._id}
              style={{
                background: '#fff',
                padding: 20,
                borderRadius: 10,
                marginBottom: 20,
                boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
              }}
            >
              <div ref={el => (printRefs.current[order._id] = el)}>
                <Invoice order={order} />
              </div>

              <button
                onClick={() => setShowModal(order._id)}
                style={{
                  marginTop: 15,
                  backgroundColor: '#00b894',
                  color: 'white',
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer'
                }}
              >
                🧾 Get Invoice
              </button>
            </div>
          ))
      )}

      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#fff',
            padding: 30,
            borderRadius: 10,
            width: '90%',
            maxWidth: 400,
            boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ marginBottom: 20 }}>Choose Invoice Option</h3>

            <button onClick={() => { handlePrint(showModal); setShowModal(null); }}>
              🖨️ Print / Browser Download
            </button>
            <br /><br />

            <button onClick={() => { handleDownload(showModal); setShowModal(null); }}>
              📥 Download as PDF
            </button>
            <br /><br />

            <button
              onClick={() => { handleEmail(showModal); }}
              disabled={sendingEmail}
            >
              {sendingEmail ? 'Sending...' : '📩 Email to Me'}
            </button>
            <br /><br />

            <button onClick={() => setShowModal(null)} style={{ color: '#888', fontSize: '0.9rem' }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomerOrders;
