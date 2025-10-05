import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CartProvider } from '../cart/CartContext'';

// Minimal wrapper to provide required contexts/providers in unit tests
export function renderWithProviders(ui, { route = '/', routerProps = {}, cartSeed } = {}) {
  // Seed cart localStorage if provided
  try {
    if (cartSeed) {
      const state = { items: cartSeed, updatedAt: Date.now() };
      localStorage.setItem('cart:v1', JSON.stringify(state));
    }
  } catch {}

  const Wrapper = ({ children }) => (
    <MemoryRouter initialEntries={[route]} {...routerProps}>
      <CartProvider>{children}</CartProvider>
    </MemoryRouter>
  );

  return render(ui, { wrapper: Wrapper });
}

export default renderWithProviders;
