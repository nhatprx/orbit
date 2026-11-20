import type { LucideIcon } from 'lucide-react';

export interface TabItem<Id extends string> {
  id: Id;
  label: string;
  icon?: LucideIcon;
}

interface TabsProps<Id extends string> {
  tabs: TabItem<Id>[];
  active: Id;
  onChange: (id: Id) => void;
}

export function Tabs<Id extends string>({ tabs, active, onChange }: TabsProps<Id>) {
  return (
    <div role="tablist" className="flex flex-wrap gap-px border-b border-[#30363D]">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.id)}
            className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-[13px] font-medium transition-colors ${
              selected
                ? 'border-[#22C55E] text-[#22C55E]'
                : 'border-transparent text-[#8B949E] hover:text-[#E6EDF3]'
            }`}
          >
            {Icon && <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
