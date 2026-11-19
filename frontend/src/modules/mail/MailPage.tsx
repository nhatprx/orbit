import { useCallback, useEffect, useState } from 'react';
import { mailService } from '../../services/mail.service';
import type { AuthUser } from '../../types/auth.types';
import type {
  ComposeMailPayload,
  MailFolder,
  MailMessage,
} from '../../types/mail.types';
import { MailComposeModal } from './MailComposeModal';
import { MailFolderNav } from './MailFolderNav';
import { MailList } from './MailList';
import { MailReader } from './MailReader';

interface MailPageProps {
  user: AuthUser;
}

const EMPTY_COUNTS: Record<MailFolder, number> = {
  inbox: 0,
  starred: 0,
  sent: 0,
  drafts: 0,
  archive: 0,
  trash: 0,
};

export function MailPage({ user }: MailPageProps) {
  const [folder, setFolder] = useState<MailFolder>('inbox');
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<MailMessage[]>([]);
  const [counts, setCounts] = useState<Record<MailFolder, number>>(EMPTY_COUNTS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const refresh = useCallback(async () => {
    const [items, nextCounts] = await Promise.all([
      mailService.listMessages(folder, query, 25),
      mailService.getUnreadCounts(),
    ]);
    setMessages(items);
    setCounts(nextCounts);
    setSelectedId((prev) =>
      items.some((m) => m.id === prev) ? prev : (items[0]?.id ?? null)
    );
  }, [folder, query]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selectedMessage =
    messages.find((m) => m.id === selectedId) ?? null;

  async function handleSelect(message: MailMessage) {
    setSelectedId(message.id);
    if (message.unread) {
      await mailService.setUnread(message.id, false);
      await refresh();
    }
  }

  async function handleToggleStar(id: string) {
    await mailService.toggleStar(id);
    await refresh();
  }

  async function handleMarkUnread(id: string) {
    await mailService.setUnread(id, true);
    await refresh();
  }

  async function handleMove(id: string, target: 'archive' | 'trash') {
    await mailService.moveToFolder(id, target);
    await refresh();
  }

  async function handleSend(payload: ComposeMailPayload) {
    setSending(true);
    try {
      await mailService.sendMail(payload, user);
      await refresh();
    } finally {
      setSending(false);
    }
  }

  async function handleReply(parent: MailMessage, body: string) {
    await handleSend({
      toEmail: parent.fromEmail,
      subject: parent.subject.startsWith('Re:')
        ? parent.subject
        : `Re: ${parent.subject}`,
      body,
    });
  }

  return (
    <div className="flex h-[calc(100vh-3rem)] w-full overflow-hidden border border-[#30363D] bg-[#0D1117]">
      <MailFolderNav
        activeFolder={folder}
        counts={counts}
        onSelectFolder={setFolder}
        onOpenCompose={() => setComposeOpen(true)}
      />

      <MailList
        folder={folder}
        messages={messages}
        selectedId={selectedId}
        query={query}
        onQueryChange={setQuery}
        onSelect={handleSelect}
        onToggleStar={handleToggleStar}
      />

      <MailReader
        message={selectedMessage}
        sending={sending}
        onToggleStar={handleToggleStar}
        onMarkUnread={handleMarkUnread}
        onArchive={(id) => void handleMove(id, 'archive')}
        onDelete={(id) => void handleMove(id, 'trash')}
        onReply={handleReply}
      />

      <MailComposeModal
        open={composeOpen}
        sending={sending}
        onClose={() => setComposeOpen(false)}
        onSend={handleSend}
      />
    </div>
  );
}
