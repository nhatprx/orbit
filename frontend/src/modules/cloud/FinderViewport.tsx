import type { MouseEvent } from 'react';
import type { CloudFilesApi } from '../../services/cloud/cloudApi';
import type { CloudNodeDto, CloudPermissions, CloudSortBy, CloudSortDir, CloudView } from '../../types/cloud.types';
import { CloudFileTable } from './CloudFileTable';
import type { FinderViewMode } from './CloudToolbar';
import { FinderColumnsView } from './FinderColumnsView';
import { FinderGridView } from './FinderGridView';

interface FinderViewportProps {
  api: CloudFilesApi;
  viewMode: FinderViewMode;
  nodes: CloudNodeDto[];
  view: CloudView;
  searchQuery: string;
  sortBy: CloudSortBy;
  sortDir: CloudSortDir;
  treeResetKey: string;
  selectedIds: string[];
  loading: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  permissions: CloudPermissions;
  onSelect: (node: CloudNodeDto, orderedIds: string[], e: MouseEvent) => void;
  onContextMenu: (node: CloudNodeDto, e: MouseEvent) => void;
  onOpenFolder: (folderId: string) => void;
  onOpenEditor: (node: CloudNodeDto) => void;
  onToggleStar: (node: CloudNodeDto) => void;
  onToggleLock?: (node: CloudNodeDto) => void;
  onDownload: (node: CloudNodeDto) => void;
  onRename: (node: CloudNodeDto) => void;
  onMove: (node: CloudNodeDto) => void;
  onDropToFolder: (nodeIds: string[], targetFolderId: string) => void;
  onSoftDelete: (node: CloudNodeDto) => void;
  onRestore: (node: CloudNodeDto) => void;
  onPermanentDelete: (node: CloudNodeDto) => void;
  onLoadMore: () => void;
}

export function FinderViewport(props: FinderViewportProps) {
  if (props.viewMode === 'icons') {
    return (
      <FinderGridView
        nodes={props.nodes}
        view={props.view}
        selectedIds={props.selectedIds}
        loading={props.loading}
        hasMore={props.hasMore}
        loadingMore={props.loadingMore}
        permissions={props.permissions}
        onSelect={props.onSelect}
        onContextMenu={props.onContextMenu}
        onOpenFolder={props.onOpenFolder}
        onOpenEditor={props.onOpenEditor}
        onDropToFolder={props.onDropToFolder}
        onLoadMore={props.onLoadMore}
      />
    );
  }
  if (props.viewMode === 'columns') {
    return (
      <FinderColumnsView
        api={props.api}
        rootNodes={props.nodes}
        view={props.view}
        sortBy={props.sortBy}
        sortDir={props.sortDir}
        resetKey={props.treeResetKey}
        selectedIds={props.selectedIds}
        loading={props.loading}
        permissions={props.permissions}
        onSelect={props.onSelect}
        onContextMenu={props.onContextMenu}
        onOpenEditor={props.onOpenEditor}
        onDownload={props.onDownload}
        onRename={props.onRename}
        onMove={props.onMove}
        onSoftDelete={props.onSoftDelete}
        onDropToFolder={props.onDropToFolder}
      />
    );
  }
  return (
    <CloudFileTable
      api={props.api}
      nodes={props.nodes}
      view={props.view}
      searchQuery={props.searchQuery}
      sortBy={props.sortBy}
      sortDir={props.sortDir}
      treeResetKey={props.treeResetKey}
      selectedIds={props.selectedIds}
      loading={props.loading}
      hasMore={props.hasMore}
      loadingMore={props.loadingMore}
      permissions={props.permissions}
      onSelect={props.onSelect}
      onContextMenu={props.onContextMenu}
      onOpenFolder={props.onOpenFolder}
      onOpenEditor={props.onOpenEditor}
      onToggleStar={props.onToggleStar}
      onToggleLock={props.onToggleLock}
      onDownload={props.onDownload}
      onRename={props.onRename}
      onMove={props.onMove}
      onDropToFolder={props.onDropToFolder}
      onSoftDelete={props.onSoftDelete}
      onRestore={props.onRestore}
      onPermanentDelete={props.onPermanentDelete}
      onLoadMore={props.onLoadMore}
    />
  );
}
