import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AdminUsersPage } from './AdminUsersPage';
import { ME, fakeService, pageOf, summary } from './adminTestKit';

function renderPage(service = fakeService(), user = ME) {
  render(<AdminUsersPage currentUser={user} service={service} />);
  return service;
}

const BASE = { q: '', role: '', status: '', sort: 'createdAt,desc', page: 0, size: 20 };

describe('AdminUsersPage', () => {
  it('shows a 403 notice to non-admins and requests nothing', () => {
    const service = renderPage(fakeService(), { ...ME, role: 'user' });

    expect(screen.getByText(/403/)).toBeTruthy();
    expect(service.list).not.toHaveBeenCalled();
    expect(service.stats).not.toHaveBeenCalled();
  });

  it('loads the newest users first with totals, role, status, two-factor and a marker for you', async () => {
    const service = fakeService();
    service.list.mockResolvedValue(
      pageOf([
        summary({ id: 'u-me', username: 'ada', displayName: 'Ada Admin', role: 'admin' }),
        summary({ id: 'u-bob', username: 'bob', displayName: 'Bob Roe', status: 'DISABLED', totpEnabled: true }),
      ])
    );
    renderPage(service);

    expect(await screen.findByText('Bob Roe')).toBeTruthy();
    expect(service.list).toHaveBeenCalledWith(BASE);
    const rows = screen.getAllByRole('row');
    expect(within(rows[1]!).getByText('(you)')).toBeTruthy();
    expect(within(rows[1]!).getByText('admin')).toBeTruthy();
    expect(within(rows[2]!).getByText('Disabled')).toBeTruthy();
    expect(within(rows[2]!).getByText('On')).toBeTruthy();
    expect(await screen.findByLabelText('User totals')).toBeTruthy();
    await waitFor(() => expect(screen.getByLabelText('User totals').textContent).toMatch(/Total users\s*3/));
    expect(screen.getByText('2 users')).toBeTruthy();
  });

  it('debounces typing into one request that starts again from the first page', async () => {
    const service = fakeService();
    service.list.mockResolvedValue(pageOf([summary()], { totalElements: 50, totalPages: 3 }));
    renderPage(service);
    await screen.findByText('Alice Doe');
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(service.list).toHaveBeenLastCalledWith({ ...BASE, page: 1 }));

    const search = screen.getByLabelText('Search');
    for (const text of ['b', 'bo', '  bob  ']) fireEvent.change(search, { target: { value: text } });

    await waitFor(() => expect(service.list).toHaveBeenLastCalledWith({ ...BASE, q: 'bob', page: 0 }), { timeout: 2000 });
    expect(service.list.mock.calls.map(([params]) => params.q)).toEqual(['', '', 'bob']);
  });

  it('applies role, status and sort filters from the first page and can clear them', async () => {
    const service = fakeService();
    renderPage(service);
    await screen.findByText('Alice Doe');

    fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'admin' } });
    await waitFor(() => expect(service.list).toHaveBeenLastCalledWith({ ...BASE, role: 'admin' }));
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'disabled' } });
    await waitFor(() => expect(service.list).toHaveBeenLastCalledWith({ ...BASE, role: 'admin', status: 'disabled' }));
    fireEvent.change(screen.getByLabelText('Sort by'), { target: { value: 'email,asc' } });
    await waitFor(() =>
      expect(service.list).toHaveBeenLastCalledWith({ ...BASE, role: 'admin', status: 'disabled', sort: 'email,asc' })
    );

    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    await waitFor(() => expect(service.list).toHaveBeenLastCalledWith({ ...BASE, sort: 'email,asc' }));
    expect((screen.getByLabelText('Role') as HTMLSelectElement).value).toBe('');
    expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull();
  });

  it('pages forward and back across 100 accounts and disables the buttons at the ends', async () => {
    const hundred = Array.from({ length: 100 }, (_, i) =>
      summary({ id: `u-${i + 1}`, username: `u_${i + 1}`, displayName: `Test User ${i + 1}`, email: `u${i + 1}@orbit.test` })
    );
    const service = fakeService();
    service.list.mockImplementation(async (p) =>
      pageOf(hundred.slice(p.page * p.size, (p.page + 1) * p.size), {
        page: p.page,
        size: p.size,
        totalElements: 100,
        totalPages: Math.ceil(100 / p.size),
      })
    );
    renderPage(service);
    const button = (name: string) => screen.getByRole('button', { name }) as HTMLButtonElement;

    expect(await screen.findByText('Test User 1')).toBeTruthy();
    expect(screen.getByText('100 users')).toBeTruthy();
    expect(screen.getByText('Page 1 of 5')).toBeTruthy();
    expect(button('Previous').disabled).toBe(true);
    fireEvent.click(button('Next'));
    expect(await screen.findByText('Page 2 of 5')).toBeTruthy();
    expect(screen.getByText('Test User 21')).toBeTruthy();
    fireEvent.click(button('Page 5'));
    expect(await screen.findByText('Page 5 of 5')).toBeTruthy();
    expect(screen.getByText('Test User 100')).toBeTruthy();
    expect(button('Next').disabled).toBe(true);
    fireEvent.click(button('Previous'));
    expect(await screen.findByText('Page 4 of 5')).toBeTruthy();
    expect(service.list).toHaveBeenLastCalledWith({ ...BASE, page: 3 });
    fireEvent.click(button('First page'));
    expect(await screen.findByText('Page 1 of 5')).toBeTruthy();
    expect(service.list).toHaveBeenLastCalledWith({ ...BASE, page: 0 });
    fireEvent.click(button('Last page'));
    expect(await screen.findByText('Page 5 of 5')).toBeTruthy();
    expect(service.list).toHaveBeenLastCalledWith({ ...BASE, page: 4 });
    fireEvent.change(screen.getByLabelText('Go to page'), { target: { value: '3' } });
    fireEvent.click(button('Go'));
    expect(await screen.findByText('Page 3 of 5')).toBeTruthy();
    expect(service.list).toHaveBeenLastCalledWith({ ...BASE, page: 2 });
    fireEvent.change(screen.getByLabelText('Rows per page'), { target: { value: '50' } });
    await waitFor(() => expect(service.list).toHaveBeenLastCalledWith({ ...BASE, page: 0, size: 50 }));
  });

  it('shows the failure and recovers on retry', async () => {
    const service = fakeService();
    service.list.mockRejectedValueOnce(new Error('Cannot reach the Orbit server.'));
    renderPage(service);
    expect((await screen.findByRole('alert')).textContent).toContain('Cannot reach the Orbit server.');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Alice Doe')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('explains an empty result', async () => {
    const service = fakeService();
    service.list.mockResolvedValue(pageOf([]));
    renderPage(service);
    expect(await screen.findByText('No users match')).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByText('0 users')).toBeTruthy();
  });

  it('refreshes both the table and the totals on demand', async () => {
    const service = renderPage();
    await screen.findByText('Alice Doe');
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await waitFor(() => expect(service.list).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(service.stats).toHaveBeenCalledTimes(2));
  });

  it('opens the right-hand user details sidebar when clicking a row', async () => {
    const service = renderPage();
    await screen.findByText('Alice Doe');
    expect(screen.queryByRole('dialog', { name: 'User details' })).toBeNull();
    fireEvent.click(screen.getByText('Alice Doe'));
    expect(await screen.findByRole('dialog', { name: 'User details' })).toBeTruthy();
    expect(service.get).toHaveBeenCalledWith('u-alice');
  });

  it('hides checkboxes for admin accounts and supports bulk actions on regular users', async () => {
    const service = fakeService();
    service.list.mockResolvedValue(
      pageOf([
        summary({ id: 'u-me', username: 'ada', displayName: 'Ada Admin', role: 'admin' }),
        summary({ id: 'u-root', username: 'root', displayName: 'Root Admin', role: 'admin' }),
        summary({ id: 'u-alice', username: 'alice', displayName: 'Alice Doe', role: 'user' }),
        summary({ id: 'u-bob', username: 'bob', displayName: 'Bob Roe', role: 'user' }),
      ])
    );
    service.changeRole.mockImplementation(async (id, role) => ({
      ...summary({ id, username: id === 'u-alice' ? 'alice' : 'bob', displayName: id === 'u-alice' ? 'Alice Doe' : 'Bob Roe', role }),
      disabledReason: null, disabledByUsername: null, country: null, organization: null,
      location: null, website: null, bio: null, linkedProviders: [], workspaces: [],
    }));
    renderPage(service);

    await screen.findByText('Bob Roe');
    expect(screen.queryByLabelText('Select ada')).toBeNull();
    expect(screen.queryByLabelText('Select root')).toBeNull();
    expect(screen.getByLabelText('Select alice')).toBeTruthy();
    expect(screen.getByLabelText('Select bob')).toBeTruthy();

    fireEvent.click(screen.getByLabelText('Select all users on page'));
    expect(screen.getByText('2 selected')).toBeTruthy();
    expect(screen.queryByRole('dialog', { name: 'User details' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Make Admin' }));
    const confirm = screen.getByRole('dialog', { name: 'Bulk change role' });
    fireEvent.change(within(confirm).getByLabelText('Type "ADMIN" to confirm'), { target: { value: 'ADMIN' } });
    fireEvent.click(within(confirm).getByRole('button', { name: 'Apply role' }));

    await waitFor(() => expect(service.changeRole).toHaveBeenCalledTimes(2));
    expect(service.changeRole).toHaveBeenCalledWith('u-alice', 'admin');
    expect(service.changeRole).toHaveBeenCalledWith('u-bob', 'admin');
    expect((await screen.findByRole('status')).textContent).toContain('Updated role to admin for 2 selected users.');
  });
});
