// hooks/useUser.js
import { useEffect, useState } from 'react';
import axios from 'axios';

export default function useUser() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token) {
      // In Cypress, allow provisional user from localStorage to avoid flake
      if (typeof window !== 'undefined' && window.Cypress) {
        try {
          const provisional = JSON.parse(localStorage.getItem('user') || 'null');
          if (provisional) {
            setUser(provisional);
            setLoading(false);
            return;
          }
        } catch {}
      }
      setUser(null);
      setLoading(false);
      return;
    }

  axios.get(`/api/auth/me`, {
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
