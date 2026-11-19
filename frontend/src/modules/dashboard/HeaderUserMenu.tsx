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
        className="flex h-9 items-center gap-1 border border-[#3B434B] bg-[#161B22] px-2.5 text-[#BDBDBD] transition-colors hover:border-[#22C55E] hover:text-[#E6EDF3]"
      >
        <Plus className="h-4 w-4" strokeWidth={1.5} />
        <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.5} />
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-56 border border-[#3B434B] bg-[#161B22] py-1">
          {CREATE_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectArea(item.id);
                setOpen(false);
              }}
              className="block w-full px-3.5 py-2.5 text-left text-sm text-[#E6EDF3] hover:bg-[#21262D] hover:text-[#22C55E]"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
