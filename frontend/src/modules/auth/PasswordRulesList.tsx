import type { PasswordRuleStatus } from './passwordPolicy';

interface PasswordRulesListProps {
  rules: PasswordRuleStatus[];
}

export function PasswordRulesList({ rules }: PasswordRulesListProps) {
  return (
    <div className="mt-2 space-y-1 rounded-none border border-[#30363D] bg-[#0D1117] p-2.5">
      {rules.map((rule) => (
        <div key={rule.key} className="flex items-center gap-2 text-[11px]">
          <span
            className={`h-1.5 w-1.5 rounded-none ${
              rule.passed ? 'bg-[#22C55E]' : 'bg-[#3B434B]'
            }`}
          />
          <span className={rule.passed ? 'text-[#22C55E]' : 'text-[#8A8A8A]'}>
            {rule.label}
          </span>
        </div>
      ))}
    </div>
  );
}
