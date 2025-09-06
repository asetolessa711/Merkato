import axios from 'axios';

export async function fetchPaymentMethods() {
  try {
    const res = await axios.get('/api/payments/methods');
    return Array.isArray(res.data?.methods) ? res.data.methods : [];
  } catch (_) {
    return [];
  }
}

