import { Search } from 'lucide-react';
import type { MailMessageSummaryDto } from '../../types/workspace.types';
import { formatRelative } from '../../utils/format';
import type { MailFolder } from './MailFolderNav';

interface MailListProps {
  folder: MailFolder;
  messages: MailMessageSummaryDto[];
  selectedId: string | null;
  query: string;
  onQueryChange: (query: string) => void;
  onSelect: (message: MailMessageSummaryDto) => void;
}

export function filterMessages(messages: MailMessageSummaryDto[], query: string): MailMessageSummaryDto[] {
  const q = query.trim().toLowerCase();
  if (!q) return messages;
  return messages.filter((m) =>
    [m.subject, m.senderName, m.senderEmail, m.snippet].some((field) => field.toLowerCase().includes(q))
  );
}

export function MailList({ folder, messages, selectedId, query, onQueryChange, onSelect }: MailListProps) {
  const visible = filterMessages(messages, query);

  return (
    <div className="flex w-80 shrink-0 flex-col border-r border-[#30363D] bg-[#0D1117]">
      <div className="border-b border-[#30363D] p-3">
        <div className="flex items-center border border-[#30363D] bg-[#161B22] px-2 focus-within:border-[#22C55E]">
          <Search className="h-3.5 w-3.5 text-[#7D8590]" strokeWidth={1.5} />
          <input
            type="search"
            aria-label="Search mail"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search this folder"
            className="h-8 w-full bg-transparent px-2 text-xs text-[#E6EDF3] placeholder-[#7D8590] focus:outline-none"
          />
        </div>
      </div>

      <ul className="flex-1 overflow-y-auto">
        {visible.length === 0 && (
          <li className="p-6 text-center text-xs text-[#8A8A8A]">
            {messages.length === 0 ? `No messages in ${folder}.` : 'No messages match your search.'}
          </li>
        )}
        {visible.map((message) => {
          const selected = message.id === selectedId;
          const party = folder === 'sent' ? `To: ${message.recipientEmail}` : message.senderName || message.senderEmail;
          return (
            <li key={message.id}>
              <button
                type="button"
                onClick={() => onSelect(message)}
                className={`block w-full border-b border-l-2 border-b-[#30363D] px-3 py-2.5 text-left transition-colors ${
                  selected ? 'border-l-[#22C55E] bg-[#052E16]' : 'border-l-transparent hover:bg-[#161B22]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`flex min-w-0 items-center gap-1.5 text-[13px] ${message.read ? 'text-[#BDBDBD]' : 'font-semibold text-[#E6EDF3]'}`}>
                    {!message.read && <span className="h-1.5 w-1.5 shrink-0 bg-[#22C55E]" aria-label="Unread" />}
                    <span className="truncate">{party}</span>
                  </span>
                  <span className="shrink-0 font-mono text-[10px] text-[#7D8590]">{formatRelative(message.receivedAt)}</span>
                </div>
                <p className={`mt-0.5 truncate text-xs ${message.read ? 'text-[#8B949E]' : 'text-[#E6EDF3]'}`}>{message.subject}</p>
                <p className="mt-0.5 truncate text-xs text-[#7D8590]">{message.snippet}</p>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
