import { CommandType, greenTheme, type Theme } from '@univerjs/presets';

export const orbitUniverTheme: Theme = {
  ...greenTheme,
  primary: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBF7D0',
    300: '#86EFAC',
    400: '#4ADE80',
    500: '#22C55E',
    600: '#22C55E',
    700: '#16A34A',
    800: '#15803D',
    900: '#052E16',
  },
  gray: {
    0: '#FFFFFF',
    50: '#E6EDF3',
    100: '#C9D1D9',
    200: '#8B949E',
    300: '#6E7681',
    400: '#484F58',
    500: '#30363D',
    600: '#21262D',
    700: '#161B22',
    800: '#161B22',
    900: '#0D1117',
    1000: '#0D1117',
  },
};

const IGNORED_MUTATIONS = new Set([
  'sheet.mutation.set-worksheet-row-auto-height',
  'sheet.mutation.set-worksheet-row-is-auto-height',
  'sheet.mutation.set-worksheet-permission-points',
  'sheet.mutation.register-worksheet-range-theme-style',
  'sheet.mutation.unregister-worksheet-range-theme-style',
  'sheet.mutation.data-validation-formula-mark-dirty',
  'sheet.mutation.mark-dirty-filter-change',
]);

export function isWorkbookContentMutation(cmd: { id: string; type?: number }): boolean {
  if (cmd.type !== CommandType.MUTATION) return false;
  if (!cmd.id.startsWith('sheet.mutation.')) return false;
  return !IGNORED_MUTATIONS.has(cmd.id);
}

let domEnvPatched = false;

export function ensureUniverDomEnv(): void {
  if (domEnvPatched || typeof window === 'undefined' || typeof document === 'undefined') return;
  domEnvPatched = true;

  if (typeof globalThis.ResizeObserver === 'undefined') {
    class FallbackResizeObserver {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    }
    globalThis.ResizeObserver = FallbackResizeObserver as unknown as typeof ResizeObserver;
  }

  let hasNativeCanvas2d = false;
  if (!/jsdom/i.test(navigator.userAgent ?? '')) {
    try {
      const probe = document.createElement('canvas');
      hasNativeCanvas2d = Boolean(probe.getContext('2d'));
    } catch {
      hasNativeCanvas2d = false;
    }
  }

  if (!hasNativeCanvas2d && typeof HTMLCanvasElement !== 'undefined') {
    window.setTimeout = globalThis.setTimeout;
    window.clearTimeout = globalThis.clearTimeout;
    HTMLCanvasElement.prototype.getContext = function getStubContext(this: HTMLCanvasElement) {
      const base = {
        canvas: this,
        measureText: (text?: string) => ({
          width: (text ?? '').length * 8,
          actualBoundingBoxAscent: 10,
          actualBoundingBoxDescent: 2,
          fontBoundingBoxAscent: 12,
          fontBoundingBoxDescent: 3,
        }),
        getImageData: () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 }),
        createLinearGradient: () => ({ addColorStop: () => {} }),
        createRadialGradient: () => ({ addColorStop: () => {} }),
        createPattern: () => ({}),
        getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
      };
      return new Proxy(base, {
        get(target, prop) {
          if (prop in target) return Reflect.get(target, prop);
          return () => {};
        },
      }) as unknown as CanvasRenderingContext2D;
    } as unknown as typeof HTMLCanvasElement.prototype.getContext;
  }
}
