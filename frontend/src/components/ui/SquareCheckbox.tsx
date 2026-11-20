interface SquareCheckboxProps {
  checked: boolean;
  label: string;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}

/** Native checkboxes round their corners in some browsers; this keeps the 0px radius rule. */
export function SquareCheckbox({ checked, label, disabled = false, onChange }: SquareCheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`flex h-4 w-4 items-center justify-center border transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        checked ? 'border-[#22C55E] bg-[#052E16]' : 'border-[#3B434B] bg-[#0D1117] hover:border-[#22C55E]'
      }`}
    >
      {checked && <span className="h-2 w-2 bg-[#22C55E]" />}
    </button>
  );
}
