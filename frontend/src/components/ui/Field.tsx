import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';

export const CONTROL_CLASS =
  'w-full border border-[#3B434B] bg-[#0D1117] px-3 py-2 text-sm text-[#E6EDF3] placeholder-[#8A8A8A] focus:border-[#22C55E] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50';

interface FieldFrameProps {
  id: string;
  label: string;
  error?: string | null;
  hint?: string;
  children: ReactNode;
}

function FieldFrame({ id, label, error, hint, children }: FieldFrameProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs text-[#BDBDBD]">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="mt-1 text-xs text-[#EF4444]">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1 text-xs text-[#8A8A8A]">{hint}</p>
      )}
    </div>
  );
}

interface CommonProps {
  label: string;
  error?: string | null;
  hint?: string;
}

export function TextField({
  label,
  error,
  hint,
  className = '',
  ...input
}: CommonProps & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <FieldFrame id={id} label={label} error={error} hint={hint}>
      <input id={id} {...input} className={`${CONTROL_CLASS} ${className}`} />
    </FieldFrame>
  );
}

export function TextAreaField({
  label,
  error,
  hint,
  className = '',
  ...input
}: CommonProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <FieldFrame id={id} label={label} error={error} hint={hint}>
      <textarea id={id} {...input} className={`${CONTROL_CLASS} ${className}`} />
    </FieldFrame>
  );
}

export function SelectField({
  label,
  error,
  hint,
  className = '',
  children,
  ...input
}: CommonProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <FieldFrame id={id} label={label} error={error} hint={hint}>
      <select id={id} {...input} className={`${CONTROL_CLASS} ${className}`}>
        {children}
      </select>
    </FieldFrame>
  );
}
