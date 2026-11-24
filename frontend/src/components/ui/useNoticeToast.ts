import { useEffect } from 'react';
import { pushToast, type ToastTone } from './toastStore';

/** Emits a global toast whenever a transient message becomes non-empty, then optionally clears local state. */
export function useNoticeToast(
  message: string | null | undefined,
  tone: ToastTone = 'success',
  onClear?: () => void,
) {
  useEffect(() => {
    if (!message) return;
    pushToast(message, tone);
    onClear?.();
  }, [message, onClear, tone]);
}
