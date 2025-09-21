import { useCallback, useRef, useEffect, useState } from 'react';
import apiClient from '../utils/apiClient';

export function useApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const get = useCallback(async (url, config) => {
    if (isMounted.current) setLoading(true);
    if (isMounted.current) setError(null);
    try {
      const res = await apiClient.get(url, config);
      return res.data;
    } catch (e) {
      if (isMounted.current) setError(e.message || 'Request failed');
      throw e;
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, []);

  const post = useCallback(async (url, body, config) => {
    if (isMounted.current) setLoading(true);
    if (isMounted.current) setError(null);
    try {
      const res = await apiClient.post(url, body, config);
      return res.data;
    } catch (e) {
      if (isMounted.current) setError(e.message || 'Request failed');
      throw e;
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, []);

  return { get, post, loading, error };
}

export default useApi;
