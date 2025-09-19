import { useCallback, useState } from 'react';
import apiClient from '../utils/apiClient';

export function useApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const get = useCallback(async (url, config) => {
    setLoading(true); setError(null);
    try {
      const res = await apiClient.get(url, config);
      return res.data;
    } catch (e) {
      setError(e.message || 'Request failed');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const post = useCallback(async (url, body, config) => {
    setLoading(true); setError(null);
    try {
      const res = await apiClient.post(url, body, config);
      return res.data;
    } catch (e) {
      setError(e.message || 'Request failed');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return { get, post, loading, error };
}

export default useApi;
