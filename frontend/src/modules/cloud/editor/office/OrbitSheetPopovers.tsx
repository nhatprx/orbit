import type { ReactNode } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export const SHEET_BTN_BASE =
  'inline-flex h-7 items-center justify-center rounded-none border transition-colors disabled:opacity-40 focus:outline-none';
export const SHEET_BTN_IDLE =
  'border-transparent text-[#8B949E] hover:border-[#30363D] hover:bg-[#21262D] hover:text-[#E6EDF3]';
export const SHEET_BTN_ACTIVE = 'border-[#22C55E] bg-[#052E16] text-[#22C55E]';

export const sheetIconBtnClass = (active = false): string =>
  `${SHEET_BTN_BASE} w-7 ${active ? SHEET_BTN_ACTIVE : SHEET_BTN_IDLE}`;
export const sheetMenuBtnClass = (active = false): string =>
  `${SHEET_BTN_BASE} gap-0.5 px-1.5 ${active ? SHEET_BTN_ACTIVE : SHEET_BTN_IDLE}`;

export interface SheetDropdownOption {
  id: string;
  label: string;
  active?: boolean;
  hint?: string;
  icon?: ReactNode;
  onSelect: () => void;
}

export interface ColorSwatch { hex: string; label: string; }

export const TEXT_COLOR_SWATCHES: ColorSwatch[] = [
  { hex: '#E6EDF3', label: 'White' }, { hex: '#8B949E', label: 'Muted gray' },
  { hex: '#0D1117', label: 'Black' }, { hex: '#22C55E', label: 'Orbit green' },
  { hex: '#4ADE80', label: 'Bright green' }, { hex: '#EF4444', label: 'Red' },
  { hex: '#EAB308', label: 'Amber' }, { hex: '#38BDF8', label: 'Cyan' },
];

export const FILL_COLOR_SWATCHES: ColorSwatch[] = [
  { hex: '#052E16', label: 'Deep green' }, { hex: '#14532D', label: 'Forest green' },
  { hex: '#161B22', label: 'Surface dark' }, { hex: '#21262D', label: 'Panel gray' },
  { hex: '#30363D', label: 'Border gray' }, { hex: '#3F1D1D', label: 'Muted red' },
  { hex: '#3B2F0B', label: 'Muted amber' }, { hex: '#0C2D48', label: 'Deep slate' },
];

interface SheetToolbarMenuProps {
  id: string;
  openId: string | null;
  setOpenId: (id: string | null) => void;
  ariaLabel: string;
  title: string;
  disabled?: boolean;
  active?: boolean;
  triggerContent: ReactNode;
  items: SheetDropdownOption[];
  alignRight?: boolean;
}

export function SheetToolbarMenu({
  id, openId, setOpenId, ariaLabel, title, disabled = false, active = false, triggerContent, items, alignRight = false,
}: SheetToolbarMenuProps) {
  const isOpen = openId === id;
  return (
    <div className="relative">
      <button
        type="button" aria-label={ariaLabel} aria-haspopup="menu" aria-expanded={isOpen} title={title} disabled={disabled}
        onClick={() => setOpenId(isOpen ? null : id)} className={sheetMenuBtnClass(active || isOpen)}
      >
        {triggerContent}
        <ChevronDown className="h-3 w-3 opacity-75" strokeWidth={1.5} aria-hidden="true" />
      </button>
      {isOpen && (
        <div
          role="menu" aria-label={`${ariaLabel} menu`}
          className={`absolute top-full z-30 mt-1 min-w-[168px] rounded-none border border-[#30363D] bg-[#161B22] py-1 shadow-lg ${alignRight ? 'right-0' : 'left-0'}`}
        >
          {items.map((item) => (
            <button
              key={item.id} type="button" role="menuitem" onClick={() => { item.onSelect(); setOpenId(null); }}
              className={`flex w-full items-center justify-between gap-3 rounded-none px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-[#21262D] ${
                item.active ? 'bg-[#052E16]/60 text-[#22C55E]' : 'text-[#E6EDF3]'
              }`}
            >
              <span className="flex items-center gap-2">{item.icon}<span>{item.label}</span></span>
              <span className="flex items-center gap-1.5 font-mono text-[10px] text-[#8B949E]">
                {item.hint}
                {item.active && <Check className="h-3 w-3 text-[#22C55E]" strokeWidth={1.5} />}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface SheetColorMenuProps {
  id: string;
  openId: string | null;
  setOpenId: (id: string | null) => void;
  ariaLabel: string;
  title: string;
  disabled?: boolean;
  currentColor?: string;
  indicatorFallback: string;
  swatches: ColorSwatch[];
  icon: ReactNode;
  onSelect: (hex: string | undefined) => void;
}

export function SheetColorMenu({
  id, openId, setOpenId, ariaLabel, title, disabled = false,
  currentColor, indicatorFallback, swatches, icon, onSelect,
}: SheetColorMenuProps) {
  const isOpen = openId === id;
  return (
    <div className="relative">
      <button
        type="button" aria-label={ariaLabel} aria-haspopup="menu" aria-expanded={isOpen} title={title} disabled={disabled}
        onClick={() => setOpenId(isOpen ? null : id)} className={sheetMenuBtnClass(Boolean(currentColor) || isOpen)}
      >
        <span className="flex flex-col items-center">
          {icon}
          <span aria-hidden="true" className="mt-0.5 h-0.5 w-3.5 rounded-none" style={{ backgroundColor: currentColor ?? indicatorFallback }} />
        </span>
      </button>
      {isOpen && (
        <div role="menu" aria-label={`${ariaLabel} swatches`} className="absolute left-0 top-full z-30 mt-1 w-44 rounded-none border border-[#30363D] bg-[#161B22] p-2 shadow-lg">
          <div className="mb-1.5 grid grid-cols-4 gap-1.5">
            {swatches.map((swatch) => {
              const selected = currentColor?.toUpperCase() === swatch.hex;
              return (
                <button
                  key={swatch.hex} type="button" role="menuitem" aria-label={`${ariaLabel} ${swatch.label}`} title={`${swatch.label} (${swatch.hex})`}
                  onClick={() => { onSelect(swatch.hex); setOpenId(null); }}
                  className={`h-6 w-full rounded-none border transition-colors ${selected ? 'border-[#22C55E] ring-1 ring-[#22C55E]' : 'border-[#30363D] hover:border-[#E6EDF3]'}`}
                  style={{ backgroundColor: swatch.hex }}
                />
              );
            })}
          </div>
          <button
            type="button" role="menuitem" onClick={() => { onSelect(undefined); setOpenId(null); }}
            className="w-full rounded-none border border-[#30363D] bg-[#0D1117] px-2 py-1 text-center text-[11px] text-[#8B949E] hover:border-[#22C55E] hover:text-[#E6EDF3]"
          >
            Reset color
          </button>
        </div>
      )}
    </div>
  );
}
