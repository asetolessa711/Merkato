import { useLocation, useNavigate } from 'react-router-dom';
import { useCallback, useMemo } from 'react';

// Supported params: page, sort, price_min, price_max, in_stock, brand, rating, category, q
export default function useBrowseQuery() {
  const location = useLocation();
  const navigate = useNavigate();

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const get = useCallback((key, defVal = '') => {
    const v = params.get(key);
    return v === null ? defVal : v;
  }, [params]);

  const getBool = useCallback((key, defVal = false) => {
    const v = params.get(key);
    if (v === null) return defVal;
    return v === '1' || v === 'true' || v === 'yes';
  }, [params]);

  const setMany = useCallback((patch = {}, replace = false) => {
    const next = new URLSearchParams(location.search);
    Object.entries(patch).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') next.delete(k);
      else next.set(k, String(v));
    });
    navigate({ pathname: location.pathname, search: `?${next.toString()}` }, { replace });
  }, [location.pathname, location.search, navigate]);

  const api = useMemo(() => {
    const brandCSV = get('brand', '');
    const brandList = brandCSV ? brandCSV.split(',').map((s) => s.trim()).filter(Boolean) : [];
    return {
      page: Number(get('page', '1')) || 1,
      sort: get('sort', 'best'),
      price_min: get('price_min', ''),
      price_max: get('price_max', ''),
      in_stock: getBool('in_stock', false),
      brand: brandCSV,
      brandList,
      rating: get('rating', ''),
      category: get('category', ''),
      q: get('q', ''),
      setMany,
    };
  }, [get, getBool, setMany]);

  return api;
}
