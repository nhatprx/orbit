import { useState } from 'react';
import { Plus, Search, X } from 'lucide-react';
import type { ChatChannelDto } from '../../types/workspace.types';
import { initialsOf } from '../../utils/format';
import { ChatSidebarChannels } from './ChatSidebarChannels';
import { ChatVoiceControlBar } from './ChatVoiceControlBar';
import type { VoiceSessionState } from './chatVoiceTypes';
import type { useChatOrder } from './useChatOrder';

interface ChatSidebarProps {
  scopeName: string;
  scopeType: 'WORKSPACE' | 'PROJECT';
  channels: ChatChannelDto[];
  order: ReturnType<typeof useChatOrder>;
  selectedChannelId: string | null;
  voice: VoiceSessionState;
  currentUser: { id: string; username: string; displayName: string } | null;
  canManageChannels: boolean;
  canWriteChat?: boolean;
  onSelectChannel: (channel: ChatChannelDto) => void;
  onOpenCreateChannel: () => void;
  onCreateCategorySubChannel?: (category: string) => void;
  onMoveChannelToCategory?: (channelId: string, nextCategory: string) => Promise<void>;
  onDeleteChannel: (channel: ChatChannelDto) => void;
  onRenameCategory?: (oldCategory: string, nextCategory: string) => Promise<void>;
  onDeleteCategory?: (category: string) => void;
  onOpenVoiceStage: (channelId: string) => void;
}

export function ChatSidebar({
  scopeName,
  scopeType,
  channels,
  order,
  selectedChannelId,
  voice,
  currentUser,
  canManageChannels,
  canWriteChat = true,
  onSelectChannel,
  onOpenCreateChannel,
  onCreateCategorySubChannel,
  onMoveChannelToCategory,
  onDeleteChannel,
  onRenameCategory,
  onDeleteCategory,
  onOpenVoiceStage,
}: ChatSidebarProps) {
  const [filterQuery, setFilterQuery] = useState('');

  return (
    <aside
      aria-label="Chat channels sidebar"
      className="flex w-60 shrink-0 flex-col border-r border-[#30363D] bg-[#161B22]"
    >
      <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-[#30363D] px-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="shrink-0 border border-[#30363D] bg-[#21262D] px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-[#BDBDBD]">
            {scopeType}
          </span>
          <h2 className="truncate text-sm font-semibold text-[#E6EDF3]" title={scopeName}>
            {scopeName}
          </h2>
        </div>

        {canManageChannels && (
          <button
            type="button"
            aria-label="New channel"
            title="New channel"
            onClick={onOpenCreateChannel}
            className="flex h-7 w-7 shrink-0 items-center justify-center border border-[#30363D] bg-[#161B22] text-[#8B949E] transition-colors hover:border-[#22C55E] hover:text-[#E6EDF3]"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        )}
      </div>

      {!canWriteChat && (
        <div className="border-b border-[#30363D] px-3 py-1.5">
          <span className="inline-block border border-[#EAB308] bg-[#0D1117] px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-[#EAB308]">
            READ-ONLY
          </span>
        </div>
      )}

      <nav aria-label="Channels" className="min-h-0 flex-1 overflow-y-auto">
        <ChatSidebarChannels
          channels={channels}
          order={order}
          selectedChannelId={selectedChannelId}
          activeVoiceChannelId={voice.activeChannelId}
          participantsByChannel={voice.participantsByChannel}
          canManageChannels={canManageChannels}
          filterQuery={filterQuery}
          onSelectChannel={onSelectChannel}
          onCreateCategorySubChannel={onCreateCategorySubChannel}
          onMoveChannelToCategory={onMoveChannelToCategory}
          onDeleteChannel={onDeleteChannel}
          onRenameCategory={onRenameCategory}
          onDeleteCategory={onDeleteCategory}
        />
      </nav>

      <ChatVoiceControlBar voice={voice} onOpenStage={onOpenVoiceStage} />

      <div className="border-t border-[#30363D] bg-[#161B22] px-2.5 py-2">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8A8A8A]"
            strokeWidth={1.5}
          />
          <input
            type="text"
            aria-label="Filter channels"
            value={filterQuery}
            onChange={(event) => setFilterQuery(event.target.value)}
            placeholder="Filter channels..."
            className="h-8 w-full border border-[#30363D] bg-[#0D1117] pl-8 pr-7 text-xs text-[#E6EDF3] placeholder-[#8A8A8A] focus:border-[#22C55E] focus:outline-none"
          />
          {filterQuery && (
            <button
              type="button"
              aria-label="Clear channel filter"
              onClick={() => setFilterQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8A8A8A] hover:text-[#E6EDF3]"
            >
              <X className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-[#30363D] bg-[#0D1117] px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center border border-[#22C55E] bg-[#052E16] font-mono text-xs font-semibold text-[#22C55E]">
            {initialsOf(currentUser?.displayName ?? 'Orbit User')}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-[#E6EDF3]">{currentUser?.displayName ?? 'Member'}</p>
            <p className="truncate font-mono text-[11px] text-[#8A8A8A]">@{currentUser?.username ?? 'member'}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
