import React from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import styles from './MerkatoFooter.module.css';

const currentYear = new Date().getFullYear();

const defaultSections = {
  public: [
    { title: 'Explore Merkato', slug: 'explore-merkato', links: [
      { label: 'About Us', to: '/about' }, { label: 'Careers', to: '/careers' }, { label: 'Blog', to: '/blog' }, { label: 'Press', to: '/press' }, { label: 'Telium Ecosystem', to: '/telium' }, { label: 'Become a Vendor', to: '/vendor/register' }
    ]},
    { title: 'Commerce Tools', slug: 'commerce-tools', links: [
      { label: 'Browse Products', to: '/shop' }, { label: 'Categories', to: '/shop?view=categories' }, { label: 'Deals', to: '/shop?sort=deals' }, { label: 'Gift Cards', to: '/gift-cards' }, { label: 'Promo Manager', to: '/promo' }
    ]},
    { title: 'Help & Support', slug: 'help-support', links: [
      { label: 'Contact Us', to: '/contact' }, { label: 'Help Center', to: '/help' }, { label: 'Returns & Refunds', to: '/returns' }, { label: 'Accessibility', to: '/accessibility' }, { label: 'Privacy', to: '/privacy' }
    ]},
    { title: 'Connect With Us', slug: 'connect', links: [
      { label: 'Twitter', href: 'https://twitter.com/merkato' }, { label: 'Facebook', href: 'https://facebook.com/merkato' }, { label: 'Instagram', href: 'https://instagram.com/merkato' }, { label: 'LinkedIn', href: 'https://linkedin.com/company/merkato' }
    ]},
  ],
  customer: [
    { title: 'Explore Merkato', slug: 'explore-merkato', links: [
      { label: 'About Us', to: '/about' }, { label: 'Careers', to: '/careers' }, { label: 'Blog', to: '/blog' }, { label: 'Press', to: '/press' }, { label: 'Telium Ecosystem', to: '/telium' }
    ]},
    { title: 'Your Account', slug: 'your-account', links: [
      { label: 'Orders', to: '/account/orders' }, { label: 'Reviews', to: '/account/reviews' }, { label: 'Saved Items', to: '/favorites' }, { label: 'Profile Settings', to: '/account/profile' }
    ]},
    { title: 'Customer Services', slug: 'customer-services', links: [
      { label: 'Track Order', to: '/account/orders?tab=tracking' }, { label: 'Return Policy', to: '/returns' }, { label: 'Support Chat', to: '/support' }
    ]},
    { title: 'Promotions', slug: 'promotions', links: [
      { label: 'Personalized Deals', to: '/shop?sort=personalized' }, { label: 'Loyalty Points', to: '/rewards' }, { label: 'Referral Program', to: '/referrals' }
    ]},
    { title: 'Help & Support', slug: 'help-support', links: [
      { label: 'Contact Us', to: '/contact' }, { label: 'Help Center', to: '/help' }, { label: 'Accessibility', to: '/accessibility' }, { label: 'Privacy', to: '/privacy' }
    ]},
    { title: 'Connect With Us', slug: 'connect', links: [
      { label: 'Twitter', href: 'https://twitter.com/merkato' }, { label: 'Facebook', href: 'https://facebook.com/merkato' }, { label: 'Instagram', href: 'https://instagram.com/merkato' }, { label: 'LinkedIn', href: 'https://linkedin.com/company/merkato' }
    ]},
  ],
  vendor: [
    { title: 'Explore Merkato', slug: 'explore-merkato', links: [
      { label: 'About Us', to: '/about' }, { label: 'Careers', to: '/careers' }, { label: 'Blog', to: '/blog' }, { label: 'Press', to: '/press' }, { label: 'Telium Ecosystem', to: '/telium' }
    ]},
    { title: 'Vendor Tools', slug: 'vendor-tools', links: [
      { label: 'Upload Product', to: '/vendor/products/upload' }, { label: 'Manage Inventory', to: '/vendor/products' }, { label: 'View Orders', to: '/vendor/orders' }, { label: 'Analytics Dashboard', to: '/vendor/analytics' }
    ]},
    { title: 'Resources', slug: 'resources', links: [
      { label: 'Seller Help Center', to: '/help' }, { label: 'Pricing Guide', to: '/pricing' }, { label: 'API Docs', to: '/api-docs' }
    ]},
    { title: 'Community', slug: 'community', links: [
      { label: 'Vendor Forum', to: '/community' }, { label: 'Webinars', to: '/webinars' }
    ]},
    { title: 'Help & Support', slug: 'help-support', links: [
      { label: 'Contact Us', to: '/contact' }, { label: 'Help Center', to: '/help' }, { label: 'Accessibility', to: '/accessibility' }, { label: 'Privacy', to: '/privacy' }
    ]},
    { title: 'Connect With Us', slug: 'connect', links: [
      { label: 'Twitter', href: 'https://twitter.com/merkato' }, { label: 'Facebook', href: 'https://facebook.com/merkato' }, { label: 'Instagram', href: 'https://instagram.com/merkato' }, { label: 'LinkedIn', href: 'https://linkedin.com/company/merkato' }
    ]},
  ],
  admin: [
    { title: 'System Tools', slug: 'system-tools', links: [
  { label: 'User Management', to: '/admin/users' }, { label: 'Moderation Queue', to: '/admin/review-moderation' }, { label: 'Logs', to: '/admin/analytics' }, { label: 'Campaign Manager', to: '/admin/promo-manager' }
    ]},
    { title: 'Governance', slug: 'governance', links: [
      { label: 'Audit Trails', to: '/admin/analytics' }, { label: 'Role Permissions', to: '/admin/users' }, { label: 'Feature Flags', to: '/admin/flags' }
    ]},
    { title: 'Documentation', slug: 'documentation', links: [
      { label: 'Internal Wiki', to: '/admin/wiki' }, { label: 'DevOps Playbook', to: '/admin/devops' }, { label: 'Release Notes', to: '/admin/releases' }
    ]},
    { title: 'Help & Support', slug: 'help-support', links: [
      { label: 'Contact Dev Team', to: '/admin/support' }, { label: 'Internal Help Center', to: '/admin/support' }
    ]},
  ]
};

