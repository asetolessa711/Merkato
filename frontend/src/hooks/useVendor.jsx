import { useEffect, useState } from 'react';
import {
  getVendorProducts,
  getVendorRevenue,
  getMyVendorProfile,
  getVendorProfileById,
  getVendorProductsById,
  getVendorCustomization,
  getVendorProfileBySlug,
  getVendorProductsBySlug,
} from '../api/vendor'';

export function useVendorDashboardData({ useMock = false } = {}) {
  const [state, setState] = useState({ loading: true, error: null, products: [], analytics: null, profile: null });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        if (useMock) {
          const mockProducts = [
            { _id: 'p1', name: 'Demo Product 1', price: 100, image: 'https://placehold.co/100x100?text=Demo+1', stock: 10 },
            { _id: 'p2', name: 'Demo Product 2', price: 50, image: 'https://placehold.co/100x100?text=Demo+2', stock: 5 },
          ];
          const mockAnalytics = { totalRevenue: 1200, successRate: '97%', bestProduct: 'Demo Product 1' };
          const mockProfile = { _id: 'v-demo-1', id: 'v-demo-1', name: 'Demo Vendor', email: 'vendor@demo.com' };
          if (!cancelled) setState({ loading: false, error: null, products: mockProducts, analytics: mockAnalytics, profile: mockProfile });
          return;
        }
        const [products, analytics, profile] = await Promise.all([
          getVendorProducts(),
          getVendorRevenue(),
          getMyVendorProfile(),
        ]);
        if (!cancelled) setState({ loading: false, error: null, products, analytics, profile });
      } catch (err) {
        if (!cancelled) setState({ loading: false, error: err?.message || 'Failed to load dashboard', products: [], analytics: null, profile: null });
      }
    }
    load();
    return () => { cancelled = true; };
  }, [useMock]);

  return state;
}

export function useVendorStorefront(vendorIdOrSlug, opts = {}) {
  const [state, setState] = useState({ loading: true, error: null, products: [], vendor: null, customization: null });

  useEffect(() => {
    if (!vendorIdOrSlug) {
      setState({ loading: false, error: 'Missing vendor id/slug', products: [], vendor: null, customization: null });
      return;
    }
    let cancelled = false;
    async function load() {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const isSlug = typeof vendorIdOrSlug === 'string' && !/^[0-9a-fA-F]{24}$/.test(vendorIdOrSlug);
        let vendor;
        let products;
        let vendorId;
        if (isSlug) {
          vendor = await getVendorProfileBySlug(vendorIdOrSlug);
          vendorId = vendor?._id;
          products = await getVendorProductsBySlug(vendorIdOrSlug, opts?.query || {});
        } else {
          vendorId = vendorIdOrSlug;
          vendor = await getVendorProfileById(vendorId);
          products = await getVendorProductsById(vendorId, opts?.query || {});
        }
        const customization = vendorId ? await getVendorCustomization(vendorId) : null;
        if (!cancelled) setState({ loading: false, error: null, products, vendor, customization });
      } catch (err) {
        if (!cancelled) setState({ loading: false, error: err?.message || 'Failed to load vendor', products: [], vendor: null, customization: null });
      }
    }
    load();
    return () => { cancelled = true; };
  }, [vendorIdOrSlug, opts?.query]);

  return state;
}

export default {
  useVendorDashboardData,
  useVendorStorefront,
};
