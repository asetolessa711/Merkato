// Tags: @thread:reviews
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import ProductDetail from '../../pages/ProductDetail';

jest.mock('axios', () => ({ get: jest.fn((url) => {
  if (/\/api\/products\//.test(url)) return Promise.resolve({ data: { name: 'PDemo', price: 10, _id: 'p1' } });
  if (/\/api\/reviews/.test(url)) return Promise.resolve({ data: [] });
  return Promise.resolve({ data: {} });
}) }));

describe('Product reviews UI', () => {
  test('renders detail with reviews section (empty)', async () => {
    render(<MemoryRouter><ProductDetail /></MemoryRouter>);
    await waitFor(() => {
  expect(screen.getByRole('heading', { name: /customer reviews/i })).toBeInTheDocument();
    });
  });
});
