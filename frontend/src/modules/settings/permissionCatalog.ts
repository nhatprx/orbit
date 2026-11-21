export interface PermissionDef {
  key: string;
  label: string;
  group: string;
}

/** Workspace-level permission keys (docs/WORKSPACE_SPEC.md section 6). */
export const WORKSPACE_PERMISSIONS: PermissionDef[] = [
  { key: 'workspace.view', label: 'View workspace', group: 'Workspace' },
  { key: 'workspace.edit', label: 'Edit workspace details', group: 'Workspace' },
  { key: 'workspace.delete', label: 'Delete workspace', group: 'Workspace' },
  { key: 'workspace.transfer_owner', label: 'Transfer ownership', group: 'Workspace' },
  { key: 'member.view', label: 'View members', group: 'Members' },
  { key: 'member.invite', label: 'Invite members', group: 'Members' },
  { key: 'member.remove', label: 'Remove members', group: 'Members' },
  { key: 'member.assign_role', label: 'Assign roles', group: 'Members' },
  { key: 'role.view', label: 'View roles', group: 'Roles' },
  { key: 'role.create', label: 'Create roles', group: 'Roles' },
  { key: 'role.edit', label: 'Edit roles', group: 'Roles' },
  { key: 'role.delete', label: 'Delete roles', group: 'Roles' },
  { key: 'module.enable', label: 'Enable modules', group: 'Modules' },
  { key: 'module.disable', label: 'Disable modules', group: 'Modules' },
  { key: 'integration.manage', label: 'Manage integrations', group: 'Integrations' },
  { key: 'project.create', label: 'Create projects', group: 'Projects' },
  { key: 'project.view_all', label: 'Access every project', group: 'Projects' },
  { key: 'chat.read', label: 'Read chat', group: 'Chat' },
  { key: 'chat.write', label: 'Write in chat', group: 'Chat' },
  { key: 'chat.manage', label: 'Manage chat', group: 'Chat' },
  { key: 'files.read', label: 'Read cloud files', group: 'Cloud Files' },
  { key: 'files.write', label: 'Upload and edit cloud files', group: 'Cloud Files' },
  { key: 'files.delete', label: 'Delete cloud files', group: 'Cloud Files' },
  { key: 'files.manage', label: 'Manage cloud files and trash', group: 'Cloud Files' },
  { key: 'git.read', label: 'Read repositories and commits', group: 'Git' },
  { key: 'git.write', label: 'Create and edit files, branches, and PRs', group: 'Git' },
  { key: 'git.delete', label: 'Delete files and branches', group: 'Git' },
  { key: 'git.manage', label: 'Connect GitHub token and repository', group: 'Git' },
  { key: 'issues.read', label: 'Read issues and sprints', group: 'Issues & Sprints' },
  { key: 'issues.write', label: 'Create and edit issues and sprints', group: 'Issues & Sprints' },
  { key: 'issues.delete', label: 'Delete issues and sprints', group: 'Issues & Sprints' },
  { key: 'issues.manage', label: 'Manage sprint lifecycle and issue settings', group: 'Issues & Sprints' },
];

/** Project-level permission keys. */
export const PROJECT_PERMISSIONS: PermissionDef[] = [
  { key: 'project.view', label: 'View project', group: 'Project' },
  { key: 'project.edit', label: 'Edit project details', group: 'Project' },
  { key: 'project.delete', label: 'Delete project', group: 'Project' },
  { key: 'pmember.invite', label: 'Add members', group: 'Members' },
  { key: 'pmember.remove', label: 'Remove members', group: 'Members' },
  { key: 'pmember.assign_role', label: 'Assign roles', group: 'Members' },
  { key: 'prole.create', label: 'Create roles', group: 'Roles' },
  { key: 'prole.edit', label: 'Edit roles', group: 'Roles' },
  { key: 'prole.delete', label: 'Delete roles', group: 'Roles' },
  { key: 'pmodule.select', label: 'Choose modules', group: 'Modules' },
  { key: 'pchat.read', label: 'Read chat', group: 'Chat' },
  { key: 'pchat.write', label: 'Write in chat', group: 'Chat' },
  { key: 'pchat.manage', label: 'Manage chat', group: 'Chat' },
  { key: 'pfiles.read', label: 'Read cloud files', group: 'Cloud Files' },
  { key: 'pfiles.write', label: 'Upload and edit cloud files', group: 'Cloud Files' },
  { key: 'pfiles.delete', label: 'Delete cloud files', group: 'Cloud Files' },
  { key: 'pfiles.manage', label: 'Manage cloud files and trash', group: 'Cloud Files' },
  { key: 'pgit.read', label: 'Read repositories and commits', group: 'Git' },
  { key: 'pgit.write', label: 'Create and edit files, branches, and PRs', group: 'Git' },
  { key: 'pgit.delete', label: 'Delete files and branches', group: 'Git' },
  { key: 'pgit.manage', label: 'Connect GitHub token and repository', group: 'Git' },
  { key: 'pissues.read', label: 'Read issues and sprints', group: 'Issues & Sprints' },
  { key: 'pissues.write', label: 'Create and edit issues and sprints', group: 'Issues & Sprints' },
  { key: 'pissues.delete', label: 'Delete issues and sprints', group: 'Issues & Sprints' },
  { key: 'pissues.manage', label: 'Manage sprint lifecycle and issue settings', group: 'Issues & Sprints' },
];

export interface PermissionGroup {
  group: string;
  items: PermissionDef[];
}

export function groupPermissions(defs: PermissionDef[]): PermissionGroup[] {
  const groups: PermissionGroup[] = [];
  for (const def of defs) {
    const last = groups[groups.length - 1];
    if (last && last.group === def.group) last.items.push(def);
    else groups.push({ group: def.group, items: [def] });
  }
  return groups;
}

/** True when the permission list contains the key. */
export function can(permissions: readonly string[], key: string): boolean {
  return permissions.includes(key);
}
