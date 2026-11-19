import { useState, type FormEvent } from 'react';
import {
  Archive,
  MailOpen,
  Reply,
  Star,
  Trash2,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import type { MailMessage } from '../../types/mail.types';

interface MailReaderProps {
  message: MailMessage | null;
  sending: boolean;
  onToggleStar: (id: string) => void;
  onMarkUnread: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onReply: (message: MailMessage, body: string) => Promise<void>;
}

const ACTION_BTN =
  'flex h-8 w-8 items-center justify-center border border-[#3B434B] bg-[#161B22] text-[#BDBDBD] transition-colors hover:border-[#22C55E] hover:text-[#E6EDF3]';

export function MailReader({
  message,
  sending,
  onToggleStar,
  onMarkUnread,
  onArchive,
  onDelete,
  onReply,
}: MailReaderProps) {
  const [replyBody, setReplyBody] = useState('');

  if (!message) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[#0D1117] p-8 text-sm text-[#8A8A8A]">
        Select a message to read.
      </div>
    );
  }

  async function handleReplySubmit(event: FormEvent) {
    event.preventDefault();
    if (!message || !replyBody.trim()) return;
    await onReply(message, replyBody);
    setReplyBody('');
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-[#0D1117]">
      <div className="flex items-center justify-between border-b border-[#30363D] bg-[#161B22] px-5 py-3">
        <div className="flex flex-wrap items-center gap-2">
          {message.labels.map((label) => (
            <Badge key={label} tone="green">
              {label}
            </Badge>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            title="Star"
            onClick={() => onToggleStar(message.id)}
            className={ACTION_BTN}
          >
            <Star
              className={`h-4 w-4 ${message.starred ? 'text-[#22C55E]' : ''}`}
              strokeWidth={1.5}
              fill={message.starred ? 'currentColor' : 'none'}
            />
          </button>
          <button
            type="button"
            title="Mark unread"
            onClick={() => onMarkUnread(message.id)}
            className={ACTION_BTN}
          >
            <MailOpen className="h-4 w-4" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            title="Archive"
            onClick={() => onArchive(message.id)}
            className={ACTION_BTN}
          >
            <Archive className="h-4 w-4" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            title="Delete"
            onClick={() => onDelete(message.id)}
            className="flex h-8 w-8 items-center justify-center border border-[#3B434B] bg-[#161B22] text-[#BDBDBD] transition-colors hover:border-[#EF4444] hover:text-[#EF4444]"
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <h1 className="text-xl font-semibold tracking-tight text-[#E6EDF3]">
          {message.subject}
        </h1>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-b border-[#30363D] pb-4 text-sm">
          <div>
            <span className="font-semibold text-[#E6EDF3]">{message.fromName}</span>{' '}
            <span className="font-mono text-xs text-[#8A8A8A]">
              &lt;{message.fromEmail}&gt;
            </span>
            <p className="mt-0.5 font-mono text-xs text-[#8A8A8A]">
              To: {message.toEmail}
            </p>
          </div>
          <span className="font-mono text-xs text-[#8A8A8A]">
            {message.timestamp}
          </span>
        </div>

        <div className="mt-5 whitespace-pre-wrap text-sm leading-relaxed text-[#E6EDF3]">
          {message.body}
        </div>
      </div>

      <form
        onSubmit={handleReplySubmit}
        className="border-t border-[#30363D] bg-[#161B22] p-4"
      >
        <textarea
          rows={3}
          value={replyBody}
          onChange={(e) => setReplyBody(e.target.value)}
          placeholder={`Reply to ${message.fromName}...`}
          className="w-full border border-[#3B434B] bg-[#0D1117] p-3 text-sm text-[#E6EDF3] placeholder-[#8A8A8A] focus:border-[#22C55E] focus:outline-none"
        />
        <div className="mt-2.5 flex justify-end">
          <Button
            type="submit"
            variant="primary"
            disabled={sending || !replyBody.trim()}
          >
            <Reply className="h-4 w-4" strokeWidth={1.5} />
            {sending ? 'Sending...' : 'Send Reply'}
          </Button>
        </div>
      </form>
    </div>
  );
}