function getRole() {
  try {
    const user = JSON.parse(localStorage.getItem('user')) || null;
    const detected = user?.role || (Array.isArray(user?.roles) ? user.roles[0] : undefined);
    return detected || 'public';
  } catch (_) {
    return 'public';
  }
}

const MerkatoFooter = ({ role: roleProp, sections, collapsibleOnMobile = true, showSocials = true }) => {
  const role = roleProp || getRole();
  const resolved = sections || defaultSections[role] || defaultSections.public;
  const scrollToTop = () => {
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (_) {
      window.scrollTo(0, 0);
    }
  };

  return (
    <footer className={styles.footer} data-testid="footer">
      {/* Back to top bar */}
      <div style={{
        width: '100%',
        background: 'linear-gradient(180deg, #0b1020 0%, #121a35 100%)',
        borderTop: '1px solid #1f2937',
        borderBottom: '1px solid #1f2937',
        padding: '16px 0',
        textAlign: 'center',
        position: 'relative'
      }}>
        <button
          onClick={scrollToTop}
          data-testid="back-to-top"
          aria-label="Back to top"
          style={{
            background: '#facc15',
            color: '#111827',
            border: 0,
            borderRadius: 999,
            fontWeight: 800,
            padding: '10px 20px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }}
        >
          Back to top
        </button>
      </div>
      <div className={styles.footerContent}>
        {/* Sections */}
        <div className={styles.footerLinks} style={{ gap: 24, flexWrap: 'wrap', justifyContent: 'space-between' }}>
          {resolved.map((sec) => (
            <div key={sec.slug} className={styles.column} data-testid={`footer-section-${sec.slug}`}>
              {collapsibleOnMobile ? (
                <details>
                  <summary style={{ cursor: 'pointer' }}>{sec.title}</summary>
                  <ul>
                    {sec.links.map((lnk) => (
                      <li key={lnk.label}>
                        {lnk.href ? (
                          <a data-testid={`footer-link-${lnk.label.toLowerCase().replace(/\s+/g,'-')}`} href={lnk.href} target="_blank" rel="noopener noreferrer">{lnk.label}</a>
                        ) : (
                          <Link data-testid={`footer-link-${lnk.label.toLowerCase().replace(/\s+/g,'-')}`} to={lnk.to || '#'}>{lnk.label}</Link>
                        )}
                      </li>
                    ))}
                  </ul>
                </details>
              ) : (
                <div>
                  <h4>{sec.title}</h4>
                  <ul>
                    {sec.links.map((lnk) => (
                      <li key={lnk.label}>
                        {lnk.href ? (
                          <a data-testid={`footer-link-${lnk.label.toLowerCase().replace(/\s+/g,'-')}`} href={lnk.href} target="_blank" rel="noopener noreferrer">{lnk.label}</a>
                        ) : (
                          <Link data-testid={`footer-link-${lnk.label.toLowerCase().replace(/\s+/g,'-')}`} to={lnk.to || '#'}>{lnk.label}</Link>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Bottom strip */}
        <div className={styles.socialLinks}>
          {showSocials && (
            <>
              <a href="https://twitter.com/merkato" target="_blank" rel="noopener noreferrer" aria-label="Twitter">Twitter</a>
              <a href="https://facebook.com/merkato" target="_blank" rel="noopener noreferrer" aria-label="Facebook">Facebook</a>
              <a href="https://instagram.com/merkato" target="_blank" rel="noopener noreferrer" aria-label="Instagram">Instagram</a>
              <a href="https://linkedin.com/company/merkato" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">LinkedIn</a>
            </>
          )}
          <span style={{ marginLeft: 'auto' }} className={styles.copyright}>
            Powered by <strong className={styles.brand}>Merkato</strong> © {currentYear}
          </span>
        </div>
      </div>
    </footer>
  );
};

MerkatoFooter.propTypes = {
  role: PropTypes.oneOf(['public', 'customer', 'vendor', 'admin']),
  sections: PropTypes.array,
  collapsibleOnMobile: PropTypes.bool,
  showSocials: PropTypes.bool,
};

export default React.memo(MerkatoFooter);