// Thin API client for vendor-related endpoints
// Keeps endpoints centralized and testable
import { apiClient } from '../utils/apiClient'';

export async function getVendorProducts(params = undefined) {
  if (params && Object.keys(params).length > 0) {
    const res = await apiClient.get('/api/vendor/products', { params });
    return res.data;
  }
  const res = await apiClient.get('/api/vendor/products');
  return res.data;
}

export async function getVendorRevenue(params = undefined) {
  if (params && Object.keys(params).length > 0) {
    const res = await apiClient.get('/api/vendor/revenue', { params });
    return res.data;
  }
  const res = await apiClient.get('/api/vendor/revenue');
  return res.data;
}

export async function getMyVendorProfile() {
  const res = await apiClient.get('/api/vendor/profile/me');
  return res.data;
}

export async function getVendorProfileById(vendorId) {
  const res = await apiClient.get(`/api/vendor/profile/${vendorId}`);
  return res.data;
}

export async function getVendorProductsById(vendorId, params = undefined) {
  if (params && Object.keys(params).length > 0) {
    const res = await apiClient.get(`/api/products/vendor/${vendorId}`, { params });
    return res.data;
  }
  const res = await apiClient.get(`/api/products/vendor/${vendorId}`);
  return res.data;
}

export async function getVendorCustomization(vendorId) {
  const res = await apiClient.get(`/api/vendor/customization/${vendorId}`);
  return res.data;
}

export async function getVendorProfileBySlug(slug) {
  const res = await apiClient.get(`/api/vendor/slug/${encodeURIComponent(slug)}`);
  return res.data;
}

export async function getVendorProductsBySlug(slug, params = undefined) {
  if (params && Object.keys(params).length > 0) {
    const res = await apiClient.get(`/api/products/vendor/slug/${encodeURIComponent(slug)}`, { params });
    return res.data;
  }
  const res = await apiClient.get(`/api/products/vendor/slug/${encodeURIComponent(slug)}`);
  return res.data;
}

export default {
  getVendorProducts,
  getVendorRevenue,
  getMyVendorProfile,
  getVendorProfileById,
  getVendorProductsById,
  getVendorCustomization,
  getVendorProfileBySlug,
  getVendorProductsBySlug,
};
