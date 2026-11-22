import { useState, type FormEvent } from 'react';
import { Check, ChevronDown, ChevronRight, Pencil, X } from 'lucide-react';

interface ChatCategoryHeaderProps {
  category: string;
  isCollapsed: boolean;
  canManageChannels: boolean;
  onToggle: () => void;
  onRename?: (oldCategory: string, nextCategory: string) => Promise<void>;
}

export function ChatCategoryHeader({
  category,
  isCollapsed,
  canManageChannels,
  onToggle,
  onRename,
}: ChatCategoryHeaderProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(category);
  const [saving, setSaving] = useState(false);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || trimmed === category || !onRename) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onRename(category, trimmed);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <form onSubmit={(e) => void handleSave(e)} className="flex items-center gap-1 px-1 py-0.5">
        <input
          type="text"
          aria-label="Category title"
          value={draft}
          maxLength={64}
          disabled={saving}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Escape') { setEditing(false); setDraft(category); } }}
          autoFocus
          className="h-6 min-w-0 flex-1 border border-[#22C55E] bg-[#0D1117] px-1.5 font-mono text-[11px] uppercase tracking-wider text-[#E6EDF3] focus:outline-none"
        />
        <button
          type="submit"
          aria-label="Save category title"
          disabled={saving || !draft.trim()}
          className="flex h-6 w-6 shrink-0 items-center justify-center border border-[#22C55E] bg-[#052E16] text-[#4ADE80] disabled:opacity-40"
        >
          <Check className="h-3 w-3" strokeWidth={1.75} />
        </button>
        <button
          type="button"
          aria-label="Cancel category edit"
          disabled={saving}
          onClick={() => { setEditing(false); setDraft(category); }}
          className="flex h-6 w-6 shrink-0 items-center justify-center border border-[#30363D] bg-[#0D1117] text-[#8B949E] hover:text-[#E6EDF3]"
        >
          <X className="h-3 w-3" strokeWidth={1.5} />
        </button>
      </form>
    );
  }

  return (
    <div className="group flex items-center justify-between gap-1 px-1.5 py-1">
      <button
        type="button"
        aria-expanded={!isCollapsed}
        onClick={onToggle}
        className="flex min-w-0 flex-1 items-center gap-1 text-left font-mono text-[11px] font-semibold uppercase tracking-wider text-[#8A8A8A] hover:text-[#E6EDF3]"
      >
        {isCollapsed ? (
          <ChevronRight className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
        )}
        <span className="truncate">{category}</span>
      </button>

      {canManageChannels && onRename && (
        <button
          type="button"
          aria-label={`Edit category ${category}`}
          title="Rename category"
          onClick={() => { setDraft(category); setEditing(true); }}
          className="shrink-0 p-0.5 text-[#7D8590] opacity-0 transition-opacity hover:text-[#22C55E] focus:opacity-100 group-hover:opacity-100"
        >
          <Pencil className="h-3 w-3" strokeWidth={1.5} />
        </button>
      )}
    </div>
  );
}
