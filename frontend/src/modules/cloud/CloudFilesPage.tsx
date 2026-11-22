import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { EmptyView } from '../../components/ui/StateViews';
import { createHttpCloudFilesApi, type CloudFilesApi } from '../../services/cloud/cloudApi';
import { cloudScopeKey, resolveCloudPermissions, type CloudNodeDto, type CloudScope } from '../../types/cloud.types';
import { CloudActionModals } from './CloudActionModals';
import { CloudDropOverlay, CloudEditorSurface, useExternalFileDrop } from './CloudEditorSurface';
import { scopeDisplay } from './cloudFormat';
import { useCloudLocations } from './cloudLocations';
import type { CloudModulePreset } from './cloudModulePreset';
import { CloudPreviewPane } from './CloudPreviewPane';
import { CloudSidebar } from './CloudSidebar';
import { CloudToolbar, type FinderViewMode } from './CloudToolbar';
import { CloudUploadQueue } from './CloudUploadQueue';
import { useCloudEditor } from './editor/useCloudEditor';
import { FinderPathBar } from './FinderPathBar';
import { FinderSelectionBar } from './FinderSelectionBar';
import { FinderViewport } from './FinderViewport';
import { OfficeModulePage } from './OfficeModulePage';
import { useCloudBrowser } from './useCloudBrowser';
import { useCloudNodeActions } from './useCloudNodeActions';
import { useCloudSelection } from './useCloudSelection';
import { useCloudUploads } from './useCloudUploads';
import { useCloudScopeCatalogSync } from './useCloudScopeCatalogSync';
import { useFinderShortcuts } from './useFinderShortcuts';

interface CloudFilesPageProps {
  scope: CloudScope;
  scopeLabel?: string;
  modulePreset?: CloudModulePreset;
  apiOverride?: CloudFilesApi;
  apiFactory?: (scope: CloudScope) => CloudFilesApi;
}

export function CloudFilesPage(props: CloudFilesPageProps) {
  if (props.modulePreset && props.modulePreset !== 'cloud') {
    return (
      <OfficeModulePage
        scope={props.scope} scopeLabel={props.scopeLabel} officeModule={props.modulePreset}
        apiOverride={props.apiOverride} apiFactory={props.apiFactory}
      />
    );
  }
  return <CloudFinderWorkspace {...props} />;
}

