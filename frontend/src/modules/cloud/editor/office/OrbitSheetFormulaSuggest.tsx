import type { FormulaSuggestionItem } from './sheetFormulaSuggest';

export interface FormulaSuggestDropdownProps {
  items: FormulaSuggestionItem[];
  activeIndex: number;
  onSelect: (fnName: string) => void;
  onHover: (index: number) => void;
}

export function OrbitSheetFormulaSuggest({
  items,
  activeIndex,
  onSelect,
  onHover,
}: FormulaSuggestDropdownProps) {
  if (items.length === 0) return null;

  return (
    <div
      role="listbox"
      aria-label="Formula suggestions"
      className="absolute left-0 top-full z-40 mt-0.5 max-h-56 w-72 overflow-y-auto rounded-none border border-[#30363D] bg-[#161B22] py-1 shadow-lg"
    >
      {items.map((item, idx) => {
        const isActive = idx === activeIndex;
        return (
          <button
            key={item.name}
            type="button"
            role="option"
            aria-selected={isActive}
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(item.name);
            }}
            onMouseEnter={() => onHover(idx)}
            className={`flex w-full flex-col items-start rounded-none border-l-2 px-2.5 py-1.5 text-left transition-colors ${
              isActive
                ? 'border-l-[#22C55E] bg-[#052E16] text-[#22C55E]'
                : 'border-l-transparent bg-transparent text-[#E6EDF3] hover:bg-[#21262D]'
            }`}
          >
            <div className="flex w-full items-baseline justify-between gap-2 font-mono text-xs">
              <span className="font-semibold">{item.name}</span>
              <span className={`text-[11px] ${isActive ? 'text-[#4ADE80]' : 'text-[#8B949E]'}`}>
                {item.signature}
              </span>
            </div>
            <span className="mt-0.5 text-[11px] leading-tight text-[#8B949E]">
              {item.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}
