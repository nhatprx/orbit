import {
  BooleanNumber,
  BorderStyleTypes,
  HorizontalAlign,
  VerticalAlign,
  WrapStrategy,
  type IBorderStyleData,
  type IStyleData,
  type Nullable,
} from '@univerjs/presets';
import type { SheetCellStyleDto, SheetNumberFormat } from './officeTypes';

export const HIGHLIGHT_BG_HEX = '#052E16';
export const MIN_SHEET_FONT_SIZE = 8;
export const MAX_SHEET_FONT_SIZE = 36;
export const MIN_SHEET_DECIMALS = 0;
export const MAX_SHEET_DECIMALS = 6;

const HEX6_RE = /^#[0-9A-Fa-f]{6}$/;
const HEX3_RE = /^#([0-9A-Fa-f])([0-9A-Fa-f])([0-9A-Fa-f])$/;
const RGB_FN_RE = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*[\d.]+)?\s*\)$/i;
const DATE_TOKEN_RE = /[ymdhsYMDHS]|AM\/PM|A\/P/;
const CURRENCY_RE = /[$€£¥¤]/;

export const clampFontSize = (size: number): number =>
  Math.max(MIN_SHEET_FONT_SIZE, Math.min(MAX_SHEET_FONT_SIZE, Math.round(size)));

export const clampDecimals = (decimals: number): number =>
  Math.max(MIN_SHEET_DECIMALS, Math.min(MAX_SHEET_DECIMALS, Math.round(decimals)));

export const defaultDecimalsFor = (numFmt?: SheetNumberFormat): number =>
  numFmt === 'percent' ? 1 : 2;

export function normalizeHexColor(raw?: Nullable<string>): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (HEX6_RE.test(trimmed)) return trimmed.toUpperCase();
  const m3 = HEX3_RE.exec(trimmed);
  if (m3) return `#${m3[1]}${m3[1]}${m3[2]}${m3[2]}${m3[3]}${m3[3]}`.toUpperCase();
  const rgb = RGB_FN_RE.exec(trimmed);
  if (rgb) {
    const r = Math.min(255, Number.parseInt(rgb[1]!, 10));
    const g = Math.min(255, Number.parseInt(rgb[2]!, 10));
    const b = Math.min(255, Number.parseInt(rgb[3]!, 10));
    const hex = (n: number) => n.toString(16).padStart(2, '0').toUpperCase();
    return `#${hex(r)}${hex(g)}${hex(b)}`;
  }
  return undefined;
}

export function toUniverNumFmtPattern(numFmt?: SheetNumberFormat, decimals?: number): string | null {
  if (numFmt === 'text') return '@';
  const hasFmt = Boolean(numFmt && numFmt !== 'auto');
  const hasDec = typeof decimals === 'number' && Number.isFinite(decimals);
  if (!hasFmt && !hasDec) return null;
  const mode: SheetNumberFormat = hasFmt ? numFmt! : 'number';
  const d = hasDec ? clampDecimals(decimals!) : defaultDecimalsFor(mode);
  const frac = d > 0 ? `.${'0'.repeat(d)}` : '';
  if (mode === 'currency') return `$#,##0${frac}`;
  if (mode === 'percent') return `0${frac}%`;
  return `#,##0${frac}`;
}

function stripPatternLiterals(section: string): string {
  let out = '';
  let inQuote = false;
  let inBracket = false;
  for (let i = 0; i < section.length; i += 1) {
    const ch = section[i]!;
    if (ch === '\\' && !inQuote && i + 1 < section.length) { i += 1; continue; }
    if ((ch === '_' || ch === '*') && !inQuote && !inBracket && i + 1 < section.length) { i += 1; continue; }
    if (ch === '"') { inQuote = !inQuote; continue; }
    if (inQuote) continue;
    if (ch === '[') { inBracket = true; continue; }
    if (ch === ']') { inBracket = false; continue; }
    if (!inBracket) out += ch;
  }
  return out;
}

export function parseUniverNumFmtPattern(pattern?: Nullable<string>): { numFmt?: SheetNumberFormat; decimals?: number } {
  if (!pattern) return {};
  const trimmed = pattern.trim();
  if (!trimmed || trimmed.toLowerCase() === 'general') return {};
  if (trimmed === '@') return { numFmt: 'text' };
  const section = trimmed.split(';')[0] ?? '';
  const isPercent = section.includes('%');
  const isCurrency = !isPercent && CURRENCY_RE.test(section);
  const cleaned = stripPatternLiterals(section);
  const dotIdx = cleaned.indexOf('.');
  let decimals = 0;
  if (dotIdx >= 0) {
    for (let i = dotIdx + 1; i < cleaned.length; i += 1) {
      const ch = cleaned[i]!;
      if (ch === '0' || ch === '#' || ch === '?') decimals += 1;
      else break;
    }
  }
  const clamped = clampDecimals(decimals);
  if (isPercent) return { numFmt: 'percent', decimals: clamped };
  if (isCurrency) return { numFmt: 'currency', decimals: clamped };
  if (DATE_TOKEN_RE.test(cleaned)) return {};
  if (cleaned.includes('0') || cleaned.includes('#')) return { numFmt: 'number', decimals: clamped };
  return {};
}

