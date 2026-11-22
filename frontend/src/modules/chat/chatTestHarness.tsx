import { useState } from 'react';
import { vi, type Mock } from 'vitest';
import type {
  ChatChannelDto,
  ChatMessageDto,
  CreateChatChannelRequest,
  MemberDto,
  SendChatMessageRequest,
  UpdateChatChannelRequest,
  VoiceParticipantDto,
  WorkspaceDto,
} from '../../types/workspace.types';
import type { VoiceSessionState } from './chatVoiceTypes';

export interface ChatTestStore {
  channels: ChatChannelDto[];
  messages: ChatMessageDto[];
  participants: Record<string, VoiceParticipantDto[]>;
  members: MemberDto[];
  createChannel: Mock<(req: CreateChatChannelRequest) => void>;
  updateChannel: Mock<(id: string, req: UpdateChatChannelRequest) => void>;
  deleteChannel: Mock<(id: string) => void>;
  sendMessage: Mock<(req: SendChatMessageRequest) => void>;
  deleteMessage: Mock<(messageId: string) => void>;
  joinVoiceSpy: Mock<(channelId: string) => void>;
  leaveVoiceSpy: Mock<() => void>;
}

export function resetChatTestStore(store: ChatTestStore) {
  store.channels = [
    { id: 'ch-text', scopeType: 'WORKSPACE', scopeId: 'ws-1', name: 'general', description: 'Team discussion', channelType: 'TEXT', category: 'TEXT CHANNELS', participantCount: 0, createdAt: '2026-11-20T00:00:00Z' },
    { id: 'ch-voice', scopeType: 'WORKSPACE', scopeId: 'ws-1', name: 'lounge', description: 'Voice room', channelType: 'VOICE', category: 'VOICE CHANNELS', participantCount: 1, createdAt: '2026-11-20T00:00:00Z' },
  ];
  store.messages = [
    { id: 'm-1', channelId: 'ch-text', senderId: 'u-2', senderName: 'Bob Smith', senderUsername: 'bob', content: 'Deploy ready?', createdAt: '2026-11-21T08:00:00Z' },
  ];
  store.participants = {
    'ch-voice': [{ userId: 'u-2', username: 'bob', displayName: 'Bob Smith', muted: false, deafened: false, cameraOn: false, screenSharing: true, speaking: true, joinedAt: '2026-11-21T08:00:00Z' }],
  };
  store.members = [
    { userId: 'u-1', username: 'alice', displayName: 'Alice Chen', email: 'alice@orbit.dev', roleId: 'r-1', roleName: 'Owner', isOwner: true, joinedAt: '2026-11-20T00:00:00Z' },
    { userId: 'u-2', username: 'bob', displayName: 'Bob Smith', email: 'bob@orbit.dev', roleId: 'r-2', roleName: 'Member', isOwner: false, joinedAt: '2026-11-20T00:00:00Z' },
  ];
}

export function makeTestWorkspace(permissions: string[]): WorkspaceDto {
  return {
    id: 'ws-1', name: 'Orbit Core', slug: 'orbit-core', description: null, avatarUrl: null, ownerId: 'u-1',
    memberCount: 2, projectCount: 1, enabledModules: ['chat'], myPermissions: permissions,
    createdAt: '2026-11-20T00:00:00Z', updatedAt: '2026-11-20T00:00:00Z', deletedAt: null, purgeAfter: null,
  };
}

export function useFakeChatChannels(store: ChatTestStore) {
  const [channels, setChannels] = useState<ChatChannelDto[]>(store.channels);
  return {
    channels, loading: false, error: null, reload: vi.fn(),
    createChannel: async (req: CreateChatChannelRequest) => {
      store.createChannel(req);
      const created: ChatChannelDto = {
        id: `ch-${channels.length + 1}`, scopeType: 'WORKSPACE', scopeId: 'ws-1',
        name: req.name, description: req.description ?? '', channelType: req.channelType,
        category: req.category ?? (req.channelType === 'VOICE' ? 'VOICE CHANNELS' : req.channelType === 'FORUM' ? 'FORUMS' : 'TEXT CHANNELS'),
        participantCount: 0, createdAt: '2026-11-21T00:00:00Z',
      };
      setChannels((prev) => [...prev, created]);
      return created;
    },
    updateChannel: async (id: string, req: UpdateChatChannelRequest) => {
      store.updateChannel(id, req);
      const target = channels.find((c) => c.id === id) ?? channels[0];
      if (!target) throw new Error('Channel not found');
      return { ...target, ...req };
    },
    deleteChannel: async (id: string) => {
      store.deleteChannel(id);
      setChannels((prev) => prev.filter((c) => c.id !== id));
    },
  };
}

export function useFakeChatChannel(store: ChatTestStore, channelId: string) {
  const [messages, setMessages] = useState<ChatMessageDto[]>(() => store.messages.filter((m) => m.channelId === channelId));
  return {
    messages, loading: false, loadingOlder: false, error: null, hasOlder: false, loadOlder: vi.fn(),
    send: async (req: SendChatMessageRequest) => {
      store.sendMessage(req);
      const replied = req.replyToId ? messages.find((m) => m.id === req.replyToId) : null;
      setMessages((prev) => [
        ...prev,
        {
          id: `m-${prev.length + 10}`, channelId, senderId: 'u-1', senderName: 'Alice Chen', senderUsername: 'alice',
          content: req.content, replyToId: req.replyToId ?? null, replyToSenderName: replied?.senderName ?? null,
          replyToSnippet: replied?.content ?? null, attachmentName: req.attachmentName ?? null,
          attachmentUrl: req.attachmentUrl ?? null, createdAt: '2026-11-21T08:05:00Z',
        },
      ]);
    },
    deleteMessage: async (messageId: string) => {
      store.deleteMessage(messageId);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    },
  };
}

export function useFakeVoiceSession(store: ChatTestStore, channels: ChatChannelDto[]): VoiceSessionState {
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [byChannel, setByChannel] = useState<Record<string, VoiceParticipantDto[]>>(store.participants);
  const activeChannel = channels.find((c) => c.id === activeChannelId) ?? null;

  return {
    activeChannelId, activeChannel, connectedAt: activeChannelId ? Date.now() : null, joining: false,
    mediaNotice: null, muted, deafened, cameraOn, screenSharing, speaking: false,
    localCameraStream: null, localScreenStream: null, participantsByChannel: byChannel, remoteMedia: {},
    joinChannel: async (channelId: string) => {
      store.joinVoiceSpy(channelId);
      setActiveChannelId(channelId);
      setByChannel((prev) => ({
        ...prev,
        [channelId]: [
          ...(prev[channelId] ?? []).filter((p) => p.userId !== 'u-1'),
          { userId: 'u-1', username: 'alice', displayName: 'Alice Chen', muted, deafened, cameraOn, screenSharing, speaking: false, joinedAt: '2026-11-21T08:00:00Z' },
        ],
      }));
    },
    leaveChannel: async () => {
      store.leaveVoiceSpy();
      if (activeChannelId) {
        setByChannel((prev) => ({ ...prev, [activeChannelId]: (prev[activeChannelId] ?? []).filter((p) => p.userId !== 'u-1') }));
      }
      setActiveChannelId(null);
      setCameraOn(false);
      setScreenSharing(false);
    },
    toggleMute: async () => setMuted((v) => !v),
    toggleDeafen: async () => setDeafened((v) => { const next = !v; if (next) setMuted(true); return next; }),
    toggleCamera: async () => setCameraOn((v) => !v),
    toggleScreenShare: async () => setScreenSharing((v) => !v),
    clearNotice: vi.fn(),
  };
}
