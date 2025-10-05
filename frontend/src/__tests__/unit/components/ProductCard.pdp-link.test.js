import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProductCard from '../../../components/ProductCard'';

jest.mock('../../../cart/CartContext', () => ({
  useCart: () => ({ add: jest.fn() })
}));

describe('ProductCard PDP linking', () => {
  it('always links ProductCard title to /product/*', () => {
    const product = { _id: 'sku-123', name: 'Widget', price: 9.99, stock: 3 };
    render(
      <MemoryRouter initialEntries={['/']}> 
        <ProductCard product={product} />
      </MemoryRouter>
    );
    const card = screen.getByTestId('product-card');
    const link = within(card).getByRole('link', { name: product.name });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', expect.stringMatching(/^\/product\//));
  });
});
