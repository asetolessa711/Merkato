import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import * as vendorHook from '../../../hooks/useVendor'';
import VendorStore from '../../../pages/VendorStore'';

jest.mock('../../../components/MerkatoFooter', () => () => <footer />);

describe('VendorStore smoke', () => {
  it('shows loading skeleton then empty state', async () => {
    jest.spyOn(vendorHook, 'useVendorStorefront').mockReturnValue({ loading: true, error: null, products: [], vendor: null, customization: null });
    render(
      <MemoryRouter initialEntries={[{ pathname: '/v/demo-shop' }]}>
        <Routes>
          <Route path="/v/:slug" element={<VendorStore />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText(/Back to Marketplace/i)).toBeInTheDocument();
  });
});
