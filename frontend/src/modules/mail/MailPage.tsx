import { useState } from 'react';
import { ErrorView, LoadingView } from '../../components/ui/StateViews';
import { Modal } from '../../components/ui/Modal';
import { useResource } from '../../hooks/useResource';
import { mailService } from '../../services/workspace/services';
import type { MailAccountDto } from '../../types/workspace.types';
import { MailConnectView } from './MailConnectView';
import { MailMailbox } from './MailMailbox';

/**
 * Global Mails module (D-06): reached from the Header Bar, independent of any Workspace or Project.
 * With no connected account it shows the connect flow; otherwise the mailbox.
 */
export function MailPage() {
  const accounts = useResource(() => mailService.listAccounts(), []);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  if (accounts.loading && !accounts.data) return <LoadingView label="Loading mail accounts..." />;
  if (accounts.error) return <div className="p-4"><ErrorView message={accounts.error} onRetry={accounts.reload} /></div>;

  const list = accounts.data ?? [];
  const connected = (account: MailAccountDto) => {
    setActiveId(account.id);
    setAdding(false);
    accounts.reload();
  };

  if (list.length === 0) {
    return (
      <div className="h-[calc(100vh-3rem)] overflow-y-auto">
        <MailConnectView intro onConnected={connected} />
      </div>
    );
  }

  const active = list.find((a) => a.id === activeId) ?? list[0];
  if (!active) return null;

  return (
    <div className="h-[calc(100vh-3rem)] w-full">
      <MailMailbox
        key={active.id}
        account={active}
        accounts={list}
        onSelectAccount={setActiveId}
        onAddAccount={() => setAdding(true)}
        onDisconnect={async (account) => {
          await mailService.disconnectAccount(account.id);
          setActiveId(null);
          accounts.reload();
        }}
      />
      <Modal open={adding} title="Add mail account" size="lg" onClose={() => setAdding(false)}>
        {adding && <MailConnectView onConnected={connected} onCancel={() => setAdding(false)} />}
      </Modal>
    </div>
  );
}
