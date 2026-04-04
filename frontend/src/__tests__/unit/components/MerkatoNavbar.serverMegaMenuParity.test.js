import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import MerkatoNavbar from '../../../components/MerkatoNavbar.jsx';

function App() {
  return (
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<MerkatoNavbar role="public" />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('MerkatoNavbar server mega menu parity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();

    axios.get.mockImplementation((url) => {
      if (typeof url === 'string' && url.startsWith('/api/categories')) {
        return Promise.resolve({
          status: 200,
          headers: {},
          data: {
            menu: [
              {
                title: 'Server Category',
                icon: '🧪',
                links: [{ label: 'Server Link', to: '/shop?category=server' }],
              },
            ],
            categories: [
              {
                id: 'server-category',
                name: 'Server Category',
                slug: 'server-category',
                level: 1,
                displayOrder: 10,
                visibleIn: ['mega', 'searchbar'],
                active: true,
              },
            ],
            updatedAt: '2026-04-04T00:00:00.000Z',
            version: 1,
          },
        });
      }

      return Promise.resolve({ data: {} });
    });
  });

  test('renders server-managed mega menu category in shopper navbar', async () => {
    render(<App />);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('/api/categories');
    });

    const trigger = screen.getByRole('button', { name: /Shop by Category/i });
    fireEvent.click(trigger);

    expect(await screen.findByRole('tab', { name: /Server Category/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Server Link/i })).toBeInTheDocument();
  });
});
