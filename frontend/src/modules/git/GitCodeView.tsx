import { ArrowUp, FileCode, Folder, Plus } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import type { GitFileContentDto, GitTreeEntryDto } from '../../types/git.types';
import { GitFileViewerPane } from './GitFileViewerPane';

interface GitCodeViewProps {
  currentDir: string;
  tree: GitTreeEntryDto[];
  selectedFile: GitFileContentDto | null;
  fileLoading: boolean;
  canWrite: boolean;
  canDelete: boolean;
  onNavigateDir: (dirPath: string) => void;
  onOpenFile: (filePath: string) => void;
  onNewFile: () => void;
  onEditFile: (file: GitFileContentDto) => void;
  onDeleteFile: (file: GitFileContentDto, commitMessage: string) => Promise<void>;
}

export function GitCodeView({
  currentDir,
  tree,
  selectedFile,
  fileLoading,
  canWrite,
  canDelete,
  onNavigateDir,
  onOpenFile,
  onNewFile,
  onEditFile,
  onDeleteFile,
}: GitCodeViewProps) {
  const segments = currentDir ? currentDir.split('/').filter(Boolean) : [];
  const parentDir = segments.length > 1 ? segments.slice(0, -1).join('/') : '';

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      <div className="border border-[#30363D] bg-[#161B22] lg:col-span-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#30363D] px-4 py-2.5">
          <div className="flex flex-wrap items-center gap-1 font-mono text-xs text-[#BDBDBD]">
            <button
              type="button"
              onClick={() => onNavigateDir('')}
              className="hover:text-[#22C55E]"
            >
              root
            </button>
            {segments.map((seg, i) => {
              const target = segments.slice(0, i + 1).join('/');
              return (
                <span key={target} className="flex items-center gap-1">
                  <span className="text-[#8A8A8A]">/</span>
                  <button
                    type="button"
                    onClick={() => onNavigateDir(target)}
                    className="hover:text-[#22C55E]"
                  >
                    {seg}
                  </button>
                </span>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5">
            {currentDir && (
              <Button type="button" variant="secondary" onClick={() => onNavigateDir(parentDir)}>
                <ArrowUp className="h-3.5 w-3.5" strokeWidth={1.5} />
                Up
              </Button>
            )}
            {canWrite && (
              <Button type="button" variant="primary" onClick={onNewFile}>
                <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                New File
              </Button>
            )}
          </div>
        </div>

        <div>
          {tree.length === 0 ? (
            <div className="p-5 text-xs text-[#8A8A8A]">Directory is empty.</div>
          ) : (
            tree.map((entry, idx) => {
              const active = entry.type === 'file' && entry.path === selectedFile?.path;
              return (
                <button
                  key={entry.path}
                  type="button"
                  onClick={() =>
                    entry.type === 'dir' ? onNavigateDir(entry.path) : onOpenFile(entry.path)
                  }
                  className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                    idx > 0 ? 'border-t border-[#30363D]' : ''
                  } ${
                    active
                      ? 'border-l-2 border-l-[#22C55E] bg-[#21262D] text-[#E6EDF3]'
                      : 'text-[#BDBDBD] hover:bg-[#21262D] hover:text-[#E6EDF3]'
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    {entry.type === 'dir' ? (
                      <Folder className="h-4 w-4 shrink-0 text-[#22C55E]" strokeWidth={1.5} />
                    ) : (
                      <FileCode className="h-4 w-4 shrink-0 text-[#22C55E]" strokeWidth={1.5} />
                    )}
                    <span className="truncate font-mono text-xs">{entry.name}</span>
                  </span>
                  <span className="shrink-0 font-mono text-[11px] text-[#8A8A8A]">
                    {entry.type === 'dir' ? 'dir' : `${entry.size} B`}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      <GitFileViewerPane
        selectedFile={selectedFile}
        fileLoading={fileLoading}
        canWrite={canWrite}
        canDelete={canDelete}
        onEditFile={onEditFile}
        onDeleteFile={onDeleteFile}
      />
    </div>
  );
}
