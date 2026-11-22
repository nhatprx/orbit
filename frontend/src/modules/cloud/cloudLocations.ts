import { useMemo } from 'react';
import { useStore } from '../../store/createStore';
import { workspaceStore } from '../../store/workspaceStore';
import {
  cloudScopeKey,
  resolveCloudPermissions,
  type CloudScope,
} from '../../types/cloud.types';

export interface CloudLocationOption {
  key: string;
  label: string;
  subtitle: string;
  scope: CloudScope;
  canRead: boolean;
  canWrite: boolean;
}

function toOption(scope: CloudScope, label: string, subtitle: string): CloudLocationOption {
  const perms = resolveCloudPermissions(scope);
  return {
    key: cloudScopeKey(scope),
    label,
    subtitle,
    scope,
    canRead: perms.canRead,
    canWrite: perms.canWrite,
  };
}

/** Collects Personal Cloud, active Workspace, and its Projects for Finder Locations & cross-scope Move. */
export function useCloudLocations(initialScope: CloudScope, initialScopeLabel?: string): CloudLocationOption[] {
  const wsState = useStore(workspaceStore, (s) => s);

  return useMemo(() => {
    const items: CloudLocationOption[] = [];
    const seen = new Set<string>();

    const push = (opt: CloudLocationOption) => {
      if (seen.has(opt.key)) return;
      seen.add(opt.key);
      items.push(opt);
    };

    push(toOption({ type: 'USER' }, 'Personal Cloud', 'Private user storage'));

    const activeWs =
      wsState.workspaces.find((w) => w.id === wsState.activeWorkspaceId) ??
      (initialScope.type !== 'USER'
        ? wsState.workspaces.find((w) => w.id === initialScope.workspaceId)
        : null) ??
      null;

    if (activeWs) {
      push(
        toOption(
          { type: 'WORKSPACE', workspaceId: activeWs.id, permissions: activeWs.myPermissions },
          activeWs.name,
          'Workspace'
        )
      );
      for (const proj of wsState.projects) {
        if (proj.workspaceId !== activeWs.id) continue;
        push(
          toOption(
            {
              type: 'PROJECT',
              workspaceId: proj.workspaceId,
              projectId: proj.id,
              permissions: proj.myPermissions,
            },
            proj.name,
            'Project'
          )
        );
      }
    }

    const initKey = cloudScopeKey(initialScope);
    if (!seen.has(initKey)) {
      const fallbackLabel =
        initialScopeLabel ??
        (initialScope.type === 'WORKSPACE' ? 'Workspace Cloud' : 'Project Cloud');
      push(
        toOption(
          initialScope,
          fallbackLabel,
          initialScope.type === 'WORKSPACE' ? 'Workspace' : 'Project'
        )
      );
    }

    return items;
  }, [wsState.workspaces, wsState.activeWorkspaceId, wsState.projects, initialScope, initialScopeLabel]);
}
