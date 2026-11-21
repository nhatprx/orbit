import { AlignCenter, AlignLeft, AlignRight, Bold, Download, Highlighter, Italic, Minus, Plus } from 'lucide-react';
import { evaluateSheetCell, toSheetCsv } from './sheetFormulas';

export type SheetAlign = 'left' | 'center' | 'right';
export type NumberFormatMode = 'currency' | 'percent' | 'decimal';
export type QuickFunctionName = 'SUM' | 'AVG' | 'COUNT' | 'MAX' | 'MIN';

export interface SheetCellFormat {
  bold?: boolean;
  italic?: boolean;
  align?: SheetAlign;
  highlight?: boolean;
  numFormat?: NumberFormatMode;
}

export interface SheetRangeBounds {
  minR: number;
  maxR: number;
  minC: number;
  maxC: number;
}

export interface SheetSummaryStats {
  count: number;
  sum: string;
  avg: string;
  min: string;
  max: string;
}

export function expandAndSetRange(rawRows: string[][], range: SheetRangeBounds, cellVal: string): string[][] {
  const targetRows = Math.max(1, rawRows.length, range.maxR + 1);
  const targetCols = Math.max(1, rawRows.reduce((max, row) => Math.max(max, row.length), 0), range.maxC + 1);
  return Array.from({ length: targetRows }, (_, ri) =>
    Array.from({ length: targetCols }, (_, ci) =>
      ri >= range.minR && ri <= range.maxR && ci >= range.minC && ci <= range.maxC ? cellVal : (rawRows[ri]?.[ci] ?? '')
    )
  );
}

export function getSheetCellClasses(
  isSelected: boolean, isFormulaRef: boolean, inRange: boolean, align: SheetAlign, fmt?: SheetCellFormat
): { tdCls: string; inputCls: string } {
  const tdCls = isSelected
    ? 'z-10 bg-[#052E16]/30 border-[#22C55E]/40 outline outline-2 -outline-offset-2 outline-[#22C55E]'
    : isFormulaRef ? 'z-10 outline-dashed outline-1 -outline-offset-1 outline-[#4ADE80] bg-[#052E16]/40'
    : inRange ? 'bg-[#052E16]/30 border-[#22C55E]/40' : 'border-[#21262D]';
  const alignCls = align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';
  const bgCls = fmt?.highlight ? 'bg-[#052E16]/50' : isFormulaRef ? 'bg-[#052E16]/40' : inRange ? 'bg-[#052E16]/30' : 'bg-[#0D1117]';
  return { tdCls, inputCls: `h-7 w-full rounded-none px-2 text-xs text-[#E6EDF3] focus:outline-none ${alignCls} ${fmt?.bold ? 'font-bold' : ''} ${fmt?.italic ? 'italic' : ''} ${bgCls}` };
}

