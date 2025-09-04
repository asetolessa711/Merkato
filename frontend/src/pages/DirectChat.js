// DirectChat.js – Final Integrated Version (Customer ↔ Vendor Chat)
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

const DirectChat = ({ selectedUser }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatUser, setChatUser] = useState(selectedUser || null);
  const [loading, setLoading] = useState(false);
  const chatRef = useRef();

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));
  const headers = { Authorization: `Bearer ${token}` };

  const { targetUserId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Fetch chat user if not passed as prop
  useEffect(() => {
    if (!chatUser && targetUserId) {
      axios.get(`/api/users/${targetUserId}`, { headers })
        .then(res => setChatUser(res.data))
        .catch(() => console.warn('Could not load chat user'));
    }
  }, [targetUserId]);

  useEffect(() => {
    if (chatUser?._id || targetUserId) {
      fetchMessages();
    }
  }, [chatUser, targetUserId]);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/messages/${chatUser?._id || targetUserId}`, { headers });
      setMessages(res.data);
    } catch {
      console.error('Failed to load messages');
    }
    setLoading(false);
  };

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    try {
      await axios.post('/api/messages', {
        receiver: chatUser?._id || targetUserId,
        message: newMessage
      }, { headers });
      setNewMessage('');
      fetchMessages();
    } catch (err) {
      console.error('Failed to send message');
    }
  };

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div style={{ padding: 20, fontFamily: 'Poppins, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h2 style={{ color: '#00B894' }}>💬 Chat with {chatUser?.name || 'User'}</h2>
        <button onClick={() => navigate(-1)} style={{
          background: 'transparent',
          border: '1px solid #ccc',
          padding: '6px 12px',
          borderRadius: '6px',
          cursor: 'pointer'
        }}>⬅ Back</button>
      </div>

      {loading ? <p>Loading chat...</p> : (
        <div ref={chatRef} style={{
          maxHeight: '400px',
          overflowY: 'auto',
          marginBottom: '20px',
          background: '#f9f9f9',
          padding: '10px',
          borderRadius: '6px',
          border: '1px solid #ccc'
        }}>
          {messages.map((msg, index) => (
            <div key={index} style={{
              marginBottom: '10px',
              textAlign: msg.sender === user._id ? 'right' : 'left'
            }}>
              <div style={{
                display: 'inline-block',
                backgroundColor: msg.sender === user._id ? '#00B894' : '#dfe6e9',
                color: msg.sender === user._id ? 'white' : '#333',
                padding: '8px 12px',
                borderRadius: '20px'
              }}>
                {msg.message}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#999', marginTop: '4px' }}>
                {new Date(msg.timestamp || msg.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
        />
        <button onClick={handleSend} style={{
          backgroundColor: '#0984e3',
          color: 'white',
          border: 'none',
          padding: '10px 16px',
          borderRadius: '6px'
        }}>
          Send
        </button>
      </div>
    </div>
  );
};

export default DirectChat;
