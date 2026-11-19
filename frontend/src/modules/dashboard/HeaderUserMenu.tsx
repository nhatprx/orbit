import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import type { WorkspaceAreaId } from '../../types/dashboard.types';

const CREATE_ITEMS: { id: WorkspaceAreaId; label: string }[] = [
  { id: 'git', label: 'New Git workspace' },
  { id: 'mail', label: 'New Mail draft' },
  { id: 'docs', label: 'New Document' },
  { id: 'sheets', label: 'New Sheet' },
  { id: 'ppt', label: 'New Presentation' },
  { id: 'markdown', label: 'New Markdown note' },
];

export function HeaderCreateMenu({
  onSelectArea,
}: {
  onSelectArea: (area: WorkspaceAreaId) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        title="Create new"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 items-center gap-1 border border-[#2E2E2E] bg-[#0A0A0A] px-2 text-[#A3A3A3] transition-colors hover:border-[#22C55E] hover:text-[#F5F5F5]"
      >
        <Plus className="h-4 w-4" strokeWidth={1.5} />
        <ChevronDown className="h-3 w-3" strokeWidth={1.5} />
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-48 border border-[#2E2E2E] bg-[#0A0A0A] py-1">
          {CREATE_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectArea(item.id);
                setOpen(false);
              }}
              className="block w-full px-3 py-2 text-left text-xs text-[#F5F5F5] hover:bg-[#111111] hover:text-[#22C55E]"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
