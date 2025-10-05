import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
// Force flags for this suite to maintain legacy expectations (description visible, multi-CTA)
jest.mock('../../utils/featureFlags', () => ({
  Flags: {
    CARD_SHOW_DESCRIPTION: true,
    CARD_SINGLE_CTA: false,
  },
}));
import ProductCard from '../../components/ProductCard'';
import { renderWithProviders } from '../../test/renderWithProviders'';
import '@testing-library/jest-dom';

// Mock product data
const product = {
  _id: '123',
  name: 'Test Product',
  price: 49.99,
  description: 'A nice product for testing',
  image: 'test-product.jpg',
};

describe('\ud83d\udecd\ufe0f ProductCard Component', () => {
  test('renders product name and price', () => {
    renderWithProviders(<ProductCard product={product} />);
    expect(screen.getByText(/test product/i)).toBeInTheDocument();
    expect(screen.getByText(/\$?49\.99/i)).toBeInTheDocument();
  });

  test('displays product image with alt text', () => {
    renderWithProviders(<ProductCard product={product} />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', expect.stringContaining('test-product.jpg'));
    expect(img).toHaveAttribute('alt', expect.stringMatching(/test product/i));
  });

  test('calls add-to-cart when button clicked', () => {
    const onAddToCart = jest.fn();
    renderWithProviders(<ProductCard product={product} onAddToCart={onAddToCart} />);
    const btn = screen.getByRole('button', { name: /add to cart/i });
    fireEvent.click(btn);
    expect(onAddToCart).toHaveBeenCalledTimes(1);
    expect(onAddToCart).toHaveBeenCalledWith(product);
  });

  test('disables add-to-cart button if out of stock', () => {
    renderWithProviders(<ProductCard product={{ ...product, stock: 0 }} />);
    const btn = screen.getByRole('button', { name: /add to cart/i });
    expect(btn).toBeDisabled();
  });

  test('shows product description', () => {
    renderWithProviders(<ProductCard product={product} />);
    expect(screen.getByText(/a nice product for testing/i)).toBeInTheDocument();
  });

  test('image has decoding async attribute', () => {
    renderWithProviders(<ProductCard product={product} />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('decoding', 'async');
  });

  test('keyboard arrow keys swap image when multiple images exist', () => {
    const multi = { ...product, images: ['one.jpg', 'two.jpg'] };
    renderWithProviders(<ProductCard product={multi} />);
    const card = screen.getByTestId('product-card');
    const img = screen.getByTestId('product-image');
    expect(img.getAttribute('src')).toMatch(/one/);
    card.focus();
    fireEvent.keyDown(card, { key: 'ArrowRight' });
    expect(img.getAttribute('src')).toMatch(/two/);
    fireEvent.keyDown(card, { key: 'ArrowLeft' });
    expect(img.getAttribute('src')).toMatch(/one/);
  });

  test('matches snapshot', () => {
    const { asFragment } = renderWithProviders(<ProductCard product={product} />);
    expect(asFragment()).toMatchSnapshot();
  });
});
