import { useCallback, useEffect, useMemo, useRef } from 'react';
import { AlertCircle, FilePlus2, FileSpreadsheet, FileText, Presentation, Upload, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { EmptyView } from '../../components/ui/StateViews';
import { createHttpCloudFilesApi, type CloudFilesApi } from '../../services/cloud/cloudApi';
import { cloudScopeKey, resolveCloudPermissions, type CloudScope } from '../../types/cloud.types';
import { CloudActionModals } from './CloudActionModals';
import { CloudDropOverlay, CloudEditorSurface, useExternalFileDrop } from './CloudEditorSurface';
import { CloudFileTable } from './CloudFileTable';
import { useCloudLocations } from './cloudLocations';
import { getOfficeModuleConfig, type OfficeModuleKey } from './cloudModulePreset';
import { CloudSearchSortBar } from './CloudSearchSortBar';
import { CloudUploadQueue } from './CloudUploadQueue';
import { useCloudEditor } from './editor/useCloudEditor';
import { FinderSelectionBar } from './FinderSelectionBar';
import { useCloudBrowser } from './useCloudBrowser';
import { useCloudNodeActions } from './useCloudNodeActions';
import { useCloudSelection } from './useCloudSelection';
import { useCloudUploads } from './useCloudUploads';

interface OfficeModulePageProps {
  scope: CloudScope;
  scopeLabel?: string;
  officeModule: OfficeModuleKey;
  apiOverride?: CloudFilesApi;
  apiFactory?: (scope: CloudScope) => CloudFilesApi;
}

function OfficeHeaderIcon({ module }: { module: OfficeModuleKey }) {
  if (module === 'sheets') return <FileSpreadsheet className="h-4 w-4 text-[#22C55E]" strokeWidth={1.5} />;
  if (module === 'slides') return <Presentation className="h-4 w-4 text-[#22C55E]" strokeWidth={1.5} />;
  return <FileText className="h-4 w-4 text-[#22C55E]" strokeWidth={1.5} />;
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    selection.pruneSelection(new Set(browser.nodes.map((n) => n.id)));
  }, [browser.nodes, selection.pruneSelection]);

  if (!permissions.canRead) {
    return (
      <div className="flex h-[calc(100vh-3rem)] items-center justify-center bg-[#0D1117] p-6">
        <EmptyView title={`No access to ${config.title}`} description="You do not have permission to view files in this scope." />
      </div>
    );
  }

  const editorOpen = Boolean(editor.textNode || editor.officeNode);

  return (
    <div
      className="relative flex h-[calc(100vh-3rem)] w-full flex-col overflow-hidden border border-[#30363D] bg-[#0D1117]"
      {...drop.dragHandlers}
    >
      {editorOpen ? (
        <CloudEditorSurface
          api={api} canWrite={permissions.canWrite} textNode={editor.textNode} officeNode={editor.officeNode}
          onCloseText={editor.closeTextEditor} onCloseOffice={editor.closeOfficeEditor}
          onDownload={actions.downloadNode} onSaved={editor.handleTextSaved}
        />
      ) : (
        <>
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#30363D] bg-[#161B22] px-4 py-2.5">
            <div className="flex items-center gap-2.5">
              <OfficeHeaderIcon module={officeModule} />
              <h1 className="text-sm font-semibold text-[#E6EDF3]">{config.title}</h1>
              {scopeLabel && (
                <span className="border border-[#30363D] bg-[#0D1117] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[#22C55E]">
                  {scopeLabel}
                </span>
              )}
            </div>
            {permissions.canWrite && (
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef} type="file" multiple className="hidden" aria-label="Upload office files"
                  onChange={(e) => {
                    const list = e.target.files ? Array.from(e.target.files) : [];
                    if (list.length > 0) uploads.enqueueFiles(list, null);
                    e.target.value = '';
                  }}
                />
                <Button type="button" variant="primary" onClick={() => editor.setNewDocOpen(true)}>
                  <FilePlus2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                  {config.newLabel}
                </Button>
                <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Upload
                </Button>
              </div>
            )}
          </header>

          <CloudSearchSortBar
            search={browser.searchInput} placeholder={`Search ${config.title.toLowerCase()}...`}
            sortBy={browser.sortBy} sortDir={browser.sortDir} selectId="office-sort-by"
            onSearchChange={browser.setSearchInput} onSortByChange={browser.setSortBy} onToggleSortDir={browser.toggleSortDir}
          />

          <FinderSelectionBar
            selectedNodes={actions.selectedNodes} view={browser.view} permissions={permissions}
            onMoveSelected={() => actions.setMovingNodes(actions.selectedNodes)} onDownloadSelected={actions.downloadSelected}
            onDeleteSelected={() => actions.softDeleteNodes(actions.selectedNodes)} onRestoreSelected={() => actions.restoreNodes(actions.selectedNodes)}
            onPermanentDeleteSelected={() => actions.permanentDeleteNodes(actions.selectedNodes)} onClear={selection.clearSelection}
          />

          {browser.error && (
            <div role="alert" className="flex items-center justify-between gap-2 border-b border-[#EF4444]/40 bg-[#EF4444]/10 px-4 py-2 text-xs text-[#EF4444]">
              <span className="flex items-center gap-2"><AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />{browser.error}</span>
              <button type="button" aria-label="Dismiss error" onClick={browser.clearError}><X className="h-3.5 w-3.5" strokeWidth={1.5} /></button>
            </div>
          )}

          <CloudFileTable
            api={api} nodes={browser.nodes} view={browser.view} searchQuery={browser.debouncedQuery}
            sortBy={browser.sortBy} sortDir={browser.sortDir} treeResetKey={`${scopeKey}:${config.view}:${browser.tick}`}
            selectedIds={selection.selectedIds} loading={browser.loading} hasMore={browser.hasMore}
            loadingMore={browser.loadingMore} permissions={permissions} showFolderColumn allowInlineExpand={false}
            emptyTitle={config.emptyTitle} emptyHint={config.emptyHint}
            onSelect={(node, ordered, e) => selection.selectNode(node.id, ordered, { multi: e.ctrlKey || e.metaKey, range: e.shiftKey })}
            onContextMenu={actions.openContextMenu} onOpenFolder={() => {}} onOpenEditor={editor.openNode}
            onToggleStar={actions.toggleStar} onDownload={actions.downloadNode} onRename={actions.setRenamingNode}
            onMove={(n) => actions.setMovingNodes([n])} onSoftDelete={(n) => actions.softDeleteNodes([n])}
            onRestore={(n) => actions.restoreNodes([n])} onPermanentDelete={(n) => actions.permanentDeleteNodes([n])}
            onLoadMore={() => void browser.loadMore()}
          />

          <CloudUploadQueue tasks={uploads.tasks} onCancel={uploads.cancelTask} onDismiss={uploads.dismissTask} onClearFinished={uploads.clearFinished} />
        </>
      )}

      <CloudDropOverlay active={drop.dragActive} />

      <CloudActionModals
        api={api} apiForScope={apiForScope} sourceScope={scope} locations={locations}
        view={browser.view} permissions={permissions} activeParentId={null} defaultTemplate={config.defaultTemplate}
        newDocOpen={editor.newDocOpen} renamingNode={actions.renamingNode} movingNodes={actions.movingNodes}
        contextMenu={actions.contextMenu} onCloseNewDoc={() => editor.setNewDocOpen(false)}
        onCloseRename={() => actions.setRenamingNode(null)} onCloseMove={() => actions.setMovingNodes([])}
        onCloseContextMenu={() => actions.setContextMenu(null)} onRefresh={() => void browser.refresh()}
        onCreatedDoc={editor.handleDocumentCreated} onOpenFolder={() => {}} onOpenEditor={editor.openNode}
        onRenameRequest={actions.setRenamingNode} onMoveRequest={actions.setMovingNodes}
        onToggleStar={actions.toggleStar} onDownload={actions.downloadNode}
        onSoftDeleteNodes={actions.softDeleteNodes} onRestoreNodes={actions.restoreNodes}
        onPermanentDeleteNodes={actions.permanentDeleteNodes}
      />
    </div>
  );
}
