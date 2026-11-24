import { useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { dismissToast, getToasts, subscribeToasts, type ToastTone } from './toastStore';

const TONE_STYLES: Record<ToastTone, { border: string; accent: string; icon: typeof CheckCircle2 }> = {
  success: { border: 'border-[#1E5631] border-l-[#22C55E]', accent: 'text-[#4ADE80]', icon: CheckCircle2 },
  error: { border: 'border-[#7F1D1D] border-l-[#EF4444]', accent: 'text-[#EF4444]', icon: AlertCircle },
  warning: { border: 'border-[#713F12] border-l-[#EAB308]', accent: 'text-[#FACC15]', icon: AlertTriangle },
  info: { border: 'border-[#30363D] border-l-[#22C55E]', accent: 'text-[#BDBDBD]', icon: Info },
};

export function ToastViewport() {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts, getToasts);
  if (toasts.length === 0) return null;

  const content = (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-[9999] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2"
    >
      {toasts.map((item) => {
        const style = TONE_STYLES[item.tone];
        const Icon = style.icon;
        return (
          <div
            key={item.id}
            role={item.tone === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex items-start gap-2.5 border border-l-2 bg-[#161B22] px-3.5 py-2.5 text-xs text-[#E6EDF3] shadow-2xl ${style.border}`}
          >
            <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${style.accent}`} strokeWidth={1.75} />
            <p className="min-w-0 flex-1 break-words leading-relaxed">{item.message}</p>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => dismissToast(item.id)}
              className="shrink-0 p-0.5 text-[#8A8A8A] transition-colors hover:text-[#E6EDF3]"
            >
              <X className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          </div>
        );
      })}
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
}
