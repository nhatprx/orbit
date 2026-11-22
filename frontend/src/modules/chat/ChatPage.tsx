import { useMemo, useState } from 'react';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyView, ErrorView, LoadingView } from '../../components/ui/StateViews';
import { authService } from '../../services/auth.service';
import type {
  ChatChannelDto,
  CreateChatChannelRequest,
  ProjectDto,
  UpdateChatChannelRequest,
  WorkspaceDto,
} from '../../types/workspace.types';
import { ChatChannelModal } from './ChatChannelModal';
import { ChatSidebar } from './ChatSidebar';
import { ChatThreadView } from './ChatThreadView';
import { ChatVoiceRoom } from './ChatVoiceRoom';
import { useChatChannels } from './useChatChannels';
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
    return { id: user.id, username: user.username ?? user.email.split('@')[0] ?? 'member', displayName: user.name };
  }, []);

  const chatChannels = useChatChannels(workspace.id, project?.id ?? null);
  const voice = useVoiceSession(chatChannels.channels, currentUser);
  const mentionMembers = useChatMentionMembers(workspace.id, project?.id ?? null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingChannel, setEditingChannel] = useState<ChatChannelDto | null>(null);
  const [deletingChannel, setDeletingChannel] = useState<ChatChannelDto | null>(null);

  const selectedChannel =
    chatChannels.channels.find((c) => c.id === selectedId) ?? chatChannels.channels[0] ?? null;
  const scopeName = project ? project.name : workspace.name;
  const scopeType = project ? 'PROJECT' : 'WORKSPACE';
  const scopeId = project?.id ?? workspace.id;
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
      <ChatSidebar
        scopeName={scopeName}
        scopeType={scopeType}
        channels={chatChannels.channels}
        selectedChannelId={selectedChannel?.id ?? null}
        voice={voice}
        currentUser={currentUser}
        canManageChannels={canManageChannels}
        canWriteChat={canWriteChat}
        onSelectChannel={handleSelectChannel}
        onOpenCreateChannel={() => { setEditingChannel(null); setModalMode('create'); }}
        onEditChannel={(channel) => { setEditingChannel(channel); setModalMode('edit'); }}
        onDeleteChannel={setDeletingChannel}
        onOpenVoiceStage={(channelId) => setSelectedId(channelId)}
      />

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
          key={selectedChannel.id}
          channel={selectedChannel}
          scopeLabel={scopeName}
          currentUserId={currentUser?.id ?? null}
          canManageChannels={canManageChannels}
          canWriteChat={canWriteChat}
          onlineCount={onlineCount}
          mentionMembers={mentionMembers}
          onEditChannel={(channel) => { setEditingChannel(channel); setModalMode('edit'); }}
        />
      )}

      <VoiceAudioSink remoteMedia={voice.remoteMedia} deafened={voice.deafened} />

      <ChatChannelModal
        open={modalMode !== null}
        mode={modalMode ?? 'create'}
        initialChannel={editingChannel}
        onClose={() => { setModalMode(null); setEditingChannel(null); }}
        onCreate={handleCreateChannel}
        onUpdate={handleUpdateChannel}
      />

      <ConfirmDialog
        open={deletingChannel !== null}
        title="Delete Channel"
        message={deletingChannel ? `Delete "${deletingChannel.name}"? All channel messages will be permanently removed.` : ''}
        confirmLabel="Delete Channel"
        danger
        onConfirm={handleConfirmDelete}
        onClose={() => setDeletingChannel(null)}
      />
    </div>
  );
}
