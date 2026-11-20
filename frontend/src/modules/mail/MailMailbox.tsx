import { useState } from 'react';
import { useResource } from '../../hooks/useResource';
import { mailService } from '../../services/workspace/services';
import type { MailAccountDto, MailMessageDetailDto, MailMessageSummaryDto } from '../../types/workspace.types';
import { ErrorView, LoadingView } from '../../components/ui/StateViews';
import { MailAccountBar } from './MailAccountBar';
import { MailComposeModal } from './MailComposeModal';
import { MailFolderNav, type MailFolder } from './MailFolderNav';
import { MailList } from './MailList';
import { MailReader } from './MailReader';
import { EMPTY_DRAFT, buildForward, buildReply, type ComposeDraft, type ComposeMode } from './mailCompose';

interface MailMailboxProps {
  account: MailAccountDto;
  accounts: MailAccountDto[];
  onSelectAccount: (accountId: string) => void;
  onAddAccount: () => void;
  onDisconnect: (account: MailAccountDto) => Promise<void>;
}

interface ComposeState {
  mode: ComposeMode;
  draft: ComposeDraft;
}

/** Three-pane mailbox (folders, list, reader) for one connected account. */
export function MailMailbox({ account, accounts, onSelectAccount, onAddAccount, onDisconnect }: MailMailboxProps) {
  const [folder, setFolder] = useState<MailFolder>('inbox');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [compose, setCompose] = useState<ComposeState | null>(null);

  const list = useResource(() => mailService.listMessages(account.id, folder), [account.id, folder]);
  const inbox = useResource(() => mailService.listMessages(account.id, 'inbox'), [account.id]);
  const detail = useResource<MailMessageDetailDto | null>(
    () => (selectedId ? mailService.getMessage(account.id, selectedId) : Promise.resolve(null)),
    [account.id, selectedId]
  );

  function changeFolder(next: MailFolder) {
    setFolder(next);
    setSelectedId(null);
  }

  async function open(message: MailMessageSummaryDto) {
    setSelectedId(message.id);
    if (!message.read) {
      await mailService.markRead(account.id, message.id, true);
      list.reload();
      inbox.reload();
    }
  }

  async function send(draft: ComposeDraft) {
    await mailService.sendMessage({
      accountId: account.id,
      toEmail: draft.toEmail,
      subject: draft.subject,
      body: draft.body,
      ...(draft.inReplyToId ? { inReplyToId: draft.inReplyToId } : {}),
    });
    if (folder === 'sent') list.reload();
  }

  const unread = (inbox.data ?? []).filter((m) => !m.read).length;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden border border-[#30363D] bg-[#0D1117]">
      <MailAccountBar
        accounts={accounts}
        activeId={account.id}
        onSelect={(id) => {
          setSelectedId(null);
          onSelectAccount(id);
        }}
        onAdd={onAddAccount}
        onDisconnect={onDisconnect}
      />
      <div className="flex min-h-0 flex-1">
        <MailFolderNav
          activeFolder={folder}
          unreadInbox={unread}
          onSelectFolder={changeFolder}
          onCompose={() => setCompose({ mode: 'new', draft: EMPTY_DRAFT })}
        />
        {list.error ? (
          <div className="w-80 shrink-0 border-r border-[#30363D] p-3">
            <ErrorView message={list.error} onRetry={list.reload} />
          </div>
        ) : list.loading && !list.data ? (
          <div className="w-80 shrink-0 border-r border-[#30363D]">
            <LoadingView label="Loading messages..." />
          </div>
        ) : (
          <MailList
            folder={folder}
            messages={list.data ?? []}
            selectedId={selectedId}
            query={query}
            onQueryChange={setQuery}
            onSelect={(m) => void open(m)}
          />
        )}
        <MailReader
          message={detail.data}
          loading={detail.loading && selectedId !== null}
          error={detail.error}
          onReply={(m) => setCompose({ mode: 'reply', draft: buildReply(m, account) })}
          onForward={(m) => setCompose({ mode: 'forward', draft: buildForward(m) })}
        />
      </div>

      {compose && (
        <MailComposeModal
          mode={compose.mode}
          fromEmail={account.email}
          initial={compose.draft}
          onSend={send}
          onClose={() => setCompose(null)}
        />
      )}
    </div>
  );
}
