import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import useUser from '../hooks/useUser';
import { Menu, X, Home, BarChart3, Users, ShoppingBag } from 'lucide-react';

const SmartSidebar = () => {
  const { user } = useUser();
  const [isOpen, setIsOpen] = useState(true);
  if (!user) return null;

  const role = user.roles?.[0] || 'guest';

  const iconMap = {
    Dashboard: <Home size={18} />,
    Orders: <ShoppingBag size={18} />,
    Analytics: <BarChart3 size={18} />,
    Vendors: <Users size={18} />,
  };

  const menu = {
    admin: [
      { to: '/admin/dashboard', label: 'Dashboard' },
      { to: '/admin/orders', label: 'Orders' },
      { to: '/admin/analytics', label: 'Analytics' },
    ],
    vendor: [
      { to: '/vendor', label: 'Dashboard' },
      { to: '/vendor/orders', label: 'Orders' },
      { to: '/vendor/analytics', label: 'Analytics' },
    ],
    customer: [
      { to: '/account/dashboard', label: 'My Account' },
      { to: '/account/orders', label: 'My Orders' },
    ],
  };

  return (
    <>
      {/* Toggle Button for Small Screens */}
      <button
        className="sm:hidden p-2 m-2 border rounded-md text-blue-600"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle Sidebar"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`bg-gray-100 sm:min-h-screen p-4 rounded-xl sm:relative sm:translate-x-0 sm:block z-50 ${
          isOpen ? 'block' : 'hidden'
        }`}
      >
        <h2 className="text-lg font-semibold mb-4 capitalize">{role} Menu</h2>
        <ul className="space-y-2">
          {(menu[role] || []).map(({ to, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `flex items-center space-x-2 px-4 py-2 rounded font-medium ${
                    isActive
                      ? 'bg-blue-200 text-blue-800'
                      : 'hover:bg-blue-100 text-blue-700'
                  }`
                }
                data-cy={`nav-${label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {iconMap[label] || <Home size={16} />}
                <span>{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </aside>
    </>
  );
};

export default SmartSidebar;
