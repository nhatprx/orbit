import { Forward, Mail, Reply } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { ErrorView, LoadingView } from '../../components/ui/StateViews';
import type { MailMessageDetailDto } from '../../types/workspace.types';
import { formatDate, formatTime } from '../../utils/format';

interface MailReaderProps {
  message: MailMessageDetailDto | null;
  loading: boolean;
  error: string | null;
  onReply: (message: MailMessageDetailDto) => void;
  onForward: (message: MailMessageDetailDto) => void;
}

/** Renders the body as plain text so remote mail can never inject markup into Orbit. */
export function MailReader({ message, loading, error, onReply, onForward }: MailReaderProps) {
  if (loading) return <div className="flex-1 bg-[#0D1117]"><LoadingView label="Opening message..." /></div>;
  if (error) return <div className="flex-1 bg-[#0D1117] p-4"><ErrorView message={error} /></div>;
  if (!message) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 bg-[#0D1117] text-[#7D8590]">
        <Mail className="h-6 w-6" strokeWidth={1.5} />
        <p className="text-xs">Select a message to read it.</p>
      </div>
    );
  }

  return (
    <article className="flex min-w-0 flex-1 flex-col bg-[#0D1117]">
      <header className="border-b border-[#30363D] bg-[#161B22] px-5 py-4">
        <h2 className="break-words text-base font-semibold text-[#E6EDF3]">{message.subject}</h2>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[#8B949E]">
          <p>
            <span className="text-[#E6EDF3]">{message.senderName || message.senderEmail}</span>{' '}
            <span className="font-mono">&lt;{message.senderEmail}&gt;</span> to{' '}
            <span className="font-mono">{message.recipientEmail}</span>
          </p>
          <time dateTime={message.receivedAt} className="font-mono">
            {formatDate(message.receivedAt)} {formatTime(message.receivedAt)}
          </time>
        </div>
        <div className="mt-3 flex gap-2">
          <Button type="button" variant="secondary" onClick={() => onReply(message)}>
            <Reply className="h-3.5 w-3.5" strokeWidth={1.5} />
            Reply
          </Button>
          <Button type="button" variant="secondary" onClick={() => onForward(message)}>
            <Forward className="h-3.5 w-3.5" strokeWidth={1.5} />
            Forward
          </Button>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto whitespace-pre-wrap break-words px-5 py-4 text-sm leading-relaxed text-[#E6EDF3]">
        {message.body}
      </div>
    </article>
  );
}
