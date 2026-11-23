import { Tag, User } from 'lucide-react';
import type { ChatChannelDto, ChatMessageDto, MemberDto } from '../../types/workspace.types';
import { ChatChannelIcon } from './ChatChannelIcon';

interface ChatThreadHeaderProps {
  channel: ChatChannelDto;
  scopeLabel: string;
  members: MemberDto[];
  messages?: ChatMessageDto[];
  onOpenInfo: () => void;
}

export function ChatThreadHeader({
  channel,
  scopeLabel,
  members,
  onOpenInfo,
}: ChatThreadHeaderProps) {
  const memberCount = members.length || 1;
  const tagLabel =
    channel.description?.trim() ||
    (channel.channelType === 'FORUM' ? 'Forum topics' : scopeLabel);

  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-[#30363D] bg-[#161B22] px-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[13px] font-semibold leading-tight text-[#E6EDF3]">
          <ChatChannelIcon type={channel.channelType} className="h-3.5 w-3.5 shrink-0 text-[#22C55E]" />
          <span className="truncate">{channel.name}</span>
        </div>

        <div className="mt-0.5 flex min-w-0 items-center gap-2 text-[11px] leading-tight text-[#8B949E]">
          <button
            type="button"
            onClick={onOpenInfo}
            className="inline-flex shrink-0 items-center gap-1 transition-colors hover:text-[#4ADE80]"
          >
            <User className="h-3 w-3" strokeWidth={1.5} />
            <span>
              {memberCount} {memberCount === 1 ? 'member' : 'members'}
            </span>
          </button>
          <span className="h-2.5 w-px shrink-0 bg-[#30363D]" aria-hidden="true" />
          <span className="inline-flex min-w-0 items-center gap-1 truncate" title={tagLabel}>
            <Tag className="h-3 w-3 shrink-0 text-[#8B949E]" strokeWidth={1.5} />
            <span className="truncate text-[11px] text-[#8B949E]">{tagLabel}</span>
          </span>
        </div>
      </div>
    </header>
  );
}
