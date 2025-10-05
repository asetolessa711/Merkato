import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProductCard from '../../../components/ProductCard'';
import { RailsContext } from '../../../context/RailsContext'';

jest.mock('../../../cart/CartContext', () => ({
  useCart: () => ({ add: jest.fn() })
}));

const product = {
  _id: 'sku-1',
  name: 'Card Event Product',
  price: 12.34,
  images: ['/img/a.jpg'],
  stock: 3,
};

describe('ProductCard events', () => {
  test('ui:card_click and cart:add fire once with rail context', () => {
    const ctx = { railId: 'rail-123', sku: 'sku-1', page: 'home', slot: 'hero', tactic: 'organic' };
    const clickSpy = jest.fn();
    const atcSpy = jest.fn();
    window.addEventListener('ui:card_click', (e) => clickSpy(e.detail));
    window.addEventListener('cart:add', (e) => atcSpy(e.detail));

    render(
      <MemoryRouter>
        <RailsContext.Provider value={ctx}>
          <ProductCard product={product} />
        </RailsContext.Provider>
      </MemoryRouter>
    );

    // Click title (card click)
    fireEvent.click(screen.getByText('Card Event Product'));
    // Click Add to Cart
    fireEvent.click(screen.getByTestId('add-to-cart-btn'));

    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(atcSpy).toHaveBeenCalledTimes(1);
    expect(clickSpy.mock.calls[0][0]).toMatchObject({ railId: 'rail-123', tactic: 'organic' });
    expect(atcSpy.mock.calls[0][0]).toMatchObject({ railId: 'rail-123', source: 'product-card' });
  });
});
