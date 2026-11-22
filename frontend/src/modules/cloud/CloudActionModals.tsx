import type { CloudFilesApi } from '../../services/cloud/cloudApi';
import type {
  CloudNodeDto,
  CloudPermissions,
  CloudScope,
  CloudView,
  DocumentTemplateType,
} from '../../types/cloud.types';
import { buildMoveRequest } from './cloudFormat';
import type { CloudLocationOption } from './cloudLocations';
import { FolderNameModal, RenameNodeModal } from './CloudNodeModals';
import { NewDocumentModal } from './editor/NewDocumentModal';
import { FinderContextMenu, type ContextMenuState } from './FinderContextMenu';
import { MoveNodeModal } from './MoveNodeModal';

interface CloudActionModalsProps {
  api: CloudFilesApi;
  apiForScope: (scope: CloudScope) => CloudFilesApi;
  sourceScope: CloudScope;
  locations: CloudLocationOption[];
  view: CloudView;
  permissions: CloudPermissions;
  activeParentId: string | null;
  defaultTemplate?: DocumentTemplateType;
  newFolderOpen?: boolean;
  newDocOpen: boolean;
  renamingNode: CloudNodeDto | null;
  movingNodes: CloudNodeDto[];
  contextMenu: ContextMenuState | null;
  onCloseNewFolder?: () => void;
  onCloseNewDoc: () => void;
  onCloseRename: () => void;
  onCloseMove: () => void;
  onCloseContextMenu: () => void;
  onRefresh: () => void;
  onCreatedDoc: (node: CloudNodeDto) => void;
  onOpenFolder: (folderId: string) => void;
  onOpenEditor: (node: CloudNodeDto) => void;
  onRenameRequest: (node: CloudNodeDto) => void;
  onMoveRequest: (nodes: CloudNodeDto[]) => void;
  onToggleStar: (node: CloudNodeDto) => void;
  onDownload: (node: CloudNodeDto) => void;
  onSoftDeleteNodes: (nodes: CloudNodeDto[]) => void;
  onRestoreNodes: (nodes: CloudNodeDto[]) => void;
  onPermanentDeleteNodes: (nodes: CloudNodeDto[]) => void;
}

export function CloudActionModals({
  api, apiForScope, sourceScope, locations, view, permissions, activeParentId,
  defaultTemplate = 'MD', newFolderOpen = false, newDocOpen, renamingNode, movingNodes,
  contextMenu, onCloseNewFolder, onCloseNewDoc, onCloseRename, onCloseMove, onCloseContextMenu,
  onRefresh, onCreatedDoc, onOpenFolder, onOpenEditor, onRenameRequest, onMoveRequest,
  onToggleStar, onDownload, onSoftDeleteNodes, onRestoreNodes, onPermanentDeleteNodes,
}: CloudActionModalsProps) {
  return (
    <>
      <FinderContextMenu
        menu={contextMenu}
        view={view}
        permissions={permissions}
        onClose={onCloseContextMenu}
        onOpenFolder={onOpenFolder}
        onOpenEditor={onOpenEditor}
        onRename={onRenameRequest}
        onMoveNodes={onMoveRequest}
        onToggleStar={onToggleStar}
        onDownload={onDownload}
        onSoftDeleteNodes={onSoftDeleteNodes}
        onRestoreNodes={onRestoreNodes}
        onPermanentDeleteNodes={onPermanentDeleteNodes}
      />

      {onCloseNewFolder && (
        <FolderNameModal
          open={newFolderOpen}
          title="Create Folder"
          submitLabel="Create"
          onClose={onCloseNewFolder}
          onSubmit={async (name) => {
            await api.createFolder({ parentId: activeParentId, name });
            onRefresh();
          }}
        />
      )}

      <RenameNodeModal
        node={renamingNode}
        onClose={onCloseRename}
        onSubmit={async (name) => {
          if (!renamingNode) return;
          await api.updateNode(renamingNode.id, { name });
          onRefresh();
        }}
      />

      <MoveNodeModal
        nodes={movingNodes}
        sourceScope={sourceScope}
        locations={locations}
        apiForScope={apiForScope}
        onClose={onCloseMove}
        onMove={async (targetScope, targetParentId) => {
          const req = buildMoveRequest(
            movingNodes.map((n) => n.id),
            sourceScope,
            targetScope,
            targetParentId
          );
          await api.moveCloudNodes(req);
          onRefresh();
        }}
      />

      <NewDocumentModal
        open={newDocOpen}
        parentId={activeParentId}
        api={api}
        defaultTemplate={defaultTemplate}
        onClose={onCloseNewDoc}
        onCreated={onCreatedDoc}
      />
    </>
  );
}
