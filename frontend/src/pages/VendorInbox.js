// src/pages/VendorInbox.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import styles from '../layouts/VendorLayout.module.css';
import { useMessage } from '../context/MessageContext';

function VendorInbox() {
  const [messages, setMessages] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [reply, setReply] = useState('');
  const [search, setSearch] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };
  const { showMessage } = useMessage();

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await axios.get('/api/messages/vendor', { headers });
        setMessages(res.data);
      } catch (err) {
        showMessage('Failed to load messages.', 'error');
      }
    };
    fetchMessages();
  }, [showMessage]);

  const filteredThreads = messages.filter(msg => {
    const matchesSearch = msg.customerName.toLowerCase().includes(search.toLowerCase());
    const matchesUnread = !unreadOnly || !msg.read;
    return matchesSearch && matchesUnread;
  });

  const handleReply = async () => {
    if (!reply.trim() || !selectedThread) return;
    try {
      await axios.post(`/api/messages/${selectedThread._id}/reply`, { message: reply }, { headers });
      setReply('');
      showMessage('Reply sent', 'success');
    } catch (err) {
      showMessage('Reply failed', 'error');
    }
  };

  return (
    <div className={styles.contentArea}>
      <h2 style={{ marginBottom: '20px' }}>📬 Vendor Inbox</h2>

      <div style={{ marginBottom: 20, display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search by customer name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label>
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(e) => setUnreadOnly(e.target.checked)}
          />{' '}
          Show Unread Only
        </label>
      </div>

      <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '300px' }}>
          <h3>📨 Message Threads</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {filteredThreads.map(thread => (
              <li
                key={thread._id}
                onClick={() => setSelectedThread(thread)}
                style={{
                  padding: '10px',
                  marginBottom: '10px',
                  borderRadius: '6px',
                  backgroundColor: selectedThread?._id === thread._id ? '#e0f7fa' : '#f8f8f8',
                  cursor: 'pointer',
                  borderLeft: thread.read ? '4px solid #ccc' : '4px solid #00B894'
                }}
              >
                <strong>{thread.customerName}</strong><br />
                <span style={{ fontSize: '0.85rem', color: '#555' }}>{thread.lastMessagePreview}</span>
              </li>
            ))}
          </ul>
        </div>

        {selectedThread && (
          <div style={{ flex: 2, minWidth: '300px' }}>
            <h3>🧾 Conversation with {selectedThread.customerName}</h3>
            <div style={{
              maxHeight: '300px',
              overflowY: 'auto',
              padding: '10px',
              border: '1px solid #ccc',
              borderRadius: '6px',
              marginBottom: '15px',
              background: '#fff'
            }}>
              {selectedThread.messages.map((msg, i) => (
                <div key={i} style={{ marginBottom: '10px' }}>
                  <div style={{
                    backgroundColor: msg.fromVendor ? '#eafaf1' : '#dfe6e9',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    maxWidth: '80%',
                    alignSelf: msg.fromVendor ? 'flex-end' : 'flex-start'
                  }}>
                    <strong>{msg.fromVendor ? 'You' : selectedThread.customerName}</strong>
                    <p style={{ margin: 0 }}>{msg.text}</p>
                    <small style={{ color: '#888' }}>{new Date(msg.createdAt).toLocaleString()}</small>
                  </div>
                </div>
              ))}
            </div>

            <textarea
              placeholder="Type your reply..."
              rows={3}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
            />
            <button onClick={handleReply} className="btn-primary" style={{ marginTop: '10px' }}>
              Send Reply
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default VendorInbox;