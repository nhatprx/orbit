import { useMemo, useState } from 'react';
import {
  Bell, BellOff, ChevronDown, ChevronRight, Pin, PinOff, Search, Settings, Users, X,
} from 'lucide-react';
import { UserAvatar } from '../../components/ui/UserAvatar';
import type { ChatChannelDto, ChatMessageDto, MemberDto } from '../../types/workspace.types';
import type { PreviewImageItem } from './ChatImageLightbox';
import { ChatInfoDangerActions } from './ChatInfoDangerActions';
import { extractChannelMedia } from './chatInfoExtractors';
import { ChatInfoMediaSections } from './ChatInfoMediaSections';

interface ChatInfoSidebarProps {
  channel: ChatChannelDto;
  scopeLabel: string;
  members: MemberDto[];
  messages: ChatMessageDto[];
  pinnedMessages: ChatMessageDto[];
  canManageChannels: boolean;
  canWriteChat: boolean;
  searchQuery: string;
  onChangeSearch: (value: string) => void;
  onEditChannel?: (channel: ChatChannelDto) => void;
  onDeleteChannel?: (channel: ChatChannelDto) => void;
  onUnpin: (messageId: string) => Promise<void>;
  onPreviewImage?: (image: PreviewImageItem) => void;
  onClose: () => void;
}

