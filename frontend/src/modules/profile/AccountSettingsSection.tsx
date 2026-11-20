import { Link2, Shield } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { CollapsibleCard } from '../../components/ui/CollapsibleCard';
import { ErrorView, LoadingView } from '../../components/ui/StateViews';
import { useResource } from '../../hooks/useResource';
import { accountSecurityService } from '../../services/accountSecurity.service';
import { SocialAccountsPanel } from '../integrations/SocialAccountsPanel';
import { PasswordSettingsPanel } from './PasswordSettingsPanel';
import { TwoFactorSettingsPanel } from './TwoFactorSettingsPanel';

export function AccountSettingsSection() {
  const security = useResource(() => accountSecurityService.getSecurityStatus(), []);

  if (security.loading && !security.data) {
    return <LoadingView label="Loading account settings..." />;
  }
  if (security.error || !security.data) {
    return <ErrorView message={security.error ?? 'Unable to load account settings.'} onRetry={security.reload} />;
  }

  const status = security.data;
  const linkedCount = status.linkedProviders.length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-px border border-[#30363D] bg-[#30363D] sm:grid-cols-2">
        <div className="bg-[#161B22] p-4">
          <div className="flex items-center justify-between text-[#7D8590]">
            <span className="text-[11px] uppercase tracking-wider">Security</span>
            <Shield className="h-3.5 w-3.5 text-[#22C55E]" strokeWidth={1.5} />
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge tone={status.hasPassword ? 'green' : 'neutral'} withDot>
              {status.hasPassword ? 'Password set' : 'No password'}
            </Badge>
            <Badge tone={status.totpEnabled ? 'green' : 'neutral'} withDot>
              {status.totpEnabled ? '2FA enabled' : '2FA disabled'}
            </Badge>
          </div>
        </div>

        <div className="bg-[#161B22] p-4">
          <div className="flex items-center justify-between text-[#7D8590]">
            <span className="text-[11px] uppercase tracking-wider">Connected accounts</span>
            <Link2 className="h-3.5 w-3.5 text-[#22C55E]" strokeWidth={1.5} />
          </div>
          <p className="mt-2 font-mono text-xs text-[#E6EDF3]">
            {linkedCount > 0 ? status.linkedProviders.join(', ') : 'None linked'}
          </p>
        </div>
      </div>

      <div className="space-y-2.5">
        <h2 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#8B949E]">
          Security
        </h2>
        <div className="space-y-3">
          <PasswordSettingsPanel hasPassword={status.hasPassword} onUpdated={security.reload} />
          <TwoFactorSettingsPanel
            hasPassword={status.hasPassword}
            totpEnabled={status.totpEnabled}
            backupCodesRemaining={status.backupCodesRemaining}
            onUpdated={security.reload}
          />
        </div>
      </div>

      <div className="space-y-2.5">
        <h2 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#8B949E]">
          Integrations
        </h2>
        <CollapsibleCard
          title="Connected accounts"
          description="Link Google or GitHub to sign in to this Orbit account."
          icon={<Link2 className="h-4 w-4" strokeWidth={1.5} />}
          badge={
            <Badge tone={linkedCount > 0 ? 'green' : 'neutral'} withDot>
              {linkedCount > 0 ? `${linkedCount} linked` : 'Not linked'}
            </Badge>
          }
          defaultOpen={false}
        >
          <SocialAccountsPanel />
        </CollapsibleCard>
      </div>
    </div>
  );
}
