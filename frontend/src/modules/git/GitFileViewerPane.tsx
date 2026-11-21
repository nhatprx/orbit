import { useState } from 'react';
import { Check, Copy, Pencil, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import type { GitFileContentDto } from '../../types/git.types';

interface GitFileViewerPaneProps {
  selectedFile: GitFileContentDto | null;
  fileLoading: boolean;
  canWrite: boolean;
  canDelete: boolean;
  onEditFile: (file: GitFileContentDto) => void;
  onDeleteFile: (file: GitFileContentDto, commitMessage: string) => Promise<void>;
}

export function GitFileViewerPane({
  selectedFile,
  fileLoading,
  canWrite,
  canDelete,
  onEditFile,
  onDeleteFile,
}: GitFileViewerPaneProps) {
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState('');

  async function handleCopy() {
    if (!selectedFile) return;
    await navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function startDelete() {
    if (!selectedFile) return;
    setDeleteMessage(`Delete ${selectedFile.path}`);
    setConfirmDelete(true);
  }

  async function handleConfirmDelete() {
    if (!selectedFile || !deleteMessage.trim()) return;
    setDeleting(true);
    try {
      await onDeleteFile(selectedFile, deleteMessage.trim());
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  }

  if (fileLoading) {
    return (
      <div className="border border-[#30363D] bg-[#161B22] p-6 text-xs text-[#8A8A8A] lg:col-span-7">
        Loading file content...
      </div>
    );
  }

  if (!selectedFile) {
    return (
      <div className="border border-[#30363D] bg-[#161B22] p-6 text-sm text-[#8A8A8A] lg:col-span-7">
        Select a file to inspect.
      </div>
    );
  }

  return (
    <div className="border border-[#30363D] bg-[#161B22] lg:col-span-7">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#30363D] px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs font-semibold text-[#E6EDF3]">
            {selectedFile.path}
          </span>
          {selectedFile.language && (
            <span className="border border-[#30363D] bg-[#0D1117] px-2 py-0.5 font-mono text-[11px] text-[#8A8A8A]">
              {selectedFile.language}
            </span>
          )}
          <span className="border border-[#30363D] bg-[#0D1117] px-2 py-0.5 font-mono text-[11px] text-[#22C55E]">
            {selectedFile.sha.slice(0, 7)}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Button type="button" variant="secondary" onClick={() => void handleCopy()}>
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-[#22C55E]" strokeWidth={1.5} />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
                Copy
              </>
            )}
          </Button>
          {canWrite && (
            <Button type="button" variant="secondary" onClick={() => onEditFile(selectedFile)}>
              <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
              Edit File
            </Button>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={startDelete}
              className="inline-flex items-center gap-1.5 border border-[#3B434B] bg-[#21262D] px-3 py-1.5 text-[13px] font-medium text-[#EF4444] hover:border-[#EF4444]"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
              Delete File
            </button>
          )}
        </div>
      </div>

      {confirmDelete && (
        <div className="flex flex-wrap items-center gap-2 border-b border-[#EF4444] bg-[#0D1117] px-4 py-2.5">
          <input
            aria-label="Delete commit message"
            value={deleteMessage}
            onChange={(e) => setDeleteMessage(e.target.value)}
            className="flex-1 border border-[#30363D] bg-[#161B22] px-2.5 py-1 font-mono text-xs text-[#E6EDF3] focus:border-[#22C55E] focus:outline-none"
          />
          <Button type="button" variant="secondary" onClick={() => setConfirmDelete(false)}>
            Cancel
          </Button>
          <button
            type="button"
            disabled={deleting || !deleteMessage.trim()}
            onClick={() => void handleConfirmDelete()}
            className="border border-[#EF4444] bg-[#EF4444] px-3 py-1.5 text-xs font-medium text-[#0D1117] disabled:opacity-50"
          >
            {deleting ? 'Deleting...' : 'Confirm Delete'}
          </button>
        </div>
      )}

      <pre className="overflow-x-auto bg-[#0D1117] p-4 font-mono text-xs leading-relaxed text-[#E6EDF3]">
        {selectedFile.content.split('\n').map((line, i) => (
          <div key={i} className="flex gap-4">
            <span className="w-7 select-none text-right text-[#8A8A8A]">{i + 1}</span>
            <span>{line || ' '}</span>
          </div>
        ))}
      </pre>
    </div>
  );
}
