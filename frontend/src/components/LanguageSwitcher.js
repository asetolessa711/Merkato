
import React from 'react';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'am', label: 'Amharic' },
  { code: 'om', label: 'Oromiffa' },
  { code: 'sw', label: 'Swahili' },
];

const LanguageSwitcher = ({ currentLang, setLang }) => (
  <div>
    {LANGUAGES.map(lang => (
      <button
        key={lang.code}
        className={currentLang === lang.code ? 'active' : ''}
        onClick={() => {
          if (setLang && lang.code !== currentLang) setLang(lang.code);
        }}
        aria-label={lang.label}
      >
        {lang.label}
      </button>
    ))}
  </div>
);

export default LanguageSwitcher;
