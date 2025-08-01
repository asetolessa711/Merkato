import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const VendorManagement = () => {
  const [vendors, setVendors] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sortOption, setSortOption] = useState('name-asc');
  const [msg, setMsg] = useState('');
  const token = localStorage.getItem('token');

  const fetchVendors = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get('/api/admin/users', { headers });
      const vendorList = res.data.filter(u => u.role === 'vendor');
      setVendors(vendorList);
    } catch (err) {
      setMsg('Failed to load vendors.');
    }
  };

  const toggleStatus = async (id, isActive) => {
    try {
      let banReason = null;
      if (isActive) {
        banReason = prompt('Optional: Enter reason for suspending this vendor:');
      }

      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`/api/users/${id}/status`, { isActive: !isActive, banReason }, { headers });

      toast.success(`Vendor ${isActive ? 'suspended' : 'reactivated'} successfully`);
      fetchVendors();
    } catch (err) {
      console.error('Status update failed');
      toast.error('Failed to update vendor status');
    }
  };

  const exportCSV = () => {
    const headers = ['Name', 'Email', 'Country', 'Status', 'Products', 'Subscription Plan'];
    const rows = vendors.map(v => [
      v.name,
      v.email,
      v.country,
      v.isActive ? 'Active' : 'Suspended',
      v.productCount || 0,
      v.subscriptionPlan || 'Basic', // Assuming a subscription plan is part of the vendor model
    ]);

    let csvContent = 'data:text/csv;charset=utf-8,' + headers.join(',') + '\n' + rows.map(e => e.join(',')).join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'vendors.csv');
    document.body.appendChild(link);
    link.click();
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Vendor Management</h2>
      {msg && <p className="text-red-500">{msg}</p>}

      <div className="flex flex-wrap gap-4 mb-4 items-center">
        <input
          type="text"
          placeholder="Search by name, email, or country..."
          className="p-2 border border-gray-300 rounded w-full max-w-md"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="p-2 border border-gray-300 rounded"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>

        <select
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value)}
          className="p-2 border border-gray-300 rounded"
        >
          <option value="name-asc">Name A–Z</option>
          <option value="name-desc">Name Z–A</option>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
        </select>

        <button
          onClick={exportCSV}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Export CSV
        </button>
      </div>

      <ToastContainer position="bottom-right" autoClose={3000} />

      <table className="w-full text-left border border-gray-200">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2">Name</th>
            <th className="p-2">Email</th>
            <th className="p-2">Country</th>
            <th className="p-2">Joined</th>
            <th className="p-2">Products</th>
            <th className="p-2">Status</th>
            <th className="p-2">Subscription Plan</th>
            <th className="p-2">Ban Reason</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {vendors
            .filter(v =>
              (statusFilter === 'all' ||
                (statusFilter === 'active' && v.isActive) ||
                (statusFilter === 'suspended' && !v.isActive))
            )
            .filter(v =>
              v.name?.toLowerCase().includes(search.toLowerCase()) ||
              v.email?.toLowerCase().includes(search.toLowerCase()) ||
              v.country?.toLowerCase().includes(search.toLowerCase())
            )
            .sort((a, b) => {
              if (sortOption === 'name-asc') return a.name.localeCompare(b.name);
              if (sortOption === 'name-desc') return b.name.localeCompare(a.name);
              if (sortOption === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
              if (sortOption === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
              return 0;
            })
            .map((v) => (
              <tr key={v._id} className="border-t">
                <td className="p-2">{v.name}</td>
                <td className="p-2">{v.email}</td>
                <td className="p-2">{v.country}</td>
                <td className="p-2">{new Date(v.createdAt).toLocaleDateString()}</td>
                <td className="p-2">{v.productCount || 0}</td>
                <td className="p-2">{v.isActive ? 'Active' : 'Suspended'}</td>
                <td className="p-2">{v.subscriptionPlan || 'Basic'}</td>
                <td className="p-2">{!v.isActive ? (v.banReason || '—') : '—'}</td>
                <td className="p-2">
                  <button
                    className="px-2 py-1 bg-blue-500 text-white rounded"
                    onClick={() => toggleStatus(v._id, v.isActive)}
                  >
                    {v.isActive ? 'Suspend' : 'Reactivate'}
                  </button>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
};

export default VendorManagement;
