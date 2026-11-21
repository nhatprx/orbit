import { describe, expect, it } from 'vitest';
import {
  columnLabel, evaluateSheetCell, extractFormulaCellRefs, isFormulaExpectingRef, isNumericValue, parseCellRef, toSheetCsv,
} from './sheetFormulas';

describe('sheetFormulas', () => {
  it('converts column indexes, cell references, and formula reference states accurately', () => {
    expect(columnLabel(0)).toBe('A');
    expect(columnLabel(25)).toBe('Z');
    expect(columnLabel(26)).toBe('AA');
    expect(parseCellRef('B3')).toEqual({ row: 2, col: 1 });
    expect(parseCellRef('aa10')).toEqual({ row: 9, col: 26 });
    expect(parseCellRef('invalid')).toBeNull();
    expect(isFormulaExpectingRef('=')).toBe(true);
    expect(isFormulaExpectingRef('=A1+')).toBe(true);
    expect(isFormulaExpectingRef('=SUM(')).toBe(true);
    expect(isFormulaExpectingRef('=A1:')).toBe(true);
    expect(isFormulaExpectingRef('=A1+B1')).toBe(false);
    expect(isNumericValue('60')).toBe(true);
    expect(isNumericValue('text')).toBe(false);
  });

  it('evaluates SUM, AVG, AVERAGE, MIN, MAX, COUNT, ROUND, ABS, SQRT, IF, power, percent, and comma decimals', () => {
    const rows = [
      ['10', '20', '=A1+B1'],
      ['30', '40', '=SUM(A1:B2)'],
      ['=AVG(A1:B2)', '=MIN(A1:B2)', '=MAX(A1:B2)'],
      ['=COUNT(A1:B2)', '=(B2-A1)*2', 'text'],
      ['10,5', '2,5', '=A5+B5'],
    ];

    expect(evaluateSheetCell('=10+25*2', rows)).toBe('60');
    expect(evaluateSheetCell('=A1+B1', rows, 0, 2)).toBe('30');
    expect(evaluateSheetCell('=SUM(A1:B2)', rows, 1, 2)).toBe('100');
    expect(evaluateSheetCell('=AVG(A1:B2)', rows, 2, 0)).toBe('25');
    expect(evaluateSheetCell('=AVERAGE(A1:B2)', rows, 2, 0)).toBe('25');
    expect(evaluateSheetCell('=MIN(A1:B2)', rows, 2, 1)).toBe('10');
    expect(evaluateSheetCell('=MAX(A1:B2)', rows, 2, 2)).toBe('40');
    expect(evaluateSheetCell('=COUNT(A1:B2)', rows, 3, 0)).toBe('4');
    expect(evaluateSheetCell('=(B2-A1)*2', rows, 3, 1)).toBe('60');
    expect(evaluateSheetCell('=2^3+50%', rows)).toBe('8.5');
    expect(evaluateSheetCell('=200*15%', rows)).toBe('30');
    expect(evaluateSheetCell('=A5+B5', rows, 4, 2)).toBe('13');
    expect(evaluateSheetCell('=10,5+2,5', rows)).toBe('13');
    expect(evaluateSheetCell('=ROUND(10/3, 2)', rows)).toBe('3.33');
    expect(evaluateSheetCell('=ABS(-42.5)', rows)).toBe('42.5');
    expect(evaluateSheetCell('=SQRT(A1^2 + 12^2 - 19)', rows)).toBe('15');
    expect(evaluateSheetCell('=IF(A1+B1>=30, A2*2, B1)', rows)).toBe('60');
    expect(evaluateSheetCell('=IF(A1>B1, 100, 200)', rows)).toBe('200');
  });

  it('handles division by zero, trailing operators, malformed expressions, and circular references safely', () => {
    const rows = [
      ['=10/0', '=UNKNOWN(A1)', '=A3'],
      ['=(1+2', '=', '=10+'],
      ['=C1', '=SQRT(-9)', ''],
    ];

    expect(evaluateSheetCell('=10/0', rows, 0, 0)).toBe('#ERR');
    expect(evaluateSheetCell('=UNKNOWN(A1)', rows, 0, 1)).toBe('#ERR');
    expect(evaluateSheetCell('=(1+2', rows, 1, 0)).toBe('#ERR');
    expect(evaluateSheetCell('=', rows, 1, 1)).toBe('');
    expect(evaluateSheetCell('=10+', rows, 1, 2)).toBe('#ERR');
    expect(evaluateSheetCell('=SQRT(-9)', rows, 2, 1)).toBe('#ERR');
    expect(evaluateSheetCell('=A3', rows, 0, 2)).toBe('#CYCLE!');
  });

  it('extracts single and range cell references from formulas for grid highlighting', () => {
    expect([...extractFormulaCellRefs('=A1+B2')].sort()).toEqual(['0:0', '1:1']);
    expect([...extractFormulaCellRefs('=SUM(A1:B2)+C3')].sort()).toEqual(['0:0', '0:1', '1:0', '1:1', '2:2']);
    expect([...extractFormulaCellRefs('=avg(b2:a1)')].sort()).toEqual(['0:0', '0:1', '1:0', '1:1']);
    expect([...extractFormulaCellRefs('=ROUND(A1/3, 2)')]).toEqual(['0:0']);
    expect(extractFormulaCellRefs('A1+B2').size).toBe(0);
    expect(extractFormulaCellRefs('').size).toBe(0);
  });

  it('exports evaluated cells as escaped CSV', () => {
    const rows = [
      ['Item, A', '10', '=B1*2'],
      ['Quote "X"', '5', '=B1+B2'],
    ];
    expect(toSheetCsv(rows)).toBe('"Item, A",10,20\n"Quote ""X""",5,15');
  });
});
