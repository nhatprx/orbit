import { useCallback, useEffect, useRef } from 'react';

export function useTypingSignal(onTyping?: (active: boolean) => void) {
  const timer = useRef<number | null>(null);
  const active = useRef(false);

  const update = useCallback((value: string) => {
    if (!onTyping) return;
    if (value.trim() && !active.current) {
      active.current = true;
      onTyping(true);
    }
    if (timer.current !== null) window.clearTimeout(timer.current);
    if (value.trim()) {
      timer.current = window.setTimeout(() => {
        active.current = false;
        onTyping(false);
      }, 2500);
    } else if (active.current) {
      active.current = false;
      onTyping(false);
    }
  }, [onTyping]);

  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    if (active.current) onTyping?.(false);
  }, [onTyping]);

  return update;
}
