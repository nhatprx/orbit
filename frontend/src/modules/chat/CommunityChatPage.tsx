import { useCallback, useEffect, useState } from 'react';
import { chatService } from '../../services/chat.service';
import type { AuthUser } from '../../types/auth.types';
import type { ChatChannel, ChatMember, ChatMessage } from '../../types/chat.types';
import { ChatChannelSidebar } from './ChatChannelSidebar';
import { ChatMembersPane } from './ChatMembersPane';
import { ChatMessagePane } from './ChatMessagePane';

interface CommunityChatPageProps {
  user: AuthUser;
}

export function CommunityChatPage({ user }: CommunityChatPageProps) {
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [activeId, setActiveId] = useState('ch_general');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [members, setMembers] = useState<ChatMember[]>([]);
  const [sending, setSending] = useState(false);

  const refresh = useCallback(async (targetChannelId: string) => {
    const [chList, msgList, memberList] = await Promise.all([
      chatService.listChannels(),
      chatService.listMessages(targetChannelId, 50),
      chatService.listMembers(),
    ]);
    setChannels(chList);
    setMessages(msgList);
    setMembers(memberList);
  }, []);

  useEffect(() => {
    void refresh(activeId);
  }, [activeId, refresh]);

  async function handleSelectChannel(channelId: string) {
    setActiveId(channelId);
    await chatService.markRead(channelId);
    await refresh(channelId);
  }

  async function handleSend(content: string) {
    setSending(true);
    try {
      await chatService.sendMessage(activeId, content, user);
      await refresh(activeId);
    } finally {
      setSending(false);
    }
  }

  const activeChannel = channels.find((c) => c.id === activeId) ?? null;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] w-full overflow-hidden border border-[#30363D] bg-[#0D1117]">
      <ChatChannelSidebar
        channels={channels}
        activeId={activeId}
        onSelect={(id) => void handleSelectChannel(id)}
      />

      <ChatMessagePane
        channel={activeChannel}
        messages={messages}
        sending={sending}
        onSend={handleSend}
      />

      <ChatMembersPane members={members} />
    </div>
  );
}
