import { useEffect, useMemo, useState } from 'react';
import { EmptyView, ErrorView, LoadingView } from '../../components/ui/StateViews';
import { authService } from '../../services/auth.service';
import type {
  ChatChannelDto,
  CreateChatChannelRequest,
  ProjectDto,
  UpdateChatChannelRequest,
  WorkspaceDto,
} from '../../types/workspace.types';
import { resolveCategory } from './chatCategoryGrouping';
import { useChatLayout } from './chatLayoutStore';
import { ChatPageDialogs } from './ChatPageDialogs';
import { ChatSidebar } from './ChatSidebar';
import { ChatThreadView } from './ChatThreadView';
import { ChatVoiceRoom } from './ChatVoiceRoom';
import { useChatChannels } from './useChatChannels';
import { useChatOrder } from './useChatOrder';
import { useVoiceSession } from './useVoiceSession';
import { VoiceAudioSink } from './VoiceAudioSink';
import { useChatMentionMembers } from './useChatMentionMembers';
import { useChatOnlineCount } from './useChatOnlineCount';

interface ChatPageProps {
  workspace: WorkspaceDto;
  project: ProjectDto | null;
}

export function ChatPage({ workspace, project }: ChatPageProps) {
  const permissions = project ? project.myPermissions : workspace.myPermissions;
  const canManageChannels = permissions.includes(project ? 'pchat.manage' : 'chat.manage');
  const canWriteChat = permissions.includes(project ? 'pchat.write' : 'chat.write');

  const currentUser = useMemo(() => {
    const user = authService.getSession()?.user ?? null;
    if (!user) return null;
    const username = user.username ?? user.email.split('@')[0] ?? 'member';
    return { id: user.id, username, displayName: user.name, avatarUrl: user.avatarUrl ?? null };
  }, []);

  const chatChannels = useChatChannels(workspace.id, project?.id ?? null);
  const voice = useVoiceSession(chatChannels.channels, currentUser);
  const mentionMembers = useChatMentionMembers(workspace.id, project?.id ?? null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<ChatChannelDto | null>(null);
  const [targetCategory, setTargetCategory] = useState<string | null>(null);
  const [deletingChannel, setDeletingChannel] = useState<ChatChannelDto | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<string | null>(null);
  const { showLeftSidebar, setActiveChannelMode } = useChatLayout();

  const selectedChannel =
    chatChannels.channels.find((c) => c.id === selectedId) ?? chatChannels.channels[0] ?? null;

  useEffect(() => {
    setActiveChannelMode(!selectedChannel ? 'none' : selectedChannel.channelType === 'VOICE' ? 'voice' : 'text');
  }, [selectedChannel, setActiveChannelMode]);
  const scopeName = project ? project.name : workspace.name;
  const scopeType = project ? 'PROJECT' : 'WORKSPACE';
  const scopeId = project?.id ?? workspace.id;
  const order = useChatOrder(`${scopeType}:${scopeId}`);
  const onlineCount = useChatOnlineCount(selectedChannel?.id ?? null, scopeType, scopeId);

  async function handleSelectChannel(channel: ChatChannelDto) {
    if (voice.activeChannelId && (channel.channelType !== 'VOICE' || !canWriteChat)) {
      await voice.leaveChannel();
    }
    setSelectedId(channel.id);
    if (canWriteChat && channel.channelType === 'VOICE' && voice.activeChannelId !== channel.id) {
      void voice.joinChannel(channel.id);
    }
  }

  async function handleCreateChannel(request: CreateChatChannelRequest) {
    const created = await chatChannels.createChannel(request);
    setSelectedId(created.id);
  }

  async function handleUpdateChannel(channelId: string, request: UpdateChatChannelRequest) {
    await chatChannels.updateChannel(channelId, request);
  }

  function channelsInCategory(category: string): ChatChannelDto[] {
    return chatChannels.channels.filter((c) => resolveCategory(c) === category);
  }

  async function handleRenameCategory(oldCategory: string, nextCategory: string) {
    order.renameCustomCategory(oldCategory, nextCategory);
    await Promise.all(channelsInCategory(oldCategory).map((c) => chatChannels.updateChannel(c.id, { category: nextCategory })));
  }

  async function handleConfirmDeleteCategory() {
    if (!deletingCategory) return;
    const targets = channelsInCategory(deletingCategory);
    for (const ch of targets) {
      if (voice.activeChannelId === ch.id) await voice.leaveChannel();
      await chatChannels.deleteChannel(ch.id);
      if (selectedId === ch.id) setSelectedId(null);
    }
    order.removeCustomCategory(deletingCategory);
  }

  async function handleConfirmDelete() {
    if (!deletingChannel) return;
    const targetId = deletingChannel.id;
    if (voice.activeChannelId === targetId) await voice.leaveChannel();
    await chatChannels.deleteChannel(targetId);
    if (selectedId === targetId) setSelectedId(null);
  }

  if (chatChannels.loading && chatChannels.channels.length === 0) {
    return <LoadingView label="Loading channels..." />;
  }
  if (chatChannels.error && chatChannels.channels.length === 0) {
    return <div className="p-4"><ErrorView message={chatChannels.error} onRetry={chatChannels.reload} /></div>;
  }

  return (
    <div className="flex h-[calc(100vh-3rem)] w-full overflow-hidden border border-[#30363D] bg-[#0D1117]">
      {showLeftSidebar && (
        <ChatSidebar
          scopeName={scopeName}
          scopeType={scopeType}
          channels={chatChannels.channels}
          order={order}
          selectedChannelId={selectedChannel?.id ?? null}
          voice={voice}
          currentUser={currentUser}
          canManageChannels={canManageChannels}
          canWriteChat={canWriteChat}
          onSelectChannel={handleSelectChannel}
          onOpenCreateChannel={() => setCreateGroupOpen(true)}
          onCreateCategorySubChannel={(category) => { setTargetCategory(category); setEditingChannel(null); setModalMode('create'); }}
          onMoveChannelToCategory={async (channelId, nextCategory) => { await chatChannels.updateChannel(channelId, { category: nextCategory }); }}
          onDeleteChannel={setDeletingChannel}
          onRenameCategory={handleRenameCategory}
          onDeleteCategory={(cat) => {
            if (channelsInCategory(cat).length === 0) order.removeCustomCategory(cat);
            else setDeletingCategory(cat);
          }}
          onOpenVoiceStage={(channelId) => setSelectedId(channelId)}
        />
      )}

      {!selectedChannel ? (
        <div className="flex flex-1 items-center justify-center p-6">
          <EmptyView title="No channels" description="This scope has no chat channel yet." />
        </div>
      ) : selectedChannel.channelType === 'VOICE' ? (
        <ChatVoiceRoom
          key={selectedChannel.id}
          channel={selectedChannel}
          voice={voice}
          currentUserId={currentUser?.id ?? null}
          canManageChannels={canManageChannels}
          canWriteChat={canWriteChat}
          onlineCount={onlineCount}
          mentionMembers={mentionMembers}
        />
      ) : (
        <ChatThreadView
          key={selectedChannel.id} channel={selectedChannel} workspaceId={workspace.id} projectId={project?.id ?? null}
          scopeLabel={scopeName} currentUserId={currentUser?.id ?? null} canManageChannels={canManageChannels}
          canWriteChat={canWriteChat} onlineCount={onlineCount} mentionMembers={mentionMembers}
          onEditChannel={(channel) => { setEditingChannel(channel); setModalMode('edit'); }} onDeleteChannel={setDeletingChannel}
        />
      )}

      <VoiceAudioSink remoteMedia={voice.remoteMedia} deafened={voice.deafened} />

      <ChatPageDialogs
        createGroupOpen={createGroupOpen}
        onCloseCreateGroup={() => setCreateGroupOpen(false)}
        onCreateGroup={(groupName) => order.addCustomCategory(groupName)}
        modalMode={modalMode}
        editingChannel={editingChannel}
        targetCategory={targetCategory}
        onCloseChannelModal={() => { setModalMode(null); setEditingChannel(null); setTargetCategory(null); }}
        onCreateChannel={handleCreateChannel}
        onUpdateChannel={handleUpdateChannel}
        deletingChannel={deletingChannel}
        onConfirmDeleteChannel={handleConfirmDelete}
        onCloseDeleteChannel={() => setDeletingChannel(null)}
        deletingCategory={deletingCategory}
        onConfirmDeleteCategory={handleConfirmDeleteCategory}
        onCloseDeleteCategory={() => setDeletingCategory(null)}
      />
    </div>
  );
}
