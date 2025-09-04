import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';

function AdminSupportInbox() {
  const [tickets, setTickets] = useState([]);
  const [msg, setMsg] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [note, setNote] = useState('');

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };
  const { showMessage } = useContext(require('../context/MessageContext').MessageContext);

  const fetchTickets = async () => {
    try {
      const res = await axios.get('/api/support', { headers });
      setTickets(res.data);
    } catch (err) {
      setMsg('Access denied or something went wrong.');
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleUpdate = async (id) => {
    try {
      await axios.put(`/api/support/${id}`, {
        status: 'resolved',
        adminNote: note
      }, { headers });

      setEditingId(null);
      setNote('');
      fetchTickets();
    } catch (err) {
      showMessage('Failed to update ticket.', 'error');
    }
  };

  const fallback = val => val === null || val === undefined || val === '' ? <span style={{ color: '#aaa' }}>Not provided</span> : val;
  const Card = ({ title, children }) => (
    <div style={{ background: 'white', padding: '16px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      <h3 role="heading" aria-level="3">{title}</h3>
      {children}
    </div>
  );

  return (
    <div style={{ padding: 20 }}>
      <h2 role="heading" aria-level="2">Support Inbox</h2>
      {msg && <p role="status">{msg}</p>}

      {tickets.length === 0 ? (
        <p role="status">No support messages yet.</p>
      ) : (
        tickets.map(ticket => (
          <Card key={ticket._id} title={`From: ${fallback(ticket.user?.name)} (${fallback(ticket.category)})`}>
            <p><strong>Email:</strong> {fallback(ticket.user?.email)}</p>
            <p><strong>Message:</strong> {fallback(ticket.message)}</p>
            <p><strong>Status:</strong> {ticket.status === 'resolved' ? '✅ Resolved' : '🕓 Open'}</p>
            <p style={{ fontSize: '0.85em', color: '#888' }}>
              Submitted: {ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : <span style={{ color: '#aaa' }}>Not provided</span>}
            </p>

            {ticket.status === 'open' && editingId !== ticket._id && (
              <button onClick={() => setEditingId(ticket._id)} aria-label="Resolve and add note">Resolve + Add Note</button>
            )}

            {editingId === ticket._id && (
              <>
                <textarea
                  rows={3}
                  placeholder="Add admin note..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  style={{ width: '100%', marginTop: 10 }}
                  aria-label="Admin note"
                />
                <br />
                <button onClick={() => handleUpdate(ticket._id)} aria-label="Submit resolution">Submit Resolution</button>
                <button onClick={() => { setEditingId(null); setNote(''); }} style={{ marginLeft: 8 }} aria-label="Cancel">Cancel</button>
              </>
            )}

            {ticket.adminNote && (
              <p style={{ background: '#f9f9f9', padding: 10, borderRadius: 6, marginTop: 10 }}>
                <strong>Admin Note:</strong><br />{fallback(ticket.adminNote)}
              </p>
            )}
          </Card>
        ))
      )}
    </div>
  );
}

export default AdminSupportInbox;