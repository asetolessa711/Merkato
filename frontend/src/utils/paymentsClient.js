import apiClient from './apiClient';

export async function fetchPaymentMethods() {
  try {
  const res = await apiClient.get('/payments/methods');
    return Array.isArray(res.data?.methods) ? res.data.methods : [];
  } catch (_) {
    return [];
  }
}

