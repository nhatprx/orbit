import type { ReactNode } from 'react';

interface PanelProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  tone?: 'default' | 'danger';
  children: ReactNode;
}

export function Panel({ title, description, actions, tone = 'default', children }: PanelProps) {
  const border = tone === 'danger' ? 'border-[#EF4444]' : 'border-[#30363D]';
  return (
    <section className={`border ${border} bg-[#161B22]`}>
      <div className={`flex flex-wrap items-center justify-between gap-3 border-b ${border} px-4 py-2.5`}>
        <div>
          <h2
            className={`font-mono text-[11px] font-semibold uppercase tracking-wider ${
              tone === 'danger' ? 'text-[#EF4444]' : 'text-[#8B949E]'
            }`}
          >
            {title}
          </h2>
          {description && <p className="mt-0.5 text-xs text-[#8A8A8A]">{description}</p>}
        </div>
        {actions}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}
