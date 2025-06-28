import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { ShoppingCart, Globe, ChevronDown } from 'react-feather';
import styles from './Navbar.module.css';
import BackButton from '../components/BackButton';

const LOGO_COLORS = ['#00B894', '#3498DB', '#E67E22', '#9B59B6', '#E74C3C', '#3498DB', '#00B894'];

const LANGUAGE_OPTIONS = [
  // Global
  { value: 'en', label: 'English', region: 'Global' },
  
  // Phase 1: Ethiopia
  { value: 'am', label: 'አማርኛ (Amharic)', region: 'Ethiopia' },
  { value: 'or', label: 'Afaan Oromoo', region: 'Ethiopia' },
  { value: 'ti', label: 'ትግርኛ (Tigrinya)', region: 'Ethiopia' },
  { value: 'so', label: 'Soomaali', region: 'Ethiopia' },
  
  // Phase 2: Italy
  { value: 'it', label: 'Italiano', region: 'Italy' },
  { value: 'sw', label: 'Kiswahili', region: 'East Africa' },
  { value: 'ar', label: 'العربية', region: 'MENA' }
];

const Logo = React.memo(() => (
  <NavLink to="/" aria-label="Merkato Home" className={styles.logo}>
    {['M', 'e', 'r', 'k', 'a', 't', 'o'].map((letter, index) => (
      <span key={index} style={{ color: LOGO_COLORS[index] }}>{letter}</span>
    ))}
  </NavLink>
));
Logo.displayName = 'Logo';

const CartIcon = React.memo(({ itemCount = 0 }) => (
  <NavLink to="/cart" className={styles.cartIcon} aria-label={`Shopping cart with ${itemCount} items`}>
    <div className={styles.cartIconWrapper}>
      <ShoppingCart size={20} />
      {itemCount > 0 && (
        <span className={styles.cartBadge}>{itemCount}</span>
      )}
    </div>
  </NavLink>
));
CartIcon.displayName = 'CartIcon';

