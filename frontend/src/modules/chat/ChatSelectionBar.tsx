import { useState } from 'react';
import { Check, CheckSquare, Copy, Trash2, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';

interface ChatSelectionBarProps {
  selectedCount: number;
  deletableCount: number;
  onCopySelected: () => Promise<void>;
  onDeleteSelected: () => Promise<void>;
  onCancel: () => void;
}

export function ChatSelectionBar({
  selectedCount,
  deletableCount,
  onCopySelected,
  onDeleteSelected,
  onCancel,
}: ChatSelectionBarProps) {
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleCopy() {
    await onCopySelected();
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await onDeleteSelected();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      role="toolbar"
      aria-label="Selected messages actions"
      className="flex items-center justify-between gap-3 border-t border-[#22C55E] bg-[#161B22] px-4 py-3"
    >
      <div className="flex items-center gap-2 text-xs font-medium text-[#E6EDF3]">
        <CheckSquare className="h-4 w-4 text-[#22C55E]" strokeWidth={1.5} />
        <span className="font-mono text-[#4ADE80]">{selectedCount}</span>
        <span>selected</span>
      </div>

      <div className="flex items-center gap-2">
        <Button type="button" variant="secondary" disabled={selectedCount === 0} onClick={() => void handleCopy()}>
          {copied ? <Check className="h-3.5 w-3.5 text-[#22C55E]" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </Button>

        {deletableCount > 0 && (
          <button
            type="button"
            disabled={deleting}
            onClick={() => void handleDelete()}
            className="inline-flex h-9 items-center gap-1.5 border border-[#EF4444] bg-[#0D1117] px-3 text-xs font-medium text-[#EF4444] hover:bg-[#21262D] disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
            {deleting ? 'Deleting...' : `Delete (${deletableCount})`}
          </button>
        )}

        <button
          type="button"
          aria-label="Cancel selection"
          onClick={onCancel}
          className="flex h-9 w-9 items-center justify-center border border-[#30363D] bg-[#0D1117] text-[#8B949E] hover:text-[#E6EDF3]"
        >
          <X className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
