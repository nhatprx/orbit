import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface PasswordInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
  disabled?: boolean;
}

const INPUT_CLASS =
  'w-full rounded-none border border-[#30363D] bg-[#0D1117] py-2 pl-3 pr-10 text-sm text-[#E6EDF3] focus:border-[#22C55E] focus:outline-none disabled:opacity-50';

export function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  required,
  minLength,
  autoComplete,
  disabled = false,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={INPUT_CLASS}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => setVisible((prev) => !prev)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex w-9 items-center justify-center rounded-none text-[#A3A3A3] transition-colors hover:text-[#22C55E] focus:outline-none focus-visible:text-[#22C55E] disabled:opacity-50"
      >
        {visible ? (
          <EyeOff className="h-4 w-4" strokeWidth={1.5} />
        ) : (
          <Eye className="h-4 w-4" strokeWidth={1.5} />
        )}
      </button>
    </div>
  );
}
