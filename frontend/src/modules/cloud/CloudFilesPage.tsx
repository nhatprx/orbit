import { useMemo, useState, type DragEvent } from 'react';
import { AlertCircle, Upload, X } from 'lucide-react';
import { EmptyView } from '../../components/ui/StateViews';
import { createHttpCloudFilesApi, type CloudFilesApi } from '../../services/cloud/cloudApi';
import { cloudScopeKey, resolveCloudPermissions, type CloudNodeDto, type CloudScope } from '../../types/cloud.types';
import { CloudFileTable } from './CloudFileTable';
import { FolderNameModal, MoveNodeModal } from './CloudNodeModals';
import { CloudPreviewPane } from './CloudPreviewPane';
import { CloudSidebar } from './CloudSidebar';
import { CloudToolbar } from './CloudToolbar';
import { CloudUploadQueue } from './CloudUploadQueue';
import { CloudTextEditorModal } from './editor/CloudTextEditorModal';
import { classifyFileEditor } from './editor/fileEditorRegistry';
import { NewDocumentModal } from './editor/NewDocumentModal';
import { OrbitOfficeWorkspace } from './editor/office/OrbitOfficeWorkspace';
import { useCloudEditor } from './editor/useCloudEditor';
import { useCloudBrowser } from './useCloudBrowser';
import { useCloudUploads } from './useCloudUploads';

interface CloudFilesPageProps {
  scope: CloudScope;
  scopeLabel?: string;
  apiOverride?: CloudFilesApi;
}

