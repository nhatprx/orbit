import type { DragEvent } from 'react';
import { ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import type { ChatChannelDto, VoiceParticipantDto } from '../../types/workspace.types';
import { ChatChannelIcon } from './ChatChannelIcon';
import { VoiceChannelUsers } from './VoiceChannelUsers';

interface ChatChannelRowProps {
  channel: ChatChannelDto;
  category: string;
  childrenByParent: Map<string, ChatChannelDto[]>;
  selectedChannelId: string | null;
  activeVoiceChannelId: string | null;
  participantsByChannel: Record<string, VoiceParticipantDto[]>;
  collapsedParents: Record<string, boolean>;
  dragOverChannelId: string | null;
  canManageChannels: boolean;
  depth?: number;
  onToggleParent: (channelId: string) => void;
  onSelectChannel: (channel: ChatChannelDto) => void;
  onCreateSubChannel?: (parent: ChatChannelDto) => void;
  onDeleteChannel: (channel: ChatChannelDto) => void;
  onChannelDragStart: (event: DragEvent, channelId: string) => void;
  onChannelDragOver: (event: DragEvent, channelId: string) => void;
  onChannelDragLeave: () => void;
  onChannelDrop: (event: DragEvent, targetChannelId: string, targetCategory: string) => void;
}

export function ChatChannelRow({
  channel,
  category,
  childrenByParent,
  selectedChannelId,
  activeVoiceChannelId,
  participantsByChannel,
  collapsedParents,
  dragOverChannelId,
  canManageChannels,
  depth = 0,
  onToggleParent,
  onSelectChannel,
  onCreateSubChannel,
  onDeleteChannel,
  onChannelDragStart,
  onChannelDragOver,
  onChannelDragLeave,
  onChannelDrop,
}: ChatChannelRowProps) {
  const isSelected = channel.id === selectedChannelId;
  const isVoice = channel.channelType === 'VOICE';
  const isForum = channel.channelType === 'FORUM';
  const isActiveVoice = channel.id === activeVoiceChannelId;
  const participants = isVoice ? (participantsByChannel[channel.id] ?? []) : [];
  const subChannels = childrenByParent.get(channel.id) ?? [];
  const hasChildren = subChannels.length > 0;
  const isParentCollapsed = Boolean(collapsedParents[channel.id]);
  const isDragOver = dragOverChannelId === channel.id;

  return (
    <div>
      <div
        draggable={canManageChannels}
        onDragStart={(e) => onChannelDragStart(e, channel.id)}
        onDragOver={(e) => onChannelDragOver(e, channel.id)}
        onDragLeave={onChannelDragLeave}
        onDrop={(e) => onChannelDrop(e, channel.id, category)}
        className={`group flex items-center gap-1 border px-2 py-1.5 text-sm transition-colors ${
          isDragOver ? 'border-t-2 border-t-[#22C55E] bg-[#052E16]/30' : ''
        } ${
          isSelected
            ? 'border-[#22C55E] bg-[#052E16] text-[#4ADE80]'
            : isActiveVoice
              ? 'border-[#22C55E] bg-[#21262D] text-[#E6EDF3]'
              : 'border-transparent text-[#BDBDBD] hover:bg-[#21262D] hover:text-[#E6EDF3]'
        }`}
      >
        {hasChildren && (
          <button
            type="button"
            aria-label={isParentCollapsed ? `Expand ${channel.name} sub-channels` : `Collapse ${channel.name} sub-channels`}
            onClick={() => onToggleParent(channel.id)}
            className="shrink-0 p-0.5 text-[#8A8A8A] hover:text-[#E6EDF3]"
          >
            {isParentCollapsed ? <ChevronRight className="h-3 w-3" strokeWidth={1.5} /> : <ChevronDown className="h-3 w-3" strokeWidth={1.5} />}
          </button>
        )}

        <button type="button" onClick={() => onSelectChannel(channel)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <ChatChannelIcon
            type={channel.channelType}
            className={`h-3.5 w-3.5 shrink-0 ${isSelected || isActiveVoice ? 'text-[#22C55E]' : 'text-[#8A8A8A]'}`}
          />
          <span className="truncate text-[13px] font-medium">{channel.name}</span>
          {isForum && <span className="shrink-0 font-mono text-[9px] text-[#7D8590]">FORUM</span>}
        </button>

        {isVoice && participants.length > 0 && (
          <span className="shrink-0 border border-[#22C55E] bg-[#052E16] px-1 py-0.5 font-mono text-[10px] font-semibold text-[#4ADE80]">
            {participants.length} LIVE
          </span>
        )}

        {canManageChannels && (
          <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
            <button
              type="button"
              aria-label={`Delete ${channel.name}`}
              title={`Delete ${channel.name}`}
              onClick={() => onDeleteChannel(channel)}
              className="p-0.5 text-[#8A8A8A] hover:text-[#EF4444]"
            >
              <Trash2 className="h-3 w-3" strokeWidth={1.5} />
            </button>
          </div>
        )}
      </div>

      {isVoice && <VoiceChannelUsers participants={participants} />}

      {hasChildren && !isParentCollapsed && (
        <div className="ml-3 mt-0.5 space-y-0.5 border-l border-[#30363D] pl-2">
          {subChannels.map((child) => (
            <ChatChannelRow
              key={child.id}
              channel={child}
              category={category}
              childrenByParent={childrenByParent}
              selectedChannelId={selectedChannelId}
              activeVoiceChannelId={activeVoiceChannelId}
              participantsByChannel={participantsByChannel}
              collapsedParents={collapsedParents}
              dragOverChannelId={dragOverChannelId}
              canManageChannels={canManageChannels}
              depth={depth + 1}
              onToggleParent={onToggleParent}
              onSelectChannel={onSelectChannel}
              onCreateSubChannel={onCreateSubChannel}
              onDeleteChannel={onDeleteChannel}
              onChannelDragStart={onChannelDragStart}
              onChannelDragOver={onChannelDragOver}
              onChannelDragLeave={onChannelDragLeave}
              onChannelDrop={onChannelDrop}
            />
          ))}
        </div>
      )}
    </div>
  );
}
