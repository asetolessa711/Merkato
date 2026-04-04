import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import AdminMegaMenu from '../AdminMegaMenu';

describe('AdminMegaMenu validation feedback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('token', 'test-token');
  });

  test('shows field-level validation feedback returned by backend', async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        menu: [
          { title: 'Electronics', status: 'active', links: [{ label: 'Phones', to: '/shop?category=electronics' }] },
        ],
        updatedAt: new Date().toISOString(),
      },
    });

    axios.put.mockRejectedValueOnce({
      response: {
        data: {
          message: 'Invalid mega menu payload',
          errors: [
            { path: 'menu[0].title', message: 'title is required' },
            { path: 'menu[0].links[0].to', message: 'link target must start with / or http(s):// and cannot use javascript:/data:' },
          ],
        },
      },
    });

    render(<AdminMegaMenu />);

    fireEvent.click(await screen.findByTestId('save-megamenu'));

    await waitFor(() => {
      expect(screen.getByText(/Invalid mega menu payload/i)).toBeInTheDocument();
    });

    expect(screen.getByTestId('validation-errors')).toBeInTheDocument();
    expect(screen.getByText(/menu\[0\]\.title: title is required/i)).toBeInTheDocument();
    expect(screen.getByText(/menu\[0\]\.links\[0\]\.to/i)).toBeInTheDocument();
  });
});
