import type { CloudScope } from '../../types/cloud.types';
import { useScopeCatalogSync } from '../collab/useScopeCatalogSync';

export function useCloudScopeCatalogSync(
  scope: CloudScope,
  enabled: boolean,
  onRefresh: () => void
) {
  const collabScope = scope.type === 'PROJECT'
    ? { type: 'PROJECT' as const, workspaceId: scope.workspaceId, projectId: scope.projectId }
    : scope.type === 'WORKSPACE' ? { type: 'WORKSPACE' as const, workspaceId: scope.workspaceId } : null;

  useScopeCatalogSync({ scope: collabScope, module: 'cloud', enabled, onRefresh });
}
