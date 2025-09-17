// Central country list with dial codes. Admins can override via
// 1) GET /api/config/countries returning [{ name, dial }]
// 2) localStorage key 'admin:countries' containing the same shape.

export const COUNTRIES = [
  // East Africa core
  { name: 'Ethiopia', dial: '+251' },
  { name: 'Kenya', dial: '+254' },
  { name: 'Somalia', dial: '+252' },
  { name: 'Sudan', dial: '+249' },
  { name: 'South Sudan', dial: '+211' },
  { name: 'Eritrea', dial: '+291' },
  { name: 'Djibouti', dial: '+253' },
  { name: 'Uganda', dial: '+256' },
  { name: 'Tanzania', dial: '+255' },
  { name: 'Rwanda', dial: '+250' },
  { name: 'Burundi', dial: '+257' },
  // Africa + MENA
  { name: 'Nigeria', dial: '+234' },
  { name: 'Ghana', dial: '+233' },
  { name: 'South Africa', dial: '+27' },
  { name: 'Egypt', dial: '+20' },
  { name: 'Morocco', dial: '+212' },
  { name: 'Algeria', dial: '+213' },
  { name: 'Tunisia', dial: '+216' },
  { name: 'Libya', dial: '+218' },
  // Europe
  { name: 'United Kingdom', dial: '+44' },
  { name: 'Germany', dial: '+49' },
  { name: 'France', dial: '+33' },
  { name: 'Italy', dial: '+39' },
  { name: 'Spain', dial: '+34' },
  { name: 'Portugal', dial: '+351' },
  { name: 'Netherlands', dial: '+31' },
  { name: 'Belgium', dial: '+32' },
  { name: 'Sweden', dial: '+46' },
  { name: 'Norway', dial: '+47' },
  { name: 'Denmark', dial: '+45' },
  { name: 'Finland', dial: '+358' },
  { name: 'Poland', dial: '+48' },
  { name: 'Switzerland', dial: '+41' },
  { name: 'Austria', dial: '+43' },
  { name: 'Ireland', dial: '+353' },
  // Americas
  { name: 'United States', dial: '+1' },
  { name: 'Canada', dial: '+1' },
  { name: 'Mexico', dial: '+52' },
  { name: 'Brazil', dial: '+55' },
  { name: 'Argentina', dial: '+54' },
  { name: 'Chile', dial: '+56' },
  { name: 'Colombia', dial: '+57' },
  { name: 'Peru', dial: '+51' },
  // Asia-Pacific & Middle East
  { name: 'Turkey', dial: '+90' },
  { name: 'Saudi Arabia', dial: '+966' },
  { name: 'United Arab Emirates', dial: '+971' },
  { name: 'Qatar', dial: '+974' },
  { name: 'Kuwait', dial: '+965' },
  { name: 'India', dial: '+91' },
  { name: 'Pakistan', dial: '+92' },
  { name: 'Bangladesh', dial: '+880' },
  { name: 'China', dial: '+86' },
  { name: 'Japan', dial: '+81' },
  { name: 'South Korea', dial: '+82' },
  { name: 'Australia', dial: '+61' },
  { name: 'New Zealand', dial: '+64' },
  // Other
  { name: 'Russia', dial: '+7' },
  { name: 'Ukraine', dial: '+380' },
  { name: 'Israel', dial: '+972' },
];

export default COUNTRIES;
