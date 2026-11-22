import { useEffect, useRef, useState, type DragEvent, type FormEvent } from 'react';
import { Check, ChevronDown, ChevronRight, Pencil, Plus, Settings, Trash2, X } from 'lucide-react';

interface ChatCategoryHeaderProps {
  category: string;
  isCollapsed: boolean;
  canManageChannels: boolean;
  isDragOver?: boolean;
  onToggle: () => void;
  onAddSubChannel?: (category: string) => void;
  onRename?: (oldCategory: string, nextCategory: string) => Promise<void>;
  onDelete?: (category: string) => void;
  onDragStart?: (event: DragEvent) => void;
  onDragOver?: (event: DragEvent) => void;
  onDragLeave?: () => void;
  onDrop?: (event: DragEvent) => void;
}

export function ChatCategoryHeader({
  category,
  isCollapsed,
  canManageChannels,
  isDragOver = false,
  onToggle,
  onAddSubChannel,
  onRename,
  onDelete,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
}: ChatCategoryHeaderProps) {
  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [draft, setDraft] = useState(category);
  const [saving, setSaving] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

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
        <button type="submit" aria-label="Save category title" disabled={saving || !draft.trim()}
          className="flex h-6 w-6 shrink-0 items-center justify-center border border-[#22C55E] bg-[#052E16] text-[#4ADE80] disabled:opacity-40">
          <Check className="h-3 w-3" strokeWidth={1.75} />
        </button>
        <button type="button" aria-label="Cancel category edit" disabled={saving}
          onClick={() => { setEditing(false); setDraft(category); }}
          className="flex h-6 w-6 shrink-0 items-center justify-center border border-[#30363D] bg-[#0D1117] text-[#8B949E] hover:text-[#E6EDF3]">
          <X className="h-3 w-3" strokeWidth={1.5} />
        </button>
      </form>
    );
  }

  return (
    <div
      ref={menuRef}
      draggable={canManageChannels}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`group relative flex items-center justify-between gap-1 px-1.5 py-1 transition-colors ${
        isDragOver ? 'border-t-2 border-[#22C55E] bg-[#052E16]/40' : 'border-t-2 border-transparent'
      } ${canManageChannels ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      <button
        type="button"
        aria-expanded={!isCollapsed}
        onClick={onToggle}
        className="flex min-w-0 flex-1 items-center gap-1 text-left font-mono text-[11px] font-semibold uppercase tracking-wider text-[#8A8A8A] hover:text-[#E6EDF3]"
      >
        {isCollapsed ? <ChevronRight className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} /> : <ChevronDown className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />}
        <span className="truncate">{category}</span>
      </button>

      {canManageChannels && (
        <button
          type="button"
          aria-label={`Channel settings for ${category}`}
          aria-expanded={menuOpen}
          title="Channel settings"
          onClick={() => setMenuOpen((v) => !v)}
          className={`shrink-0 p-0.5 transition-opacity hover:text-[#22C55E] ${
            menuOpen ? 'text-[#22C55E] opacity-100' : 'text-[#7D8590] opacity-0 focus:opacity-100 group-hover:opacity-100'
          }`}
        >
          <Settings className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      )}

      {menuOpen && (
        <div role="menu" className="absolute right-1 top-full z-30 mt-0.5 flex min-w-[152px] flex-col border border-[#30363D] bg-[#0D1117] p-1 shadow-xl">
          {onAddSubChannel && (
            <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onAddSubChannel(category); }}
              className="flex items-center gap-2 px-2 py-1.5 text-left text-xs text-[#BDBDBD] hover:bg-[#161B22] hover:text-[#4ADE80]">
              <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
              Add sub-channel
            </button>
          )}
          {onRename && (
            <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); setDraft(category); setEditing(true); }}
              className="flex items-center gap-2 px-2 py-1.5 text-left text-xs text-[#BDBDBD] hover:bg-[#161B22] hover:text-[#E6EDF3]">
              <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
              Rename channel
            </button>
          )}
          {onDelete && (
            <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onDelete(category); }}
              className="flex items-center gap-2 px-2 py-1.5 text-left text-xs text-[#BDBDBD] hover:bg-[#161B22] hover:text-[#EF4444]">
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
              Delete channel
            </button>
          )}
        </div>
      )}
    </div>
  );
}
