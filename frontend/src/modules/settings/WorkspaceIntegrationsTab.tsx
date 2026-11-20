import { Panel } from '../../components/ui/Panel';
import { SocialAccountsPanel } from '../integrations/SocialAccountsPanel';

export function WorkspaceIntegrationsTab() {
  return (
    <Panel
      title="Connected accounts"
      description="Social accounts linked to your user for sign-in. They follow you across every workspace."
    >
      <SocialAccountsPanel />
    </Panel>
  );
}
