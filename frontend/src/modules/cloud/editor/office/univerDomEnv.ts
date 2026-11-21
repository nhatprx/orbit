import { CommandType, greenTheme, type Theme } from '@univerjs/presets';

export const orbitUniverTheme: Theme = {
  ...greenTheme,
  primary: {
    50: '#F0FDF4', 100: '#DCFCE7', 200: '#BBF7D0', 300: '#86EFAC', 400: '#4ADE80',
    500: '#22C55E', 600: '#22C55E', 700: '#16A34A', 800: '#15803D', 900: '#052E16',
  },
  gray: {
    0: '#FFFFFF', 50: '#E6EDF3', 100: '#C9D1D9', 200: '#8B949E', 300: '#6E7681', 400: '#484F58',
    500: '#30363D', 600: '#21262D', 700: '#161B22', 800: '#161B22', 900: '#0D1117', 1000: '#0D1117',
  },
};

const IGNORED_SHEET_MUTATIONS = new Set([
  'sheet.mutation.set-worksheet-row-auto-height', 'sheet.mutation.set-worksheet-row-is-auto-height',
  'sheet.mutation.set-worksheet-permission-points', 'sheet.mutation.register-worksheet-range-theme-style',
  'sheet.mutation.unregister-worksheet-range-theme-style', 'sheet.mutation.data-validation-formula-mark-dirty',
  'sheet.mutation.mark-dirty-filter-change',
]);
const IGNORED_DOC_MUTATIONS = new Set([
  'doc.mutation.set-permission-rule', 'doc.mutation.set-permission-rules', 'docs-formula.mutation.set-last-values',
]);
const IGNORED_SLIDE_OPERATIONS = new Set([
  'slide.operation.activate-slide', 'slide.operation.set-slide-page-thumb', 'slide.operation.edit-arrow',
]);

export function isWorkbookContentMutation(cmd: { id: string; type?: number }): boolean {
  return cmd.type === CommandType.MUTATION && cmd.id.startsWith('sheet.mutation.') && !IGNORED_SHEET_MUTATIONS.has(cmd.id);
}

export function isDocContentMutation(cmd: { id: string; type?: number }): boolean {
  return cmd.type === CommandType.MUTATION && !IGNORED_DOC_MUTATIONS.has(cmd.id) &&
    (cmd.id.startsWith('doc.mutation.') || cmd.id.startsWith('docs.mutation.'));
}

export function isSlideContentMutation(cmd: { id: string; type?: number }): boolean {
  if (cmd.id.startsWith('slide.operation.')) return !IGNORED_SLIDE_OPERATIONS.has(cmd.id);
  return cmd.type === CommandType.MUTATION && cmd.id === 'doc.mutation.rich-text-editing';
}

const DARK_TEXT_COLORS = new Set([
  '#000', '#000000', '#1e1e1e', '#111827', '#1f2937', '#333', '#333333', '#222', '#222222',
  'black', 'rgb(0,0,0)', 'rgb(30,30,30)', 'rgb(17,24,39)', 'rgb(51,51,51)',
]);
const PAGE_BG_COLORS = new Set([
  '#fff', '#ffffff', '#000', '#000000', 'white', 'black', 'rgb(255,255,255)', 'rgb(0,0,0)',
]);

export function remapDocCanvasColor(style: unknown, op: 'text' | 'rect', width = 0, height = 0): unknown {
  if (typeof style !== 'string') return style;
  const norm = style.trim().toLowerCase().replace(/\s+/g, '');
  if (op === 'text') return DARK_TEXT_COLORS.has(norm) ? '#E6EDF3' : style;
  if (width >= 200 && height >= 200 && PAGE_BG_COLORS.has(norm)) return '#161B22';
  if (width <= 6 && height >= 8 && DARK_TEXT_COLORS.has(norm)) return '#E6EDF3';
  return style;
}

