import axios from 'axios';

export async function fetchCategories() {
  const res = await axios.get('/api/categories');
  return Array.isArray(res.data?.menu) ? res.data.menu : [];
}

export async function fetchAdminMegaMenu(headers = {}) {
  const res = await axios.get('/api/admin/mega-menu', { headers });
  return Array.isArray(res.data?.menu) ? res.data.menu : [];
}

export async function saveAdminMegaMenu(menu, headers = {}) {
  const res = await axios.put('/api/admin/mega-menu', { menu }, { headers });
  return res.data;
}
