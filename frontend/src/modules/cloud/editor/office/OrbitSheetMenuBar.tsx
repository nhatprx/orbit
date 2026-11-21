import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import type { SheetAlign, SheetCellStyleDto, SheetNumberFormat } from './officeTypes';
import type { SheetSortDirection } from './sheetSort';

export interface OrbitSheetMenuBarProps {
  readOnly: boolean;
  canSave: boolean;
  canUndo: boolean;
  canRedo: boolean;
  zoom: number;
  showGridlines: boolean;
  freezeHeader: boolean;
  activeFormat: SheetCellStyleDto;
  onSave: () => void;
  onDownload: () => void;
  onExportCsv: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onClearValues: () => void;
  onClearFormatting: () => void;
  onZoomChange: (zoom: number) => void;
  onToggleGridlines: () => void;
  onToggleFreezeHeader: () => void;
  onInsertRow: () => void;
  onDeleteRow: () => void;
  onInsertCol: () => void;
  onDeleteCol: () => void;
  onNewSheet: () => void;
  onFormatNumber: (mode: SheetNumberFormat) => void;
  onToggleStyle: (key: 'bold' | 'italic' | 'underline' | 'strike' | 'wrap') => void;
  onSetAlign: (align: SheetAlign) => void;
  onSortColumn: (dir: SheetSortDirection) => void;
}

type MenuKey = 'File' | 'Edit' | 'View' | 'Insert' | 'Format' | 'Data';
type MenuEntry =
  | { kind: 'divider'; id: string }
  | { kind: 'section'; id: string; label: string }
  | { kind: 'item'; id: string; label: string; shortcut?: string; checked?: boolean; disabled?: boolean; onSelect: () => void };

const MENU_KEYS: MenuKey[] = ['File', 'Edit', 'View', 'Insert', 'Format', 'Data'];
const ZOOM_OPTIONS = [75, 100, 125, 150];
const NUMBER_FORMATS: Array<{ mode: SheetNumberFormat; label: string }> = [
  { mode: 'auto', label: 'Automatic' }, { mode: 'text', label: 'Plain text' },
  { mode: 'number', label: 'Number' }, { mode: 'percent', label: 'Percent' }, { mode: 'currency', label: 'Currency' },
];