export function ChatInfoSidebar({
  channel, scopeLabel, members, messages, pinnedMessages,
  canManageChannels, canWriteChat, searchQuery, onChangeSearch,
  onEditChannel, onDeleteChannel, onUnpin, onPreviewImage, onClose,
}: ChatInfoSidebarProps) {
  const [muted, setMuted] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [membersOpen, setMembersOpen] = useState(true);
  const [pinsOpen, setPinsOpen] = useState(true);

  const { images, files, links } = useMemo(() => extractChannelMedia(messages), [messages]);
  const mosaicMembers = members.slice(0, 3);

  return (
    <aside aria-label="Channel info panel" className="flex w-96 shrink-0 flex-col border-l border-[#30363D] bg-[#0D1117]">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-[#30363D] bg-[#161B22] px-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#E6EDF3]">Channel Info</span>
        <button
          type="button"
          aria-label="Close channel info"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center border border-[#30363D] bg-[#161B22] text-[#8B949E] transition-colors hover:border-[#22C55E] hover:text-[#E6EDF3]"
        >
          <X className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="border-b border-[#21262D] px-4 py-4 text-center">
          <div className="mx-auto grid h-14 w-14 grid-cols-2 gap-0.5 border border-[#30363D] bg-[#161B22] p-0.5">
            {mosaicMembers.map((m) => (
              <div key={m.userId} className="flex items-center justify-center bg-[#052E16] font-mono text-[10px] font-semibold text-[#4ADE80]">
                {m.displayName.slice(0, 1).toUpperCase()}
              </div>
            ))}
            <div className="flex items-center justify-center bg-[#21262D] font-mono text-[10px] font-semibold text-[#E6EDF3]">
              {members.length || 1}
            </div>
          </div>

          <h3 className="mt-2.5 truncate text-sm font-semibold text-[#E6EDF3]">{channel.name}</h3>
          <p className="mt-0.5 truncate text-[11px] text-[#7D8590]">{channel.description || scopeLabel}</p>

          <div className="mt-4 grid grid-cols-4 gap-1.5">
            <button type="button" onClick={() => setMuted((v) => !v)}
              className={`flex flex-col items-center gap-1 border px-1 py-2 text-[10px] ${muted ? 'border-[#22C55E] bg-[#052E16] text-[#4ADE80]' : 'border-[#30363D] bg-[#161B22] text-[#BDBDBD] hover:border-[#22C55E]'}`}>
              {muted ? <BellOff className="h-3.5 w-3.5" strokeWidth={1.5} /> : <Bell className="h-3.5 w-3.5" strokeWidth={1.5} />}
              <span>{muted ? 'Muted' : 'Mute'}</span>
            </button>
            <button type="button" onClick={() => setPinsOpen(true)}
              className="flex flex-col items-center gap-1 border border-[#30363D] bg-[#161B22] px-1 py-2 text-[10px] text-[#BDBDBD] hover:border-[#22C55E]">
              <Pin className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>Pinned</span>
            </button>
            <button type="button" onClick={() => setShowSearch((v) => !v)}
              className={`flex flex-col items-center gap-1 border px-1 py-2 text-[10px] ${showSearch || searchQuery ? 'border-[#22C55E] bg-[#052E16] text-[#4ADE80]' : 'border-[#30363D] bg-[#161B22] text-[#BDBDBD] hover:border-[#22C55E]'}`}>
              <Search className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>Search</span>
            </button>
            <button type="button" disabled={!canManageChannels || !onEditChannel} onClick={() => onEditChannel?.(channel)}
              className="flex flex-col items-center gap-1 border border-[#30363D] bg-[#161B22] px-1 py-2 text-[10px] text-[#BDBDBD] hover:border-[#22C55E] disabled:opacity-40">
              <Settings className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>Manage</span>
            </button>
          </div>

          {showSearch && (
            <div className="mt-3 flex items-center gap-1">
              <input type="text" aria-label="Filter channel messages" value={searchQuery} onChange={(e) => onChangeSearch(e.target.value)} placeholder="Search in conversation..."
                className="h-8 min-w-0 flex-1 border border-[#30363D] bg-[#161B22] px-2.5 text-xs text-[#E6EDF3] placeholder-[#7D8590] focus:border-[#22C55E] focus:outline-none" />
              {searchQuery && (
                <button type="button" aria-label="Clear search" onClick={() => onChangeSearch('')} className="flex h-8 w-8 items-center justify-center border border-[#30363D] bg-[#161B22] text-[#8B949E] hover:text-[#E6EDF3]">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        <section className="border-b border-[#21262D] px-4 py-3">
          <button type="button" onClick={() => setMembersOpen((v) => !v)} className="flex w-full items-center justify-between text-left text-xs font-semibold text-[#E6EDF3]">
            <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-[#22C55E]" strokeWidth={1.5} /><span>Members ({members.length})</span></span>
            {membersOpen ? <ChevronDown className="h-3.5 w-3.5 text-[#8B949E]" /> : <ChevronRight className="h-3.5 w-3.5 text-[#8B949E]" />}
          </button>
          {membersOpen && (
            <div className="mt-2 space-y-1.5">
              {members.slice(0, 12).map((member) => (
                <div key={member.userId} className="flex items-center gap-2 py-0.5 text-xs">
                  <UserAvatar name={member.displayName} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-[#E6EDF3]">{member.displayName}</p>
                    <p className="truncate font-mono text-[10px] text-[#7D8590]">@{member.username}</p>
                  </div>
                  <span className="border border-[#30363D] bg-[#161B22] px-1.5 py-0.5 font-mono text-[9px] text-[#8B949E]">{member.roleName}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="border-b border-[#21262D] px-4 py-3">
          <button type="button" onClick={() => setPinsOpen((v) => !v)} className="flex w-full items-center justify-between text-left text-xs font-semibold text-[#E6EDF3]">
            <span className="flex items-center gap-1.5"><Pin className="h-3.5 w-3.5 text-[#22C55E]" strokeWidth={1.5} /><span>Pinned Messages ({pinnedMessages.length})</span></span>
            {pinsOpen ? <ChevronDown className="h-3.5 w-3.5 text-[#8B949E]" /> : <ChevronRight className="h-3.5 w-3.5 text-[#8B949E]" />}
          </button>
          {pinsOpen && (
            <div className="mt-2 space-y-1.5">
              {pinnedMessages.length === 0 ? (
                <p className="py-1 text-[11px] text-[#7D8590]">No pinned messages yet.</p>
              ) : (
                pinnedMessages.slice(0, 5).map((msg) => (
                  <div key={msg.id} className="flex items-start justify-between gap-2 border border-[#21262D] bg-[#161B22] p-2 text-xs">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[#4ADE80]">{msg.senderName}</p>
                      <p className="mt-0.5 truncate text-[11px] text-[#BDBDBD]">{msg.content || msg.attachmentName || 'Image'}</p>
                    </div>
                    {canWriteChat && (
                      <button type="button" aria-label={`Unpin message from ${msg.senderName}`} onClick={() => void onUnpin(msg.id)} className="shrink-0 p-1 text-[#7D8590] hover:text-[#E6EDF3]">
                        <PinOff className="h-3 w-3" strokeWidth={1.5} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </section>

        <ChatInfoMediaSections images={images} files={files} links={links} onPreviewImage={onPreviewImage} />
      </div>

      <ChatInfoDangerActions
        channel={channel}
        canManageChannels={canManageChannels}
        onDeleteChannel={onDeleteChannel}
      />
    </aside>
  );
}
