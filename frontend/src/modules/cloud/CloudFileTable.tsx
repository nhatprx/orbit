import {
  FileSpreadsheet,
  FileText,
  Folder,
  Presentation,
  RotateCcw,
  Star,
  Terminal,
  Trash2,
} from 'lucide-react';
import type { CloudFileItem, CloudFileKind } from '../../types/cloud.types';

interface CloudFileTableProps {
  files: CloudFileItem[];
  selectedId: string | null;
  onSelect: (file: CloudFileItem) => void;
  onToggleStar: (id: string) => void;
  onToggleTrash: (id: string, trashed: boolean) => void;
}

const KIND_ICON: Record<CloudFileKind, typeof FileText> = {
  folder: Folder,
  doc: FileText,
  sheet: FileSpreadsheet,
  slide: Presentation,
  markdown: Terminal,
};

export function CloudFileTable({
  files,
  selectedId,
  onSelect,
  onToggleStar,
  onToggleTrash,
}: CloudFileTableProps) {
  return (
    <div className="flex-1 overflow-y-auto bg-[#0D1117]">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 border-b border-[#30363D] bg-[#161B22] text-xs uppercase tracking-wider text-[#BDBDBD]">
          <tr>
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="hidden px-4 py-3 font-medium sm:table-cell">Owner</th>
            <th className="hidden px-4 py-3 font-medium md:table-cell">Size</th>
            <th className="px-4 py-3 font-medium">Modified</th>
            <th className="px-4 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {files.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-sm text-[#8A8A8A]">
                No files in this view.
              </td>
            </tr>
          ) : (
            files.map((file) => {
              const Icon = KIND_ICON[file.kind];
              const isSelected = file.id === selectedId;
              return (
                <tr
                  key={file.id}
                  onClick={() => onSelect(file)}
                  className={`cursor-pointer border-b border-[#30363D] transition-colors ${
                    isSelected
                      ? 'bg-[#161B22]'
                      : 'hover:bg-[#161B22]'
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4 shrink-0 text-[#22C55E]" strokeWidth={1.5} />
                      <span className="truncate font-medium text-[#E6EDF3]">
                        {file.name}
                      </span>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 font-mono text-xs text-[#BDBDBD] sm:table-cell">
                    {file.owner}
                  </td>
                  <td className="hidden px-4 py-3 font-mono text-xs text-[#8A8A8A] md:table-cell">
                    {file.size}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[#8A8A8A]">
                    {file.updatedAt}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      {!file.trashed && (
                        <button
                          type="button"
                          title="Star"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleStar(file.id);
                          }}
                          className={
                            file.starred
                              ? 'text-[#22C55E]'
                              : 'text-[#8A8A8A] hover:text-[#E6EDF3]'
                          }
                        >
                          <Star
                            className="h-4 w-4"
                            strokeWidth={1.5}
                            fill={file.starred ? 'currentColor' : 'none'}
                          />
                        </button>
                      )}
                      <button
                        type="button"
                        title={file.trashed ? 'Restore' : 'Move to trash'}
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleTrash(file.id, !file.trashed);
                        }}
                        className="text-[#8A8A8A] hover:text-[#EF4444]"
                      >
                        {file.trashed ? (
                          <RotateCcw className="h-4 w-4 text-[#22C55E]" strokeWidth={1.5} />
                        ) : (
                          <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
