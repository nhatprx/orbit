import { columnLabel } from './sheetFormulas';

export interface FormulaSuggestionItem {
  name: string;
  signature: string;
  description: string;
}

export interface FormulaTokenMatch {
  query: string;
  startIndex: number;
  endIndex: number;
}

export interface FormulaSuggestionResult {
  token: FormulaTokenMatch;
  items: FormulaSuggestionItem[];
}

export const SHEET_FORMULA_CATALOG: readonly FormulaSuggestionItem[] = [
  { name: 'SUM', signature: 'SUM(range)', description: 'Adds all numeric values in a range or list' },
  { name: 'AVERAGE', signature: 'AVERAGE(range)', description: 'Returns the arithmetic mean of numeric values' },
  { name: 'COUNT', signature: 'COUNT(range)', description: 'Counts cells containing numeric values' },
  { name: 'MIN', signature: 'MIN(range)', description: 'Returns the smallest numeric value' },
  { name: 'MAX', signature: 'MAX(range)', description: 'Returns the largest numeric value' },
  { name: 'IF', signature: 'IF(cond, trueVal, falseVal)', description: 'Returns one value when true, another when false' },
  { name: 'ROUND', signature: 'ROUND(value, places)', description: 'Rounds a number to specified decimal places' },
  { name: 'ABS', signature: 'ABS(value)', description: 'Returns the absolute value of a number' },
  { name: 'SQRT', signature: 'SQRT(value)', description: 'Returns the square root of a non-negative number' },
  { name: 'AVG', signature: 'AVG(range)', description: 'Alias for AVERAGE; returns arithmetic mean' },
];

const BARE_EQUALS_RE = /^\s*=$/;
const TOKEN_AFTER_DELIM_RE = /(?:[=+\-*/^(,;><])\s*([A-Za-z]+)$/;

export function extractFormulaSuggestToken(raw: string, cursorPos?: number): FormulaTokenMatch | null {
  if (!/^\s*=/.test(raw)) return null;
  const end = cursorPos !== undefined ? Math.max(0, Math.min(cursorPos, raw.length)) : raw.length;
  const prefix = raw.slice(0, end);

  if (BARE_EQUALS_RE.test(prefix)) {
    return { query: '', startIndex: end, endIndex: end };
  }

  const match = TOKEN_AFTER_DELIM_RE.exec(prefix);
  if (!match?.[1]) return null;
  const query = match[1];
  return { query, startIndex: end - query.length, endIndex: end };
}

export function getFormulaSuggestions(raw: string, cursorPos?: number): FormulaSuggestionResult | null {
  const token = extractFormulaSuggestToken(raw, cursorPos);
  if (!token) return null;

  if (!token.query) {
    return { token, items: [...SHEET_FORMULA_CATALOG] };
  }

  const upper = token.query.toUpperCase();
  const prefixMatches: FormulaSuggestionItem[] = [];
  const substringMatches: FormulaSuggestionItem[] = [];

  for (const item of SHEET_FORMULA_CATALOG) {
    if (item.name.startsWith(upper)) prefixMatches.push(item);
    else if (item.name.includes(upper)) substringMatches.push(item);
  }

  const items = [...prefixMatches, ...substringMatches];
  return items.length > 0 ? { token, items } : null;
}

export function applyFormulaSuggestion(
  raw: string,
  token: FormulaTokenMatch,
  fnName: string
): { nextValue: string; nextCursor: number } {
  const before = raw.slice(0, token.startIndex);
  const after = raw.slice(token.endIndex);
  const alreadyHasParen = after.startsWith('(');
  const inserted = alreadyHasParen ? fnName : `${fnName}(`;
  const nextValue = `${before}${inserted}${after}`;
  const nextCursor = before.length + fnName.length + 1;
  return { nextValue, nextCursor };
}

export function autoCloseFormulaParens(raw: string): string {
  if (!raw.trim().startsWith('=')) return raw;
  let balance = 0;
  for (let i = 0; i < raw.length; i += 1) {
    if (raw[i] === '(') balance += 1;
    else if (raw[i] === ')' && balance > 0) balance -= 1;
  }
  return balance > 0 ? `${raw}${')'.repeat(balance)}` : raw;
}

export function formatFormulaRange(startR: number, startC: number, endR: number, endC: number): string {
  if (startR === endR && startC === endC) {
    return `${columnLabel(startC)}${startR + 1}`;
  }
  const minR = Math.min(startR, endR);
  const maxR = Math.max(startR, endR);
  const minC = Math.min(startC, endC);
  const maxC = Math.max(startC, endC);
  return `${columnLabel(minC)}${minR + 1}:${columnLabel(maxC)}${maxR + 1}`;
}
