import {
  FileSpreadsheet,
  FileText,
  HardDrive,
  Presentation,
  Star,
  Terminal,
  Trash2,
} from 'lucide-react';
import type { CloudCategory } from '../../types/cloud.types';

interface CloudSidebarProps {
  active: CloudCategory;
  onSelect: (category: CloudCategory) => void;
}

const CATEGORIES: { id: CloudCategory; label: string; icon: typeof HardDrive }[] = [
  { id: 'all', label: 'All Files', icon: HardDrive },
  { id: 'doc', label: 'Documents', icon: FileText },
  { id: 'sheet', label: 'Spreadsheets', icon: FileSpreadsheet },
  { id: 'slide', label: 'Presentations', icon: Presentation },
  { id: 'markdown', label: 'Markdown', icon: Terminal },
  { id: 'starred', label: 'Starred', icon: Star },
  { id: 'trash', label: 'Trash', icon: Trash2 },
];

export function CloudSidebar({ active, onSelect }: CloudSidebarProps) {
  return (
    <div className="flex w-52 shrink-0 flex-col justify-between border-r border-[#30363D] bg-[#161B22] p-3">
      <nav className="space-y-1">
        {CATEGORIES.map((item) => {
          const Icon = item.icon;
          const selected = active === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={`flex w-full items-center gap-2.5 border px-3 py-2 text-sm font-medium transition-colors ${
                selected
                  ? 'border-[#22C55E] bg-[#052E16] text-[#22C55E]'
                  : 'border-transparent text-[#BDBDBD] hover:border-[#30363D] hover:bg-[#21262D] hover:text-[#E6EDF3]'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="border-t border-[#30363D] pt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-[#BDBDBD]">Storage</span>
          <span className="font-mono text-[#22C55E]">2.7 GB / 100 GB</span>
        </div>
        <div className="h-1.5 w-full bg-[#0D1117]">
          <div className="h-full w-[12%] bg-[#22C55E]" />
        </div>
      </div>
    </div>
  );
}
