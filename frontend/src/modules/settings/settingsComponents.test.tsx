import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import type { MemberDto, RoleDto } from '../../types/workspace.types';
import { MembersTable } from './MembersTable';
import { WORKSPACE_PERMISSIONS } from './permissionCatalog';
import { RoleMatrix } from './RoleMatrix';

const role = (patch: Partial<RoleDto>): RoleDto => ({
  id: 'r', scope: 'WORKSPACE', name: 'Role', system: false, immutable: false, permissions: [], memberCount: 0, createdAt: 'x', ...patch,
});

const ownerRole = role({ id: 'owner', name: 'Owner', system: true, immutable: true, permissions: WORKSPACE_PERMISSIONS.map((p) => p.key) });
const qaRole = role({ id: 'qa', name: 'QA', permissions: ['workspace.view'] });

describe('RoleMatrix', () => {
  const props = {
    roles: [ownerRole, qaRole],
    definitions: WORKSPACE_PERMISSIONS,
    callerPermissions: ['workspace.view', 'chat.read'],
    canEdit: true,
    canDelete: true,
    pendingKey: null,
    onToggle: vi.fn(),
    onDelete: vi.fn(),
  };

  it('locks the immutable Owner column', () => {
    render(<RoleMatrix {...props} />);
    const cell = screen.getByRole('checkbox', { name: 'Owner: View workspace' });
    expect(cell.hasAttribute('disabled')).toBe(true);
  });

  it('lets an editor grant only permissions they hold, but revoke any', () => {
    const onToggle = vi.fn();
    render(<RoleMatrix {...props} onToggle={onToggle} />);

    const heldButNotGranted = screen.getByRole('checkbox', { name: 'QA: Read chat' });
    const notHeld = screen.getByRole('checkbox', { name: 'QA: Delete workspace' });
    expect(notHeld.hasAttribute('disabled')).toBe(true);
    expect(heldButNotGranted.hasAttribute('disabled')).toBe(false);

    fireEvent.click(heldButNotGranted);
    expect(onToggle).toHaveBeenCalledWith(qaRole, 'chat.read', true);

    fireEvent.click(screen.getByRole('checkbox', { name: 'QA: View workspace' }));
    expect(onToggle).toHaveBeenCalledWith(qaRole, 'workspace.view', false);
  });

  it('keeps a revoke possible for a key the editor lacks', () => {
    const roleWithExtra = role({ id: 'x', name: 'Extra', permissions: ['workspace.delete'] });
    render(<RoleMatrix {...props} roles={[roleWithExtra]} />);
    expect(screen.getByRole('checkbox', { name: 'Extra: Delete workspace' }).hasAttribute('disabled')).toBe(false);
  });

  it('disables everything for read-only viewers and hides delete for system roles', () => {
    render(<RoleMatrix {...props} canEdit={false} canDelete={false} />);
    expect(screen.getByRole('checkbox', { name: 'QA: View workspace' }).hasAttribute('disabled')).toBe(true);
    expect(screen.queryByRole('button', { name: /Delete role/ })).toBeNull();
  });

  it('offers delete only for custom roles', () => {
    const onDelete = vi.fn();
    render(<RoleMatrix {...props} onDelete={onDelete} />);
    expect(screen.queryByRole('button', { name: 'Delete role Owner' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Delete role QA' }));
    expect(onDelete).toHaveBeenCalledWith(qaRole);
  });
});

describe('ConfirmDialog', () => {
  const open = (onConfirm = vi.fn().mockResolvedValue(undefined), onClose = vi.fn(), requireText = 'Acme') => {
    render(
      <ConfirmDialog open danger title="Delete workspace" message="Gone." confirmLabel="Delete" requireText={requireText} onConfirm={onConfirm} onClose={onClose} />
    );
    return { onConfirm, onClose, confirm: () => screen.getByRole('button', { name: 'Delete' }) as HTMLButtonElement };
  };

  it('requires the exact name before the destructive action is enabled (BR-08)', () => {
    const { confirm } = open();
    expect(confirm().disabled).toBe(true);
    const input = screen.getByLabelText('Type "Acme" to confirm');
    fireEvent.change(input, { target: { value: 'acme' } });
    expect(confirm().disabled).toBe(true);
    fireEvent.change(input, { target: { value: 'Acme ' } });
    expect(confirm().disabled).toBe(true);
    fireEvent.change(input, { target: { value: 'Acme' } });
    expect(confirm().disabled).toBe(false);
  });

  it('confirms once, then closes', async () => {
    const { onConfirm, onClose, confirm } = open();
    fireEvent.change(screen.getByLabelText('Type "Acme" to confirm'), { target: { value: 'Acme' } });
    fireEvent.click(confirm());
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('stays open and shows the server error when the action fails', async () => {
    const { onClose, confirm } = open(vi.fn().mockRejectedValue(new Error('Only the owner can delete this.')));
    fireEvent.change(screen.getByLabelText('Type "Acme" to confirm'), { target: { value: 'Acme' } });
    fireEvent.click(confirm());
    expect((await screen.findByRole('alert')).textContent).toBe('Only the owner can delete this.');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes on Escape and Cancel without confirming', () => {
    const { onConfirm, onClose } = open();
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(2);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

describe('MembersTable', () => {
  const member = (patch: Partial<MemberDto>): MemberDto => ({
    userId: 'u', username: 'user', displayName: 'User', email: 'u@x.dev', roleId: 'qa', roleName: 'QA', isOwner: false, joinedAt: '2026-01-01T00:00:00Z', ...patch,
  });
  const owner = member({ userId: 'o', displayName: 'Olivia', roleId: 'owner', roleName: 'Owner', isOwner: true });
  const bob = member({ userId: 'b', displayName: 'Bob' });
  const base = {
    members: [owner, bob], roles: [ownerRole, qaRole, role({ id: 'viewer', name: 'Viewer' })], currentUserId: 'b',
    canAssign: true, canRemove: true, page: 0, totalPages: 1, onPage: vi.fn(), onAssign: vi.fn().mockResolvedValue(undefined), onRemove: vi.fn().mockResolvedValue(undefined),
  };

  it('shows the owner as a badge with no role picker or removal', () => {
    render(<MembersTable {...base} currentUserId="x" />);
    const row = screen.getByText('Olivia').closest('tr')!;
    expect(within(row).getByText('Owner')).toBeTruthy();
    expect(within(row).queryByRole('combobox')).toBeNull();
    expect(within(row).queryByRole('button')).toBeNull();
  });

  it('never offers the Owner role when assigning', () => {
    render(<MembersTable {...base} currentUserId="x" />);
    const options = within(screen.getByRole('combobox', { name: 'Role of Bob' })).getAllByRole('option').map((o) => o.textContent);
    expect(options).toEqual(['QA', 'Viewer']);
  });

  it('assigns a role through the select', () => {
    const onAssign = vi.fn().mockResolvedValue(undefined);
    render(<MembersTable {...base} currentUserId="x" onAssign={onAssign} />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Role of Bob' }), { target: { value: 'viewer' } });
    expect(onAssign).toHaveBeenCalledWith(bob, 'viewer');
  });

  it('lets members leave but hides removal of others without permission', () => {
    render(<MembersTable {...base} canRemove={false} />);
    const bobRow = screen.getByText(/Bob/).closest('tr')!;
    expect(within(bobRow).getByRole('button', { name: /Leave/ })).toBeTruthy();

    render(<MembersTable {...base} canRemove={false} currentUserId="someone-else" />);
    expect(screen.queryAllByRole('button', { name: /Remove/ })).toHaveLength(0);
  });

  it('pages only when there is more than one page', () => {
    const onPage = vi.fn();
    const { rerender } = render(<MembersTable {...base} totalPages={1} />);
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull();
    rerender(<MembersTable {...base} totalPages={3} page={1} onPage={onPage} />);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(onPage).toHaveBeenNthCalledWith(1, 2);
    expect(onPage).toHaveBeenNthCalledWith(2, 0);
  });
});
