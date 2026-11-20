import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { TextField } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import type { CreateRoleRequest, RoleDto, UpdateRoleRequest } from '../../types/workspace.types';
import type { PermissionDef } from './permissionCatalog';
import { RoleMatrix } from './RoleMatrix';

export interface RoleApi {
  create: (request: CreateRoleRequest) => Promise<RoleDto>;
  update: (roleId: string, request: UpdateRoleRequest) => Promise<RoleDto>;
  remove: (roleId: string) => Promise<void>;
}

interface RolesManagerProps {
  roles: RoleDto[];
  definitions: PermissionDef[];
  callerPermissions: readonly string[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  /** Key every new role starts with so it can at least view its scope. */
  baselineKey: string;
  api: RoleApi;
  onChanged: () => void;
}

/** Scope-agnostic custom-role editor used for both Workspace and Project roles (D-13). */
export function RolesManager({
  roles,
  definitions,
  callerPermissions,
  canCreate,
  canEdit,
  canDelete,
  baselineKey,
  api,
  onChanged,
}: RolesManagerProps) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<RoleDto | null>(null);

  const create = useAsyncAction(async () => {
    await api.create({ name: name.trim(), permissions: [baselineKey] });
    setName('');
    setCreating(false);
    onChanged();
  });
  const toggle = useAsyncAction(async (role: RoleDto, key: string, enabled: boolean) => {
    setPendingKey(`${role.id}:${key}`);
    try {
      const next = enabled ? [...role.permissions, key] : role.permissions.filter((k) => k !== key);
      await api.update(role.id, { permissions: next });
      onChanged();
    } finally {
      setPendingKey(null);
    }
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[#8B949E]">
          Roles are permission sets. You can only grant permissions you hold yourself, and the Owner role is locked.
        </p>
        {canCreate && (
          <Button type="button" variant="primary" onClick={() => setCreating(true)}>
            <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
            New role
          </Button>
        )}
      </div>

      {toggle.error && (
        <p role="alert" className="text-xs text-[#EF4444]">
          {toggle.error}
        </p>
      )}

      <RoleMatrix
        roles={roles}
        definitions={definitions}
        callerPermissions={callerPermissions}
        canEdit={canEdit}
        canDelete={canDelete}
        pendingKey={pendingKey}
        onToggle={(role, key, enabled) => void toggle.run(role, key, enabled)}
        onDelete={setToDelete}
      />

      <Modal open={creating} title="Create Role" onClose={() => setCreating(false)}>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (name.trim()) void create.run();
          }}
        >
          <TextField
            label="Role name"
            autoFocus
            maxLength={50}
            value={name}
            error={create.error}
            placeholder="QA"
            onChange={(e) => setName(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={create.pending || !name.trim()}>
              {create.pending ? 'Creating...' : 'Create role'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={toDelete !== null}
        danger
        title="Delete role"
        message={`Delete the role "${toDelete?.name ?? ''}"? A role that still has members cannot be deleted; reassign them first.`}
        confirmLabel="Delete role"
        onConfirm={async () => {
          if (!toDelete) return;
          await api.remove(toDelete.id);
          onChanged();
        }}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}
