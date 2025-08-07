import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import { MessageContext } from '../../context/MessageContext';
import VendorManagement from '../VendorManagement';
import { MemoryRouter } from 'react-router-dom';

jest.mock('axios');

const mockShowMessage = jest.fn();
const renderWithContext = (ui) =>
  render(
    <MemoryRouter>
      <MessageContext.Provider value={{ showMessage: mockShowMessage }}>
        {ui}
      </MessageContext.Provider>
    </MemoryRouter>
  );

describe('VendorManagement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('token', 'test-token');
  });

  it('renders vendor table', async () => {
    axios.get.mockResolvedValueOnce({ data: [
      { _id: '1', name: 'Vendor1', email: 'v1@mail.com', country: 'ET', role: 'vendor', isActive: true, createdAt: '2025-08-01', productCount: 2, subscriptionPlan: 'Pro' },
    ] });
    renderWithContext(<VendorManagement />);
    expect(await screen.findByText('Vendor1')).toBeInTheDocument();
    expect(screen.getByText('v1@mail.com')).toBeInTheDocument();
    expect(screen.getByText('ET')).toBeInTheDocument();
    // Find the table cell with 'Active' (not the select option)
    expect(screen.getAllByText('Active').some(el => el.tagName === 'TD')).toBe(true);
    expect(screen.getByText('Pro')).toBeInTheDocument();
  });

  it('shows error if vendor load fails', async () => {
    axios.get.mockRejectedValueOnce(new Error('fail'));
    renderWithContext(<VendorManagement />);
    await waitFor(() => {
      expect(mockShowMessage).toHaveBeenCalledWith('Failed to load vendors.', 'error');
    });
  });

  it('can suspend a vendor', async () => {
    window.prompt = jest.fn(() => 'bad conduct');
    axios.get.mockResolvedValueOnce({ data: [
      { _id: '1', name: 'Vendor1', email: 'v1@mail.com', country: 'ET', role: 'vendor', isActive: true, createdAt: '2025-08-01', productCount: 2, subscriptionPlan: 'Pro' },
    ] });
    axios.put.mockResolvedValueOnce({});
    axios.get.mockResolvedValueOnce({ data: [
      { _id: '1', name: 'Vendor1', email: 'v1@mail.com', country: 'ET', role: 'vendor', isActive: false, createdAt: '2025-08-01', productCount: 2, subscriptionPlan: 'Pro', banReason: 'bad conduct' },
    ] });
    renderWithContext(<VendorManagement />);
    fireEvent.click(await screen.findByText('Suspend'));
    await waitFor(() => {
      expect(axios.put).toHaveBeenCalled();
      expect(mockShowMessage).toHaveBeenCalledWith('Vendor suspended successfully', 'success');
      // Find the table cell with 'Suspended' (not the select option)
      expect(screen.getAllByText('Suspended').some(el => el.tagName === 'TD')).toBe(true);
      expect(screen.getByText('bad conduct')).toBeInTheDocument();
    });
  });

  it('shows error if suspend fails', async () => {
    window.prompt = jest.fn(() => 'bad conduct');
    axios.get.mockResolvedValueOnce({ data: [
      { _id: '1', name: 'Vendor1', email: 'v1@mail.com', country: 'ET', role: 'vendor', isActive: true, createdAt: '2025-08-01', productCount: 2, subscriptionPlan: 'Pro' },
    ] });
    axios.put.mockRejectedValueOnce(new Error('fail'));
    renderWithContext(<VendorManagement />);
    fireEvent.click(await screen.findByText('Suspend'));
    await waitFor(() => {
      expect(mockShowMessage).toHaveBeenCalledWith('Failed to update vendor status', 'error');
    });
  });

  it('can reactivate a vendor', async () => {
    axios.get.mockResolvedValueOnce({ data: [
      { _id: '1', name: 'Vendor1', email: 'v1@mail.com', country: 'ET', role: 'vendor', isActive: false, createdAt: '2025-08-01', productCount: 2, subscriptionPlan: 'Pro', banReason: 'bad conduct' },
    ] });
    axios.put.mockResolvedValueOnce({});
    axios.get.mockResolvedValueOnce({ data: [
      { _id: '1', name: 'Vendor1', email: 'v1@mail.com', country: 'ET', role: 'vendor', isActive: true, createdAt: '2025-08-01', productCount: 2, subscriptionPlan: 'Pro' },
    ] });
    renderWithContext(<VendorManagement />);
    fireEvent.click(await screen.findByText('Reactivate'));
    await waitFor(() => {
      expect(axios.put).toHaveBeenCalled();
      expect(mockShowMessage).toHaveBeenCalledWith('Vendor reactivated successfully', 'success');
      expect(screen.getAllByText('Active').some(el => el.tagName === 'TD')).toBe(true);
    });
  });

  it('shows error if reactivate fails', async () => {
    axios.get.mockResolvedValueOnce({ data: [
      { _id: '1', name: 'Vendor1', email: 'v1@mail.com', country: 'ET', role: 'vendor', isActive: false, createdAt: '2025-08-01', productCount: 2, subscriptionPlan: 'Pro', banReason: 'bad conduct' },
    ] });
    axios.put.mockRejectedValueOnce(new Error('fail'));
    renderWithContext(<VendorManagement />);
    fireEvent.click(await screen.findByText('Reactivate'));
    await waitFor(() => {
      expect(mockShowMessage).toHaveBeenCalledWith('Failed to update vendor status', 'error');
    });
  });

  it('can export CSV', async () => {
    axios.get.mockResolvedValueOnce({ data: [
      { _id: '1', name: 'Vendor1', email: 'v1@mail.com', country: 'ET', role: 'vendor', isActive: true, createdAt: '2025-08-01', productCount: 2, subscriptionPlan: 'Pro' },
    ] });
    renderWithContext(<VendorManagement />);
    const createElementSpy = jest.spyOn(document, 'createElement');
    fireEvent.click(screen.getByText('Export CSV'));
    expect(createElementSpy).toHaveBeenCalledWith('a');
    createElementSpy.mockRestore();
  });
});