const LanguageSelector = React.memo(({ currentLang, onChange }) => (
  <div className={styles.langSelector}>
    <Globe size={16} />
    <select 
      value={currentLang}
      onChange={(e) => onChange(e.target.value)}
      className={styles.langSelect}
      aria-label="Select language"
    >
      <option value="en">English (Global)</option>
      
      <optgroup label="Ethiopia">
        {LANGUAGE_OPTIONS
          .filter(lang => lang.region === 'Ethiopia')
          .map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
      </optgroup>
      
      <optgroup label="Italy & East Africa">
        {LANGUAGE_OPTIONS
          .filter(lang => ['Italy', 'East Africa', 'MENA'].includes(lang.region))
          .map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
      </optgroup>
    </select>
  </div>
));
LanguageSelector.displayName = 'LanguageSelector';

const ProfileDropdown = React.memo(({ user, onLogout, isLoggingOut }) => {
  const [showMenu, setShowMenu] = useState(false);

  const handleClickOutside = useCallback((e) => {
    if (!e.target.closest(`.${styles.profileDropdown}`)) {
      setShowMenu(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [handleClickOutside]);

  return (
    <div className={styles.profileDropdown}>
      <button 
        className={styles.profileButton}
        onClick={() => setShowMenu(!showMenu)}
        aria-expanded={showMenu}
        aria-haspopup="true"
      >
        <span>{user.name || 'User'}</span>
        <span className={styles.roleBadge}>{user.role}</span>
        <ChevronDown size={16} />
      </button>
      
      {showMenu && (
        <div className={styles.dropdownMenu} role="menu">
          <div className={styles.userInfo}>
            <strong>{user.name || 'User'}</strong>
            <small>{user.email}</small>
          </div>
          <NavLink to="/profile" className={styles.dropdownItem} role="menuitem">
            My Profile
          </NavLink>
          <NavLink to="/settings" className={styles.dropdownItem} role="menuitem">
            Settings
          </NavLink>
          {user.role === 'vendor' && (
            <NavLink to="/vendor" className={styles.dropdownItem} role="menuitem">
              Vendor Dashboard
            </NavLink>
          )}
          {user.role === 'admin' && (
            <NavLink to="/admin" className={styles.dropdownItem} role="menuitem">
              Admin Dashboard
            </NavLink>
          )}
          <button 
            onClick={onLogout}
            className={`${styles.dropdownItem} ${styles.logoutButton}`}
            disabled={isLoggingOut}
            role="menuitem"
          >
            {isLoggingOut ? 'Logging out...' : 'Logout'}
          </button>
        </div>
      )}
    </div>
  );
});
ProfileDropdown.displayName = 'ProfileDropdown';

const RoleSwitcher = React.memo(({ currentRole, onRoleChange }) => {
  if (process.env.NODE_ENV !== 'development') return null;
  
  return (
    <select 
      value={currentRole}
      onChange={(e) => onRoleChange(e.target.value)}
      className={styles.roleSwitcher}
      aria-label="Switch user role"
    >
      <option value="customer">Customer</option>
      <option value="vendor">Vendor</option>
      <option value="admin">Admin</option>
    </select>
  );
});
RoleSwitcher.displayName = 'RoleSwitcher';

const ProtectedLink = React.memo(({ to, requiredRole, userRoles, children, onClick }) => {
  const hasAccess = userRoles[`is${requiredRole}`];
  
  if (!hasAccess) {
    return (
      <span 
        className={styles.disabledLink}
        title={`Requires ${requiredRole} access`}
      >
        {children}
      </span>
    );
  }

  return (
    <NavLink to={to} className={styles.link} onClick={onClick}>
      {children}
    </NavLink>
  );
});
ProtectedLink.displayName = 'ProtectedLink';

function Navbar({ user, onLogout, lang, onLangChange }) {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [localUser, setLocalUser] = useState(user);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('user'));
      if (!user && stored) {
        setLocalUser(stored);
      } else if (user && JSON.stringify(user) !== JSON.stringify(localUser)) {
        setLocalUser(user);
      }
    } catch (error) {
      console.error('Error syncing user state:', error);
    } finally {
      setIsAuthLoading(false);
    }
  }, [user, localUser]);

  const userRoles = useMemo(() => {
    try {
      const r = localUser?.roles || [localUser?.role];
      const roles = Array.isArray(r) ? r : [r];
      return {
        isAdmin: roles.includes('admin'),
        isVendor: roles.includes('vendor'),
        isCustomer: roles.includes('customer')
      };
    } catch (error) {
      console.error('Error parsing user roles:', error);
      return { isAdmin: false, isVendor: false, isCustomer: false };
    }
  }, [localUser]);

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      await onLogout();
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      setLocalUser(null);
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  }, [onLogout, navigate, user]);

  const handleSearchSubmit = useCallback((e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchInput.trim())}`);
      setSearchInput('');
      setIsMobileMenuOpen(false);
    }
  }, [searchInput, navigate]);

  if (isAuthLoading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <nav role="navigation" aria-label="Main navigation" className={styles.navbar}>
      <div className={styles.navStart}>
        <BackButton />
        <Logo />
        <CartIcon itemCount={localUser?.cartCount || 0} />
      </div>

      <button
        className={styles.mobileMenuButton}
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        aria-expanded={isMobileMenuOpen}
        aria-label="Toggle navigation menu"
      >
        <span className={styles.hamburgerIcon}></span>
      </button>

      <div className={`${styles.navLinks} ${isMobileMenuOpen ? styles.showMobile : ''}`}>
        <div className={styles.primaryNav}>
          <NavLink to="/" end className={styles.link} onClick={() => setIsMobileMenuOpen(false)}>
            Home
          </NavLink>
          <NavLink to="/shop" className={styles.link} onClick={() => setIsMobileMenuOpen(false)}>
            Shop
          </NavLink>
          
          {localUser && (
            <NavLink to="/favorites" className={styles.link} onClick={() => setIsMobileMenuOpen(false)}>
              Favorites
            </NavLink>
          )}

          {userRoles.isCustomer && (
            <>
              <ProtectedLink 
                to="/account" 
                requiredRole="Customer" 
                userRoles={userRoles}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Dashboard
              </ProtectedLink>
              <ProtectedLink 
                to="/account/orders" 
                requiredRole="Customer" 
                userRoles={userRoles}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                My Orders
              </ProtectedLink>
            </>
          )}

          {userRoles.isVendor && (
            <>
              <ProtectedLink 
                to="/vendor" 
                requiredRole="Vendor" 
                userRoles={userRoles}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Vendor Dashboard
              </ProtectedLink>
              <ProtectedLink 
                to="/upload" 
                requiredRole="Vendor" 
                userRoles={userRoles}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Upload Product
              </ProtectedLink>
            </>
          )}
        </div>

        <div className={styles.searchContainer}>
          <form 
            role="search" 
            onSubmit={handleSearchSubmit}
            className={styles.searchForm}
          >
            <label htmlFor="search-input" className="sr-only">
              Search products
            </label>
            <input
              id="search-input"
              type="search"
              aria-label="Search products"
              placeholder="Search products..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className={styles.searchInput}
            />
            <button 
              type="submit" 
              aria-label="Submit search"
              className={styles.searchButton}
            >
              Search
            </button>
          </form>
        </div>

        <div className={styles.navTools}>
          <LanguageSelector 
            currentLang={lang} 
            onChange={onLangChange}
          />
          
          <div className={styles.authSection}>
            {localUser ? (
              <div className={styles.authContainer}>
                <ProfileDropdown 
                  user={localUser}
                  onLogout={handleLogout}
                  isLoggingOut={isLoggingOut}
                />
                {process.env.NODE_ENV === 'development' && (
                  <RoleSwitcher
                    currentRole={localUser.role}
                    onRoleChange={(role) => {
                      const updatedUser = { ...localUser, role };
                      localStorage.setItem('user', JSON.stringify(updatedUser));
                      setLocalUser(updatedUser);
                    }}
                  />
                )}
              </div>
            ) : (
              <div className={styles.authContainer}>
                <NavLink to="/register" className={`${styles.authButton} ${styles.register}`}>
                  Register
                </NavLink>
                <NavLink to="/login" className={`${styles.authButton} ${styles.login}`}>
                  Login
                </NavLink>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

// PropTypes
CartIcon.propTypes = {
  itemCount: PropTypes.number
};

LanguageSelector.propTypes = {
  currentLang: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired
};

ProfileDropdown.propTypes = {
  user: PropTypes.shape({
    name: PropTypes.string,
    email: PropTypes.string.isRequired,
    role: PropTypes.string.isRequired
  }).isRequired,
  onLogout: PropTypes.func.isRequired,
  isLoggingOut: PropTypes.bool.isRequired
};

ProtectedLink.propTypes = {
  to: PropTypes.string.isRequired,
  requiredRole: PropTypes.string.isRequired,
  userRoles: PropTypes.object.isRequired,
  children: PropTypes.node.isRequired,
  onClick: PropTypes.func
};

BackButton.propTypes = {
  onClick: PropTypes.func
};

RoleSwitcher.propTypes = {
  currentRole: PropTypes.string.isRequired,
  onRoleChange: PropTypes.func.isRequired
};

Navbar.propTypes = {
  user: PropTypes.shape({
    roles: PropTypes.arrayOf(PropTypes.string),
    role: PropTypes.string,
    name: PropTypes.string,
    id: PropTypes.string.isRequired,
    email: PropTypes.string.isRequired,
    cartCount: PropTypes.number
  }),
  onLogout: PropTypes.func.isRequired,
  lang: PropTypes.oneOf(LANGUAGE_OPTIONS.map(l => l.value)),
  onLangChange: PropTypes.func,
  isAuthenticated: PropTypes.bool
};

// Default Props
Navbar.defaultProps = {
  lang: 'en',
  isAuthenticated: false,
  onLangChange: () => {},
  user: null
};

export default React.memo(Navbar);