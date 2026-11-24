import { FileText, Loader2 } from 'lucide-react';
import type { CloudNodeDto } from '../../types/cloud.types';

export interface ActiveSlash {
  start: number;
  query: string;
}

export interface AttachedWorkspaceFile {
  id: string;
  name: string;
  url: string;
}

export function findActiveSlash(text: string, cursor: number): ActiveSlash | null {
  const before = text.slice(0, cursor);
  const slashIndex = before.lastIndexOf('/');
  if (slashIndex < 0) return null;
  if (slashIndex > 0 && !/\s/.test(before[slashIndex - 1] ?? '')) return null;
  const query = before.slice(slashIndex + 1);
  if (/\s/.test(query)) return null;
  return { start: slashIndex, query };
}

export function stripSlashToken(
  text: string,
  start: number,
  cursor: number
): { next: string; nextCursor: number } {
  const before = text.slice(0, start);
  const after = text.slice(cursor);
  const next = (before + after).replace(/\s{2,}/g, ' ');
  return { next, nextCursor: Math.min(start, next.length) };
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface ChatSlashFileMenuProps {
  open: boolean;
  loading: boolean;
  attachingId: string | null;
  files: CloudNodeDto[];
  selectedIndex: number;
  onSelect: (file: CloudNodeDto) => void;
}

export function ChatSlashFileMenu({
  open,
  loading,
  attachingId,
  files,
  selectedIndex,
  onSelect,
}: ChatSlashFileMenuProps) {
  if (!open) return null;

  return (
    <div
      role="listbox"
      aria-label="Workspace file suggestions"
      className="absolute bottom-full left-0 z-20 mb-1.5 w-full max-w-sm border border-[#30363D] bg-[#0D1117] py-1 shadow-lg"
    >
      <div className="flex items-center justify-between border-b border-[#21262D] px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-[#7D8590]">
        <span>Attach workspace file</span>
        {loading && <Loader2 className="h-3 w-3 animate-spin text-[#22C55E]" />}
      </div>

      {!loading && files.length === 0 ? (
        <p className="px-3 py-2.5 text-xs text-[#7D8590]">No matching files in this workspace.</p>
      ) : (
        <div className="max-h-56 overflow-y-auto">
          {files.map((file, idx) => {
            const active = idx === selectedIndex;
            const busy = attachingId === file.id;
            return (
              <button
                key={file.id}
                type="button"
                role="option"
                aria-selected={active}
                disabled={Boolean(attachingId)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(file);
                }}
                className={`flex w-full items-center gap-2.5 px-2.5 py-1.5 text-left text-xs transition-colors disabled:opacity-60 ${
                  active
                    ? 'border-l-2 border-[#22C55E] bg-[#052E16] text-[#E6EDF3]'
                    : 'border-l-2 border-transparent text-[#BDBDBD] hover:bg-[#161B22]'
                }`}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center border border-[#30363D] bg-[#161B22] text-[#22C55E]">
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" strokeWidth={1.5} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-[#E6EDF3]">{file.name}</span>
                  <span className="block truncate font-mono text-[10px] text-[#7D8590]">
                    {file.folderPath ? `${file.folderPath} · ` : ''}{formatBytes(file.sizeBytes)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
