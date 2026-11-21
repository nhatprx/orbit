import { useEffect, useRef, useState } from 'react';
import {
  AlignCenter, AlignLeft, AlignRight, AlignVerticalJustifyCenter, ArrowDownToLine, ArrowLeft,
  ArrowRight, ArrowUpDown, ArrowUpToLine, Baseline, Bold, Eraser, Grid2x2, Italic, Minus,
  PaintBucket, Plus, Redo2, Sigma, Strikethrough, Underline, Undo2, WrapText,
} from 'lucide-react';
import {
  FILL_COLOR_SWATCHES, SheetColorMenu, SheetToolbarMenu, TEXT_COLOR_SWATCHES,
  sheetIconBtnClass, sheetMenuBtnClass,
} from './OrbitSheetPopovers';
import type { SheetSortDirection } from './sheetSort';
import {
  DEFAULT_SHEET_FONT_SIZE, MAX_SHEET_FONT_SIZE, MIN_SHEET_FONT_SIZE, clampFontSize,
  type QuickFunctionName, type SheetAlign, type SheetBorderStyle, type SheetCellStyleDto,
  type SheetNumberFormat, type SheetSummaryStats, type SheetVerticalAlign,
} from './sheetStyleHelpers';

export type { QuickFunctionName, SheetAlign, SheetBorderStyle, SheetCellStyleDto, SheetNumberFormat, SheetSummaryStats, SheetVerticalAlign };
export {
  clearCellStyles, computeSheetSummary, expandAndSetRange, exportSheetCsv, formatCellDisplay,
  getSheetCellClasses, patchCellStyles, type SheetRangeBounds,
} from './sheetStyleHelpers';

interface OrbitSheetToolbarProps {
  readOnly?: boolean;
  canUndo: boolean;
  canRedo: boolean;
  zoom: number;
  activeFormat: SheetCellStyleDto;
  onUndo: () => void;
  onRedo: () => void;
  onZoomChange: (zoom: number) => void;
  onFormatNumber: (mode: SheetNumberFormat) => void;
  onAdjustDecimals: (delta: -1 | 1) => void;
  onSetFontSize: (size: number) => void;
  onToggleStyle: (key: 'bold' | 'italic' | 'underline' | 'strike' | 'wrap') => void;
  onSetTextColor: (hex: string | undefined) => void;
  onSetBgColor: (hex: string | undefined) => void;
  onSetBorder: (border: SheetBorderStyle) => void;
  onSetAlign: (align: SheetAlign) => void;
  onSetVAlign: (valign: SheetVerticalAlign) => void;
  onSortColumn: (dir: SheetSortDirection) => void;
  onClearFormatting: () => void;
  onInsertFunction: (fn: QuickFunctionName) => void;
}

const ZOOM_LEVELS = [75, 100, 125, 150];
const QUICK_FUNCTIONS: QuickFunctionName[] = ['SUM', 'AVG', 'COUNT', 'MAX', 'MIN'];
const DIVIDER = <span className="mx-1 h-4 w-px shrink-0 bg-[#30363D]" aria-hidden="true" />;

