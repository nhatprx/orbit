export type ToastTone = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  tone: ToastTone;
  createdAt: number;
}

type Listener = () => void;

const MAX_TOASTS = 5;
const DEDUPE_MS = 1500;

let items: ToastItem[] = [];
let seq = 0;
const listeners = new Set<Listener>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();

function emit() {
  for (const fn of listeners) fn();
}

export function getToasts(): ToastItem[] {
  return items;
}

export function subscribeToasts(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function dismissToast(id: string): void {
  const timer = timers.get(id);
  if (timer) {
    clearTimeout(timer);
    timers.delete(id);
  }
  const next = items.filter((t) => t.id !== id);
  if (next.length !== items.length) {
    items = next;
    emit();
  }
}

export function clearToasts(): void {
  for (const timer of timers.values()) clearTimeout(timer);
  timers.clear();
  if (items.length > 0) {
    items = [];
    emit();
  }
}

export function pushToast(message: string, tone: ToastTone = 'info', durationMs?: number): string {
  const clean = message.trim();
  if (!clean) return '';
  const now = Date.now();
  const dup = items.find((t) => t.tone === tone && t.message === clean && now - t.createdAt < DEDUPE_MS);
  if (dup) return dup.id;

  const id = `toast-${++seq}-${now}`;
  const ttl = durationMs ?? (tone === 'error' || tone === 'warning' ? 5500 : 4000);
  items = [...items.slice(-(MAX_TOASTS - 1)), { id, message: clean, tone, createdAt: now }];
  emit();

  if (ttl > 0) {
    const timer = setTimeout(() => dismissToast(id), ttl);
    timers.set(id, timer);
  }
  return id;
}

export const toast = {
  success: (message: string, durationMs?: number) => pushToast(message, 'success', durationMs),
  error: (message: string, durationMs?: number) => pushToast(message, 'error', durationMs),
  warning: (message: string, durationMs?: number) => pushToast(message, 'warning', durationMs),
  info: (message: string, durationMs?: number) => pushToast(message, 'info', durationMs),
  dismiss: dismissToast,
  clear: clearToasts,
};
