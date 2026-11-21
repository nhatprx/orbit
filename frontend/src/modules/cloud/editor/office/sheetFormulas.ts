const CELL_REF_RE = /^([A-Z]+)(\d+)$/i;
const FN_RE = /\b(SUM|AVG|AVERAGE|MIN|MAX|COUNT|ROUND|ABS|SQRT|IF)\s*\(([^()]*)\)/i;

export function columnLabel(index: number): string {
  let n = index;
  let label = '';
  while (n >= 0) { label = String.fromCharCode(65 + (n % 26)) + label; n = Math.floor(n / 26) - 1; }
  return label;
}

export const isFormulaExpectingRef = (raw: string): boolean => {
  const trimmed = raw.trim();
  return trimmed.startsWith('=') && /[=+\-*/^(,:><]$/.test(trimmed);
};

export const isNumericValue = (val: string): boolean => val.trim() !== '' && Number.isFinite(Number(val.trim()));

export function parseCellRef(ref: string): { row: number; col: number } | null {
  const match = CELL_REF_RE.exec(ref.trim());
  if (!match?.[1] || !match[2]) return null;
  const colLetters = match[1].toUpperCase();
  const rowNum = Number.parseInt(match[2], 10);
  if (!Number.isFinite(rowNum) || rowNum < 1) return null;
  let col = 0;
  for (let i = 0; i < colLetters.length; i += 1) col = col * 26 + (colLetters.charCodeAt(i) - 64);
  return { row: rowNum - 1, col: col - 1 };
}

export function extractFormulaCellRefs(raw: string): Set<string> {
  const refs = new Set<string>();
  const trimmed = raw.trim();
  if (!trimmed.startsWith('=')) return refs;
  const body = trimmed.slice(1);
  for (const m of body.matchAll(/\b([A-Za-z]+\d+)\s*:\s*([A-Za-z]+\d+)\b/g)) {
    const start = parseCellRef(m[1] ?? '');
    const end = parseCellRef(m[2] ?? '');
    if (!start || !end) continue;
    for (let r = Math.min(start.row, end.row); r <= Math.max(start.row, end.row); r += 1)
      for (let c = Math.min(start.col, end.col); c <= Math.max(start.col, end.col); c += 1) refs.add(`${r}:${c}`);
  }
  for (const m of body.matchAll(/\b([A-Za-z]+\d+)\b(?!\s*\()/g)) {
    const ref = parseCellRef(m[1] ?? '');
    if (ref) refs.add(`${ref.row}:${ref.col}`);
  }
  return refs;
}

function parseNumericLiteral(str: string): number | null {
  const trimmed = str.trim();
  if (!trimmed) return null;
  const isPct = trimmed.endsWith('%');
  const core = (isPct ? trimmed.slice(0, -1).trim() : trimmed).replace(/^(-?\d+),(\d+)$/, '$1.$2');
  const num = core ? Number(core) : Number.NaN;
  return Number.isFinite(num) ? (isPct ? num / 100 : num) : null;
}

function resolveNumericCell(rows: string[][], row: number, col: number, visited: Set<string>): number | null {
  const evaluated = evaluateCellInternal(rows[row]?.[col] ?? '', rows, visited, `${row}:${col}`);
  if (evaluated === '#CYCLE!' || evaluated === '#ERR') throw new Error(evaluated);
  return parseNumericLiteral(evaluated);
}

function evaluateArithmetic(expr: string): number {
  const normalized = expr.replace(/(\d+),(\d+)/g, '$1.$2');
  const tokens = normalized.match(/\d+(?:\.\d+)?|[+\-*/^%()]/g);
  if (!tokens || tokens.join('') !== normalized.replace(/\s+/g, '')) throw new Error('Invalid expression');
  let pos = 0;
  const parseExpr = (): number => {
    let left = parseTerm();
    while (tokens[pos] === '+' || tokens[pos] === '-') left = tokens[pos++] === '+' ? left + parseTerm() : left - parseTerm();
    return left;
  };
  const parseTerm = (): number => {
    let left = parsePower();
    while (tokens[pos] === '*' || tokens[pos] === '/') {
      const op = tokens[pos++];
      const right = parsePower();
      if (op === '/' && right === 0) throw new Error('Division by zero');
      left = op === '*' ? left * right : left / right;
    }
    return left;
  };
  const parsePower = (): number => { const b = parseUnary(); return tokens[pos] === '^' ? (pos++, Math.pow(b, parsePower())) : b; };
  const parseUnary = (): number => {
    if (tokens[pos] === '+' || tokens[pos] === '-') return tokens[pos++] === '-' ? -parseUnary() : parseUnary();
    let val = parsePrimary();
    while (tokens[pos] === '%') { pos += 1; val /= 100; }
    return val;
  };
  const parsePrimary = (): number => {
    const tok = tokens[pos];
    if (tok === '(') { pos += 1; const v = parseExpr(); if (tokens[pos++] !== ')') throw new Error('Unclosed'); return v; }
    if (tok !== undefined && /^\d/.test(tok)) { pos += 1; return Number(tok); }
    throw new Error('Unexpected token');
  };
  const result = parseExpr();
  if (pos !== tokens.length || !Number.isFinite(result)) throw new Error('Trailing tokens');
  return result;
}

function evaluateSubExpr(expr: string, rows: string[][], visited: Set<string>): number {
  const withRefs = expr.replace(/\b([A-Za-z]+\d+)\b/g, (refStr: string) => {
    const ref = parseCellRef(refStr);
    if (!ref) throw new Error('Bad ref');
    const val = resolveNumericCell(rows, ref.row, ref.col, new Set(visited)) ?? 0;
    return val < 0 ? `(${val})` : String(val);
  });
  return evaluateArithmetic(withRefs);
}

function collectRangeNumbers(parts: string[], rows: string[][], visited: Set<string>): number[] {
  const values: number[] = [];
  for (const part of parts) {
    if (part.includes(':')) {
      const [sStr, eStr] = part.split(':');
      const start = parseCellRef(sStr ?? '');
      const end = parseCellRef(eStr ?? '');
      if (!start || !end) throw new Error('Bad range');
      for (let r = Math.min(start.row, end.row); r <= Math.max(start.row, end.row); r += 1)
        for (let c = Math.min(start.col, end.col); c <= Math.max(start.col, end.col); c += 1) {
          const val = resolveNumericCell(rows, r, c, new Set(visited));
          if (val !== null) values.push(val);
        }
    } else if (parseCellRef(part)) {
      const ref = parseCellRef(part)!;
      const val = resolveNumericCell(rows, ref.row, ref.col, new Set(visited));
      if (val !== null) values.push(val);
    } else values.push(evaluateSubExpr(part, rows, new Set(visited)));
  }
  return values;
}

function evaluateFunction(fnName: string, argExpr: string, rows: string[][], visited: Set<string>): number {
  const upper = fnName.toUpperCase();
  const parts = (argExpr.includes(';') ? argExpr.split(';') : argExpr.split(',')).map((p) => p.trim()).filter(Boolean);
  if (upper === 'IF') {
    if (parts.length < 2 || parts.length > 3) throw new Error('Invalid IF');
    const cmp = /^(.*?)(>=|<=|<>|!=|==|=|>|<)(.*)$/.exec(parts[0]!);
    const cond = cmp
      ? ((l, r, op) => (op === '>=' ? l >= r : op === '<=' ? l <= r : op === '<>' || op === '!=' ? l !== r : op === '>' ? l > r : op === '<' ? l < r : l === r))(
          evaluateSubExpr(cmp[1]!, rows, visited), evaluateSubExpr(cmp[3]!, rows, visited), cmp[2]
        )
      : evaluateSubExpr(parts[0]!, rows, visited) !== 0;
    return evaluateSubExpr(cond ? parts[1]! : (parts[2] ?? '0'), rows, visited);
  }
  if (upper === 'ROUND') {
    if (parts.length < 1 || parts.length > 2) throw new Error('Invalid ROUND');
    const factor = Math.pow(10, parts[1] !== undefined ? Math.trunc(evaluateSubExpr(parts[1], rows, visited)) : 0);
    return Math.round(evaluateSubExpr(parts[0]!, rows, visited) * factor) / factor;
  }
  if (upper === 'ABS' || upper === 'SQRT') {
    if (parts.length !== 1) throw new Error('Invalid arg count');
    const val = evaluateSubExpr(parts[0]!, rows, visited);
    if (upper === 'SQRT' && val < 0) throw new Error('Negative SQRT');
    return upper === 'ABS' ? Math.abs(val) : Math.sqrt(val);
  }
  const nums = collectRangeNumbers(parts, rows, visited);
  if (upper === 'SUM') return nums.reduce((acc, v) => acc + v, 0);
  if (upper === 'AVG' || upper === 'AVERAGE') return nums.length === 0 ? 0 : nums.reduce((acc, v) => acc + v, 0) / nums.length;
  if (upper === 'MIN') return nums.length === 0 ? 0 : Math.min(...nums);
  if (upper === 'MAX') return nums.length === 0 ? 0 : Math.max(...nums);
  if (upper === 'COUNT') return nums.length;
  throw new Error('Unknown function');
}

function evaluateCellInternal(raw: string, rows: string[][], visited: Set<string>, cellKey?: string): string {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('=')) return raw;
  if (cellKey) { if (visited.has(cellKey)) return '#CYCLE!'; visited.add(cellKey); }
  try {
    let body = trimmed.slice(1).trim();
    if (!body) return '';
    while (FN_RE.test(body)) {
      body = body.replace(FN_RE, (_, fn: string, args: string) => {
        const v = evaluateFunction(fn, args, rows, new Set(visited));
        return v < 0 ? `(${v})` : String(v);
      });
    }
    return String(Math.round(evaluateSubExpr(body, rows, new Set(visited)) * 1_000_000) / 1_000_000);
  } catch (err: unknown) {
    return err instanceof Error && err.message === '#CYCLE!' ? '#CYCLE!' : '#ERR';
  }
}

export const evaluateSheetCell = (raw: string, rows: string[][], row?: number, col?: number): string =>
  evaluateCellInternal(raw, rows, new Set<string>(), row !== undefined && col !== undefined ? `${row}:${col}` : undefined);

export const toSheetCsv = (rows: string[][]): string =>
  rows.map((row, rIdx) => row.map((cell, cIdx) => {
    const val = evaluateSheetCell(cell, rows, rIdx, cIdx);
    return /[",\n]/.test(val) ? `"${val.replace(/"/g, '""')}"` : val;
  }).join(',')).join('\n');