export function OrbitSheetToolbar({
  readOnly = false, canUndo, canRedo, zoom, activeFormat,
  onUndo, onRedo, onZoomChange, onFormatNumber, onAdjustDecimals, onSetFontSize,
  onToggleStyle, onSetTextColor, onSetBgColor, onSetBorder, onSetAlign, onSetVAlign,
  onSortColumn, onClearFormatting, onInsertFunction,
}: OrbitSheetToolbarProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const fontSize = activeFormat.fontSize ?? DEFAULT_SHEET_FONT_SIZE;
  const align: SheetAlign = activeFormat.align ?? 'left';
  const valign: SheetVerticalAlign = activeFormat.valign ?? 'middle';
  const numFmt: SheetNumberFormat = activeFormat.numFmt ?? 'auto';
  const AlignIcon = align === 'center' ? AlignCenter : align === 'right' ? AlignRight : AlignLeft;
  const VAlignIcon = valign === 'top' ? ArrowUpToLine : valign === 'bottom' ? ArrowDownToLine : AlignVerticalJustifyCenter;

  useEffect(() => {
    if (!openMenu) return;
    const onMouseDown = (event: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(event.target as Node)) setOpenMenu(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setOpenMenu(null); }
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [openMenu]);

  return (
    <div ref={toolbarRef} role="toolbar" aria-label="Spreadsheet toolbar" className="flex flex-wrap items-center gap-0.5 border-b border-[#30363D] bg-[#161B22] px-3 py-1">
      <button type="button" aria-label="Undo" title="Undo (Ctrl+Z)" disabled={readOnly || !canUndo} onClick={onUndo} className={sheetIconBtnClass()}><Undo2 className="h-3.5 w-3.5" strokeWidth={1.5} /></button>
      <button type="button" aria-label="Redo" title="Redo (Ctrl+Y)" disabled={readOnly || !canRedo} onClick={onRedo} className={sheetIconBtnClass()}><Redo2 className="h-3.5 w-3.5" strokeWidth={1.5} /></button>
      <select aria-label="Zoom" value={zoom} onChange={(e) => onZoomChange(Number(e.target.value))} className="h-7 w-16 rounded-none border border-transparent bg-transparent px-1 font-mono text-xs text-[#E6EDF3] hover:border-[#30363D] hover:bg-[#21262D] focus:border-[#22C55E] focus:bg-[#0D1117] focus:outline-none">
        {ZOOM_LEVELS.map((lvl) => <option key={lvl} value={lvl} className="bg-[#161B22] text-[#E6EDF3]">{lvl}%</option>)}
      </select>
      {DIVIDER}

      <button type="button" aria-label="Currency $" aria-pressed={numFmt === 'currency'} title="Format as currency" disabled={readOnly} onClick={() => onFormatNumber(numFmt === 'currency' ? 'auto' : 'currency')} className={`${sheetIconBtnClass(numFmt === 'currency')} font-mono text-xs`}>$</button>
      <button type="button" aria-label="Percent %" aria-pressed={numFmt === 'percent'} title="Format as percent" disabled={readOnly} onClick={() => onFormatNumber(numFmt === 'percent' ? 'auto' : 'percent')} className={`${sheetIconBtnClass(numFmt === 'percent')} font-mono text-xs`}>%</button>
      <button type="button" aria-label="Decrease decimal places" title="Decrease decimal places" disabled={readOnly} onClick={() => onAdjustDecimals(-1)} className={`${sheetMenuBtnClass()} font-mono text-[11px]`}>.0<ArrowLeft className="h-2.5 w-2.5" strokeWidth={1.5} aria-hidden="true" /></button>
      <button type="button" aria-label="Increase decimal places" title="Increase decimal places" disabled={readOnly} onClick={() => onAdjustDecimals(1)} className={`${sheetMenuBtnClass()} font-mono text-[11px]`}>.00<ArrowRight className="h-2.5 w-2.5" strokeWidth={1.5} aria-hidden="true" /></button>
      <SheetToolbarMenu
        id="numfmt" openId={openMenu} setOpenId={setOpenMenu} ariaLabel="More formats" title="More number formats" disabled={readOnly}
        active={numFmt !== 'auto'} triggerContent={<span className="font-mono text-[11px]">123</span>}
        items={[
          { id: 'auto', label: 'Automatic', active: numFmt === 'auto', onSelect: () => onFormatNumber('auto') },
          { id: 'text', label: 'Plain text', active: numFmt === 'text', onSelect: () => onFormatNumber('text') },
          { id: 'number', label: 'Number', hint: '1000.00', active: numFmt === 'number', onSelect: () => onFormatNumber('number') },
          { id: 'percent', label: 'Percent', hint: '10.0%', active: numFmt === 'percent', onSelect: () => onFormatNumber('percent') },
          { id: 'currency', label: 'Currency', hint: '$1000.00', active: numFmt === 'currency', onSelect: () => onFormatNumber('currency') },
        ]}
      />
      {DIVIDER}

      <div className="inline-flex items-center">
        <button type="button" aria-label="Decrease font size" title="Decrease font size" disabled={readOnly || fontSize <= MIN_SHEET_FONT_SIZE} onClick={() => onSetFontSize(fontSize - 1)} className={sheetIconBtnClass()}><Minus className="h-3 w-3" strokeWidth={1.5} /></button>
        <input
          type="number" aria-label="Font size" min={MIN_SHEET_FONT_SIZE} max={MAX_SHEET_FONT_SIZE} disabled={readOnly} value={fontSize}
          onChange={(e) => { const n = Number(e.target.value); if (Number.isFinite(n) && n >= MIN_SHEET_FONT_SIZE && n <= MAX_SHEET_FONT_SIZE) onSetFontSize(clampFontSize(n)); }}
          className="h-7 w-10 rounded-none border border-[#30363D] bg-[#0D1117] px-1 text-center font-mono text-xs text-[#E6EDF3] focus:border-[#22C55E] focus:outline-none disabled:opacity-40"
        />
        <button type="button" aria-label="Increase font size" title="Increase font size" disabled={readOnly || fontSize >= MAX_SHEET_FONT_SIZE} onClick={() => onSetFontSize(fontSize + 1)} className={sheetIconBtnClass()}><Plus className="h-3 w-3" strokeWidth={1.5} /></button>
      </div>
      {DIVIDER}

      <button type="button" aria-label="Bold" aria-pressed={Boolean(activeFormat.bold)} title="Bold" disabled={readOnly} onClick={() => onToggleStyle('bold')} className={sheetIconBtnClass(Boolean(activeFormat.bold))}><Bold className="h-3.5 w-3.5" strokeWidth={1.5} /></button>
      <button type="button" aria-label="Italic" aria-pressed={Boolean(activeFormat.italic)} title="Italic" disabled={readOnly} onClick={() => onToggleStyle('italic')} className={sheetIconBtnClass(Boolean(activeFormat.italic))}><Italic className="h-3.5 w-3.5" strokeWidth={1.5} /></button>
      <button type="button" aria-label="Underline" aria-pressed={Boolean(activeFormat.underline)} title="Underline" disabled={readOnly} onClick={() => onToggleStyle('underline')} className={sheetIconBtnClass(Boolean(activeFormat.underline))}><Underline className="h-3.5 w-3.5" strokeWidth={1.5} /></button>
      <button type="button" aria-label="Strikethrough" aria-pressed={Boolean(activeFormat.strike)} title="Strikethrough" disabled={readOnly} onClick={() => onToggleStyle('strike')} className={sheetIconBtnClass(Boolean(activeFormat.strike))}><Strikethrough className="h-3.5 w-3.5" strokeWidth={1.5} /></button>
      <SheetColorMenu id="text-color" openId={openMenu} setOpenId={setOpenMenu} ariaLabel="Text color" title="Text color" disabled={readOnly} currentColor={activeFormat.textColor} indicatorFallback="#E6EDF3" swatches={TEXT_COLOR_SWATCHES} icon={<Baseline className="h-3.5 w-3.5" strokeWidth={1.5} />} onSelect={onSetTextColor} />
      <SheetColorMenu id="fill-color" openId={openMenu} setOpenId={setOpenMenu} ariaLabel="Fill color" title="Fill color" disabled={readOnly} currentColor={activeFormat.bgColor ?? (activeFormat.highlight ? '#052E16' : undefined)} indicatorFallback="#30363D" swatches={FILL_COLOR_SWATCHES} icon={<PaintBucket className="h-3.5 w-3.5" strokeWidth={1.5} />} onSelect={onSetBgColor} />
      {DIVIDER}

      <SheetToolbarMenu
        id="borders" openId={openMenu} setOpenId={setOpenMenu} ariaLabel="Borders" title="Cell borders" disabled={readOnly}
        active={Boolean(activeFormat.border && activeFormat.border !== 'none')} triggerContent={<Grid2x2 className="h-3.5 w-3.5" strokeWidth={1.5} />}
        items={[
          { id: 'none', label: 'No borders', active: !activeFormat.border || activeFormat.border === 'none', onSelect: () => onSetBorder('none') },
          { id: 'all', label: 'All borders', active: activeFormat.border === 'all', onSelect: () => onSetBorder('all') },
          { id: 'bottom', label: 'Bottom border', active: activeFormat.border === 'bottom', onSelect: () => onSetBorder('bottom') },
        ]}
      />
      <SheetToolbarMenu
        id="halign" openId={openMenu} setOpenId={setOpenMenu} ariaLabel="Horizontal align" title="Horizontal align" disabled={readOnly}
        active={Boolean(activeFormat.align)} triggerContent={<AlignIcon className="h-3.5 w-3.5" strokeWidth={1.5} />}
        items={[
          { id: 'left', label: 'Align left', icon: <AlignLeft className="h-3.5 w-3.5" strokeWidth={1.5} />, active: align === 'left', onSelect: () => onSetAlign('left') },
          { id: 'center', label: 'Align center', icon: <AlignCenter className="h-3.5 w-3.5" strokeWidth={1.5} />, active: align === 'center', onSelect: () => onSetAlign('center') },
          { id: 'right', label: 'Align right', icon: <AlignRight className="h-3.5 w-3.5" strokeWidth={1.5} />, active: align === 'right', onSelect: () => onSetAlign('right') },
        ]}
      />
      <SheetToolbarMenu
        id="valign" openId={openMenu} setOpenId={setOpenMenu} ariaLabel="Vertical align" title="Vertical align" disabled={readOnly}
        active={Boolean(activeFormat.valign)} triggerContent={<VAlignIcon className="h-3.5 w-3.5" strokeWidth={1.5} />}
        items={[
          { id: 'top', label: 'Align top', icon: <ArrowUpToLine className="h-3.5 w-3.5" strokeWidth={1.5} />, active: valign === 'top', onSelect: () => onSetVAlign('top') },
          { id: 'middle', label: 'Align middle', icon: <AlignVerticalJustifyCenter className="h-3.5 w-3.5" strokeWidth={1.5} />, active: valign === 'middle', onSelect: () => onSetVAlign('middle') },
          { id: 'bottom', label: 'Align bottom', icon: <ArrowDownToLine className="h-3.5 w-3.5" strokeWidth={1.5} />, active: valign === 'bottom', onSelect: () => onSetVAlign('bottom') },
        ]}
      />
      <button type="button" aria-label="Text wrap" aria-pressed={Boolean(activeFormat.wrap)} title="Text wrapping" disabled={readOnly} onClick={() => onToggleStyle('wrap')} className={sheetIconBtnClass(Boolean(activeFormat.wrap))}><WrapText className="h-3.5 w-3.5" strokeWidth={1.5} /></button>
      {DIVIDER}

      <SheetToolbarMenu
        id="data" openId={openMenu} setOpenId={setOpenMenu} ariaLabel="Data and sort" title="Sort and clear formatting" disabled={readOnly} alignRight
        triggerContent={<ArrowUpDown className="h-3.5 w-3.5" strokeWidth={1.5} />}
        items={[
          { id: 'sort-asc', label: 'Sort column A -> Z', onSelect: () => onSortColumn('asc') },
          { id: 'sort-desc', label: 'Sort column Z -> A', onSelect: () => onSortColumn('desc') },
          { id: 'clear-fmt', label: 'Clear formatting', icon: <Eraser className="h-3.5 w-3.5" strokeWidth={1.5} />, onSelect: onClearFormatting },
        ]}
      />
      <SheetToolbarMenu
        id="functions" openId={openMenu} setOpenId={setOpenMenu} ariaLabel="Functions" title="Insert function" disabled={readOnly} alignRight
        triggerContent={<Sigma className="h-3.5 w-3.5" strokeWidth={1.5} />}
        items={QUICK_FUNCTIONS.map((fn) => ({ id: fn, label: fn, hint: `=${fn}(...)`, onSelect: () => onInsertFunction(fn) }))}
      />
    </div>
  );
}
