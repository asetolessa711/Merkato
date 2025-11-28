import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ProductCard from '../../components/ProductCard';
import { MemoryRouter } from 'react-router-dom';
import { CartProvider } from '../../cart/CartContext';
import '@testing-library/jest-dom';

// Mock product data
const product = {
  _id: '123',
  name: 'Test Product',
  price: 49.99,
  description: 'A nice product for testing',
  image: 'test-product.jpg',
};

// Helper wrapper component
const Wrapper = ({ children }) => (
  <MemoryRouter>
    <CartProvider>
      {children}
    </CartProvider>
  </MemoryRouter>
);

describe('\ud83d\udecd\ufe0f ProductCard Component', () => {
  test('renders product name and price', () => {
    render(
      <Wrapper>
        <ProductCard product={product} />
      </Wrapper>
    );
    expect(screen.getByText(/test product/i)).toBeInTheDocument();
    expect(screen.getByText(/\$?49\.99/i)).toBeInTheDocument();
  });

  test('displays product image with alt text', () => {
    render(
      <Wrapper>
        <ProductCard product={product} />
      </Wrapper>
    );
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', expect.stringContaining('test-product.jpg'));
    expect(img).toHaveAttribute('alt', expect.stringMatching(/test product/i));
  });

  test('calls add-to-cart when button clicked', () => {
    const onAddToCart = jest.fn();
    render(
      <Wrapper>
        <ProductCard product={product} onAddToCart={onAddToCart} />
      </Wrapper>
    );
    const btn = screen.getByRole('button', { name: /add to cart/i });
    fireEvent.click(btn);
    expect(onAddToCart).toHaveBeenCalledTimes(1);
    expect(onAddToCart).toHaveBeenCalledWith(product);
  });

  test('disables add-to-cart button if out of stock', () => {
    render(
      <Wrapper>
        <ProductCard product={{ ...product, stock: 0 }} />
      </Wrapper>
    );
    const btn = screen.getByRole('button', { name: /add to cart/i });
    expect(btn).toBeDisabled();
  });

  test('shows product description', () => {
    render(
      <Wrapper>
        <ProductCard product={product} />
      </Wrapper>
    );
    expect(screen.getByText(/a nice product for testing/i)).toBeInTheDocument();
  });

  test('matches snapshot', () => {
    const { asFragment } = render(
      <Wrapper>
        <ProductCard product={product} />
      </Wrapper>
    );
    expect(asFragment()).toMatchSnapshot();
  });
});
