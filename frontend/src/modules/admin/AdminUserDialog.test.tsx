import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ApiError } from '../../services/workspace/httpClient';
import { AdminUsersPage } from './AdminUsersPage';
import { ME, detail, fakeService, pageOf, summary } from './adminTestKit';

async function openAlice(service = fakeService()) {
  render(<AdminUsersPage currentUser={ME} service={service} />);
  fireEvent.click(await screen.findByText('Alice Doe'));
  const dialog = await screen.findByRole('dialog', { name: 'User details' });
  await within(dialog).findByText('Platform role');
  return { service, dialog };
}

const confirmDialog = (name: string) => screen.getByRole('dialog', { name });

describe('AdminUserDialog: profile', () => {
  it('shows the profile details without ever asking for secrets', async () => {
    const service = fakeService();
    service.get.mockResolvedValue(
      detail({
        organization: 'Orbit Labs',
      })
    );
    const { dialog } = await openAlice(service);

    expect(service.get).toHaveBeenCalledWith('u-alice');
    for (const text of ['alice@orbit.test', 'Vietnam', 'Orbit Labs']) {
      expect(within(dialog).getByText(text)).toBeTruthy();
    }
    expect(dialog.textContent).not.toMatch(/password|secret/i);
  });

  it('explains who disabled an account and why', async () => {
    const service = fakeService();
    service.get.mockResolvedValue(
      detail({ status: 'DISABLED', disabledAt: '2026-11-05T09:30:00Z', disabledReason: 'Spam links', disabledByUsername: 'root' })
    );
    const { dialog } = await openAlice(service);

    const note = within(dialog).getByRole('note');
    expect(note.textContent).toContain('@root');
    expect(note.textContent).toContain('Spam links');
  });

  it('reports a load failure inside the dialog and can retry', async () => {
    const service = fakeService();
    service.get.mockRejectedValueOnce(new ApiError(404, 'USER_NOT_FOUND', 'User not found.'));
    render(<AdminUsersPage currentUser={ME} service={service} />);
    fireEvent.click(await screen.findByText('Alice Doe'));

    const dialog = await screen.findByRole('dialog', { name: 'User details' });
    expect((await within(dialog).findByRole('alert')).textContent).toContain('User not found.');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Retry' }));

    expect(await within(dialog).findByText('Platform role')).toBeTruthy();
  });

  it('closes with the close button and forgets the previous user', async () => {
    const { dialog } = await openAlice();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Close dialog' }));

    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('AdminUserDialog: role', () => {
  it('asks for manual typing confirmation when promoting to admin, then updates the dialog and the table row', async () => {
    const service = fakeService();
    service.changeRole.mockResolvedValue(detail({ role: 'admin' }));
    const { dialog } = await openAlice(service);

    const change = within(dialog).getByRole('button', { name: 'Change role' }) as HTMLButtonElement;
    expect(change.disabled).toBe(true);
    fireEvent.change(within(dialog).getByLabelText('Role'), { target: { value: 'admin' } });
    fireEvent.click(change);
    expect(service.changeRole).not.toHaveBeenCalled();

    const confirm = confirmDialog('Change role');
    const confirmBtn = within(confirm).getByRole('button', { name: 'Change role' }) as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(true);
    fireEvent.change(within(confirm).getByLabelText('Type "alice" to confirm'), { target: { value: 'alice' } });
    expect(confirmBtn.disabled).toBe(false);
    fireEvent.click(confirmBtn);

    await waitFor(() => expect(service.changeRole).toHaveBeenCalledWith('u-alice', 'admin'));
    expect((await within(dialog).findByRole('status')).textContent).toContain('Role changed to admin');
    await waitFor(() => expect(within(screen.getAllByRole('row')[1]!).getByText('admin')).toBeTruthy());
  });

  it('keeps a server refusal inside the confirmation and leaves everything unchanged', async () => {
    const service = fakeService();
    service.list.mockResolvedValue(pageOf([summary({ role: 'user' })]));
    service.get.mockResolvedValue(detail({ role: 'user' }));
    service.changeRole.mockRejectedValue(
      new ApiError(409, 'ROLE_CHANGE_BLOCKED', 'Cannot promote this account right now.')
    );
    const { dialog } = await openAlice(service);

    fireEvent.change(within(dialog).getByLabelText('Role'), { target: { value: 'admin' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Change role' }));
    const confirm = confirmDialog('Change role');
    fireEvent.change(within(confirm).getByLabelText('Type "alice" to confirm'), { target: { value: 'alice' } });
    fireEvent.click(within(confirm).getByRole('button', { name: 'Change role' }));

    const alert = await within(confirm).findByRole('alert');
    expect(alert.textContent).toContain('Cannot promote this account right now.');
    expect(within(screen.getAllByRole('row')[1]!).getByText('user')).toBeTruthy();
    expect(within(dialog).queryByRole('status')).toBeNull();
  });
});

describe('AdminUserDialog: administrator protection', () => {
  it('cannot modify your own account from here', async () => {
    const service = fakeService();
    service.list.mockResolvedValue(pageOf([summary({ id: 'u-me', username: 'ada', displayName: 'Ada Admin', role: 'admin' })]));
    service.get.mockResolvedValue(detail({ id: 'u-me', username: 'ada', displayName: 'Ada Admin', role: 'admin' }));
    render(<AdminUsersPage currentUser={ME} service={service} />);
    fireEvent.click(await screen.findByText('Ada Admin'));
    const dialog = await screen.findByRole('dialog', { name: 'User details' });
    await within(dialog).findByText('Platform role');

    for (const name of ['Change role', 'Disable account', 'Sign out everywhere']) {
      expect((within(dialog).getByRole('button', { name }) as HTMLButtonElement).disabled).toBe(true);
    }
    expect((within(dialog).getByLabelText('Role') as HTMLSelectElement).disabled).toBe(true);
    expect(within(dialog).getByText(/cannot change your own account/)).toBeTruthy();
  });

  it('prevents an admin from disabling or modifying another admin account', async () => {
    const service = fakeService();
    service.list.mockResolvedValue(pageOf([summary({ id: 'u-other-admin', username: 'root', displayName: 'Root Admin', role: 'admin' })]));
    service.get.mockResolvedValue(detail({ id: 'u-other-admin', username: 'root', displayName: 'Root Admin', role: 'admin' }));
    render(<AdminUsersPage currentUser={ME} service={service} />);
    fireEvent.click(await screen.findByText('Root Admin'));
    const dialog = await screen.findByRole('dialog', { name: 'User details' });
    await within(dialog).findByText('Platform role');

    for (const name of ['Change role', 'Disable account', 'Sign out everywhere']) {
      expect((within(dialog).getByRole('button', { name }) as HTMLButtonElement).disabled).toBe(true);
    }
    expect((within(dialog).getByLabelText('Role') as HTMLSelectElement).disabled).toBe(true);
    expect(within(dialog).getByText(/Administrators cannot modify or disable other administrator accounts/)).toBeTruthy();
  });
});
