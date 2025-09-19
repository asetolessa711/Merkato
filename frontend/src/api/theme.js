import axios from 'axios';

export async function fetchActiveTheme() {
  const res = await axios.get('/api/theme');
  return res.data;
}

export async function fetchThemes() {
  const res = await axios.get('/api/themes');
  return Array.isArray(res.data?.themes) ? res.data.themes : [];
}

export async function saveAdminTheme(payload, headers = {}) {
  // payload: { themes?, activeKey?, personalizationEnabled?, schedule? }
  const res = await axios.put('/api/admin/theme', payload, { headers });
  return res.data;
}
