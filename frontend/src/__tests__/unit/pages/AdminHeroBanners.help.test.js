import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import AdminHeroBanners from '../../../pages/AdminHeroBanners'';

// Simple mock for localStorage/sessionStorage safety in jsdom
function clearSessionFlag(){
  try { sessionStorage.removeItem('heroHelpOpen'); } catch (_) {}
}

describe('AdminHeroBanners HelpInline persistence', () => {
  beforeEach(() => {
    clearSessionFlag();
  });

  it('remembers open state across remounts', () => {
    render(<AdminHeroBanners />);
    // Multiple help icon buttons exist; choose the one whose textContent is exactly 'Help'
  const candidates = screen.getAllByRole('button', { name: /help/i });
  const helpBtn = candidates.find(b => b.textContent.trim() === 'Help');
    expect(helpBtn).toBeTruthy();
    fireEvent.click(helpBtn); // open
    expect(screen.getByText(/Marketing Manager Help/i)).toBeInTheDocument();
    // Unmount but keep sessionStorage state
    cleanup();
    // Remount
    render(<AdminHeroBanners />);
    // Should show Close Help since state restored
    expect(screen.getByRole('button', { name: /close help/i })).toBeInTheDocument();
  });

  it('persists open state when sessionStorage flag set', () => {
    // Manually set flag then mount
    try { sessionStorage.setItem('heroHelpOpen', '1'); } catch (_) {}
    render(<AdminHeroBanners />);
    expect(screen.getByRole('button', { name: /close help/i })).toBeInTheDocument();
  });
});
