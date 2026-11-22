import { useMemo } from 'react';
import { PanelLeft, PanelRight, Tag, User } from 'lucide-react';
import type { ChatChannelDto, ChatMessageDto, MemberDto } from '../../types/workspace.types';
import { ChatChannelIcon } from './ChatChannelIcon';

interface ChatThreadHeaderProps {
  channel: ChatChannelDto;
  scopeLabel: string;
  members: MemberDto[];
  messages: ChatMessageDto[];
  showLeftSidebar?: boolean;
  onToggleLeftSidebar?: () => void;
  showInfo: boolean;
  onToggleInfo: () => void;
  onOpenInfo: () => void;
}

export function ChatThreadHeader({
  channel,
  scopeLabel,
  members,
  messages,
  showLeftSidebar = true,
  onToggleLeftSidebar,
  showInfo,
  onToggleInfo,
  onOpenInfo,
}: ChatThreadHeaderProps) {
  const avatarByUserId = useMemo(() => {
    const map = new Map<string, string>();
    for (const msg of messages) {
      if (msg.senderAvatarUrl && !map.has(msg.senderId)) {
        map.set(msg.senderId, msg.senderAvatarUrl);
      }
    }
    return map;
  }, [messages]);

  const memberCount = members.length || 1;
  const mosaicMembers = members.slice(0, 3);
  const tagLabel =
    channel.description?.trim() ||
    (channel.channelType === 'FORUM' ? 'Forum topics' : scopeLabel);

  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-[#30363D] bg-[#161B22] px-4">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <button
          type="button"
          onClick={onOpenInfo}
          aria-label={`Open ${channel.name} info`}
          className="grid h-8 w-8 shrink-0 grid-cols-2 gap-[1px] border border-[#30363D] bg-[#0D1117] p-[1px] transition-colors hover:border-[#22C55E]"
        >
          {mosaicMembers.map((member) => {
            const avatarUrl = avatarByUserId.get(member.userId);
            return avatarUrl ? (
              <img
                key={member.userId}
                src={avatarUrl}
                alt={member.displayName}
                className="h-full w-full object-cover"
              />
            ) : (
              <span
                key={member.userId}
                className="flex items-center justify-center bg-[#052E16] font-mono text-[8px] font-semibold text-[#4ADE80]"
              >
                {member.displayName.slice(0, 1).toUpperCase()}
              </span>
            );
          })}
          {Array.from({ length: Math.max(0, 3 - mosaicMembers.length) }).map((_, idx) => (
            <span key={`pad-${idx}`} className="bg-[#161B22]" />
          ))}
          <span className="flex items-center justify-center bg-[#21262D] font-mono text-[8px] font-semibold text-[#E6EDF3]">
            {memberCount}
          </span>
        </button>

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
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {onToggleLeftSidebar && (
          <button
            type="button"
            aria-label="Toggle channels sidebar"
            aria-pressed={showLeftSidebar}
            title={showLeftSidebar ? 'Collapse channels sidebar' : 'Expand channels sidebar'}
            onClick={onToggleLeftSidebar}
            className={`flex h-7 w-7 items-center justify-center border transition-colors ${
              showLeftSidebar
                ? 'border-[#22C55E] bg-[#052E16] text-[#4ADE80]'
                : 'border-[#30363D] bg-[#161B22] text-[#8B949E] hover:border-[#22C55E] hover:text-[#E6EDF3]'
            }`}
          >
            <PanelLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        )}
        <button
          type="button"
          aria-label="Toggle channel info"
          aria-pressed={showInfo}
          title="Channel info"
          onClick={onToggleInfo}
          className={`flex h-7 w-7 items-center justify-center border transition-colors ${
            showInfo
              ? 'border-[#22C55E] bg-[#052E16] text-[#4ADE80]'
              : 'border-[#30363D] bg-[#161B22] text-[#8B949E] hover:border-[#22C55E] hover:text-[#E6EDF3]'
          }`}
        >
          <PanelRight className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      </div>
    </header>
  );
}
