import { useState, type FormEvent } from 'react';
import { Hash, MessageSquare, Send } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import type { ChatChannel, ChatMessage } from '../../types/chat.types';

interface ChatMessagePaneProps {
  channel: ChatChannel | null;
  messages: ChatMessage[];
  sending: boolean;
  onSend: (content: string) => Promise<void>;
}

export function ChatMessagePane({
  channel,
  messages,
  sending,
  onSend,
}: ChatMessagePaneProps) {
  const [draft, setDraft] = useState('');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!draft.trim()) return;
    await onSend(draft);
    setDraft('');
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-[#0D1117]">
      <div className="flex items-center justify-between border-b border-[#30363D] bg-[#161B22] px-5 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-base font-semibold text-[#E6EDF3]">
            {channel?.kind === 'dm' ? (
              <MessageSquare className="h-4 w-4 text-[#22C55E]" strokeWidth={1.5} />
            ) : (
              <Hash className="h-4 w-4 text-[#22C55E]" strokeWidth={1.5} />
            )}
            <span className="truncate">{channel?.name ?? 'Channel'}</span>
          </div>
          {channel?.description && (
            <p className="mt-0.5 truncate text-xs text-[#8A8A8A]">
              {channel.description}
            </p>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {messages.length === 0 ? (
          <div className="py-12 text-center text-sm text-[#8A8A8A]">
            No messages yet. Start the conversation below.
          </div>
        ) : (
          messages.map((msg) => {
            const initials = msg.authorName
              .split(' ')
              .map((p) => p[0])
              .join('')
              .slice(0, 2)
              .toUpperCase();

            return (
              <div key={msg.id} className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-[#3B434B] bg-[#161B22] font-mono text-xs font-semibold text-[#22C55E]">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-[#E6EDF3]">
                      {msg.authorName}
                    </span>
                    <span className="font-mono text-xs text-[#8A8A8A]">
                      @{msg.authorHandle}
                    </span>
                    {msg.authorRole === 'admin' && (
                      <Badge tone="green">admin</Badge>
                    )}
                    <span className="font-mono text-xs text-[#8A8A8A]">
                      {msg.timestamp}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[#E6EDF3]">
                    {msg.content}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-t border-[#30363D] bg-[#161B22] p-4"
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Message ${channel?.kind === 'dm' ? channel.name : `#${channel?.name ?? 'channel'}`}...`}
          className="h-10 flex-1 border border-[#3B434B] bg-[#0D1117] px-3 text-sm text-[#E6EDF3] placeholder-[#8A8A8A] focus:border-[#22C55E] focus:outline-none"
        />
        <Button type="submit" variant="primary" disabled={sending || !draft.trim()}>
          <Send className="h-4 w-4" strokeWidth={1.5} />
          Send
        </Button>
      </form>
    </div>
  );
}
