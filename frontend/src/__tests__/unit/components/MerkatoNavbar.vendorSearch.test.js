import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import MerkatoNavbar from '../../../components/MerkatoNavbar';

function App() {
  return (
    <MemoryRouter initialEntries={["/vendor"]}>
      <Routes>
        <Route path="/vendor" element={<MerkatoNavbar role="vendor" />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('MerkatoNavbar (vendor search)', () => {
  beforeEach(() => {
    localStorage.clear();
    // Seed vendor products to drive suggestions
    localStorage.setItem('uploadedProducts', JSON.stringify([
      { id: 'p1', name: 'Red Sneakers', sku: 'RS-100', tags: ['shoes', 'sneakers'] },
      { id: 'p2', name: 'Blue Hat', sku: 'BH-200' },
    ]));
  });

  test('shows suggestions for product query', async () => {
    render(<App />);
    const input = screen.getByTestId('vendor-search-input');
    fireEvent.change(input, { target: { value: 'sneakers' } });

    // Focus to open suggestions
    fireEvent.focus(input);

    // Slight debounce is used; run timers
    jest.runAllTimers?.();

    // Look for our seeded item
    const items = await screen.findAllByTestId('vendor-suggest-item');
    const item = items.find((el) => within(el).queryByText(/red sneakers/i));
    expect(item).toBeTruthy();
  });
});
