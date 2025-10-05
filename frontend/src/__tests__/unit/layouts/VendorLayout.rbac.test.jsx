import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import VendorLayout from '../../../layouts/VendorLayout'';

jest.mock('../../../components/MerkatoNavbar.jsx', () => () => <nav>nav</nav>);
jest.mock('../../../components/MicroBanner.jsx', () => () => <div />);
jest.mock('../../../components/VendorSidebar', () => () => <aside />);
jest.mock('../../../components/MerkatoFooter', () => () => <footer />);

describe('VendorLayout RBAC', () => {
  it('renders access restricted when user has no vendor role', () => {
    const user = { roles: ['customer'] };
    render(
      <MemoryRouter>
        <VendorLayout user={user} />
      </MemoryRouter>
    );
    expect(screen.getByText(/Access restricted/i)).toBeInTheDocument();
  });

  it('renders children area when user has vendor role', () => {
    const user = { roles: ['vendor'] };
    render(
      <MemoryRouter>
        <VendorLayout user={user} />
      </MemoryRouter>
    );
    expect(screen.queryByText(/Access restricted/i)).toBeNull();
  });
});
