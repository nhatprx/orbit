import { useState, type DragEvent } from 'react';
import {
  Clock,
  Cloud,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderKanban,
  HardDrive,
  Layers,
  Presentation,
  Star,
  Trash2,
} from 'lucide-react';
import { cloudScopeKey, type CloudQuotaDto, type CloudScope, type CloudView } from '../../types/cloud.types';
import { formatBytes, isInternalNodeDrag, readDraggedNodeIds, scopeDisplay } from './cloudFormat';
import type { CloudLocationOption } from './cloudLocations';

interface CloudSidebarProps {
  scope: CloudScope;
  scopeLabel?: string;
  activeView: CloudView;
  quota: CloudQuotaDto | null;
  locations: CloudLocationOption[];
  onSelectView: (view: CloudView) => void;
  onSelectScope: (scope: CloudScope, label: string) => void;
  onDropNodesToScope: (nodeIds: string[], targetScope: CloudScope) => void;
}

const FAVORITES: Array<{ id: CloudView; label: string; icon: typeof Folder }> = [
  { id: 'RECENTS', label: 'Recents', icon: Clock },
  { id: 'ALL', label: 'All Files', icon: Folder },
  { id: 'STARRED', label: 'Starred', icon: Star },
  { id: 'DOCS', label: 'Documents', icon: FileText },
  { id: 'SHEETS', label: 'Spreadsheets', icon: FileSpreadsheet },
  { id: 'SLIDES', label: 'Presentations', icon: Presentation },
  { id: 'TRASH', label: 'Trash', icon: Trash2 },
];

function LocationIcon({ type }: { type: CloudScope['type'] }) {
  if (type === 'USER') return <Cloud className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />;
  if (type === 'WORKSPACE') return <Layers className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />;
  return <FolderKanban className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />;
}

export function CloudSidebar({
  scope,
  scopeLabel,
  activeView,
  quota,
  locations,
  onSelectView,
  onSelectScope,
  onDropNodesToScope,
}: CloudSidebarProps) {
  const [dropKey, setDropKey] = useState<string | null>(null);
  const activeScopeKey = cloudScopeKey(scope);
  const meta = scopeDisplay(scope, scopeLabel);
  const used = quota?.usedBytes ?? 0;
  const total = quota?.quotaBytes ?? 0;
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  const highUsage = pct >= 90;

  const handleLocDragOver = (e: DragEvent<HTMLButtonElement>, loc: CloudLocationOption) => {
    if (!loc.canWrite || !isInternalNodeDrag(e.dataTransfer)) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (dropKey !== loc.key) setDropKey(loc.key);
  };

  const handleLocDrop = (e: DragEvent<HTMLButtonElement>, loc: CloudLocationOption) => {
    if (!loc.canWrite || !isInternalNodeDrag(e.dataTransfer)) return;
    e.preventDefault();
    e.stopPropagation();
    setDropKey(null);
    const ids = readDraggedNodeIds(e.dataTransfer);
    if (ids.length > 0) onDropNodesToScope(ids, loc.scope);
  };

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-[#30363D] bg-[#161B22]">
      <div className="border-b border-[#30363D] px-3.5 py-3">
        <div className="inline-flex items-center gap-1.5 border border-[#22C55E] bg-[#052E16] px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-[#22C55E]">
          <Cloud className="h-3 w-3" strokeWidth={1.5} />
          {meta.badge}
        </div>
        <p className="mt-1.5 truncate text-xs text-[#8B949E]">{meta.subtitle}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-2.5">
        <p className="px-2 pb-1 font-mono text-[10px] uppercase tracking-wider text-[#7D8590]">Favorites</p>
        <nav className="space-y-0.5" aria-label="Cloud favorites">
          {FAVORITES.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectView(item.id)}
                className={`flex w-full items-center gap-2.5 rounded-none border px-2.5 py-1.5 text-left text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'border-[#22C55E] bg-[#052E16] text-[#22C55E]'
                    : 'border-transparent text-[#8B949E] hover:border-[#30363D] hover:bg-[#21262D] hover:text-[#E6EDF3]'
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <p className="mt-4 px-2 pb-1 font-mono text-[10px] uppercase tracking-wider text-[#7D8590]">Locations</p>
        <nav className="space-y-0.5" aria-label="Cloud locations">
          {locations.map((loc) => {
            const isCurrent = loc.key === activeScopeKey;
            const isDropTarget = dropKey === loc.key;
            return (
              <button
                key={loc.key}
                type="button"
                onClick={() => onSelectScope(loc.scope, loc.label)}
                onDragOver={(e) => handleLocDragOver(e, loc)}
                onDragLeave={() => { if (dropKey === loc.key) setDropKey(null); }}
                onDrop={(e) => handleLocDrop(e, loc)}
                className={`flex w-full items-center gap-2.5 rounded-none border px-2.5 py-1.5 text-left text-[13px] font-medium transition-colors ${
                  isDropTarget
                    ? 'border-[#22C55E] bg-[#052E16] text-[#22C55E]'
                    : isCurrent
                      ? 'border-[#30363D] bg-[#21262D] text-[#E6EDF3]'
                      : 'border-transparent text-[#8B949E] hover:border-[#30363D] hover:bg-[#21262D] hover:text-[#E6EDF3]'
                }`}
              >
                <LocationIcon type={loc.scope.type} />
                <span className="min-w-0 flex-1 truncate">{loc.label}</span>
                {loc.scope.type !== 'USER' && (
                  <span className="shrink-0 font-mono text-[9px] uppercase text-[#7D8590]">
                    {loc.scope.type === 'WORKSPACE' ? 'WS' : 'PRJ'}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-[#30363D] p-3.5">
        <div className="flex items-center justify-between text-xs text-[#8B949E]">
          <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider">
            <HardDrive className="h-3 w-3 text-[#22C55E]" strokeWidth={1.5} />
            Storage
          </span>
          <span className="font-mono text-[11px] text-[#E6EDF3]">{pct}%</span>
        </div>

        <div
          className="mt-2 h-2 w-full border border-[#30363D] bg-[#0D1117]"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Storage quota usage"
        >
          <div className={`h-full transition-all ${highUsage ? 'bg-[#EF4444]' : 'bg-[#22C55E]'}`} style={{ width: `${pct}%` }} />
        </div>

        <p className="mt-1.5 font-mono text-[11px] text-[#8B949E]">
          {quota ? `${formatBytes(used)} / ${formatBytes(total)}` : 'Loading quota...'}
        </p>
      </div>
    </aside>
  );
}
