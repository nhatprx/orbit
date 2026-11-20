import { Cloud, Folder, HardDrive, Star, Trash2 } from 'lucide-react';
import type { CloudQuotaDto, CloudScope, CloudView } from '../../types/cloud.types';
import { formatBytes, scopeDisplay } from './cloudFormat';

interface CloudSidebarProps {
  scope: CloudScope;
  scopeLabel?: string;
  activeView: CloudView;
  quota: CloudQuotaDto | null;
  onSelectView: (view: CloudView) => void;
}

const VIEWS: Array<{ id: CloudView; label: string; icon: typeof Folder }> = [
  { id: 'ALL', label: 'All Files', icon: Folder },
  { id: 'STARRED', label: 'Starred', icon: Star },
  { id: 'TRASH', label: 'Trash', icon: Trash2 },
];

export function CloudSidebar({
  scope,
  scopeLabel,
  activeView,
  quota,
  onSelectView,
}: CloudSidebarProps) {
  const meta = scopeDisplay(scope, scopeLabel);
  const used = quota?.usedBytes ?? 0;
  const total = quota?.quotaBytes ?? 0;
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  const highUsage = pct >= 90;

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-[#30363D] bg-[#161B22]">
      <div className="border-b border-[#30363D] px-3.5 py-3">
        <div className="inline-flex items-center gap-1.5 border border-[#22C55E] bg-[#052E16] px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-[#22C55E]">
          <Cloud className="h-3 w-3" strokeWidth={1.5} />
          {meta.badge}
        </div>
        <p className="mt-1.5 truncate text-xs text-[#8B949E]">{meta.subtitle}</p>
      </div>

      <nav className="flex-1 space-y-0.5 p-2.5" aria-label="Cloud views">
        {VIEWS.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectView(item.id)}
              className={`flex w-full items-center gap-2.5 border px-2.5 py-2 text-left text-[13px] font-medium transition-colors ${
                isActive
                  ? 'border-[#22C55E] bg-[#052E16] text-[#22C55E]'
                  : 'border-transparent text-[#8B949E] hover:border-[#30363D] hover:bg-[#21262D] hover:text-[#E6EDF3]'
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

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
          <div
            className={`h-full transition-all ${highUsage ? 'bg-[#EF4444]' : 'bg-[#22C55E]'}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        <p className="mt-1.5 font-mono text-[11px] text-[#8B949E]">
          {quota ? `${formatBytes(used)} / ${formatBytes(total)}` : 'Loading quota...'}
        </p>
      </div>
    </aside>
  );
}
