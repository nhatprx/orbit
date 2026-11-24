import { useEffect, useState } from 'react';
import { Github, Globe, Link2, Unlink } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ErrorView, LoadingView } from '../../components/ui/StateViews';
import { toast } from '../../components/ui/toastStore';
import { useNoticeToast } from '../../components/ui/useNoticeToast';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { useResource } from '../../hooks/useResource';
import { SOCIAL_PROVIDERS } from '../../mocks/linkedAccount.mock';
import { subscribeOAuthLinkResult } from '../../services/workspace/oauthPopup';
import { linkedAccountService } from '../../services/workspace/services';
import type { SocialProvider } from '../../types/workspace.types';
import { formatDate } from '../../utils/format';

const PROVIDER_ICON = { google: Globe, github: Github } as const;

export function SocialAccountsPanel() {
  const accounts = useResource(() => linkedAccountService.listLinkedAccounts(), []);
  const [activeProvider, setActiveProvider] = useState<SocialProvider | null>(null);

  useEffect(() => {
    return subscribeOAuthLinkResult((result) => {
      setActiveProvider(null);
      if (result.error) {
        toast.error(result.error);
      } else if (result.provider) {
        const label = result.provider.charAt(0).toUpperCase() + result.provider.slice(1);
        toast.success(`Connected ${label} account successfully.`);
      }
      accounts.reload();
    });
  }, [accounts.reload]);

  const connect = useAsyncAction(async (provider: SocialProvider) => {
    setActiveProvider(provider);
    try {
      await linkedAccountService.connectProvider(provider);
      accounts.reload();
    } finally {
      setActiveProvider(null);
    }
  });

  const disconnect = useAsyncAction(async (accountId: string) => {
    await linkedAccountService.disconnectAccount(accountId);
    toast.success('Disconnected linked account.');
    accounts.reload();
  });

  const actionError = connect.error ?? disconnect.error;
  useNoticeToast(actionError, 'error');

  if (accounts.loading && !accounts.data) return <LoadingView label="Loading connected accounts..." />;
  if (accounts.error) return <ErrorView message={accounts.error} onRetry={accounts.reload} />;

  const linked = accounts.data ?? [];
  const busy = connect.pending || disconnect.pending;

  return (
    <div className="space-y-3">
      <div className="divide-y divide-[#30363D] border border-[#30363D]">
        {SOCIAL_PROVIDERS.map((provider) => {
          const Icon = PROVIDER_ICON[provider.id];
          const account = linked.find((a) => a.provider === provider.id);
          const isConnecting = connect.pending && activeProvider === provider.id;
          return (
            <div key={provider.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <Icon className="h-4 w-4 shrink-0 text-[#8B949E]" strokeWidth={1.5} />
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-[#E6EDF3]">{provider.label}</p>
                  <p className="truncate text-xs text-[#8B949E]">
                    {account
                      ? `${account.providerEmail} - connected ${formatDate(account.connectedAt)}`
                      : provider.summary}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {account && <Badge tone="green" withDot>Connected</Badge>}
                {account ? (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => void disconnect.run(account.id)}
                  >
                    <Unlink className="h-3.5 w-3.5" strokeWidth={1.5} />
                    Disconnect
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="primary"
                    disabled={busy}
                    onClick={() => void connect.run(provider.id)}
                  >
                    <Link2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                    {isConnecting ? 'Waiting for popup...' : 'Connect'}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-[#7D8590]">
        Connected Google and GitHub accounts sign in to this same Orbit account alongside your username and email.
      </p>
    </div>
  );
}
