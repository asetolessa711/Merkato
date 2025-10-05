import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import AdminRailsRegistry from '../../components/admin/AdminRailsRegistry'';

function mockFetchOnce(body, ok=true){
  global.fetch = jest.fn().mockResolvedValue({ ok, json: async()=> body });
}

describe('AdminRailsRegistry', () => {
  beforeEach(() => { jest.resetAllMocks(); });

  test('renders headers and loads rows', async () => {
    mockFetchOnce({ rails:[{ railId:'r1', title:'Rail One', tactic:'Curated', placementKey:'Hero', environment:'Prod', owner:'Marketing', opsStatus:'Active', badges:[] }], total:1, page:1, pageSize:25 });
    render(<AdminRailsRegistry />);
    // Assert table headers render (use role-based queries for stability)
    expect(screen.getByRole('columnheader', { name: 'Rail' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Tactic' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Placement' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Env' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Owner' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument();
    const railCell = await screen.findByText('Rail One');
    const row = railCell.closest('tr');
    expect(row).toBeTruthy();
    expect(within(row).getByText('Curated')).toBeInTheDocument();
    expect(within(row).getByText('Hero')).toBeInTheDocument();
  });

  test('filters trigger fetch with params', async () => {
    // First load
    mockFetchOnce({ rails:[], total:0, page:1, pageSize:25 });
    render(<AdminRailsRegistry />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());

    // Next fetch for Apply
    global.fetch = jest.fn().mockResolvedValue({ ok:true, json: async()=> ({ rails:[], total:0, page:1, pageSize:25 }) });
    fireEvent.change(screen.getByLabelText('Ops status filter'), { target:{ value:'Active' } });
    fireEvent.click(screen.getByText('Apply'));
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const url = new URL(global.fetch.mock.calls[0][0], 'http://x');
    expect(url.searchParams.get('opsStatus')).toBe('Active');
  });
});
