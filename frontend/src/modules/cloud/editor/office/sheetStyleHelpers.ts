import type { SheetAlign, SheetCellStyleDto, SheetNumberFormat } from './officeTypes';
import { evaluateSheetCell, toSheetCsv } from './sheetFormulas';

export type { SheetAlign, SheetCellStyleDto, SheetNumberFormat };
export type QuickFunctionName = 'SUM' | 'AVG' | 'COUNT' | 'MAX' | 'MIN';

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

function cleanStyle(style: SheetCellStyleDto): SheetCellStyleDto | null {
  const out: SheetCellStyleDto = {};
  if (style.bold) out.bold = true;
  if (style.italic) out.italic = true;
  if (style.underline) out.underline = true;
  if (style.highlight) out.highlight = true;
  if (style.align) out.align = style.align;
  if (style.numFmt) out.numFmt = style.numFmt;
  return Object.keys(out).length > 0 ? out : null;
}

export function patchCellStyles(
  existing: Record<string, SheetCellStyleDto> | undefined,
  range: SheetRangeBounds,
  patch: Partial<SheetCellStyleDto>
): Record<string, SheetCellStyleDto> {
  const next: Record<string, SheetCellStyleDto> = { ...(existing ?? {}) };
  for (let r = range.minR; r <= range.maxR; r += 1) {
    for (let c = range.minC; c <= range.maxC; c += 1) {
      const key = `${r}:${c}`;
      const merged = cleanStyle({ ...next[key], ...patch });
      if (merged) next[key] = merged;
      else delete next[key];
    }
  }
  return next;
}

export function getSheetCellClasses(
  isSelected: boolean, isFormulaRef: boolean, inRange: boolean, align: SheetAlign, fmt?: SheetCellStyleDto
): { tdCls: string; inputCls: string } {
  const tdCls = isSelected
    ? 'z-10 bg-[#052E16]/30 border-[#22C55E]/40 outline outline-2 -outline-offset-2 outline-[#22C55E]'
    : isFormulaRef ? 'z-10 outline-dashed outline-1 -outline-offset-1 outline-[#4ADE80] bg-[#052E16]/40'
    : inRange ? 'bg-[#052E16]/30 border-[#22C55E]/40' : 'border-[#21262D]';
  const alignCls = align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';
  const bgCls = fmt?.highlight ? 'bg-[#052E16]/50' : isFormulaRef ? 'bg-[#052E16]/40' : inRange ? 'bg-[#052E16]/30' : 'bg-[#0D1117]';
  const deco = `${fmt?.bold ? 'font-bold' : ''} ${fmt?.italic ? 'italic' : ''} ${fmt?.underline ? 'underline' : ''}`;
  return { tdCls, inputCls: `h-7 w-full rounded-none px-2 text-xs text-[#E6EDF3] focus:outline-none ${alignCls} ${deco} ${bgCls}` };
}

export function exportSheetCsv(sheetName: string, rawRows: string[][]): void {
  const url = URL.createObjectURL(new Blob([toSheetCsv(rawRows)], { type: 'text/csv;charset=utf-8' }));
  const anchor = Object.assign(document.createElement('a'), { href: url, download: `${sheetName}.csv` });
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function formatCellDisplay(evaluated: string, fmt?: SheetCellStyleDto): string {
  if (!fmt?.numFmt) return evaluated;
  const trimmed = evaluated.trim();
  if (!trimmed) return evaluated;
  const num = Number(trimmed);
  if (!Number.isFinite(num)) return evaluated;
  if (fmt.numFmt === 'currency') return `$${num.toFixed(2)}`;
  if (fmt.numFmt === 'percent') return `${(num * 100).toFixed(1)}%`;
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
