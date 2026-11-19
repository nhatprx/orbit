import type { ReactNode } from 'react';

type BadgeTone = 'neutral' | 'green' | 'warning' | 'danger';

interface BadgeProps {
  tone?: BadgeTone;
  withDot?: boolean;
  children: ReactNode;
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: 'border-[#30363D] bg-[#21262D] text-[#A3A3A3]',
  green: 'border-[#22C55E] bg-[#052E16] text-[#4ADE80]',
  warning: 'border-[#EAB308] bg-[#21262D] text-[#EAB308]',
  danger: 'border-[#EF4444] bg-[#21262D] text-[#EF4444]',
};

const DOT_CLASSES: Record<BadgeTone, string> = {
  neutral: 'bg-[#666666]',
  green: 'bg-[#22C55E]',
  warning: 'bg-[#EAB308]',
  danger: 'bg-[#EF4444]',
};

export function Badge({ tone = 'neutral', withDot = false, children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[11px] uppercase tracking-wider ${TONE_CLASSES[tone]}`}
    >
      {withDot && <span className={`h-1.5 w-1.5 ${DOT_CLASSES[tone]}`} />}
      {children}
    </span>
  );
}
