// Tags: @thread:notifications
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import CustomersPage from '../../pages/CustomersPage'';

describe('Notifications UI (customers page tab)', () => {
  test('renders Notifications section when selected', () => {
    render(<CustomersPage />);
    // It renders multiple tabs; ensure Notifications header text exists in DOM
    expect(screen.getByText(/Notifications/i)).toBeInTheDocument();
  });
});