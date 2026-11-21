import { describe, expect, it } from 'vitest';
import {
  SHEET_FORMULA_CATALOG,
  applyFormulaSuggestion,
  autoCloseFormulaParens,
  extractFormulaSuggestToken,
  formatFormulaRange,
  getFormulaSuggestions,
} from './sheetFormulaSuggest';

describe('sheetFormulaSuggest', () => {
  it('exposes all supported spreadsheet functions in catalog', () => {
    const names = SHEET_FORMULA_CATALOG.map((f) => f.name);
    expect(names).toEqual(['SUM', 'AVERAGE', 'COUNT', 'MIN', 'MAX', 'IF', 'ROUND', 'ABS', 'SQRT', 'AVG']);
    for (const fn of SHEET_FORMULA_CATALOG) {
      expect(fn.signature).toContain(`${fn.name}(`);
      expect(fn.description.length).toBeGreaterThan(8);
    }
  });

  it('extracts formula tokens on bare equals, prefix letters, and post-operator letters', () => {
    expect(extractFormulaSuggestToken('=')).toEqual({ query: '', startIndex: 1, endIndex: 1 });
    expect(extractFormulaSuggestToken('=s')).toEqual({ query: 's', startIndex: 1, endIndex: 2 });
    expect(extractFormulaSuggestToken('=su')).toEqual({ query: 'su', startIndex: 1, endIndex: 3 });
    expect(extractFormulaSuggestToken('=A1+av')).toEqual({ query: 'av', startIndex: 4, endIndex: 6 });
    expect(extractFormulaSuggestToken('=SUM(A1,ro')).toEqual({ query: 'ro', startIndex: 8, endIndex: 10 });
    expect(extractFormulaSuggestToken('=A1+su+B1', 6)).toEqual({ query: 'su', startIndex: 4, endIndex: 6 });

    // Non-suggestable states
    expect(extractFormulaSuggestToken('SUM')).toBeNull();
    expect(extractFormulaSuggestToken('=SUM(')).toBeNull();
    expect(extractFormulaSuggestToken('=A1')).toBeNull();
    expect(extractFormulaSuggestToken('=10+')).toBeNull();
    expect(extractFormulaSuggestToken('')).toBeNull();
  });

  it('ranks prefix matches before substring matches and returns top common functions on bare =', () => {
    const bare = getFormulaSuggestions('=');
    expect(bare?.items.slice(0, 6).map((i) => i.name)).toEqual(['SUM', 'AVERAGE', 'COUNT', 'MIN', 'MAX', 'IF']);

    const sMatches = getFormulaSuggestions('=s');
    expect(sMatches?.items.map((i) => i.name)).toEqual(['SUM', 'SQRT', 'ABS']);

    const suMatches = getFormulaSuggestions('=su');
    expect(suMatches?.items.map((i) => i.name)).toEqual(['SUM']);

    const avMatches = getFormulaSuggestions('=A1+av');
    expect(avMatches?.items.map((i) => i.name)).toEqual(['AVERAGE', 'AVG']);

    expect(getFormulaSuggestions('=zzz')).toBeNull();
  });

  it('applies accepted suggestion with opening paren and accurate cursor position', () => {
    const res1 = getFormulaSuggestions('=s')!;
    expect(applyFormulaSuggestion('=s', res1.token, 'SUM')).toEqual({ nextValue: '=SUM(', nextCursor: 5 });

    const res2 = getFormulaSuggestions('=')!;
    expect(applyFormulaSuggestion('=', res2.token, 'AVERAGE')).toEqual({ nextValue: '=AVERAGE(', nextCursor: 9 });

    const res3 = getFormulaSuggestions('=A1+av')!;
    expect(applyFormulaSuggestion('=A1+av', res3.token, 'AVG')).toEqual({ nextValue: '=A1+AVG(', nextCursor: 8 });

    const res4 = getFormulaSuggestions('=su(A1:A3)', 3)!;
    expect(applyFormulaSuggestion('=su(A1:A3)', res4.token, 'SUM')).toEqual({ nextValue: '=SUM(A1:A3)', nextCursor: 5 });
  });

  it('auto-closes unbalanced parentheses on formulas and leaves non-formulas untouched', () => {
    expect(autoCloseFormulaParens('=SUM(A1:A5')).toBe('=SUM(A1:A5)');
    expect(autoCloseFormulaParens('=ROUND(SUM(A1:A3), 2')).toBe('=ROUND(SUM(A1:A3), 2)');
    expect(autoCloseFormulaParens('=ROUND(SUM(A1:A3')).toBe('=ROUND(SUM(A1:A3))');
    expect(autoCloseFormulaParens('=SUM(A1:A5)')).toBe('=SUM(A1:A5)');
    expect(autoCloseFormulaParens('plain (text')).toBe('plain (text');
  });

  it('formats single-cell and normalized rectangular ranges cleanly', () => {
    expect(formatFormulaRange(0, 0, 0, 0)).toBe('A1');
    expect(formatFormulaRange(0, 0, 4, 0)).toBe('A1:A5');
    expect(formatFormulaRange(2, 2, 0, 0)).toBe('A1:C3');
    expect(formatFormulaRange(3, 1, 1, 3)).toBe('B2:D4');
  });
});
