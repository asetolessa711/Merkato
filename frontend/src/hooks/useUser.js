// hooks/useUser.js
import { useEffect, useState } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export default function useUser() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    axios.get(`${API_BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        const data = res.data.user || res.data;
        if (!data || !data.roles || !data.email) {
          console.warn('[useUser] Incomplete user data:', data);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        } else {
          localStorage.setItem('user', JSON.stringify(data));
          setUser(data);
        }
      })
      .catch(err => {
        console.error('[useUser] Auth check failed:', err.message);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  // Logout function (alias for clearUser)
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  // Return logout for use in components
  return { user, setUser, logout, loading };
}
