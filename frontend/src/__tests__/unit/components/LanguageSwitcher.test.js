

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import LanguageSwitcher from '../../../components/LanguageSwitcher';

describe('LanguageSwitcher', () => {
  it('renders all language options', () => {
    render(<LanguageSwitcher currentLang="en" setLang={() => {}} />);
    expect(screen.getByText(/English/i)).toBeInTheDocument();
    expect(screen.getByText(/Amharic/i)).toBeInTheDocument();
    expect(screen.getByText(/Oromiffa/i)).toBeInTheDocument();
    expect(screen.getByText(/Swahili/i)).toBeInTheDocument();
  });

  it('calls setLang when a different language is clicked', () => {
    const mockSetLang = jest.fn();
    render(<LanguageSwitcher currentLang="en" setLang={mockSetLang} />);
    fireEvent.click(screen.getByText(/Amharic/i));
    expect(mockSetLang).toHaveBeenCalledWith('am');
  });

  it('highlights the selected language', () => {
    render(<LanguageSwitcher currentLang="sw" setLang={() => {}} />);
    expect(screen.getByText(/Swahili/i)).toHaveClass('active');
  });
});
