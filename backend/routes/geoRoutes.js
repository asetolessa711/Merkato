const express = require('express');

const router = express.Router();

// Minimal country code -> name map for fast response without external calls
// Extend as needed.
const CODE_TO_COUNTRY = {
  ET: 'Ethiopia',
  KE: 'Kenya',
  SD: 'Sudan',
  SO: 'Somalia',
  ER: 'Eritrea',
  DJ: 'Djibouti',
  UG: 'Uganda',
  RW: 'Rwanda',
  TZ: 'Tanzania',
  US: 'United States',
  GB: 'United Kingdom',
  DE: 'Germany',
  FR: 'France',
  IT: 'Italy',
  ES: 'Spain',
  NL: 'Netherlands',
  AE: 'United Arab Emirates',
  SA: 'Saudi Arabia',
  IN: 'India',
  CN: 'China',
  JP: 'Japan',
  CA: 'Canada',
};

function pickHeaderCountryCode(req) {
  const h = (name) => (req.headers[name] || req.headers[name.toLowerCase()] || '').toString().trim();
  const candidates = [
    h('cf-ipcountry'), // Cloudflare
    h('x-vercel-ip-country'), // Vercel
    h('x-country-code'),
    h('x-geo-country'),
    h('x-geo-country-code'),
    h('fly-client-ip-country'), // Fly.io
    h('x-appengine-country'), // GAE
  ].filter(Boolean);
  const code = (candidates[0] || '').toUpperCase();
  // x-appengine-country may be 'ZZ' if unknown
  if (code && code !== 'ZZ') return code;

  // Light Accept-Language heuristic when no infra header present
  const al = h('accept-language');
  if (al) {
    const match = /([A-Za-z]{2})(?:-[A-Za-z]{2})?/.exec(al);
    if (match && match[1]) {
      const lang = match[1].toUpperCase();
      // Map common languages to likely country where relevant to our market
      if (lang === 'AM') return 'ET';
      if (lang === 'EN') return 'US';
      if (lang === 'AR') return 'SA';
      if (lang === 'SO') return 'SO';
      if (lang === 'SW') return 'KE';
    }
  }
  return '';
}

router.get('/ip', (req, res) => {
  try {
    const code = pickHeaderCountryCode(req) || 'ET';
    const countryName = CODE_TO_COUNTRY[code] || 'Ethiopia';
    res.json({ ok: true, countryCode: code, countryName, source: code ? 'header' : 'fallback' });
  } catch (err) {
    res.json({ ok: true, countryCode: 'ET', countryName: 'Ethiopia', source: 'error-fallback' });
  }
});

module.exports = router;
