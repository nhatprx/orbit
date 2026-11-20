import { useState } from 'react';
import { Plus, Unplug } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { CONTROL_CLASS } from '../../components/ui/Field';
import type { MailAccountDto } from '../../types/workspace.types';

interface MailAccountBarProps {
  accounts: MailAccountDto[];
  activeId: string;
  onSelect: (accountId: string) => void;
  onAdd: () => void;
  onDisconnect: (account: MailAccountDto) => Promise<void>;
}

const PROVIDER_LABEL = { gmail: 'Gmail', outlook: 'Outlook', imap: 'IMAP' } as const;

export function MailAccountBar({ accounts, activeId, onSelect, onAdd, onDisconnect }: MailAccountBarProps) {
  const [disconnecting, setDisconnecting] = useState(false);
  const active = accounts.find((a) => a.id === activeId);

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-[#30363D] bg-[#161B22] px-3 py-2">
      <select
        aria-label="Mail account"
        value={activeId}
        onChange={(e) => onSelect(e.target.value)}
        className={`${CONTROL_CLASS} w-auto min-w-56 py-1 text-[13px]`}
      >
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {account.email}
          </option>
        ))}
      </select>
      {active && <Badge tone={active.status === 'CONNECTED' ? 'green' : 'danger'} withDot>{PROVIDER_LABEL[active.provider]}</Badge>}
      <div className="ml-auto flex gap-2">
        <Button type="button" variant="secondary" onClick={onAdd}>
          <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
          Add account
        </Button>
        {active && (
          <Button type="button" variant="ghost" onClick={() => setDisconnecting(true)}>
            <Unplug className="h-3.5 w-3.5" strokeWidth={1.5} />
            Disconnect
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={disconnecting}
        danger
        title="Disconnect account"
        message={`Disconnect ${active?.email ?? 'this account'}? Orbit deletes the cached message list and any stored credentials. Your mailbox itself is not changed.`}
        confirmLabel="Disconnect"
        onConfirm={async () => {
          if (active) await onDisconnect(active);
        }}
        onClose={() => setDisconnecting(false)}
      />
    </div>
  );
}
