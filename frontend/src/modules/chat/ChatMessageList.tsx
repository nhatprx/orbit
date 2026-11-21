import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, CornerUpLeft, ExternalLink, Paperclip, Reply, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import type { ChatMessageDto } from '../../types/workspace.types';
import { formatTime, initialsOf } from '../../utils/format';

interface ChatMessageListProps {
  messages: ChatMessageDto[];
  currentUserId: string | null;
  canManageChannels: boolean;
  canWriteChat?: boolean;
  searchQuery?: string;
  hasOlder: boolean;
  loadingOlder: boolean;
  onLoadOlder: () => void;
  onReply: (message: ChatMessageDto) => void;
  onDeleteMessage: (messageId: string) => Promise<void>;
}

function isSafeAttachmentUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return lower.startsWith('https://') || lower.startsWith('http://') || url.startsWith('/api/');
}

export function ChatMessageList({
  messages,
  currentUserId,
  canManageChannels,
  canWriteChat = true,
  searchQuery = '',
  hasOlder,
  loadingOlder,
  onLoadOlder,
  onReply,
  onDeleteMessage,
}: ChatMessageListProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const visibleMessages = useMemo(() => {
    if (!normalizedQuery) return messages;
    return messages.filter((m) =>
      `${m.content} ${m.senderName} ${m.senderUsername} ${m.attachmentName ?? ''}`.toLowerCase().includes(normalizedQuery)
    );
  }, [messages, normalizedQuery]);

  const lastId = visibleMessages[visibleMessages.length - 1]?.id;

  useLayoutEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lastId]);

  function handleCopy(message: ChatMessageDto) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      void navigator.clipboard.writeText(message.content).catch(() => {});
    }
    setCopiedId(message.id);
    window.setTimeout(() => setCopiedId((prev) => (prev === message.id ? null : prev)), 1500);
  }

  async function handleDelete(messageId: string) {
    setDeletingId(messageId);
    try {
      await onDeleteMessage(messageId);
    } finally {
      setDeletingId((prev) => (prev === messageId ? null : prev));
    }
  }

  return (
    <div ref={scroller} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5" aria-live="polite" aria-label="Messages">
      {hasOlder && !normalizedQuery && (
        <div className="text-center">
          <Button type="button" variant="secondary" disabled={loadingOlder} onClick={onLoadOlder}>
            {loadingOlder ? 'Loading...' : 'Load older messages'}
          </Button>
        </div>
      )}

      {visibleMessages.length === 0 && (
        <p className="py-12 text-center text-sm text-[#8A8A8A]">
          {normalizedQuery ? 'No messages match your search.' : 'No messages yet. Start the conversation below.'}
        </p>
      )}

      {visibleMessages.map((message) => {
        const mine = message.senderId === currentUserId;
        const canDelete = mine || canManageChannels;
        const hasReply = Boolean(message.replyToSenderName || message.replyToSnippet);
        const attachmentUrl = message.attachmentUrl?.trim() || null;

        return (
          <div key={message.id} className="group relative flex items-start gap-3 border border-transparent px-2 py-1.5 hover:border-[#30363D] hover:bg-[#161B22]">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center border font-mono text-xs font-semibold ${mine ? 'border-[#22C55E] bg-[#052E16] text-[#22C55E]' : 'border-[#3B434B] bg-[#161B22] text-[#BDBDBD]'}`}>
              {initialsOf(message.senderName)}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-2 pr-20">
                <span className="text-sm font-semibold text-[#E6EDF3]">{message.senderName}</span>
                <span className="font-mono text-xs text-[#8A8A8A]">@{message.senderUsername}</span>
                <time dateTime={message.createdAt} className="font-mono text-xs text-[#7D8590]">
                  {formatTime(message.createdAt)}
                </time>
              </div>

              {hasReply && (
                <div className="mt-1 flex items-center gap-1.5 border-l-2 border-[#22C55E] bg-[#0D1117] px-2.5 py-1 text-xs text-[#8A8A8A]">
                  <CornerUpLeft className="h-3 w-3 shrink-0 text-[#22C55E]" strokeWidth={1.5} />
                  {message.replyToSenderName && <span className="shrink-0 font-semibold text-[#BDBDBD]">{message.replyToSenderName}:</span>}
                  <span className="truncate">{message.replyToSnippet ?? 'Replied message'}</span>
                </div>
              )}

              <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-[#E6EDF3]">{message.content}</p>

              {attachmentUrl && isSafeAttachmentUrl(attachmentUrl) && (
                <a
                  href={attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex max-w-md items-center gap-2 border border-[#30363D] bg-[#0D1117] px-3 py-1.5 text-xs text-[#E6EDF3] hover:border-[#22C55E] hover:text-[#4ADE80]"
                >
                  <Paperclip className="h-3.5 w-3.5 shrink-0 text-[#22C55E]" strokeWidth={1.5} />
                  <span className="truncate font-mono">{message.attachmentName || attachmentUrl}</span>
                  <ExternalLink className="h-3 w-3 shrink-0 text-[#8A8A8A]" strokeWidth={1.5} />
                </a>
              )}
            </div>

            <div className="absolute right-2 top-1.5 flex items-center gap-0.5 border border-[#30363D] bg-[#21262D] p-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
              <button
                type="button"
                disabled={!canWriteChat}
                aria-label={`Reply to ${message.senderName}`}
                title={canWriteChat ? 'Reply' : 'Read-only access'}
                onClick={() => onReply(message)}
                className="p-1 text-[#BDBDBD] hover:bg-[#161B22] hover:text-[#22C55E] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Reply className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
              <button type="button" aria-label={`Copy message from ${message.senderName}`} title="Copy" onClick={() => handleCopy(message)} className="p-1 text-[#BDBDBD] hover:bg-[#161B22] hover:text-[#E6EDF3]">
                {copiedId === message.id ? <Check className="h-3.5 w-3.5 text-[#22C55E]" strokeWidth={1.5} /> : <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />}
              </button>
              {canDelete && (
                <button type="button" disabled={deletingId === message.id} aria-label={`Delete message from ${message.senderName}`} title="Delete" onClick={() => void handleDelete(message.id)} className="p-1 text-[#BDBDBD] hover:bg-[#161B22] hover:text-[#EF4444] disabled:opacity-40">
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
