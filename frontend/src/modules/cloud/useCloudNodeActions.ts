import { useCallback, useState, type MouseEvent } from 'react';
import { setCloudNodeLocked, type CloudFilesApi } from '../../services/cloud/cloudApi';
import { isCloudNodeLocked, type CloudNodeDto, type CloudScope } from '../../types/cloud.types';
import { buildMoveRequest, triggerInlineDownload } from './cloudFormat';
import type { ContextMenuState } from './FinderContextMenu';

interface UseCloudNodeActionsParams {
  api: CloudFilesApi;
  scope: CloudScope;
  nodes: CloudNodeDto[];
  selectedIds: string[];
  selectOnly: (id: string) => void;
  clearSelection: () => void;
  runMutation: <T>(fn: () => Promise<T>, reload?: boolean) => Promise<T | null>;
}

export function useCloudNodeActions({
  api,
  scope,
  nodes,
  selectedIds,
  selectOnly,
  clearSelection,
  runMutation,
}: UseCloudNodeActionsParams) {
  const [renamingNode, setRenamingNode] = useState<CloudNodeDto | null>(null);
  const [movingNodes, setMovingNodes] = useState<CloudNodeDto[]>([]);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const selectedNodes = nodes.filter((n) => selectedIds.includes(n.id));

  const openContextMenu = useCallback(
    (node: CloudNodeDto, e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const inSelection = selectedIds.includes(node.id);
      if (!inSelection) selectOnly(node.id);
      const batch = inSelection ? nodes.filter((n) => selectedIds.includes(n.id)) : [node];
      setContextMenu({ x: e.clientX, y: e.clientY, targetNode: node, selectedNodes: batch });
    },
    [nodes, selectedIds, selectOnly]
  );

  const downloadNode = useCallback(
    (node: CloudNodeDto) => {
      void runMutation(() => api.getDownloadUrl(node.id), false).then((res) => {
        if (res?.url) triggerInlineDownload(res.url, node.name);
      });
    },
    [api, runMutation]
  );

  const downloadSelected = useCallback(() => {
    for (const node of selectedNodes) {
      if (node.nodeType === 'FILE') downloadNode(node);
    }
  }, [selectedNodes, downloadNode]);

  const toggleStar = useCallback(
    (node: CloudNodeDto) => {
      void runMutation(() => api.updateNode(node.id, { starred: !node.starred }));
    },
    [api, runMutation]
  );

  const toggleLock = useCallback(
    (node: CloudNodeDto) => {
      const nextLocked = !Boolean(node.locked ?? node.effectiveLocked);
      void runMutation(() =>
        api.setNodeLocked
          ? api.setNodeLocked(node.id, nextLocked)
          : setCloudNodeLocked(scope, node.id, nextLocked)
      );
    },
    [api, runMutation, scope]
  );

  const softDeleteNodes = useCallback(
    (targets: CloudNodeDto[]) => {
      const unlocked = targets.filter((n) => !isCloudNodeLocked(n));
      if (unlocked.length === 0) return;
      void runMutation(async () => {
        await Promise.all(unlocked.map((n) => api.softDeleteNode(n.id)));
        clearSelection();
      });
    },
    [api, runMutation, clearSelection]
  );

  const restoreNodes = useCallback(
    (targets: CloudNodeDto[]) => {
      void runMutation(async () => {
        await Promise.all(targets.map((n) => api.restoreNode(n.id)));
        clearSelection();
      });
    },
    [api, runMutation, clearSelection]
  );

  const permanentDeleteNodes = useCallback(
    (targets: CloudNodeDto[]) => {
      void runMutation(async () => {
        await Promise.all(targets.map((n) => api.permanentDeleteNode(n.id)));
        clearSelection();
      });
    },
    [api, runMutation, clearSelection]
  );

  const dropMoveNodes = useCallback(
    (nodeIds: string[], targetScope: CloudScope, targetParentId: string | null) => {
      void runMutation(async () => {
        await api.moveCloudNodes(buildMoveRequest(nodeIds, scope, targetScope, targetParentId));
        clearSelection();
      });
    },
    [api, scope, runMutation, clearSelection]
  );

  return {
    selectedNodes,
    renamingNode,
    setRenamingNode,
    movingNodes,
    setMovingNodes,
    contextMenu,
    setContextMenu,
    openContextMenu,
    downloadNode,
    downloadSelected,
    toggleStar,
    toggleLock,
    softDeleteNodes,
    restoreNodes,
    permanentDeleteNodes,
    dropMoveNodes,
  };
}
