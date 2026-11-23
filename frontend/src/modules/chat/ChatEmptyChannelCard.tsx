import { Calendar, FolderKanban, Users } from 'lucide-react';
import type { ChatChannelDto } from '../../types/workspace.types';
import { formatDate } from '../../utils/format';
import { ChatChannelIcon } from './ChatChannelIcon';

interface ChatEmptyChannelCardProps {
  channel: ChatChannelDto;
  scopeLabel?: string;
  memberCount: number;
}

export function ChatEmptyChannelCard({
  channel,
  scopeLabel,
  memberCount,
}: ChatEmptyChannelCardProps) {
  const categoryLabel = channel.category?.trim() || (channel.channelType === 'FORUM' ? 'FORUMS' : 'TEXT CHANNELS');
  const description =
    channel.description?.trim() ||
    `This is the beginning of #${channel.name}. Send a message, drop images or folders, or share links below.`;

  return (
    <div className="mx-auto my-12 w-full max-w-md border border-[#30363D] bg-[#161B22]">
      <div className="flex items-start gap-3 border-b border-[#21262D] p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-[#22C55E] bg-[#052E16] text-[#22C55E]">
          <ChatChannelIcon type={channel.channelType} className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="border border-[#30363D] bg-[#0D1117] px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#8B949E]">
              {categoryLabel}
            </span>
          </div>
          <h3 className="mt-1.5 truncate text-base font-semibold text-[#E6EDF3]">
            Welcome to #{channel.name}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-[#8B949E]">{description}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 divide-x divide-[#21262D] bg-[#0D1117] text-[11px]">
        <div className="px-3 py-2.5">
          <span className="flex items-center gap-1 font-mono text-[10px] uppercase text-[#7D8590]">
            <FolderKanban className="h-3 w-3 text-[#22C55E]" strokeWidth={1.5} />
            Scope
          </span>
          <p className="mt-0.5 truncate font-medium text-[#E6EDF3]">{scopeLabel || channel.scopeType}</p>
        </div>
        <div className="px-3 py-2.5">
          <span className="flex items-center gap-1 font-mono text-[10px] uppercase text-[#7D8590]">
            <Users className="h-3 w-3 text-[#22C55E]" strokeWidth={1.5} />
            Members
          </span>
          <p className="mt-0.5 font-mono font-medium text-[#E6EDF3]">
            {memberCount} {memberCount === 1 ? 'member' : 'members'}
          </p>
        </div>
        <div className="px-3 py-2.5">
          <span className="flex items-center gap-1 font-mono text-[10px] uppercase text-[#7D8590]">
            <Calendar className="h-3 w-3 text-[#22C55E]" strokeWidth={1.5} />
            Created
          </span>
          <p className="mt-0.5 truncate font-mono font-medium text-[#E6EDF3]">{formatDate(channel.createdAt)}</p>
        </div>
      </div>
    </div>
  );
}
