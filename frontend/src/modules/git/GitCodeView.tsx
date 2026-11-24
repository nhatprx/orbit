import { useCallback, useEffect, useMemo, useState } from 'react';
import type { GitApi } from '../../services/git/gitApi';
import type { GitFileContentDto, GitScope, GitTreeEntryDto } from '../../types/git.types';
import { GitCodeTree } from './GitCodeTree';
import { GitFileViewerPane } from './GitFileViewerPane';
import {
  fetchFullGitTree,
  getCachedFullTree,
  getCachedGitFile,
  prefetchGitFile,
} from './gitCodeCache';
import { buildCodeTree, flattenVisibleTree } from './gitCodeTreeUtils';

interface GitCodeViewProps {
  scope: GitScope;
  api: GitApi;
  activeBranch: string;
  enableFastTree: boolean;
  currentDir: string;
  tree: GitTreeEntryDto[];
  selectedFile: GitFileContentDto | null;
  fileLoading: boolean;
  canWrite: boolean;
  canDelete: boolean;
  onNavigateDir: (dirPath: string) => void;
  onOpenFile: (filePath: string) => void;
  onSelectCachedFile: (file: GitFileContentDto | null) => void;
  onNewFile: () => void;
  onSaveInlineFile: (file: GitFileContentDto, content: string, commitMessage: string) => Promise<void>;
  onDeleteFile: (file: GitFileContentDto, commitMessage: string) => Promise<void>;
}

export function GitCodeView({
  scope,
  api,
  activeBranch,
  enableFastTree,
  currentDir,
  tree,
  selectedFile,
  fileLoading,
  canWrite,
  canDelete,
  onNavigateDir,
  onOpenFile,
  onSelectCachedFile,
  onNewFile,
  onSaveInlineFile,
  onDeleteFile,
}: GitCodeViewProps) {
  const [fullTree, setFullTree] = useState<GitTreeEntryDto[] | null>(() =>
    enableFastTree && activeBranch ? getCachedFullTree(scope, activeBranch) : null,
  );
  const [treeLoading, setTreeLoading] = useState(false);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(() => new Set());
  const [filter, setFilter] = useState('');
  const [openTabs, setOpenTabs] = useState<GitFileContentDto[]>([]);

  const loadFullTree = useCallback(
    async (force = false) => {
      if (!enableFastTree || !activeBranch) return;
      if (!force) {
        const cached = getCachedFullTree(scope, activeBranch);
        if (cached) {
          setFullTree(cached);
          return;
        }
      }
      setTreeLoading(true);
      try {
        const entries = await fetchFullGitTree(scope, activeBranch, force);
        setFullTree(entries);
      } catch {
        setFullTree(null);
      } finally {
        setTreeLoading(false);
      }
    },
    [activeBranch, enableFastTree, scope],
  );

  useEffect(() => {
    setExpandedDirs(new Set());
    setFilter('');
    setOpenTabs([]);
    void loadFullTree(false);
  }, [loadFullTree]);

  useEffect(() => {
    if (!enableFastTree || !activeBranch || !fullTree?.length) return;
    const readme = fullTree.find((e) => e.type === 'file' && e.path.toLowerCase() === 'readme.md');
    if (readme) prefetchGitFile(scope, api, activeBranch, readme.path);
  }, [activeBranch, api, enableFastTree, fullTree, scope]);

  useEffect(() => {
    if (!selectedFile) return;
    setOpenTabs((prev) => {
      const exists = prev.some((t) => t.path === selectedFile.path);
      if (exists) return prev.map((t) => (t.path === selectedFile.path ? selectedFile : t));
      return [...prev.slice(-7), selectedFile];
    });
  }, [selectedFile]);

  const useRecursiveMode = Boolean(enableFastTree && fullTree && fullTree.length > 0);

  const treeRoots = useMemo(
    () => (useRecursiveMode && fullTree ? buildCodeTree(fullTree) : []),
    [fullTree, useRecursiveMode],
  );

  const visibleRows = useMemo(
    () => (useRecursiveMode ? flattenVisibleTree(treeRoots, expandedDirs, filter) : []),
    [expandedDirs, filter, treeRoots, useRecursiveMode],
  );

  function handleToggleDir(dirPath: string) {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(dirPath)) next.delete(dirPath);
      else next.add(dirPath);
      return next;
    });
  }

  function handleOpenFile(filePath: string) {
    if (enableFastTree && activeBranch) {
      const hit = getCachedGitFile(scope, activeBranch, filePath);
      if (hit) {
        onSelectCachedFile(hit);
        return;
      }
    }
    onOpenFile(filePath);
  }

  function handleCloseTab(path: string) {
    setOpenTabs((prev) => {
      const next = prev.filter((t) => t.path !== path);
      if (selectedFile?.path === path) {
        onSelectCachedFile(next[next.length - 1] ?? null);
      }
      return next;
    });
  }

  return (
    <div className="grid h-[calc(100vh-11.5rem)] min-h-[460px] grid-cols-1 gap-3 lg:grid-cols-12">
      <GitCodeTree
        useRecursiveMode={useRecursiveMode}
        currentDir={currentDir}
        lazyTree={tree}
        rows={visibleRows}
        filter={filter}
        treeLoading={treeLoading}
        activeFilePath={selectedFile?.path ?? null}
        canWrite={canWrite}
        onFilterChange={setFilter}
        onToggleDir={handleToggleDir}
        onCollapseAll={() => setExpandedDirs(new Set())}
        onRefreshTree={() => void loadFullTree(true)}
        onNavigateDir={onNavigateDir}
        onOpenFile={handleOpenFile}
        onPrefetchFile={(path) => {
          if (enableFastTree && activeBranch) prefetchGitFile(scope, api, activeBranch, path);
        }}
        onNewFile={onNewFile}
      />

      <GitFileViewerPane
        selectedFile={selectedFile}
        openTabs={openTabs}
        fileLoading={fileLoading}
        canWrite={canWrite}
        canDelete={canDelete}
        onSelectTab={(file) => onSelectCachedFile(file)}
        onCloseTab={handleCloseTab}
        onSaveInlineFile={async (file, content, commitMessage) => {
          await onSaveInlineFile(file, content, commitMessage);
          if (enableFastTree) void loadFullTree(true);
        }}
        onDeleteFile={async (file, commitMessage) => {
          await onDeleteFile(file, commitMessage);
          handleCloseTab(file.path);
          if (enableFastTree) void loadFullTree(true);
        }}
      />
    </div>
  );
}