function triggerInlineDownload(url: string, filename: string) {
  const link = Object.assign(document.createElement('a'), { href: url, download: filename });
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function CloudFilesPage({ scope, scopeLabel, apiOverride }: CloudFilesPageProps) {
  const scopeKey = cloudScopeKey(scope);
  const permissions = useMemo(() => resolveCloudPermissions(scope), [scope]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const api = useMemo(() => apiOverride ?? createHttpCloudFilesApi(scope), [apiOverride, scopeKey]);

  const browser = useCloudBrowser(api, scopeKey, permissions.canRead);
  const uploads = useCloudUploads(api, scopeKey, browser.quota, () => void browser.refresh());
  const editor = useCloudEditor(() => void browser.refresh());
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [renamingNode, setRenamingNode] = useState<CloudNodeDto | null>(null);
  const [movingNode, setMovingNode] = useState<CloudNodeDto | null>(null);
  const [dragActive, setDragActive] = useState(false);

  if (!permissions.canRead) {
    return (
      <div className="flex h-[calc(100vh-3rem)] items-center justify-center bg-[#0D1117] p-6">
        <EmptyView title="No access to Cloud Files" description="You do not have permission to view files in this scope." />
      </div>
    );
  }

  const selectedNode = browser.nodes.find((n) => n.id === browser.selectedId) ?? null;
  const activeParentId = browser.view === 'ALL' ? browser.parentId : null;
  const canDropUpload = permissions.canWrite && browser.view !== 'TRASH';

  const nodeHandlers = {
    onOpenEditor: editor.openNode,
    onDownload: (node: CloudNodeDto) => {
      void browser.runMutation(() => api.getDownloadUrl(node.id), false).then((res) => {
        if (res?.url) triggerInlineDownload(res.url, node.name);
      });
    },
    onToggleStar: (node: CloudNodeDto) => void browser.runMutation(() => api.updateNode(node.id, { starred: !node.starred })),
    onRename: (node: CloudNodeDto) => setRenamingNode(node),
    onMove: (node: CloudNodeDto) => setMovingNode(node),
    onSoftDelete: (node: CloudNodeDto) => void browser.runMutation(() => api.softDeleteNode(node.id)),
    onRestore: (node: CloudNodeDto) => void browser.runMutation(() => api.restoreNode(node.id)),
    onPermanentDelete: (node: CloudNodeDto) => void browser.runMutation(() => api.permanentDeleteNode(node.id)),
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (canDropUpload) {
      e.preventDefault();
      if (!dragActive) setDragActive(true);
    }
  };
  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    if (canDropUpload && !e.currentTarget.contains(e.relatedTarget as Node | null)) setDragActive(false);
  };
  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    if (!canDropUpload) return;
    e.preventDefault();
    setDragActive(false);
    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length > 0) uploads.enqueueFiles(dropped, activeParentId);
  };

  return (
    <div
      className="relative flex h-[calc(100vh-3rem)] w-full overflow-hidden border border-[#30363D] bg-[#0D1117]"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <CloudSidebar
        scope={scope}
        scopeLabel={scopeLabel}
        activeView={browser.view}
        quota={browser.quota}
        onSelectView={(v) => {
          editor.closeTextEditor();
          editor.closeOfficeEditor();
          browser.selectView(v);
        }}
      />

      {editor.textNode ? (
        <div className="flex min-w-0 flex-1 flex-col">
          <CloudTextEditorModal node={editor.textNode} api={api} canWrite={permissions.canWrite} onClose={editor.closeTextEditor} onSaved={editor.handleTextSaved} />
        </div>
      ) : editor.officeNode ? (
        <div className="flex min-w-0 flex-1 flex-col">
          <OrbitOfficeWorkspace
            node={editor.officeNode}
            api={api}
            canWrite={permissions.canWrite}
            isPdf={classifyFileEditor(editor.officeNode.name, editor.officeNode.mimeType) === 'PDF'}
            onBack={editor.closeOfficeEditor}
            onDownload={nodeHandlers.onDownload}
            onSaved={editor.handleTextSaved}
          />
        </div>
      ) : (
        <>
          <div className="flex min-w-0 flex-1 flex-col">
            <CloudToolbar
              view={browser.view} breadcrumbs={browser.breadcrumbs} search={browser.searchInput}
              sortBy={browser.sortBy} sortDir={browser.sortDir} permissions={permissions}
              hasNodes={browser.nodes.length > 0} onSearchChange={browser.setSearchInput}
              onSortByChange={browser.setSortBy} onToggleSortDir={browser.toggleSortDir}
              onNavigateFolder={browser.openFolder}
              onUploadFiles={(files) => uploads.enqueueFiles(files, activeParentId)}
              onOpenNewDocument={() => editor.setNewDocOpen(true)}
              onOpenNewFolder={() => setNewFolderOpen(true)}
              onEmptyTrash={() => void browser.runMutation(() => api.emptyTrash())}
            />

            {browser.error && (
              <div role="alert" className="flex items-center justify-between gap-2 border-b border-[#EF4444]/40 bg-[#EF4444]/10 px-4 py-2 text-xs text-[#EF4444]">
                <span className="flex items-center gap-2"><AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />{browser.error}</span>
                <button type="button" aria-label="Dismiss error" onClick={browser.clearError}><X className="h-3.5 w-3.5" strokeWidth={1.5} /></button>
              </div>
            )}

            <CloudFileTable
              nodes={browser.nodes} view={browser.view} selectedId={browser.selectedId}
              loading={browser.loading} hasMore={browser.hasMore} loadingMore={browser.loadingMore}
              permissions={permissions} onSelect={(node) => browser.setSelectedId(node.id)}
              onOpenFolder={(id) => browser.openFolder(id)} onLoadMore={() => void browser.loadMore()}
              {...nodeHandlers}
            />

            <CloudUploadQueue tasks={uploads.tasks} onCancel={uploads.cancelTask} onDismiss={uploads.dismissTask} onClearFinished={uploads.clearFinished} />
          </div>

          <CloudPreviewPane node={selectedNode} view={browser.view} permissions={permissions} onClose={() => browser.setSelectedId(null)} {...nodeHandlers} />
        </>
      )}

      {dragActive && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center border-2 border-dashed border-[#22C55E] bg-[#052E16]/80">
          <div className="flex flex-col items-center gap-2 border border-[#22C55E] bg-[#0D1117] px-8 py-6">
            <Upload className="h-7 w-7 text-[#22C55E]" strokeWidth={1.5} />
            <p className="text-sm font-semibold text-[#E6EDF3]">Drop files to upload</p>
            <p className="font-mono text-xs text-[#8B949E]">Direct upload to Orbit Cloud Storage</p>
          </div>
        </div>
      )}

      <FolderNameModal open={newFolderOpen} title="Create Folder" submitLabel="Create" onClose={() => setNewFolderOpen(false)} onSubmit={async (name) => { await browser.runMutation(() => api.createFolder({ parentId: activeParentId, name })); }} />
      <FolderNameModal open={Boolean(renamingNode)} title="Rename Item" submitLabel="Rename" initialValue={renamingNode?.name ?? ''} onClose={() => setRenamingNode(null)} onSubmit={async (name) => { if (renamingNode) await browser.runMutation(() => api.updateNode(renamingNode.id, { name })); }} />
      <MoveNodeModal node={movingNode} api={api} onClose={() => setMovingNode(null)} onMove={async (nodeId, targetParentId) => { await browser.runMutation(() => api.updateNode(nodeId, targetParentId ? { parentId: targetParentId } : { moveToRoot: true })); }} />
      <NewDocumentModal open={editor.newDocOpen} parentId={activeParentId} api={api} onClose={() => editor.setNewDocOpen(false)} onCreated={editor.handleDocumentCreated} />
    </div>
  );
}
