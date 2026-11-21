import { useState, type FormEvent } from 'react';
import { CornerUpLeft, Paperclip, Send, X } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { errorMessage } from '../../services/workspace/httpClient';
import type { ChatMessageDto, SendChatMessageRequest } from '../../types/workspace.types';
import { MAX_MESSAGE_LENGTH, checkDraft } from './chatMessages';

interface ChatComposerProps {
  placeholder: string;
  disabled?: boolean;
  replyTo?: ChatMessageDto | null;
  onClearReply?: () => void;
  onSend: (request: SendChatMessageRequest) => Promise<void>;
}

function isValidAttachmentUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return lower.startsWith('https://') || lower.startsWith('http://') || url.startsWith('/api/');
}

export function ChatComposer({
  placeholder,
  disabled = false,
  replyTo = null,
  onClearReply,
  onSend,
}: ChatComposerProps) {
  const [draft, setDraft] = useState('');
  const [showAttachment, setShowAttachment] = useState(false);
  const [attachmentName, setAttachmentName] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const check = checkDraft(draft);
    if (!check.ok) return setError(check.error);

    const trimmedUrl = attachmentUrl.trim();
    const trimmedName = attachmentName.trim();
    if (trimmedUrl && !isValidAttachmentUrl(trimmedUrl)) {
      return setError('Attachment URL must start with https://, http://, or /api/.');
    }

    setError(null);
    setPending(true);
    try {
      await onSend({
        content: check.content,
        replyToId: replyTo?.id ?? null,
        attachmentName: trimmedUrl ? (trimmedName || null) : null,
        attachmentUrl: trimmedUrl || null,
      });
      setDraft('');
      setAttachmentName('');
      setAttachmentUrl('');
      setShowAttachment(false);
      onClearReply?.();
    } catch (err) {
      setError(errorMessage(err, 'Message could not be sent.'));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="border-t border-[#30363D] bg-[#161B22] p-3">
      {replyTo && (
        <div className="mb-2 flex items-center justify-between gap-2 border border-[#22C55E] bg-[#052E16] px-2.5 py-1.5 text-xs">
          <div className="flex min-w-0 items-center gap-1.5 text-[#E6EDF3]">
            <CornerUpLeft className="h-3.5 w-3.5 shrink-0 text-[#22C55E]" strokeWidth={1.5} />
            <span className="shrink-0 font-semibold text-[#4ADE80]">Replying to {replyTo.senderName}</span>
            <span className="truncate text-[#BDBDBD]">{replyTo.content}</span>
          </div>
          <button
            type="button"
            aria-label="Cancel reply"
            onClick={() => onClearReply?.()}
            className="shrink-0 text-[#BDBDBD] hover:text-[#E6EDF3]"
          >
            <X className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </div>
      )}

      {showAttachment && (
        <div className="mb-2 grid grid-cols-1 gap-2 border border-[#30363D] bg-[#0D1117] p-2 sm:grid-cols-[1fr_1.5fr_auto]">
          <input
            type="text"
            aria-label="Attachment name"
            value={attachmentName}
            maxLength={255}
            onChange={(e) => setAttachmentName(e.target.value)}
            placeholder="Attachment label (optional)"
            className="h-8 border border-[#3B434B] bg-[#161B22] px-2.5 text-xs text-[#E6EDF3] placeholder-[#8A8A8A] focus:border-[#22C55E] focus:outline-none"
          />
          <input
            type="text"
            aria-label="Attachment URL"
            value={attachmentUrl}
            maxLength={1024}
            onChange={(e) => setAttachmentUrl(e.target.value)}
            placeholder="https://... or /api/..."
            className="h-8 border border-[#3B434B] bg-[#161B22] px-2.5 font-mono text-xs text-[#E6EDF3] placeholder-[#8A8A8A] focus:border-[#22C55E] focus:outline-none"
          />
          <button
            type="button"
            aria-label="Close attachment bar"
            onClick={() => {
              setShowAttachment(false);
              setAttachmentName('');
              setAttachmentUrl('');
            }}
            className="flex h-8 w-8 items-center justify-center border border-[#30363D] bg-[#161B22] text-[#8A8A8A] hover:text-[#E6EDF3]"
          >
            <X className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="mb-2 text-xs text-[#EF4444]">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Attach link"
          aria-pressed={showAttachment}
          title="Attach link"
          disabled={disabled}
          onClick={() => setShowAttachment((prev) => !prev)}
          className={`flex h-10 w-10 shrink-0 items-center justify-center border transition-colors disabled:opacity-50 ${
            showAttachment || attachmentUrl.trim()
              ? 'border-[#22C55E] bg-[#052E16] text-[#4ADE80]'
              : 'border-[#3B434B] bg-[#0D1117] text-[#BDBDBD] hover:border-[#22C55E] hover:text-[#E6EDF3]'
          }`}
        >
          <Paperclip className="h-4 w-4" strokeWidth={1.5} />
        </button>

        <input
          type="text"
          aria-label="Message"
          value={draft}
          maxLength={MAX_MESSAGE_LENGTH + 100}
          disabled={disabled}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          className="h-10 min-w-0 flex-1 border border-[#3B434B] bg-[#0D1117] px-3 text-sm text-[#E6EDF3] placeholder-[#8A8A8A] focus:border-[#22C55E] focus:outline-none disabled:opacity-50"
        />

        <Button type="submit" variant="primary" disabled={disabled || pending || !draft.trim()}>
          <Send className="h-4 w-4" strokeWidth={1.5} />
          Send
        </Button>
      </div>
    </form>
  );
}
