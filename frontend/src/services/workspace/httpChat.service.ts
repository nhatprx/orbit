import { API_BASE_URL, getStoredSession } from '../auth.storage';
import type {
  ChatChannelDto,
  ChatMessageDeletedEvent,
  ChatMessageDto,
  ChatTypingEvent,
  ChatReactionEvent,
  ChatReactionKey,
  CreateChatChannelRequest,
  CursorPageResponse,
  SendChatMessageRequest,
  UpdateChatChannelRequest,
  VoiceEventDto,
  VoiceIceServerDto,
  VoiceParticipantDto,
  VoiceSignalRequest,
  VoiceStateRequest,
} from '../../types/workspace.types';
import type { ChatService } from './collab.service';
import { apiRequest, seg } from './httpClient';
import { StompConnection } from './stomp/StompConnection';
import { subscribeChatChannel } from './chatChannelSubscription';

const TOPIC_PREFIX = '/topic/chat.';

/** Derives ws(s)://host/ws from the REST base URL (or the page origin when it is relative). */
export function resolveWebSocketUrl(apiBase: string, origin: string): string {
  const base = apiBase || origin;
  return `${base.replace(/^http/i, 'ws').replace(/\/+$/, '')}/ws`;
}

export const chatConnection = new StompConnection({
  url: () => resolveWebSocketUrl(API_BASE_URL, window.location.origin),
  token: () => getStoredSession()?.accessToken ?? null,
});

class HttpChatService implements ChatService {
  listWorkspaceChannels(workspaceId: string) {
    return apiRequest<ChatChannelDto[]>(
      'GET',
      `/api/v1/workspaces/${seg(workspaceId)}/chat/channels`,
      { query: { seedVoice: false } }
    );
  }

  listProjectChannels(workspaceId: string, projectId: string) {
    return apiRequest<ChatChannelDto[]>(
      'GET',
      `/api/v1/workspaces/${seg(workspaceId)}/projects/${seg(projectId)}/chat/channels`,
      { query: { seedVoice: false } }
    );
  }

  createWorkspaceChannel(workspaceId: string, request: CreateChatChannelRequest) {
    return apiRequest<ChatChannelDto>(
      'POST',
      `/api/v1/workspaces/${seg(workspaceId)}/chat/channels`,
      { body: request }
    );
  }

  createProjectChannel(
    workspaceId: string,
    projectId: string,
    request: CreateChatChannelRequest
  ) {
    return apiRequest<ChatChannelDto>(
      'POST',
      `/api/v1/workspaces/${seg(workspaceId)}/projects/${seg(projectId)}/chat/channels`,
      { body: request }
    );
  }

  updateChannel(channelId: string, request: UpdateChatChannelRequest) {
    return apiRequest<ChatChannelDto>('PATCH', `/api/v1/chat/channels/${seg(channelId)}`, {
      body: request,
    });
  }

  deleteChannel(channelId: string) {
    return apiRequest<void>('DELETE', `/api/v1/chat/channels/${seg(channelId)}`);
  }

  listMessages(channelId: string, cursor?: string, limit?: number) {
    return apiRequest<CursorPageResponse<ChatMessageDto>>(
      'GET',
      `/api/v1/chat/channels/${seg(channelId)}/messages`,
      { query: { cursor, limit } }
    );
  }

  sendMessage(channelId: string, request: SendChatMessageRequest) {
    return apiRequest<ChatMessageDto>('POST', `/api/v1/chat/channels/${seg(channelId)}/messages`, {
      body: request,
    });
  }

  editMessage(channelId: string, messageId: string, content: string) {
    return apiRequest<ChatMessageDto>(
      'PATCH',
      `/api/v1/chat/channels/${seg(channelId)}/messages/${seg(messageId)}`,
      { body: { content } }
    );
  }

  setMessagePinned(channelId: string, messageId: string, pinned: boolean) {
    return apiRequest<ChatMessageDto>(
      'PUT',
      `/api/v1/chat/channels/${seg(channelId)}/messages/${seg(messageId)}/pin`,
      { body: { pinned } }
    );
  }

  deleteMessage(channelId: string, messageId: string) {
    return apiRequest<void>(
      'DELETE',
      `/api/v1/chat/channels/${seg(channelId)}/messages/${seg(messageId)}`
    );
  }

  setReaction(channelId: string, messageId: string, key: ChatReactionKey, active: boolean) {
    const method = active ? 'PUT' : 'DELETE';
    return apiRequest<ChatReactionEvent>(method, `/api/v1/chat/channels/${seg(channelId)}/messages/${seg(messageId)}/reactions/${seg(key)}`);
  }

  subscribeChannel(
    channelId: string,
    onMessage: (message: ChatMessageDto) => void,
    onDeleted?: (event: ChatMessageDeletedEvent) => void,
    onTyping?: (event: ChatTypingEvent) => void,
    onReaction?: (event: ChatReactionEvent) => void
  ): () => void {
    return subscribeChatChannel(chatConnection, channelId, onMessage, onDeleted, onTyping, onReaction);
  }

  sendTyping(channelId: string, active: boolean) {
    try {
      chatConnection.send(`/app/chat.${channelId}.typing`, { active });
    } catch {
      // Typing is best-effort and must not interrupt composing while reconnecting.
    }
  }

  getVoiceIceServers() {
    return apiRequest<VoiceIceServerDto[]>('GET', '/api/v1/chat/voice/ice-servers');
  }

  listVoiceParticipants(channelId: string) {
    return apiRequest<VoiceParticipantDto[]>(
      'GET',
      `/api/v1/chat/channels/${seg(channelId)}/voice/participants`
    );
  }

  joinVoiceChannel(channelId: string, state: VoiceStateRequest) {
    return apiRequest<VoiceParticipantDto[]>(
      'POST',
      `/api/v1/chat/channels/${seg(channelId)}/voice/join`,
      { body: state }
    );
  }

  updateVoiceState(channelId: string, state: VoiceStateRequest) {
    return apiRequest<VoiceParticipantDto[]>(
      'PUT',
      `/api/v1/chat/channels/${seg(channelId)}/voice/state`,
      { body: state }
    );
  }

  leaveVoiceChannel(channelId: string) {
    return apiRequest<VoiceParticipantDto[]>(
      'POST',
      `/api/v1/chat/channels/${seg(channelId)}/voice/leave`
    );
  }

  sendVoiceSignal(channelId: string, signal: VoiceSignalRequest) {
    return apiRequest<void>('POST', `/api/v1/chat/channels/${seg(channelId)}/voice/signal`, {
      body: signal,
    });
  }

  subscribeVoice(channelId: string, onEvent: (event: VoiceEventDto) => void): () => void {
    return chatConnection.subscribe(`${TOPIC_PREFIX}${channelId}.voice`, (frame) => {
      try {
        onEvent(JSON.parse(frame.body) as VoiceEventDto);
      } catch {
        // Ignore malformed signaling or presence payloads.
      }
    });
  }
}

export const httpChatService: ChatService = new HttpChatService();
