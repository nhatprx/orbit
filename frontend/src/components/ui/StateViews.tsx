import type { ReactNode } from 'react';
import { Button } from './Button';

export function LoadingView({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 p-5 text-xs text-[#8B949E]" role="status">
      <span className="h-1.5 w-1.5 animate-pulse bg-[#22C55E]" />
      {label}
    </div>
  );
}

export function ErrorView({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border border-[#EF4444] bg-[#161B22] p-4">
      <div className="flex items-center gap-2 text-[13px] text-[#EF4444]" role="alert">
        <span className="h-1.5 w-1.5 bg-[#EF4444]" />
        {message}
      </div>
      {onRetry && (
        <Button type="button" variant="secondary" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}

interface EmptyViewProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyView({ title, description, action }: EmptyViewProps) {
  return (
    <div className="flex flex-col items-center gap-2 border border-dashed border-[#30363D] p-8 text-center">
      <h3 className="text-sm font-semibold text-[#E6EDF3]">{title}</h3>
      {description && <p className="max-w-md text-xs text-[#8B949E]">{description}</p>}
      {action}
    </div>
  );
}
