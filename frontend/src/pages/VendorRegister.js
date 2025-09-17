import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import styles from './VendorRegister.module.css';
import COUNTRIES_FALLBACK from '../data/countries';
import { SHOP_CATEGORIES } from '../data/categories';
import { useLocation, useNavigate } from 'react-router-dom';
import getOnboardingStep from '../utils/onboardingProgress';

const init = {
  business_name: '',
  contact_person: '',
  phone: '',
  email: '',
  country: 'Ethiopia',
  region: '',
  city: '',
  street: '',
  postal_code: '',
  product_category: '',
  storefront_description: '',
  referral_source: '',
  referral_other: ''
};

export default function VendorRegister() {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState(init);
  const [status, setStatus] = useState(null);
  const [phonePrefix, setPhonePrefix] = useState('+251');
  const [countries, setCountries] = useState(COUNTRIES_FALLBACK);
  const [isMobile, setIsMobile] = useState(false);
  const { step, total, percent, label: stepLabel } = useMemo(() => getOnboardingStep(location.pathname), [location.pathname]);

  // Try to get admin/server-provided country list; fallback to local
  useEffect(() => {
    let canceled = false;
    const load = async () => {
      try {
        // Admin override via localStorage (JSON array of {name,dial})
        const local = JSON.parse(localStorage.getItem('admin:countries') || 'null');
        if (Array.isArray(local) && local.length) {
          if (!canceled) setCountries(local);
          return;
        }
      } catch (_) {}
      try {
        const res = await axios.get('/api/config/countries');
        const list = Array.isArray(res?.data) ? res.data : Array.isArray(res?.data?.countries) ? res.data.countries : null;
        if (!canceled && Array.isArray(list) && list.length) setCountries(list);
      } catch (_) {
        // ignore; use fallback
      }
    };
    load();
    return () => { canceled = true; };
  }, []);

  // Basic viewport check for conditional UX text (not required for layout)
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    try { onResize(); window.addEventListener('resize', onResize); } catch(_) {}
    return () => { try { window.removeEventListener('resize', onResize); } catch(_) {} };
  }, []);

  useEffect(() => {
    const c = countries.find((c) => c.name === form.country);
    setPhonePrefix(c?.dial || '+251');
  }, [form.country, countries]);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setStatus('Submitting...');
    try {
      const res = await axios.post('/api/vendor/register', form);
      setStatus('Thanks! We received your details. Our team will reach out soon.');
    } catch (err) {
      setStatus(`Error: ${(err.response?.data?.code || err.message)}`);
    }
  };

  return (
    <div className={styles.page}>
      {/* Mobile-only sticky hero with progress */}
      <div className={styles.mobileHero} aria-hidden={!isMobile}>
        <h1 className={styles.title} style={{ color: '#fff', margin: 0, fontSize: 24 }}>Become a Merkato Vendor</h1>
        <p className={styles.subtitle} style={{ color: 'rgba(255,255,255,.9)', margin: '2px 0 10px 0' }}>Quick mobile-friendly onboarding</p>
        <div className={styles.progressOuter} role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
          <div className={styles.progressInner} style={{ width: `${percent}%` }} />
        </div>
        <p className={styles.progressNote}>Step {step} of {total}: {stepLabel}</p>
      </div>
      <header className={styles.header}>
        <h1 className={styles.title}>
          <span aria-hidden="true" style={{ marginRight: 8, color: 'var(--color-primary)' }}>🛍️</span>
          Become a Merkato Vendor
        </h1>
        <div style={{ height: 3, width: 56, background: 'var(--color-primary)', borderRadius: 999, margin: '6px 0 10px 0' }} />
      </header>
      <div className={styles.grid}>
        <form onSubmit={onSubmit} className={styles.card} style={{ display: 'grid', gap: 14 }}>
        <div className={styles.formIntro}>
          Welcome! Tell us a bit about your business so we can set up your Merkato storefront. It only takes a couple of minutes.
        </div>
        <input name="business_name" placeholder="Business Name" value={form.business_name} onChange={onChange} required maxLength={100} />
        <input name="contact_person" placeholder="Contact Person" value={form.contact_person} onChange={onChange} required minLength={2} />

        {/* Address block */}
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Business Address</legend>
          {/* Mobile collapsible */}
          <details className={styles.mobileDetails}>
            <summary className={styles.mobileSummary}>Tap to add address</summary>
            <div className={styles.mobileDetailsInner}>
              <div>
                <label className={styles.label}>Country</label>
                <select name="country" value={form.country} onChange={onChange} required>
                  {countries.map((c) => (<option key={c.name} value={c.name}>{c.name}</option>))}
                </select>
              </div>
              <div>
                <label className={styles.label}>State/Region</label>
                <input name="region" placeholder="State / Region" value={form.region} onChange={onChange} required />
              </div>
              <div>
                <label className={styles.label}>City</label>
                <input name="city" placeholder="City" value={form.city} onChange={onChange} required />
              </div>
              <div>
                <label className={styles.label}>Postal Code</label>
                <input name="postal_code" placeholder="Postal Code (optional)" value={form.postal_code} onChange={onChange} />
              </div>
              <div>
                <label className={styles.label}>Street</label>
                <input name="street" placeholder="Street / House No." value={form.street} onChange={onChange} />
              </div>
            </div>
          </details>

          {/* Desktop/Tablet grid */}
          <div className={styles.twoCol}>
            <div>
              <label className={styles.label}>Country</label>
              <select name="country" value={form.country} onChange={onChange} required>
                {countries.map((c) => (<option key={c.name} value={c.name}>{c.name}</option>))}
              </select>
            </div>
            <div>
              <label className={styles.label}>State/Region</label>
              <input name="region" placeholder="State / Region" value={form.region} onChange={onChange} required />
            </div>
            <div>
              <label className={styles.label}>City</label>
              <input name="city" placeholder="City" value={form.city} onChange={onChange} required />
            </div>
            <div>
              <label className={styles.label}>Street</label>
              <input name="street" placeholder="Street / House No." value={form.street} onChange={onChange} />
            </div>
            <div>
              <label className={styles.label}>Postal Code</label>
              <input name="postal_code" placeholder="Postal Code (optional)" value={form.postal_code} onChange={onChange} />
            </div>
          </div>
        </fieldset>

        {/* Contact info with auto country prefix */}
        <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 8 }}>
          <div>
            <label className={styles.label}>Country Code</label>
            <input value={phonePrefix} readOnly aria-label="Phone country code" />
          </div>
          <div>
            <label className="sr-only">Phone Number</label>
            <input name="phone" placeholder="Phone number" value={form.phone} onChange={onChange} required />
          </div>
        </div>
        <input type="email" name="email" placeholder="Email" value={form.email} onChange={onChange} required />

        {/* Product category */}
        <select name="product_category" value={form.product_category} onChange={onChange} required>
          <option value="">Select Product Category</option>
          {SHOP_CATEGORIES.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <textarea name="storefront_description" placeholder="Describe your storefront (optional)" value={form.storefront_description} onChange={onChange} maxLength={500} />

        {/* Referral source with list + Other */}
        <div style={{ display: 'grid', gap: 6 }}>
          <label style={{ display: 'block' }}>How did you hear about Merkato?</label>
          <select name="referral_source" value={form.referral_source} onChange={onChange}>
            <option value="">Select one (optional)</option>
            <option value="search">Search engine</option>
            <option value="social">Social media</option>
            <option value="friend">Friend/colleague</option>
            <option value="event">Event or webinar</option>
            <option value="ad">Online advertisement</option>
            <option value="other">Other</option>
          </select>
          {form.referral_source === 'other' && (
            <input name="referral_other" placeholder="Please specify" value={form.referral_other} onChange={onChange} />
          )}
        </div>

        {/* Legal note moved above consent */}
        <p id="consent-legal" className={styles.legalNote}>
          By submitting this you agree to be contacted and comply with our <a href="/terms" className={styles.ctaLink} onClick={(e)=>{e.preventDefault(); navigate('/terms');}}>terms</a> and <a href="/privacy" className={styles.ctaLink} onClick={(e)=>{e.preventDefault(); navigate('/privacy');}}>privacy policy</a>.
        </p>
        {/* Consent checkbox removed per request */}
        <button type="submit" className={styles.submitBtn}>Submit</button>
        {status && <p role="status" style={{ marginTop: 8 }}>{status}</p>}
        </form>

        {/* Right-side CTA/Info panel removed to avoid duplicate messaging */}
      </div>
      {/* Floating help (mobile only) */}
      <button
        type="button"
        className={styles.helpBtn}
        aria-label="Open Vendor Guide and FAQ"
        onClick={(e) => { e.preventDefault(); navigate('/docs/vendor-guide'); }}
      >
        ❓ Help
      </button>
    </div>
  );
}
