import { MODULE_META } from '../workspace/moduleMeta';
import type { ModuleKey } from '../../types/workspace.types';

export interface ModuleToggleItem {
  key: ModuleKey;
  enabled: boolean;
  /** Why the toggle is unavailable (for example: not enabled on the workspace). */
  lockedReason?: string;
  note?: string;
}

interface ModuleToggleListProps {
  items: ModuleToggleItem[];
  canToggle: (item: ModuleToggleItem) => boolean;
  pendingKey: ModuleKey | null;
  onToggle: (item: ModuleToggleItem) => void;
}

export function ModuleToggleList({ items, canToggle, pendingKey, onToggle }: ModuleToggleListProps) {
  return (
    <div className="divide-y divide-[#30363D] border border-[#30363D]">
      {items.map((item) => {
        const meta = MODULE_META[item.key];
        const Icon = meta.icon;
        const allowed = canToggle(item) && !item.lockedReason && pendingKey !== item.key;
        return (
          <div key={item.key} className="flex flex-wrap items-center justify-between gap-4 px-4 py-3">
            <div className="flex min-w-0 items-start gap-3">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#8B949E]" strokeWidth={1.5} />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 ${item.enabled ? 'bg-[#22C55E]' : 'bg-[#7D8590]'}`} />
                  <span className="text-[13px] font-semibold text-[#E6EDF3]">{meta.label}</span>
                </div>
                <p className="mt-0.5 text-xs text-[#8B949E]">{meta.summary}</p>
                {item.lockedReason && <p className="mt-0.5 text-xs text-[#EAB308]">{item.lockedReason}</p>}
                {item.note && <p className="mt-0.5 font-mono text-[11px] text-[#7D8590]">{item.note}</p>}
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={item.enabled}
              aria-label={`${meta.label} module`}
              disabled={!allowed}
              onClick={() => onToggle(item)}
              className={`border px-2.5 py-1 font-mono text-[11px] uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                item.enabled
                  ? 'border-[#22C55E] bg-[#052E16] text-[#22C55E] hover:bg-[#22C55E] hover:text-[#0D1117]'
                  : 'border-[#30363D] bg-[#0D1117] text-[#8B949E] hover:border-[#22C55E] hover:text-[#E6EDF3]'
              }`}
            >
              {item.enabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>
        );
      })}
    </div>
  );
}
