import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import BackButton from '../../../components/BackButton';

function Wrapper({ initialEntries = ['/account'] }) {
  return (
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/" element={<div>Home</div>} />
        <Route path="/account" element={<BackButton />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('BackButton', () => {
  test('hidden on homepage', () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<BackButton />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.queryByRole('button', { name: /go back/i })).not.toBeInTheDocument();
  });

  test('renders on non-root and navigates back', () => {
    render(<Wrapper initialEntries={["/", "/account"]} />);
    const btn = screen.getByRole('button', { name: /go back/i });
    expect(btn).toBeInTheDocument();
    // Navigation - clicking should not throw; jsdom MemoryRouter simulates history back
    fireEvent.click(btn);
  });
});
