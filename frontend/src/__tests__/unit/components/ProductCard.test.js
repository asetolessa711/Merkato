import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
// Correct relative path: from src/__tests__/unit/components to src/components
import ProductCard from '../../../components/ProductCard'';

// Mock cart context to avoid needing full provider wiring
jest.mock('../../../cart/CartContext', () => ({
  useCart: () => ({ add: jest.fn() })
}));

function makeProduct(overrides = {}) {
  return {
    _id: 'p1',
    name: 'Test Product',
    price: 10,
    discount: 0,
    images: ['/img/one.jpg', '/img/two.jpg'],
    stock: 5,
    ...overrides,
  };
}

describe('ProductCard', () => {
  it('renders primary image and has async decoding attribute', () => {
  render(<MemoryRouter><ProductCard product={makeProduct()} /></MemoryRouter>);
    const img = screen.getByTestId('product-image');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('decoding', 'async');
  });

  it('swaps image with keyboard arrows (ArrowRight/ArrowLeft)', () => {
  render(<MemoryRouter><ProductCard product={makeProduct()} /></MemoryRouter>);
    const card = screen.getByTestId('product-card');
    const img = screen.getByTestId('product-image');
    // Initial src
    const firstSrc = img.getAttribute('src');
    expect(firstSrc).toMatch(/one/);
    // Focus card and press ArrowRight to show second image
    card.focus();
    fireEvent.keyDown(card, { key: 'ArrowRight' });
    const afterRight = img.getAttribute('src');
    expect(afterRight).toMatch(/two/);
    // Press ArrowLeft to go back
    fireEvent.keyDown(card, { key: 'ArrowLeft' });
    const afterLeft = img.getAttribute('src');
    expect(afterLeft).toMatch(/one/);
  });
});
