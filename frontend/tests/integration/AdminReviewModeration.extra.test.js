import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import { MessageProvider } from '../../src/context/MessageContext';
import ReviewModeration from '../../src/components/admin/ReviewModeration';

jest.mock('axios');

describe('AdminReviewModeration (Extra Scenarios)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('token', 'admin-token');
  });

  function setup(reviews = []) {
    axios.get.mockResolvedValueOnce({ data: reviews });
    return render(
      <MessageProvider>
        <ReviewModeration />
      </MessageProvider>
    );
  }

  it('shows empty state if no flagged reviews', async () => {
    setup([]);
    expect(await screen.findByText(/no flagged reviews/i)).toBeInTheDocument();
  });

  it('shows error if hide is called on already hidden review', async () => {
    const review = { _id: '1', product: { name: 'Test Product' }, user: { name: 'User' }, rating: 2, comment: 'Already hidden', flagged: true, hidden: true };
    axios.get.mockResolvedValueOnce({ data: [review] });
    axios.put.mockRejectedValueOnce({ response: { data: { message: 'Review already hidden' } } });
    render(
      <MessageProvider>
        <ReviewModeration />
      </MessageProvider>
    );
    fireEvent.click(await screen.findByRole('button', { name: /hide/i }));
    await waitFor(() => {
      expect(screen.getByText(/review already hidden/i)).toBeInTheDocument();
    });
  });

  it('shows error if unhide is called on already unhidden review', async () => {
    const review = { _id: '1', product: { name: 'Test Product' }, user: { name: 'User' }, rating: 2, comment: 'Already unhidden', flagged: true, hidden: false };
    axios.get.mockResolvedValueOnce({ data: [review] });
    axios.put.mockRejectedValueOnce({ response: { data: { message: 'Review already unhidden' } } });
    render(
      <MessageProvider>
        <ReviewModeration />
      </MessageProvider>
    );
    fireEvent.click(await screen.findByRole('button', { name: /unhide/i }));
    await waitFor(() => {
      expect(screen.getByText(/review already unhidden/i)).toBeInTheDocument();
    });
  });

  it('shows error if delete is called on already deleted review', async () => {
    const review = { _id: '1', product: { name: 'Test Product' }, user: { name: 'User' }, rating: 2, comment: 'To be deleted', flagged: true, hidden: false };
    axios.get.mockResolvedValueOnce({ data: [review] });
    axios.delete.mockRejectedValueOnce({ response: { data: { message: 'Review not found' } } });
    render(
      <MessageProvider>
        <ReviewModeration />
      </MessageProvider>
    );
    fireEvent.click(await screen.findByRole('button', { name: /delete/i }));
    await waitFor(() => {
      expect(screen.getByText(/review not found/i)).toBeInTheDocument();
    });
  });

  it('handles network error for all actions', async () => {
    const review = { _id: '1', product: { name: 'Test Product' }, user: { name: 'User' }, rating: 2, comment: 'Network error', flagged: true, hidden: false };
    axios.get.mockResolvedValueOnce({ data: [review] });
    axios.put.mockRejectedValueOnce(new Error('Network error'));
    render(
      <MessageProvider>
        <ReviewModeration />
      </MessageProvider>
    );
    fireEvent.click(await screen.findByRole('button', { name: /hide/i }));
    await waitFor(() => {
      expect(screen.getByText(/failed to hide review/i)).toBeInTheDocument();
    });
  });
});
