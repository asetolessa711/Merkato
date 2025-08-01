import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import '@testing-library/jest-dom';

const languages = [
  { code: 'en', label: /english/i },
  { code: 'am', label: /amharic/i },
  { code: 'om', label: /oromiffa/i },
  { code: 'sw', label: /swahili/i }
];

describe('\ud83c\udf0d Language Switcher', () => {
  test('renders all available language options', () => {
    render(<LanguageSwitcher currentLang="en" />);
    languages.forEach(lang =>
      expect(screen.getByText(lang.label)).toBeInTheDocument()
    );
  });

  test('triggers language change on selection', () => {
    const mockSetLang = jest.fn();
    render(<LanguageSwitcher currentLang="en" setLang={mockSetLang} />);
    fireEvent.click(screen.getByText(/amharic/i));
    expect(mockSetLang).toHaveBeenCalledWith('am');
  });

  test('does not trigger callback when clicking current language', () => {
    const mockSetLang = jest.fn();
    render(<LanguageSwitcher currentLang="en" setLang={mockSetLang} />);
    fireEvent.click(screen.getByText(/english/i));
    expect(mockSetLang).not.toHaveBeenCalled();
  });

  test('highlights selected language', () => {
    render(<LanguageSwitcher currentLang="sw" />);
    const active = screen.getByText(/swahili/i);
    expect(active).toHaveClass('active'); // Adjust class name per implementation
  });

  test('all language options are accessible as buttons', () => {
    render(<LanguageSwitcher currentLang="en" />);
    languages.forEach(lang => {
      expect(screen.getByRole('button', { name: lang.label })).toBeInTheDocument();
    });
  });

  test('matches snapshot', () => {
    const { asFragment } = render(<LanguageSwitcher currentLang="en" />);
    expect(asFragment()).toMatchSnapshot();
  });
});
