import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface CollapsibleCardProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  badge?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function CollapsibleCard({
  title,
  description,
  icon,
  badge,
  defaultOpen = false,
  children,
}: CollapsibleCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="border border-[#30363D] bg-[#161B22]">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-[#1C2128]"
      >
        <div className="flex min-w-0 items-center gap-3">
          {icon && <span className="shrink-0 text-[#8B949E]">{icon}</span>}
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-[#E6EDF3]">{title}</h3>
            {description && <p className="mt-0.5 text-xs text-[#8B949E]">{description}</p>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {badge}
          {open ? (
            <ChevronDown className="h-4 w-4 text-[#8B949E]" strokeWidth={1.5} />
          ) : (
            <ChevronRight className="h-4 w-4 text-[#8B949E]" strokeWidth={1.5} />
          )}
        </div>
      </button>

      {open && <div className="border-t border-[#30363D] p-5">{children}</div>}
    </section>
  );
}
