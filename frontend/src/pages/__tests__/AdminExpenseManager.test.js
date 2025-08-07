import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import { MessageContext } from '../../context/MessageContext';
import AdminExpenseManager from '../../pages/AdminExpenseManager';

jest.mock('axios');

const mockShowMessage = jest.fn();
const renderWithContext = (ui) =>
  render(
    <MessageContext.Provider value={{ showMessage: mockShowMessage }}>
      {ui}
    </MessageContext.Provider>
  );

describe('AdminExpenseManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('token', 'test-token');
  });

  it('shows error message when expenses fetch fails', async () => {
    axios.get.mockRejectedValueOnce(new Error('fail'));
    renderWithContext(<AdminExpenseManager />);
    await waitFor(() => {
      expect(mockShowMessage).toHaveBeenCalledWith('Failed to load expenses', 'error');
    });
  });

  it('shows success message when expense is added', async () => {
    axios.get.mockResolvedValueOnce({ data: [] });
    axios.post.mockResolvedValueOnce({});
    axios.get.mockResolvedValueOnce({ data: [] });
    renderWithContext(<AdminExpenseManager />);
    fireEvent.change(screen.getByPlaceholderText('Expense Title'), { target: { value: 'Test Expense' } });
    fireEvent.change(screen.getByPlaceholderText('Amount (USD)'), { target: { value: '100' } });
    fireEvent.click(screen.getByText('Add Expense'));
    await waitFor(() => {
      expect(mockShowMessage).toHaveBeenCalledWith('Expense added successfully!', 'success');
    });
  });

  it('shows error message when expense add fails', async () => {
    axios.get.mockResolvedValueOnce({ data: [] });
    axios.post.mockRejectedValueOnce(new Error('fail'));
    renderWithContext(<AdminExpenseManager />);
    fireEvent.change(screen.getByPlaceholderText('Expense Title'), { target: { value: 'Test Expense' } });
    fireEvent.change(screen.getByPlaceholderText('Amount (USD)'), { target: { value: '100' } });
    fireEvent.click(screen.getByText('Add Expense'));
    await waitFor(() => {
      expect(mockShowMessage).toHaveBeenCalledWith('Failed to add expense', 'error');
    });
  });
});
