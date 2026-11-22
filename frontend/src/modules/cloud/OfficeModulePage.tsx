import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { EmptyView } from '../../components/ui/StateViews';
import { createHttpCloudFilesApi, type CloudFilesApi } from '../../services/cloud/cloudApi';
import { cloudScopeKey, resolveCloudPermissions, type CloudNodeDto, type CloudScope } from '../../types/cloud.types';
import { useScopeCatalogSync } from '../collab/useScopeCatalogSync';
import { CloudActionModals } from './CloudActionModals';
import { CloudDropOverlay, CloudEditorSurface, useExternalFileDrop } from './CloudEditorSurface';
import { CloudFileTable } from './CloudFileTable';
import { useCloudLocations } from './cloudLocations';
import { getOfficeModuleConfig, type OfficeModuleKey } from './cloudModulePreset';
import { CloudSearchSortBar } from './CloudSearchSortBar';
import { CloudUploadQueue } from './CloudUploadQueue';
import { useCloudEditor } from './editor/useCloudEditor';
import { FinderGridView } from './FinderGridView';
import { FinderSelectionBar } from './FinderSelectionBar';
import { OfficeModuleHeader, type OfficeViewMode } from './OfficeModuleHeader';
import { useCloudBrowser } from './useCloudBrowser';
import { useCloudNodeActions } from './useCloudNodeActions';
import { useCloudSelection } from './useCloudSelection';
import { useCloudUploads } from './useCloudUploads';
import { useFinderShortcuts } from './useFinderShortcuts';

interface OfficeModulePageProps {
  scope: CloudScope;
  scopeLabel?: string;
  officeModule: OfficeModuleKey;
  apiOverride?: CloudFilesApi;
  apiFactory?: (scope: CloudScope) => CloudFilesApi;
}

