import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import { MessageContext } from '../../context/MessageContext';
import AdminDeliveryOptions from '../../pages/AdminDeliveryOptions';

jest.mock('axios');

const mockShowMessage = jest.fn();
const renderWithContext = (ui) =>
  render(
    <MessageContext.Provider value={{ showMessage: mockShowMessage }}>
      {ui}
    </MessageContext.Provider>
  );

describe('AdminDeliveryOptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('token', 'test-token');
  });

  it('renders delivery options table', async () => {
    axios.get.mockResolvedValueOnce({ data: [
      { _id: '1', name: 'Standard', description: '', days: '3-5', cost: 5, isActive: true },
    ] });
    renderWithContext(<AdminDeliveryOptions />);
    expect(await screen.findByText('📦 Delivery Options')).toBeInTheDocument();
    expect(await screen.findByText('Standard')).toBeInTheDocument();
    expect(screen.getByText('$5.00')).toBeInTheDocument();
    expect(screen.getByText('✅ Active')).toBeInTheDocument();
  });

  it('shows error if fetch fails', async () => {
    axios.get.mockRejectedValueOnce(new Error('fail'));
    renderWithContext(<AdminDeliveryOptions />);
    await waitFor(() => {
      expect(mockShowMessage).toHaveBeenCalledWith('Failed to fetch delivery options', 'error');
    });
  });

  it('can add a delivery option', async () => {
    axios.get.mockResolvedValueOnce({ data: [] });
    axios.post.mockResolvedValueOnce({});
    axios.get.mockResolvedValueOnce({ data: [
      { _id: '2', name: 'Express', description: '', days: '1-2', cost: 10, isActive: true },
    ] });
    renderWithContext(<AdminDeliveryOptions />);
    fireEvent.change(screen.getByPlaceholderText('Name (e.g. Standard)'), { target: { value: 'Express' } });
    fireEvent.change(screen.getByPlaceholderText('Delivery Days (e.g. 3-5 days)'), { target: { value: '1-2' } });
    fireEvent.change(screen.getByPlaceholderText('Cost (e.g. 5.00)'), { target: { value: '10' } });
    fireEvent.click(screen.getByText('Add Delivery Option'));
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalled();
      expect(mockShowMessage).toHaveBeenCalledWith('Delivery option added successfully', 'success');
      expect(screen.getByText('Express')).toBeInTheDocument();
    });
  });

  it('shows error if add fails', async () => {
    axios.get.mockResolvedValueOnce({ data: [] });
    axios.post.mockRejectedValueOnce(new Error('fail'));
    renderWithContext(<AdminDeliveryOptions />);
    fireEvent.change(screen.getByPlaceholderText('Name (e.g. Standard)'), { target: { value: 'Express' } });
    fireEvent.change(screen.getByPlaceholderText('Delivery Days (e.g. 3-5 days)'), { target: { value: '1-2' } });
    fireEvent.click(screen.getByText('Add Delivery Option'));
    await waitFor(() => {
      expect(mockShowMessage).toHaveBeenCalledWith('Failed to save delivery option', 'error');
    });
  });

  it('can edit a delivery option', async () => {
    axios.get.mockResolvedValueOnce({ data: [
      { _id: '1', name: 'Standard', description: '', days: '3-5', cost: 5, isActive: true },
    ] });
    axios.put.mockResolvedValueOnce({});
    axios.get.mockResolvedValueOnce({ data: [
      { _id: '1', name: 'Standard', description: '', days: '3-5', cost: 5, isActive: true },
    ] });
    renderWithContext(<AdminDeliveryOptions />);
    fireEvent.click(await screen.findByText('Edit'));
    fireEvent.change(screen.getByPlaceholderText('Name (e.g. Standard)'), { target: { value: 'Standard Updated' } });
    fireEvent.click(screen.getByText('Update Delivery Option'));
    await waitFor(() => {
      expect(axios.put).toHaveBeenCalled();
      expect(mockShowMessage).toHaveBeenCalledWith('Delivery option updated successfully', 'success');
    });
  });

  it('shows error if edit fails', async () => {
    axios.get.mockResolvedValueOnce({ data: [
      { _id: '1', name: 'Standard', description: '', days: '3-5', cost: 5, isActive: true },
    ] });
    axios.put.mockRejectedValueOnce(new Error('fail'));
    renderWithContext(<AdminDeliveryOptions />);
    fireEvent.click(await screen.findByText('Edit'));
    fireEvent.click(screen.getByText('Update Delivery Option'));
    await waitFor(() => {
      expect(mockShowMessage).toHaveBeenCalledWith('Failed to save delivery option', 'error');
    });
  });

  it('can delete a delivery option', async () => {
    window.confirm = jest.fn(() => true);
    axios.get.mockResolvedValueOnce({ data: [
      { _id: '1', name: 'Standard', description: '', days: '3-5', cost: 5, isActive: true },
    ] });
    axios.delete.mockResolvedValueOnce({});
    axios.get.mockResolvedValueOnce({ data: [] });
    renderWithContext(<AdminDeliveryOptions />);
    fireEvent.click(await screen.findByText('Delete'));
    await waitFor(() => {
      expect(axios.delete).toHaveBeenCalled();
      expect(mockShowMessage).toHaveBeenCalledWith('Delivery option deleted', 'success');
    });
  });

  it('shows error if delete fails', async () => {
    window.confirm = jest.fn(() => true);
    axios.get.mockResolvedValueOnce({ data: [
      { _id: '1', name: 'Standard', description: '', days: '3-5', cost: 5, isActive: true },
    ] });
    axios.delete.mockRejectedValueOnce(new Error('fail'));
    renderWithContext(<AdminDeliveryOptions />);
    fireEvent.click(await screen.findByText('Delete'));
    await waitFor(() => {
      expect(mockShowMessage).toHaveBeenCalledWith('Failed to delete delivery option', 'error');
    });
  });
});
