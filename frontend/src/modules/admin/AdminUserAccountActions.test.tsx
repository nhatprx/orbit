import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ToastViewport } from '../../components/ui/ToastViewport';
import { clearToasts } from '../../components/ui/toastStore';
import { ApiError } from '../../services/workspace/httpClient';
import { AdminUsersPage } from './AdminUsersPage';
import { ME, detail, fakeService, pageOf, summary } from './adminTestKit';

afterEach(() => clearToasts());

async function open(service: ReturnType<typeof fakeService>) {
  render(
    <>
      <AdminUsersPage currentUser={ME} service={service} />
      <ToastViewport />
    </>
  );
  fireEvent.click(await screen.findByText('Alice Doe'));
  const dialog = await screen.findByRole('dialog', { name: 'User details' });
  await within(dialog).findByText('Platform role');
  return dialog;
}

const disabledAlice = () => ({
  status: 'DISABLED' as const,
  disabledAt: '2026-11-05T09:30:00Z',
  disabledReason: 'Spam',
  disabledByUsername: 'root',
});

describe('disabling an account', () => {
  it('passes the typed reason along, flips the row and offers to enable', async () => {
    const service = fakeService();
    service.disable.mockResolvedValue(detail(disabledAlice()));
    const dialog = await open(service);

    fireEvent.click(within(dialog).getByRole('button', { name: 'Disable account' }));
    const form = screen.getByRole('dialog', { name: 'Disable account' });
    fireEvent.change(within(form).getByLabelText('Reason (optional)'), { target: { value: '  Spam  ' } });
    expect(within(form).getByText('8 / 255')).toBeTruthy();
    fireEvent.click(within(form).getByRole('button', { name: 'Disable account' }));

    await waitFor(() => expect(service.disable).toHaveBeenCalledWith('u-alice', '  Spam  '));
    expect(await within(dialog).findByRole('button', { name: 'Enable account' })).toBeTruthy();
    expect((await screen.findByRole('status')).textContent).toContain('@alice was disabled');
    expect(within(screen.getAllByRole('row')[1]!).getByText('Disabled')).toBeTruthy();
    expect(screen.queryByRole('dialog', { name: 'Disable account' })).toBeNull();
  });

  it('works without a reason and can be cancelled without calling the server', async () => {
    const service = fakeService();
    service.disable.mockResolvedValue(detail(disabledAlice()));
    const dialog = await open(service);

    fireEvent.click(within(dialog).getByRole('button', { name: 'Disable account' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Disable account' })).getByRole('button', { name: 'Cancel' }));
    expect(service.disable).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Disable account' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Disable account' })).getByRole('button', { name: 'Disable account' }));
    await waitFor(() => expect(service.disable).toHaveBeenCalledWith('u-alice', ''));
  });

  it('keeps the form open and shows the reason the server refused', async () => {
    const service = fakeService();
    service.disable.mockRejectedValue(new ApiError(409, 'LAST_ADMIN', 'At least one active administrator must remain.'));
    const dialog = await open(service);

    fireEvent.click(within(dialog).getByRole('button', { name: 'Disable account' }));
    const form = screen.getByRole('dialog', { name: 'Disable account' });
    fireEvent.click(within(form).getByRole('button', { name: 'Disable account' }));

    expect((await within(form).findByRole('alert')).textContent).toContain('At least one active administrator must remain.');
    expect(within(screen.getAllByRole('row')[1]!).getByText('Active')).toBeTruthy();
  });
});

describe('enabling an account', () => {
  it('confirms, then shows the user as active again', async () => {
    const service = fakeService();
    service.list.mockResolvedValue(pageOf([summary({ ...disabledAlice() })]));
    service.get.mockResolvedValue(detail(disabledAlice()));
    service.enable.mockResolvedValue(detail());
    const dialog = await open(service);

    fireEvent.click(within(dialog).getByRole('button', { name: 'Enable account' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Enable account' })).getByRole('button', { name: 'Enable account' }));

    await waitFor(() => expect(service.enable).toHaveBeenCalledWith('u-alice'));
    expect(await within(dialog).findByRole('button', { name: 'Disable account' })).toBeTruthy();
    expect(within(screen.getAllByRole('row')[1]!).getByText('Active')).toBeTruthy();
  });
});

describe('signing out everywhere', () => {
  it('asks first, then ends the sessions and says so', async () => {
    const service = fakeService();
    const dialog = await open(service);

    fireEvent.click(within(dialog).getByRole('button', { name: 'Sign out everywhere' }));
    expect(service.revokeSessions).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Sign out everywhere' })).getByRole('button', { name: 'Sign out' }));

    await waitFor(() => expect(service.revokeSessions).toHaveBeenCalledWith('u-alice'));
    expect((await screen.findByRole('status')).textContent).toContain('All sessions of @alice were ended.');
  });

  it('reports a failure and leaves the confirmation open', async () => {
    const service = fakeService();
    service.revokeSessions.mockRejectedValue(new ApiError(404, 'USER_NOT_FOUND', 'User not found.'));
    const dialog = await open(service);

    fireEvent.click(within(dialog).getByRole('button', { name: 'Sign out everywhere' }));
    const confirm = screen.getByRole('dialog', { name: 'Sign out everywhere' });
    fireEvent.click(within(confirm).getByRole('button', { name: 'Sign out' }));

    expect((await within(confirm).findByRole('alert')).textContent).toContain('User not found.');
    expect(screen.queryByRole('status')).toBeNull();
  });
});
