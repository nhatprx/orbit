import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'border-[#22C55E] bg-[#22C55E] text-[#050505] hover:bg-[#4ADE80] hover:border-[#4ADE80]',
  secondary:
    'border-[#2E2E2E] bg-[#111111] text-[#F5F5F5] hover:border-[#22C55E] hover:text-[#22C55E]',
  ghost:
    'border-transparent bg-transparent text-[#A3A3A3] hover:border-[#1F1F1F] hover:bg-[#111111] hover:text-[#F5F5F5]',
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
      className={`inline-flex items-center justify-center gap-2 border px-3.5 py-2 text-xs font-medium tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
