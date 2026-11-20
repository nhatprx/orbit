import { Shield } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Panel } from '../../components/ui/Panel';
import { ErrorView, LoadingView } from '../../components/ui/StateViews';
import { useResource } from '../../hooks/useResource';
import { accountSecurityService } from '../../services/accountSecurity.service';
import type { AuthUser } from '../../types/auth.types';
import { PasswordSettingsPanel } from './PasswordSettingsPanel';
import { TwoFactorSettingsPanel } from './TwoFactorSettingsPanel';
import { UsernameSettingsPanel } from './UsernameSettingsPanel';

interface AccountSettingsSectionProps {
  onUserUpdated?: (user: AuthUser) => void;
}

export function AccountSettingsSection({ onUserUpdated }: AccountSettingsSectionProps) {
  const security = useResource(() => accountSecurityService.getSecurityStatus(), []);

  if (security.loading && !security.data) {
    return <LoadingView label="Loading account settings..." />;
  }
  if (security.error || !security.data) {
    return <ErrorView message={security.error ?? 'Unable to load account settings.'} onRetry={security.reload} />;
  }

  const status = security.data;

  return (
    <div className="space-y-5">
      <Panel
        title="Account security overview"
        description="Manage your handle, sign-in credentials, and two-factor authentication for your Orbit account."
        actions={<Shield className="h-4 w-4 text-[#22C55E]" strokeWidth={1.5} />}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="border border-[#30363D] bg-[#0D1117] p-3">
            <p className="text-[11px] uppercase tracking-wider text-[#7D8590]">Password</p>
            <div className="mt-1.5">
              <Badge tone={status.hasPassword ? 'green' : 'neutral'} withDot>
                {status.hasPassword ? 'Configured' : 'Not set'}
              </Badge>
            </div>
          </div>
          <div className="border border-[#30363D] bg-[#0D1117] p-3">
            <p className="text-[11px] uppercase tracking-wider text-[#7D8590]">Two-factor auth</p>
            <div className="mt-1.5">
              <Badge tone={status.totpEnabled ? 'green' : 'neutral'} withDot>
                {status.totpEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
          </div>
          <div className="border border-[#30363D] bg-[#0D1117] p-3">
            <p className="text-[11px] uppercase tracking-wider text-[#7D8590]">OAuth providers</p>
            <p className="mt-1.5 font-mono text-xs text-[#E6EDF3]">
              {status.linkedProviders.length > 0 ? status.linkedProviders.join(', ') : 'None linked'}
            </p>
          </div>
        </div>
      </Panel>

      <UsernameSettingsPanel
        currentUsername={status.username}
        onUpdated={(updated) => {
          onUserUpdated?.(updated);
          security.reload();
        }}
      />

      <PasswordSettingsPanel hasPassword={status.hasPassword} onUpdated={security.reload} />

      <TwoFactorSettingsPanel
        hasPassword={status.hasPassword}
        totpEnabled={status.totpEnabled}
        backupCodesRemaining={status.backupCodesRemaining}
        onUpdated={security.reload}
      />
    </div>
  );
}