function wrapDocCanvas2dContext(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const isDocHost = () => Boolean(canvas.closest?.('[data-testid="orbit-univer-doc-host"], .orbit-univer-doc-host'));
  return new Proxy(ctx, {
    get(target, prop) {
      if (prop === 'fillText' || prop === 'strokeText') {
        return (...args: [string, number, number, number?]) => {
          if (isDocHost()) {
            target.fillStyle = remapDocCanvasColor(target.fillStyle, 'text') as string;
            target.strokeStyle = remapDocCanvasColor(target.strokeStyle, 'text') as string;
          }
          return (Reflect.get(target, prop) as (...a: typeof args) => void).apply(target, args);
        };
      }
      if (prop === 'fillRect') {
        return (x: number, y: number, w: number, h: number) => {
          if (isDocHost()) {
            const prev = target.fillStyle;
            const next = remapDocCanvasColor(prev, 'rect', w, h);
            if (next !== prev) {
              target.fillStyle = next as string;
              target.fillRect(x, y, w, h);
              target.fillStyle = prev;
              return;
            }
          }
          return target.fillRect(x, y, w, h);
        };
      }
      const val = Reflect.get(target, prop);
      return typeof val === 'function' ? val.bind(target) : val;
    },
    set(target, prop, value) { return Reflect.set(target, prop, value); },
  });
}

let domEnvPatched = false;

export function ensureUniverDomEnv(): void {
  if (domEnvPatched || typeof window === 'undefined' || typeof document === 'undefined') return;
  domEnvPatched = true;
  if (typeof globalThis.ResizeObserver === 'undefined') {
    class FallbackResizeObserver { observe(): void {} unobserve(): void {} disconnect(): void {} }
    globalThis.ResizeObserver = FallbackResizeObserver as unknown as typeof ResizeObserver;
  }
  let hasNativeCanvas2d = false;
  if (!/jsdom/i.test(navigator.userAgent ?? '')) {
    try { hasNativeCanvas2d = Boolean(document.createElement('canvas').getContext('2d')); } catch { hasNativeCanvas2d = false; }
  }
  if (typeof HTMLCanvasElement !== 'undefined') {
    const nativeGetContext = HTMLCanvasElement.prototype.getContext;
    if (!hasNativeCanvas2d) {
      window.setTimeout = globalThis.setTimeout;
      window.clearTimeout = globalThis.clearTimeout;
    }
    HTMLCanvasElement.prototype.getContext = function getOrbitContext(this: HTMLCanvasElement, contextId: string, options?: unknown) {
      if (hasNativeCanvas2d && nativeGetContext) {
        const nativeCtx = nativeGetContext.call(this, contextId as '2d', options as CanvasRenderingContext2DSettings);
        return contextId === '2d' && nativeCtx ? wrapDocCanvas2dContext(nativeCtx as CanvasRenderingContext2D, this) : nativeCtx;
      }
      const state: Record<string, unknown> = {
        canvas: this, fillStyle: '#000000', strokeStyle: '#000000', font: '11px Outfit',
        fillText: () => {}, strokeText: () => {}, fillRect: () => {},
        measureText: (text?: string) => ({
          width: (text ?? '').length * 8, actualBoundingBoxAscent: 10, actualBoundingBoxDescent: 2,
          fontBoundingBoxAscent: 12, fontBoundingBoxDescent: 3,
        }),
        getImageData: () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 }),
        createLinearGradient: () => ({ addColorStop: () => {} }),
        createRadialGradient: () => ({ addColorStop: () => {} }),
        createPattern: () => ({}),
        getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
      };
      const stub = new Proxy(state, {
        get(target, prop) { return prop in target ? Reflect.get(target, prop) : () => {}; },
        set(target, prop, value) { return Reflect.set(target, prop, value); },
      }) as unknown as CanvasRenderingContext2D;
      return wrapDocCanvas2dContext(stub, this);
    } as unknown as typeof HTMLCanvasElement.prototype.getContext;
  }
}
