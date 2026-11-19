import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import type { WorkspaceAreaId } from '../../types/dashboard.types';

const CREATE_ITEMS: { id: WorkspaceAreaId; label: string }[] = [
  { id: 'git', label: 'New workspace' },
  { id: 'mail', label: 'New Mail draft' },
  { id: 'cloud', label: 'New Cloud File' },
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
        className="flex h-7 items-center gap-0.5 border border-[#30363D] bg-[#161B22] px-1.5 text-[#8B949E] transition-colors hover:border-[#22C55E] hover:text-[#E6EDF3]"
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
        <ChevronDown className="h-3 w-3" strokeWidth={1.5} />
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-44 border border-[#30363D] bg-[#161B22] py-1">
          {CREATE_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectArea(item.id);
                setOpen(false);
              }}
              className="block w-full px-3 py-1.5 text-left text-[13px] text-[#E6EDF3] hover:bg-[#21262D] hover:text-[#22C55E]"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
