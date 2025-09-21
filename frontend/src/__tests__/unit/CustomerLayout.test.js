import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import CustomerLayout from '../../layouts/CustomerLayout';

describe('CustomerLayout @persona-ui', () => {
  const baseProps = {
    user: { name: 'Alice', activeOrders: 2, wishlistCount: 1, credits: 5, rewardPoints: 42 },
    onLogout: jest.fn(),
    lang: 'en',
    onLangChange: jest.fn()
  };

  it('does not render loading skeleton when user not yet loaded', () => {
    const { container } = render(
      <MemoryRouter>
        <CustomerLayout {...baseProps} user={null} />
      </MemoryRouter>
    );
    // Loading state should NOT render any skeleton or the visible dashboard header
    expect(container.querySelector('.loadingSkeleton')).toBeNull();
    expect(screen.queryByTestId('customer-dashboard-title')).toBeNull();
  });

  it('renders dashboard title when user present', () => {
    render(
      <MemoryRouter>
        <CustomerLayout {...baseProps} />
      </MemoryRouter>
    );
    expect(screen.getByTestId('customer-dashboard-title')).toHaveTextContent('Customer Dashboard');
  });
});
