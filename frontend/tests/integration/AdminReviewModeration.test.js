import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import { MessageProvider } from '../../src/context/MessageContext';
import ReviewModeration from '../../src/components/admin/ReviewModeration';

jest.mock('axios');
// Ensure axios.patch is a mock function for hide/unhide actions
axios.patch = jest.fn();

const mockReviews = [
  { _id: '1', product: { name: 'Test Product' }, user: { name: 'User' }, rating: 2, comment: 'Needs moderation', flagged: true, hidden: false },
];

describe('AdminReviewModeration (E2E)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('token', 'admin-token');
  });

  function setup() {
    return render(
      <MessageProvider>
        <ReviewModeration />
      </MessageProvider>
    );
  }

  it('shows flagged reviews', async () => {
    axios.get.mockResolvedValueOnce({ data: mockReviews });
    setup();
    expect(await screen.findByText('Needs moderation')).toBeInTheDocument();
    expect(screen.getByText('Test Product')).toBeInTheDocument();
  });

  it('shows error if fetch fails', async () => {
    axios.get.mockRejectedValueOnce(new Error('fail'));
    setup();
    expect(await screen.findByText(/failed to fetch/i)).toBeInTheDocument();
  });

  it('can hide a review and shows success message', async () => {
    axios.get.mockResolvedValueOnce({ data: mockReviews });
    axios.patch.mockResolvedValueOnce({ data: { ...mockReviews[0], hidden: true } });
    setup();
    fireEvent.click(await screen.findByRole('button', { name: /hide/i }));
    await waitFor(() => {
      expect(screen.getByText(/review hidden/i)).toBeInTheDocument();
    });
  });

  it('shows error if hide fails', async () => {
    axios.get.mockResolvedValueOnce({ data: mockReviews });
    axios.patch.mockRejectedValueOnce(new Error('fail'));
    setup();
    fireEvent.click(await screen.findByRole('button', { name: /hide/i }));
    await waitFor(() => {
      expect(screen.getByText(/failed to hide review/i)).toBeInTheDocument();
    });
  });

  it('can unhide a review and shows success message', async () => {
    axios.get.mockResolvedValueOnce({ data: [{ ...mockReviews[0], hidden: true }] });
    axios.patch.mockResolvedValueOnce({ data: { ...mockReviews[0], hidden: false } });
    setup();
    fireEvent.click(await screen.findByRole('button', { name: /unhide/i }));
    await waitFor(() => {
      expect(screen.getByText(/review unhidden/i)).toBeInTheDocument();
    });
  });

  it('shows error if unhide fails', async () => {
    axios.get.mockResolvedValueOnce({ data: [{ ...mockReviews[0], hidden: true }] });
    axios.patch.mockRejectedValueOnce(new Error('fail'));
    setup();
    fireEvent.click(await screen.findByRole('button', { name: /unhide/i }));
    await waitFor(() => {
      expect(screen.getByText(/failed to unhide review/i)).toBeInTheDocument();
    });
  });

  it('can delete a review and shows success message', async () => {
    axios.get.mockResolvedValueOnce({ data: mockReviews });
    axios.delete.mockResolvedValueOnce({});
    setup();
    fireEvent.click(await screen.findByRole('button', { name: /delete/i }));
    await waitFor(() => {
      expect(screen.getByText(/review deleted/i)).toBeInTheDocument();
    });
  });

  it('shows error if delete fails', async () => {
    axios.get.mockResolvedValueOnce({ data: mockReviews });
    axios.delete.mockRejectedValueOnce(new Error('fail'));
    setup();
    fireEvent.click(await screen.findByRole('button', { name: /delete/i }));
    await waitFor(() => {
      expect(screen.getByText(/failed to delete review/i)).toBeInTheDocument();
    });
  });
});
