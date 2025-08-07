import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import { MessageContext } from '../../context/MessageContext';
import AdminFeedbackInbox from '../../pages/AdminFeedbackInbox';

jest.mock('axios');

const mockShowMessage = jest.fn();
const renderWithContext = (ui) =>
  render(
    <MessageContext.Provider value={{ showMessage: mockShowMessage }}>
      {ui}
    </MessageContext.Provider>
  );

describe('AdminFeedbackInbox', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('token', 'test-token');
  });

  it('shows error message when feedback fetch fails', async () => {
    axios.get.mockRejectedValueOnce(new Error('fail'));
    renderWithContext(<AdminFeedbackInbox />);
    await waitFor(() => {
      expect(mockShowMessage).toHaveBeenCalledWith('Access denied or something went wrong.', 'error');
    });
  });
});