export function OfficeModulePage({
  scope,
  scopeLabel,
  officeModule,
  apiOverride,
  apiFactory,
}: OfficeModulePageProps) {
  const scopeKey = cloudScopeKey(scope);
  const permissions = useMemo(() => resolveCloudPermissions(scope), [scope]);
  const config = useMemo(() => getOfficeModuleConfig(officeModule), [officeModule]);
  const locations = useCloudLocations(scope, scopeLabel);
  const [viewMode, setViewMode] = useState<OfficeViewMode>('list');
  const [quickLookNode, setQuickLookNode] = useState<CloudNodeDto | null>(null);

  const apiForScope = useCallback(
    (target: CloudScope) => (apiFactory ? apiFactory(target) : (apiOverride ?? createHttpCloudFilesApi(target))),
    [apiFactory, apiOverride]
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const api = useMemo(() => apiForScope(scope), [apiForScope, scopeKey]);

  const browser = useCloudBrowser(api, scopeKey, permissions.canRead, config.view);
  const selection = useCloudSelection();
  const uploads = useCloudUploads(api, scopeKey, browser.quota, () => void browser.refresh());
  const editor = useCloudEditor(() => void browser.refresh());
  const actions = useCloudNodeActions({
    api, scope, nodes: browser.nodes, selectedIds: selection.selectedIds,
    selectOnly: selection.selectOnly, clearSelection: selection.clearSelection, runMutation: browser.runMutation,
  });
  const drop = useExternalFileDrop(permissions.canWrite, (files) => uploads.enqueueFiles(files, null));

  useScopeCatalogSync({
    scope:
      scope.type === 'PROJECT'
        ? { type: 'PROJECT', workspaceId: scope.workspaceId, projectId: scope.projectId }
        : scope.type === 'WORKSPACE'
          ? { type: 'WORKSPACE', workspaceId: scope.workspaceId }
          : null,
    module: 'cloud',
    enabled: permissions.canRead && !editor.textNode && !editor.officeNode,
    onRefresh: () => void browser.refresh(),
  });

  useEffect(() => {
    selection.pruneSelection(new Set(browser.nodes.map((n) => n.id)));
  }, [browser.nodes, selection.pruneSelection]);

  const editorOpen = Boolean(editor.textNode || editor.officeNode);
  const modalOpen = Boolean(editor.newDocOpen || actions.renamingNode || actions.movingNodes.length > 0);
  const firstSelected = actions.selectedNodes[0];
  const singleFile = actions.selectedNodes.length === 1 && firstSelected?.nodeType === 'FILE' ? firstSelected : null;

  useFinderShortcuts({
    enabled: permissions.canRead && !editorOpen && !modalOpen,
    quickLookOpen: Boolean(quickLookNode),
    selectedSingleFile: singleFile,
    onOpenQuickLook: setQuickLookNode,
  });

  if (!permissions.canRead) {
    return (
      <div className="flex h-[calc(100vh-3rem)] items-center justify-center bg-[#0D1117] p-6">
        <EmptyView title={`No access to ${config.title}`} description="You do not have permission to view files in this scope." />
      </div>
    );
  }

  return (
    <div
      className="relative flex h-[calc(100vh-3rem)] w-full flex-col overflow-hidden border border-[#30363D] bg-[#0D1117]"
      {...drop.dragHandlers}
    >
      {editorOpen ? (
        <CloudEditorSurface
          api={api} canWrite={permissions.canWrite} canManage={permissions.canManage}
          textNode={editor.textNode} officeNode={editor.officeNode}
          onCloseText={editor.closeTextEditor} onCloseOffice={editor.closeOfficeEditor}
          onDownload={actions.downloadNode} onSaved={editor.handleTextSaved}
        />
      ) : (
        <>
          <OfficeModuleHeader
            officeModule={officeModule} title={config.title} newLabel={config.newLabel} scopeLabel={scopeLabel}
            viewMode={viewMode} permissions={permissions} onViewModeChange={setViewMode}
            onOpenNewDocument={() => editor.setNewDocOpen(true)}
            onUploadFiles={(files) => uploads.enqueueFiles(files, null)}
          />

          <CloudSearchSortBar
            search={browser.searchInput} placeholder={`Search ${config.title.toLowerCase()}...`}
            sortBy={browser.sortBy} sortDir={browser.sortDir} selectId="office-sort-by"
            onSearchChange={browser.setSearchInput} onSortByChange={browser.setSortBy} onToggleSortDir={browser.toggleSortDir}
          />

          <FinderSelectionBar
            selectedNodes={actions.selectedNodes} view={browser.view} permissions={permissions}
            onQuickLook={setQuickLookNode} onMoveSelected={() => actions.setMovingNodes(actions.selectedNodes)}
            onDownloadSelected={actions.downloadSelected} onDeleteSelected={() => actions.softDeleteNodes(actions.selectedNodes)}
            onRestoreSelected={() => actions.restoreNodes(actions.selectedNodes)}
            onPermanentDeleteSelected={() => actions.permanentDeleteNodes(actions.selectedNodes)} onClear={selection.clearSelection}
          />

          {browser.error && (
            <div role="alert" className="flex items-center justify-between gap-2 border-b border-[#EF4444]/40 bg-[#EF4444]/10 px-4 py-2 text-xs text-[#EF4444]">
              <span className="flex items-center gap-2"><AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />{browser.error}</span>
              <button type="button" aria-label="Dismiss error" onClick={browser.clearError}><X className="h-3.5 w-3.5" strokeWidth={1.5} /></button>
            </div>
          )}

          {viewMode === 'icons' ? (
            <FinderGridView
              nodes={browser.nodes} view={browser.view} selectedIds={selection.selectedIds}
              loading={browser.loading} hasMore={browser.hasMore} loadingMore={browser.loadingMore}
              permissions={permissions} emptyTitle={config.emptyTitle} emptyHint={config.emptyHint}
              onSelect={(node, ordered, e) => selection.selectNode(node.id, ordered, { multi: e.ctrlKey || e.metaKey, range: e.shiftKey })}
              onContextMenu={actions.openContextMenu} onOpenFolder={() => {}} onOpenEditor={editor.openNode}
              onLoadMore={() => void browser.loadMore()}
            />
          ) : (
            <CloudFileTable
              api={api} nodes={browser.nodes} view={browser.view} searchQuery={browser.debouncedQuery}
              sortBy={browser.sortBy} sortDir={browser.sortDir} treeResetKey={`${scopeKey}:${config.view}:${browser.tick}`}
              selectedIds={selection.selectedIds} loading={browser.loading} hasMore={browser.hasMore}
              loadingMore={browser.loadingMore} permissions={permissions} showFolderColumn allowInlineExpand={false}
              emptyTitle={config.emptyTitle} emptyHint={config.emptyHint}
              onSelect={(node, ordered, e) => selection.selectNode(node.id, ordered, { multi: e.ctrlKey || e.metaKey, range: e.shiftKey })}
              onContextMenu={actions.openContextMenu} onOpenFolder={() => {}} onOpenEditor={editor.openNode}
              onToggleStar={actions.toggleStar} onToggleLock={actions.toggleLock} onDownload={actions.downloadNode} onRename={actions.setRenamingNode}
              onMove={(n) => actions.setMovingNodes([n])} onSoftDelete={(n) => actions.softDeleteNodes([n])}
              onRestore={(n) => actions.restoreNodes([n])} onPermanentDelete={(n) => actions.permanentDeleteNodes([n])}
              onLoadMore={() => void browser.loadMore()}
            />
          )}

          <CloudUploadQueue tasks={uploads.tasks} onCancel={uploads.cancelTask} onDismiss={uploads.dismissTask} onClearFinished={uploads.clearFinished} />
        </>
      )}

      <CloudDropOverlay active={drop.dragActive} />
      <CloudActionModals
        api={api} apiForScope={apiForScope} sourceScope={scope} locations={locations}
        view={browser.view} permissions={permissions} activeParentId={null} defaultTemplate={config.defaultTemplate}
        newDocOpen={editor.newDocOpen} renamingNode={actions.renamingNode} movingNodes={actions.movingNodes}
        contextMenu={actions.contextMenu} quickLookNode={quickLookNode}
        onCloseNewDoc={() => editor.setNewDocOpen(false)} onCloseRename={() => actions.setRenamingNode(null)}
        onCloseMove={() => actions.setMovingNodes([])} onCloseContextMenu={() => actions.setContextMenu(null)}
        onCloseQuickLook={() => setQuickLookNode(null)} onQuickLook={setQuickLookNode}
        onRefresh={() => void browser.refresh()} onCreatedDoc={editor.handleDocumentCreated}
        onOpenFolder={() => {}} onOpenEditor={editor.openNode} onRenameRequest={actions.setRenamingNode}
        onMoveRequest={actions.setMovingNodes} onToggleStar={actions.toggleStar} onToggleLock={actions.toggleLock} onDownload={actions.downloadNode}
        onSoftDeleteNodes={actions.softDeleteNodes} onRestoreNodes={actions.restoreNodes}
        onPermanentDeleteNodes={actions.permanentDeleteNodes}
      />
    </div>
  );
}
