import { Shield, User } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import type { UserRole } from '../../types/auth.types';

interface AuthDemoBarProps {
  loading: boolean;
  onSelectRole: (role: UserRole) => void;
}

export function AuthDemoBar({ loading, onSelectRole }: AuthDemoBarProps) {
  return (
    <div className="mt-6 border-t border-[#1F1F1F] pt-5">
      <p className="mb-3 font-mono text-[11px] uppercase tracking-wider text-[#666666]">
        Instant Role Preview (Phase 1 Mock)
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={loading}
          onClick={() => onSelectRole('user')}
        >
          <User className="h-3.5 w-3.5 text-[#22C55E]" strokeWidth={1.5} />
          Enter as User
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={loading}
          onClick={() => onSelectRole('admin')}
        >
          <Shield className="h-3.5 w-3.5 text-[#22C55E]" strokeWidth={1.5} />
          Enter as Admin
        </Button>
      </div>
    </div>
  );
}
