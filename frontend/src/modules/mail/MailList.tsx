import { Search, Star } from 'lucide-react';
import type { MailFolder, MailMessage } from '../../types/mail.types';

interface MailListProps {
  folder: MailFolder;
  messages: MailMessage[];
  selectedId: string | null;
  query: string;
  onQueryChange: (value: string) => void;
  onSelect: (message: MailMessage) => void;
  onToggleStar: (id: string) => void;
}

export function MailList({
  folder,
  messages,
  selectedId,
  query,
  onQueryChange,
  onSelect,
  onToggleStar,
}: MailListProps) {
  return (
    <div className="flex w-80 shrink-0 flex-col border-r border-[#30363D] bg-[#0D1117] lg:w-96">
      <div className="border-b border-[#30363D] bg-[#161B22] p-3">
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#E6EDF3]">
            {folder}
          </h2>
          <span className="font-mono text-xs text-[#8A8A8A]">
            {messages.length} items
          </span>
        </div>

        <div className="flex items-center border border-[#3B434B] bg-[#0D1117] px-2.5 focus-within:border-[#22C55E]">
          <Search className="h-4 w-4 text-[#8A8A8A]" strokeWidth={1.5} />
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Filter messages..."
            className="h-8 w-full bg-transparent px-2 text-sm text-[#E6EDF3] placeholder-[#8A8A8A] focus:outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="p-6 text-center text-sm text-[#8A8A8A]">
            No messages in {folder}.
          </div>
        ) : (
          messages.map((msg) => {
            const isSelected = msg.id === selectedId;
            return (
              <div
                key={msg.id}
                onClick={() => onSelect(msg)}
                className={`cursor-pointer border-b border-[#30363D] p-3.5 transition-colors ${
                  isSelected
                    ? 'border-l-2 border-l-[#22C55E] bg-[#161B22]'
                    : 'hover:bg-[#161B22]'
                }`}
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    {msg.unread && (
                      <span className="h-1.5 w-1.5 shrink-0 bg-[#22C55E]" />
                    )}
                    <span
                      className={`truncate text-sm ${
                        msg.unread
                          ? 'font-semibold text-[#E6EDF3]'
                          : 'font-medium text-[#BDBDBD]'
                      }`}
                    >
                      {msg.fromName}
                    </span>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-mono text-xs text-[#8A8A8A]">
                      {msg.timestamp}
                    </span>
                    <button
                      type="button"
                      title="Toggle star"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleStar(msg.id);
                      }}
                      className={
                        msg.starred
                          ? 'text-[#22C55E]'
                          : 'text-[#8A8A8A] hover:text-[#E6EDF3]'
                      }
                    >
                      <Star
                        className="h-3.5 w-3.5"
                        strokeWidth={1.5}
                        fill={msg.starred ? 'currentColor' : 'none'}
                      />
                    </button>
                  </div>
                </div>

                <p className="truncate text-sm font-medium text-[#E6EDF3]">
                  {msg.subject}
                </p>
                <p className="mt-1 truncate text-xs text-[#8A8A8A]">
                  {msg.preview}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
