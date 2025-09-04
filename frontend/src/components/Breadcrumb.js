import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import PropTypes from 'prop-types';

class BreadcrumbErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <div role="alert" style={{ padding: '8px', color: '#666' }}>Navigation error occurred</div>;
    }
    return this.props.children;
  }
}

const Breadcrumb = ({ customRoutes = {} }) => {
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const pathnames = location.pathname.split('/').filter((x) => x);

  // Common route name mappings
  const routeNames = {
    'account': 'My Account',
    'orders': 'Orders',
    'favorites': 'Wishlist',
    'cart': 'Shopping Cart',
    'checkout': 'Checkout',
    'profile': 'Profile',
    'settings': 'Settings',
    'inbox': 'Messages',
    'vendor': 'Vendor Dashboard',
    ...customRoutes
  };

  useEffect(() => {
    setIsLoading(false);
    return () => setIsLoading(true);
  }, [location.pathname]);

  if (isLoading) {
    return (
      <nav aria-label="Loading navigation" style={{ padding: '12px 16px' }}>
        <span role="status">Loading navigation...</span>
      </nav>
    );
  }

  return (
    <BreadcrumbErrorBoundary>
      <nav 
        aria-label="breadcrumb" 
        style={{ 
          marginBottom: '16px',
          backgroundColor: 'white',
          padding: '12px 16px',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}
      >
        <ol style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          listStyle: 'none', 
          padding: 0, 
          margin: 0,
          fontSize: '0.9rem', 
          color: '#555',
          gap: '8px'
        }}>
          <li>
            <Link 
              to="/" 
              style={linkStyle}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#f0f7ff'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              🏠 Home
            </Link>
          </li>
          {pathnames.map((segment, i) => {
            const fullPath = `/${pathnames.slice(0, i + 1).join('/')}`;
            const isLast = i === pathnames.length - 1;

            return (
              <li key={fullPath} style={{ display: 'flex', alignItems: 'center' }}>
                <span 
                  style={{ margin: '0 8px', color: '#ccc' }}
                  aria-hidden="true"
                >
                  /
                </span>
                {isLast ? (
                  <span 
                    style={{ 
                      color: '#0984e3',
                      fontWeight: '600',
                      padding: '4px 8px',
                      backgroundColor: '#f0f7ff',
                      borderRadius: '4px'
                    }}
                    aria-current="page"
                  >
                    {routeNames[segment] || decodeSegment(segment)}
                  </span>
                ) : (
                  <Link 
                    to={fullPath} 
                    style={linkStyle}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f0f7ff'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                  >
                    {routeNames[segment] || decodeSegment(segment)}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </BreadcrumbErrorBoundary>
  );
};

const linkStyle = {
  textDecoration: 'none',
  color: '#0984e3',
  padding: '4px 8px',
  borderRadius: '4px',
  transition: 'background-color 0.2s ease'
};

const decodeSegment = (seg) => {
  return seg
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
};

Breadcrumb.propTypes = {
  customRoutes: PropTypes.objectOf(PropTypes.string)
};

export default Breadcrumb;