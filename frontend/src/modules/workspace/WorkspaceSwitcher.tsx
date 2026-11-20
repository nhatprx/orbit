import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Plus } from 'lucide-react';
import type { WorkspaceDto } from '../../types/workspace.types';
import { initialsOf } from '../../utils/format';

interface WorkspaceSwitcherProps {
  workspaces: WorkspaceDto[];
  activeId: string | null;
  onSelect: (workspaceId: string) => void;
  onCreate: () => void;
}

export function WorkspaceSwitcher({ workspaces, activeId, onSelect, onCreate }: WorkspaceSwitcherProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const active = workspaces.find((w) => w.id === activeId) ?? null;

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 border border-[#30363D] bg-[#0D1117] px-2 py-1.5 text-left hover:border-[#22C55E]"
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center border border-[#22C55E] bg-[#052E16] font-mono text-[11px] font-semibold text-[#22C55E]">
          {active ? initialsOf(active.name) : '+'}
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[#E6EDF3]">
          {active?.name ?? 'Create a workspace'}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[#7D8590]" strokeWidth={1.5} />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 z-30 mt-1 max-h-72 overflow-y-auto border border-[#30363D] bg-[#161B22] py-1"
        >
          {workspaces.map((workspace) => (
            <button
              key={workspace.id}
              type="button"
              role="option"
              aria-selected={workspace.id === activeId}
              onClick={() => {
                setOpen(false);
                onSelect(workspace.id);
              }}
              className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[13px] text-[#E6EDF3] hover:bg-[#21262D]"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center border border-[#3B434B] font-mono text-[10px] text-[#8B949E]">
                {initialsOf(workspace.name)}
              </span>
              <span className="min-w-0 flex-1 truncate">{workspace.name}</span>
              {workspace.id === activeId && (
                <Check className="h-3.5 w-3.5 shrink-0 text-[#22C55E]" strokeWidth={1.5} />
              )}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onCreate();
            }}
            className="flex w-full items-center gap-2 border-t border-[#30363D] px-2.5 py-2 text-left text-[13px] text-[#22C55E] hover:bg-[#21262D]"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
            Create workspace
          </button>
        </div>
      )}
    </div>
  );
}