export function exportSheetCsv(sheetName: string, rawRows: string[][]): void {
  const url = URL.createObjectURL(new Blob([toSheetCsv(rawRows)], { type: 'text/csv;charset=utf-8' }));
  const anchor = Object.assign(document.createElement('a'), { href: url, download: `${sheetName}.csv` });
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function formatCellDisplay(evaluated: string, fmt?: SheetCellFormat): string {
  if (!fmt?.numFormat) return evaluated;
  const trimmed = evaluated.trim();
  if (!trimmed) return evaluated;
  const num = Number(trimmed);
  if (!Number.isFinite(num)) return evaluated;
  if (fmt.numFormat === 'currency') return `$${num.toFixed(2)}`;
  if (fmt.numFormat === 'percent') return `${(num * 100).toFixed(1)}%`;
  return num.toFixed(2);
}

export function computeSheetSummary(rows: string[][], range?: SheetRangeBounds): SheetSummaryStats {
  const nums: number[] = [];
  const hasMultiRange = Boolean(range && (range.minR !== range.maxR || range.minC !== range.maxC));
  const collectCell = (raw: string | undefined, rIdx: number, cIdx: number) => {
    if (!raw?.trim()) return;
    const evaluated = evaluateSheetCell(raw, rows, rIdx, cIdx).trim();
    if (!evaluated || evaluated.startsWith('#')) return;
    const num = Number(evaluated);
    if (Number.isFinite(num)) nums.push(num);
  };
  if (hasMultiRange && range) {
    for (let r = range.minR; r <= range.maxR; r += 1) {
      for (let c = range.minC; c <= range.maxC; c += 1) collectCell(rows[r]?.[c], r, c);
    }
  } else {
    rows.forEach((row, rIdx) => row.forEach((raw, cIdx) => collectCell(raw, rIdx, cIdx)));
  }
  const total = nums.reduce((acc, v) => acc + v, 0);
  const avg = nums.length > 0 ? total / nums.length : 0;
  const min = nums.length > 0 ? Math.min(...nums) : 0;
  const max = nums.length > 0 ? Math.max(...nums) : 0;
  const round = (n: number) => String(Math.round(n * 100) / 100);
  return { count: nums.length, sum: round(total), avg: round(avg), min: round(min), max: round(max) };
}

interface OrbitSheetToolbarProps {
  readOnly?: boolean;
  activeFormat: SheetCellFormat;
  onInsertFunction: (fn: QuickFunctionName) => void;
  onToggleStyle: (key: 'bold' | 'italic' | 'highlight') => void;
  onSetAlign: (align: SheetAlign) => void;
  onFormatNumber: (mode: NumberFormatMode) => void;
  onAddRow: () => void;
  onRemoveRow: () => void;
  onAddColumn: () => void;
  onRemoveColumn: () => void;
  onExportCsv: () => void;
}

const QUICK_FUNCTIONS: QuickFunctionName[] = ['SUM', 'AVG', 'COUNT', 'MAX', 'MIN'];
const NUMBER_MODES: Array<{ mode: NumberFormatMode; label: string; text: string }> = [
  { mode: 'currency', label: 'Currency $', text: '$' },
  { mode: 'percent', label: 'Percent %', text: '%' },
  { mode: 'decimal', label: 'Decimal .00', text: '.00' },
];
const BTN = 'inline-flex items-center gap-1 rounded-none border px-2 py-1 font-mono text-xs transition-colors disabled:opacity-40';
const IDLE = 'border-[#30363D] bg-[#21262D] text-[#E6EDF3] hover:border-[#22C55E] hover:text-[#22C55E]';
const ACTIVE = 'border-[#22C55E] bg-[#052E16] text-[#22C55E]';

export function OrbitSheetToolbar({
  readOnly = false,
  activeFormat,
  onInsertFunction,
  onToggleStyle,
  onSetAlign,
  onFormatNumber,
  onAddRow,
  onRemoveRow,
  onAddColumn,
  onRemoveColumn,
  onExportCsv,
}: OrbitSheetToolbarProps) {
  const align = activeFormat.align ?? 'left';

  return (
    <div role="toolbar" aria-label="Spreadsheet toolbar" className="flex flex-wrap items-center justify-between gap-1.5 border-b border-[#30363D] bg-[#161B22] px-3 py-1.5">
      <div className="flex flex-wrap items-center gap-1">
        {QUICK_FUNCTIONS.map((fn) => (
          <button key={fn} type="button" disabled={readOnly} onClick={() => onInsertFunction(fn)} className={`${BTN} ${IDLE}`}>{fn}</button>
        ))}
        <span className="mx-1 h-4 w-px bg-[#30363D]" aria-hidden="true" />
        <button type="button" aria-label="Bold" disabled={readOnly} onClick={() => onToggleStyle('bold')} className={`${BTN} ${activeFormat.bold ? ACTIVE : IDLE}`}>
          <Bold className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
        <button type="button" aria-label="Italic" disabled={readOnly} onClick={() => onToggleStyle('italic')} className={`${BTN} ${activeFormat.italic ? ACTIVE : IDLE}`}>
          <Italic className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
        <button type="button" aria-label="Highlight cell" disabled={readOnly} onClick={() => onToggleStyle('highlight')} className={`${BTN} ${activeFormat.highlight ? ACTIVE : IDLE}`}>
          <Highlighter className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
        <span className="mx-1 h-4 w-px bg-[#30363D]" aria-hidden="true" />
        {(['left', 'center', 'right'] as const).map((dir) => {
          const Icon = dir === 'left' ? AlignLeft : dir === 'center' ? AlignCenter : AlignRight;
          return (
            <button key={dir} type="button" aria-label={`Align ${dir}`} disabled={readOnly} onClick={() => onSetAlign(dir)} className={`${BTN} ${align === dir ? ACTIVE : IDLE}`}>
              <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          );
        })}
        <span className="mx-1 h-4 w-px bg-[#30363D]" aria-hidden="true" />
        {NUMBER_MODES.map(({ mode, label, text }) => (
          <button key={mode} type="button" aria-label={label} disabled={readOnly} onClick={() => onFormatNumber(mode)} className={`${BTN} ${activeFormat.numFormat === mode ? ACTIVE : IDLE}`}>{text}</button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1">
        {!readOnly && (
          <>
            <button type="button" aria-label="Add row" onClick={onAddRow} className={`${BTN} ${IDLE}`}><Plus className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" /> Row</button>
            <button type="button" aria-label="Remove row" onClick={onRemoveRow} className={`${BTN} ${IDLE}`}><Minus className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" /> Row</button>
            <button type="button" aria-label="Add column" onClick={onAddColumn} className={`${BTN} ${IDLE}`}><Plus className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" /> Col</button>
            <button type="button" aria-label="Remove column" onClick={onRemoveColumn} className={`${BTN} ${IDLE}`}><Minus className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" /> Col</button>
          </>
        )}
        <button type="button" onClick={onExportCsv} className={`${BTN} ${IDLE}`}><Download className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" /> Export CSV</button>
      </div>
    </div>
  );
}
