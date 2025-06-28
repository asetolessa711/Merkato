import React, { useEffect, useState } from 'react';
import axios from 'axios';

function AdminSupportInbox() {
  const [tickets, setTickets] = useState([]);
  const [msg, setMsg] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [note, setNote] = useState('');

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

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
      alert('Failed to update ticket.');
    }
  };

  const Card = ({ title, children }) => (
    <div style={{ background: 'white', padding: '16px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      <h3>{title}</h3>
      {children}
    </div>
  );

  return (
    <div style={{ padding: 20 }}>
      <h2>Support Inbox</h2>
      {msg && <p>{msg}</p>}

      {tickets.length === 0 ? (
        <p>No support messages yet.</p>
      ) : (
        tickets.map(ticket => (
          <Card key={ticket._id} title={`From: ${ticket.user?.name || 'Unknown'} (${ticket.category})`}>
            <p><strong>Email:</strong> {ticket.user?.email}</p>
            <p><strong>Message:</strong> {ticket.message}</p>
            <p><strong>Status:</strong> {ticket.status === 'resolved' ? '✅ Resolved' : '🕓 Open'}</p>
            <p style={{ fontSize: '0.85em', color: '#888' }}>
              Submitted: {new Date(ticket.createdAt).toLocaleString()}
            </p>

            {ticket.status === 'open' && editingId !== ticket._id && (
              <button onClick={() => setEditingId(ticket._id)}>Resolve + Add Note</button>
            )}

            {editingId === ticket._id && (
              <>
                <textarea
                  rows={3}
                  placeholder="Add admin note..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  style={{ width: '100%', marginTop: 10 }}
                />
                <br />
                <button onClick={() => handleUpdate(ticket._id)}>Submit Resolution</button>
                <button onClick={() => { setEditingId(null); setNote(''); }} style={{ marginLeft: 8 }}>Cancel</button>
              </>
            )}

            {ticket.adminNote && (
              <p style={{ background: '#f9f9f9', padding: 10, borderRadius: 6, marginTop: 10 }}>
                <strong>Admin Note:</strong><br />{ticket.adminNote}
              </p>
            )}
          </Card>
        ))
      )}
    </div>
  );
}

export default AdminSupportInbox;