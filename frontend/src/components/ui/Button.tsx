import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'border-[#22C55E] bg-[#22C55E] text-[#0D1117] hover:bg-[#4ADE80] hover:border-[#4ADE80]',
  secondary:
    'border-[#3B434B] bg-[#21262D] text-[#E6EDF3] hover:border-[#22C55E] hover:text-[#22C55E]',
  ghost:
    'border-transparent bg-transparent text-[#A3A3A3] hover:border-[#30363D] hover:bg-[#21262D] hover:text-[#E6EDF3]',
  danger:
    'border-[#EF4444] bg-[#EF4444] text-[#0D1117] hover:bg-[#0D1117] hover:text-[#EF4444]',
};

export function Button({
  variant = 'secondary',
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 border px-3 py-1.5 text-[13px] font-medium tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