export function OrbitSheetMenuBar(props: OrbitSheetMenuBarProps) {
  const [openMenu, setOpenMenu] = useState<MenuKey | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!openMenu) return;
    const onMouseDown = (e: MouseEvent) => { if (barRef.current && !barRef.current.contains(e.target as Node)) setOpenMenu(null); };
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); setOpenMenu(null); } };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('mousedown', onMouseDown); document.removeEventListener('keydown', onKeyDown); };
  }, [openMenu]);

  const currentNumFmt: SheetNumberFormat = props.activeFormat.numFmt ?? 'auto';
  const currentAlign: SheetAlign = props.activeFormat.align ?? 'left';

  const menus: Record<MenuKey, MenuEntry[]> = {
    File: [
      { kind: 'item', id: 'save', label: 'Save', shortcut: 'Ctrl+S', disabled: props.readOnly || !props.canSave, onSelect: props.onSave },
      { kind: 'item', id: 'download', label: 'Download .xlsx', onSelect: props.onDownload },
      { kind: 'item', id: 'csv', label: 'Export CSV', onSelect: props.onExportCsv },
    ],
    Edit: [
      { kind: 'item', id: 'undo', label: 'Undo', shortcut: 'Ctrl+Z', disabled: props.readOnly || !props.canUndo, onSelect: props.onUndo },
      { kind: 'item', id: 'redo', label: 'Redo', shortcut: 'Ctrl+Y', disabled: props.readOnly || !props.canRedo, onSelect: props.onRedo },
      { kind: 'divider', id: 'e1' },
      { kind: 'item', id: 'clear-val', label: 'Clear values', shortcut: 'Del', disabled: props.readOnly, onSelect: props.onClearValues },
      { kind: 'item', id: 'clear-fmt', label: 'Clear formatting', disabled: props.readOnly, onSelect: props.onClearFormatting },
    ],
    View: [
      { kind: 'section', id: 'z-sec', label: 'Zoom' },
      ...ZOOM_OPTIONS.map<MenuEntry>((lvl) => ({ kind: 'item', id: `zoom-${lvl}`, label: `${lvl}%`, checked: props.zoom === lvl, onSelect: () => props.onZoomChange(lvl) })),
      { kind: 'divider', id: 'v1' },
      { kind: 'item', id: 'gridlines', label: 'Show gridlines', checked: props.showGridlines, onSelect: props.onToggleGridlines },
      { kind: 'item', id: 'freeze', label: 'Freeze header row', checked: props.freezeHeader, onSelect: props.onToggleFreezeHeader },
    ],
    Insert: [
      { kind: 'item', id: 'ins-row', label: 'Insert row', disabled: props.readOnly, onSelect: props.onInsertRow },
      { kind: 'item', id: 'del-row', label: 'Delete row', disabled: props.readOnly, onSelect: props.onDeleteRow },
      { kind: 'divider', id: 'i1' },
      { kind: 'item', id: 'ins-col', label: 'Insert column', disabled: props.readOnly, onSelect: props.onInsertCol },
      { kind: 'item', id: 'del-col', label: 'Delete column', disabled: props.readOnly, onSelect: props.onDeleteCol },
      { kind: 'divider', id: 'i2' },
      { kind: 'item', id: 'new-sheet', label: 'New sheet tab', disabled: props.readOnly, onSelect: props.onNewSheet },
    ],
    Format: [
      { kind: 'section', id: 'n-sec', label: 'Number' },
      ...NUMBER_FORMATS.map<MenuEntry>((nf) => ({ kind: 'item', id: `nf-${nf.mode}`, label: nf.label, checked: currentNumFmt === nf.mode, disabled: props.readOnly, onSelect: () => props.onFormatNumber(nf.mode) })),
      { kind: 'divider', id: 'f1' },
      { kind: 'item', id: 'bold', label: 'Bold', checked: Boolean(props.activeFormat.bold), disabled: props.readOnly, onSelect: () => props.onToggleStyle('bold') },
      { kind: 'item', id: 'italic', label: 'Italic', checked: Boolean(props.activeFormat.italic), disabled: props.readOnly, onSelect: () => props.onToggleStyle('italic') },
      { kind: 'item', id: 'underline', label: 'Underline', checked: Boolean(props.activeFormat.underline), disabled: props.readOnly, onSelect: () => props.onToggleStyle('underline') },
      { kind: 'item', id: 'strike', label: 'Strikethrough', checked: Boolean(props.activeFormat.strike), disabled: props.readOnly, onSelect: () => props.onToggleStyle('strike') },
      { kind: 'divider', id: 'f2' },
      { kind: 'item', id: 'al-l', label: 'Align left', checked: currentAlign === 'left', disabled: props.readOnly, onSelect: () => props.onSetAlign('left') },
      { kind: 'item', id: 'al-c', label: 'Align center', checked: currentAlign === 'center', disabled: props.readOnly, onSelect: () => props.onSetAlign('center') },
      { kind: 'item', id: 'al-r', label: 'Align right', checked: currentAlign === 'right', disabled: props.readOnly, onSelect: () => props.onSetAlign('right') },
      { kind: 'item', id: 'wrap', label: 'Text wrap', checked: Boolean(props.activeFormat.wrap), disabled: props.readOnly, onSelect: () => props.onToggleStyle('wrap') },
      { kind: 'divider', id: 'f3' },
      { kind: 'item', id: 'fmt-clear', label: 'Clear formatting', disabled: props.readOnly, onSelect: props.onClearFormatting },
    ],
    Data: [
      { kind: 'item', id: 'sort-asc', label: 'Sort column A -> Z', disabled: props.readOnly, onSelect: () => props.onSortColumn('asc') },
      { kind: 'item', id: 'sort-desc', label: 'Sort column Z -> A', disabled: props.readOnly, onSelect: () => props.onSortColumn('desc') },
    ],
  };

  return (
    <div ref={barRef} role="menubar" aria-label="Spreadsheet menu bar" className="flex items-center gap-0.5">
      {MENU_KEYS.map((key) => {
        const isOpen = openMenu === key;
        return (
          <div key={key} className="relative">
            <button
              type="button" role="menuitem" aria-haspopup="menu" aria-expanded={isOpen}
              onClick={() => setOpenMenu(isOpen ? null : key)}
              onMouseEnter={() => { if (openMenu && openMenu !== key) setOpenMenu(key); }}
              className={`rounded-none px-2 py-0.5 text-xs transition-colors focus:outline-none ${isOpen ? 'bg-[#052E16] text-[#22C55E]' : 'text-[#8B949E] hover:bg-[#21262D] hover:text-[#E6EDF3]'}`}
            >
              {key}
            </button>
            {isOpen && (
              <div role="menu" aria-label={`${key} menu`} className="absolute left-0 top-full z-40 mt-0.5 min-w-[200px] rounded-none border border-[#30363D] bg-[#161B22] py-1 shadow-lg">
                {menus[key].map((entry) => {
                  if (entry.kind === 'divider') return <div key={entry.id} className="my-1 h-px bg-[#30363D]" />;
                  if (entry.kind === 'section') return <div key={entry.id} className="px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-[#8B949E]">{entry.label}</div>;
                  return (
                    <button
                      key={entry.id} type="button" role="menuitem" disabled={entry.disabled}
                      onClick={() => { entry.onSelect(); setOpenMenu(null); }}
                      className="flex w-full items-center justify-between gap-4 rounded-none px-2.5 py-1.5 text-left text-xs text-[#E6EDF3] transition-colors hover:bg-[#21262D] disabled:opacity-40"
                    >
                      <span className="flex items-center gap-2">
                        <span className="inline-flex h-3 w-3 items-center justify-center">{entry.checked && <Check className="h-3 w-3 text-[#22C55E]" strokeWidth={1.5} />}</span>
                        <span>{entry.label}</span>
                      </span>
                      {entry.shortcut && <span className="font-mono text-[10px] text-[#8B949E]">{entry.shortcut}</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
