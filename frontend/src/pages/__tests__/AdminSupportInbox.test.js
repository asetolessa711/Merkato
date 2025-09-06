import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import { MessageContext } from '../../context/MessageContext';
import AdminSupportInbox from '../../pages/AdminSupportInbox';

jest.mock('axios');

const mockShowMessage = jest.fn();
const renderWithContext = (ui) =>
  render(
    <MessageContext.Provider value={{ showMessage: mockShowMessage }}>
      {ui}
    </MessageContext.Provider>
  );

describe('AdminSupportInbox', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('token', 'test-token');
  });

  it('shows error message when ticket update fails', async () => {
    axios.get.mockResolvedValueOnce({ data: [
      { _id: '1', user: { name: 'User', email: 'user@test.com' }, category: 'General', message: 'Help', status: 'open', createdAt: new Date() },
    ] });
    axios.put.mockRejectedValueOnce(new Error('fail'));
    renderWithContext(<AdminSupportInbox />);
    fireEvent.click(await screen.findByText('Resolve + Add Note'));
    fireEvent.click(screen.getByText('Submit Resolution'));
    await waitFor(() => {
      expect(mockShowMessage).toHaveBeenCalledWith('Failed to update ticket.', 'error');
    });
  });
});