export function toUniverStyle(dto?: SheetCellStyleDto): IStyleData | null {
  if (!dto) return null;
  const style: IStyleData = {};
  if (dto.bold) style.bl = BooleanNumber.TRUE;
  if (dto.italic) style.it = BooleanNumber.TRUE;
  if (dto.underline) style.ul = { s: BooleanNumber.TRUE };
  if (dto.strike) style.st = { s: BooleanNumber.TRUE };
  if (typeof dto.fontSize === 'number' && Number.isFinite(dto.fontSize)) style.fs = clampFontSize(dto.fontSize);
  const fg = normalizeHexColor(dto.textColor);
  if (fg) style.cl = { rgb: fg };
  const bg = normalizeHexColor(dto.bgColor) ?? (dto.highlight ? HIGHLIGHT_BG_HEX : undefined);
  if (bg) style.bg = { rgb: bg };
  if (dto.border === 'all' || dto.border === 'bottom') {
    const thin: IBorderStyleData = { s: BorderStyleTypes.THIN, cl: { rgb: '#8B949E' } };
    style.bd = dto.border === 'all' ? { t: thin, r: thin, b: thin, l: thin } : { b: thin };
  }
  if (dto.align === 'left') style.ht = HorizontalAlign.LEFT;
  else if (dto.align === 'center') style.ht = HorizontalAlign.CENTER;
  else if (dto.align === 'right') style.ht = HorizontalAlign.RIGHT;
  if (dto.valign === 'top') style.vt = VerticalAlign.TOP;
  else if (dto.valign === 'middle') style.vt = VerticalAlign.MIDDLE;
  else if (dto.valign === 'bottom') style.vt = VerticalAlign.BOTTOM;
  if (dto.wrap) style.tb = WrapStrategy.WRAP;
  const pattern = toUniverNumFmtPattern(dto.numFmt, dto.decimals);
  if (pattern) style.n = { pattern };
  return Object.keys(style).length > 0 ? style : null;
}

export function fromUniverStyle(style?: Nullable<IStyleData>): SheetCellStyleDto | null {
  if (!style) return null;
  const out: SheetCellStyleDto = {};
  if (style.bl === BooleanNumber.TRUE) out.bold = true;
  if (style.it === BooleanNumber.TRUE) out.italic = true;
  if (style.ul?.s === BooleanNumber.TRUE) out.underline = true;
  if (style.st?.s === BooleanNumber.TRUE) out.strike = true;
  if (typeof style.fs === 'number' && Number.isFinite(style.fs)) out.fontSize = clampFontSize(style.fs);
  const fg = normalizeHexColor(style.cl?.rgb);
  if (fg) out.textColor = fg;
  const bg = normalizeHexColor(style.bg?.rgb);
  if (bg) {
    out.bgColor = bg;
    if (bg === HIGHLIGHT_BG_HEX) out.highlight = true;
  }
  if (style.bd) {
    const hasSide = (side?: Nullable<IBorderStyleData>) => Boolean(side && side.s !== BorderStyleTypes.NONE);
    if (hasSide(style.bd.t) && hasSide(style.bd.r) && hasSide(style.bd.b) && hasSide(style.bd.l)) out.border = 'all';
    else if (hasSide(style.bd.b)) out.border = 'bottom';
  }
  if (style.ht === HorizontalAlign.LEFT) out.align = 'left';
  else if (style.ht === HorizontalAlign.CENTER) out.align = 'center';
  else if (style.ht === HorizontalAlign.RIGHT) out.align = 'right';
  if (style.vt === VerticalAlign.TOP) out.valign = 'top';
  else if (style.vt === VerticalAlign.MIDDLE) out.valign = 'middle';
  else if (style.vt === VerticalAlign.BOTTOM) out.valign = 'bottom';
  if (style.tb === WrapStrategy.WRAP) out.wrap = true;
  const parsedFmt = parseUniverNumFmtPattern(style.n?.pattern);
  if (parsedFmt.numFmt) out.numFmt = parsedFmt.numFmt;
  if (parsedFmt.decimals !== undefined) out.decimals = parsedFmt.decimals;
  return Object.keys(out).length > 0 ? out : null;
}
