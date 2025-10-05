import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import VendorCard from '../../../components/VendorCard'';

describe('VendorCard', () => {
  const vendor = {
    _id: 'v123',
    name: 'Test Vendor',
    email: 'test@vendor.com',
    logo: '/images/logo.png',
  };

  test('renders vendor info and Visit Store link', () => {
    render(
      <MemoryRouter>
        <VendorCard vendor={vendor} />
      </MemoryRouter>
    );

    expect(screen.getByText('Test Vendor')).toBeInTheDocument();
    expect(screen.getByText('test@vendor.com')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /visit .* store/i });
    expect(link).toHaveAttribute('href', `/vendor/${vendor._id}`);
  });

  test('fallbacks when optional fields missing', () => {
    const minimal = { _id: 'v1' };
    render(
      <MemoryRouter>
        <VendorCard vendor={minimal} />
      </MemoryRouter>
    );
    // Uses fallback name text
    expect(screen.getByText(/unnamed vendor/i)).toBeInTheDocument();
    // Link still points to vendor id
    const link = screen.getByRole('link', { name: /visit .* store/i });
    expect(link).toHaveAttribute('href', `/vendor/${minimal._id}`);
  });
});
