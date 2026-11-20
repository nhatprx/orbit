import { Trash2 } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { SquareCheckbox } from '../../components/ui/SquareCheckbox';
import type { RoleDto } from '../../types/workspace.types';
import { pluralize } from '../../utils/format';
import { groupPermissions, type PermissionDef } from './permissionCatalog';

interface RoleMatrixProps {
  roles: RoleDto[];
  definitions: PermissionDef[];
  /** Keys the signed-in user holds; a role can only gain keys the editor already has. */
  callerPermissions: readonly string[];
  canEdit: boolean;
  canDelete: boolean;
  pendingKey: string | null;
  onToggle: (role: RoleDto, key: string, enabled: boolean) => void;
  onDelete: (role: RoleDto) => void;
}

export function RoleMatrix({
  roles,
  definitions,
  callerPermissions,
  canEdit,
  canDelete,
  pendingKey,
  onToggle,
  onDelete,
}: RoleMatrixProps) {
  const groups = groupPermissions(definitions);

  return (
    <div className="overflow-x-auto border border-[#30363D]">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-[#30363D] bg-[#0D1117]">
            <th scope="col" className="px-3 py-2 text-left font-medium text-[#8B949E]">
              Permission
            </th>
            {roles.map((role) => (
              <th key={role.id} scope="col" className="min-w-28 px-3 py-2 text-left align-top">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-[#E6EDF3]">{role.name}</span>
                  {canDelete && !role.system && (
                    <button
                      type="button"
                      aria-label={`Delete role ${role.name}`}
                      title="Delete role"
                      onClick={() => onDelete(role)}
                      className="text-[#7D8590] hover:text-[#EF4444]"
                    >
                      <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                    </button>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  {role.system && <Badge tone="neutral">{role.immutable ? 'Locked' : 'System'}</Badge>}
                  <span className="font-mono text-[10px] text-[#7D8590]">{pluralize(role.memberCount, 'member')}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <GroupRows
              key={group.group}
              group={group.group}
              items={group.items}
              roles={roles}
              callerPermissions={callerPermissions}
              canEdit={canEdit}
              pendingKey={pendingKey}
              onToggle={onToggle}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GroupRows({
  group,
  items,
  roles,
  callerPermissions,
  canEdit,
  pendingKey,
  onToggle,
}: Pick<RoleMatrixProps, 'roles' | 'callerPermissions' | 'canEdit' | 'pendingKey' | 'onToggle'> & {
  group: string;
  items: PermissionDef[];
}) {
  return (
    <>
      <tr className="bg-[#0D1117]">
        <th
          scope="rowgroup"
          colSpan={roles.length + 1}
          className="px-3 py-1.5 text-left font-mono text-[10px] uppercase tracking-widest text-[#7D8590]"
        >
          {group}
        </th>
      </tr>
      {items.map((def) => (
        <tr key={def.key} className="border-t border-[#30363D]">
          <th scope="row" className="px-3 py-2 text-left font-normal text-[#E6EDF3]">
            {def.label}
            <span className="ml-2 font-mono text-[10px] text-[#7D8590]">{def.key}</span>
          </th>
          {roles.map((role) => {
            const checked = role.permissions.includes(def.key);
            const lacksKey = !checked && !callerPermissions.includes(def.key);
            const busy = pendingKey === `${role.id}:${def.key}`;
            return (
              <td key={role.id} className="px-3 py-2">
                <SquareCheckbox
                  checked={checked}
                  label={`${role.name}: ${def.label}`}
                  disabled={!canEdit || role.immutable || lacksKey || busy}
                  onChange={(next) => onToggle(role, def.key, next)}
                />
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}