function CloudFinderWorkspace({ scope, scopeLabel, apiOverride, apiFactory }: CloudFilesPageProps) {
  const initialScopeKey = cloudScopeKey(scope);
  const [activeScope, setActiveScope] = useState<CloudScope>(scope);
  const [activeLabel, setActiveLabel] = useState<string | undefined>(scopeLabel);
  const [viewMode, setViewMode] = useState<FinderViewMode>('list');
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [quickLookNode, setQuickLookNode] = useState<CloudNodeDto | null>(null);
  const [newFolderOpen, setNewFolderOpen] = useState(false);

  useEffect(() => { setActiveScope(scope); setActiveLabel(scopeLabel); }, [initialScopeKey, scope, scopeLabel]);
  const scopeKey = cloudScopeKey(activeScope);
  const permissions = useMemo(() => resolveCloudPermissions(activeScope), [activeScope]);
  const locations = useCloudLocations(scope, scopeLabel);
  const locationTitle = activeLabel ?? scopeDisplay(activeScope).badge;
  const apiForScope = useCallback(
    (target: CloudScope) => (apiFactory ? apiFactory(target) : (apiOverride ?? createHttpCloudFilesApi(target))),
    [apiFactory, apiOverride]
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const api = useMemo(() => apiForScope(activeScope), [apiForScope, scopeKey]);
  const browser = useCloudBrowser(api, scopeKey, permissions.canRead, 'ALL');
  const selection = useCloudSelection();
  const uploads = useCloudUploads(api, scopeKey, browser.quota, () => void browser.refresh());
  const editor = useCloudEditor(() => void browser.refresh());
  const actions = useCloudNodeActions({
    api, scope: activeScope, nodes: browser.nodes, selectedIds: selection.selectedIds,
    selectOnly: selection.selectOnly, clearSelection: selection.clearSelection, runMutation: browser.runMutation,
  });
  const activeParentId = browser.view === 'ALL' ? browser.parentId : null;
  const folderLocked = browser.activeFolderLocked;
  const drop = useExternalFileDrop(
    permissions.canWrite && !folderLocked && browser.view !== 'TRASH',
    (files) => uploads.enqueueFiles(files, activeParentId)
  );
  useCloudScopeCatalogSync(
    activeScope, permissions.canRead && !editor.textNode && !editor.officeNode,
    () => void browser.refresh()
  );

  useEffect(() => {
    selection.clearSelection();
    setQuickLookNode(null);
  }, [scopeKey, browser.view, browser.parentId, selection.clearSelection]);

  const editorOpen = Boolean(editor.textNode || editor.officeNode);
  const modalOpen = Boolean(newFolderOpen || editor.newDocOpen || actions.renamingNode || actions.movingNodes.length > 0);
  const selectedNode = browser.nodes.find((n) => n.id === selection.selectedId) ?? null;
  const firstSelected = actions.selectedNodes[0];
  const singleFile = actions.selectedNodes.length === 1 && firstSelected?.nodeType === 'FILE' && browser.view !== 'TRASH' ? firstSelected : null;

  useFinderShortcuts({
    enabled: permissions.canRead && !editorOpen && !modalOpen,
    quickLookOpen: Boolean(quickLookNode), selectedSingleFile: singleFile,
    onOpenQuickLook: setQuickLookNode, onToggleInspector: () => setInspectorOpen((prev) => !prev),
  });

  if (!permissions.canRead) {
    return (
      <div className="flex h-[calc(100vh-3rem)] items-center justify-center bg-[#0D1117] p-6">
        <EmptyView title="No access to Cloud Files" description="You do not have permission to view files in this scope." />
      </div>
    );
  }

  const treeResetKey = `${scopeKey}:${browser.view}:${browser.parentId ?? 'root'}:${browser.tick}`;

  return (
    <div className="relative flex h-[calc(100vh-3rem)] w-full overflow-hidden border border-[#30363D] bg-[#0D1117]" {...drop.dragHandlers}>
      <CloudSidebar
        scope={activeScope} scopeLabel={activeLabel} activeView={browser.view} quota={browser.quota} locations={locations}
        onSelectView={(v) => { editor.closeTextEditor(); editor.closeOfficeEditor(); browser.selectView(v); }}
        onSelectScope={(nextScope, nextLabel) => { editor.closeTextEditor(); editor.closeOfficeEditor(); setActiveScope(nextScope); setActiveLabel(nextLabel); }}
        onDropNodesToScope={(ids, targetScope) => actions.dropMoveNodes(ids, targetScope, null)}
      />
      {editorOpen ? (
        <CloudEditorSurface
          api={api} canWrite={permissions.canWrite} canManage={permissions.canManage} textNode={editor.textNode} officeNode={editor.officeNode}
          onCloseText={editor.closeTextEditor} onCloseOffice={editor.closeOfficeEditor}
          onDownload={actions.downloadNode} onSaved={editor.handleTextSaved}
        />
      ) : (
        <>
          <div className="flex min-w-0 flex-1 flex-col">
            <CloudToolbar
              view={browser.view} viewMode={viewMode} inspectorOpen={inspectorOpen} locationLabel={locationTitle}
              breadcrumbs={browser.breadcrumbs} canGoBack={browser.canGoBack} canGoForward={browser.canGoForward}
              search={browser.searchInput} sortBy={browser.sortBy} sortDir={browser.sortDir} permissions={permissions}
              folderLocked={folderLocked} hasNodes={browser.nodes.length > 0} onGoBack={browser.goBack} onGoForward={browser.goForward}
              onViewModeChange={setViewMode} onToggleInspector={() => setInspectorOpen((prev) => !prev)}
              onSearchChange={browser.setSearchInput} onSortByChange={browser.setSortBy} onToggleSortDir={browser.toggleSortDir}
              onUploadFiles={(files) => uploads.enqueueFiles(files, activeParentId)}
              onOpenNewDocument={() => editor.setNewDocOpen(true)} onOpenNewFolder={() => setNewFolderOpen(true)}
              onEmptyTrash={() => void browser.runMutation(() => api.emptyTrash())}
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
            <FinderViewport
              api={api} viewMode={viewMode} nodes={browser.nodes} view={browser.view} searchQuery={browser.debouncedQuery}
              sortBy={browser.sortBy} sortDir={browser.sortDir} treeResetKey={treeResetKey} selectedIds={selection.selectedIds}
              loading={browser.loading} hasMore={browser.hasMore} loadingMore={browser.loadingMore} permissions={permissions}
              onSelect={(node, ordered, e) => selection.selectNode(node.id, ordered, { multi: e.ctrlKey || e.metaKey, range: e.shiftKey })}
              onContextMenu={actions.openContextMenu} onOpenFolder={browser.openFolder} onOpenEditor={editor.openNode}
              onToggleStar={actions.toggleStar} onToggleLock={actions.toggleLock} onDownload={actions.downloadNode} onRename={actions.setRenamingNode}
              onMove={(n) => actions.setMovingNodes([n])} onDropToFolder={(ids, folderId) => actions.dropMoveNodes(ids, activeScope, folderId)}
              onSoftDelete={(n) => actions.softDeleteNodes([n])} onRestore={(n) => actions.restoreNodes([n])}
              onPermanentDelete={(n) => actions.permanentDeleteNodes([n])} onLoadMore={() => void browser.loadMore()}
            />
            <CloudUploadQueue tasks={uploads.tasks} onCancel={uploads.cancelTask} onDismiss={uploads.dismissTask} onClearFinished={uploads.clearFinished} />
            <FinderPathBar
              locationLabel={locationTitle} view={browser.view} breadcrumbs={browser.breadcrumbs}
              totalCount={browser.nodes.length} selectedCount={selection.selectedIds.length} onNavigateFolder={browser.openFolder}
            />
          </div>
          {viewMode !== 'columns' && inspectorOpen && (
            <CloudPreviewPane
              node={selectedNode} view={browser.view} permissions={permissions} onClose={() => setInspectorOpen(false)}
              onQuickLook={setQuickLookNode} onOpenEditor={editor.openNode} onDownload={actions.downloadNode}
              onToggleStar={actions.toggleStar} onToggleLock={actions.toggleLock} onRename={actions.setRenamingNode} onMove={(n) => actions.setMovingNodes([n])}
              onSoftDelete={(n) => actions.softDeleteNodes([n])} onRestore={(n) => actions.restoreNodes([n])}
              onPermanentDelete={(n) => actions.permanentDeleteNodes([n])}
            />
          )}
        </>
      )}
      <CloudDropOverlay active={drop.dragActive} />
      <CloudActionModals
        api={api} apiForScope={apiForScope} sourceScope={activeScope} locations={locations} view={browser.view}
        permissions={permissions} activeParentId={activeParentId} newFolderOpen={newFolderOpen} newDocOpen={editor.newDocOpen}
        renamingNode={actions.renamingNode} movingNodes={actions.movingNodes} contextMenu={actions.contextMenu}
        quickLookNode={quickLookNode} onCloseNewFolder={() => setNewFolderOpen(false)} onCloseNewDoc={() => editor.setNewDocOpen(false)}
        onCloseRename={() => actions.setRenamingNode(null)} onCloseMove={() => actions.setMovingNodes([])}
        onCloseContextMenu={() => actions.setContextMenu(null)} onCloseQuickLook={() => setQuickLookNode(null)}
        onQuickLook={setQuickLookNode} onRefresh={() => void browser.refresh()} onCreatedDoc={editor.handleDocumentCreated}
        onOpenFolder={browser.openFolder} onOpenEditor={editor.openNode} onRenameRequest={actions.setRenamingNode}
        onMoveRequest={actions.setMovingNodes} onToggleStar={actions.toggleStar} onToggleLock={actions.toggleLock} onDownload={actions.downloadNode}
        onSoftDeleteNodes={actions.softDeleteNodes} onRestoreNodes={actions.restoreNodes} onPermanentDeleteNodes={actions.permanentDeleteNodes}
      />
    </div>
  );
}
