import { ListTree, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import type { DocHeadingItem } from './docHtmlCodec';

export interface OrbitDocOutlineProps {
  headings: DocHeadingItem[];
  open: boolean;
  onToggle: () => void;
  onSelectHeading: (headingIndex: number) => void;
}

const RULER_TICKS = [1, 2, 3, 4, 5, 6, 7];

export function OrbitDocRuler() {
  return (
    <div
      aria-label="Document ruler"
      className="flex h-5 shrink-0 select-none items-center justify-center border-b border-[#30363D] bg-[#161B22] px-4 font-mono text-[9px] text-[#8B949E]"
    >
      <div className="flex w-full max-w-[800px] items-center justify-between px-14">
        {RULER_TICKS.map((tick) => (
          <span key={tick} className="flex items-center gap-2">
            <span>{tick}</span>
            <span className="h-1.5 w-px bg-[#30363D]" />
          </span>
        ))}
      </div>
    </div>
  );
}

export function mutateDocTable(table: HTMLTableElement, action: 'row' | 'col' | 'delete'): boolean {
  if (action === 'delete') {
    table.remove();
    return false;
  }
  if (action === 'row') {
    const colCount = Math.max(1, table.querySelector('tr')?.children.length ?? 3);
    const tr = document.createElement('tr');
    tr.innerHTML = Array.from(
      { length: colCount },
      () => '<td class="border border-[#30363D] px-3 py-2 align-top bg-[#161B22] text-[#E6EDF3]"></td>'
    ).join('');
    (table.querySelector('tbody') ?? table).appendChild(tr);
    return true;
  }
  table.querySelectorAll('tr').forEach((tr, rIdx) => {
    const td = document.createElement('td');
    td.className = `border border-[#30363D] px-3 py-2 align-top ${
      rIdx === 0 ? 'bg-[#0D1117] font-semibold text-[#22C55E]' : 'bg-[#161B22] text-[#E6EDF3]'
    }`;
    tr.appendChild(td);
  });
  return true;
}

export function OrbitDocOutline({
  headings,
  open,
  onToggle,
  onSelectHeading,
}: OrbitDocOutlineProps) {
  if (!open) {
    return (
      <aside
        aria-label="Document outline collapsed"
        className="flex w-10 shrink-0 flex-col items-center border-r border-[#30363D] bg-[#161B22] py-3"
      >
        <button
          type="button"
          aria-label="Open document outline"
          title="Open document outline"
          onClick={onToggle}
          className="inline-flex h-7 w-7 items-center justify-center rounded-none border border-[#30363D] bg-[#21262D] text-[#8B949E] hover:border-[#22C55E] hover:text-[#22C55E]"
        >
          <PanelLeftOpen className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Document outline"
      className="flex w-52 shrink-0 flex-col border-r border-[#30363D] bg-[#161B22]"
    >
      <div className="flex items-center justify-between border-b border-[#30363D] px-3 py-2">
        <span className="flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-[#E6EDF3]">
          <ListTree className="h-3.5 w-3.5 text-[#22C55E]" strokeWidth={1.5} />
          Outline
        </span>
        <button
          type="button"
          aria-label="Close document outline"
          title="Close document outline"
          onClick={onToggle}
          className="inline-flex h-6 w-6 items-center justify-center rounded-none text-[#8B949E] hover:bg-[#21262D] hover:text-[#E6EDF3]"
        >
          <PanelLeftClose className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {headings.length === 0 ? (
          <p className="px-2 py-4 text-xs leading-relaxed text-[#8B949E]">
            Headings you add to the document will appear here.
          </p>
        ) : (
          <ul className="space-y-0.5">
            {headings.map((item, idx) => {
              const indentClass =
                item.type === 'h1'
                  ? 'pl-2 font-semibold text-[#E6EDF3]'
                  : item.type === 'h2'
                    ? 'pl-4 font-medium text-[#E6EDF3]'
                    : 'pl-6 text-[#8B949E]';
              return (
                <li key={`${item.index}-${idx}`}>
                  <button
                    type="button"
                    onClick={() => onSelectHeading(idx)}
                    className={`flex w-full items-center gap-1.5 rounded-none border-l-2 border-transparent py-1.5 pr-2 text-left text-xs transition-colors hover:border-[#22C55E] hover:bg-[#21262D] hover:text-[#22C55E] ${indentClass}`}
                  >
                    <span className="shrink-0 font-mono text-[10px] uppercase text-[#22C55E]">
                      {item.type}
                    </span>
                    <span className="truncate">{item.text || 'Untitled heading'}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
